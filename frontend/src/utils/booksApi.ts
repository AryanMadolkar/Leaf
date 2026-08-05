import crypto from "crypto";
import { createPublicClient } from "@/utils/supabase/public";
import { createAdminClient } from "@/utils/supabase/admin";
import { Book, INITIAL_BOOKS } from "@/data/mockData";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import { coverUrlFromCoverId, coverUrlFromIsbn, resolveBookCover } from "@/utils/covers";
import { withResolvedCover } from "@/utils/bookCatalog";

export interface NormalizedBook {
  id: string;
  open_library_key: string;
  isbn_10?: string | null;
  isbn_13?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  author_name?: string | null;
  author_key?: string | null;
  first_publish_year?: number | null;
  page_count?: number | null;
  language?: string | null;
  cover_url?: string | null;
  subjects?: string[] | null;
}

export function getCanonicalBookId(book: { open_library_key?: string | null; isbn_13?: string | null; isbn_10?: string | null }): string {
  const workKey = book.open_library_key ? book.open_library_key.replace(/^\/works\//, "") : null;
  const canonicalId = workKey || book.isbn_13 || book.isbn_10;
  if (!canonicalId) {
    return crypto.randomUUID();
  }
  return canonicalId;
}

// Map database record + ratings to client Book structure
export function mapDbBookToClientBook(dbBook: any, avgRating?: number): Book {
  let averageRating = avgRating;
  if (averageRating === undefined) {
    // Stable hash fallback based on title to keep ratings consistent
    let ratingHash = 0;
    const title = dbBook.title || "";
    for (let i = 0; i < title.length; i++) {
      ratingHash += title.charCodeAt(i);
    }
    averageRating = 3.6 + (ratingHash % 13) / 10;
    averageRating = parseFloat(averageRating.toFixed(1));
  }

  let genres: string[] = ["Fiction"];
  if (dbBook.subjects) {
    try {
      genres = typeof dbBook.subjects === "string" 
        ? JSON.parse(dbBook.subjects) 
        : dbBook.subjects;
      if (!Array.isArray(genres) || genres.length === 0) {
        genres = ["Fiction"];
      } else {
        genres = genres.slice(0, 4);
      }
    } catch (e) {
      genres = ["Fiction"];
    }
  }

  // Prefer the DB primary key so diary/library lookups by user_books.book_id match.
  const canonicalId =
    dbBook.id ||
    getCanonicalBookId({
      open_library_key: dbBook.open_library_key,
      isbn_13: dbBook.isbn_13,
      isbn_10: dbBook.isbn_10,
    });

  const isbnKey = dbBook.isbn_13 || dbBook.isbn_10 || "";
  const coverId = (isbnKey && COVER_ID_BY_ISBN[isbnKey]) || COVER_ID_BY_ISBN[canonicalId];
  const rawCover = dbBook.cover_url || "";
  const isStockFallback =
    !rawCover ||
    rawCover.includes("photo-1543002588-bfa74002ed7e") ||
    rawCover.includes("placeholder");
  const title = dbBook.title;
  const author = dbBook.author_name || "Unknown Author";

  const coverImage =
    resolveBookCover(canonicalId, isStockFallback ? null : rawCover, "M", {
      title,
      author,
      isbn: isbnKey || null,
    }) ||
    (coverId ? coverUrlFromCoverId(coverId, "M", { title, author, isbn: isbnKey || undefined }) : "") ||
    (isbnKey ? coverUrlFromIsbn(isbnKey, "M", { title, author }) : "") ||
    coverUrlFromIsbn("", "M", { title, author });

  return {
    id: canonicalId,
    title,
    author,
    year: dbBook.first_publish_year || 2000,
    description: dbBook.description || "No description available.",
    coverImage,
    averageRating,
    genres,
    pages: dbBook.page_count || 300,
  };
}

// Fetch Author Details (Stateless fetch from Open Library API, no database table needed)
export async function getOrFetchAuthor(authorKey: string): Promise<{ name: string; bio?: string; photo_url?: string } | null> {
  const cleanKey = authorKey.startsWith("/authors/") ? authorKey : `/authors/${authorKey}`;

  try {
    const res = await fetch(`https://openlibrary.org${cleanKey}.json`);
    if (!res.ok) return null;

    const data = await res.json();
    const name = data.name;
    if (!name) return null;

    let bio = "";
    if (data.bio) {
      if (typeof data.bio === "string") {
        bio = data.bio;
      } else if (data.bio.value) {
        bio = data.bio.value;
      }
    }

    const photoUrl = data.photos?.[0] 
      ? `https://covers.openlibrary.org/a/id/${data.photos[0]}-L.jpg` 
      : undefined;

    return { name, bio, photo_url: photoUrl };
  } catch (err) {
    console.error(`Error fetching author details for ${cleanKey}:`, err);
    return null;
  }
}

let supportedColumnsCache: Set<string> | null = null;

async function getSupportedColumns(supabaseClient: any): Promise<Set<string>> {
  if (supportedColumnsCache) return supportedColumnsCache;

  const defaultCols = ["id", "open_library_key", "isbn_10", "isbn_13", "title", "author_name", "cover_url", "page_count", "subjects", "first_publish_year", "created_at"];
  const cols = new Set(defaultCols);
  
  const probeCols = ["description", "subtitle", "language"];
  for (const col of probeCols) {
    try {
      const { error } = await supabaseClient.from("books").select(col).limit(1);
      if (!error || error.code !== "42703") {
        cols.add(col);
      }
    } catch (e) {
      // ignore
    }
  }
  
  supportedColumnsCache = cols;
  return cols;
}

// Save a normalized book record to Supabase (service role — RLS blocks anon inserts under custom JWT auth)
export async function saveBookToDatabase(book: Omit<NormalizedBook, "id">): Promise<string> {
  const bookId = getCanonicalBookId(book);

  try {
    const supabase = createAdminClient();
    const supportedCols = await getSupportedColumns(supabase);

    // Check if book already exists in DB
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .maybeSingle();

    const subjectsStr = JSON.stringify(book.subjects || []);

    const payload: any = {
      open_library_key: book.open_library_key || null,
      isbn_10: book.isbn_10 || null,
      isbn_13: book.isbn_13 || null,
      title: book.title,
      author_name: book.author_name || null,
      cover_url: book.cover_url || null,
      page_count: book.page_count || 0,
      subjects: subjectsStr,
      first_publish_year: book.first_publish_year || null,
    };

    if (supportedCols.has("subtitle")) payload.subtitle = book.subtitle || null;
    if (supportedCols.has("description")) payload.description = book.description || null;
    if (supportedCols.has("language")) payload.language = book.language || null;

    if (existing) {
      // Update metadata to refresh
      const { error } = await supabase
        .from("books")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
      return existing.id;
    } else {
      // Insert new book
      payload.id = bookId;
      const { error } = await supabase
        .from("books")
        .insert(payload);

      if (error) throw error;
      return bookId;
    }
  } catch (error) {
    console.error("Failed to save book to Supabase:", error);
    throw error instanceof Error ? error : new Error("Failed to save book to database");
  }
}

/**
 * Guarantee a `books` row exists for a client Book before writing user_books
 * (FK requires books.id). Uses service role so custom-JWT auth still works.
 */
export async function ensureBookRow(book: Book): Promise<string> {
  const id = book.id;
  if (!id) throw new Error("Cannot ensure book row without an id");

  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("books").select("id").eq("id", id).maybeSingle();
  if (existing?.id) return existing.id;

  // Also try matching by open library key / isbn variants of this id
  const cleanKey = id.replace(/^\/works\//, "");
  const { data: byKey } = await supabase
    .from("books")
    .select("id")
    .or(
      `id.eq."${cleanKey}",open_library_key.eq."${cleanKey}",open_library_key.eq."/works/${cleanKey}",isbn_13.eq."${id}",isbn_10.eq."${id}"`,
    )
    .maybeSingle();
  if (byKey?.id) return byKey.id;

  const openLibraryKey = /^OL/i.test(cleanKey) ? `/works/${cleanKey}` : null;
  const payload: Record<string, unknown> = {
    id: cleanKey,
    open_library_key: openLibraryKey,
    title: book.title || "Untitled",
    author_name: book.author || "Unknown Author",
    cover_url: book.coverImage || null,
    page_count: book.pages || 300,
    description: book.description || null,
    first_publish_year: book.year || null,
    subjects: JSON.stringify(book.genres || ["Fiction"]),
    language: "eng",
  };

  const { error } = await supabase.from("books").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[ensureBookRow] upsert failed:", error);
    throw new Error(`Could not cache book "${book.title}": ${error.message}`);
  }
  return cleanKey;
}

// Get Cached Book by various keys (using single query or filter)
export async function getCachedBook(query: string): Promise<Book | null> {
  // 1. Try local INITIAL_BOOKS first
  const queryClean = query.toLowerCase().replace(/^\/works\//, "");
  const localMatch = INITIAL_BOOKS.find((b: Book) => {
    const bookId = b.id.toLowerCase();
    return bookId === queryClean || bookId === query.toLowerCase();
  });
  if (localMatch) return localMatch;

  const supabase = createAdminClient();
  const cleanKey = query.startsWith("/works/") ? query : `/works/${query}`;

  try {
    const { data: dbBook } = await supabase
      .from("books")
      .select("*")
      .or(`id.eq."${query}",id.eq."${cleanKey}",open_library_key.eq."${query}",open_library_key.eq."${cleanKey}",isbn_10.eq."${query}",isbn_13.eq."${query}"`)
      .maybeSingle();

    if (dbBook) {
      // Fetch dynamic average rating if applicable
      const { data: ratingsData } = await supabase
        .from("user_books")
        .select("rating")
        .eq("book_id", dbBook.id)
        .not("rating", "is", null);

      let avgRating: number | undefined;
      if (ratingsData && ratingsData.length > 0) {
        const sum = ratingsData.reduce((acc: number, curr: any) => acc + curr.rating, 0);
        avgRating = parseFloat((sum / ratingsData.length).toFixed(1));
      }

      return mapDbBookToClientBook(dbBook, avgRating);
    }
  } catch (error) {
    console.error("Error looking up cached book in Supabase:", error);
  }

  return null;
}

// Search local catalog + public Supabase books table (no cookies — cache-safe)
export async function searchLocalBooks(query: string): Promise<Book[]> {
  const queryLower = query.toLowerCase().trim();
  if (queryLower.length < 2) return [];

  const localResults = INITIAL_BOOKS.filter(
    (b: Book) =>
      b.title.toLowerCase().includes(queryLower) ||
      b.author.toLowerCase().includes(queryLower)
  ).map(withResolvedCover);

  try {
    const supabase = createPublicClient();
    const { data: records, error } = await supabase
      .from("books")
      .select("*")
      .or(`title.ilike.%${queryLower}%,author_name.ilike.%${queryLower}%`)
      .limit(20);

    if (error || !records) return localResults.slice(0, 20);

    const dbResults = records.map((r: any) => mapDbBookToClientBook(r));

    const seen = new Set(localResults.map((r) => r.id));
    const combined = [...localResults];
    for (const b of dbResults) {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        combined.push(b);
      }
    }
    return combined.slice(0, 20);
  } catch (error) {
    console.error("Error doing local search in Supabase:", error);
    return localResults.slice(0, 20);
  }
}

/** Search Open Library only (no DB/cookies) — safe to cache. */
export async function searchOpenLibraryRemote(query: string): Promise<Book[]> {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12`,
    {
      next: { revalidate: 300 },
      // Open Library is often slow/unreachable — fail fast so shelf scan isn't blocked for 10s+ per book.
      signal: AbortSignal.timeout(4000),
    }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const docs = data.docs || [];
  const results: Book[] = [];

  for (const doc of docs.slice(0, 12)) {
    const isbn13 = doc.isbn?.find((i: string) => i.length === 13) || null;
    const isbn10 = doc.isbn?.find((i: string) => i.length === 10) || null;
    const isbn = isbn13 || isbn10 || "";
    const title = doc.title || "Untitled";
    const author = doc.author_name?.[0] || "Unknown Author";
    const coverId = doc.cover_i;
    const coverMeta = { title, author, isbn: isbn || undefined };
    const coverUrl = isbn
      ? coverUrlFromIsbn(isbn, "M", coverMeta)
      : coverId
        ? coverUrlFromCoverId(coverId, "M", coverMeta)
        : coverUrlFromIsbn("", "M", coverMeta);

    const id =
      doc.key?.replace("/works/", "") ||
      isbn13 ||
      isbn10 ||
      `ol-${doc.cover_i || Math.random().toString(36).slice(2)}`;

    results.push({
      id,
      title,
      author,
      year: doc.first_publish_year || 2000,
      description:
        (Array.isArray(doc.first_sentence)
          ? doc.first_sentence[0]
          : doc.first_sentence) || "No description available.",
      coverImage: coverUrl,
      averageRating: 4.0,
      genres: (doc.subject || []).slice(0, 4),
      pages: doc.number_of_pages_median || doc.number_of_pages || 300,
    });
  }

  return results;
}

// Main book search: local catalog/DB first, then Open Library to fill gaps
export async function searchOpenLibrary(query: string): Promise<Book[]> {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();
  const localResults = await searchLocalBooks(q);

  // Always try Open Library when we have fewer than 8 strong local hits
  if (localResults.length >= 8) {
    return localResults.slice(0, 15);
  }

  try {
    const remoteResults = await searchOpenLibraryRemote(q);
    const seen = new Set(
      localResults.map((r) => `${r.title.toLowerCase()}::${r.author.toLowerCase()}`)
    );
    const combined = [...localResults];
    for (const book of remoteResults) {
      const key = `${book.title.toLowerCase()}::${book.author.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(book);
      }
    }
    return combined.slice(0, 15);
  } catch (error) {
    console.error("Open Library search API error:", error);
    return localResults;
  }
}

