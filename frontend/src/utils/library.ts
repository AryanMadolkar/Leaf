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
    note: "Books that changed how I think.",
  },
  {
    name: "Currently Reading",
    slug: "currently-reading",
    systemKey: "reading",
    note: "Open on the nightstand.",
  },
  {
    name: "Want to Read",
    slug: "want-to-read",
    systemKey: "want_to_read",
    note: "Waiting their turn on the shelf.",
  },
  {
    name: "Finished",
    slug: "finished",
    systemKey: "finished",
    note: "Stories I've lived through.",
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

  if (!existingShelves || existingShelves.length === 0) {
    const rows = DEFAULT_SHELVES.map((s, i) => ({
      user_id: userId,
      name: s.name,
      slug: s.slug,
      note: s.note,
      position: i,
      is_favorites: Boolean(s.isFavorites),
      is_system: true,
      system_key: s.systemKey,
    }));
    const { error } = await admin.from("library_shelves").insert(rows);
    if (error) throw error;

    // Seed shelf membership from existing user_books statuses
    const { data: userBooks } = await admin
      .from("user_books")
      .select("book_id, status")
      .eq("user_id", userId);

    const { data: shelves } = await admin
      .from("library_shelves")
      .select("id, system_key")
      .eq("user_id", userId);

    const byKey = new Map((shelves || []).map((s: any) => [s.system_key, s.id]));
    const membership: any[] = [];
    const counters: Record<string, number> = {};

    for (const ub of userBooks || []) {
      let key = "finished";
      if (ub.status === "reading") key = "reading";
      else if (ub.status === "want_to_read") key = "want_to_read";
      const shelfId = byKey.get(key);
      if (!shelfId || !ub.book_id) continue;
      const pos = counters[shelfId] || 0;
      counters[shelfId] = pos + 1;
      membership.push({ shelf_id: shelfId, book_id: ub.book_id, position: pos });
    }

    if (membership.length) {
      await admin.from("library_shelf_books").upsert(membership, {
        onConflict: "shelf_id,book_id",
        ignoreDuplicates: true,
      });
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
