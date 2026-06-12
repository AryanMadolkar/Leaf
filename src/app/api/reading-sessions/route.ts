import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { recalculateUserStats } from "@/utils/supabaseStats";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Default to active user session, fallback to searchParam if querying another profile
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = searchParams.get("userId") || user?.id;

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: "Missing target userId" }, { status: 400 });
    }

    const { data: sessions, error } = await supabase
      .from("reading_sessions")
      .select(`
        *,
        book:books(title, author_name, cover_url)
      `)
      .eq("user_id", targetUserId)
      .order("logged_at", { ascending: false });

    if (error) throw error;

    const mappedSessions = sessions ? sessions.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      bookId: s.book_id,
      pages_read: s.pages_read,
      start_page: s.start_page,
      end_page: s.end_page,
      note: s.note,
      reading_minutes: s.reading_minutes,
      logged_at: s.logged_at,
      title: s.book?.title || "",
      author: s.book?.author_name || "",
      coverImage: s.book?.cover_url || "",
    })) : [];

    return NextResponse.json({ success: true, sessions: mappedSessions });
  } catch (error: any) {
    console.error("Fetch reading-sessions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookId, pagesRead, startPage, endPage, note, readingMinutes } = body;

    if (!bookId || pagesRead === undefined || startPage === undefined || endPage === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    // 1. Get book page count
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("page_count, title")
      .eq("id", bookId)
      .maybeSingle();

    if (bookError || !book) {
      return NextResponse.json({ success: false, error: "Book not found in database" }, { status: 404 });
    }

    const totalPages = book.page_count || 300;

    // 2. Insert reading session
    const sessionId = crypto.randomUUID();
    const { error: sessionError } = await supabase
      .from("reading_sessions")
      .insert({
        id: sessionId,
        user_id: user.id,
        book_id: bookId,
        pages_read: pagesRead,
        start_page: startPage,
        end_page: endPage,
        note: note || null,
        reading_minutes: readingMinutes || null,
        logged_at: new Date().toISOString()
      });

    if (sessionError) throw sessionError;

    // 3. Update user_books page progress
    const { data: userBook } = await supabase
      .from("user_books")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle();
    
    const isCompleted = endPage >= totalPages;
    const nextStatus = isCompleted ? "finished" : "reading";

    if (userBook) {
      const updatePayload: any = {
        current_page: endPage,
      };

      if (isCompleted) {
        updatePayload.status = "finished";
        updatePayload.finished_at = today;
      } else if (userBook.status === "want_to_read") {
        updatePayload.status = "reading";
        updatePayload.started_at = today;
      }

      await supabase
        .from("user_books")
        .update(updatePayload)
        .eq("id", userBook.id);
    } else {
      // If book wasn't on shelves yet, add it
      await supabase
        .from("user_books")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          book_id: bookId,
          status: nextStatus,
          started_at: today,
          finished_at: isCompleted ? today : null,
          created_at: new Date().toISOString(),
          current_page: endPage,
        });
    }

    // 4. Recalculate stats dynamically in PostgreSQL
    await recalculateUserStats(supabase, user.id);

    // 5. Gather and return updated payload for context sync
    // Fetch all user books
    const { data: userBooks } = await supabase
      .from("user_books")
      .select(`
        id,
        status,
        rating,
        review,
        current_page,
        started_at,
        finished_at,
        created_at,
        book:books(*)
      `)
      .eq("user_id", user.id);

    const diaryLogs = userBooks ? userBooks.map((ub: any) => {
      let clientStatus: "Want to Read" | "Currently Reading" | "Finished" = "Finished";
      if (ub.status === "want_to_read") clientStatus = "Want to Read";
      else if (ub.status === "reading") clientStatus = "Currently Reading";

      const dateStr = ub.finished_at || ub.started_at || ub.created_at || new Date().toISOString();
      const dateLogged = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;

      return {
        id: ub.id,
        userId: user.id,
        bookId: ub.book?.id || "",
        status: clientStatus,
        dateLogged,
        rating: ub.rating !== null ? ub.rating : undefined,
        currentPage: ub.current_page || 0,
      };
    }) : [];

    // Fetch Community Reviews
    const { data: dbReviews } = await supabase
      .from("reviews")
      .select(`
        id,
        user_id,
        book_id,
        rating,
        review_text,
        likes_count,
        created_at,
        profile:profiles(display_name, avatar_url, username),
        book:books(title, author_name, cover_url)
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    const reviews = dbReviews ? dbReviews.map((r: any) => {
      const dateObj = new Date(r.created_at);
      const dateString = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });

      return {
        id: r.id,
        userId: r.user_id,
        bookId: r.book_id,
        rating: r.rating || 0.0,
        content: r.review_text,
        dateString,
        likesCount: r.likes_count || 0,
        commentsCount: 0,
        isLiked: false,
        
        reviewerName: r.profile?.display_name || "Reader",
        reviewerAvatar: r.profile?.avatar_url || "",
        reviewerUsername: r.profile?.username || "reader",
        bookTitle: r.book?.title || "",
        bookAuthor: r.book?.author_name || "",
        bookCover: r.book?.cover_url || "",
      };
    }) : [];

    // Fetch user sessions
    const { data: dbSessions } = await supabase
      .from("reading_sessions")
      .select(`
        *,
        book:books(title, author_name, cover_url)
      `)
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false });

    const sessions = dbSessions ? dbSessions.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      bookId: s.book_id,
      pages_read: s.pages_read,
      start_page: s.start_page,
      end_page: s.end_page,
      note: s.note,
      reading_minutes: s.reading_minutes,
      logged_at: s.logged_at,
      title: s.book?.title || "",
      author: s.book?.author_name || "",
      coverImage: s.book?.cover_url || "",
    })) : [];

    // Fetch stats
    const { data: statsRow } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

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
