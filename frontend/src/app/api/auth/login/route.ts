import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
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

    const { data: cred, error: credError } = await admin
      .from("user_credentials")
      .select("user_id, password_hash, email")
      .ilike("email", email)
      .maybeSingle();

    if (credError) {
      return NextResponse.json(
        {
          success: false,
          error:
            credError.code === "42P01" || credError.message.includes("user_credentials")
              ? "Auth tables are missing. Run migration 002_custom_auth.sql on your database."
              : credError.message,
        },
        { status: 500 },
      );
    }

    if (!cred) {
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }

    const ok = await verifyPassword(password, cred.password_hash);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("username, display_name, onboarding_completed")
      .eq("id", cred.user_id)
      .maybeSingle();

    const token = await createSessionToken({ id: cred.user_id, email: cred.email || email });
    const response = NextResponse.json({
      success: true,
      user: {
        id: cred.user_id,
        email: cred.email || email,
        username: profile?.username || email.split("@")[0],
        display_name: profile?.display_name || "Reader",
        onboarding_completed: Boolean(profile?.onboarding_completed),
      },
    });
    return attachSessionCookie(response, token);
  } catch (error: any) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Could not sign in." },
      { status: 500 },
    );
  }
}
