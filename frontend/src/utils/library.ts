import { createAdminClient } from "@/utils/supabase/admin";
import { mapDbBookToClientBook } from "@/utils/booksApi";
import type { Book } from "@/data/mockData";

export type LibraryTheme =
  | "walnut"
  | "oak"
  | "dark"
  | "minimal"
  | "modern"
  | "vintage";

export type LibraryPrivacy = "public" | "friends" | "private";
export type LibraryViewMode = "bookshelf" | "covers" | "compact";

export type LibraryShelf = {
  id: string;
  name: string;
  slug: string;
  note: string;
  position: number;
  isFavorites: boolean;
  isSystem: boolean;
  systemKey: string | null;
  bookIds: string[];
};

export type LibrarySettings = {
  theme: LibraryTheme;
  privacy: LibraryPrivacy;
  viewMode: LibraryViewMode;
};

export type LibraryPayload = {
  settings: LibrarySettings;
  shelves: LibraryShelf[];
  /** Flat display order for the continuous bookshelf */
  collectionOrder: string[];
  favoriteIds: string[];
  collectionShelfId: string | null;
  favoritesShelfId: string | null;
  books: Book[];
  stats: {
    books: number;
    authors: number;
    pages: number;
    genres: number;
    years: number;
  };
};

const DEFAULT_SHELVES: Array<{
  name: string;
  slug: string;
  systemKey: string;
  isFavorites?: boolean;
  note: string;
}> = [
  {
    name: "Favorites",
    slug: "favorites",
    systemKey: "favorites",
    isFavorites: true,
    note: "Pinned to the front of your collection.",
  },
  {
    name: "Collection",
    slug: "collection",
    systemKey: "collection",
    note: "Your continuous home library.",
  },
];

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `shelf-${Date.now().toString(36)}`;
}

export async function ensureLibraryForUser(userId: string) {
  const admin = createAdminClient();

  let { data: settings } = await admin
    .from("library_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings) {
    const { data: inserted, error } = await admin
      .from("library_settings")
      .insert({ user_id: userId })
      .select()
      .maybeSingle();
    if (error) throw error;
    settings = inserted;
  }

  const { data: existingShelves } = await admin
    .from("library_shelves")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  let shelves = existingShelves || [];

  // Ensure favorites + collection exist (continuous bookshelf model)
  const hasFavorites = shelves.some((s: any) => s.system_key === "favorites" || s.is_favorites);
  const hasCollection = shelves.some(
    (s: any) => s.system_key === "collection" || s.slug === "collection",
  );

  if (!hasFavorites) {
    await admin.from("library_shelves").insert({
      user_id: userId,
      name: "Favorites",
      slug: "favorites",
      note: "Pinned to the front of your collection.",
      position: 0,
      is_favorites: true,
      is_system: true,
      system_key: "favorites",
    });
  }
  if (!hasCollection) {
    // Prefer system_key=collection when allowed; fall back to slug-only if CHECK blocks it
    const collectionRow = {
      user_id: userId,
      name: "Collection",
      slug: "collection",
      note: "Your continuous home library.",
      position: 1,
      is_favorites: false,
      is_system: true,
      system_key: "collection" as string | null,
    };
    let { error: collErr } = await admin.from("library_shelves").insert(collectionRow);
    if (collErr) {
      collectionRow.system_key = null;
      const retry = await admin.from("library_shelves").insert(collectionRow);
      if (retry.error) throw retry.error;
    }
  }

  if (!existingShelves || existingShelves.length === 0) {
    // Seed collection from user_books
    const { data: userBooks } = await admin
      .from("user_books")
      .select("book_id")
      .eq("user_id", userId);

    const { data: refreshed } = await admin
      .from("library_shelves")
      .select("id, system_key, slug")
      .eq("user_id", userId);
    shelves = refreshed || [];
    const collectionId = shelves.find(
      (s: any) => s.system_key === "collection" || s.slug === "collection",
    )?.id;
    if (collectionId && userBooks?.length) {
      const membership = userBooks
        .filter((ub: any) => ub.book_id)
        .map((ub: any, i: number) => ({
          shelf_id: collectionId,
          book_id: ub.book_id,
          position: i,
        }));
      await admin.from("library_shelf_books").upsert(membership, {
        onConflict: "shelf_id,book_id",
        ignoreDuplicates: true,
      });
    }
  } else if (!hasCollection) {
    // Migrate legacy multi-shelf libraries into one collection order
    const { data: refreshed } = await admin
      .from("library_shelves")
      .select("id, system_key, slug, is_favorites")
      .eq("user_id", userId);
    shelves = refreshed || [];
    const collectionId = shelves.find(
      (s: any) => s.system_key === "collection" || s.slug === "collection",
    )?.id;
    const shelfIds = shelves.map((s: any) => s.id);
    const { data: allMembership } = await admin
      .from("library_shelf_books")
      .select("shelf_id, book_id, position")
      .in("shelf_id", shelfIds)
      .order("position", { ascending: true });

    const seen = new Set<string>();
    const order: string[] = [];
    for (const row of allMembership || []) {
      if (!row.book_id || seen.has(row.book_id)) continue;
      seen.add(row.book_id);
      order.push(row.book_id);
    }

    // Also pull any user_books not yet on a shelf
    const { data: userBooks } = await admin
      .from("user_books")
      .select("book_id")
      .eq("user_id", userId);
    for (const ub of userBooks || []) {
      if (ub.book_id && !seen.has(ub.book_id)) {
        seen.add(ub.book_id);
        order.push(ub.book_id);
      }
    }

    if (collectionId && order.length) {
      await admin.from("library_shelf_books").upsert(
        order.map((book_id, position) => ({ shelf_id: collectionId, book_id, position })),
        { onConflict: "shelf_id,book_id" },
      );
    }
  }

  return settings;
}

