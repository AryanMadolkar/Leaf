import { Book, INITIAL_BOOKS } from "@/data/mockData";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import { coverUrlFromCoverId, withOpenLibraryDefaultFalse } from "@/utils/covers";

export type CatalogShelf =
  | "all-time-greats"
  | "trending"
  | "most-added"
  | "booktok"
  | "award-winners"
  | "modern-classics"
  | "scifi"
  | "fantasy"
  | "literary"
  | "mystery"
  | "romance"
  | "historical"
  | "biography"
  | "nonfiction"
  | "leaderboard";

export function withResolvedCover(book: Book): Book {
  const coverId = COVER_ID_BY_ISBN[book.id];
  if (coverId) {
    return { ...book, coverImage: coverUrlFromCoverId(coverId) };
  }
  return {
    ...book,
    coverImage: withOpenLibraryDefaultFalse(book.coverImage || ""),
  };
}

export function filterBooksByShelf(books: Book[], shelf: CatalogShelf): Book[] {
  switch (shelf) {
    case "all-time-greats":
      return [...books].sort((a, b) => b.averageRating - a.averageRating);
    case "trending":
      return books.filter(
        (b) => b.genres.some((g) => g.toLowerCase().includes("popular")) || b.averageRating >= 4.4
      );
    case "most-added":
      return books.filter(
        (b) => b.genres.some((g) => g.toLowerCase().includes("bestseller")) || b.pages > 450
      );
    case "booktok":
      return books.filter((b) => b.genres.some((g) => g.toLowerCase().includes("booktok")));
    case "award-winners":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("classic")) ||
          b.genres.some((g) => g.toLowerCase().includes("high"))
      );
    case "modern-classics":
      return books.filter(
        (b) => b.genres.some((g) => g.toLowerCase().includes("classic")) && b.year > 1950
      );
    case "scifi":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("sci-fi")) ||
          b.genres.some((g) => g.toLowerCase().includes("space"))
      );
    case "fantasy":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("fantasy")) ||
          b.genres.some((g) => g.toLowerCase().includes("magic"))
      );
    case "literary":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("literary")) ||
          b.genres.some((g) => g.toLowerCase().includes("drama"))
      );
    case "mystery":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("thriller")) ||
          b.genres.some((g) => g.toLowerCase().includes("mystery")) ||
          b.genres.some((g) => g.toLowerCase().includes("crime"))
      );
    case "romance":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("romance")) ||
          b.genres.some((g) => g.toLowerCase().includes("contemporary"))
      );
    case "historical":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("historical")) ||
          b.genres.some((g) => g.toLowerCase().includes("war"))
      );
    case "biography":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("biography")) ||
          b.genres.some((g) => g.toLowerCase().includes("memoir"))
      );
    case "nonfiction":
      return books.filter(
        (b) =>
          b.genres.some((g) => g.toLowerCase().includes("non-fiction")) ||
          b.genres.some((g) => g.toLowerCase().includes("psychology")) ||
          b.genres.some((g) => g.toLowerCase().includes("science"))
      );
    case "leaderboard":
      return [...books].sort((a, b) => b.averageRating - a.averageRating);
    default:
      return books;
  }
}

function preferBooksWithCovers(books: Book[]): Book[] {
  return [...books].sort((a, b) => {
    const aHas = COVER_ID_BY_ISBN[a.id] ? 1 : 0;
    const bHas = COVER_ID_BY_ISBN[b.id] ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return b.averageRating - a.averageRating;
  });
}

export function getCatalogBooks(shelf: CatalogShelf, limit = 15, offset = 0): Book[] {
  const filtered = preferBooksWithCovers(filterBooksByShelf(INITIAL_BOOKS, shelf));
  return filtered.slice(offset, offset + limit).map(withResolvedCover);
}

/** Diverse pool spanning classics, modern favorites, and global voices for daily rotation */
export const FEATURED_POOL_IDS = [
  // Modern favorites & BookTok
  "9781649374046", "9780593321201", "9780385547347", "9781501110368", "9780593135204",
  "9780525559474", "9780062060624", "9780316556345", "9781984822178", "9781501161933",
  "9780735219090", "9781250301697", "9780307588364", "9781984806734", "9781250319126",
  "9781250217288", "9780765387561", "9780525536291", "9780399590504", "9780399588174",
  "9780735211292", "9780062316097", "9781982185824", "9780593318171", "9781984822178",
  // Sci-fi & fantasy essentials
  "9780441172719", "9780590353428", "9780261103573", "9780765326355", "9780553103540",
  "9780765311788", "9780756404079", "9780439023481", "9780345539786", "9780316229296",
  // Literary & contemporary
  "9780140167771", "9780385539250", "9781400078776", "9780735220676", "9780670026197",
  "9780735224292", "9780802124941", "9780593422949", "9780802162177", "9780593534484",
  // Classics & canon
  "9780451524935", "9780743273565", "9780141439518", "9780451526342", "9780060883287",
  "9780385474542", "9780679732760", "9780142437230", "9780140449266", "9780486415871",
  // Mystery & thriller
  "9780307269751", "9780062073488", "9780385504201", "9781594634024", "9780062868930",
  // Romance
  "9781984806758", "9780593336823", "9780593441275", "9780062439598", "9780593336830",
  // Historical & global voices
  "9781476746586", "9781455563920", "9781101947135", "9781400095209", "9780307455928",
  "9780812979657", "9780375703860", "9780593230251", "9781571313560", "9780143127741",
  // Non-fiction
  "9780374275631", "9780307352149", "9780316017923", "9780807014295", "9780812993547",
  // Recent award winners & 2020s hits
  "9780802148040", "9780802156984", "9780385537070", "9780593321447", "9781982168432",
  "9780063250831", "9780063021426", "9781635575637", "9781250317696", "9780062662598",
  "9780593493446", "9780385550369", "9780802163372", "9780374602638", "9780593426213",
];

/** Unique featured IDs that actually exist in the local catalog. */
function getFeaturedPool(): string[] {
  const catalogIds = new Set(INITIAL_BOOKS.map((b) => b.id));
  return [...new Set(FEATURED_POOL_IDS)].filter((id) => catalogIds.has(id));
}

/** Day ordinal (UTC) so consecutive calendar days always advance the index. */
function utcDayOrdinal(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function getFeaturedBookIdForDate(dateKey?: string): string {
  const key = dateKey ?? new Date().toISOString().slice(0, 10);
  const pool = getFeaturedPool();
  if (pool.length === 0) return FEATURED_POOL_IDS[0];
  const index = utcDayOrdinal(key) % pool.length;
  return pool[index];
}

export function getFeaturedBookForDate(dateKey?: string): Book | null {
  const key = dateKey ?? new Date().toISOString().slice(0, 10);
  const pool = getFeaturedPool();
  if (pool.length === 0) {
    const fallback = INITIAL_BOOKS[0];
    return fallback ? withResolvedCover(fallback) : null;
  }

  const start = utcDayOrdinal(key) % pool.length;
  // Walk the pool from today's index so a missing catalog entry never stalls rotation
  for (let i = 0; i < pool.length; i++) {
    const id = pool[(start + i) % pool.length];
    const book = INITIAL_BOOKS.find((b) => b.id === id);
    if (book) return withResolvedCover(book);
  }

  const fallback =
    INITIAL_BOOKS.find((b) => b.averageRating >= 4.4) ?? INITIAL_BOOKS[0] ?? null;
  return fallback ? withResolvedCover(fallback) : null;
}
