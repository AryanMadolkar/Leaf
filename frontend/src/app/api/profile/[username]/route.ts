import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getRequestUser } from "@/utils/auth/getRequestUser";

/**
 * Public profile lookup by username — id, display fields, follow counts,
 * isFollowing (viewer-specific), and reading stats. The web app queries
 * Supabase directly for this from the client; this route exists so clients
 * without direct DB access (the mobile app) can get the same data.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!username) {
    return NextResponse.json({ success: false, error: "Missing username" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { user: viewer } = await getRequestUser();

    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, joined_at")
      .eq("username", username)
      .maybeSingle();

    if (profError) throw profError;
    if (!prof) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const [{ count: followersCount }, { count: followingCount }, { data: statsRow }, isFollowing] =
      await Promise.all([
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", prof.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", prof.id),
        supabase
          .from("user_stats")
          .select(
            "books_completed, books_reading, books_want_to_read, total_pages_read, average_rating, reading_streak, longest_streak, favorite_genre"
          )
          .eq("user_id", prof.id)
          .maybeSingle(),
        viewer && viewer.id !== prof.id
          ? supabase
              .from("follows")
              .select("follower_id")
              .eq("follower_id", viewer.id)
              .eq("following_id", prof.id)
              .maybeSingle()
              .then((r) => !!r.data)
          : Promise.resolve(false),
      ]);

    return NextResponse.json({
      success: true,
      profile: {
        id: prof.id,
        username: prof.username,
        name: prof.display_name || "Reader",
        avatar: prof.avatar_url || "",
        bio: prof.bio || "",
        joinedAt: prof.joined_at,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        isFollowing,
        isMe: viewer?.id === prof.id,
      },
      stats: statsRow || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Profile lookup API error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
