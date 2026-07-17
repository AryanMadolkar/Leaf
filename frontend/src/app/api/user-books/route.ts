import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/utils/supabase/admin";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { recalculateUserStats } from "@/utils/supabaseStats";
import { getBookById, ensureBookRow } from "@/utils/booksApi";
import { mapUserBookToDiaryLog } from "@/utils/diaryLogs";

// 1. Environment verification helper
function verifyEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!anonKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return { url, anonKey, serviceRoleKey };
}

// 2. Supabase Client helper based on Service Role key availability
function getSupabaseClient(serviceRoleKey?: string) {
  const { url, anonKey } = verifyEnv();
  
  if (serviceRoleKey) {
    console.log("[DEBUG] [user-books] Initializing database client using Service Role Key (Admin Access).");
    return createServerClient(
      url,
      serviceRoleKey,
      {
        cookies: {
          getAll() { return []; },
          setAll() {}
        }
      }
    );
  }
  console.log("[DEBUG] [user-books] Initializing database client using Anon/Publishable Key (User Access).");
  return null;
}

// 3. Database Schema verification helper
async function verifyDatabaseSchema(supabaseClient: any) {
  // Check books table
  const { error: booksError } = await supabaseClient
    .from("books")
    .select("id, title, page_count")
    .limit(1);

  if (booksError) {
    console.error("[DEBUG] [user-books] Table validation check failed for 'books':", booksError);
    throw new Error(`Table 'books' validation failed: ${booksError.message} (Code: ${booksError.code})`);
  }

  // Check user_books table
  const { error: userBooksError } = await supabaseClient
    .from("user_books")
    .select("id, user_id, book_id, status, rating, review, started_at, finished_at, created_at")
    .limit(1);

  if (userBooksError) {
    console.error("[DEBUG] [user-books] Table validation check failed for 'user_books':", userBooksError);
    throw new Error(`Table 'user_books' validation failed: ${userBooksError.message} (Code: ${userBooksError.code})`);
  }

  console.log("[DEBUG] [user-books] Schema check passed: 'books' and 'user_books' tables are present.");
}

