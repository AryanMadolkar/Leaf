import { NextResponse } from "next/server";
import { searchOpenLibrary } from "@/utils/booksApi";
import { CACHE_SHORT } from "@/utils/apiCache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ success: true, books: [] });
  }

  try {
    const books = await searchOpenLibrary(query.trim());
    return NextResponse.json(
      { success: true, books },
      { headers: { "Cache-Control": CACHE_SHORT } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Books search API error:", error);
    return NextResponse.json(
      { success: false, error: message, books: [] },
      { status: 500 }
    );
  }
}
