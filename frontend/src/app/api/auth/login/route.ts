import { NextResponse } from "next/server";
import { query } from "@/utils/db";
import { verifyPassword } from "@/utils/auth/password";
import { attachSessionCookie, createSessionToken } from "@/utils/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required." }, { status: 400 });
    }

    const result = await query<{
      user_id: string;
      password_hash: string;
      username: string;
      display_name: string | null;
      onboarding_completed: boolean;
    }>(
      `SELECT c.user_id, c.password_hash, p.username, p.display_name, p.onboarding_completed
       FROM public.user_credentials c
       JOIN public.profiles p ON p.id = c.user_id
       WHERE lower(c.email) = $1
       LIMIT 1`,
      [email],
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }

    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSessionToken({ id: row.user_id, email });
    const response = NextResponse.json({
      success: true,
      user: {
        id: row.user_id,
        email,
        username: row.username,
        display_name: row.display_name || "Reader",
        onboarding_completed: row.onboarding_completed,
      },
    });
    return attachSessionCookie(response, token);
  } catch (error: any) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Could not sign in." },
      { status: 500 },
    );
  }
}
