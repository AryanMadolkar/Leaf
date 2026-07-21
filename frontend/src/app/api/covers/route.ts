import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import { LOCAL_COVER_BY_ISBN } from "@/data/localCovers";

export const runtime = "nodejs";

const VALID_SIZES = new Set(["S", "M", "L"]);
const FETCH_TIMEOUT_MS = 2800;
const MAX_CANDIDATES = 16;
const MIN_COVER_BYTES = 2500;
const MIN_COVER_EDGE = 90;

/** Known Google Books content-endpoint stubs (rate-limit / missing-cover). */
const BAD_COVER_SHA256 = new Set([
  // Identical 575×829 JPEG returned for many ISBNs when Google rate-limits
  "5e7f0425abc77878f2a1efe98f12070d7e97b3047d2ce1cd050598230e34e205",
  // Identical 128×184 JPEG (~10KB) returned when no real cover exists
  "a9af512c1e52ed9cafd06b8f212bf13940976703ee3a38573df558e28ce31a21",
  // Identical 800×1153 JPEG (~466KB) shared across unrelated ISBNs
  "49bbf581de71ea482b8b99b5c120c480d2f07f29d21fc309e43b7d2f517cf437",
  // Shared grayscale PNG stub (575×750)
  "3efa8c43e5b4348f303a528c81adf435f0111ea752fe9f0f6241478b60987fa6",
]);

const WIKI_UA =
  "LeafLibrary/1.0 (https://leaf-peach.vercel.app; book-cover-proxy)";

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

function isUsableCover(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < MIN_COVER_BYTES) return false;

  const sha = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  if (BAD_COVER_SHA256.has(sha)) return false;

  const data = new Uint8Array(bytes);

  // PNG — reject grayscale stubs (Google "image not available")
  if (data.length > 26 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    const width = readU32(data, 16);
    const height = readU32(data, 20);
    const colorType = data[25];
    if (colorType === 0 || colorType === 4) return false;
    if (width < MIN_COVER_EDGE || height < MIN_COVER_EDGE) return false;
    return true;
  }

  const jpeg = jpegDimensions(data);
  if (jpeg) {
    if (jpeg.w < MIN_COVER_EDGE || jpeg.h < MIN_COVER_EDGE) return false;
    // Classic Google missing-cover thumbnail
    if (jpeg.w === 128 && jpeg.h === 184) return false;
    // Rate-limit stub fingerprints
    if (jpeg.w === 575 && jpeg.h === 829 && bytes.byteLength > 240000 && bytes.byteLength < 250000) {
      return false;
    }
    if (jpeg.w === 800 && jpeg.h === 1153 && bytes.byteLength > 450000 && bytes.byteLength < 480000) {
      return false;
    }
    return true;
  }

  return bytes.byteLength >= 5000;
}

async function fetchCoverBytes(
  url: string,
  headers?: Record<string, string>
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      next: { revalidate: 60 * 60 * 24 * 14 },
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": WIKI_UA,
        ...headers,
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

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 * 7 },
      headers: { "User-Agent": WIKI_UA, ...headers },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type SearchDoc = { cover_i?: number; title?: string; isbn?: string[]; key?: string };

async function candidatesFromTitleAuthor(
  title: string,
  author?: string | null
): Promise<Array<{ kind: "id" | "isbn"; value: string }>> {
  const needle = title.trim().toLowerCase();
  if (!needle) return [];
  const q = new URLSearchParams({
    title: title.trim(),
    limit: "12",
    fields: "cover_i,title,isbn,key",
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

  // Prefer cover IDs first — Google content endpoint often rate-limits with a fake JPEG
  for (const d of ranked) {
    if (!d.cover_i) continue;
    const key = `id:${d.cover_i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: "id", value: String(d.cover_i) });
    if (out.length >= MAX_CANDIDATES) return out;
  }
  for (const d of ranked) {
    for (const isbn of d.isbn || []) {
      const clean = cleanIsbn(isbn);
      if (!clean || isFakeIsbn(clean)) continue;
      const key = `isbn:${clean}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: "isbn", value: clean });
      if (out.length >= MAX_CANDIDATES) return out;
    }
  }
  return out;
}

