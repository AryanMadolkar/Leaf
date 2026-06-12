import crypto from "crypto";
import { getDatabase } from "./db";
import { Book } from "@/data/mockData";

export interface NormalizedBook {
  id: string;
  open_library_key: string;
  isbn_10?: string | null;
  isbn_13?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  author_name?: string | null;
  author_key?: string | null;
  first_publish_year?: number | null;
  page_count?: number | null;
  language?: string | null;
  cover_url?: string | null;
  subjects?: string[] | null;
}

// Map database record + ratings to client Book structure
export function mapDbBookToClientBook(dbBook: any): Book {
  const db = getDatabase();
  
  // Calculate average rating dynamically from reviews/logs
  const ratingRow = db
    .prepare("SELECT AVG(rating) as avg, COUNT(rating) as count FROM user_books WHERE book_id = ? AND rating IS NOT NULL")
    .get(dbBook.id) as { avg: number | null; count: number };

  let averageRating = 4.0;
  if (ratingRow && ratingRow.count > 0 && ratingRow.avg !== null) {
    averageRating = parseFloat(ratingRow.avg.toFixed(1));
  } else {
    // Stable hash fallback based on title to keep mock data ratings consistent
    let ratingHash = 0;
    const title = dbBook.title || "";
    for (let i = 0; i < title.length; i++) {
      ratingHash += title.charCodeAt(i);
    }
    averageRating = 3.6 + (ratingHash % 13) / 10;
    averageRating = parseFloat(averageRating.toFixed(1));
  }

  let genres: string[] = ["Fiction"];
  if (dbBook.subjects) {
    try {
      genres = JSON.parse(dbBook.subjects);
      if (!Array.isArray(genres) || genres.length === 0) {
        genres = ["Fiction"];
      } else {
        // limit to 4 genres
        genres = genres.slice(0, 4);
      }
    } catch (e) {
      genres = ["Fiction"];
    }
  }

  return {
    id: dbBook.id,
    title: dbBook.title,
    author: dbBook.author_name || "Unknown Author",
    year: dbBook.first_publish_year || 2000,
    description: dbBook.description || "No description available.",
    coverImage: dbBook.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
    averageRating,
    genres,
    pages: dbBook.page_count || 300,
  };
}

// Fetch Author Details and cache in database
export async function getOrFetchAuthor(authorKey: string): Promise<{ name: string; bio?: string; photo_url?: string } | null> {
  const db = getDatabase();
  const cleanKey = authorKey.startsWith("/authors/") ? authorKey : `/authors/${authorKey}`;

  // Check database first
  const existing = db.prepare("SELECT * FROM authors WHERE open_library_author_key = ?").get(cleanKey) as any;
  if (existing) {
    return { name: existing.name, bio: existing.bio || undefined, photo_url: existing.photo_url || undefined };
  }

  // Fetch from Open Library
  try {
    const res = await fetch(`https://openlibrary.org${cleanKey}.json`);
    if (!res.ok) return null;

    const data = await res.json();
    const name = data.name;
    if (!name) return null;

    let bio = "";
    if (data.bio) {
      if (typeof data.bio === "string") {
        bio = data.bio;
      } else if (data.bio.value) {
        bio = data.bio.value;
      }
    }

    const photoUrl = data.photos?.[0] 
      ? `https://covers.openlibrary.org/a/id/${data.photos[0]}-L.jpg` 
      : undefined;

    // Save in DB
    db.prepare(`
      INSERT OR IGNORE INTO authors (id, open_library_author_key, name, bio, photo_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), cleanKey, name, bio || null, photoUrl || null);

    return { name, bio, photo_url: photoUrl };
  } catch (err) {
    console.error(`Error fetching author details for ${cleanKey}:`, err);
    return null;
  }
}

// Save a normalized book record to database
export function saveBookToDatabase(book: Omit<NormalizedBook, "id">): string {
  const db = getDatabase();

  // If already exists by open_library_key
  if (book.open_library_key) {
    const existing = db.prepare("SELECT id FROM books WHERE open_library_key = ?").get(book.open_library_key) as { id: string };
    if (existing) {
      // Update metadata (to refresh)
      db.prepare(`
        UPDATE books SET
          isbn_10 = COALESCE(?, isbn_10),
          isbn_13 = COALESCE(?, isbn_13),
          title = ?,
          subtitle = ?,
          description = ?,
          author_name = ?,
          author_key = ?,
          first_publish_year = ?,
          page_count = ?,
          language = ?,
          cover_url = ?,
          subjects = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        book.isbn_10 || null,
        book.isbn_13 || null,
        book.title,
        book.subtitle || null,
        book.description || null,
        book.author_name || null,
        book.author_key || null,
        book.first_publish_year || null,
        book.page_count || null,
        book.language || null,
        book.cover_url || null,
        JSON.stringify(book.subjects || []),
        existing.id
      );
      return existing.id;
    }
  }

  // Insert new book
  const newId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO books (
      id, open_library_key, isbn_10, isbn_13, title, subtitle, description,
      author_name, author_key, first_publish_year, page_count, language, cover_url, subjects
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    book.open_library_key,
    book.isbn_10 || null,
    book.isbn_13 || null,
    book.title,
    book.subtitle || null,
    book.description || null,
    book.author_name || null,
    book.author_key || null,
    book.first_publish_year || null,
    book.page_count || null,
    book.language || null,
    book.cover_url || null,
    JSON.stringify(book.subjects || [])
  );

  return newId;
}

