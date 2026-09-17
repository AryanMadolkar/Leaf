import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { createAdminClient } from "@/utils/supabase/admin";
import { getOrRecomputeReadingDna } from "@/utils/readingDna";
import { MOODS, recommendByMood, type TasteSignal } from "@/utils/recommend";
import { canonicalGenresForBook } from "@/utils/genreUtils";

function parseSubjects(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function buildTasteGenres(userBooks: unknown): TasteSignal[] {
  const weights = new Map<string, number>();
  const rows = Array.isArray(userBooks) ? userBooks : [];

  for (const raw of rows) {
    const ub = raw as {
      status?: string | null;
      rating?: number | null;
      book?: { subjects?: unknown } | { subjects?: unknown }[] | null;
    };
    const status = (ub.status || "").toLowerCase();
    if (!["finished", "reading", "want_to_read"].includes(status)) continue;

    let w = 0.4;
    if (status === "reading") w = 0.85;
    if (status === "finished") {
      const rating = typeof ub.rating === "number" ? ub.rating : 0;
      w = rating >= 4.5 ? 2.2 : rating >= 4 ? 1.6 : rating >= 3 ? 1 : 0.55;
    }

    const book = Array.isArray(ub.book) ? ub.book[0] : ub.book;
    for (const genre of canonicalGenresForBook(parseSubjects(book?.subjects))) {
      weights.set(genre, (weights.get(genre) || 0) + w);
    }
  }

  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, weight]) => ({ name, weight: Math.round(weight * 100) / 100 }));
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const moodsRaw = Array.isArray(body.moods) ? body.moods.map(String) : [];
    const moods = moodsRaw.filter((m: string) => MOODS.some((x) => x.id === m)).slice(0, 3);
    if (moods.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pick at least one mood", moods: MOODS },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    const [{ data: userBooks }, { data: dnfRows }, { data: recentEvents }, dna] = await Promise.all([
      db
        .from("user_books")
        .select("book_id, status, rating, book:books(subjects)")
        .eq("user_id", user.id),
      db.from("dnf_records").select("reasons, book:books(subjects)").eq("user_id", user.id),
      db
        .from("recommendation_events")
        .select("book_ids")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      getOrRecomputeReadingDna(user.id).catch(() => null),
    ]);

    const excludeIds = new Set<string>();
    for (const ub of userBooks || []) {
      if (ub.status === "finished" || ub.status === "reading" || ub.status === "did_not_finish") {
        excludeIds.add(ub.book_id);
      }
    }

    const recentRecIds = new Set<string>();
    for (const ev of recentEvents || []) {
      for (const id of ev.book_ids || []) recentRecIds.add(id);
    }

    const dnfGenrePenalties = new Map<string, number>();
    for (const row of dnfRows || []) {
      const subjects = parseSubjects((row as { book?: { subjects?: unknown } }).book?.subjects);
      for (const s of canonicalGenresForBook(subjects).slice(0, 4)) {
        dnfGenrePenalties.set(s.toLowerCase(), (dnfGenrePenalties.get(s.toLowerCase()) || 0) + 0.04);
      }
    }

    const tasteGenres = buildTasteGenres(userBooks || []);

    const recommendations = recommendByMood({
      moods,
      dna,
      tasteGenres,
      excludeIds,
      dnfGenrePenalties,
      recentRecIds,
      limit: 6,
    });

    const bookIds = recommendations.map((r) => r.book.id);
    if (bookIds.length > 0) {
      try {
        await db.from("recommendation_events").insert({
          user_id: user.id,
          moods,
          book_ids: bookIds,
        });
      } catch (evErr) {
        console.warn("[recommend/mood] event persist skipped:", evErr);
      }
    }

    return NextResponse.json({
      success: true,
      moods,
      tasteGenres: tasteGenres.slice(0, 5).map((g) => g.name),
      recommendations: recommendations.map((r) => ({
        book: r.book,
        matchScore: r.matchScore,
        reasons: r.reasons,
        mismatches: r.mismatches,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not recommend";
    console.error("[recommend/mood]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
