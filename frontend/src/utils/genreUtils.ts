/** Meta / shelf tags that should not appear in literary genre charts. */
const META_TAGS = new Set([
  "popular",
  "bestseller",
  "bestsellers",
  "booktok",
  "trending",
  "award",
  "award-winner",
  "award winners",
  "most-added",
  "all-time-greats",
]);

/** Map noisy tags → canonical literary genres. */
const CANONICAL_MAP: Record<string, string> = {
  fantasy: "Fantasy",
  "high fantasy": "Fantasy",
  magic: "Fantasy",
  "epic fantasy": "Fantasy",
  "sci-fi": "Sci-Fi",
  scifi: "Sci-Fi",
  "science fiction": "Sci-Fi",
  space: "Sci-Fi",
  "literary fiction": "Literary Fiction",
  literary: "Literary Fiction",
  drama: "Literary Fiction",
  romance: "Romance",
  contemporary: "Romance",
  "mystery & thriller": "Mystery & Thriller",
  mystery: "Mystery & Thriller",
  thriller: "Mystery & Thriller",
  crime: "Mystery & Thriller",
  suspense: "Mystery & Thriller",
  classics: "Classics",
  classic: "Classics",
  "historical fiction": "Historical Fiction",
  historical: "Historical Fiction",
  war: "Historical Fiction",
  "biography & memoir": "Biography & Memoir",
  biography: "Biography & Memoir",
  memoir: "Biography & Memoir",
  "non-fiction bestsellers": "Non-Fiction",
  "non-fiction": "Non-Fiction",
  nonfiction: "Non-Fiction",
  "non fiction": "Non-Fiction",
  psychology: "Non-Fiction",
  science: "Non-Fiction",
  "young adult": "Young Adult",
  ya: "Young Adult",
  adventure: "Adventure",
};

export function toCanonicalGenre(tag: string): string | null {
  const key = tag.trim().toLowerCase();
  if (!key || META_TAGS.has(key)) return null;
  if (CANONICAL_MAP[key]) return CANONICAL_MAP[key];

  for (const [pattern, canonical] of Object.entries(CANONICAL_MAP)) {
    if (key.includes(pattern)) return canonical;
  }

  // Keep unknown tags only if they look like a real genre label (not shelf junk)
  if (key.length < 3 || key.length > 40) return null;
  return tag.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Unique canonical genres for one book. */
export function canonicalGenresForBook(tags: string[] | null | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const canonical = toCanonicalGenre(tag);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      out.push(canonical);
    }
  }
  return out;
}

export type GenreSlice = { name: string; count: number; percentage: number };

/**
 * Build a literary genre distribution from per-book genre tag lists.
 * Each book contributes at most once per canonical genre.
 */
export function buildGenreDistribution(
  booksGenres: Array<string[] | null | undefined>,
  limit = 5
): GenreSlice[] {
  const genreCounts: Record<string, number> = {};

  for (const tags of booksGenres) {
    for (const genre of canonicalGenresForBook(tags)) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }
  }

  const ranked = Object.entries(genreCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);

  const total = ranked.reduce((sum, g) => sum + g.count, 0);
  if (total === 0) return [];

  // Renormalize so displayed slices always sum to 100%
  const withExact = ranked.map((g) => ({
    ...g,
    exact: (g.count / total) * 100,
  }));
  const rounded = withExact.map((g) => ({
    name: g.name,
    count: g.count,
    percentage: Math.round(g.exact),
  }));

  const drift = 100 - rounded.reduce((s, g) => s + g.percentage, 0);
  if (rounded.length > 0 && drift !== 0) {
    const richest = rounded.reduce((best, g, i) =>
      g.count > rounded[best].count ? i : best
    , 0);
    rounded[richest].percentage += drift;
  }

  return rounded;
}

export function favoriteGenreFromTags(booksGenres: Array<string[] | null | undefined>): string {
  const dist = buildGenreDistribution(booksGenres, 1);
  return dist[0]?.name || "Fiction";
}
