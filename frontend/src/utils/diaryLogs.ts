import type { ReadingLog } from "@/data/mockData";
import { resolveBookCover } from "@/utils/covers";

/** Map a user_books row (with optional books join) into a client ReadingLog. */
export function mapUserBookToDiaryLog(ub: any, userId: string): ReadingLog {
  let clientStatus: ReadingLog["status"] = "Finished";
  if (ub.status === "want_to_read") clientStatus = "Want to Read";
  else if (ub.status === "reading") clientStatus = "Currently Reading";
  else if (ub.status === "did_not_finish") clientStatus = "Did Not Finish";
  else if (ub.status === "finished") clientStatus = "Finished";

  const dateStr = ub.finished_at || ub.started_at || ub.created_at || new Date().toISOString();
  const dateLogged = String(dateStr).includes("T") ? String(dateStr).split("T")[0] : String(dateStr);

  const book = ub.book && !Array.isArray(ub.book) ? ub.book : Array.isArray(ub.book) ? ub.book[0] : null;
  const bookId = ub.book_id || book?.id || "";
  const rawCover = book?.cover_url || undefined;

  return {
    id: ub.id,
    userId,
    bookId,
    status: clientStatus,
    dateLogged,
    rating: ub.rating !== null && ub.rating !== undefined ? Number(ub.rating) : undefined,
    currentPage: ub.current_page || 0,
    review: ub.review || undefined,
    bookTitle: book?.title || undefined,
    bookAuthor: book?.author_name || undefined,
    bookCover: resolveBookCover(bookId, rawCover, "M") || rawCover,
  };
}
