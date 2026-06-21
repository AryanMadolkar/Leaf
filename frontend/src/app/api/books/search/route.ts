import { NextResponse } from "next/server";
import { searchOpenLibrary } from "@/utils/booksApi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ success: true, books: [] });
  }

  try {
    const books = await searchOpenLibrary(query);
    return NextResponse.json({ success: true, books });
  } catch (error: any) {
    console.error("Books search API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
