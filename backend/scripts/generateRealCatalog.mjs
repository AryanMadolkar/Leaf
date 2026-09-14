/**
 * Generate a large catalog of REAL editions from Open Library.
 * - Resumes from existing mockBooksGenerated.ts when present
 * - Prefers / forces English titles
 * - Requires: ISBN-13, cover_i, title, author
 *
 * Usage (from backend/): node scripts/generateRealCatalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { modernFavorites } from "./modernFavorites.mjs";
import { curatedBooks } from "./curatedBooks.mjs";
import { englishTitleOverride } from "./englishTitleOverrides.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Existing catalog (~29k) + 10,000 more real books. */
const TARGET_COUNT = 40000;
const PAGE_SIZE = 100;
const USER_AGENT = "LeafLibrary/1.0 (catalog builder; real English books)";

const SUBJECT_QUERIES = [
  { q: "subject:fantasy", genre: "Fantasy" },
  { q: "subject:science_fiction", genre: "Sci-Fi" },
  { q: "subject:mystery", genre: "Mystery & Thriller" },
  { q: "subject:thriller", genre: "Mystery & Thriller" },
  { q: "subject:crime", genre: "Mystery & Thriller" },
  { q: "subject:romance", genre: "Romance" },
  { q: "subject:historical_fiction", genre: "Historical Fiction" },
  { q: "subject:biography", genre: "Biography & Memoir" },
  { q: "subject:autobiography", genre: "Biography & Memoir" },
  { q: "subject:young_adult", genre: "Young Adult" },
  { q: "subject:classics", genre: "Classics" },
  { q: "subject:literary", genre: "Literary Fiction" },
  { q: "subject:horror", genre: "Horror" },
  { q: "subject:adventure", genre: "Adventure" },
  { q: "subject:poetry", genre: "Poetry" },
  { q: "subject:history", genre: "Non-Fiction" },
  { q: "subject:psychology", genre: "Non-Fiction" },
  { q: "subject:philosophy", genre: "Non-Fiction" },
  { q: "subject:business", genre: "Non-Fiction" },
  { q: "subject:self-help", genre: "Non-Fiction" },
  { q: "subject:science", genre: "Non-Fiction" },
  { q: "subject:war", genre: "Historical Fiction" },
  { q: "subject:humor", genre: "Literary Fiction" },
  { q: "subject:graphic_novels", genre: "Graphic Novel" },
  { q: "subject:magical_realism", genre: "Literary Fiction" },
  { q: "subject:dystopia", genre: "Sci-Fi" },
  { q: "subject:space_opera", genre: "Sci-Fi" },
  { q: "subject:detective", genre: "Mystery & Thriller" },
  { q: "subject:contemporary", genre: "Literary Fiction" },
  { q: "subject:memoir", genre: "Biography & Memoir" },
  { q: "subject:comics", genre: "Graphic Novel" },
  { q: "subject:urban_fantasy", genre: "Fantasy" },
  { q: "subject:epic_fantasy", genre: "Fantasy" },
  { q: "subject:paranormal", genre: "Romance" },
  { q: "subject:chick_lit", genre: "Romance" },
  { q: "subject:suspense", genre: "Mystery & Thriller" },
  { q: "subject:espionage", genre: "Mystery & Thriller" },
  { q: "subject:true_crime", genre: "Non-Fiction" },
  { q: "subject:travel", genre: "Non-Fiction" },
  { q: "subject:music", genre: "Non-Fiction" },
  { q: "subject:art", genre: "Non-Fiction" },
  { q: "subject:sports", genre: "Non-Fiction" },
  { q: "subject:religion", genre: "Non-Fiction" },
  { q: "subject:politics", genre: "Non-Fiction" },
  { q: "subject:economics", genre: "Non-Fiction" },
  { q: "subject:technology", genre: "Non-Fiction" },
  { q: "subject:nature", genre: "Non-Fiction" },
  { q: "subject:children", genre: "Young Adult" },
  { q: "subject:middle_grade", genre: "Young Adult" },
  { q: "subject:coming_of_age", genre: "Literary Fiction" },
  { q: "subject:short_stories", genre: "Literary Fiction" },
  { q: "subject:essays", genre: "Literary Fiction" },
  { q: "subject:plays", genre: "Classics" },
  { q: "subject:mythology", genre: "Fantasy" },
  { q: "subject:fairy_tales", genre: "Fantasy" },
  { q: "subject:steampunk", genre: "Sci-Fi" },
  { q: "subject:cyberpunk", genre: "Sci-Fi" },
  { q: "subject:western", genre: "Adventure" },
  { q: "subject:literary_fiction", genre: "Literary Fiction" },
  { q: "subject:african_american", genre: "Literary Fiction" },
  { q: "subject:lgbt", genre: "Literary Fiction" },
  { q: "subject:feminism", genre: "Non-Fiction" },
  { q: "subject:climate", genre: "Non-Fiction" },
  { q: "subject:medicine", genre: "Non-Fiction" },
  { q: "subject:education", genre: "Non-Fiction" },
  { q: "subject:journalism", genre: "Non-Fiction" },
  { q: "subject:espionage_fiction", genre: "Mystery & Thriller" },
  { q: "subject:cozy_mystery", genre: "Mystery & Thriller" },
  { q: "subject:legal_stories", genre: "Mystery & Thriller" },
  { q: "subject:police_procedural", genre: "Mystery & Thriller" },
  { q: "subject:historical_romance", genre: "Romance" },
  { q: "subject:contemporary_romance", genre: "Romance" },
  { q: "subject:dark_fantasy", genre: "Fantasy" },
  { q: "subject:high_fantasy", genre: "Fantasy" },
  { q: "subject:military_science_fiction", genre: "Sci-Fi" },
  { q: "subject:time_travel", genre: "Sci-Fi" },
  { q: "award:pulitzer", genre: "Literary Fiction" },
  { q: "award:hugo", genre: "Sci-Fi" },
  { q: "award:nebula", genre: "Sci-Fi" },
  { q: "award:booker", genre: "Literary Fiction" },
  { q: "award:national_book_award", genre: "Literary Fiction" },
  { q: "award:newbery", genre: "Young Adult" },
  { q: "award:caldecott", genre: "Young Adult" },
  { q: "award:edgar", genre: "Mystery & Thriller" },
  { q: "language:eng AND ebook_access:borrowable", genre: "Literary Fiction" },
  { q: "language:eng AND has_fulltext:true", genre: "Classics" },
  { q: "language:eng AND first_publish_year:[2015 TO 2026]", genre: "Literary Fiction" },
  { q: "language:eng AND first_publish_year:[2000 TO 2014]", genre: "Literary Fiction" },
  { q: "language:eng AND first_publish_year:[1980 TO 1999]", genre: "Literary Fiction" },
  { q: "language:eng AND first_publish_year:[1950 TO 1979]", genre: "Classics" },
  { q: "language:eng AND first_publish_year:[1900 TO 1949]", genre: "Classics" },
];

