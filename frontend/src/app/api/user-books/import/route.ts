import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { recalculateUserStats } from "@/utils/supabaseStats";
import { getBookById, ensureBookRow } from "@/utils/booksApi";
import { mapUserBookToDiaryLog } from "@/utils/diaryLogs";
import type { Book } from "@/data/mockData";

export const runtime = "nodejs";

const MAX_IMPORT = 500;

type ImportStatus = "Want to Read" | "Currently Reading" | "Finished";

interface ImportItem {
  bookId: string;
  status: ImportStatus;
  rating?: number;
  review?: string;
  title?: string;
  author?: string;
  coverImage?: string;
  pages?: number;
  year?: number;
  genres?: string[];
  description?: string;
}

function mapStatus(status: ImportStatus): "want_to_read" | "reading" | "finished" {
  if (status === "Want to Read") return "want_to_read";
  if (status === "Currently Reading") return "reading";
  return "finished";
}

async function ensureProfile(db: ReturnType<typeof createAdminClient>, user: { id: string; email?: string | null }) {
  const { data: existing } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing?.id) return;
  await db.from("profiles").insert({
    id: user.id,
    username: user.email?.split("@")[0] || `user_${crypto.randomUUID().slice(0, 8)}`,
    display_name: "Reader",
    email: user.email || null,
    avatar_url: "",
    onboarding_completed: true,
  });
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const items: ImportItem[] = Array.isArray(body?.books) ? body.books : [];
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "No books to import" }, { status: 400 });
    }
    if (items.length > MAX_IMPORT) {
      return NextResponse.json(
        { success: false, error: `Import limited to ${MAX_IMPORT} books per request` },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    await ensureProfile(db, user);

    const today = new Date().toISOString().split("T")[0];
    let imported = 0;
    let updated = 0;
    const errors: Array<{ bookId: string; error: string }> = [];

    for (const item of items) {
      if (!item?.bookId || !item?.status) {
        errors.push({ bookId: item?.bookId || "?", error: "Missing bookId or status" });
        continue;
      }

      try {
        let book = await getBookById(item.bookId);
        if (!book && item.title) {
          book = {
            id: item.bookId,
            title: item.title,
            author: item.author || "Unknown Author",
            year: item.year || 2000,
            description: item.description || `${item.title} by ${item.author || "Unknown Author"}`,
            coverImage: item.coverImage || "",
            averageRating: 4.0,
            genres: item.genres || ["Fiction"],
            pages: item.pages || 300,
          } satisfies Book;
        }
        if (!book) {
          errors.push({ bookId: item.bookId, error: "Book not found" });
          continue;
        }

        const resolvedBookId = await ensureBookRow(book);
        const mappedStatus = mapStatus(item.status);
        const totalPages = book.pages || 300;
        const rating =
          typeof item.rating === "number" && item.rating > 0 ? Math.min(5, item.rating) : null;
        const review = item.review?.trim() || null;

        const { data: existing } = await db
          .from("user_books")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("book_id", resolvedBookId)
          .maybeSingle();

        const payload: Record<string, unknown> = {
          status: mappedStatus,
          rating,
          review,
          finished_at: mappedStatus === "finished" ? today : null,
          current_page: mappedStatus === "finished" ? totalPages : 0,
        };
        if (mappedStatus === "reading") {
          payload.started_at = today;
        }

        if (existing?.id) {
          const { error } = await db.from("user_books").update(payload).eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await db.from("user_books").insert({
            id: crypto.randomUUID(),
            user_id: user.id,
            book_id: resolvedBookId,
            ...payload,
            started_at: mappedStatus === "reading" ? today : null,
            created_at: new Date().toISOString(),
          });
          if (error) throw error;
          imported++;
        }

        if (mappedStatus === "finished" && review) {
          const { data: existingReview } = await db
            .from("reviews")
            .select("id")
            .eq("user_id", user.id)
            .eq("book_id", resolvedBookId)
            .maybeSingle();
          if (existingReview?.id) {
            await db
              .from("reviews")
              .update({ rating: rating ?? 5, review_text: review })
              .eq("id", existingReview.id);
          } else {
            await db.from("reviews").insert({
              id: crypto.randomUUID(),
              user_id: user.id,
              book_id: resolvedBookId,
              rating: rating ?? 5,
              review_text: review,
              likes_count: 0,
              created_at: new Date().toISOString(),
            });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Import failed";
        errors.push({ bookId: item.bookId, error: message });
      }
    }

    await recalculateUserStats(db, user.id);

    const { data: userBooks } = await db
      .from("user_books")
      .select(
        `
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
      `
      )
      .eq("user_id", user.id);

    const diaryLogs = (userBooks || []).map((ub: any) => mapUserBookToDiaryLog(ub, user.id));

    return NextResponse.json({
      success: true,
      imported,
      updated,
      errors,
      diaryLogs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[user-books/import]", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
