import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { recalculateUserStats } from "@/utils/supabaseStats";
import { getBookById } from "@/utils/booksApi";

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

    const { data: rows, error } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", targetUserId);

    if (error) throw error;
    
    return NextResponse.json({ success: true, logs: rows });
  } catch (error: any) {
    console.error("Fetch user-books API error:", error);
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
    const { bookId, status, rating, review, title, author, coverImage } = body;

    if (!bookId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const mappedStatus = status === "Want to Read" 
      ? "want_to_read" 
      : status === "Currently Reading" 
      ? "reading" 
      : status === "Finished"
      ? "finished"
      : status; // check if already formatted

    const today = new Date().toISOString().split("T")[0];

    // 1. Ensure the book is cached in public.books first (critical for foreign key constraints)
    let totalPages = 300;
    try {
      const book = await getBookById(bookId);
      if (!book) {
        return NextResponse.json({ success: false, error: "Book not found or could not be cached" }, { status: 404 });
      }
      totalPages = book.pages || 300;
    } catch (err: any) {
      console.error(`Error resolving book details for shelving:`, err);
      return NextResponse.json({ success: false, error: "Database integration error caching book details" }, { status: 500 });
    }

    // 2. Check if user_book record already exists
    const { data: existingUserBook } = await supabase
      .from("user_books")
      .select("id, started_at, finished_at, current_page")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle();

    if (existingUserBook) {
      // Update existing
      const updatePayload: any = {
        status: mappedStatus,
        rating: rating !== undefined ? rating : null,
        review: review !== undefined ? review : null,
      };

      if (mappedStatus === "reading" && !existingUserBook.started_at) {
        updatePayload.started_at = today;
      }
      if (mappedStatus === "finished") {
        updatePayload.finished_at = today;
        updatePayload.current_page = totalPages;
      } else if (mappedStatus === "want_to_read") {
        updatePayload.current_page = 0;
      }

      const { error } = await supabase
        .from("user_books")
        .update(updatePayload)
        .eq("id", existingUserBook.id);

      if (error) throw error;
    } else {
      // Insert new
      const insertPayload: any = {
        id: crypto.randomUUID(),
        user_id: user.id,
        book_id: bookId,
        status: mappedStatus,
        rating: rating !== undefined ? rating : null,
        review: review !== undefined ? review : null,
        started_at: mappedStatus === "reading" ? today : null,
        finished_at: mappedStatus === "finished" ? today : null,
        created_at: new Date().toISOString(),
        current_page: mappedStatus === "finished" ? totalPages : 0,
      };

      const { error } = await supabase
        .from("user_books")
        .insert(insertPayload);

      if (error) throw error;
    }

    // 3. Upsert into public reviews feed table if review is provided
    if (mappedStatus === "finished" && review !== undefined && review !== null && review !== "") {
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .maybeSingle();

      if (existingReview) {
        await supabase
          .from("reviews")
          .update({
            rating: rating !== undefined ? rating : 5,
            review_text: review,
            created_at: new Date().toISOString(),
          })
          .eq("id", existingReview.id);
      } else {
        await supabase
          .from("reviews")
          .insert({
            user_id: user.id,
            book_id: bookId,
            rating: rating !== undefined ? rating : 5,
            review_text: review,
            created_at: new Date().toISOString(),
          });
      }
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

    // Fetch Community Reviews (join profiles & books)
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

    // Fetch User Reading Sessions
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
    });
  } catch (error: any) {
    console.error("Save user-book API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const followId = searchParams.get("followId");

    if (!followId) {
      return NextResponse.json({ success: false, error: "Missing followId" }, { status: 400 });
    }

    // Check if relationship already exists
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", followId)
      .maybeSingle();

    if (existingFollow) {
      // Unfollow
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", followId);
      
      if (error) throw error;
      return NextResponse.json({ success: true, followed: false });
    } else {
      // Follow
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: followId,
        });

      if (error) throw error;
      return NextResponse.json({ success: true, followed: true });
    }
  } catch (error: any) {
    console.error("Follow/unfollow API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
