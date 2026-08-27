import { createAdminClient } from "@/utils/supabase/admin";
import { generateGeminiText } from "@/utils/gemini";

export type ReadingDnaRow = {
  user_id: string;
  genres: Array<{ name: string; weight: number }>;
  themes: Array<{ name: string; weight: number }>;
  pacing_preference: number;
  character_preference: number;
  worldbuilding_preference: number;
  emotional_preference: number;
  profile_summary: string | null;
  confidence: number;
  signals: Record<string, unknown>;
  updated_at: string;
};

const CONFIDENCE_SUMMARY_THRESHOLD = 0.35;
const STALE_MS = 1000 * 60 * 60 * 12; // 12h

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function bump(map: Map<string, number>, key: string, amount: number) {
  const k = key.trim();
  if (!k) return;
  map.set(k, (map.get(k) || 0) + amount);
}

function topWeighted(map: Map<string, number>, limit = 8) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, weight]) => ({ name, weight: Math.round(weight * 100) / 100 }));
}

/** Deterministic DNA from shelf signals; optional Gemini summary when confident. */
export async function computeReadingDna(userId: string): Promise<ReadingDnaRow> {
  const db = createAdminClient();

  const [{ data: userBooks }, { data: dnfRows }, { data: reviews }] = await Promise.all([
    db
      .from("user_books")
      .select("status, rating, book_id, book:books(subjects, author_name, title)")
      .eq("user_id", userId),
    db.from("dnf_records").select("reasons, book_id").eq("user_id", userId),
    db.from("reviews").select("rating, book_id").eq("user_id", userId),
  ]);

  const genreMap = new Map<string, number>();
  const themeMap = new Map<string, number>();
  let finished = 0;
  let rated = 0;
  let ratingSum = 0;
  let highRated = 0;

  let pacing = 0.5;
  let character = 0.5;
  let world = 0.5;
  let emotion = 0.5;
  let prefSamples = 0;

  const parseSubjects = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return [];
  };

  for (const ub of userBooks || []) {
    const book = (ub as any).book;
    const subjects = parseSubjects(book?.subjects);
    const genres = subjects.slice(0, 6);
    const rating = typeof ub.rating === "number" ? ub.rating : null;

    if (ub.status === "finished") {
      finished += 1;
      for (const g of genres) bump(genreMap, g, rating && rating >= 4 ? 1.4 : 1);
      for (const s of subjects.slice(0, 8)) bump(themeMap, s, 0.6);
      if (rating != null) {
        rated += 1;
        ratingSum += rating;
        if (rating >= 4) highRated += 1;
        const tilt = (rating - 3) * 0.04;
        pacing = clamp01(pacing + tilt * 0.2);
        character = clamp01(character + tilt * 0.35);
        world = clamp01(world + tilt * 0.25);
        emotion = clamp01(emotion + tilt * 0.3);
        prefSamples += 1;
      }
    } else if (ub.status === "did_not_finish") {
      for (const g of genres.slice(0, 4)) bump(genreMap, g, -0.35);
    }
  }

  const reasonCounts = new Map<string, number>();
  for (const row of dnfRows || []) {
    for (const r of row.reasons || []) bump(reasonCounts, String(r), 1);
  }
  const slowDnfs = (reasonCounts.get("too_slow") || 0) + (reasonCounts.get("boring") || 0);
  const charDnfs = reasonCounts.get("no_connection") || 0;
  const confuseDnfs = reasonCounts.get("confusing") || 0;
  pacing = clamp01(pacing - slowDnfs * 0.08);
  character = clamp01(character - charDnfs * 0.1);
  world = clamp01(world - confuseDnfs * 0.06);
  emotion = clamp01(emotion + (reasonCounts.get("writing") || 0) * -0.04);

  for (const rev of reviews || []) {
    if (typeof rev.rating === "number") {
      rated = Math.max(rated, rated); // already counted via user_books often
      ratingSum += 0; // keep shelf ratings primary
    }
  }

  const signalCount = finished + Math.min(rated, finished) + (dnfRows?.length || 0) * 0.5;
  // Confidence: ~5 finished or ~8 rated ≈ threshold for summary
  const confidence = clamp01(finished / 12 + rated / 20 + Math.min((dnfRows?.length || 0) / 15, 0.15));

  const genres = topWeighted(genreMap);
  const themes = topWeighted(themeMap, 10);

  let profileSummary: string | null = null;
  if (confidence >= CONFIDENCE_SUMMARY_THRESHOLD && (finished >= 5 || rated >= 8)) {
    try {
      profileSummary = await generateGeminiText({
        temperature: 0.5,
        maxOutputTokens: 220,
        prompt: `Write a short, warm 2–3 sentence "Reading DNA" summary for a book tracker user.
Be specific but not absolute. Never invent books they didn't read.
Finished books: ${finished}. High ratings (4–5★): ${highRated}.
Top genres: ${genres.map((g) => g.name).join(", ") || "still learning"}.
Themes: ${themes
          .slice(0, 5)
          .map((t) => t.name)
          .join(", ") || "emerging"}.
DNF patterns: ${[...reasonCounts.entries()]
          .map(([k, v]) => `${k}×${v}`)
          .join(", ") || "none yet"}.
Tone: editorial, cream-and-charcoal Leaf brand — no hype, no purple prose.`,
      });
    } catch (err) {
      console.warn("[readingDna] summary generation skipped:", err);
    }
  }

  const now = new Date().toISOString();
  return {
    user_id: userId,
    genres,
    themes,
    pacing_preference: Math.round(pacing * 100) / 100,
    character_preference: Math.round(character * 100) / 100,
    worldbuilding_preference: Math.round(world * 100) / 100,
    emotional_preference: Math.round(emotion * 100) / 100,
    profile_summary: profileSummary,
    confidence: Math.round(confidence * 100) / 100,
    signals: {
      finished,
      rated,
      dnfCount: dnfRows?.length || 0,
      reasonCounts: Object.fromEntries(reasonCounts),
      prefSamples,
      signalCount,
      avgRating: rated > 0 ? Math.round((ratingSum / Math.max(rated, 1)) * 10) / 10 : null,
    },
    updated_at: now,
  };
}

export async function recomputeReadingDna(userId: string): Promise<ReadingDnaRow> {
  const dna = await computeReadingDna(userId);
  const db = createAdminClient();
  const { error } = await db.from("reading_dna").upsert(
    {
      user_id: dna.user_id,
      genres: dna.genres,
      themes: dna.themes,
      pacing_preference: dna.pacing_preference,
      character_preference: dna.character_preference,
      worldbuilding_preference: dna.worldbuilding_preference,
      emotional_preference: dna.emotional_preference,
      profile_summary: dna.profile_summary,
      confidence: dna.confidence,
      signals: dna.signals,
      updated_at: dna.updated_at,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[readingDna] upsert failed:", error);
    throw error;
  }
  return dna;
}

export async function getOrRecomputeReadingDna(
  userId: string,
  opts?: { force?: boolean }
): Promise<ReadingDnaRow> {
  const db = createAdminClient();
  if (!opts?.force) {
    const { data } = await db.from("reading_dna").select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      const updated = new Date(data.updated_at).getTime();
      if (Date.now() - updated < STALE_MS) {
        return data as ReadingDnaRow;
      }
    }
  }
  return recomputeReadingDna(userId);
}

export function dnaHasEnoughSignal(dna: ReadingDnaRow | null | undefined): boolean {
  if (!dna) return false;
  return (dna.confidence || 0) >= 0.2 || (dna.genres?.length || 0) > 0;
}
