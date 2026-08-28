import { INITIAL_BOOKS } from "@/data/mockData";
import type { Book } from "@/data/mockData";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import type { ReadingDnaRow } from "@/utils/readingDna";
import { getCatalogBooks, isFakeBookId, type CatalogShelf } from "@/utils/bookCatalog";
import { MOODS, type MoodId } from "@/utils/moods";

export { MOODS, type MoodId };

type MoodProfile = {
  shelves: CatalogShelf[];
  /** ISBNs with verified covers — always considered for this mood */
  curatedIds: string[];
  genreStrong: string[];
  genreSoft: string[];
  genrePenalty: string[];
  /** Title or author patterns — strong mood signal when cover exists */
  titleAuthorStrong: RegExp[];
  titleAuthorSoft: RegExp[];
  /** Description phrases — only count when at least one genre already matched */
  descBoost: RegExp[];
  /** Heavy mismatch when primary genres fight the mood */
  hardMismatch: (genres: string[], title: string) => string | null;
};

const MOOD_PROFILES: Record<MoodId, MoodProfile> = {
  cozy: {
    shelves: ["romance", "booktok", "literary", "historical"],
    curatedIds: ["9781984806734", "9780593441275", "9780140167771", "9781400078776"],
    genreStrong: ["cozy", "romance", "contemporary", "domestic"],
    genreSoft: ["drama", "historical", "literary fiction"],
    genrePenalty: ["horror", "thriller", "war", "crime", "dystopi"],
    titleAuthorStrong: [/emily henry/i, /liane moriarty/i, /fredrik backman/i],
    titleAuthorSoft: [/anne tyler/i, /kazuo ishiguro/i],
    descBoost: [/warm|gentle|comfort|slice-of-life|small town/i],
    hardMismatch: (g) =>
      g.some((x) => /horror|thriller|war/i.test(x)) ? "Likely too intense for a cozy read" : null,
  },
  thrilling: {
    shelves: ["mystery", "trending", "scifi", "literary"],
    curatedIds: ["9780307269751", "9780062073488", "9780385504201", "9781538724736", "9780593426213"],
    genreStrong: ["thriller", "mystery", "crime", "suspense", "noir"],
    genreSoft: ["horror", "sci-fi", "psychological"],
    genrePenalty: ["romance", "cozy", "memoir", "essay"],
    titleAuthorStrong: [/gillian flynn/i, /tana french/i, /lee child/i, /colleen hoover.*verity/i],
    titleAuthorSoft: [/stephen king/i, /agatha christie/i],
    descBoost: [/suspense|page-turner|twist|investigation|murder/i],
    hardMismatch: (g) =>
      g.every((x) => /romance|cozy|essay/i.test(x)) ? "Reads more gentle than suspense-driven" : null,
  },
  thoughtful: {
    shelves: ["literary", "modern-classics", "historical", "nonfiction", "award-winners"],
    curatedIds: ["9780140167771", "9781400078776", "9780593318171", "9780670026197", "9780735220676"],
    genreStrong: ["literary fiction", "literary", "philosophy", "essay", "classic"],
    genreSoft: ["historical fiction", "historical", "biography", "drama"],
    genrePenalty: ["booktok", "romance"],
    titleAuthorStrong: [/kazuo ishiguro/i, /marilynne robinson/i, /toni morrison/i, /sally rooney/i],
    titleAuthorSoft: [/harper lee/i, /ian mcewan/i],
    descBoost: [/meditation|philosoph|identity|memory|grief|literary/i],
    hardMismatch: (g, title) =>
      g.some((x) => /romance|booktok/i.test(x)) && !title.toLowerCase().includes("literary")
        ? "More plot-forward than contemplative"
        : null,
  },
  romantic: {
    shelves: ["romance", "booktok", "historical", "trending"],
    curatedIds: [
      "9781984806758",
      "9781984806734",
      "9780593336823",
      "9781501161933",
      "9781984822178",
      "9780593441275",
    ],
    genreStrong: ["romance", "love story", "rom-com", "romcom"],
    genreSoft: ["contemporary", "historical fiction", "booktok", "drama"],
    genrePenalty: ["horror", "war", "hard sci-fi", "true crime"],
    titleAuthorStrong: [/emily henry/i, /ali hazelwood/i, /taylor jenkins reid/i, /colleen hoover/i],
    titleAuthorSoft: [/jane austen/i, /bront/i],
    descBoost: [/love story|relationship|heartbreak|slow burn/i],
    hardMismatch: (g) =>
      g.every((x) => /thriller|horror|war/i.test(x)) ? "Low on central romance arc" : null,
  },
  epic: {
    shelves: ["fantasy", "scifi", "historical", "modern-classics"],
    curatedIds: [
      "9780261103573",
      "9780553103540",
      "9780765326355",
      "9780441172719",
      "9781476746586",
      "9780765311788",
    ],
    genreStrong: ["fantasy", "epic", "science fiction", "sci-fi", "adventure"],
    genreSoft: ["historical fiction", "war", "magic", "space"],
    genrePenalty: ["romance", "memoir", "essay", "cozy"],
    titleAuthorStrong: [/tolkien/i, /brandon sanderson/i, /frank herbert/i, /george r\. r\. martin/i],
    titleAuthorSoft: [/ursula le guin/i, /anthony doerr/i],
    descBoost: [/saga|quest|worldbuilding|empire|journey across/i],
    hardMismatch: (g) =>
      g.every((x) => /romance|memoir|essay/i.test(x)) ? "Scope stays intimate, not epic" : null,
  },
  dark: {
    shelves: ["mystery", "literary", "scifi", "modern-classics"],
    curatedIds: ["9780679728759", "9780451524935", "9780140167771", "9780307387899", "9781538724736"],
    genreStrong: ["horror", "gothic", "noir", "dystopi", "dark"],
    genreSoft: ["thriller", "psychological", "literary fiction", "crime"],
    genrePenalty: ["romance", "cozy", "comedy", "humor", "booktok"],
    titleAuthorStrong: [/cormac mccarthy/i, /shirley jackson/i, /gillian flynn/i],
    titleAuthorSoft: [/atwood/i, /orwell/i],
    descBoost: [/bleak|unsettling|disturbing|gothic|dystop/i],
    hardMismatch: (g) =>
      g.some((x) => /romance|cozy|comedy/i.test(x)) ? "Tone skews lighter than bleak" : null,
  },
  funny: {
    shelves: ["booktok", "romance", "biography", "nonfiction"],
    curatedIds: ["9781984806758", "9781982185824"],
    genreStrong: ["comedy", "humor", "humour", "satire", "parody"],
    genreSoft: ["romance", "contemporary", "memoir"],
    genrePenalty: ["literary fiction", "classic", "war", "tragedy", "horror"],
    titleAuthorStrong: [
      /emily henry/i,
      /david sedaris/i,
      /tina fey/i,
      /trevor noah/i,
      /douglas adams/i,
      /catch-22/i,
      /good omens/i,
      /bossypants/i,
    ],
    titleAuthorSoft: [/nick hornby/i, /marian keyes/i],
    descBoost: [/hilarious|witty|satirical|rom-com|laugh-out-loud/i],
    hardMismatch: (genres, title) => {
      const g = genres.join(" ").toLowerCase();
      if (/literary fiction|classic/i.test(g) && !/comedy|humor|satire/i.test(g)) {
        return "Literary drama — not a laugh-forward pick";
      }
      if (/memoir|biography/i.test(g) && /mom died|trauma|grief/i.test(title.toLowerCase())) {
        return "Humor is bittersweet — heavier than a light funny mood";
      }
      return null;
    },
  },
  true: {
    shelves: ["biography", "nonfiction", "historical", "award-winners"],
    curatedIds: [
      "9780399588174",
      "9781982185824",
      "9781524763138",
      "9781451648539",
      "9780812988406",
      "9780374275631",
    ],
    genreStrong: ["memoir", "biography", "non-fiction", "nonfiction", "history", "essay"],
    genreSoft: ["science", "anthropology", "politics", "journalism", "true crime"],
    genrePenalty: ["fantasy", "romance", "young adult fiction"],
    titleAuthorStrong: [/michelle obama/i, /trevor noah/i, /malcolm gladwell/i, /yuval/i],
    titleAuthorSoft: [/educated/i, /becoming/i],
    descBoost: [/memoir|true story|autobiograph|reporting|investigat/i],
    hardMismatch: (g) =>
      g.some((x) => /fantasy|romance|magic/i.test(x)) ? "Fiction — not a true-story pick" : null,
  },
};

