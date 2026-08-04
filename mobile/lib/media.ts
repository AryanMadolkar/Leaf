import { API_BASE_URL } from "./config";

/**
 * Book covers and avatars often come back as same-origin relative paths
 * (e.g. `/api/covers?...`, `/api/avatar/<id>`) — that works on web because
 * the browser resolves them against its own origin, but React Native's
 * <Image> has no origin to resolve against, so they need to be made
 * absolute against the API host.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:)/.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
