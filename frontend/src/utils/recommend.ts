import type { Book } from "@/data/mockData";
import type { ReadingDnaRow } from "@/utils/readingDna";
import { getCatalogBooks } from "@/utils/bookCatalog";
import { MOODS, type MoodId } from "@/utils/moods";

export { MOODS, type MoodId };
const MOOD_GENRE_WEIGHTS: Record<MoodId, Array<{ match: RegExp; weight: number }>> = {
  cozy: [
    { match: /cozy|comfort|domestic|slice|gentle|cottage/i, weight: 1.2 },
    { match: /romance|contemporary|fiction/i, weight: 0.45 },
    { match: /horror|thriller|grim|war/i, weight: -0.9 },
  ],
  thrilling: [
    { match: /thriller|mystery|crime|suspense|spy/i, weight: 1.3 },
    { match: /horror|noir/i, weight: 0.5 },
    { match: /cozy|romance|memoir/i, weight: -0.4 },
  ],
  thoughtful: [
    { match: /literary|philosophy|essay|classic|history/i, weight: 1.2 },
    { match: /fiction|biography/i, weight: 0.35 },
    { match: /booktok|romance/i, weight: -0.25 },
  ],
  romantic: [
    { match: /romance|love|relationship/i, weight: 1.4 },
    { match: /contemporary|historical|booktok/i, weight: 0.4 },
    { match: /horror|war|hard sci/i, weight: -0.5 },
  ],
  epic: [
    { match: /fantasy|epic|adventure|science fiction|sci-?fi|space/i, weight: 1.3 },
    { match: /historical|quest/i, weight: 0.4 },
    { match: /memoir|essay/i, weight: -0.5 },
  ],
  dark: [
    { match: /horror|gothic|dark|dystopia|noir|grim/i, weight: 1.35 },
    { match: /thriller|literary/i, weight: 0.35 },
    { match: /cozy|romance|humor|comedy/i, weight: -0.8 },
  ],
  funny: [
    { match: /humor|humour|comedy|satire|comic|funny/i, weight: 1.4 },
    { match: /contemporary|essay/i, weight: 0.3 },
    { match: /horror|tragedy/i, weight: -0.6 },
  ],
  true: [
    { match: /memoir|biography|non.?fiction|history|essay|true/i, weight: 1.4 },
    { match: /science|politics/i, weight: 0.4 },
    { match: /fantasy|romance|fiction/i, weight: -0.35 },
  ],
};

export type MoodRecommendation = {
  book: Book;
  matchScore: number;
  reasons: string[];
  mismatches: string[];
};

function genreBlob(book: Book): string {
  return [...(book.genres || []), book.title, book.description || ""].join(" ");
}

function moodScore(book: Book, moods: MoodId[]): { score: number; hits: string[]; misses: string[] } {
  const blob = genreBlob(book);
  let score = 0.35;
  const hits: string[] = [];
  const misses: string[] = [];

  for (const mood of moods) {
    const rules = MOOD_GENRE_WEIGHTS[mood] || [];
    let moodHit = false;
    for (const rule of rules) {
      if (rule.match.test(blob)) {
        score += rule.weight * 0.18;
        if (rule.weight > 0) moodHit = true;
        if (rule.weight < -0.5) {
          misses.push(`May clash with “${mood}” energy`);
        }
      }
    }
    if (moodHit) {
      const label = MOODS.find((m) => m.id === mood)?.label || mood;
      hits.push(`Fits a ${label.toLowerCase()} mood`);
    }
  }

  if (book.averageRating >= 4.3) {
    score += 0.08;
    hits.push("Strong community rating");
  } else if (book.averageRating < 3.6) {
    score -= 0.06;
    misses.push("Mixed community reception");
  }

  return { score: Math.max(0, Math.min(1, score)), hits, misses };
}

function dnaBoost(book: Book, dna: ReadingDnaRow | null): { delta: number; reasons: string[]; mismatches: string[] } {
  if (!dna || (dna.confidence || 0) < 0.15) {
    return { delta: 0, reasons: [], mismatches: [] };
  }
  const blob = genreBlob(book).toLowerCase();
  let delta = 0;
  const reasons: string[] = [];
  const mismatches: string[] = [];

  for (const g of dna.genres.slice(0, 5)) {
    if (blob.includes(g.name.toLowerCase())) {
      delta += 0.06 + Math.min(0.06, (g.weight || 0) * 0.02);
      reasons.push(`Aligns with your ${g.name} leanings`);
      break;
    }
  }

  if (dna.pacing_preference < 0.4 && /thriller|page.?turner|fast/i.test(blob)) {
    delta -= 0.05;
    mismatches.push("Pacing may run hotter than you usually enjoy");
  }
  if (dna.emotional_preference > 0.65 && /romance|memoir|literary/i.test(blob)) {
    delta += 0.04;
    reasons.push("Matches your appetite for emotional intensity");
  }

  return { delta, reasons, mismatches };
}

export function recommendByMood(opts: {
  moods: string[];
  dna: ReadingDnaRow | null;
  excludeIds: Set<string>;
  dnfGenrePenalties?: Map<string, number>;
  recentRecIds?: Set<string>;
  limit?: number;
}): MoodRecommendation[] {
  const moods = opts.moods.filter((m): m is MoodId => MOODS.some((x) => x.id === m));
  if (moods.length === 0) return [];

  const shelves = [
    "all-time-greats",
    "trending",
    "literary",
    "mystery",
    "romance",
    "fantasy",
    "scifi",
    "biography",
    "nonfiction",
    "modern-classics",
  ] as const;

  const poolMap = new Map<string, Book>();
  for (const shelf of shelves) {
    for (const b of getCatalogBooks(shelf, 24, 0)) {
      if (!opts.excludeIds.has(b.id)) poolMap.set(b.id, b);
    }
  }

  const scored: MoodRecommendation[] = [];
  for (const book of poolMap.values()) {
    if (opts.recentRecIds?.has(book.id)) continue;

    const mood = moodScore(book, moods);
    const dna = dnaBoost(book, opts.dna);
    let score = mood.score + dna.delta;

    const blob = genreBlob(book).toLowerCase();
    if (opts.dnfGenrePenalties) {
      for (const [genre, pen] of opts.dnfGenrePenalties) {
        if (blob.includes(genre.toLowerCase())) {
          score -= pen;
        }
      }
    }

    score = Math.max(0.05, Math.min(0.98, score));
    const reasons = [...new Set([...mood.hits, ...dna.reasons])].slice(0, 4);
    const mismatches = [...new Set([...mood.misses, ...dna.mismatches])].slice(0, 3);

    if (reasons.length === 0) {
      reasons.push("Catalog pick near your selected mood");
    }

    scored.push({
      book,
      matchScore: Math.round(score * 100),
      reasons,
      mismatches,
    });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, opts.limit ?? 5);
}