export type MoodRecommendation = {
  book: Book;
  matchScore: number;
  reasons: string[];
  mismatches: string[];
};

function hasCover(bookId: string): boolean {
  return !isFakeBookId(bookId) && Boolean(COVER_ID_BY_ISBN[bookId]);
}

function normalizeGenres(book: Book): string[] {
  return (book.genres || []).map((g) => g.toLowerCase());
}

function genreMatches(genres: string[], needles: string[]): string[] {
  const hits: string[] = [];
  for (const needle of needles) {
    const n = needle.toLowerCase();
    for (const g of genres) {
      if (g.includes(n)) {
        hits.push(g);
        break;
      }
    }
  }
  return hits;
}

function scoreBookForMood(book: Book, mood: MoodId): {
  core: number;
  reasons: string[];
  mismatches: string[];
} {
  const profile = MOOD_PROFILES[mood];
  const genres = normalizeGenres(book);
  const blob = `${book.title} ${book.author}`.toLowerCase();
  const desc = (book.description || "").toLowerCase();
  const reasons: string[] = [];
  const mismatches: string[] = [];
  let core = 0;

  if (profile.curatedIds.includes(book.id)) {
    core += 0.22;
    reasons.push(`Hand-picked for a ${MOODS.find((m) => m.id === mood)?.label.toLowerCase()} mood`);
  }

  const strongGenreHits = genreMatches(genres, profile.genreStrong);
  if (strongGenreHits.length > 0) {
    core += Math.min(0.48, 0.28 + strongGenreHits.length * 0.1);
    reasons.push(`Catalogued as ${strongGenreHits.slice(0, 2).join(" · ")}`);
  }

  const softGenreHits = genreMatches(genres, profile.genreSoft);
  if (softGenreHits.length > 0 && strongGenreHits.length === 0) {
    core += Math.min(0.14, 0.06 + softGenreHits.length * 0.04);
    if (mood === "funny") {
      mismatches.push("Warm or romantic — more smiles than straight comedy");
    } else {
      reasons.push(`Adjacent tone: ${softGenreHits[0]}`);
    }
  } else if (softGenreHits.length > 0 && strongGenreHits.length > 0) {
    core += 0.06;
    reasons.push(`Blends ${softGenreHits[0]} with the core mood`);
  }

  const penaltyHits = genreMatches(genres, profile.genrePenalty);
  if (penaltyHits.length > 0 && strongGenreHits.length === 0) {
    core -= Math.min(0.38, 0.12 * penaltyHits.length);
    mismatches.push(`${penaltyHits[0]} skews away from this mood`);
  }

  if (profile.titleAuthorStrong.some((re) => re.test(blob))) {
    core += 0.26;
    reasons.push("Author/title strongly matches this vibe");
  } else if (profile.titleAuthorSoft.some((re) => re.test(blob))) {
    core += 0.12;
    reasons.push("Author/title leans this direction");
  }

  const hasGenreSignal = strongGenreHits.length > 0 || softGenreHits.length > 0;
  if (hasGenreSignal && profile.descBoost.some((re) => re.test(desc))) {
    core += 0.08;
    reasons.push("Description echoes the mood you picked");
  }

  // Block description-only false positives (e.g. "humor and pathos" on literary classics)
  if (
    strongGenreHits.length === 0 &&
    profile.descBoost.some((re) => re.test(desc)) &&
    penaltyHits.length > 0
  ) {
    core -= 0.2;
    mismatches.push("Marketing copy mentions the mood, but genres disagree");
  }

  const hard = profile.hardMismatch(genres, book.title);
  if (hard) {
    mismatches.push(hard);
    if (strongGenreHits.length === 0) core -= 0.15;
  }

  return { core: Math.max(0, core), reasons, mismatches };
}

