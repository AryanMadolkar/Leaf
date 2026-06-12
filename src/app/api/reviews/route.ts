import { NextResponse } from "next/server";
import { getDatabase } from "@/utils/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reviewId, action } = body; // action: 'like' or 'unlike'

    if (!reviewId) {
      return NextResponse.json({ success: false, error: "Missing reviewId" }, { status: 400 });
    }

    const db = getDatabase();

    const existing = db.prepare("SELECT likes_count FROM user_books WHERE id = ?").get(reviewId) as { likes_count: number } | undefined;
    if (!existing) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    let newLikes = existing.likes_count;
    if (action === "like") {
      newLikes += 1;
    } else if (action === "unlike") {
      newLikes = Math.max(0, newLikes - 1);
    }

    db.prepare("UPDATE user_books SET likes_count = ? WHERE id = ?").run(newLikes, reviewId);

    return NextResponse.json({ success: true, likesCount: newLikes });
  } catch (error: any) {
    console.error("Reviews toggle like API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
