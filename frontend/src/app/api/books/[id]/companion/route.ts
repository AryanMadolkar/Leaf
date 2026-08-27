import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureBookRow, getBookById } from "@/utils/booksApi";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookParam } = await context.params;
    const book = await getBookById(bookParam);
    if (!book) {
      return NextResponse.json({ success: false, error: "Book not found" }, { status: 404 });
    }
    const bookId = await ensureBookRow(book);

    const db = createAdminClient();
    const { data, error } = await db
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    return NextResponse.json({ success: true, conversations: data || [], bookId });
  } catch (err: any) {
    console.error("[companion] GET", err);
    return NextResponse.json({ success: false, error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookParam } = await context.params;
    const book = await getBookById(bookParam);
    if (!book) {
      return NextResponse.json({ success: false, error: "Book not found" }, { status: 404 });
    }
    const bookId = await ensureBookRow(book);
    const body = await request.json().catch(() => ({}));
    const page = body.page != null ? Number(body.page) : null;
    const chapter = typeof body.chapter === "string" ? body.chapter.trim() : null;

    const db = createAdminClient();
    const { data, error } = await db
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        book_id: bookId,
        reading_position: { page, chapter },
        messages: [],
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, conversation: data });
  } catch (err: any) {
    console.error("[companion] POST", err);
    return NextResponse.json({ success: false, error: err.message || "Failed" }, { status: 500 });
  }
}
