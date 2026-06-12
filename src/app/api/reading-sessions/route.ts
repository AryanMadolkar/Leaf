import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDatabase, recalculateUserStats } from "@/utils/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
  }

  try {
    const db = getDatabase();
    const sessions = db.prepare(`
      SELECT rs.*, b.title, b.author_name as author, b.cover_url as coverImage
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = ?
      ORDER BY rs.logged_at DESC
    `).all(userId) as any[];

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error("Fetch reading-sessions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, bookId, pagesRead, startPage, endPage, note, readingMinutes } = body;

    if (!userId || !bookId || pagesRead === undefined || startPage === undefined || endPage === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const db = getDatabase();
    const today = new Date().toISOString().split("T")[0];

    // 1. Get book page count
    const book = db.prepare("SELECT page_count, title FROM books WHERE id = ?").get(bookId) as { page_count: number; title: string } | undefined;
    if (!book) {
      return NextResponse.json({ success: false, error: "Book not found in database" }, { status: 404 });
    }

    const totalPages = book.page_count || 300;

    // 2. Insert reading session
    const sessionId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO reading_sessions (
        id, user_id, book_id, pages_read, start_page, end_page, note, reading_minutes, logged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      userId,
      bookId,
      pagesRead,
      startPage,
      endPage,
      note || null,
      readingMinutes || null,
      new Date().toISOString()
    );

    // 3. Update user_books page progress
    const userBook = db.prepare("SELECT id, status FROM user_books WHERE user_id = ? AND book_id = ?").get(userId, bookId) as { id: string; status: string } | undefined;
    
    const isCompleted = endPage >= totalPages;
    const nextStatus = isCompleted ? "finished" : "reading";

    if (userBook) {
      db.prepare(`
        UPDATE user_books SET
          current_page = ?,
          status = CASE WHEN ? = 'finished' THEN 'finished' ELSE status END,
          finished_at = CASE WHEN ? = 'finished' THEN ? ELSE finished_at END,
          started_at = CASE WHEN status = 'want_to_read' THEN ? ELSE started_at END
        WHERE id = ?
      `).run(
        endPage,
        nextStatus,
        nextStatus, today,
        today, // if it was want_to_read, set started_at to today
        userBook.id
      );
    } else {
      // If book wasn't on shelves yet, add it as reading or finished
      db.prepare(`
        INSERT INTO user_books (
          id, user_id, book_id, status, rating, review, started_at, finished_at, created_at, current_page
        ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        userId,
        bookId,
        nextStatus,
        today, // started_at
        isCompleted ? today : null, // finished_at
        today, // created_at
        endPage
      );
    }

    // 4. Update stats for the user
    recalculateUserStats(userId);

    // 5. Gather and return updated payload for context sync
    const allUserBooks = db.prepare("SELECT * FROM user_books").all() as any[];

    // Re-map diaryLogs and reviews
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

    const sessions = db.prepare(`
      SELECT rs.*, b.title, b.author_name as author, b.cover_url as coverImage
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = ?
      ORDER BY rs.logged_at DESC
    `).all(userId) as any[];

    // Fetch user stats
    const statsRow = db.prepare("SELECT * FROM user_reading_stats WHERE user_id = ?").get(userId) as any;

    return NextResponse.json({
      success: true,
      diaryLogs,
      reviews,
      sessions,
      stats: statsRow || null,
      autoFinished: isCompleted,
    });
  } catch (error: any) {
    console.error("Log reading-session API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
