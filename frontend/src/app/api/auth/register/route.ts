import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
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

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Server auth is not configured. Add SUPABASE_SERVICE_ROLE_KEY and AUTH_SECRET in Vercel env.",
        },
        { status: 500 },
      );
    }

    const { data: existingCred } = await admin
      .from("user_credentials")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle();

    if (existingCred) {
      return NextResponse.json({ success: false, error: "An account with this email already exists." }, { status: 409 });
    }

    const { data: taken } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (taken) {
      username = `${username}_${randomUUID().slice(0, 4)}`;
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      username,
      display_name: name,
      email,
      avatar_url: "",
      onboarding_completed: false,
    });

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    const { error: statsError } = await admin.from("user_stats").insert({ user_id: userId });
    if (statsError) {
      await admin.from("profiles").delete().eq("id", userId);
      return NextResponse.json({ success: false, error: statsError.message }, { status: 500 });
    }

    const { error: credError } = await admin.from("user_credentials").insert({
      user_id: userId,
      email,
      password_hash: passwordHash,
    });

    if (credError) {
      await admin.from("user_stats").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      return NextResponse.json(
        {
          success: false,
          error:
            credError.message.includes("user_credentials") || credError.code === "42P01"
              ? "Auth tables are missing. Run migration 002_custom_auth.sql on your database."
              : credError.message,
        },
        { status: 500 },
      );
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
      { success: false, error: error?.message || "Could not create account." },
      { status: 500 },
    );
  }
}
