import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { CatalogShelf, getCatalogBooks } from "@/utils/bookCatalog";
import { CACHE_MEDIUM } from "@/utils/apiCache";

const VALID_SHELVES: CatalogShelf[] = [
  "all-time-greats", "trending", "most-added", "booktok", "award-winners",
  "modern-classics", "scifi", "fantasy", "literary", "mystery", "romance",
  "historical", "biography", "nonfiction", "leaderboard",
];

const getCachedShelf = unstable_cache(
  async (shelf: CatalogShelf, limit: number, offset: number) => ({
    books: getCatalogBooks(shelf, limit, offset),
    total: getCatalogBooks(shelf, 5000, 0).length,
  }),
  ["book-catalog"],
  { revalidate: 3600, tags: ["book-catalog"] }
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
    const result = await getCachedShelf(shelf, limit, offset);
    return NextResponse.json(
      { success: true, shelf, ...result },
      { headers: { "Cache-Control": CACHE_MEDIUM } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Catalog API error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
