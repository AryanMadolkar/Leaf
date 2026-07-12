import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/auth/session";
import { query } from "@/utils/db";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const result = await query<{
      id: string;
      username: string;
      display_name: string | null;
      email: string | null;
      avatar_url: string;
      onboarding_completed: boolean;
      bio: string | null;
    }>(
      `SELECT id, username, display_name, email, avatar_url, onboarding_completed, bio
       FROM public.profiles
       WHERE id = $1
       LIMIT 1`,
      [session.id],
    );

    const profile = result.rows[0];
    if (!profile) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email || session.email,
        username: profile.username,
        display_name: profile.display_name || "Reader",
        avatar_url: profile.avatar_url || "",
        onboarding_completed: profile.onboarding_completed,
        bio: profile.bio || "",
      },
    });
  } catch (error: any) {
    console.error("[auth/me]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