// Get Cached Book by various keys
export function getCachedBook(query: string): Book | null {
  const db = getDatabase();
  
  // Try ID lookup (UUID)
  let dbBook = db.prepare("SELECT * FROM books WHERE id = ?").get(query);
  if (dbBook) return mapDbBookToClientBook(dbBook);

  // Try open library key
  const cleanKey = query.startsWith("/works/") ? query : `/works/${query}`;
  dbBook = db.prepare("SELECT * FROM books WHERE open_library_key = ?").get(cleanKey);
  if (dbBook) return mapDbBookToClientBook(dbBook);

  // Try ISBN lookup
  dbBook = db.prepare("SELECT * FROM books WHERE isbn_10 = ? OR isbn_13 = ?").get(query);
  if (dbBook) return mapDbBookToClientBook(dbBook);

  return null;
}

// Search local database
export function searchLocalBooks(query: string): Book[] {
  const db = getDatabase();
  const likeQuery = `%${query}%`;
  
  const records = db.prepare(`
    SELECT * FROM books 
    WHERE title LIKE ? OR author_name LIKE ? OR isbn_10 = ? OR isbn_13 = ?
    LIMIT 20
  `).all(likeQuery, likeQuery, query, query) as any[];

  return records.map(mapDbBookToClientBook);
}

// Fetch and Cache Book by Open Library Key
export async function getBookByOpenLibraryKey(key: string): Promise<Book | null> {
  const cached = getCachedBook(key);
  if (cached) return cached;

  const cleanKey = key.startsWith("/works/") ? key : `/works/${key}`;

  try {
    const res = await fetch(`https://openlibrary.org${cleanKey}.json`);
    if (!res.ok) return null;

    const data = await res.json();
    const title = data.title;
    if (!title) return null;

    // Fetch author details if available
    let authorName = "Unknown Author";
    let authorKey = null;
    if (data.authors?.[0]?.author?.key) {
      authorKey = data.authors[0].author.key;
      const authorDetails = await getOrFetchAuthor(authorKey);
      if (authorDetails) {
        authorName = authorDetails.name;
      }
    }

    let description = "";
    if (data.description) {
      if (typeof data.description === "string") {
        description = data.description;
      } else if (data.description.value) {
        description = data.description.value;
      }
    }

    // Guess first publish year from key/subjects or mock it if missing
    const firstPublishYear = data.created?.value 
      ? new Date(data.created.value).getFullYear() 
      : 2000;

    const subjects = data.subjects || [];

    // Save in DB
    const id = saveBookToDatabase({
      open_library_key: cleanKey,
      title,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: firstPublishYear,
      subjects,
    });

    return getCachedBook(id);
  } catch (err) {
    console.error(`Error fetching work details for ${cleanKey}:`, err);
    return null;
  }
}