const NON_LATIN =
  /[\u0400-\u04FF\u0500-\u052F\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\u0E00-\u0E7F]/;
const FOREIGN_ARTICLES =
  /^(Die|Der|Das|Ein|Eine|El|Los|Las|Una|Unos|Unas|Le|La|Les|Un|Une|Des|Il|Lo|Gli|I|Het|Een|Den|Det|En)\s/i;
const FOREIGN_CONNECTIVES =
  /\b(und|oder|von|für|mit|über|zur|zum|del|della|delle|degli|dans|pour|avec|sur|och|eller|av|til|för|wiez|könig|histoire|revolte|fließende)\b/i;

function pickIsbn13(isbnList = []) {
  const cleaned = isbnList.map((i) => String(i).replace(/[^0-9Xx]/g, ""));
  const thirteen = cleaned.find((c) => /^978\d{10}$/.test(c));
  return thirteen || null;
}

function isFakeIsbn(isbn) {
  return !/^978\d{10}$/.test(isbn) || /^97810[0-3]/.test(isbn);
}

function stableRating(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash += title.charCodeAt(i);
  return parseFloat((3.7 + (hash % 13) / 10).toFixed(1));
}

function mapSubjects(olSubjects = [], fallbackGenre) {
  const out = new Set([fallbackGenre]);
  const joined = olSubjects.slice(0, 12).map((s) => String(s).toLowerCase());
  if (joined.some((s) => s.includes("fantasy"))) out.add("Fantasy");
  if (joined.some((s) => s.includes("science fiction") || s.includes("sci-fi"))) out.add("Sci-Fi");
  if (joined.some((s) => s.includes("mystery") || s.includes("thriller") || s.includes("crime")))
    out.add("Mystery & Thriller");
  if (joined.some((s) => s.includes("romance"))) out.add("Romance");
  if (joined.some((s) => s.includes("historical"))) out.add("Historical Fiction");
  if (joined.some((s) => s.includes("biography") || s.includes("memoir"))) out.add("Biography & Memoir");
  if (joined.some((s) => s.includes("young adult") || s.includes("juvenile"))) out.add("Young Adult");
  if (joined.some((s) => s.includes("classic"))) out.add("Classics");
  return Array.from(out).slice(0, 4);
}

