import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import { LOCAL_COVER_BY_ISBN } from "@/data/localCovers";

export const runtime = "nodejs";

const VALID_SIZES = new Set(["S", "M", "L"]);
/** Per-upstream fetch — fail fast under Discover thundering-herd. */
const FETCH_TIMEOUT_MS = 1100;
/** Hard cap for the whole proxy request (Vercel + browser). */
const TOTAL_BUDGET_MS = 3000;
const MAX_ID_TRIES = 4;
const MIN_COVER_BYTES = 2500;
const MAX_COVER_BYTES = 1_200_000;
const MIN_COVER_EDGE = 90;

/** Known Google Books content-endpoint stubs (rate-limit / missing-cover). */
const BAD_COVER_SHA256 = new Set([
  "5e7f0425abc77878f2a1efe98f12070d7e97b3047d2ce1cd050598230e34e205",
  "a9af512c1e52ed9cafd06b8f212bf13940976703ee3a38573df558e28ce31a21",
  "49bbf581de71ea482b8b99b5c120c480d2f07f29d21fc309e43b7d2f517cf437",
  "3efa8c43e5b4348f303a528c81adf435f0111ea752fe9f0f6241478b60987fa6",
]);

const WIKI_UA = "LeafLibrary/1.0 (https://leaf-peach.vercel.app; book-cover-proxy)";

type CoverPayload = { bytes: ArrayBuffer; contentType: string };

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

function googleCoverByIsbn(isbn: string, zoom: number): string | null {
  const clean = cleanIsbn(isbn);
  if (!clean || isFakeIsbn(clean)) return null;
  return `https://books.google.com/books/content?vid=ISBN${clean}&printsec=frontcover&img=1&zoom=${zoom}`;
}

function readU32(data: Uint8Array, offset: number): number {
  return ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0;
}

function readU16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function jpegDimensions(data: Uint8Array): { w: number; h: number } | null {
  if (data[0] !== 0xff || data[1] !== 0xd8) return null;
  let i = 2;
  while (i < data.length - 8) {
    if (data[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = data[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { h: readU16(data, i + 5), w: readU16(data, i + 7) };
    }
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const length = readU16(data, i + 2);
    if (length < 2) break;
    i += 2 + length;
  }
  return null;
}

function isPortraitCover(w: number, h: number): boolean {
  if (w < MIN_COVER_EDGE || h < MIN_COVER_EDGE) return false;
  // Reject landscape banners (Wikipedia lead images, etc.)
  if (w > h * 1.15) return false;
  return true;
}

function isUsableCover(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < MIN_COVER_BYTES) return false;
  if (bytes.byteLength > MAX_COVER_BYTES) return false;

  const sha = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  if (BAD_COVER_SHA256.has(sha)) return false;

  const data = new Uint8Array(bytes);

  if (data.length > 26 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    const width = readU32(data, 16);
    const height = readU32(data, 20);
    const colorType = data[25];
    if (colorType === 0 || colorType === 4) return false;
    if (!isPortraitCover(width, height)) return false;
    return true;
  }

  // GIF — Open Library sometimes serves these
  if (data.length > 10 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    const width = data[6] | (data[7] << 8);
    const height = data[8] | (data[9] << 8);
    return isPortraitCover(width, height);
  }

  const jpeg = jpegDimensions(data);
  if (jpeg) {
    if (!isPortraitCover(jpeg.w, jpeg.h)) return false;
    if (jpeg.w === 128 && jpeg.h === 184) return false;
    if (jpeg.w === 575 && jpeg.h === 829 && bytes.byteLength > 240000 && bytes.byteLength < 250000) {
      return false;
    }
    if (jpeg.w === 800 && jpeg.h === 1153 && bytes.byteLength > 450000 && bytes.byteLength < 480000) {
      return false;
    }
    return true;
  }

  return false;
}

async function fetchCoverBytes(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<CoverPayload | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      next: { revalidate: 60 * 60 * 24 * 14 },
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": WIKI_UA,
      },
    });
    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    if (!isUsableCover(bytes)) return null;
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

async function fetchJson<T>(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 * 7 },
      headers: { "User-Agent": WIKI_UA },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** First successful result wins; losers are ignored. */
async function raceFirst(tasks: Array<() => Promise<CoverPayload | null>>): Promise<CoverPayload | null> {
  if (tasks.length === 0) return null;
  return new Promise((resolve) => {
    let pending = tasks.length;
    let settled = false;
    for (const task of tasks) {
      Promise.resolve()
        .then(task)
        .then((result) => {
          if (result && !settled) {
            settled = true;
            resolve(result);
            return;
          }
          pending -= 1;
          if (pending === 0 && !settled) resolve(null);
        })
        .catch(() => {
          pending -= 1;
          if (pending === 0 && !settled) resolve(null);
        });
    }
  });
}

type SearchDoc = { cover_i?: number; title?: string; isbn?: string[] };

