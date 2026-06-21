import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { mapDbBookToClientBook } from "@/utils/booksApi";
import { INITIAL_BOOKS } from "@/data/mockData";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch or dynamically create User Profile
    let profile = null;
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[DEBUG] [init] Error fetching profile:", profileError);
    }

    if (!existingProfile) {
      console.log("[DEBUG] [init] Profile not found for authenticated user. Creating fallback profile.");
      const fallbackProfile = {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split("@")[0] || `user_${crypto.randomUUID().slice(0, 8)}`,
        display_name: user.user_metadata?.display_name || user.user_metadata?.name || "Reader",
        avatar_url: '',
        onboarding_completed: false,
      };

      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .insert(fallbackProfile)
        .select()
        .maybeSingle();

      if (insertError) {
        console.error("[DEBUG] [init] Failed to insert fallback profile:", insertError);
      } else {
        profile = insertedProfile;
        console.log("[DEBUG] [init] Fallback profile created successfully:", profile);
      }
    } else {
      profile = existingProfile;
    }

    if (profile) {
      profile.email = user.email || (profile as any).email || "";
      profile.created_at = (profile as any).created_at || (profile as any).joined_at || user.created_at || new Date().toISOString();
    }

    // 2. Fetch or dynamically create User Stats
    let stats = null;
    const { data: existingStats, error: statsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (statsError) {
      console.error("[DEBUG] [init] Error fetching stats:", statsError);
    }

    if (!existingStats && profile) {
      console.log("[DEBUG] [init] Stats row not found for user. Creating default stats row.");
      const { data: insertedStats, error: insertStatsError } = await supabase
        .from("user_stats")
        .insert({ user_id: user.id })
        .select()
        .maybeSingle();

      if (insertStatsError) {
        console.error("[DEBUG] [init] Failed to insert default stats:", insertStatsError);
      } else {
        stats = insertedStats;
        console.log("[DEBUG] [init] Default stats row created successfully:", stats);
      }
    } else {
      stats = existingStats;
    }

    // 3. Fetch User Library (user_books joined with cached books)
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

    // Gather list of cached books in system
    const { data: dbBooks } = await supabase
      .from("books")
      .select("*");

    const dbBooksMapped = dbBooks ? dbBooks.map((b: any) => mapDbBookToClientBook(b)) : [];

    // Merge database books with INITIAL_BOOKS to ensure all 500 books are available
    const booksMap = new Map<string, any>();
    INITIAL_BOOKS.forEach((b: any) => {
      booksMap.set(b.id, b);
    });
    dbBooksMapped.forEach((b: any) => {
      booksMap.set(b.id, b);
    });
    const books = Array.from(booksMap.values());

    // 4. Fetch Community Reviews (join profiles & books)
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
        
        // Feed bindings
        reviewerName: r.profile?.display_name || "Reader",
        reviewerAvatar: r.profile?.avatar_url || "",
        reviewerUsername: r.profile?.username || "reader",
        bookTitle: r.book?.title || "",
        bookAuthor: r.book?.author_name || "",
        bookCover: r.book?.cover_url || "",
      };
    }) : [];

    // 5. Fetch User Reading Sessions
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

    return NextResponse.json({
      success: true,
      profile,
      stats,
      books,
      diaryLogs,
      reviews,
      sessions,
    });
  } catch (error: any) {
    console.error("Supabase initial data fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
