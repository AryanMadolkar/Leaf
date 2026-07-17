/**
 * Generate a ~5000-book catalog of REAL editions from Open Library.
 * Requires: ISBN-13, cover_i, title, author.
 *
 * Usage (from backend/): node scripts/generateRealCatalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { modernFavorites } from "./modernFavorites.mjs";
import { curatedBooks } from "./curatedBooks.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_COUNT = 5000;
const PAGE_SIZE = 100;
const USER_AGENT = "LeafLibrary/1.0 (catalog builder; real books only)";

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
  // Popularity / award-ish crawls
  { q: "award:pulitzer", genre: "Literary Fiction" },
  { q: "award:hugo", genre: "Sci-Fi" },
  { q: "award:nebula", genre: "Sci-Fi" },
  { q: "award:booker", genre: "Literary Fiction" },
  { q: "language:eng AND ebook_access:public", genre: "Classics" },
];

function pickIsbn13(isbnList = []) {
  const cleaned = isbnList.map((i) => String(i).replace(/[^0-9Xx]/g, ""));
  const thirteen = cleaned.find((c) => /^978\d{10}$/.test(c));
  return thirteen || null;
}

function isFakeIsbn(isbn) {
  // Procedural fakes from the old generator used 978100–978103 prefixes
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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function crawlSubject({ q, genre }, seenIsbns, books, coverMap) {
  let page = 1;
  let emptyStreak = 0;
  while (books.length < TARGET_COUNT && page <= 40 && emptyStreak < 3) {
    const url =
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}` +
      `&language=eng&limit=${PAGE_SIZE}&page=${page}` +
      `&fields=key,title,author_name,first_publish_year,number_of_pages_median,isbn,cover_i,subject,ratings_average`;
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

      seenIsbns.add(isbn);
      coverMap[isbn] = doc.cover_i;

      const author = doc.author_name[0];
      const year = doc.first_publish_year || 2000;
      const pages = doc.number_of_pages_median || 300;
      const rating =
        typeof doc.ratings_average === "number"
          ? parseFloat(Math.min(4.9, Math.max(3.5, doc.ratings_average)).toFixed(1))
          : stableRating(doc.title);

      books.push({
        id: isbn,
        title: doc.title.trim(),
        author,
        year,
        description:
          `${doc.title.trim()} by ${author}` +
          (year ? `, first published ${year}.` : "."),
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
    await sleep(350);
  }
}

function seedFromCurated(seenIsbns, books) {
  for (const b of [...curatedBooks, ...modernFavorites]) {
    if (!b.isbn || seenIsbns.has(b.isbn) || isFakeIsbn(b.isbn)) continue;
    seenIsbns.add(b.isbn);
    books.push({
      id: b.isbn,
      title: b.title,
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
  for (let i = 0; i < need.length; i += 10) {
    const batch = need.slice(i, i + 10);
    await Promise.all(
      batch.map(async (book) => {
        try {
          const data = await fetchJson(
            `https://openlibrary.org/search.json?q=isbn:${book.id}&fields=cover_i&limit=1`
          );
          const coverI = data?.docs?.[0]?.cover_i;
          if (coverI) {
            coverMap[book.id] = coverI;
            book.coverImage = `https://covers.openlibrary.org/b/id/${coverI}-L.jpg?default=false`;
          }
        } catch {
          // keep isbn URL
        }
      })
    );
    process.stdout.write(`\r  cover enrich ${Math.min(i + 10, need.length)}/${need.length}`);
    await sleep(250);
  }
  console.log("");
}

async function main() {
  const seenIsbns = new Set();
  const books = [];
  const coverMap = {};

  console.log("Seeding curated classics + modern favorites…");
  seedFromCurated(seenIsbns, books);
  console.log(`Seeded ${books.length} curated real books`);

  for (const subject of SUBJECT_QUERIES) {
    if (books.length >= TARGET_COUNT) break;
    await crawlSubject(subject, seenIsbns, books, coverMap);
  }

  // Fill remainder from highly rated English works
  if (books.length < TARGET_COUNT) {
    await crawlSubject(
      { q: "language:eng", genre: "Literary Fiction" },
      seenIsbns,
      books,
      coverMap
    );
  }

  let page = 1;
  while (books.length < TARGET_COUNT && page <= 100) {
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
        seenIsbns.add(isbn);
        coverMap[isbn] = doc.cover_i;
        books.push({
          id: isbn,
          title: doc.title.trim(),
          author: doc.author_name[0],
          year: doc.first_publish_year || 2000,
          description: `${doc.title.trim()} by ${doc.author_name[0]}.`,
          coverImage: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,
          averageRating:
            typeof doc.ratings_average === "number"
              ? parseFloat(Math.min(4.9, Math.max(3.5, doc.ratings_average)).toFixed(1))
              : stableRating(doc.title),
          genres: mapSubjects(doc.subject || [], "Literary Fiction"),
          pages: doc.number_of_pages_median || 300,
        });
      }
    } catch (err) {
      console.warn(`\nWarn: ${err.message}`);
      await sleep(1500);
    }
    page++;
    await sleep(350);
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

  const outPath = path.resolve(__dirname, "../../frontend/src/data/mockBooksGenerated.ts");
  const fileContent =
    `// THIS FILE IS AUTOMATICALLY GENERATED FROM OPEN LIBRARY. DO NOT EDIT.\n` +
    `// Real editions only (ISBN-13 + cover_i). Generated ${new Date().toISOString()}\n` +
    `import { Book } from "./mockData";\n\n` +
    `export const GENERATED_BOOKS: Book[] = ${JSON.stringify(exact, null, 2)};\n`;

  fs.writeFileSync(outPath, fileContent, "utf8");
  console.log(`Wrote ${outPath}`);

  // Write cover override map for all books with cover_i
  const overridesPath = path.resolve(__dirname, "../../frontend/src/data/coverOverrides.ts");
  const overrideEntries = Object.entries(coverMap)
    .filter(([isbn]) => exact.some((b) => b.id === isbn))
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
