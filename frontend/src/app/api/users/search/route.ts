import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  joined_at: string | null;
};

type FollowEdge = {
  follower_id: string;
  following_id: string;
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit") || 12), 30);

    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, joined_at")
      .order("display_name", { ascending: true })
      .limit(limit);

    if (q.length >= 1) {
      query = query.or(
        `username.ilike.%${q}%,display_name.ilike.%${q}%`
      );
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    const rows = (profiles || []) as ProfileRow[];
    const ids = rows.map((p) => p.id);

    const followerCountMap: Record<string, number> = {};
    const followingSet = new Set<string>();

    if (ids.length > 0) {
      const { data: followRows } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .in("following_id", ids);

      ((followRows || []) as FollowEdge[]).forEach((f) => {
        followerCountMap[f.following_id] = (followerCountMap[f.following_id] || 0) + 1;
      });

      if (user?.id) {
        const { data: myFollows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .in("following_id", ids);

        ((myFollows || []) as { following_id: string }[]).forEach((f) => {
          followingSet.add(f.following_id);
        });
      }
    }

    const followingCountMap: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: outgoing } = await supabase
        .from("follows")
        .select("follower_id")
        .in("follower_id", ids);

      ((outgoing || []) as { follower_id: string }[]).forEach((f) => {
        followingCountMap[f.follower_id] = (followingCountMap[f.follower_id] || 0) + 1;
      });
    }

    const users = rows
      .filter((p) => p.id !== user?.id)
      .map((p) => ({
        id: p.id,
        username: p.username,
        name: p.display_name || "Reader",
        avatar: p.avatar_url || "",
        bio: p.bio || "",
        followersCount: followerCountMap[p.id] || 0,
        followingCount: followingCountMap[p.id] || 0,
        isFollowing: followingSet.has(p.id),
        joinedAt: p.joined_at,
      }));

    return NextResponse.json({ success: true, users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Users search API error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