async function coverIdsFromTitle(title: string, author?: string | null): Promise<number[]> {
  const needle = title.trim().toLowerCase();
  if (!needle) return [];
  const q = new URLSearchParams({
    title: title.trim(),
    limit: "8",
    fields: "cover_i,title",
  });
  if (author) q.set("author", author);
  const data = await fetchJson<{ docs?: SearchDoc[] }>(
    `https://openlibrary.org/search.json?${q.toString()}`
  );
  const docs = data?.docs || [];
  const ranked = [
    ...docs.filter((d) => (d.title || "").trim().toLowerCase() === needle),
    ...docs,
  ];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const d of ranked) {
    if (!d.cover_i || seen.has(d.cover_i)) continue;
    seen.add(d.cover_i);
    ids.push(d.cover_i);
    if (ids.length >= MAX_ID_TRIES) break;
  }
  return ids;
}

async function coverFromWikipediaFast(title: string): Promise<CoverPayload | null> {
  const needle = title.trim();
  if (needle.length < 3) return null;

  for (const attempt of [needle, `${needle} (book)`, `${needle} (novel)`]) {
    const summary = await fetchJson<{
      type?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(attempt)}`);
    if (!summary || summary.type === "disambiguation") continue;
    // Prefer thumbnail — originals are often multi‑MB or wide banners
    for (const imageUrl of [summary.thumbnail?.source, summary.originalimage?.source]) {
      if (!imageUrl) continue;
      // Request a portrait-friendly width when Wikimedia thumb supports it
      const sized = imageUrl.replace(/\/(\d+)px-/, "/400px-");
      const cover = await fetchCoverBytes(sized);
      if (cover) return cover;
      if (sized !== imageUrl) {
        const fallback = await fetchCoverBytes(imageUrl);
        if (fallback) return fallback;
      }
    }
  }
  return null;
}

async function localCoverBytes(isbn: string | null): Promise<CoverPayload | null> {
  if (!isbn) return null;
  const publicPath = LOCAL_COVER_BY_ISBN[isbn];
  if (!publicPath) return null;
  try {
    const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    const buf = await readFile(filePath);
    const bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    // Bundled assets are trusted — skip stub/aspect filters
    const ext = path.extname(filePath).toLowerCase();
    return {
      bytes,
      contentType: ext === ".png" ? "image/png" : "image/jpeg",
    };
  } catch {
    return null;
  }
}

function remaining(deadline: number): number {
  return Math.max(0, deadline - Date.now());
}

export async function GET(request: Request) {
  const started = Date.now();
  const deadline = started + TOTAL_BUDGET_MS;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const isbnRaw = searchParams.get("isbn");
  const size = (searchParams.get("size") || "M").toUpperCase();
  const title = searchParams.get("title");
  const author = searchParams.get("author");
  const isbn = isbnRaw && !isFakeIsbn(isbnRaw) ? cleanIsbn(isbnRaw) : null;

  // 0) Local assets — instant
  let cover = await localCoverBytes(isbn);
  if (cover) return respond(cover);

  const mapped = isbn ? COVER_ID_BY_ISBN[isbn] || COVER_ID_BY_ISBN[isbnRaw || ""] : null;
  const olIsbnUrl = isbn ? olCoverByIsbn(isbn, size) : null;
  const googleUrl = isbn ? googleCoverByIsbn(isbn, 4) : null;

  // 1) Race the fastest direct sources together
  const primary: Array<() => Promise<CoverPayload | null>> = [];
  if (id) primary.push(() => fetchCoverBytes(olCoverById(id, size)));
  if (mapped) primary.push(() => fetchCoverBytes(olCoverById(mapped, size)));
  if (olIsbnUrl) primary.push(() => fetchCoverBytes(olIsbnUrl));
  if (googleUrl) primary.push(() => fetchCoverBytes(googleUrl));

  cover = await raceFirst(primary);
  if (cover) return respond(cover);
  if (remaining(deadline) < 350) return notFound();

  // 2) Title-search IDs + Wikipedia in parallel — cover quality without serial stalls
  if (title && remaining(deadline) > 400) {
    const secondary: Array<() => Promise<CoverPayload | null>> = [
      async () => {
        const ids = await coverIdsFromTitle(title, author);
        if (!ids.length || remaining(deadline) < 250) return null;
        return raceFirst(ids.map((cid) => () => fetchCoverBytes(olCoverById(cid, size))));
      },
      () => coverFromWikipediaFast(title),
    ];
    cover = await raceFirst(secondary);
    if (cover) return respond(cover);
  }

  // 3) Last Google zoom if still nothing (zoom 3 sometimes unique when 4 stubs)
  if (isbn && remaining(deadline) > 350) {
    const z3 = googleCoverByIsbn(isbn, 3);
    if (z3) {
      cover = await fetchCoverBytes(z3, Math.min(FETCH_TIMEOUT_MS, remaining(deadline)));
      if (cover) return respond(cover);
    }
  }

  return notFound();
}

function respond(payload: CoverPayload) {
  return new NextResponse(payload.bytes, {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      "CDN-Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
