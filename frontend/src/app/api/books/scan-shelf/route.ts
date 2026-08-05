import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { searchOpenLibrary } from "@/utils/booksApi";
import type { Book } from "@/data/mockData";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BOOKS = 60;
const MAX_IMAGE_CHARS = 6_000_000; // ~4.5MB base64
const DEFAULT_MODEL = "gemini-3.6-flash";

type DetectedBook = {
  title: string;
  author: string;
};

type ScanMatch = {
  detectedTitle: string;
  detectedAuthor: string;
  match: Book | null;
  alternatives: Book[];
};

function splitDataUrl(input: string, fallbackMime: string): { mimeType: string; base64: string } {
  if (input.startsWith("data:")) {
    const comma = input.indexOf(",");
    const meta = input.slice(5, comma >= 0 ? comma : undefined);
    const mimeType = meta.split(";")[0] || fallbackMime;
    const base64 = comma >= 0 ? input.slice(comma + 1) : "";
    return { mimeType, base64 };
  }
  return { mimeType: fallbackMime, base64: input };
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function parseDetections(content: string): DetectedBook[] {
  const trimmed = content.trim();
  const jsonStart = trimmed.indexOf("[");
  const jsonEnd = trimmed.lastIndexOf("]");
  if (jsonStart < 0 || jsonEnd < 0) return [];
  try {
    const raw = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const books: DetectedBook[] = [];
    for (const item of raw) {
      const title = String(item?.title || "").trim();
      if (!title) continue;
      const key = normalizeTitleKey(title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      books.push({
        title,
        author: String(item?.author || "").trim() || "Unknown Author",
      });
      if (books.length >= MAX_BOOKS) break;
    }
    return books;
  } catch {
    return [];
  }
}

function scoreTitleMatch(detectedTitle: string, candidateTitle: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const a = norm(detectedTitle);
  const b = norm(candidateTitle);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 85;
  const aw = a.split(" ").filter((w) => w.length > 2);
  const bw = new Set(b.split(" ").filter((w) => w.length > 2));
  if (aw.length === 0) return 0;
  const overlap = aw.filter((w) => bw.has(w)).length;
  return Math.round((overlap / aw.length) * 70);
}

function pickBestMatch(detected: DetectedBook, results: Book[]): Book | null {
  if (results.length === 0) return null;
  let best = results[0];
  let bestScore = -1;
  for (const book of results.slice(0, 10)) {
    let score = scoreTitleMatch(detected.title, book.title);
    if (
      detected.author !== "Unknown Author" &&
      book.author &&
      book.author.toLowerCase().includes(detected.author.toLowerCase().split(" ")[0] || "")
    ) {
      score += 8;
    }
    if (score > bestScore) {
      bestScore = score;
      best = book;
    }
  }
  // Prefer a reasonable title overlap; otherwise still return top hit so users can fix it.
  return bestScore >= 15 ? best : results[0];
}

async function detectBooksWithGemini(dataUrl: string, fallbackMime: string): Promise<DetectedBook[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Shelf scan is not configured (missing GEMINI_API_KEY)");
  }

  const model = process.env.GEMINI_VISION_MODEL || DEFAULT_MODEL;
  const { mimeType, base64 } = splitDataUrl(dataUrl, fallbackMime);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const systemPrompt = [
    "You are a careful bookshelf OCR assistant.",
    "Identify EVERY readable book in the photo — spines facing out AND covers facing forward.",
    "Scan every shelf row, including side shelves, staggered shelves, and books stacked or leaning.",
    "Include a book if the title is readable even when the author is partial or missing.",
    "Prefer exact printed titles; expand abbreviations only when obvious.",
    "Deduplicate identical titles (same book appearing twice). Keep distinct editions/titles.",
    "Skip only spines/covers that are truly illegible.",
    "Return ONLY a JSON array of objects with keys title and author.",
    `Aim for completeness. Max ${MAX_BOOKS} books.`,
  ].join(" ");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64,
              },
            },
            {
              text: [
                "List every readable book visible in this photo.",
                "Read both vertical spines and face-out covers.",
                "Work shelf by shelf, left to right, top to bottom.",
                'Return JSON only: [{"title":"...","author":"..."}]',
                'If author is unclear, use "Unknown Author".',
              ].join(" "),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.05,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.error?.status ||
      `Gemini vision failed (${res.status})`;
    throw new Error(msg);
  }

  const content =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
    "[]";
  return parseDetections(content);
}

async function matchDetection(detected: DetectedBook): Promise<ScanMatch> {
  const fullQuery = [detected.title, detected.author !== "Unknown Author" ? detected.author : ""]
    .filter(Boolean)
    .join(" ")
    .trim();

  try {
    let results = await searchOpenLibrary(fullQuery);
    if (results.length === 0 && detected.author !== "Unknown Author") {
      results = await searchOpenLibrary(detected.title);
    }
    if (results.length === 0) {
      // Last try: first few significant words of the title
      const short = detected.title
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 4)
        .join(" ");
      if (short && short.toLowerCase() !== fullQuery.toLowerCase()) {
        results = await searchOpenLibrary(short);
      }
    }

    const match = pickBestMatch(detected, results);
    return {
      detectedTitle: detected.title,
      detectedAuthor: detected.author,
      match,
      alternatives: results.filter((r) => r.id !== match?.id).slice(0, 4),
    };
  } catch {
    return {
      detectedTitle: detected.title,
      detectedAuthor: detected.author,
      match: null,
      alternatives: [],
    };
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "image/jpeg";

    if (!imageBase64 || imageBase64.length < 100) {
      return NextResponse.json({ success: false, error: "Image required" }, { status: 400 });
    }
    if (imageBase64.length > MAX_IMAGE_CHARS) {
      return NextResponse.json(
        { success: false, error: "Image too large — try a closer photo or lower quality" },
        { status: 400 }
      );
    }

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mimeType};base64,${imageBase64}`;

    const detections = await detectBooksWithGemini(dataUrl, mimeType);
    if (detections.length === 0) {
      return NextResponse.json({
        success: true,
        books: [],
        message: "No readable books found. Try better lighting, a closer shot, or a wider crop of the shelves.",
      });
    }

    const matched: ScanMatch[] = [];
    for (let i = 0; i < detections.length; i += 8) {
      const chunk = detections.slice(i, i + 8);
      const results = await Promise.all(chunk.map(matchDetection));
      matched.push(...results);
    }

    return NextResponse.json({
      success: true,
      books: matched,
      detectedCount: detections.length,
      matchedCount: matched.filter((m) => m.match).length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Scan failed";
    console.error("[books/scan-shelf]", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
