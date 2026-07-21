import { NextResponse } from "next/server";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";

export const runtime = "nodejs";

const VALID_SIZES = new Set(["S", "M", "L"]);
const FETCH_TIMEOUT_MS = 2200;
const MAX_CANDIDATES = 6;

/** Procedurally generated catalog ISBNs — never trust their Open Library ISBN covers. */
function isFakeIsbn(isbn: string): boolean {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  return /^97810[0-3]/.test(clean);
}

function cleanIsbn(isbn: string): string | null {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length === 10 || clean.length === 13) return clean;
  return null;
}

function olCoverById(coverId: number | string, size: string): string {
  const sz = VALID_SIZES.has(size) ? size : "M";
  return `https://covers.openlibrary.org/b/id/${coverId}-${sz}.jpg?default=false`;
}

function olCoverByIsbn(isbn: string, size: string): string | null {
  const clean = cleanIsbn(isbn);
  if (!clean) return null;
  const sz = VALID_SIZES.has(size) ? size : "M";
  return `https://covers.openlibrary.org/b/isbn/${clean}-${sz}.jpg?default=false`;
}

/**
 * Fetch a cover image. Critical: do NOT follow redirects.
 * Missing OL covers 302 to archive.org zip URLs that hang ~12s and fail.
 * Real covers return HTTP 200 directly from covers.openlibrary.org.
 */
async function fetchCoverBytes(url: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      next: { revalidate: 60 * 60 * 24 * 30 },
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "LeafLibrary/1.0 (book cover proxy)",
      },
    });
    // 302/301 → archive.org (or blank). Treat as missing.
    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength < 1500) return null;
    return {
      bytes,
      contentType: res.headers.get("Content-Type") || "image/jpeg",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 * 7 },
      headers: { "User-Agent": "LeafLibrary/1.0 (book cover proxy)" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type SearchDoc = { cover_i?: number; title?: string; isbn?: string[] };

/** Collect working cover candidates from an OL title search. */
async function candidatesFromTitleAuthor(
  title: string,
  author?: string | null
): Promise<Array<{ kind: "id" | "isbn"; value: string }>> {
  const needle = title.trim().toLowerCase();
  if (!needle) return [];
  const q = new URLSearchParams({
    title: title.trim(),
    limit: "8",
    fields: "cover_i,title,isbn",
  });
  if (author) q.set("author", author);
  const data = await fetchJson<{ docs?: SearchDoc[] }>(
    `https://openlibrary.org/search.json?${q.toString()}`
  );
  const docs = data?.docs || [];
  const ranked = [
    ...docs.filter((d) => (d.title || "").trim().toLowerCase() === needle),
    ...docs.filter((d) => (d.title || "").trim().toLowerCase().startsWith(needle)),
    ...docs,
  ];
  const seen = new Set<string>();
  const out: Array<{ kind: "id" | "isbn"; value: string }> = [];
  for (const d of ranked) {
    if (d.cover_i) {
      const key = `id:${d.cover_i}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ kind: "id", value: String(d.cover_i) });
      }
    }
    for (const isbn of d.isbn || []) {
      const clean = cleanIsbn(isbn);
      if (!clean || isFakeIsbn(clean)) continue;
      const key = `isbn:${clean}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: "isbn", value: clean });
    }
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out.slice(0, MAX_CANDIDATES);
}

/**
 * Same-origin cover proxy with CDN caching.
 *
 * GET /api/covers?id=12356249&size=M&isbn=…&title=…
 * Dead cover IDs (302 → archive.org) fall through to ISBN / title search candidates.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const isbnRaw = searchParams.get("isbn");
  const size = (searchParams.get("size") || "M").toUpperCase();
  const title = searchParams.get("title");
  const author = searchParams.get("author");
  const isbn = isbnRaw && !isFakeIsbn(isbnRaw) ? cleanIsbn(isbnRaw) : null;

  const tried = new Set<string>();
  let payload: { bytes: ArrayBuffer; contentType: string } | null = null;

  async function tryUrl(key: string, url: string) {
    if (payload || tried.has(key)) return;
    tried.add(key);
    payload = await fetchCoverBytes(url);
  }

  async function tryId(coverId: number | string | null | undefined) {
    if (coverId == null || coverId === "") return;
    await tryUrl(`id:${coverId}`, olCoverById(coverId, size));
  }

  async function tryIsbn(value: string | null | undefined) {
    if (!value || isFakeIsbn(value)) return;
    const clean = cleanIsbn(value);
    if (!clean) return;
    const url = olCoverByIsbn(clean, size);
    if (!url) return;
    await tryUrl(`isbn:${clean}`, url);
  }

  // 1) Explicit cover ID
  await tryId(id);

  // 2) Mapped override for this ISBN
  if (!payload && isbn) {
    const mapped = COVER_ID_BY_ISBN[isbn] || COVER_ID_BY_ISBN[isbnRaw || ""];
    await tryId(mapped);
  }

  // 3) Direct ISBN cover (often works when cover_i is stale)
  await tryIsbn(isbn);

  // 4) Title/author search — try multiple cover ids + isbns until one works
  if (!payload && title) {
    const candidates = await candidatesFromTitleAuthor(title, author);
    for (const c of candidates) {
      if (payload) break;
      if (c.kind === "id") await tryId(c.value);
      else await tryIsbn(c.value);
    }
  }

  if (!payload) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }

  return new NextResponse(payload.bytes, {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