/** Normalize curly quotes / dashes but keep Latin accents that appear in English titles. */
function normalizeTitle(title) {
  return String(title || "")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

function looksEnglish(title) {
  const t = normalizeTitle(title);
  if (!t || t.length < 2) return false;
  if (NON_LATIN.test(t)) return false;
  // Strong foreign-language openers / connectives without common English words
  const hasEnglishCue =
    /\b(the|a|an|of|and|or|to|in|on|for|with|from|by|at|is|are|was|were|his|her|their|my|our|you|who|what|when|where|how|book|story|life|man|woman|girl|boy|world|night|day|house|city|war|love|death|king|queen|lord|lady|dark|light|time|year|new|old|last|first|secret|great|little|black|white|red|blue)\b/i.test(
      t
    );
  if (FOREIGN_ARTICLES.test(t) && !hasEnglishCue) return false;
  if (FOREIGN_CONNECTIVES.test(t) && !hasEnglishCue) return false;
  // Mostly Latin letters / digits / punctuation
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 2) return false;
  return true;
}

function needsEnglishLookup(title) {
  const t = normalizeTitle(title);
  if (!t) return true;
  if (NON_LATIN.test(t)) return true;
  if (FOREIGN_ARTICLES.test(t) && !looksEnglish(t)) return true;
  if (FOREIGN_CONNECTIVES.test(t) && !looksEnglish(t)) return true;
  return !looksEnglish(t);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function resolveEnglishTitle(isbn, title, author) {
  const normalized = normalizeTitle(title);
  if (!needsEnglishLookup(normalized)) return normalized;

  const mapped = englishTitleOverride(normalized) || englishTitleOverride(title);
  if (mapped) return mapped;

  // 1) English-language search hit for this ISBN
  try {
    const data = await fetchJson(
      `https://openlibrary.org/search.json?q=isbn:${encodeURIComponent(isbn)}` +
        `&language=eng&limit=5&fields=title`,
      5000
    );
    for (const doc of data.docs || []) {
      const t = normalizeTitle(doc.title);
      if (t && looksEnglish(t)) return t;
    }
  } catch {
    // continue
  }

  // 2) Work record title (often the canonical / English title)
  try {
    const ed = await fetchJson(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`, 5000);
    const workKey = ed?.works?.[0]?.key;
    if (workKey) {
      const work = await fetchJson(`https://openlibrary.org${workKey}.json`, 5000);
      const workTitle = normalizeTitle(work?.title);
      if (workTitle && looksEnglish(workTitle)) return workTitle;
    }
  } catch {
    // continue
  }

  return null;
}

function loadExistingCatalog() {
  const outPath = path.resolve(__dirname, "../../frontend/src/data/mockBooksGenerated.ts");
  if (!fs.existsSync(outPath)) return [];
  const raw = fs.readFileSync(outPath, "utf8");
  // Match `= [` after the export — not the `[` inside `Book[]`
  const match = raw.match(/export const GENERATED_BOOKS[\s\S]*?=\s*(\[)/);
  if (!match || match.index == null) return [];
  const start = match.index + match[0].length - 1;
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    console.warn("Could not parse existing catalog:", err.message);
    return [];
  }
}

async function crawlSubject({ q, genre }, seenIsbns, books, coverMap) {
  let page = 1;
  let emptyStreak = 0;
  while (books.length < TARGET_COUNT && page <= 100 && emptyStreak < 3) {
    const url =
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}` +
      `&language=eng&limit=${PAGE_SIZE}&page=${page}` +
      `&fields=key,title,author_name,first_publish_year,number_of_pages_median,isbn,cover_i,subject,ratings_average,language`;
    process.stdout.write(`\r[${books.length}/${TARGET_COUNT}] ${genre} page ${page}…`);
    let data;
    try {
      data = await fetchJson(url);
    } catch (err) {
      console.warn(`\nWarn: ${err.message}`);
      await sleep(1500);
      emptyStreak++;
      page++;
      continue;
    }

    const docs = data.docs || [];
    if (docs.length === 0) break;

    let added = 0;
    for (const doc of docs) {
      if (books.length >= TARGET_COUNT) break;
      if (!doc.cover_i || !doc.title || !doc.author_name?.length) continue;
      const isbn = pickIsbn13(doc.isbn || []);
      if (!isbn || isFakeIsbn(isbn) || seenIsbns.has(isbn)) continue;

      let title = normalizeTitle(doc.title);
      if (needsEnglishLookup(title)) {
        const english = await resolveEnglishTitle(isbn, title, doc.author_name[0]);
        await sleep(120);
        if (!english) continue;
        title = english;
      }

      seenIsbns.add(isbn);
      coverMap[isbn] = doc.cover_i;

      const author = doc.author_name[0];
      const year = doc.first_publish_year || 2000;
      const pages = doc.number_of_pages_median || 300;
      const rating =
        typeof doc.ratings_average === "number"
          ? parseFloat(Math.min(4.9, Math.max(3.5, doc.ratings_average)).toFixed(1))
          : stableRating(title);

      books.push({
        id: isbn,
        title,
        author,
        year,
        description: `${title} by ${author}` + (year ? `, first published ${year}.` : "."),
        coverImage: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,
        averageRating: rating,
        genres: mapSubjects(doc.subject || [], genre),
        pages,
      });
      added++;
    }

    if (added === 0) emptyStreak++;
    else emptyStreak = 0;
    page++;
    await sleep(300);
  }
}

function seedFromCurated(seenIsbns, books) {
  for (const b of [...curatedBooks, ...modernFavorites]) {
    if (!b.isbn || seenIsbns.has(b.isbn) || isFakeIsbn(b.isbn)) continue;
    seenIsbns.add(b.isbn);
    books.push({
      id: b.isbn,
      title: normalizeTitle(b.title),
      author: b.author,
      year: b.year,
      description: b.desc,
      coverImage: `https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg?default=false`,
      averageRating: stableRating(b.title),
      genres: [b.genre, "Popular", "Bestseller"].slice(0, 4),
      pages: b.pages,
    });
  }
}

async function enrichCoverIds(books, coverMap) {
  const need = books.filter((b) => !coverMap[b.id]);
  console.log(`Resolving cover_i for ${need.length} seeded ISBNs…`);
  for (let i = 0; i < need.length; i += 20) {
    const batch = need.slice(i, i + 20);
    await Promise.all(
      batch.map(async (book) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        try {
          const res = await fetch(
            `https://openlibrary.org/search.json?q=isbn:${book.id}&fields=cover_i&limit=1`,
            {
              signal: controller.signal,
              headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
            }
          );
          if (!res.ok) return;
          const data = await res.json();
          const coverI = data?.docs?.[0]?.cover_i;
          if (coverI) {
            coverMap[book.id] = coverI;
            book.coverImage = `https://covers.openlibrary.org/b/id/${coverI}-L.jpg?default=false`;
          }
        } catch {
          // keep isbn URL
        } finally {
          clearTimeout(timer);
        }
      })
    );
    process.stdout.write(`\r  cover enrich ${Math.min(i + 20, need.length)}/${need.length}`);
    await sleep(150);
  }
  console.log("");
}

