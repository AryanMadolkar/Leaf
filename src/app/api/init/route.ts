import { NextResponse } from "next/server";
import { initDatabase, getDatabase } from "@/utils/db";
import { mapDbBookToClientBook } from "@/utils/booksApi";

export async function GET() {
  try {
    // Initialize database (seed if needed)
    initDatabase();
    
    const db = getDatabase();

    // 1. Fetch and map all books
    const dbBooks = db.prepare("SELECT * FROM books").all() as any[];
    const books = dbBooks.map(mapDbBookToClientBook);

    // 2. Fetch and map all user reading logs & reviews
    const dbUserBooks = db.prepare("SELECT * FROM user_books").all() as any[];

    const diaryLogs = dbUserBooks.map((ub) => {
      let status: "Want to Read" | "Currently Reading" | "Finished" = "Finished";
      if (ub.status === "want_to_read") status = "Want to Read";
      else if (ub.status === "reading") status = "Currently Reading";

      const dateStr = ub.finished_at || ub.started_at || ub.created_at || new Date().toISOString();
      const dateLogged = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;

      return {
        id: ub.id,
        userId: ub.user_id,
        bookId: ub.book_id,
        status,
        dateLogged,
        rating: ub.rating !== null ? ub.rating : undefined,
        currentPage: ub.current_page || 0,
      };
    });

    const reviews = dbUserBooks
      .filter((ub) => ub.status === "finished" && ub.review !== null && ub.review !== "")
      .map((ub) => {
        const dateObj = new Date(ub.finished_at || ub.created_at || Date.now());
        const dateString = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });

        return {
          id: ub.id,
          userId: ub.user_id,
          bookId: ub.book_id,
          rating: ub.rating || 0,
          content: ub.review,
          dateString,
          likesCount: ub.likes_count || 0,
          commentsCount: ub.comments_count || 0,
          isLiked: false, // Client can override this
        };
      });

    // 3. Fetch reading sessions and stats for the default currentUser (Rowan Archer)
    const sessions = db.prepare(`
      SELECT rs.*, b.title, b.author_name as author, b.cover_url as coverImage
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = 'currentUser'
      ORDER BY rs.logged_at DESC
    `).all() as any[];

    const stats = db.prepare("SELECT * FROM user_reading_stats WHERE user_id = 'currentUser'").get() as any;

    return NextResponse.json({
      success: true,
      books,
      diaryLogs,
      reviews,
      sessions,
      stats: stats || null,
    });
  } catch (error: any) {
    console.error("Database initialization API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