function extractOpenLibraryText(field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field.trim();
  if (typeof field === "object" && field !== null && "value" in field) {
    return String((field as { value?: unknown }).value || "").trim();
  }
  return "";
}

/** Heuristic: Open Library often attaches a non-English blurb as the work description. */
function looksNonEnglish(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  if (
    /^(esta é|esta es|este es|cette |dies ist|questo |questa |os meus|mis d[ií]as|i miei|uma hist[oó]ria|é uma)/i.test(
      lower,
    )
  ) {
    return true;
  }
  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (letters.length < 40) return false;
  const nonAscii = letters.replace(/[a-zA-Z]/g, "").length;
  return nonAscii / letters.length > 0.1;
}

function isWeakCover(url?: string | null): boolean {
  if (!url) return true;
  return (
    url.includes("photo-1543002588-bfa74002ed7e") ||
    url.includes("placeholder") ||
    /\/b\/isbn\/OL/i.test(url)
  );
}

async function fetchEnglishEditionMeta(workKey: string): Promise<{
  isbn13?: string;
  isbn10?: string;
  coverId?: number;
  pageCount?: number;
  publishYear?: number;
  description?: string;
}> {
  try {
    const res = await fetch(`https://openlibrary.org${workKey}/editions.json?limit=40`);
    if (!res.ok) return {};
    const data = await res.json();
    const entries: any[] = data.entries || [];

    const eng = entries.filter((e) =>
      (e.languages || []).some((l: any) => {
        const key = typeof l === "string" ? l : l?.key;
        return key === "/languages/eng" || key === "eng";
      }),
    );
    const pool = eng.length ? eng : entries;

    // Prefer editions that have a real cover + ISBN
    const ranked = [...pool].sort((a, b) => {
      const score = (e: any) =>
        (Array.isArray(e.covers) && e.covers.find((c: number) => c > 0) ? 4 : 0) +
        (e.isbn_13?.[0] || e.isbn_10?.[0] ? 2 : 0) +
        (e.number_of_pages ? 1 : 0);
      return score(b) - score(a);
    });

    const best = ranked[0];
    if (!best) return {};

    const coverId = (best.covers || []).find((c: number) => c > 0);
    const yearMatch = String(best.publish_date || "").match(/\d{4}/);
    return {
      isbn13: best.isbn_13?.[0],
      isbn10: best.isbn_10?.[0],
      coverId,
      pageCount: best.number_of_pages || undefined,
      publishYear: yearMatch ? parseInt(yearMatch[0], 10) : undefined,
      description: extractOpenLibraryText(best.description) || undefined,
    };
  } catch {
    return {};
  }
}