// Fetch and Cache Book by ISBN
export async function getBookByISBN(isbn: string): Promise<Book | null> {
  const cached = getCachedBook(isbn);
  if (cached) return cached;

  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!res.ok) {
      // If direct ISBN fetch fails, try searching for it
      const searchRes = await searchOpenLibrary(isbn);
      if (searchRes.length > 0) {
        return searchRes[0];
      }
      return null;
    }

    const data = await res.json();
    const title = data.title;
    if (!title) return null;

    const isbn_10 = data.isbn_10?.[0] || (isbn.length === 10 ? isbn : null);
    const isbn_13 = data.isbn_13?.[0] || (isbn.length === 13 ? isbn : null);
    const pageCount = data.number_of_pages || data.number_of_pages_median;
    const publishDate = data.publish_date;
    const language = data.languages?.[0]?.key?.replace("/languages/", "") || "eng";

    let publishYear = 2000;
    if (publishDate) {
      const yearMatch = publishDate.match(/\d{4}/);
      if (yearMatch) publishYear = parseInt(yearMatch[0]);
    }

    // Cover image resolving
    const coverUrl = data.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
      : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    // Double-hop: Fetch Description and Subjects from associated Work ID
    let description = "";
    let subjects: string[] = [];
    let authorKey = null;
    let authorName = "Unknown Author";

    if (data.works?.[0]?.key) {
      const workKey = data.works[0].key;
      const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
      if (workRes.ok) {
        const workData = await workRes.json();
        
        if (workData.description) {
          if (typeof workData.description === "string") {
            description = workData.description;
          } else if (workData.description.value) {
            description = workData.description.value;
          }
        }
        
        if (workData.subjects) {
          subjects = workData.subjects;
        }

        if (workData.authors?.[0]?.author?.key) {
          authorKey = workData.authors[0].author.key;
        }
      }
    }

    // If author key resolves
    if (authorKey) {
      const auth = await getOrFetchAuthor(authorKey);
      if (auth) authorName = auth.name;
    } else if (data.authors?.[0]?.name) {
      authorName = data.authors[0].name;
    } else if (data.by_statement) {
      authorName = data.by_statement;
    }

    const workKey = data.works?.[0]?.key || `/works/OL_${isbn}_W`;

    const id = saveBookToDatabase({
      open_library_key: workKey,
      isbn_10,
      isbn_13,
      title,
      subtitle: data.subtitle,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: publishYear,
      page_count: pageCount,
      language,
      cover_url: coverUrl,
      subjects,
    });

    return getCachedBook(id);
  } catch (err) {
    console.error(`Error fetching edition details for ISBN ${isbn}:`, err);
    return null;
  }
}

// Main book search combining Local DB + Open Library API
export async function searchOpenLibrary(query: string): Promise<Book[]> {
  if (!query || query.trim().length < 2) return [];

  // 1. Search local DB first
  const localResults = searchLocalBooks(query);
  if (localResults.length >= 6) {
    return localResults;
  }

  // 2. Fetch from Open Library if local search has few results
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return localResults;

    const data = await res.json();
    const docs = data.docs || [];

    const serverResults: Book[] = [];

    // Normalize and save top results
    for (const doc of docs.slice(0, 12)) {
      const isbn = doc.isbn?.[0] || "";
      const coverUrl = doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : null;

      const title = doc.title;
      const authorName = doc.author_name?.[0] || "Unknown Author";
      const authorKey = doc.author_key?.[0] || null;
      const subjects = doc.subject || [];
      const firstPublishYear = doc.first_publish_year || 2000;
      const pageCount = doc.number_of_pages_median || doc.number_of_pages || 300;
      const language = doc.language?.[0] || "eng";

      const book = {
        open_library_key: doc.key,
        isbn_10: doc.isbn?.find((i: string) => i.length === 10) || null,
        isbn_13: doc.isbn?.find((i: string) => i.length === 13) || null,
        title,
        description: doc.first_sentence?.[0] || null,
        author_name: authorName,
        author_key: authorKey,
        first_publish_year: firstPublishYear,
        page_count: pageCount,
        language,
        cover_url: coverUrl,
        subjects,
      };

      const dbId = saveBookToDatabase(book);
      const cached = getCachedBook(dbId);
      if (cached) {
        serverResults.push(cached);
      }
    }

    // Merge unique by title+author
    const seen = new Set(localResults.map((r) => `${r.title.toLowerCase()}::${r.author.toLowerCase()}`));
    const combined = [...localResults];
    for (const book of serverResults) {
      const key = `${book.title.toLowerCase()}::${book.author.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(book);
      }
    }

    return combined.slice(0, 15);
  } catch (error) {
    console.error("Open Library search API error:", error);
    return localResults;
  }
}