export async function fetchLibraryPayload(userId: string): Promise<LibraryPayload> {
  const admin = createAdminClient();
  await ensureLibraryForUser(userId);

  const [{ data: settings }, { data: shelves }] = await Promise.all([
    admin.from("library_settings").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("library_shelves")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
  ]);

  const shelfIds = (shelves || []).map((s: any) => s.id);
  let shelfBooks: any[] = [];
  if (shelfIds.length) {
    const { data } = await admin
      .from("library_shelf_books")
      .select("shelf_id, book_id, position")
      .in("shelf_id", shelfIds)
      .order("position", { ascending: true });
    shelfBooks = data || [];
  }

  const bookIds = Array.from(new Set(shelfBooks.map((sb) => sb.book_id).filter(Boolean)));
  let books: Book[] = [];
  if (bookIds.length) {
    const { data: dbBooks } = await admin.from("books").select("*").in("id", bookIds);
    books = (dbBooks || []).map((b: any) => mapDbBookToClientBook(b));
  }

  const booksByShelf = new Map<string, string[]>();
  for (const sb of shelfBooks) {
    const list = booksByShelf.get(sb.shelf_id) || [];
    list.push(sb.book_id);
    booksByShelf.set(sb.shelf_id, list);
  }

  const mappedShelves: LibraryShelf[] = (shelves || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    note: s.note || "",
    position: s.position,
    isFavorites: Boolean(s.is_favorites),
    isSystem: Boolean(s.is_system),
    systemKey: s.system_key || null,
    bookIds: booksByShelf.get(s.id) || [],
  }));

  const favoritesShelf = mappedShelves.find((s) => s.isFavorites || s.systemKey === "favorites");
  const collectionShelf = mappedShelves.find(
    (s) => s.systemKey === "collection" || s.slug === "collection",
  );
  const favoriteIds = favoritesShelf?.bookIds || [];

  // Collection shelf is the physical order. Favorites are pins/stars only.
  const seen = new Set<string>();
  const collectionOrder: string[] = [];
  for (const id of collectionShelf?.bookIds || []) {
    if (!seen.has(id)) {
      seen.add(id);
      collectionOrder.push(id);
    }
  }
  // If collection is empty (legacy), flatten other shelves once
  if (!collectionOrder.length) {
    for (const s of mappedShelves) {
      if (s.systemKey === "favorites") continue;
      for (const id of s.bookIds) {
        if (!seen.has(id)) {
          seen.add(id);
          collectionOrder.push(id);
        }
      }
    }
  }
  for (const id of favoriteIds) {
    if (!seen.has(id)) {
      seen.add(id);
      collectionOrder.push(id);
    }
  }
  for (const b of books) {
    if (!seen.has(b.id)) {
      seen.add(b.id);
      collectionOrder.push(b.id);
    }
  }

  const authors = new Set(books.map((b) => b.author).filter(Boolean));
  const genres = new Set(books.flatMap((b) => b.genres || []));
  const years = new Set(books.map((b) => b.year).filter((y) => y && y > 0));
  const pages = books.reduce((sum, b) => sum + (b.pages || 0), 0);

  return {
    settings: {
      theme: (settings?.theme as LibraryTheme) || "walnut",
      privacy: (settings?.privacy as LibraryPrivacy) || "public",
      viewMode: (settings?.view_mode as LibraryViewMode) || "bookshelf",
    },
    shelves: mappedShelves,
    collectionOrder,
    favoriteIds,
    collectionShelfId: collectionShelf?.id || null,
    favoritesShelfId: favoritesShelf?.id || null,
    books,
    stats: {
      books: books.length,
      authors: authors.size,
      pages,
      genres: genres.size,
      years: years.size,
    },
  };
}

export { slugify };
