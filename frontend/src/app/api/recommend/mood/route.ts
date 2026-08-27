import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { createAdminClient } from "@/utils/supabase/admin";
import { getOrRecomputeReadingDna } from "@/utils/readingDna";
import { MOODS, recommendByMood } from "@/utils/recommend";

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const moodsRaw = Array.isArray(body.moods) ? body.moods.map(String) : [];
    const moods = moodsRaw.filter((m: string) => MOODS.some((x) => x.id === m)).slice(0, 4);
    if (moods.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pick at least one mood", moods: MOODS },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    const [{ data: userBooks }, { data: dnfRows }, { data: recentEvents }, dna] = await Promise.all([
      db.from("user_books").select("book_id, status").eq("user_id", user.id),
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
      const subjectsRaw = (row as any).book?.subjects;
      let subjects: string[] = [];
      if (typeof subjectsRaw === "string") {
        try {
          subjects = JSON.parse(subjectsRaw);
        } catch {
          subjects = [];
        }
      } else if (Array.isArray(subjectsRaw)) {
        subjects = subjectsRaw;
      }
      for (const s of subjects.slice(0, 4)) {
        dnfGenrePenalties.set(s, (dnfGenrePenalties.get(s) || 0) + 0.04);
      }
    }

    const recommendations = recommendByMood({
      moods,
      dna,
      excludeIds,
      dnfGenrePenalties,
      recentRecIds,
      limit: 5,
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
      recommendations: recommendations.map((r) => ({
        book: r.book,
        matchScore: r.matchScore,
        reasons: r.reasons,
        mismatches: r.mismatches,
      })),
    });
  } catch (err: any) {
    console.error("[recommend/mood]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Could not recommend" },
      { status: 500 }
    );
  }
}
