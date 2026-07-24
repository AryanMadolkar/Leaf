import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getRequestUser } from "@/utils/auth/getRequestUser";

type ProfileRef = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type StatsProfileRow = {
  user_id: string;
  reading_streak: number | null;
  favorite_genre: string | null;
  profile: ProfileRef | null;
};

type Reader = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  topGenre: string;
  streak: number;
  isFollowing: boolean;
};

function toReader(row: StatsProfileRow, isFollowing: boolean): Reader | null {
  if (!row.profile) return null;
  return {
    id: row.profile.id,
    username: row.profile.username,
    name: row.profile.display_name || "Reader",
    avatar: row.profile.avatar_url || "",
    topGenre: row.favorite_genre || "Fiction",
    streak: row.reading_streak || 0,
    isFollowing,
  };
}

/** Batch-fetch which of `ids` the given viewer already follows (single query, no N+1). */
async function fetchFollowingSet(
  supabase: ReturnType<typeof createAdminClient>,
  viewerId: string | undefined,
  ids: string[]
): Promise<Set<string>> {
  const set = new Set<string>();
  if (!viewerId || ids.length === 0) return set;
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .in("following_id", ids);
  ((data || []) as { following_id: string }[]).forEach((f) => set.add(f.following_id));
  return set;
}

async function getActiveReaders(
  supabase: ReturnType<typeof createAdminClient>,
  viewerId: string | undefined,
  limit: number
): Promise<Reader[]> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("user_id, reading_streak, favorite_genre, profile:profiles(id, username, display_name, avatar_url)")
    .gt("reading_streak", 0)
    .order("reading_streak", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data || []) as unknown as StatsProfileRow[];
  const ids = rows.map((r) => r.user_id);
  const followingSet = await fetchFollowingSet(supabase, viewerId, ids);

  return rows
    .map((r) => toReader(r, followingSet.has(r.user_id)))
    .filter((r): r is Reader => r !== null);
}

async function getNewReaders(
  supabase: ReturnType<typeof createAdminClient>,
  viewerId: string | undefined,
  limit: number
): Promise<Reader[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, joined_at")
    .gte("joined_at", thirtyDaysAgo)
    .order("joined_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (profiles || []) as (ProfileRef & { joined_at: string })[];
  const ids = rows.map((p) => p.id);
  if (ids.length === 0) return [];

  const [{ data: statsRows }, followingSet] = await Promise.all([
    supabase.from("user_stats").select("user_id, reading_streak, favorite_genre").in("user_id", ids),
    fetchFollowingSet(supabase, viewerId, ids),
  ]);

  const statsMap = new Map<string, { reading_streak: number | null; favorite_genre: string | null }>();
  ((statsRows || []) as { user_id: string; reading_streak: number | null; favorite_genre: string | null }[]).forEach(
    (s) => statsMap.set(s.user_id, s)
  );

  return rows.map((p) => {
    const stats = statsMap.get(p.id);
    return {
      id: p.id,
      username: p.username,
      name: p.display_name || "Reader",
      avatar: p.avatar_url || "",
      topGenre: stats?.favorite_genre || "Fiction",
      streak: stats?.reading_streak || 0,
      isFollowing: followingSet.has(p.id),
    };
  });
}

async function getSimilarTasteReaders(
  supabase: ReturnType<typeof createAdminClient>,
  viewerId: string,
  limit: number
): Promise<Reader[]> {
  const [{ data: myStats }, { data: myFavoriteBooks }, { data: myFollows }] = await Promise.all([
    supabase.from("user_stats").select("favorite_genre").eq("user_id", viewerId).maybeSingle(),
    supabase.from("user_books").select("book_id").eq("user_id", viewerId).eq("status", "finished").eq("rating", 5),
    supabase.from("follows").select("following_id").eq("follower_id", viewerId),
  ]);

  const excludeIds = new Set<string>([viewerId, ...((myFollows || []) as { following_id: string }[]).map((f) => f.following_id)]);
  const myGenre = myStats?.favorite_genre as string | undefined;
  const myFavoriteIds = ((myFavoriteBooks || []) as { book_id: string }[]).map((b) => b.book_id);

  const candidates = new Map<string, StatsProfileRow>();

  if (myGenre) {
    const { data: genreRows, error } = await supabase
      .from("user_stats")
      .select("user_id, reading_streak, favorite_genre, profile:profiles(id, username, display_name, avatar_url)")
      .eq("favorite_genre", myGenre)
      .neq("user_id", viewerId)
      .limit(30);
    if (error) throw error;
    ((genreRows || []) as unknown as StatsProfileRow[]).forEach((r) => {
      if (!excludeIds.has(r.user_id)) candidates.set(r.user_id, r);
    });
  }

  const overlapCounts = new Map<string, number>();
  if (myFavoriteIds.length > 0) {
    const { data: overlapRows, error } = await supabase
      .from("user_books")
      .select("user_id, book_id")
      .in("book_id", myFavoriteIds)
      .eq("status", "finished")
      .eq("rating", 5)
      .neq("user_id", viewerId)
      .limit(200);
    if (error) throw error;
    ((overlapRows || []) as { user_id: string; book_id: string }[]).forEach((r) => {
      if (excludeIds.has(r.user_id)) return;
      overlapCounts.set(r.user_id, (overlapCounts.get(r.user_id) || 0) + 1);
    });

    const missingIds = [...overlapCounts.keys()].filter((id) => !candidates.has(id));
    if (missingIds.length > 0) {
      const { data: extraRows, error: extraError } = await supabase
        .from("user_stats")
        .select("user_id, reading_streak, favorite_genre, profile:profiles(id, username, display_name, avatar_url)")
        .in("user_id", missingIds);
      if (extraError) throw extraError;
      ((extraRows || []) as unknown as StatsProfileRow[]).forEach((r) => candidates.set(r.user_id, r));
    }
  }

  return [...candidates.values()]
    .sort((a, b) => {
      const overlapDiff = (overlapCounts.get(b.user_id) || 0) - (overlapCounts.get(a.user_id) || 0);
      if (overlapDiff !== 0) return overlapDiff;
      return (b.reading_streak || 0) - (a.reading_streak || 0);
    })
    .slice(0, limit)
    .map((r) => toReader(r, false))
    .filter((r): r is Reader => r !== null);
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "active"; // active | similar | new
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 12);

    const { user } = await getRequestUser();

    if (type === "similar") {
      if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      const readers = await getSimilarTasteReaders(supabase, user.id, limit);
      return NextResponse.json({ success: true, readers });
    }

    if (type === "new") {
      const readers = await getNewReaders(supabase, user?.id, limit);
      return NextResponse.json({ success: true, readers });
    }

    if (type === "active") {
      const readers = await getActiveReaders(supabase, user?.id, limit);
      return NextResponse.json({ success: true, readers });
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Discover readers API error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
