import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getBookById } from "@/utils/booksApi";
import { CACHE_MEDIUM } from "@/utils/apiCache";

const getCachedBook = unstable_cache(
  async (id: string) => getBookById(id),
  ["book-detail"],
  { revalidate: 86400, tags: ["book-detail"] }
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing book identifier" }, { status: 400 });
  }

  try {
    const book = await getCachedBook(id);
    if (!book) {
      return NextResponse.json({ success: false, error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, book },
      { headers: { "Cache-Control": CACHE_MEDIUM } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error fetching book detail API for ${id}:`, error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
