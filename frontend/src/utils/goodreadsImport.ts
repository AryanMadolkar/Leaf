import { Book, INITIAL_BOOKS } from "@/data/mockData";

export type LeafShelfStatus = "Want to Read" | "Currently Reading" | "Finished";

export interface GoodreadsRow {
  title: string;
  author: string;
  isbn13: string;
  isbn: string;
  rating: number | null;
  shelf: string;
  dateRead: string;
  review: string;
}

export interface MatchedImportBook {
  bookId: string;
  title: string;
  author: string;
  status: LeafShelfStatus;
  rating?: number;
  review?: string;
  coverImage?: string;
  pages?: number;
  year?: number;
  genres?: string[];
  description?: string;
}

export interface ImportMatchResult {
  matched: MatchedImportBook[];
  skipped: Array<{ title: string; author: string; reason: string }>;
}

const SHELF_MAP: Record<string, LeafShelfStatus> = {
  read: "Finished",
  "currently-reading": "Currently Reading",
  "currently reading": "Currently Reading",
  "to-read": "Want to Read",
  "to read": "Want to Read",
};

/** Parse a single CSV line respecting quoted fields. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function cleanIsbn(raw: string): string {
  return String(raw || "")
    .replace(/^="?/, "")
    .replace(/"$/, "")
    .replace(/[^0-9Xx]/g, "");
}

function normalizeTitle(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAuthor(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headerIndex(headers: string[], names: string[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const name of names) {
    const i = lower.indexOf(name.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

/** Parse Goodreads library export CSV text into rows. */
export function parseGoodreadsCsv(text: string): GoodreadsRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const titleI = headerIndex(headers, ["Title"]);
  const authorI = headerIndex(headers, ["Author", "Author l-f"]);
  const isbn13I = headerIndex(headers, ["ISBN13", "ISBN 13"]);
  const isbnI = headerIndex(headers, ["ISBN"]);
  const ratingI = headerIndex(headers, ["My Rating"]);
  const shelfI = headerIndex(headers, ["Exclusive Shelf"]);
  const dateI = headerIndex(headers, ["Date Read"]);
  const reviewI = headerIndex(headers, ["My Review"]);

  if (titleI < 0) throw new Error("Invalid Goodreads CSV: missing Title column");

  const rows: GoodreadsRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const title = (cols[titleI] || "").trim();
    if (!title) continue;
    const shelf = (shelfI >= 0 ? cols[shelfI] : "read")?.trim().toLowerCase() || "read";
    if (!SHELF_MAP[shelf]) continue;

    let isbn13 = isbn13I >= 0 ? cleanIsbn(cols[isbn13I] || "") : "";
    if (isbn13.length === 13 && isbn13.startsWith("978")) {
      // ok
    } else {
      isbn13 = "";
    }
    const isbn = isbnI >= 0 ? cleanIsbn(cols[isbnI] || "") : "";
    const ratingRaw = ratingI >= 0 ? parseFloat(cols[ratingI] || "0") : 0;
    const rating = ratingRaw > 0 ? Math.min(5, ratingRaw) : null;

    rows.push({
      title,
      author: (authorI >= 0 ? cols[authorI] : "")?.trim() || "Unknown Author",
      isbn13,
      isbn,
      rating,
      shelf,
      dateRead: (dateI >= 0 ? cols[dateI] : "")?.trim() || "",
      review: (reviewI >= 0 ? cols[reviewI] : "")?.trim() || "",
    });
  }
  return rows;
}

function findInCatalog(row: GoodreadsRow): Book | null {
  if (row.isbn13) {
    const byIsbn = INITIAL_BOOKS.find((b) => b.id === row.isbn13);
    if (byIsbn) return byIsbn;
  }
  if (row.isbn) {
    const byIsbn10 = INITIAL_BOOKS.find((b) => b.id === row.isbn || b.id.endsWith(row.isbn));
    if (byIsbn10) return byIsbn10;
  }

  const wantTitle = normalizeTitle(row.title);
  const wantAuthor = normalizeAuthor(row.author);
  if (!wantTitle) return null;

  let best: Book | null = null;
  for (const b of INITIAL_BOOKS) {
    const t = normalizeTitle(b.title);
    if (t !== wantTitle && !t.startsWith(wantTitle) && !wantTitle.startsWith(t)) continue;
    if (wantAuthor) {
      const a = normalizeAuthor(b.author);
      const authorOk =
        a.includes(wantAuthor.split(" ").pop() || "") ||
        wantAuthor.includes(a.split(" ").pop() || "") ||
        a === wantAuthor;
      if (!authorOk) continue;
    }
    best = b;
    break;
  }
  return best;
}

function toMatched(book: Book, row: GoodreadsRow): MatchedImportBook {
  const status = SHELF_MAP[row.shelf] || "Finished";
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    status,
    rating: row.rating ?? undefined,
    review: row.review || undefined,
    coverImage: book.coverImage,
    pages: book.pages,
    year: book.year,
    genres: book.genres,
    description: book.description,
  };
}

/**
 * Match Goodreads rows to catalog / Open Library search.
 * Caps remote lookups to avoid hammering the search API.
 */
export async function matchGoodreadsRows(
  rows: GoodreadsRow[],
  opts?: { maxRemoteLookups?: number; signal?: AbortSignal }
): Promise<ImportMatchResult> {
  const maxRemote = opts?.maxRemoteLookups ?? 80;
  const matched: MatchedImportBook[] = [];
  const skipped: ImportMatchResult["skipped"] = [];
  const seenIds = new Set<string>();
  let remoteLookups = 0;

  for (const row of rows) {
    const local = findInCatalog(row);
    if (local) {
      if (!seenIds.has(local.id)) {
        seenIds.add(local.id);
        matched.push(toMatched(local, row));
      }
      continue;
    }

    if (remoteLookups >= maxRemote) {
      skipped.push({ title: row.title, author: row.author, reason: "Not found in catalog (lookup limit reached)" });
      continue;
    }

    remoteLookups++;
    const q = `${row.title} ${row.author}`.trim();
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`, {
        signal: opts?.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        skipped.push({ title: row.title, author: row.author, reason: "Search failed" });
        continue;
      }
      const data = await res.json();
      const hits: Book[] = data.success ? data.books || [] : [];
      const wantTitle = normalizeTitle(row.title);
      const hit =
        hits.find((b) => normalizeTitle(b.title) === wantTitle) ||
        hits.find((b) => normalizeTitle(b.title).includes(wantTitle) || wantTitle.includes(normalizeTitle(b.title))) ||
        hits[0];

      if (!hit?.id) {
        skipped.push({ title: row.title, author: row.author, reason: "No matching edition found" });
        continue;
      }
      if (seenIds.has(hit.id)) continue;
      seenIds.add(hit.id);
      matched.push(toMatched(hit, row));
    } catch {
      skipped.push({ title: row.title, author: row.author, reason: "Search error" });
    }
  }

  return { matched, skipped };
}
