import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPool } from "@/utils/db";
import { hashPassword } from "@/utils/auth/password";
import { attachSessionCookie, createSessionToken } from "@/utils/auth/session";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
}

export async function POST(request: Request) {
  const client = await getPool().connect();
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email || ""));
    const password = String(body.password || "");
    const name = String(body.name || "").trim() || "Reader";
    let username = sanitizeUsername(String(body.username || email.split("@")[0] || "reader"));

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters." }, { status: 400 });
    }
    if (!username) username = `reader_${randomUUID().slice(0, 6)}`;

    const existing = await client.query(
      `SELECT user_id FROM public.user_credentials WHERE lower(email) = $1 LIMIT 1`,
      [email],
    );
    if (existing.rows[0]) {
      return NextResponse.json({ success: false, error: "An account with this email already exists." }, { status: 409 });
    }

    const taken = await client.query(
      `SELECT id FROM public.profiles WHERE lower(username) = $1 LIMIT 1`,
      [username],
    );
    if (taken.rows[0]) {
      username = `${username}_${randomUUID().slice(0, 4)}`;
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO public.profiles (id, username, display_name, email, avatar_url, onboarding_completed)
         VALUES ($1, $2, $3, $4, '', false)`,
        [userId, username, name, email],
      );
      await client.query(`INSERT INTO public.user_stats (user_id) VALUES ($1)`, [userId]);
      await client.query(
        `INSERT INTO public.user_credentials (user_id, email, password_hash)
         VALUES ($1, $2, $3)`,
        [userId, email, passwordHash],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    const token = await createSessionToken({ id: userId, email });
    const response = NextResponse.json({
      success: true,
      user: { id: userId, email, username, display_name: name, onboarding_completed: false },
    });
    return attachSessionCookie(response, token);
  } catch (error: any) {
    console.error("[auth/register]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Could not create account." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
