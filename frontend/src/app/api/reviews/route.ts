import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