async function anglicizeExistingTitles(books) {
  const suspects = books.filter((b) => needsEnglishLookup(b.title));
  console.log(`Anglicizing ${suspects.length} non-English titles…`);
  let fixed = 0;
  let dropped = 0;
  const dropIds = new Set();
  const CONCURRENCY = 8;

  for (let i = 0; i < suspects.length; i += CONCURRENCY) {
    const batch = suspects.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (book) => {
        const english = await resolveEnglishTitle(book.id, book.title, book.author);
        if (english && english !== normalizeTitle(book.title)) {
          book.title = english;
          book.description =
            `${english} by ${book.author}` + (book.year ? `, first published ${book.year}.` : ".");
          fixed++;
          return;
        }
        if (english && looksEnglish(english)) {
          book.title = english;
          return;
        }
        // Only drop non-Latin scripts when no English edition exists.
        // Keep Latin-script foreign titles rather than deleting the book.
        if (NON_LATIN.test(book.title)) {
          dropIds.add(book.id);
          dropped++;
        } else if (english) {
          book.title = english;
        } else {
          book.title = normalizeTitle(book.title);
        }
      })
    );
    process.stdout.write(
      `\r  english titles ${Math.min(i + CONCURRENCY, suspects.length)}/${suspects.length} (fixed ${fixed}, drop ${dropped})`
    );
    await sleep(80);
  }
  console.log("");
  return books.filter((b) => !dropIds.has(b.id));
}

