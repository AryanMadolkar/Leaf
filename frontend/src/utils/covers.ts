import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import { LOCAL_COVER_BY_ISBN } from "@/data/localCovers";

export type CoverSize = "S" | "M" | "L";

type CoverMeta = { title?: string; author?: string; isbn?: string };

/** Cache-bust when cover resolution strategy changes. */
const COVER_VERSION = "7";

/** Real ISBN-10 / ISBN-13 only — not Open Library work keys like OL29049148W. */
export function normalizeIsbn(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = value.replace(/[^0-9Xx]/g, "");
  if (clean.length === 10 || clean.length === 13) return clean;
  return null;
}

function appendMeta(base: string, meta?: CoverMeta): string {
  if (!meta) return base;
  const u = new URL(base, "http://local");
  const isbn = normalizeIsbn(meta.isbn);
  if (isbn && !u.searchParams.get("isbn")) u.searchParams.set("isbn", isbn);
  if (meta.title && !u.searchParams.get("title")) u.searchParams.set("title", meta.title);
  if (meta.author && !u.searchParams.get("author")) u.searchParams.set("author", meta.author);
  return `${u.pathname}?${u.searchParams.toString()}`;
}

/** Same-origin cached cover by Open Library cover ID. */
export function coverUrlFromCoverId(
  coverId: number | string,
  size: CoverSize = "M",
  meta?: CoverMeta
): string {
  const base = `/api/covers?id=${encodeURIComponent(String(coverId))}&size=${size}&v=${COVER_VERSION}`;
  return appendMeta(base, meta);
}

/** Same-origin cached cover by ISBN (proxy tries Google Books, then Open Library). */
export function coverUrlFromIsbn(
  isbn: string,
  size: CoverSize = "M",
  meta?: { title?: string; author?: string }
): string {
  const clean = normalizeIsbn(isbn);
  if (!clean) {
    if (meta?.title) {
      const params = new URLSearchParams({ size, title: meta.title, v: COVER_VERSION });
      if (meta.author) params.set("author", meta.author);
      return `/api/covers?${params.toString()}`;
    }
    return "";
  }
  const params = new URLSearchParams({ isbn: clean, size, v: COVER_VERSION });
  if (meta?.title) params.set("title", meta.title);
  if (meta?.author) params.set("author", meta.author);
  return `/api/covers?${params.toString()}`;
}

