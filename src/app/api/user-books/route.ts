import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDatabase } from "@/utils/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
  }

  try {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM user_books WHERE user_id = ?").all(userId) as any[];
    
    return NextResponse.json({ success: true, logs: rows });
  } catch (error: any) {
    console.error("Fetch user-books API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, bookId, status, rating, review } = body;

    if (!userId || !bookId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const mappedStatus = status === "Want to Read" 
      ? "want_to_read" 
      : status === "Currently Reading" 
      ? "reading" 
      : status === "Finished"
      ? "finished"
      : status; // in case already formatted

    const db = getDatabase();
    const today = new Date().toISOString().split("T")[0];

    // Get book page count
    const book = db.prepare("SELECT page_count FROM books WHERE id = ?").get(bookId) as { page_count: number } | undefined;
    const totalPages = book?.page_count || 300;

    // Check if record exists
    const existing = db.prepare(
      "SELECT id FROM user_books WHERE user_id = ? AND book_id = ?"
    ).get(userId, bookId) as { id: string } | undefined;

    if (existing) {
      // Update existing record
      db.prepare(`
        UPDATE user_books SET
          status = ?,
          rating = COALESCE(?, rating),
          review = COALESCE(?, review),
          started_at = CASE WHEN ? = 'reading' AND started_at IS NULL THEN ? ELSE started_at END,
          finished_at = CASE WHEN ? = 'finished' THEN ? ELSE finished_at END,
          current_page = CASE WHEN ? = 'finished' THEN ? WHEN ? = 'want_to_read' THEN 0 ELSE current_page END
        WHERE id = ?
      `).run(
        mappedStatus,
        rating !== undefined ? rating : null,
        review !== undefined ? review : null,
        mappedStatus, today,
        mappedStatus, today,
        mappedStatus, totalPages,
        mappedStatus,
        existing.id
      );
    } else {
      // Insert new record
      db.prepare(`
        INSERT INTO user_books (
          id, user_id, book_id, status, rating, review, started_at, finished_at, created_at, current_page
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        userId,
        bookId,
        mappedStatus,
        rating !== undefined ? rating : null,
        review !== undefined ? review : null,
        mappedStatus === "reading" ? today : null,
        mappedStatus === "finished" ? today : null,
        today,
        mappedStatus === "finished" ? totalPages : 0
      );
    }

    // Recalculate stats
    const { recalculateUserStats } = require("@/utils/db");
    recalculateUserStats(userId);

    // Return all user books for state refresh
    const allUserBooks = db.prepare("SELECT * FROM user_books").all() as any[];

    // Re-map to client structures
    const diaryLogs = allUserBooks.map((ub) => {
      let clientStatus: "Want to Read" | "Currently Reading" | "Finished" = "Finished";
      if (ub.status === "want_to_read") clientStatus = "Want to Read";
      else if (ub.status === "reading") clientStatus = "Currently Reading";

      const dateStr = ub.finished_at || ub.started_at || ub.created_at || new Date().toISOString();
      const dateLogged = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;

      return {
        id: ub.id,
        userId: ub.user_id,
        bookId: ub.book_id,
        status: clientStatus,
        dateLogged,
        rating: ub.rating !== null ? ub.rating : undefined,
        currentPage: ub.current_page || 0,
      };
    });

    const reviews = allUserBooks
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
          isLiked: false,
        };
      });

    // Also get the current user stats row and active sessions
    const statsRow = db.prepare("SELECT * FROM user_reading_stats WHERE user_id = ?").get(userId) as any;
    const sessions = db.prepare(`
      SELECT rs.*, b.title, b.author_name as author, b.cover_url as coverImage
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = ?
      ORDER BY rs.logged_at DESC
    `).all(userId) as any[];

    return NextResponse.json({
      success: true,
      diaryLogs,
      reviews,
      sessions,
      stats: statsRow || null,
    });
  } catch (error: any) {
    console.error("Save user-book API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