/** Extra live cover IDs attached to an Open Library work. */
async function coverIdsFromWorkKey(workKey: string): Promise<number[]> {
  const key = workKey.startsWith("/") ? workKey : `/${workKey}`;
  const data = await fetchJson<{ covers?: number[] }>(`https://openlibrary.org${key}.json`);
  const covers = (data?.covers || []).filter((id) => id > 0);
  return covers.slice(0, 6);
}

async function workKeyFromTitleAuthor(title: string, author?: string | null): Promise<string | null> {
  const q = new URLSearchParams({
    title: title.trim(),
    limit: "3",
    fields: "key,title",
  });
  if (author) q.set("author", author);
  const data = await fetchJson<{ docs?: SearchDoc[] }>(
    `https://openlibrary.org/search.json?${q.toString()}`
  );
  const doc = data?.docs?.[0];
  return doc?.key || null;
}

/** Fresh cover id from Open Library books API (often newer than search cover_i). */
async function coverIdFromBooksApi(isbn: string): Promise<number | null> {
  const clean = cleanIsbn(isbn);
  if (!clean) return null;
  const data = await fetchJson<Record<string, { cover?: { medium?: string; large?: string } }>>(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(clean)}&format=json&jscmd=data`
  );
  if (!data) return null;
  const entry = data[`ISBN:${clean}`] || Object.values(data)[0];
  const url = entry?.cover?.large || entry?.cover?.medium || "";
  const m = url.match(/\/b\/id\/(\d+)/);
  return m ? Number(m[1]) : null;
}

type WikiSummary = {
  title?: string;
  type?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

async function coverFromWikipedia(title: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const needle = title.trim();
  if (!needle || needle.length < 3) return null;

  const attempts = [
    needle,
    `${needle} (novel)`,
    `${needle} (book)`,
    `${needle} (novella)`,
  ];

  for (const attempt of attempts) {
    const summary = await fetchJson<WikiSummary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(attempt)}`
    );
    if (!summary || summary.type === "disambiguation") continue;
    const imageUrl = summary.originalimage?.source || summary.thumbnail?.source;
    if (!imageUrl) continue;
    const cover = await fetchCoverBytes(imageUrl);
    if (cover) return cover;
  }

  // OpenSearch fallback for fuzzy title matches
  const open = await fetchJson<[string, string[], string[], string[]]>(
    `https://en.wikipedia.org/w/api.php?action=opensearch&limit=5&namespace=0&format=json&search=${encodeURIComponent(needle)}`
  );
  const titles = open?.[1] || [];
  for (const t of titles.slice(0, 4)) {
    if (!t.toLowerCase().includes(needle.toLowerCase().slice(0, Math.min(12, needle.length)))) {
      continue;
    }
    const summary = await fetchJson<WikiSummary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`
    );
    const imageUrl = summary?.originalimage?.source || summary?.thumbnail?.source;
    if (!imageUrl) continue;
    const cover = await fetchCoverBytes(imageUrl);
    if (cover) return cover;
  }

  return null;
}

async function localCoverBytes(isbn: string | null): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  if (!isbn) return null;
  const publicPath = LOCAL_COVER_BY_ISBN[isbn];
  if (!publicPath) return null;
  try {
    const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    const buf = await readFile(filePath);
    const bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    if (!isUsableCover(bytes)) return null;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : "image/jpeg";
    return { bytes, contentType };
  } catch {
    return null;
  }
}

type CoverPayload = { bytes: ArrayBuffer; contentType: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const isbnRaw = searchParams.get("isbn");
  const size = (searchParams.get("size") || "M").toUpperCase();
  const title = searchParams.get("title");
  const author = searchParams.get("author");
  const isbn = isbnRaw && !isFakeIsbn(isbnRaw) ? cleanIsbn(isbnRaw) : null;

  const tried = new Set<string>();
  const state: { cover: CoverPayload | null } = { cover: null };

  async function tryUrl(key: string, url: string) {
    if (state.cover || tried.has(key)) return;
    tried.add(key);
    state.cover = await fetchCoverBytes(url);
  }

  async function tryId(coverId: number | string | null | undefined) {
    if (coverId == null || coverId === "") return;
    await tryUrl(`id:${coverId}`, olCoverById(coverId, size));
  }

  async function tryOlIsbn(value: string | null | undefined) {
    if (!value || isFakeIsbn(value)) return;
    const clean = cleanIsbn(value);
    if (!clean) return;
    const url = olCoverByIsbn(clean, size);
    if (!url) return;
    await tryUrl(`ol-isbn:${clean}`, url);
  }

  async function tryGoogleIsbn(value: string | null | undefined) {
    if (!value || isFakeIsbn(value)) return;
    const clean = cleanIsbn(value);
    if (!clean) return;
    // Prefer larger zooms; zoom 1 is almost always the shared 128×184 stub
    for (const zoom of [4, 3, 1]) {
      if (state.cover) return;
      const url = googleCoverByIsbn(clean, zoom);
      if (!url) continue;
      await tryUrl(`gbooks:${clean}:z${zoom}`, url);
    }
  }

  // 0) Bundled static covers for known titles with dead remotes
  if (!state.cover) {
    state.cover = await localCoverBytes(isbn);
  }

  // 1) Mapped / explicit Open Library cover IDs (unique per book when alive)
  await tryId(id);
  if (!state.cover && isbn) {
    const mapped = COVER_ID_BY_ISBN[isbn] || COVER_ID_BY_ISBN[isbnRaw || ""];
    await tryId(mapped);
    await tryId(await coverIdFromBooksApi(isbn));
  }

  // 2) Title search cover IDs — try several until one returns HTTP 200
  if (!state.cover && title) {
    const candidates = await candidatesFromTitleAuthor(title, author);
    for (const c of candidates) {
      if (state.cover) break;
      if (c.kind === "id") await tryId(c.value);
    }
    // Work-level cover list often has older live IDs when search cover_i is dead
    if (!state.cover) {
      const workKey = await workKeyFromTitleAuthor(title, author);
      if (workKey) {
        const workCovers = await coverIdsFromWorkKey(workKey);
        for (const cid of workCovers) {
          if (state.cover) break;
          await tryId(cid);
        }
      }
    }
    for (const c of candidates) {
      if (state.cover) break;
      if (c.kind === "isbn") {
        await tryId(await coverIdFromBooksApi(c.value));
        await tryOlIsbn(c.value);
        // Skip Google here — tried later after Wikipedia
      }
    }
  }

  // 3) Direct OL ISBN
  await tryOlIsbn(isbn);

  // 4) Wikipedia before Google — Google often returns shared stubs that burn latency
  if (!state.cover && title) {
    state.cover = await coverFromWikipedia(title);
  }

  // 5) Google content endpoint (stub fingerprints rejected in isUsableCover)
  await tryGoogleIsbn(isbn);

  // 6) Looser title search without author
  if (!state.cover && title && author) {
    const loose = await candidatesFromTitleAuthor(title, null);
    for (const c of loose) {
      if (state.cover) break;
      if (c.kind === "id") await tryId(c.value);
      else {
        await tryOlIsbn(c.value);
        await tryGoogleIsbn(c.value);
      }
    }
  }

  // 7) Wikipedia again after looser OL search (in case title+author missed)
  if (!state.cover && title) {
    state.cover = await coverFromWikipedia(title);
  }

  const payload = state.cover;
  if (!payload) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  return new NextResponse(payload.bytes, {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      // Version query (?v=) busts caches when resolution strategy changes
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      "CDN-Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
