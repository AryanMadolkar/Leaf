import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { searchOpenLibrary } from "@/utils/booksApi";
import { CACHE_SHORT } from "@/utils/apiCache";

const getCachedSearch = unstable_cache(
  async (query: string) => searchOpenLibrary(query),
  ["book-search"],
  { revalidate: 300, tags: ["book-search"] }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ success: true, books: [] });
  }

  try {
    const books = await getCachedSearch(query.trim().toLowerCase());
    return NextResponse.json(
      { success: true, books },
      { headers: { "Cache-Control": CACHE_SHORT } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Books search API error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
