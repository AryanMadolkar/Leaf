import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";

export type CoverSize = "S" | "M" | "L";

type CoverMeta = { title?: string; author?: string; isbn?: string | null };

/** Same-origin cached cover by Open Library cover ID. */
export function coverUrlFromCoverId(
  coverId: number | string,
  size: CoverSize = "M",
  meta?: CoverMeta
): string {
  const params = new URLSearchParams({
    id: String(coverId),
    size,
  });
  if (meta?.title) params.set("title", meta.title);
  if (meta?.author) params.set("author", meta.author);
  if (meta?.isbn) params.set("isbn", meta.isbn);
  return `/api/covers?${params.toString()}`;
}

/** Same-origin cached cover by ISBN (resolves cover ID when known). */
export function coverUrlFromIsbn(
  isbn: string,
  size: CoverSize = "M",
  meta?: CoverMeta
): string {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  const params = new URLSearchParams({ size });
  if (clean) params.set("isbn", clean);
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

/** Rewrite Open Library URLs through our caching proxy. */
export function toProxiedCoverUrl(url: string, size: CoverSize = "M"): string {
  if (!url) return "";
  if (url.startsWith("/api/covers")) return url;

  const idMatch = url.match(/\/b\/id\/(\d+)/);
  if (idMatch) return coverUrlFromCoverId(idMatch[1], size);

  const isbnMatch = url.match(/\/b\/isbn\/([0-9Xx]+)/i);
  if (isbnMatch) return coverUrlFromIsbn(isbnMatch[1], size);

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
 * Resolve the best available cover URL (proxied + preferred cover ID).
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
  const meta = {
    title: opts?.title || undefined,
    author: opts?.author || undefined,
  };

  if (opts?.coverId) return coverUrlFromCoverId(opts.coverId, size);

  const lookupKey = opts?.isbn || opts?.bookId || "";
  if (lookupKey && COVER_ID_BY_ISBN[lookupKey]) {
    return coverUrlFromCoverId(COVER_ID_BY_ISBN[lookupKey], size);
  }

  const raw = (coverImage || "").trim();
  const isStockFallback =
    !raw ||
    raw.includes("photo-1543002588-bfa74002ed7e") ||
    raw.includes("placeholder");

  if (!isStockFallback) {
    const proxied = toProxiedCoverUrl(raw, size);
    // Attach title/author so proxy can search if the ISBN image 404s
    if (proxied.startsWith("/api/covers") && (meta.title || meta.author)) {
      const u = new URL(proxied, "http://local");
      if (meta.title) u.searchParams.set("title", meta.title);
      if (meta.author) u.searchParams.set("author", meta.author);
      return `${u.pathname}?${u.searchParams.toString()}`;
    }
    return proxied;
  }

  if (opts?.isbn) return coverUrlFromIsbn(opts.isbn, size, meta);
  if (opts?.bookId && /^[\dXx-]{10,}$/.test(opts.bookId)) return coverUrlFromIsbn(opts.bookId, size, meta);

  // Last resort: title/author search via proxy
  if (meta.title) {
    const params = new URLSearchParams({ size, title: meta.title });
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
  meta?: CoverMeta
): string {
  if (!bookId && !coverUrl && !meta?.title) return "";
  return resolveCoverUrl(coverUrl, {
    bookId,
    isbn: meta?.isbn || bookId,
    size,
    title: meta?.title,
    author: meta?.author,
  });
}
