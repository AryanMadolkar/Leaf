import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getFeaturedBookForDate } from "@/utils/bookCatalog";
import { CACHE_DAILY } from "@/utils/apiCache";

const getCachedFeatured = unstable_cache(
  async (dateKey: string) => getFeaturedBookForDate(dateKey),
  ["featured-book-daily"],
  { revalidate: 3600, tags: ["featured-book"] }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Prefer explicit date param (client), else UTC today — flips at 00:00 UTC
  const dateKey =
    searchParams.get("date") || new Date().toISOString().slice(0, 10);

  try {
    const book = await getCachedFeatured(dateKey);
    if (!book) {
      return NextResponse.json({ success: false, error: "No featured book found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, book, date: dateKey },
      {
        headers: {
          "Cache-Control": CACHE_DAILY,
          "CDN-Cache-Control": `public, s-maxage=86400, stale-while-revalidate=3600`,
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Featured book API error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
