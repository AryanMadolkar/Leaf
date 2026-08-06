import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { CatalogShelf, getCatalogBooks, getISOWeekKey } from "@/utils/bookCatalog";
import { CACHE_MEDIUM, CACHE_SHORT } from "@/utils/apiCache";

const VALID_SHELVES: CatalogShelf[] = [
  "all-time-greats", "trending", "most-added", "booktok", "award-winners",
  "modern-classics", "scifi", "fantasy", "literary", "mystery", "romance",
  "historical", "biography", "nonfiction", "leaderboard",
];

const getCachedShelf = unstable_cache(
  async (shelf: CatalogShelf, limit: number, offset: number, weekKey: string) => ({
    books: getCatalogBooks(shelf, limit, offset, shelf === "trending" ? weekKey : undefined),
    total: getCatalogBooks(shelf, 10000, 0, shelf === "trending" ? weekKey : undefined).length,
  }),
  ["book-catalog-v6"],
  { revalidate: 3600, tags: ["book-catalog-v6"] }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shelf = (searchParams.get("shelf") || "all-time-greats") as CatalogShelf;
  const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  if (!VALID_SHELVES.includes(shelf)) {
    return NextResponse.json({ success: false, error: "Invalid shelf" }, { status: 400 });
  }

  try {
    const weekKey = getISOWeekKey();
    const result = await getCachedShelf(shelf, limit, offset, weekKey);
    return NextResponse.json(
      {
        success: true,
        shelf,
        ...(shelf === "trending" ? { week: weekKey } : {}),
        ...result,
      },
      { headers: { "Cache-Control": shelf === "trending" ? CACHE_SHORT : CACHE_MEDIUM } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Catalog API error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
