import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** List followers or following for a user, or toggle follow. */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "followers"; // followers | following

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    let profileIds: string[] = [];

    if (type === "following") {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (error) throw error;
      profileIds = (data || []).map((r) => r.following_id);
    } else {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);
      if (error) throw error;
      profileIds = (data || []).map((r) => r.follower_id);
    }

    if (profileIds.length === 0) {
      return NextResponse.json({ success: true, users: [] });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .in("id", profileIds);

    if (profilesError) throw profilesError;

    const followingSet = new Set<string>();
    if (user?.id) {
      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", profileIds);
      (myFollows || []).forEach((f: any) => followingSet.add(f.following_id));
    }

    const users = (profiles || []).map((p) => ({
      id: p.id,
      username: p.username,
      name: p.display_name || "Reader",
      avatar: p.avatar_url || "",
      bio: p.bio || "",
      isFollowing: followingSet.has(p.id),
    }));

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("Follows list API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const followId = body.userId || body.followId;

    if (!followId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    }
    if (followId === user.id) {
      return NextResponse.json({ success: false, error: "Cannot follow yourself" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", followId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", followId);
      if (error) throw error;
      return NextResponse.json({ success: true, followed: false });
    }

    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: followId });
    if (error) throw error;

    return NextResponse.json({ success: true, followed: true });
  } catch (error: any) {
    console.error("Follows toggle API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
