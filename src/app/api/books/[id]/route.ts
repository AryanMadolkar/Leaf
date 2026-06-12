import { NextResponse } from "next/server";
import { getCachedBook, getBookByISBN, getBookByOpenLibraryKey } from "@/utils/booksApi";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing book identifier" }, { status: 400 });
  }

  try {
    // 1. Try local cache lookup by ID, ISBN, or Work Key
    let book = await getCachedBook(id);
    if (book) {
      return NextResponse.json({ success: true, book });
    }

    // 2. Determine type of ID and fetch
    const isIsbn = /^\d+$/.test(id) && (id.length === 10 || id.length === 13);
    if (isIsbn) {
      book = await getBookByISBN(id);
    } else if (id.startsWith("OL")) {
      book = await getBookByOpenLibraryKey(id);
    }

    // 3. Fallback: if we still don't have it, try resolving it as ISBN or other identifier
    if (!book && /^\d+$/.test(id)) {
      book = await getBookByISBN(id);
    }

    if (!book) {
      return NextResponse.json({ success: false, error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, book });
  } catch (error: any) {
    console.error(`Error fetching book detail API for ${id}:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
