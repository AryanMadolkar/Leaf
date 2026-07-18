import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { mapDbBookToClientBook } from "@/utils/booksApi";
import { CACHE_SHORT } from "@/utils/apiCache";

/**
 * Recent books logged by any user (community-wide), newest first, unique by book.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 8) || 8, 24);
    const admin = createAdminClient();

    const { data: rows, error } = await admin
      .from("user_books")
      .select(
        `
        id,
        book_id,
        status,
        created_at,
        started_at,
        finished_at,
        book:books(*)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      console.error("[feed/recently-logged]", error);
      return NextResponse.json({ success: false, error: error.message, books: [] }, { status: 500 });
    }

    const seen = new Set<string>();
    const books = [];

    for (const row of rows || []) {
      const bookId = row.book_id || (row.book as { id?: string } | null)?.id;
      if (!bookId || seen.has(bookId)) continue;
      seen.add(bookId);

      const joined = row.book;
      const rawBook =
        joined && typeof joined === "object" && !Array.isArray(joined)
          ? (joined as Record<string, unknown>)
          : null;
      if (rawBook) {
        books.push(mapDbBookToClientBook({ ...rawBook, id: bookId }));
      } else {
        books.push({
          id: bookId,
          title: "Untitled",
          author: "Unknown Author",
          year: 0,
          description: "",
          coverImage: "",
          averageRating: 0,
          genres: [] as string[],
          pages: 0,
        });
      }

      if (books.length >= limit) break;
    }

    return NextResponse.json(
      { success: true, books },
      { headers: { "Cache-Control": CACHE_SHORT } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[feed/recently-logged]", error);
    return NextResponse.json({ success: false, error: message, books: [] }, { status: 500 });
  }
}