export async function GET(request: Request) {
  try {
    console.log("[DEBUG] [user-books] Incoming GET request.");
    const { url: envUrl, anonKey: envAnonKey, serviceRoleKey } = verifyEnv();
    console.log("[DEBUG] [user-books] Env verification passed. URL:", envUrl, "Anon Key Length:", envAnonKey.length);

    const { searchParams } = new URL(request.url);
    const { user, error: authError } = await getRequestUser();
    if (authError) {
      console.warn("[DEBUG] [user-books] Session auth error:", authError);
    }
    const targetUserId = searchParams.get("userId") || user?.id;

    if (!targetUserId) {
      console.warn("[DEBUG] [user-books] Missing target userId parameter or session.");
      return NextResponse.json({ success: false, error: "Missing target userId" }, { status: 400 });
    }

    const dbClient = getSupabaseClient(serviceRoleKey) || createAdminClient();
    await verifyDatabaseSchema(dbClient);

    const { data: rows, error: selectError } = await dbClient
      .from("user_books")
      .select("*")
      .eq("user_id", targetUserId);

    if (selectError) {
      console.error("[DEBUG] [user-books] Error querying user_books:", selectError);
      throw selectError;
    }
    
    console.log(`[DEBUG] [user-books] GET returning ${rows ? rows.length : 0} logs.`);
    return NextResponse.json({ success: true, logs: rows });
  } catch (error: any) {
    console.error("[DEBUG] [user-books] GET API error:", error);
    console.error(error.stack);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log("[DEBUG] [user-books] Incoming POST request.");
    
    // 1. Verify Env
    const { url: envUrl, anonKey: envAnonKey, serviceRoleKey } = verifyEnv();
    console.log("[DEBUG] [user-books] Env check: URL is set, Anon Key Length:", envAnonKey.length, "Service Role Key present:", !!serviceRoleKey);

    // 2. Parse body
    const body = await request.json();
    console.log("[DEBUG] [user-books] Incoming request body:", body);

    const { bookId, status, rating, review } = body;

    // 3. Payload validation
    if (!bookId || !status) {
      console.warn("[DEBUG] [user-books] Validation failed: Missing bookId or status");
      return NextResponse.json({ success: false, error: "Validation Error: Missing required fields 'bookId' or 'status'." }, { status: 400 });
    }

    const validStatuses = [
      "Want to Read",
      "Currently Reading",
      "Finished",
      "Did Not Finish",
      "want_to_read",
      "reading",
      "finished",
      "did_not_finish",
    ];
    if (!validStatuses.includes(status)) {
      console.warn("[DEBUG] [user-books] Validation failed: Invalid status value:", status);
      return NextResponse.json({ 
        success: false, 
        error: `Validation Error: Invalid status value '${status}'. Must be one of: ${validStatuses.join(", ")}` 
      }, { status: 400 });
    }

    const mappedStatus =
      status === "Want to Read"
        ? "want_to_read"
        : status === "Currently Reading"
          ? "reading"
          : status === "Finished"
            ? "finished"
            : status === "Did Not Finish"
              ? "did_not_finish"
              : status; // already DB-formatted

    // 4. Authenticate User
    const { user, error: authError } = await getRequestUser();

    if (authError || !user) {
      console.error("[DEBUG] [user-books] User authentication check failed:", authError);
      return NextResponse.json({ success: false, error: "Unauthorized: Invalid or missing session." }, { status: 401 });
    }
    console.log("[DEBUG] [user-books] Current authenticated user ID:", user.id);

    const dbClient = getSupabaseClient(serviceRoleKey) || createAdminClient();

    // Ensure profile row exists (critical to avoid foreign key violations in user_books/user_stats)
    const { data: existingProfile, error: profileCheckError } = await dbClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error("[DEBUG] [user-books] Error checking profile existence:", profileCheckError);
    }

    if (!existingProfile) {
      console.log("[DEBUG] [user-books] Profile row missing for user. Creating fallback profile row.");
      const newProfile = {
        id: user.id,
        username: user.email?.split("@")[0] || `user_${crypto.randomUUID().slice(0, 8)}`,
        display_name: "Reader",
        email: user.email,
        avatar_url: "",
        onboarding_completed: false,
      };

      const { error: profileInsertError } = await dbClient
        .from("profiles")
        .insert(newProfile);

      if (profileInsertError) {
        console.error("[DEBUG] [user-books] Failed to create fallback profile row:", profileInsertError);
        throw new Error(`Profile creation failed: ${profileInsertError.message}`);
      }
    }
    
    // 5. Schema check
    await verifyDatabaseSchema(dbClient);

    const today = new Date().toISOString().split("T")[0];

    // 6. Resolve / Cache book — must exist in `books` before user_books FK insert
    let totalPages = 300;
    let resolvedBookId = bookId;
    try {
      console.log("[DEBUG] [user-books] Resolving book metadata for bookId:", bookId);
      const book = await getBookById(bookId);
      if (!book) {
        console.error("[DEBUG] [user-books] Book details not resolved by getBookById.");
        return NextResponse.json({ success: false, error: "Book not found or could not be cached" }, { status: 404 });
      }
      totalPages = book.pages || 300;
      resolvedBookId = await ensureBookRow(book);
      console.log(`[DEBUG] [user-books] Resolved book: "${book.title}", db id: ${resolvedBookId}, pages: ${totalPages}`);
    } catch (err: any) {
      console.error(`[DEBUG] [user-books] Error caching/resolving book detail:`, err);
      console.error(err.stack);
      return NextResponse.json({ success: false, error: `Database integration error caching book details: ${err.message}` }, { status: 500 });
    }

    // 7. Check if user_book record already exists
    console.log("[DEBUG] [user-books] Querying existing user_book record...");
    const { data: existingUserBook, error: fetchError } = await dbClient
      .from("user_books")
      .select("id, started_at, finished_at, current_page, status")
      .eq("user_id", user.id)
      .eq("book_id", resolvedBookId)
      .maybeSingle();

    if (fetchError) {
      console.error("[DEBUG] [user-books] Error looking up existing user_book:", fetchError);
      throw fetchError;
    }

    let dbResponse: any = null;

    if (existingUserBook) {
      // Update existing
      const updatePayload: any = {
        status: mappedStatus,
        rating: rating !== undefined ? rating : null,
        review: review !== undefined ? review : null,
      };

      if (mappedStatus === "reading") {
        updatePayload.finished_at = null;
        if (!existingUserBook.started_at || existingUserBook.status === "finished") {
          updatePayload.started_at = today;
        }
        // Read Again / re-shelve from Finished — restart progress
        if (existingUserBook.status === "finished") {
          updatePayload.current_page = 0;
        }
      } else if (mappedStatus === "want_to_read") {
        updatePayload.finished_at = null;
        updatePayload.current_page = 0;
      } else if (mappedStatus === "did_not_finish") {
        // Keep progress where they stopped; clear completion date
        updatePayload.finished_at = null;
        if (!existingUserBook.started_at) {
          updatePayload.started_at = today;
        }
      } else if (mappedStatus === "finished") {
        updatePayload.finished_at = today;
        updatePayload.current_page = totalPages;
      }

      console.log("[DEBUG] [user-books] Database update payload:", updatePayload);
      const res = await dbClient
        .from("user_books")
        .update(updatePayload)
        .eq("id", existingUserBook.id)
        .select();

      dbResponse = res;
      console.log("[DEBUG] [user-books] Database update response:", dbResponse);
      if (res.error) throw res.error;
    } else {
      // Insert new
      const insertPayload: any = {
        id: crypto.randomUUID(),
        user_id: user.id,
        book_id: resolvedBookId,
        status: mappedStatus,
        rating: rating !== undefined ? rating : null,
        review: review !== undefined ? review : null,
        started_at:
          mappedStatus === "reading" || mappedStatus === "did_not_finish" ? today : null,
        finished_at: mappedStatus === "finished" ? today : null,
        created_at: new Date().toISOString(),
        current_page: mappedStatus === "finished" ? totalPages : 0,
      };

      console.log("[DEBUG] [user-books] Database insert payload:", insertPayload);
      const res = await dbClient
        .from("user_books")
        .insert(insertPayload)
        .select();

      dbResponse = res;
      console.log("[DEBUG] [user-books] Database insert response:", dbResponse);
      if (res.error) throw res.error;
    }

    // 8. Upsert into public reviews feed table if review is provided
    if (mappedStatus === "finished" && review !== undefined && review !== null && review !== "") {
      console.log("[DEBUG] [user-books] Review text is provided, upserting review feed record.");
      const { data: existingReview, error: reviewFetchError } = await dbClient
        .from("reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_id", resolvedBookId)
        .maybeSingle();

      if (reviewFetchError) {
        console.error("[DEBUG] [user-books] Error checking existing review:", reviewFetchError);
        throw reviewFetchError;
      }

      if (existingReview) {
        const payload = {
          rating: rating !== undefined ? rating : 5,
          review_text: review,
          created_at: new Date().toISOString(),
        };
        console.log("[DEBUG] [user-books] Updating existing review payload:", payload);
        const res = await dbClient
          .from("reviews")
          .update(payload)
          .eq("id", existingReview.id)
          .select();
        console.log("[DEBUG] [user-books] Review update response:", res);
        if (res.error) throw res.error;
      } else {
        const payload = {
          user_id: user.id,
          book_id: resolvedBookId,
          rating: rating !== undefined ? rating : 5,
          review_text: review,
          created_at: new Date().toISOString(),
        };
        console.log("[DEBUG] [user-books] Inserting new review payload:", payload);
        const res = await dbClient
          .from("reviews")
          .insert(payload)
          .select();
        console.log("[DEBUG] [user-books] Review insert response:", res);
        if (res.error) throw res.error;
      }
    }

    // 9. Recalculate stats dynamically in PostgreSQL
    console.log("[DEBUG] [user-books] Recalculating stats for user ID:", user.id);
    await recalculateUserStats(dbClient, user.id);

    // 10. Fetch updated user books
    const { data: userBooks, error: fetchUserBooksError } = await dbClient
      .from("user_books")
      .select(`
        id,
        book_id,
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

    if (fetchUserBooksError) {
      console.error("[DEBUG] [user-books] Error loading updated user library:", fetchUserBooksError);
      throw fetchUserBooksError;
    }

    const diaryLogs = userBooks
      ? userBooks.map((ub: any) => mapUserBookToDiaryLog(ub, user.id))
      : [];

    // Fetch Community Reviews
    const { data: dbReviews, error: reviewsErr } = await dbClient
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

    if (reviewsErr) {
      console.warn("[DEBUG] [user-books] Warning querying community reviews feed:", reviewsErr);
    }

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
    const { data: dbSessions, error: sessionsErr } = await dbClient
      .from("reading_sessions")
      .select(`
        *,
        book:books(title, author_name, cover_url)
      `)
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false });

    if (sessionsErr) {
      console.warn("[DEBUG] [user-books] Warning querying reading sessions:", sessionsErr);
    }

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
    const { data: statsRow, error: statsErr } = await dbClient
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (statsErr) {
      console.warn("[DEBUG] [user-books] Warning querying user stats:", statsErr);
    }

    console.log("[DEBUG] [user-books] POST completed successfully.");
    return NextResponse.json({
      success: true,
      diaryLogs,
      reviews,
      sessions,
      stats: statsRow || null,
    });
  } catch (error: any) {
    console.error("[DEBUG] [user-books] POST API error details:");
    console.error(error);
    console.error(error.stack);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    console.log("[DEBUG] [user-books] Incoming PUT request.");
    const { serviceRoleKey } = verifyEnv();
    const { user, error: authError } = await getRequestUser();

    if (authError || !user) {
      console.error("[DEBUG] [user-books] User authentication check failed:", authError);
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const followId = searchParams.get("followId");

    if (!followId) {
      console.warn("[DEBUG] [user-books] Missing followId parameter.");
      return NextResponse.json({ success: false, error: "Missing followId" }, { status: 400 });
    }

    const dbClient = getSupabaseClient(serviceRoleKey) || createAdminClient();

    // Check if relationship already exists
    const { data: existingFollow, error: followFetchError } = await dbClient
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", followId)
      .maybeSingle();

    if (followFetchError) {
      console.error("[DEBUG] [user-books] Error looking up follow relationship:", followFetchError);
      throw followFetchError;
    }

    if (existingFollow) {
      // Unfollow
      console.log("[DEBUG] [user-books] Deleting follow relationship:", user.id, "unfollowing", followId);
      const { error: deleteError } = await dbClient
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", followId);
      
      if (deleteError) throw deleteError;
      return NextResponse.json({ success: true, followed: false });
    } else {
      // Follow
      console.log("[DEBUG] [user-books] Creating follow relationship:", user.id, "following", followId);
      const { error: insertError } = await dbClient
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: followId,
        });

      if (insertError) throw insertError;
      return NextResponse.json({ success: true, followed: true });
    }
  } catch (error: any) {
    console.error("[DEBUG] [user-books] PUT API error:", error);
    console.error(error.stack);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
