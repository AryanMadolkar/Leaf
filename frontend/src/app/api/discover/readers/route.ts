import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
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

/** Public reader fields — safe to cache, no viewer-specific data. */
type ReaderBase = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  topGenre: string;
  streak: number;
};

type Reader = ReaderBase & { isFollowing: boolean };

// Some profiles have a raw base64 data: URI saved as avatar_url instead of a
// storage link — multiple MB of text. Selecting/caching that at list scale
// is what was actually making this endpoint slow (and blew unstable_cache's
// 2MB item limit). Real avatar URLs are a few hundred chars at most; drop
// anything absurdly larger and let the client fall back to a DiceBear avatar.
const MAX_AVATAR_URL_LENGTH = 2000;

function sanitizeAvatar(avatarUrl: string | null | undefined): string {
  if (!avatarUrl || avatarUrl.length > MAX_AVATAR_URL_LENGTH) return "";
  return avatarUrl;
}

function toReaderBase(row: StatsProfileRow): ReaderBase | null {
  if (!row.profile) return null;
  return {
    id: row.profile.id,
    username: row.profile.username,
    name: row.profile.display_name || "Reader",
    avatar: sanitizeAvatar(row.profile.avatar_url),
    topGenre: row.favorite_genre || "Fiction",
    streak: row.reading_streak || 0,
  };
}

/** Batch-fetch which of `ids` the given viewer already follows (single query, no N+1). */
async function fetchFollowingSet(viewerId: string | undefined, ids: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  if (!viewerId || ids.length === 0) return set;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .in("following_id", ids);
  ((data || []) as { following_id: string }[]).forEach((f) => set.add(f.following_id));
  return set;
}

function withFollowing(base: ReaderBase[], followingSet: Set<string>): Reader[] {
  return base.map((r) => ({ ...r, isFollowing: followingSet.has(r.id) }));
}

// Non-personalized lookups are identical for every viewer, so they're cached
// for a couple minutes — the only per-request work left is the (fast, single
// indexed query) follow-status check for whoever's asking.
const getActiveReadersBase = unstable_cache(
  async (limit: number): Promise<ReaderBase[]> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_stats")
      .select("user_id, reading_streak, favorite_genre, profile:profiles!inner(id, username, display_name, avatar_url)")
      .not("profile.avatar_url", "like", "data:%")
      .gt("reading_streak", 0)
      .order("reading_streak", { ascending: false })
      .limit(limit);
    if (error) throw error;

    return ((data || []) as unknown as StatsProfileRow[])
      .map(toReaderBase)
      .filter((r): r is ReaderBase => r !== null);
  },
  ["discover-readers-active"],
  { revalidate: 120, tags: ["discover-readers-active"] }
);

const getNewReadersBase = unstable_cache(
  async (limit: number): Promise<ReaderBase[]> => {
    const supabase = createAdminClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, joined_at")
      .gte("joined_at", thirtyDaysAgo)
      // Skip rows with a raw base64 data: URI saved as avatar_url instead of a
      // storage link — some are several MB and were the actual source of the
      // multi-second query time (and blew unstable_cache's 2MB item limit).
      .not("avatar_url", "like", "data:%")
      .order("joined_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const rows = (profiles || []) as (ProfileRef & { joined_at: string })[];
    const ids = rows.map((p) => p.id);
    if (ids.length === 0) return [];

    const { data: statsRows } = await supabase
      .from("user_stats")
      .select("user_id, reading_streak, favorite_genre")
      .in("user_id", ids);

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
        avatar: sanitizeAvatar(p.avatar_url),
        topGenre: stats?.favorite_genre || "Fiction",
        streak: stats?.reading_streak || 0,
      };
    });
  },
  ["discover-readers-new"],
  { revalidate: 120, tags: ["discover-readers-new"] }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "active"; // active | new
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 12);

    const { user } = await getRequestUser();

    // Note: no public Cache-Control here — isFollowing is viewer-specific,
    // so caching this response would show a stale Follow/Following state to
    // whoever's browser (or a shared CDN cache) served it next. The expensive
    // non-personalized part is still cached server-side via unstable_cache.
    if (type === "new") {
      const base = await getNewReadersBase(limit);
      const followingSet = await fetchFollowingSet(user?.id, base.map((r) => r.id));
      return NextResponse.json({ success: true, readers: withFollowing(base, followingSet) });
    }

    if (type === "active") {
      const base = await getActiveReadersBase(limit);
      const followingSet = await fetchFollowingSet(user?.id, base.map((r) => r.id));
      return NextResponse.json({ success: true, readers: withFollowing(base, followingSet) });
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Discover readers API error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
