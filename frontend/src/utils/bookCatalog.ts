import { Book, INITIAL_BOOKS } from "@/data/mockData";
import { COVER_ID_BY_ISBN } from "@/data/coverOverrides";
import { resolveBookCover } from "@/utils/covers";

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

/** Old procedural generator used 978100–978103 ISBN prefixes. */
export function isFakeBookId(id: string): boolean {
  return /^97810[0-3]/.test(id);
}

export function withResolvedCover(book: Book): Book {
  return {
    ...book,
    coverImage: resolveBookCover(book.id, book.coverImage, "M") || book.coverImage,
  };
}

/** Real catalog entries only — no procedural fakes, must have a known cover. */
function realBooksWithCovers(books: Book[]): Book[] {
  return books.filter((b) => !isFakeBookId(b.id) && COVER_ID_BY_ISBN[b.id]);
}

export function filterBooksByShelf(books: Book[], shelf: CatalogShelf): Book[] {
  switch (shelf) {
    case "all-time-greats":
      return [...books].sort((a, b) => b.averageRating - a.averageRating);
    case "trending":
      // Handled by getTrendingBooksForWeek — keep a broad fallback for direct filter use
      return books.filter(
        (b) => b.year >= 2012 && b.averageRating >= 4.0
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
          b.genres.some((g) => /pulitzer|booker|hugo|nebula|award/i.test(g)) ||
          (b.genres.some((g) => g.toLowerCase().includes("classic")) && b.averageRating >= 4.4)
      );
    case "modern-classics":
      // Handled by curated pool in getCatalogBooks
      return books.filter(
        (b) => b.genres.some((g) => g.toLowerCase().includes("classic")) && b.year >= 1945
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
  return [...realBooksWithCovers(books)].sort((a, b) => b.averageRating - a.averageRating);
}

/** ISO week key, e.g. "2026-W29" — used to rotate trending picks weekly. */

export function getISOWeekKey(dateKey?: string): string {
  const d = dateKey ? new Date(`${dateKey}T12:00:00Z`) : new Date();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function utcWeekOrdinal(weekKey: string): number {
  const [yearStr, weekStr] = weekKey.split("-W");
  return parseInt(yearStr, 10) * 53 + parseInt(weekStr, 10);
}

function getAllTimeGreatsTopIds(count = 25): Set<string> {
  return new Set(
    [...INITIAL_BOOKS]
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, count)
      .map((b) => b.id)
  );
}

/** Modern & buzzy titles — kept separate from the all-time-greats leaderboard. */
export const TRENDING_POOL_IDS = [
  "9781649374046", "9780593321201", "9780385547347", "9781501110368", "9780593135204",
  "9780525559474", "9780062060624", "9780316556345", "9781984822178", "9781501161933",
  "9780735219090", "9781250301697", "9780307588364", "9781984806734", "9781250319126",
  "9781250217288", "9780765387561", "9780525536291", "9780399590504", "9780399588174",
  "9780735211292", "9780062316097", "9781982185824", "9780593318171",
  "9780553103540", "9780765311788", "9780439023481", "9780345539786", "9780316229296",
  "9780735220676", "9780670026197", "9780735224292", "9780802124941", "9780593422949",
  "9780802162177", "9780593534484", "9781984806758", "9780593336823", "9780593441275",
  "9780062439598", "9780593336830", "9781476746586", "9781455563920", "9781101947135",
  "9781400095209", "9780307455928", "9780593230251", "9781571313560", "9780143127741",
  "9780802148040", "9780802156984", "9780385537070", "9780593321447", "9781982168432",
  "9780063250831", "9780063021426", "9781635575637", "9781250317696", "9780062662598",
  "9780593493446", "9780385550369", "9780802163372", "9780374602638", "9780593426213",
];

/** Never surface in Trending This Week (franchise staples live on other shelves). */
const TRENDING_EXCLUDE_IDS = new Set([
  "9780590353428", // Harry Potter and the Sorcerer's Stone
  "9780439064874", // Harry Potter and the Chamber of Secrets
  "9780439136358", // Harry Potter and the Prisoner of Azkaban
]);

function isExcludedFromTrending(book: Book): boolean {
  if (TRENDING_EXCLUDE_IDS.has(book.id)) return true;
  const hay = `${book.title} ${book.author}`.toLowerCase();
  return hay.includes("harry potter") || book.author.toLowerCase().includes("j.k. rowling");
}

function getTrendingPool(): Book[] {
  const catalogById = new Map(INITIAL_BOOKS.map((b) => [b.id, b]));
  const exclude = getAllTimeGreatsTopIds(25);
  const books: Book[] = [];
  const seen = new Set<string>();

  for (const id of TRENDING_POOL_IDS) {
    if (seen.has(id) || exclude.has(id) || TRENDING_EXCLUDE_IDS.has(id) || !COVER_ID_BY_ISBN[id]) continue;
    const book = catalogById.get(id);
    if (!book || isExcludedFromTrending(book)) continue;
    seen.add(id);
    books.push(book);
  }

  return books;
}

/** Weekly-rotating trending shelf — different picks each ISO week, never mirroring all-time greats. */
export function getTrendingBooksForWeek(weekKey?: string, limit = 15, offset = 0): Book[] {
  const key = weekKey ?? getISOWeekKey();
  const pool = getTrendingPool();
  if (pool.length === 0) return [];

  const start = (utcWeekOrdinal(key) * 5) % pool.length;
  const rotated: Book[] = [];
  for (let i = 0; i < pool.length; i++) {
    rotated.push(pool[(start + i) % pool.length]);
  }
  return rotated.slice(offset, offset + limit).map(withResolvedCover);
}

/** Curated post-war / late-20th-century masterpieces with verified covers. */
const MODERN_CLASSICS_POOL_IDS = [
  "9780385474542", // Things Fall Apart
  "9780060883287", // One Hundred Years of Solitude
  "9780307389733", // Love in the Time of Cholera
  "9781400033416", // Beloved
  "9781400033423", // Song of Solomon
  "9780307278449", // The Bluest Eye
  "9780679731726", // The Remains of the Day
  "9781400078776", // Never Let Me Go
  "9780307387899", // The Road
  "9780679728759", // Blood Meridian
  "9780316920049", // Infinite Jest
  "9780375703860", // White Teeth
  "9780684833392", // Catch-22
  "9780812979657", // The God of Small Things
  "9780812976533", // Midnight's Children
  "9780140167771", // The Secret History
  "9780451524935", // 1984
  "9780060850524", // Brave New World
  "9781451673319", // Fahrenheit 451
  "9780060935467", // To Kill a Mockingbird
  "9781559945806", // Slaughterhouse-Five
  "9780795302763", // Cat's Cradle
  "9780385490818", // The Handmaid's Tale
  "9780679723165", // Lolita
  "9780679723424", // Pale Fire
  "9780441172719", // Dune
  "9780441478125", // The Left Hand of Darkness
  "9780807006924", // Kindred
  "9780156027328", // Life of Pi
  "9781594480003", // The Kite Runner
  "9781455563920", // Pachinko
  "9788435021296", // Do Androids Dream of Electric Sheep?
];

function getModernClassicsBooks(limit = 15, offset = 0): Book[] {
  const catalogById = new Map(INITIAL_BOOKS.map((b) => [b.id, b]));
  const books: Book[] = [];
  const seen = new Set<string>();
  for (const id of MODERN_CLASSICS_POOL_IDS) {
    if (seen.has(id) || isFakeBookId(id) || !COVER_ID_BY_ISBN[id]) continue;
    const book = catalogById.get(id);
    if (!book) continue;
    seen.add(id);
    books.push(book);
  }
  return books.slice(offset, offset + limit).map(withResolvedCover);
}

export function getCatalogBooks(shelf: CatalogShelf, limit = 15, offset = 0, weekKey?: string): Book[] {
  if (shelf === "trending") {
    return getTrendingBooksForWeek(weekKey, limit, offset);
  }
  if (shelf === "modern-classics") {
    return getModernClassicsBooks(limit, offset);
  }
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