async function fetchWikipediaSummary(title: string): Promise<string> {
  try {
    const slug = title.trim().replace(/\s+/g, "_");
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return "";
    const data = await res.json();
    if (data?.type === "disambiguation") return "";
    return String(data?.extract || "").trim();
  } catch {
    return "";
  }
}

// Fetch and Cache Book by Open Library Key
export async function getBookByOpenLibraryKey(key: string, opts?: { forceRefresh?: boolean }): Promise<Book | null> {
  console.log(`[getBookByOpenLibraryKey] Invoked with key: "${key}"`);
  if (!opts?.forceRefresh) {
    const cached = await getCachedBook(key);
    if (cached && !isWeakCover(cached.coverImage) && !looksNonEnglish(cached.description || "")) {
      console.log(`[getBookByOpenLibraryKey] Cache HIT for key: "${key}"`);
      return cached;
    }
  }

  const cleanKey = key.startsWith("/works/") ? key : `/works/${key}`;
  const fetchUrl = `https://openlibrary.org${cleanKey}.json`;
  console.log(`[getBookByOpenLibraryKey] Fetching Open Library URL: "${fetchUrl}"`);

  try {
    const res = await fetch(fetchUrl);
    console.log(`[getBookByOpenLibraryKey] Fetch response status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      console.error(`[getBookByOpenLibraryKey] Fetch failed. Status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const title = data.title;
    console.log(`[getBookByOpenLibraryKey] Parse JSON success. Title: "${title}"`);
    if (!title) {
      console.warn(`[getBookByOpenLibraryKey] Title is empty in API payload`);
      return null;
    }

    // Fetch author details if available
    let authorName = "Unknown Author";
    let authorKey = null;
    if (data.authors?.[0]?.author?.key) {
      authorKey = data.authors[0].author.key;
      console.log(`[getBookByOpenLibraryKey] Found author key: "${authorKey}". Fetching author details...`);
      const authorDetails = await getOrFetchAuthor(authorKey);
      if (authorDetails) {
        authorName = authorDetails.name;
        console.log(`[getBookByOpenLibraryKey] Resolved author name: "${authorName}"`);
      }
    }

    const editionMeta = await fetchEnglishEditionMeta(cleanKey);

    let description = extractOpenLibraryText(data.description);
    if (!description || looksNonEnglish(description)) {
      description = editionMeta.description || description;
    }
    if (!description || looksNonEnglish(description)) {
      const wiki = await fetchWikipediaSummary(title);
      if (wiki) description = wiki;
    }

    const workCoverId = (data.covers || []).find((c: number) => c > 0);
    const coverId = editionMeta.coverId || workCoverId;
    const coverUrl = coverId
      ? coverUrlFromCoverId(coverId)
      : editionMeta.isbn13 || editionMeta.isbn10
        ? coverUrlFromIsbn(editionMeta.isbn13 || editionMeta.isbn10!)
        : "";

    const firstPublishYear =
      editionMeta.publishYear ||
      (data.first_publish_date ? parseInt(String(data.first_publish_date).match(/\d{4}/)?.[0] || "", 10) : undefined) ||
      2000;

    const subjects = data.subjects || [];
    const pageCount = editionMeta.pageCount || data.number_of_pages || data.number_of_pages_median || 300;

    console.log(`[getBookByOpenLibraryKey] Saving book to database...`);
    const id = await saveBookToDatabase({
      open_library_key: cleanKey,
      isbn_10: editionMeta.isbn10 || null,
      isbn_13: editionMeta.isbn13 || null,
      title,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: firstPublishYear,
      page_count: pageCount,
      language: "eng",
      cover_url: coverUrl || null,
      subjects,
    });
    console.log(`[getBookByOpenLibraryKey] Book saved in database with ID: "${id}". Fetching cached record...`);

    const cachedRecord = await getCachedBook(id);
    if (cachedRecord) {
      console.log(`[getBookByOpenLibraryKey] Successfully loaded cached record for ID: "${id}"`);
      return cachedRecord;
    }

    console.warn(`[getBookByOpenLibraryKey] Failed to retrieve cached record for ID: "${id}". Storing in-memory fallback.`);
    return mapDbBookToClientBook({
      id,
      open_library_key: cleanKey,
      isbn_10: editionMeta.isbn10 || null,
      isbn_13: editionMeta.isbn13 || null,
      title,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: firstPublishYear,
      subjects,
      page_count: pageCount,
      language: "eng",
      cover_url: coverUrl,
    });
  } catch (err) {
    console.error(`Error fetching work details for ${cleanKey}:`, err);
    return null;
  }
}

// Fetch and Cache Book by ISBN
export async function getBookByISBN(isbn: string): Promise<Book | null> {
  const cached = await getCachedBook(isbn);
  if (cached) return cached;

  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!res.ok) {
      const searchRes = await searchOpenLibrary(isbn);
      if (searchRes.length > 0) {
        return searchRes[0];
      }
      return null;
    }

    const data = await res.json();
    const title = data.title;
    if (!title) return null;

    const isbn_10 = data.isbn_10?.[0] || (isbn.length === 10 ? isbn : null);
    const isbn_13 = data.isbn_13?.[0] || (isbn.length === 13 ? isbn : null);
    const pageCount = data.number_of_pages || data.number_of_pages_median;
    const publishDate = data.publish_date;
    const language = data.languages?.[0]?.key?.replace("/languages/", "") || "eng";

    let publishYear = 2000;
    if (publishDate) {
      const yearMatch = publishDate.match(/\d{4}/);
      if (yearMatch) publishYear = parseInt(yearMatch[0]);
    }

    const coverUrl = data.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
      : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    let description = "";
    let subjects: string[] = [];
    let authorKey = null;
    let authorName = "Unknown Author";

    if (data.works?.[0]?.key) {
      const workKey = data.works[0].key;
      const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
      if (workRes.ok) {
        const workData = await workRes.json();
        
        if (workData.description) {
          if (typeof workData.description === "string") {
            description = workData.description;
          } else if (workData.description.value) {
            description = workData.description.value;
          }
        }
        
        if (workData.subjects) {
          subjects = workData.subjects;
        }

        if (workData.authors?.[0]?.author?.key) {
          authorKey = workData.authors[0].author.key;
        }
      }
    }

    if (authorKey) {
      const auth = await getOrFetchAuthor(authorKey);
      if (auth) authorName = auth.name;
    } else if (data.authors?.[0]?.name) {
      authorName = data.authors[0].name;
    } else if (data.by_statement) {
      authorName = data.by_statement;
    }

    const workKey = data.works?.[0]?.key || `/works/OL_${isbn}_W`;

    const id = await saveBookToDatabase({
      open_library_key: workKey,
      isbn_10,
      isbn_13,
      title,
      subtitle: data.subtitle,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: publishYear,
      page_count: pageCount,
      language,
      cover_url: coverUrl,
      subjects,
    });

    const cachedRecord = await getCachedBook(id);
    if (cachedRecord) {
      return cachedRecord;
    }

    console.warn(`[getBookByISBN] Failed to retrieve cached record for ID: "${id}". Storing in-memory fallback.`);
    return mapDbBookToClientBook({
      id,
      open_library_key: workKey,
      isbn_10,
      isbn_13,
      title,
      subtitle: data.subtitle,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: publishYear,
      page_count: pageCount || 300,
      language,
      cover_url: coverUrl,
      subjects,
    });
  } catch (err) {
    console.error(`Error fetching edition details for ISBN ${isbn}:`, err);
    return null;
  }
}

