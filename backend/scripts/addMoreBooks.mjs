/**
 * Add ~10,000 NEW real books (from Open Library) directly into the live
 * Supabase `books` table, skipping anything already in the DB.
 *
 * Usage (from backend/): node scripts/addMoreBooks.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_NEW = 10000;
const PAGE_SIZE = 100;
const BATCH_SIZE = 50;
const USER_AGENT = "LeafLibrary/1.0 (catalog builder; real books only)";

// 1. Read .env.local (same lookup order as the other seed scripts)
let env = {};
const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "frontend", ".env.local"),
  path.resolve(process.cwd(), "..", "frontend", ".env.local"),
  path.resolve(process.cwd(), "backend", ".env.local"),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!m) return;
      let val = m[2] || "";
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[m[1]] = val;
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or service role key in .env.local");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

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
  { q: "subject:manga", genre: "Graphic Novel" },
  { q: "subject:urban_fantasy", genre: "Fantasy" },
  { q: "subject:epic_fantasy", genre: "Fantasy" },
  { q: "subject:paranormal", genre: "Romance" },
  { q: "subject:chick_lit", genre: "Romance" },
  { q: "subject:suspense", genre: "Mystery & Thriller" },
  { q: "subject:espionage", genre: "Mystery & Thriller" },
  { q: "subject:true_crime", genre: "Non-Fiction" },
  { q: "subject:travel", genre: "Non-Fiction" },
  { q: "subject:cookbooks", genre: "Non-Fiction" },
  { q: "subject:music", genre: "Non-Fiction" },
  { q: "subject:art", genre: "Non-Fiction" },
  { q: "subject:sports", genre: "Non-Fiction" },
  { q: "subject:religion", genre: "Non-Fiction" },
  { q: "subject:politics", genre: "Non-Fiction" },
  { q: "subject:economics", genre: "Non-Fiction" },
  { q: "subject:technology", genre: "Non-Fiction" },
  { q: "subject:nature", genre: "Non-Fiction" },
  { q: "subject:animals", genre: "Non-Fiction" },
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
  { q: "award:pulitzer", genre: "Literary Fiction" },
  { q: "award:hugo", genre: "Sci-Fi" },
  { q: "award:nebula", genre: "Sci-Fi" },
  { q: "award:booker", genre: "Literary Fiction" },
  { q: "award:national_book_award", genre: "Literary Fiction" },
  { q: "award:newbery", genre: "Young Adult" },
  { q: "language:eng AND ebook_access:public", genre: "Classics" },
];

function pickIsbn13(isbnList = []) {
  const cleaned = isbnList.map((i) => String(i).replace(/[^0-9Xx]/g, ""));
  return cleaned.find((c) => /^978\d{10}$/.test(c)) || null;
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
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function loadExistingIds() {
  const ids = new Set();
  const isbns = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from("books").select("id, isbn_13").range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      ids.add(row.id);
      if (row.isbn_13) isbns.add(row.isbn_13);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return { ids, isbns };
}

async function upsertBatch(batch) {
  const dbRecords = batch.map((b) => ({
    id: b.id,
    open_library_key: b.open_library_key,
    isbn_10: null,
    isbn_13: b.isbn13,
    title: b.title,
    author_name: b.author,
    first_publish_year: b.year,
    page_count: b.pages,
    cover_url: b.coverUrl,
    subjects: JSON.stringify(b.genres),
    description: b.description,
    language: "eng",
  }));

  const { error } = await supabase.from("books").upsert(dbRecords, { onConflict: "id" });
  if (!error) return dbRecords.length;

  console.error(`\nBatch upsert failed (${error.message}); retrying individually…`);
  let ok = 0;
  for (const rec of dbRecords) {
    const { error: singleErr } = await supabase.from("books").upsert(rec, { onConflict: "id" });
    if (!singleErr) ok++;
    else console.error("  failed:", rec.id, singleErr.message);
  }
  return ok;
}

async function main() {
  console.log("Loading existing book ids from Supabase…");
  const { ids: existingIds, isbns: existingIsbns } = await loadExistingIds();
  console.log(`Found ${existingIds.size} existing books (${existingIsbns.size} with isbn_13).`);

  const seenThisRun = new Set();
  let collected = 0;
  let uploaded = 0;
  let pendingBatch = [];

  const flush = async () => {
    if (pendingBatch.length === 0) return;
    const ok = await upsertBatch(pendingBatch);
    uploaded += ok;
    pendingBatch = [];
  };

  for (const subject of SUBJECT_QUERIES) {
    if (collected >= TARGET_NEW) break;
    let page = 1;
    let emptyStreak = 0;

    while (collected < TARGET_NEW && page <= 100 && emptyStreak < 3) {
      const url =
        `https://openlibrary.org/search.json?q=${encodeURIComponent(subject.q)}` +
        `&language=eng&limit=${PAGE_SIZE}&page=${page}` +
        `&fields=key,title,author_name,first_publish_year,number_of_pages_median,isbn,cover_i,subject,edition_key`;

      process.stdout.write(
        `\r[new: ${collected}/${TARGET_NEW}] [uploaded: ${uploaded}] ${subject.genre} "${subject.q}" page ${page}…   `
      );

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
        if (collected >= TARGET_NEW) break;
        if (!doc.cover_i || !doc.title || !doc.author_name?.length) continue;

        const editionKey = doc.edition_key?.[0];
        if (!editionKey) continue;
        const id = editionKey;
        if (existingIds.has(id) || seenThisRun.has(id)) continue;

        const isbn13 = pickIsbn13(doc.isbn || []);
        if (isbn13 && existingIsbns.has(isbn13)) continue;

        seenThisRun.add(id);
        if (isbn13) existingIsbns.add(isbn13);

        const author = doc.author_name[0];
        const year = doc.first_publish_year || 2000;
        const pages = doc.number_of_pages_median || 300;

        pendingBatch.push({
          id,
          open_library_key: id,
          isbn13,
          title: doc.title.trim(),
          author,
          year,
          pages,
          coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,
          description: `${doc.title.trim()} by ${author}${year ? `, first published ${year}.` : "."}`,
          genres: mapSubjects(doc.subject || [], subject.genre),
        });

        collected++;
        added++;
        if (pendingBatch.length >= BATCH_SIZE) await flush();
      }

      if (added === 0) emptyStreak++;
      else emptyStreak = 0;
      page++;
      await sleep(350);
    }
  }

  await flush();
  console.log(`\n\nDone. Collected ${collected} new books, uploaded ${uploaded}.`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
