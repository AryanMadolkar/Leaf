import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { recalculateUserStats } from "@/utils/supabaseStats";
import { getBookById, ensureBookRow } from "@/utils/booksApi";
import { mapUserBookToDiaryLog } from "@/utils/diaryLogs";
import { addBooksToCollectionShelf } from "@/utils/library";
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

function bookFromImportItem(item: ImportItem): Book | null {
  if (!item.title?.trim()) return null;
  return {
    id: item.bookId,
    title: item.title.trim(),
    author: item.author?.trim() || "Unknown Author",
    year: item.year || 2000,
    description:
      item.description || `${item.title.trim()} by ${item.author?.trim() || "Unknown Author"}`,
    coverImage: item.coverImage || "",
    averageRating: 4.0,
    genres: item.genres?.length ? item.genres : ["Fiction"],
    pages: item.pages || 300,
  };
}

function cleanBookId(id: string): string {
  return id.replace(/^\/works\//, "");
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

/** Slow path: one book at a time (used when metadata is missing). */
async function importOneBook(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  item: ImportItem,
  today: string
): Promise<{ imported: boolean; updated: boolean; bookId: string }> {
  let book = bookFromImportItem(item);
  if (!book) {
    book = await getBookById(item.bookId);
  }
  if (!book) {
    throw new Error("Book not found");
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
    .eq("user_id", userId)
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
  } else {
    const { error } = await db.from("user_books").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      book_id: resolvedBookId,
      ...payload,
      started_at: mappedStatus === "reading" ? today : null,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  if (mappedStatus === "finished" && review) {
    const { data: existingReview } = await db
      .from("reviews")
      .select("id")
      .eq("user_id", userId)
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
        user_id: userId,
        book_id: resolvedBookId,
        rating: rating ?? 5,
        review_text: review,
        likes_count: 0,
        created_at: new Date().toISOString(),
      });
    }
  }

  return { imported: !existing?.id, updated: !!existing?.id, bookId: resolvedBookId };
}

/** Fast path for shelf scan: batch upsert books + user_books, no Open Library, no blocking stats. */
async function importLiteBatch(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  items: ImportItem[],
  today: string
): Promise<{ imported: number; updated: number; errors: Array<{ bookId: string; error: string }> }> {
  const errors: Array<{ bookId: string; error: string }> = [];
  const prepared: Array<{
    bookId: string;
    status: ReturnType<typeof mapStatus>;
    book: Book;
    rating: number | null;
    review: string | null;
  }> = [];

  for (const item of items) {
    if (!item?.bookId || !item?.status) {
      errors.push({ bookId: item?.bookId || "?", error: "Missing bookId or status" });
      continue;
    }
    const book = bookFromImportItem(item);
    if (!book) {
      errors.push({ bookId: item.bookId, error: "Missing book metadata" });
      continue;
    }
    prepared.push({
      bookId: cleanBookId(item.bookId),
      status: mapStatus(item.status),
      book: { ...book, id: cleanBookId(item.bookId) },
      rating:
        typeof item.rating === "number" && item.rating > 0 ? Math.min(5, item.rating) : null,
      review: item.review?.trim() || null,
    });
  }

  if (prepared.length === 0) {
    return { imported: 0, updated: 0, errors };
  }

  const bookRows = prepared.map(({ book }) => {
    const id = cleanBookId(book.id);
    const openLibraryKey = /^OL/i.test(id) ? `/works/${id}` : null;
    return {
      id,
      open_library_key: openLibraryKey,
      title: book.title || "Untitled",
      author_name: book.author || "Unknown Author",
      cover_url: book.coverImage || null,
      page_count: book.pages || 300,
      description: book.description || null,
      first_publish_year: book.year || null,
      subjects: JSON.stringify(book.genres || ["Fiction"]),
      language: "eng",
    };
  });

  const { error: booksError } = await db.from("books").upsert(bookRows, { onConflict: "id" });
  if (booksError) {
    throw new Error(`Could not save books: ${booksError.message}`);
  }

  const bookIds = prepared.map((p) => p.bookId);
  const { data: existingRows } = await db
    .from("user_books")
    .select("id, book_id")
    .eq("user_id", userId)
    .in("book_id", bookIds);

  const existingByBookId = new Map(
    (existingRows || []).map((row: { id: string; book_id: string }) => [row.book_id, row.id])
  );

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Array<{ id: string; payload: Record<string, unknown> }> = [];

  for (const item of prepared) {
    const payload: Record<string, unknown> = {
      status: item.status,
      rating: item.rating,
      review: item.review,
      finished_at: item.status === "finished" ? today : null,
      current_page: item.status === "finished" ? item.book.pages || 300 : 0,
    };
    if (item.status === "reading") {
      payload.started_at = today;
    }

    const existingId = existingByBookId.get(item.bookId);
    if (existingId) {
      toUpdate.push({ id: existingId, payload });
    } else {
      toInsert.push({
        id: crypto.randomUUID(),
        user_id: userId,
        book_id: item.bookId,
        ...payload,
        started_at: item.status === "reading" ? today : null,
        created_at: new Date().toISOString(),
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await db.from("user_books").insert(toInsert);
    if (error) throw new Error(`Could not import books: ${error.message}`);
  }

  if (toUpdate.length > 0) {
    // Parallel updates — still one round-trip each, but no Open Library / stats.
    const results = await Promise.all(
      toUpdate.map(({ id, payload }) => db.from("user_books").update(payload).eq("id", id))
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(`Could not update books: ${failed.error.message}`);
  }

  await addBooksToCollectionShelf(
    userId,
    prepared.map((p) => p.bookId),
  );

  return {
    imported: toInsert.length,
    updated: toUpdate.length,
    errors,
  };
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

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

    const lite = body?.lite === true || body?.includeDiaryLogs === false;
    const db = createAdminClient();
    await ensureProfile(db, user);

    const today = new Date().toISOString().split("T")[0];

    if (lite && items.every((item) => item?.title?.trim())) {
      const { imported, updated, errors } = await importLiteBatch(db, userId, items, today);
      // Don't block the client on heavy stats recalculation.
      void recalculateUserStats(db, userId);
      return NextResponse.json({
        success: true,
        imported,
        updated,
        errors,
      });
    }

    let imported = 0;
    let updated = 0;
    const errors: Array<{ bookId: string; error: string }> = [];
    const resolvedIds: string[] = [];

    const CONCURRENCY = 6;
    let cursor = 0;

    async function worker() {
      while (cursor < items.length) {
        const index = cursor++;
        const item = items[index];
        if (!item?.bookId || !item?.status) {
          errors.push({ bookId: item?.bookId || "?", error: "Missing bookId or status" });
          continue;
        }
        try {
          const result = await importOneBook(db, userId, item, today);
          if (result.imported) imported++;
          if (result.updated) updated++;
          resolvedIds.push(result.bookId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Import failed";
          errors.push({ bookId: item.bookId, error: message });
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker())
    );

    await addBooksToCollectionShelf(userId, resolvedIds);
    await recalculateUserStats(db, userId);

    if (lite) {
      return NextResponse.json({
        success: true,
        imported,
        updated,
        errors,
      });
    }

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
      .eq("user_id", userId);

    const diaryLogs = (userBooks || []).map((ub: any) => mapUserBookToDiaryLog(ub, userId));

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