// --- Server-side Helpers ---

export async function getBookFromCache(id: string): Promise<Book | null> {
  console.log(`[getBookFromCache] Checking cache for book ID: "${id}"`);
  const book = await getCachedBook(id);
  if (book) {
    console.log(`[getBookFromCache] Cache HIT for book ID: "${id}"`);
  } else {
    console.log(`[getBookFromCache] Cache MISS for book ID: "${id}"`);
  }
  return book;
}

export async function fetchBookFromOpenLibrary(id: string): Promise<Book | null> {
  console.log(`[fetchBookFromOpenLibrary] Fetching book ID from Open Library: "${id}"`);
  const isIsbn = /^\d+$/.test(id) && (id.length === 10 || id.length === 13);
  
  try {
    if (isIsbn) {
      console.log(`[fetchBookFromOpenLibrary] Fetching by ISBN: "${id}"`);
      return await getBookByISBN(id);
    } else {
      console.log(`[fetchBookFromOpenLibrary] Fetching by Open Library Work Key: "${id}"`);
      // Strip /works/ if present to get clean work key
      const cleanKey = id.replace(/^\/works\//, "");
      return await getBookByOpenLibraryKey(cleanKey, { forceRefresh: true });
    }
  } catch (error) {
    console.error(`[fetchBookFromOpenLibrary] API failure fetching book ID "${id}":`, error);
    return null;
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  console.log(`[getBookById] Initializing load for book ID: "${id}"`);
  if (!id) {
    console.error("[getBookById] Routing failure: Received empty or undefined book ID");
    return null;
  }

  // 1. Try Cache — refresh if cover/synopsis are weak or non-English
  const cached = await getBookFromCache(id);
  const cacheIsStale =
    cached &&
    (isWeakCover(cached.coverImage) || looksNonEnglish(cached.description || ""));

  if (cached && !cacheIsStale) {
    return cached;
  }

  // 2. Fetch & Cache (force refresh when stale so DB gets cover + English synopsis)
  const fetched = await fetchBookFromOpenLibrary(id);
  if (fetched) {
    console.log(`[getBookById] Successfully retrieved and cached book ID: "${id}" from Open Library`);
    return fetched;
  }

  if (cached) return cached;

  console.warn(`[getBookById] Book detail resolution failed for ID: "${id}"`);
  return null;
}