function dnaBoost(book: Book, dna: ReadingDnaRow | null): { delta: number; reasons: string[]; mismatches: string[] } {
  if (!dna || (dna.confidence || 0) < 0.15) {
    return { delta: 0, reasons: [], mismatches: [] };
  }
  const genres = normalizeGenres(book).join(" ");
  let delta = 0;
  const reasons: string[] = [];
  const mismatches: string[] = [];

  for (const g of dna.genres.slice(0, 5)) {
    const name = g.name.toLowerCase();
    if (genres.includes(name) || book.title.toLowerCase().includes(name)) {
      delta += 0.05 + Math.min(0.05, (g.weight || 0) * 0.02);
      reasons.push(`Matches your taste for ${g.name}`);
      break;
    }
  }

  if (dna.pacing_preference < 0.4 && /thriller|crime|suspense/i.test(genres)) {
    delta -= 0.04;
    mismatches.push("Pacing may run hotter than you usually enjoy");
  }
  if (dna.emotional_preference > 0.65 && /romance|memoir|literary/i.test(genres)) {
    delta += 0.03;
    reasons.push("Fits your appetite for emotional depth");
  }

  return { delta, reasons, mismatches };
}

function buildPool(opts: {
  moods: MoodId[];
  excludeIds: Set<string>;
}): Map<string, Book> {
  const pool = new Map<string, Book>();

  const add = (book: Book | undefined) => {
    if (!book || opts.excludeIds.has(book.id) || !hasCover(book.id)) return;
    pool.set(book.id, book);
  };

  const catalogById = new Map(INITIAL_BOOKS.map((b) => [b.id, b]));

  for (const mood of opts.moods) {
    const profile = MOOD_PROFILES[mood];
    for (const id of profile.curatedIds) add(catalogById.get(id));
    for (const shelf of profile.shelves) {
      for (const b of getCatalogBooks(shelf, 36, 0)) add(b);
    }
  }

  // Genre sweep across catalog for stronger recall
  for (const book of INITIAL_BOOKS) {
    if (opts.excludeIds.has(book.id) || !hasCover(book.id)) continue;
    const genres = normalizeGenres(book).join(" ");
    for (const mood of opts.moods) {
      const p = MOOD_PROFILES[mood];
      if (
        genreMatches(normalizeGenres(book), p.genreStrong).length > 0 ||
        p.titleAuthorStrong.some((re) => re.test(`${book.title} ${book.author}`))
      ) {
        pool.set(book.id, book);
        break;
      }
    }
  }

  return pool;
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

  const pool = buildPool({ moods, excludeIds: opts.excludeIds });
  const scored: Array<MoodRecommendation & { raw: number }> = [];

  for (const book of pool.values()) {
    if (opts.recentRecIds?.has(book.id)) continue;

    let moodCore = 0;
    const reasons: string[] = [];
    const mismatches: string[] = [];

    for (const mood of moods) {
      const part = scoreBookForMood(book, mood);
      moodCore += part.core;
      reasons.push(...part.reasons);
      mismatches.push(...part.mismatches);
    }
    moodCore /= moods.length;

    const dna = dnaBoost(book, opts.dna);
    let score = moodCore + dna.delta;

    if (book.averageRating >= 4.4) score += 0.03;
    else if (book.averageRating < 3.4) score -= 0.04;

    const blob = normalizeGenres(book).join(" ");
    if (opts.dnfGenrePenalties) {
      for (const [genre, pen] of opts.dnfGenrePenalties) {
        if (blob.includes(genre.toLowerCase())) score -= pen;
      }
    }

    scored.push({
      book,
      matchScore: 0,
      reasons: [...new Set(reasons)].slice(0, 3),
      mismatches: [...new Set(mismatches)].slice(0, 2),
      raw: score,
    });
  }

  let threshold = 0.28;
  let filtered = scored.filter((s) => s.raw >= threshold);
  if (filtered.length < 3) threshold = 0.18;
  filtered = scored.filter((s) => s.raw >= threshold);

  filtered.sort((a, b) => b.raw - a.raw);

  const limit = opts.limit ?? 5;
  return filtered.slice(0, limit).map(({ raw, ...rest }) => ({
    ...rest,
    matchScore: Math.round(Math.max(0.12, Math.min(0.96, raw)) * 100),
    reasons: rest.reasons.length > 0 ? rest.reasons : ["Best available match in your catalog"],
  }));
}
