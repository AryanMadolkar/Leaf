import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getFeaturedBookForDate, withResolvedCover } from "@/utils/bookCatalog";
import { CACHE_SHORT } from "@/utils/apiCache";

/** Cache book identity only — cover URLs are re-resolved on every response. */
const getCachedFeatured = unstable_cache(
  async (dateKey: string) => getFeaturedBookForDate(dateKey),
  ["featured-book-daily-v2"],
  { revalidate: 3600, tags: ["featured-book"] }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Prefer explicit date param (client), else UTC today — flips at 00:00 UTC
  const dateKey =
    searchParams.get("date") || new Date().toISOString().slice(0, 10);

  try {
    const cached = await getCachedFeatured(dateKey);
    if (!cached) {
      return NextResponse.json({ success: false, error: "No featured book found" }, { status: 404 });
    }

    const book = withResolvedCover(cached);

    return NextResponse.json(
      { success: true, book, date: dateKey },
      {
        headers: {
          "Cache-Control": CACHE_SHORT,
          "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Featured book API error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
