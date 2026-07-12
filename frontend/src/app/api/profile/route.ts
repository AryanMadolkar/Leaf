import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { createAdminClient } from "@/utils/supabase/admin";

export async function PATCH(request: Request) {
  try {
    const { user } = await getRequestUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.display_name !== undefined) updates.display_name = body.display_name;
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
    if (body.favorite_genres !== undefined) updates.favorite_genres = body.favorite_genres;
    if (body.onboarding_completed !== undefined) updates.onboarding_completed = body.onboarding_completed;
    if (body.username !== undefined) updates.username = body.username;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    if (Array.isArray(body.follow_user_ids) && body.follow_user_ids.length > 0) {
      const rows = body.follow_user_ids
        .filter((id: unknown) => typeof id === "string" && id !== user.id)
        .map((following_id: string) => ({
          follower_id: user.id,
          following_id,
        }));
      if (rows.length) {
        await admin.from("follows").upsert(rows, { onConflict: "follower_id,following_id" });
      }
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error: any) {
    console.error("[profile PATCH]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
