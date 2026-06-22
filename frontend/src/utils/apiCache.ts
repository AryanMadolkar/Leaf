/** Shared cache headers for book API responses */
export const CACHE_SHORT = "public, s-maxage=300, stale-while-revalidate=600";
export const CACHE_MEDIUM = "public, s-maxage=3600, stale-while-revalidate=86400";
export const CACHE_DAILY = "public, s-maxage=86400, stale-while-revalidate=172800";

export function withCacheHeaders(response: Response, cacheControl: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
