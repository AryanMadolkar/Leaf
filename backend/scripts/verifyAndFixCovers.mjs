/**
 * Check every book's cover_url actually resolves to a real image (not just
 * non-null — dead links, blank Open Library placeholder gifs, etc.), and
 * try to repair anything broken by re-resolving a cover from Open Library.
 *
 * Usage (from backend/): node scripts/verifyAndFixCovers.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 25;
const USER_AGENT = "LeafLibrary/1.0 (cover verification; real books only)";

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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** HEAD (falling back to a ranged GET — some CDNs don't support HEAD well) with a hard timeout. */
async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    if (res.status === 405 || res.status === 501) {
      // Some hosts reject HEAD outright — retry with a ranged GET instead.
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Range: "bytes=0-2047" },
        redirect: "follow",
      });
    }
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const len = Number(res.headers.get("content-length") || 0);
    // Open Library's blank "no cover" gif is tiny; a real cover never is.
    if (len > 0 && len < 200) return { ok: false, reason: `tiny (${len}b)` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.name === "AbortError" ? "timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveFreshCover(book) {
  // Try, in order: edition-id cover, isbn cover, then an Open Library title/author search.
  const candidates = [];
  if (book.open_library_key) {
    const editionId = book.open_library_key.replace(/^\/(books|works)\//, "");
    if (/^OL\d+M$/.test(editionId)) {
      try {
        const editionData = await fetch(`https://openlibrary.org/books/${editionId}.json`, {
          headers: { "User-Agent": USER_AGENT },
        }).then((r) => (r.ok ? r.json() : null));
        const coverId = editionData?.covers?.[0];
        if (coverId && coverId > 0) candidates.push(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`);
      } catch {
        // ignore
      }
    }
  }
  const isbn = book.isbn_13 || book.isbn_10;
  if (isbn) candidates.push(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);

  for (const url of candidates) {
    const result = await checkUrl(url);
    if (result.ok) return url;
  }

  // Last resort: title/author search
  try {
    const q = new URLSearchParams({ title: book.title, limit: "1", fields: "cover_i" });
    if (book.author_name) q.set("author", book.author_name);
    const searchRes = await fetch(`https://openlibrary.org/search.json?${q}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (searchRes.ok) {
      const data = await searchRes.json();
      const coverI = data?.docs?.[0]?.cover_i;
      if (coverI) {
        const url = `https://covers.openlibrary.org/b/id/${coverI}-L.jpg?default=false`;
        const result = await checkUrl(url);
        if (result.ok) return url;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

async function fetchAllBooks() {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author_name, isbn_13, isbn_10, open_library_key, cover_url")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  let active = 0;
  return new Promise((resolve) => {
    const next = () => {
      if (idx >= items.length && active === 0) return resolve();
      while (active < concurrency && idx < items.length) {
        const item = items[idx++];
        active++;
        worker(item)
          .catch(() => {})
          .finally(() => {
            active--;
            next();
          });
      }
    };
    next();
  });
}

async function main() {
  console.log("Fetching all books…");
  const books = await fetchAllBooks();
  console.log(`Checking ${books.length} cover URLs (concurrency ${CONCURRENCY})…`);

  const broken = [];
  let checked = 0;

  await runPool(
    books,
    async (book) => {
      if (!book.cover_url) {
        broken.push(book);
      } else {
        const result = await checkUrl(book.cover_url);
        if (!result.ok) broken.push({ ...book, reason: result.reason });
      }
      checked++;
      if (checked % 200 === 0 || checked === books.length) {
        process.stdout.write(`\rChecked ${checked}/${books.length} — ${broken.length} broken so far…`);
      }
    },
    CONCURRENCY
  );

  console.log(`\n\nFound ${broken.length} books with a broken or missing cover.`);
  fs.writeFileSync(
    path.resolve(__dirname, "broken-covers.json"),
    JSON.stringify(broken, null, 2)
  );
  console.log("Wrote scripts/broken-covers.json for reference.");

  console.log("\nAttempting to repair…");
  let fixed = 0;
  let stillBroken = 0;
  let processed = 0;

  await runPool(
    broken,
    async (book) => {
      const freshUrl = await resolveFreshCover(book);
      processed++;
      if (freshUrl) {
        const { error } = await supabase.from("books").update({ cover_url: freshUrl }).eq("id", book.id);
        if (!error) fixed++;
        else stillBroken++;
      } else {
        stillBroken++;
      }
      if (processed % 25 === 0 || processed === broken.length) {
        process.stdout.write(`\rRepaired ${fixed}, unfixable ${stillBroken} (${processed}/${broken.length})…`);
      }
    },
    12 // gentler concurrency — each repair does 2-3 extra Open Library calls
  );

  console.log(`\n\nDone. ${fixed} covers repaired, ${stillBroken} still have no working cover.`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
