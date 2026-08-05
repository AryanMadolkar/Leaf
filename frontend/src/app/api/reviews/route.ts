import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getRequestUser } from "@/utils/auth/getRequestUser";

function mapReview(r: any) {
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
    rating: Number(r.rating) || 0,
    content: r.review_text || "",
    dateString,
    createdAt: r.created_at,
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
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
    const bookId = searchParams.get("bookId")?.trim() || "";

    let query = supabase
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
      .limit(limit);

    if (bookId) {
      query = query.eq("book_id", bookId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      reviews: (data || []).map(mapReview),
    });
  } catch (error: any) {
    console.error("Reviews list API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const { user, error: authError } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, action } = body; // action: 'like' or 'unlike'

    if (!reviewId) {
      return NextResponse.json({ success: false, error: "Missing reviewId" }, { status: 400 });
    }

    // Fetch review to get current likes count
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("likes_count")
      .eq("id", reviewId)
      .maybeSingle();

    if (fetchError || !review) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    let newLikes = review.likes_count || 0;
    if (action === "like") {
      newLikes += 1;
    } else if (action === "unlike") {
      newLikes = Math.max(0, newLikes - 1);
    }

    // Update review likes count
    const { error: updateError } = await supabase
      .from("reviews")
      .update({ likes_count: newLikes })
      .eq("id", reviewId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, likesCount: newLikes });
  } catch (error: any) {
    console.error("Reviews toggle like API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
