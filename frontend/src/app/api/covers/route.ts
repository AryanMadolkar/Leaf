import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";

export const runtime = "nodejs";

const VALID_SIZES = new Set(["S", "M", "L"]);

// Google Books serves this exact "image not available" graphic (128x170
// grayscale PNG) for any ISBN it doesn't have art for, instead of a 404 —
// it must be fingerprinted and rejected or it gets cached as a real cover.
const GOOGLE_BOOKS_PLACEHOLDER_HASH = "e89e0e364e83c0ecfba5da41007c9a2c";

function upstreamUrl(params: {
  id?: string | null;
  isbn?: string | null;
  size: string;
}): string | null {
  const size = VALID_SIZES.has(params.size) ? params.size : "M";
  if (params.id) {
    return `https://covers.openlibrary.org/b/id/${params.id}-${size}.jpg?default=false`;
  }
  if (params.isbn) {
    const clean = params.isbn.replace(/[^0-9Xx]/g, "");
    if (!clean) return null;
    const coverId = COVER_ID_BY_ISBN[clean] || COVER_ID_BY_ISBN[params.isbn];
    if (coverId) {
      return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
    }
    return `https://covers.openlibrary.org/b/isbn/${clean}-${size}.jpg?default=false`;
  }
  return null;
}

function googleBooksUrl(isbn: string): string {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  return `https://books.google.com/books/content?vid=ISBN${clean}&printsec=frontcover&img=1&zoom=1`;
}

async function fetchCoverBytes(url: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  // Some cover IDs redirect through slow archive.org mirrors; bail out fast
  // so the caller still has time to try the next fallback.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      // Cache at the edge for a month after first successful fetch
      next: { revalidate: 60 * 60 * 24 * 30 },
      redirect: "follow",
      headers: { Accept: "image/*,*/*;q=0.8" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    // Open Library blank GIFs are tiny
    if (bytes.byteLength < 200) return null;
    // Google Books "image not available" stub — same bytes every time
    if (createHash("md5").update(Buffer.from(bytes)).digest("hex") === GOOGLE_BOOKS_PLACEHOLDER_HASH) {
      return null;
    }
    return {
      bytes,
      contentType: res.headers.get("Content-Type") || "image/jpeg",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Same-origin cover proxy.
 * Caches Open Library (and Google Books fallback) images at the CDN edge
 * so thumbnails load instantly after the first hit.
 *
 * GET /api/covers?id=11200092&size=M
 * GET /api/covers?isbn=9780593135204&size=M
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const isbn = searchParams.get("isbn");
  const size = (searchParams.get("size") || "M").toUpperCase();
  const title = searchParams.get("title");
  const author = searchParams.get("author");

  const primary = upstreamUrl({ id, isbn, size });
  let payload = primary ? await fetchCoverBytes(primary) : null;

  // Fallback: Google Books by ISBN when Open Library has nothing
  if (!payload && isbn) {
    payload = await fetchCoverBytes(googleBooksUrl(isbn));
  }

  // Fallback: Open Library search by title/author (helps fake/generated ISBNs)
  if (!payload && title) {
    try {
      const q = new URLSearchParams({
        title,
        limit: "1",
        fields: "cover_i",
      });
      if (author) q.set("author", author);
      const searchRes = await fetch(`https://openlibrary.org/search.json?${q.toString()}`, {
        next: { revalidate: 60 * 60 * 24 * 7 },
      });
      if (searchRes.ok) {
        const data = await searchRes.json();
        const coverI = data?.docs?.[0]?.cover_i;
        if (coverI) {
          const sz = VALID_SIZES.has(size) ? size : "M";
          payload = await fetchCoverBytes(
            `https://covers.openlibrary.org/b/id/${coverI}-${sz}.jpg?default=false`
          );
        }
      }
    } catch {
      // ignore
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