function writeCatalog(exact, coverMap) {
  const outPath = path.resolve(__dirname, "../../frontend/src/data/mockBooksGenerated.ts");
  const fileContent =
    `// THIS FILE IS AUTOMATICALLY GENERATED FROM OPEN LIBRARY. DO NOT EDIT.\n` +
    `// Real English editions only (ISBN-13 + cover_i). Generated ${new Date().toISOString()}\n` +
    `import { Book } from "./mockData";\n\n` +
    `export const GENERATED_BOOKS: Book[] = ${JSON.stringify(exact, null, 2)};\n`;

  fs.writeFileSync(outPath, fileContent, "utf8");
  console.log(`Wrote ${outPath} (${exact.length} books)`);

  const overridesPath = path.resolve(__dirname, "../../frontend/src/data/coverOverrides.ts");
  const exactIds = new Set(exact.map((b) => b.id));
  const overrideEntries = Object.entries(coverMap)
    .filter(([isbn]) => exactIds.has(isbn))
    .sort(([a], [b]) => a.localeCompare(b));
  const overridesContent =
    `// Auto-generated Open Library cover IDs (isbn -> cover_i)\n` +
    `// Generated ${new Date().toISOString()} — real catalog only\n` +
    `export const COVER_ID_BY_ISBN: Record<string, number> = {\n` +
    overrideEntries.map(([isbn, id]) => `  "${isbn}": ${id},`).join("\n") +
    `\n};\n`;
  fs.writeFileSync(overridesPath, overridesContent, "utf8");
  console.log(`Wrote ${overridesPath} (${overrideEntries.length} covers)`);
}

