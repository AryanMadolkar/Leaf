import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    const { user: session } = await getRequestUser();
    if (!session) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, username, display_name, email, avatar_url, onboarding_completed, bio")
      .eq("id", session.id)
      .maybeSingle();

    if (error || !profile) {
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
    return NextResponse.json({ success: false, error: error?.message || "Session check failed." }, { status: 500 });
  }
}