/** Append default=false so missing Open Library covers 404 instead of blank GIFs. */
export function withOpenLibraryDefaultFalse(url: string): string {
  if (!url || !url.includes("covers.openlibrary.org")) return url;
  if (url.includes("default=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}default=false`;
}

/** Rewrite Open Library URLs through our caching proxy. Prefer ISBN when available. */
export function toProxiedCoverUrl(url: string, size: CoverSize = "M", meta?: CoverMeta): string {
  if (!url) return "";
  if (url.startsWith("/api/covers")) {
    // Strip stale `id=` when we have a real ISBN — dead OL cover_i burns latency
    if (meta?.isbn && normalizeIsbn(meta.isbn)) {
      const u = new URL(url, "http://local");
      if (u.searchParams.has("id")) {
        return coverUrlFromIsbn(meta.isbn, size, meta);
      }
    }
    return appendMeta(url, meta);
  }

  const isbnMatch = url.match(/\/b\/isbn\/([0-9Xx]+)/i);
  if (isbnMatch) return coverUrlFromIsbn(isbnMatch[1], size, meta);

  if (meta?.isbn && normalizeIsbn(meta.isbn)) {
    return coverUrlFromIsbn(meta.isbn, size, meta);
  }

  const idMatch = url.match(/\/b\/id\/(\d+)/);
  if (idMatch) return coverUrlFromCoverId(idMatch[1], size, meta);

  if (url.includes("covers.openlibrary.org")) {
    return withOpenLibraryDefaultFalse(url);
  }
  return url;
}

/** Deterministic brand-colored CSS fallback when no cover loads. */
export function coverFallbackStyle(seed: string): { background: string } {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hues = [142, 28, 210, 35, 195];
  const hue = hues[hash % hues.length];
  const sat = 28 + (hash % 20);
  const light = 28 + (hash % 12);
  return {
    background: `linear-gradient(145deg, hsl(${hue} ${sat}% ${light}%), hsl(${hue} ${sat + 8}% ${light + 14}%))`,
  };
}

/**
 * Resolve the best available cover URL.
 * Prefer ISBN (Google Books recovers reliably) over stale Open Library cover IDs.
 */
export function resolveCoverUrl(
  coverImage: string | null | undefined,
  opts?: {
    isbn?: string | null;
    coverId?: number | string | null;
    bookId?: string | null;
    size?: CoverSize;
    title?: string | null;
    author?: string | null;
  }
): string {
  const size = opts?.size || "M";
  const isbn =
    normalizeIsbn(opts?.isbn) ||
    normalizeIsbn(opts?.bookId && /^[\dXx-]{10,}$/.test(opts.bookId) ? opts.bookId : null);
  const meta: CoverMeta = {
    title: opts?.title || undefined,
    author: opts?.author || undefined,
    isbn: isbn || undefined,
  };

  // 0) Bundled static covers beat dead remotes / CDN-cached stubs
  if (isbn && LOCAL_COVER_BY_ISBN[isbn]) {
    return `${LOCAL_COVER_BY_ISBN[isbn]}?v=${COVER_VERSION}`;
  }

  // 1) ISBN-first — catalog books all have real ISBN-13s
  if (isbn) return coverUrlFromIsbn(isbn, size, meta);

  // 2) Explicit cover ID only when no ISBN
  if (opts?.coverId) return coverUrlFromCoverId(opts.coverId, size, meta);

  const lookupKey = opts?.bookId || "";
  if (lookupKey && COVER_ID_BY_ISBN[lookupKey]) {
    return coverUrlFromCoverId(COVER_ID_BY_ISBN[lookupKey], size, meta);
  }

  const raw = (coverImage || "").trim();
  const isStockFallback =
    !raw ||
    raw.includes("photo-1543002588-bfa74002ed7e") ||
    raw.includes("placeholder");

  if (!isStockFallback) {
    return toProxiedCoverUrl(raw, size, meta);
  }

  if (meta.title) {
    const params = new URLSearchParams({ size, title: meta.title, v: COVER_VERSION });
    if (meta.author) params.set("author", meta.author);
    return `/api/covers?${params.toString()}`;
  }
  return "";
}

/** Best cover URL for a book id + optional stored cover_url. */
export function resolveBookCover(
  bookId: string | null | undefined,
  coverUrl?: string | null,
  size: CoverSize = "M",
  meta?: { title?: string; author?: string; isbn?: string | null }
): string {
  if (!bookId && !coverUrl && !meta?.title) return "";
  return resolveCoverUrl(coverUrl, {
    bookId,
    isbn: normalizeIsbn(meta?.isbn) || normalizeIsbn(bookId),
    size,
    title: meta?.title,
    author: meta?.author,
  });
}

/** Client-side fallback chain after a cover URL 404s. */
export function nextCoverFallback(
  failedSrc: string,
  opts: { isbn?: string | null; title?: string; author?: string; size?: CoverSize }
): string {
  const size = opts.size || "M";
  const u = new URL(failedSrc, "http://local");
  const hadId = u.searchParams.has("id");
  const isbn = normalizeIsbn(opts.isbn) || normalizeIsbn(u.searchParams.get("isbn"));
  const title = opts.title || u.searchParams.get("title") || undefined;
  const author = opts.author || u.searchParams.get("author") || undefined;

  if (hadId && isbn) {
    return coverUrlFromIsbn(isbn, size, { title, author });
  }
  // Local static path or stale proxy URL without isbn param
  if (isbn && (!u.searchParams.get("isbn") || failedSrc.startsWith("/covers/"))) {
    return coverUrlFromIsbn(isbn, size, { title, author });
  }
  if (title) {
    const params = new URLSearchParams({ size, title, v: COVER_VERSION });
    if (author) params.set("author", author);
    return `/api/covers?${params.toString()}`;
  }
  return "";
}
