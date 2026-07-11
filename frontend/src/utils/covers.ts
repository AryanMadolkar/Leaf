/** Append default=false so missing Open Library covers 404 instead of blank GIFs. */
export function withOpenLibraryDefaultFalse(url: string): string {
  if (!url || !url.includes("covers.openlibrary.org")) return url;
  if (url.includes("default=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}default=false`;
}

export function coverUrlFromCoverId(coverId: number | string, size: "S" | "M" | "L" = "L"): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
}

export function coverUrlFromIsbn(isbn: string, size: "S" | "M" | "L" = "L"): string {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  return `https://covers.openlibrary.org/b/isbn/${clean}-${size}.jpg?default=false`;
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
 * Prefer explicit cover IDs from overrides, then existing URL with default=false.
 */
export function resolveCoverUrl(
  coverImage: string | null | undefined,
  opts?: { isbn?: string | null; coverId?: number | string | null; bookId?: string | null }
): string {
  if (opts?.coverId) return coverUrlFromCoverId(opts.coverId);
  if (coverImage) return withOpenLibraryDefaultFalse(coverImage);
  if (opts?.isbn) return coverUrlFromIsbn(opts.isbn);
  return "";
}