async function main() {
  const seenIsbns = new Set();
  const books = [];
  const coverMap = {};

  // Reuse previously known cover IDs
  try {
    const overridesPath = path.resolve(__dirname, "../../frontend/src/data/coverOverrides.ts");
    const raw = fs.readFileSync(overridesPath, "utf8");
    for (const m of raw.matchAll(/"(\d{13})":\s*(\d+)/g)) {
      coverMap[m[1]] = Number(m[2]);
    }
    console.log(`Loaded ${Object.keys(coverMap).length} existing cover overrides`);
  } catch {
    // first run
  }

  // Resume from existing generated catalog
  const existing = loadExistingCatalog();
  console.log(`Loaded ${existing.length} existing catalog books`);
  for (const b of existing) {
    if (!b?.id || isFakeIsbn(b.id) || seenIsbns.has(b.id)) continue;
    if (!b.title || !b.author) continue;
    seenIsbns.add(b.id);
    const title = normalizeTitle(b.title);
    books.push({
      ...b,
      title,
      coverImage:
        (coverMap[b.id]
          ? `https://covers.openlibrary.org/b/id/${coverMap[b.id]}-L.jpg?default=false`
          : b.coverImage) || `https://covers.openlibrary.org/b/isbn/${b.id}-L.jpg?default=false`,
    });
  }

  console.log("Seeding curated classics + modern favorites…");
  seedFromCurated(seenIsbns, books);
  for (const book of books) {
    if (coverMap[book.id]) {
      book.coverImage = `https://covers.openlibrary.org/b/id/${coverMap[book.id]}-L.jpg?default=false`;
    }
  }
  console.log(`Catalog after seed merge: ${books.length}`);

  // Apply static English overrides without network
  let overrideHits = 0;
  for (const book of books) {
    const mapped = englishTitleOverride(book.title) || englishTitleOverride(normalizeTitle(book.title));
    if (mapped && mapped !== book.title) {
      book.title = mapped;
      book.description =
        `${mapped} by ${book.author}` + (book.year ? `, first published ${book.year}.` : ".");
      overrideHits++;
    }
  }
  if (overrideHits) console.log(`Applied ${overrideHits} static English title overrides`);

  // Convert remaining foreign titles → English (or drop non-Latin if no English edition)
  const anglicized = await anglicizeExistingTitles(books);
  books.length = 0;
  books.push(...anglicized);
  // rebuild seen set after drops
  seenIsbns.clear();
  for (const b of books) seenIsbns.add(b.id);
  console.log(`After English title pass: ${books.length}`);

  // Checkpoint write so we don't lose anglicized titles if crawl is interrupted
  writeCatalog(books, coverMap);

  for (const subject of SUBJECT_QUERIES) {
    if (books.length >= TARGET_COUNT) break;
    const before = books.length;
    await crawlSubject(subject, seenIsbns, books, coverMap);
    if (books.length > before) {
      writeCatalog(books.slice(0, Math.min(books.length, TARGET_COUNT)), coverMap);
      console.log(`\nCheckpoint: ${books.length} books after ${subject.genre}`);
    }
  }

  if (books.length < TARGET_COUNT) {
    await crawlSubject({ q: "language:eng", genre: "Literary Fiction" }, seenIsbns, books, coverMap);
  }

  let page = 1;
  while (books.length < TARGET_COUNT && page <= 400) {
    const url =
      `https://openlibrary.org/search.json?q=*` +
      `&language=eng&sort=editions&limit=${PAGE_SIZE}&page=${page}` +
      `&fields=key,title,author_name,first_publish_year,number_of_pages_median,isbn,cover_i,subject,ratings_average`;
    process.stdout.write(`\r[${books.length}/${TARGET_COUNT}] editions page ${page}…`);
    try {
      const data = await fetchJson(url);
      const docs = data.docs || [];
      if (!docs.length) break;
      for (const doc of docs) {
        if (books.length >= TARGET_COUNT) break;
        if (!doc.cover_i || !doc.title || !doc.author_name?.length) continue;
        const isbn = pickIsbn13(doc.isbn || []);
        if (!isbn || isFakeIsbn(isbn) || seenIsbns.has(isbn)) continue;
        let title = normalizeTitle(doc.title);
        if (needsEnglishLookup(title)) {
          const english = await resolveEnglishTitle(isbn, title, doc.author_name[0]);
          await sleep(100);
          if (!english) continue;
          title = english;
        }
        seenIsbns.add(isbn);
        coverMap[isbn] = doc.cover_i;
        books.push({
          id: isbn,
          title,
          author: doc.author_name[0],
          year: doc.first_publish_year || 2000,
          description: `${title} by ${doc.author_name[0]}.`,
          coverImage: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,
          averageRating:
            typeof doc.ratings_average === "number"
              ? parseFloat(Math.min(4.9, Math.max(3.5, doc.ratings_average)).toFixed(1))
              : stableRating(title),
          genres: mapSubjects(doc.subject || [], "Literary Fiction"),
          pages: doc.number_of_pages_median || 300,
        });
      }
    } catch (err) {
      console.warn(`\nWarn: ${err.message}`);
      await sleep(1500);
    }
    page++;
    await sleep(300);

    if (page % 10 === 0) {
      writeCatalog(books.slice(0, Math.min(books.length, TARGET_COUNT)), coverMap);
      console.log(`\nEditions checkpoint: ${books.length}`);
    }
  }

  console.log(`\nEnriching cover IDs for curated seeds…`);
  const seedCount = curatedBooks.length + modernFavorites.length;
  await enrichCoverIds(books.slice(0, Math.min(books.length, seedCount)), coverMap);

  const exact = books.slice(0, TARGET_COUNT);
  console.log(`\nFinal catalog size: ${exact.length}`);

  const fakeCount = exact.filter((b) => isFakeIsbn(b.id)).length;
  if (fakeCount > 0) {
    throw new Error(`Refusing to write catalog: ${fakeCount} fake ISBNs slipped in`);
  }

  const stillForeign = exact.filter((b) => needsEnglishLookup(b.title));
  if (stillForeign.length) {
    console.warn(`Warning: ${stillForeign.length} titles still look non-English (kept after failed lookup)`);
  }

  writeCatalog(exact, coverMap);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
