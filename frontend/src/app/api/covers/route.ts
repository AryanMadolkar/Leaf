import { NextResponse } from "next/server";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";

export const runtime = "nodejs";

const VALID_SIZES = new Set(["S", "M", "L"]);

/** Procedurally generated catalog ISBNs — never trust their Open Library ISBN covers. */
function isFakeIsbn(isbn: string): boolean {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  return clean.startsWith("978100") || clean.startsWith("978101") || clean.startsWith("978102");
}

function olCoverById(coverId: number | string, size: string): string {
  const sz = VALID_SIZES.has(size) ? size : "M";
  return `https://covers.openlibrary.org/b/id/${coverId}-${sz}.jpg?default=false`;
}

async function fetchCoverBytes(url: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 * 60 * 24 * 30 },
      redirect: "follow",
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "LeafLibrary/1.0 (book cover proxy)",
      },
    });
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    // Blank OL GIFs and Google "image not available" stubs are tiny
    if (bytes.byteLength < 1500) return null;
    return {
      bytes,
      contentType: res.headers.get("Content-Type") || "image/jpeg",
    };
  } catch {
    return null;
  }
}

/** Resolve a reliable Open Library cover_i for an ISBN. */
async function coverIdForIsbn(isbn: string): Promise<number | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (!clean || isFakeIsbn(clean)) return null;

  const mapped = COVER_ID_BY_ISBN[clean] || COVER_ID_BY_ISBN[isbn];
  if (mapped) return mapped;

  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=isbn:${encodeURIComponent(clean)}&fields=cover_i,title&limit=1`,
      {
        next: { revalidate: 60 * 60 * 24 * 7 },
        headers: { "User-Agent": "LeafLibrary/1.0 (book cover proxy)" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coverI = data?.docs?.[0]?.cover_i;
    return typeof coverI === "number" ? coverI : null;
  } catch {
    return null;
  }
}

/**
 * Title/author search — only used for fake ISBNs.
 * Requires an exact title match so we don't attach Fantastic Mr. Fox to Frankenstein.
 */
async function coverIdForTitleAuthor(title: string, author?: string | null): Promise<number | null> {
  const needle = title.trim().toLowerCase();
  if (!needle) return null;
  try {
    const q = new URLSearchParams({
      title: title.trim(),
      limit: "5",
      fields: "cover_i,title",
    });
    if (author) q.set("author", author);
    const res = await fetch(`https://openlibrary.org/search.json?${q.toString()}`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
      headers: { "User-Agent": "LeafLibrary/1.0 (book cover proxy)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const docs: Array<{ cover_i?: number; title?: string }> = data?.docs || [];
    const exact = docs.find((d) => (d.title || "").trim().toLowerCase() === needle && d.cover_i);
    if (exact?.cover_i) return exact.cover_i;
    // Soft match: title starts with the same words (handles subtitles)
    const soft = docs.find(
      (d) => (d.title || "").trim().toLowerCase().startsWith(needle) && d.cover_i
    );
    return soft?.cover_i || null;
  } catch {
    return null;
  }
}

/**
 * Same-origin cover proxy with CDN caching.
 *
 * GET /api/covers?id=12356249&size=M
 * GET /api/covers?isbn=9780141439471&size=M
 * GET /api/covers?isbn=978100…&title=…&author=…  (fake ISBN fallback)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const isbn = searchParams.get("isbn");
  const size = (searchParams.get("size") || "M").toUpperCase();
  const title = searchParams.get("title");
  const author = searchParams.get("author");

  let payload: { bytes: ArrayBuffer; contentType: string } | null = null;

  // 1) Explicit cover ID
  if (id) {
    payload = await fetchCoverBytes(olCoverById(id, size));
  }

  // 2) ISBN → verified cover_i (override map or Open Library isbn search)
  if (!payload && isbn && !isFakeIsbn(isbn)) {
    const coverI = await coverIdForIsbn(isbn);
    if (coverI) {
      payload = await fetchCoverBytes(olCoverById(coverI, size));
    }
    // Last ISBN attempt: direct OL isbn URL
    if (!payload) {
      const clean = isbn.replace(/[^0-9Xx]/g, "");
      payload = await fetchCoverBytes(
        `https://covers.openlibrary.org/b/isbn/${clean}-${VALID_SIZES.has(size) ? size : "M"}.jpg?default=false`
      );
    }
  }

  // 3) Fake ISBN / missing art → exact title match only (never loose author-only guesses)
  if (!payload && title && (isFakeIsbn(isbn || "") || !isbn)) {
    const coverI = await coverIdForTitleAuthor(title, author);
    if (coverI) {
      payload = await fetchCoverBytes(olCoverById(coverI, size));
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
