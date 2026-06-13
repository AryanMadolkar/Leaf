import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
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

export function getCanonicalBookId(book: { open_library_key?: string | null; isbn_13?: string | null; isbn_10?: string | null }): string {
  const workKey = book.open_library_key ? book.open_library_key.replace(/^\/works\//, "") : null;
  const canonicalId = workKey || book.isbn_13 || book.isbn_10;
  if (!canonicalId) {
    return crypto.randomUUID();
  }
  return canonicalId;
}

// Map database record + ratings to client Book structure
export function mapDbBookToClientBook(dbBook: any, avgRating?: number): Book {
  let averageRating = avgRating;
  if (averageRating === undefined) {
    // Stable hash fallback based on title to keep ratings consistent
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
      genres = typeof dbBook.subjects === "string" 
        ? JSON.parse(dbBook.subjects) 
        : dbBook.subjects;
      if (!Array.isArray(genres) || genres.length === 0) {
        genres = ["Fiction"];
      } else {
        genres = genres.slice(0, 4);
      }
    } catch (e) {
      genres = ["Fiction"];
    }
  }

  const canonicalId = getCanonicalBookId({
    open_library_key: dbBook.open_library_key,
    isbn_13: dbBook.isbn_13,
    isbn_10: dbBook.isbn_10,
  }) || dbBook.id;

  return {
    id: canonicalId,
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

// Fetch Author Details (Stateless fetch from Open Library API, no database table needed)
export async function getOrFetchAuthor(authorKey: string): Promise<{ name: string; bio?: string; photo_url?: string } | null> {
  const cleanKey = authorKey.startsWith("/authors/") ? authorKey : `/authors/${authorKey}`;

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

    return { name, bio, photo_url: photoUrl };
  } catch (err) {
    console.error(`Error fetching author details for ${cleanKey}:`, err);
    return null;
  }
}

// Save a normalized book record to Supabase
export async function saveBookToDatabase(book: Omit<NormalizedBook, "id">): Promise<string> {
  const supabase = await createClient();
  
  // Decide the ID to use: prefer open_library_key or ISBN, otherwise generate a UUID
  const bookId = getCanonicalBookId(book);

  try {
    // Check if book already exists in DB
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .maybeSingle();

    const subjectsStr = JSON.stringify(book.subjects || []);

    if (existing) {
      // Update metadata to refresh
      const { error } = await supabase
        .from("books")
        .update({
          open_library_key: book.open_library_key || null,
          isbn_10: book.isbn_10 || null,
          isbn_13: book.isbn_13 || null,
          title: book.title,
          subtitle: book.subtitle || null,
          description: book.description || null,
          author_name: book.author_name || null,
          cover_url: book.cover_url || null,
          page_count: book.page_count || 0,
          subjects: subjectsStr,
          first_publish_year: book.first_publish_year || null,
          language: book.language || null,
        })
        .eq("id", existing.id);

      if (error) throw error;
      return existing.id;
    } else {
      // Insert new book
      const { error } = await supabase
        .from("books")
        .insert({
          id: bookId,
          open_library_key: book.open_library_key || null,
          isbn_10: book.isbn_10 || null,
          isbn_13: book.isbn_13 || null,
          title: book.title,
          subtitle: book.subtitle || null,
          description: book.description || null,
          author_name: book.author_name || null,
          cover_url: book.cover_url || null,
          page_count: book.page_count || 0,
          subjects: subjectsStr,
          first_publish_year: book.first_publish_year || null,
          language: book.language || null,
        });

      if (error) throw error;
      return bookId;
    }
  } catch (error) {
    console.error("Failed to save book to Supabase:", error);
    return bookId;
  }
}

// Get Cached Book by various keys (using single query or filter)
export async function getCachedBook(query: string): Promise<Book | null> {
  const supabase = await createClient();
  const cleanKey = query.startsWith("/works/") ? query : `/works/${query}`;

  try {
    const { data: dbBook } = await supabase
      .from("books")
      .select("*")
      .or(`id.eq."${query}",id.eq."${cleanKey}",open_library_key.eq."${query}",open_library_key.eq."${cleanKey}",isbn_10.eq."${query}",isbn_13.eq."${query}"`)
      .maybeSingle();

    if (dbBook) {
      // Fetch dynamic average rating if applicable
      const { data: ratingsData } = await supabase
        .from("user_books")
        .select("rating")
        .eq("book_id", dbBook.id)
        .not("rating", "is", null);

      let avgRating: number | undefined;
      if (ratingsData && ratingsData.length > 0) {
        const sum = ratingsData.reduce((acc: number, curr: any) => acc + curr.rating, 0);
        avgRating = parseFloat((sum / ratingsData.length).toFixed(1));
      }

      return mapDbBookToClientBook(dbBook, avgRating);
    }
  } catch (error) {
    console.error("Error looking up cached book in Supabase:", error);
  }

  return null;
}

// Search local database
export async function searchLocalBooks(query: string): Promise<Book[]> {
  const supabase = await createClient();

  try {
    const { data: records, error } = await supabase
      .from("books")
      .select("*")
      .or(`title.ilike.%${query}%,author_name.ilike.%${query}%`)
      .limit(20);

    if (error || !records) return [];

    return records.map((r: any) => mapDbBookToClientBook(r));
  } catch (error) {
    console.error("Error doing local search in Supabase:", error);
    return [];
  }
}

// Fetch and Cache Book by Open Library Key
export async function getBookByOpenLibraryKey(key: string): Promise<Book | null> {
  console.log(`[getBookByOpenLibraryKey] Invoked with key: "${key}"`);
  const cached = await getCachedBook(key);
  if (cached) {
    console.log(`[getBookByOpenLibraryKey] Cache HIT for key: "${key}"`);
    return cached;
  }

  const cleanKey = key.startsWith("/works/") ? key : `/works/${key}`;
  const fetchUrl = `https://openlibrary.org${cleanKey}.json`;
  console.log(`[getBookByOpenLibraryKey] Cache MISS. Fetching Open Library URL: "${fetchUrl}"`);

  try {
    const res = await fetch(fetchUrl);
    console.log(`[getBookByOpenLibraryKey] Fetch response status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      console.error(`[getBookByOpenLibraryKey] Fetch failed. Status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const title = data.title;
    console.log(`[getBookByOpenLibraryKey] Parse JSON success. Title: "${title}"`);
    if (!title) {
      console.warn(`[getBookByOpenLibraryKey] Title is empty in API payload`);
      return null;
    }

    // Fetch author details if available
    let authorName = "Unknown Author";
    let authorKey = null;
    if (data.authors?.[0]?.author?.key) {
      authorKey = data.authors[0].author.key;
      console.log(`[getBookByOpenLibraryKey] Found author key: "${authorKey}". Fetching author details...`);
      const authorDetails = await getOrFetchAuthor(authorKey);
      if (authorDetails) {
        authorName = authorDetails.name;
        console.log(`[getBookByOpenLibraryKey] Resolved author name: "${authorName}"`);
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

    const firstPublishYear = data.created?.value 
      ? new Date(data.created.value).getFullYear() 
      : 2000;

    const subjects = data.subjects || [];

    console.log(`[getBookByOpenLibraryKey] Saving book to database...`);
    // Save in DB
    const id = await saveBookToDatabase({
      open_library_key: cleanKey,
      title,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: firstPublishYear,
      subjects,
    });
    console.log(`[getBookByOpenLibraryKey] Book saved in database with ID: "${id}". Fetching cached record...`);

    const cachedRecord = await getCachedBook(id);
    if (cachedRecord) {
      console.log(`[getBookByOpenLibraryKey] Successfully loaded cached record for ID: "${id}"`);
      return cachedRecord;
    }

    console.warn(`[getBookByOpenLibraryKey] Failed to retrieve cached record for ID: "${id}". Storing in-memory fallback.`);
    return mapDbBookToClientBook({
      id,
      open_library_key: cleanKey,
      title,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: firstPublishYear,
      subjects,
      page_count: data.number_of_pages || data.number_of_pages_median || 300,
      cover_url: data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
        : `https://covers.openlibrary.org/b/isbn/${id}-L.jpg`,
    });
  } catch (err) {
    console.error(`Error fetching work details for ${cleanKey}:`, err);
    return null;
  }
}

// Fetch and Cache Book by ISBN
export async function getBookByISBN(isbn: string): Promise<Book | null> {
  const cached = await getCachedBook(isbn);
  if (cached) return cached;

  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!res.ok) {
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

    const coverUrl = data.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
      : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

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

    if (authorKey) {
      const auth = await getOrFetchAuthor(authorKey);
      if (auth) authorName = auth.name;
    } else if (data.authors?.[0]?.name) {
      authorName = data.authors[0].name;
    } else if (data.by_statement) {
      authorName = data.by_statement;
    }

    const workKey = data.works?.[0]?.key || `/works/OL_${isbn}_W`;

    const id = await saveBookToDatabase({
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

    const cachedRecord = await getCachedBook(id);
    if (cachedRecord) {
      return cachedRecord;
    }

    console.warn(`[getBookByISBN] Failed to retrieve cached record for ID: "${id}". Storing in-memory fallback.`);
    return mapDbBookToClientBook({
      id,
      open_library_key: workKey,
      isbn_10,
      isbn_13,
      title,
      subtitle: data.subtitle,
      description,
      author_name: authorName,
      author_key: authorKey,
      first_publish_year: publishYear,
      page_count: pageCount || 300,
      language,
      cover_url: coverUrl,
      subjects,
    });
  } catch (err) {
    console.error(`Error fetching edition details for ISBN ${isbn}:`, err);
    return null;
  }
}

// Main book search combining Local DB + Open Library API
export async function searchOpenLibrary(query: string): Promise<Book[]> {
  if (!query || query.trim().length < 2) return [];

  // 1. Search local DB first
  const localResults = await searchLocalBooks(query);
  if (localResults.length > 0) {
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

      const dbId = await saveBookToDatabase(book);
      let cached = await getCachedBook(dbId);
      if (!cached) {
        // Fallback in-memory construction if saving failed
        cached = {
          id: dbId,
          title: book.title,
          author: book.author_name,
          year: book.first_publish_year,
          description: book.description || "No description available.",
          coverImage: book.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
          averageRating: 4.0,
          genres: book.subjects.slice(0, 4),
          pages: book.page_count,
        };
      }
      serverResults.push(cached);
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

// --- Server-side Helpers ---

export async function getBookFromCache(id: string): Promise<Book | null> {
  console.log(`[getBookFromCache] Checking cache for book ID: "${id}"`);
  const book = await getCachedBook(id);
  if (book) {
    console.log(`[getBookFromCache] Cache HIT for book ID: "${id}"`);
  } else {
    console.log(`[getBookFromCache] Cache MISS for book ID: "${id}"`);
  }
  return book;
}

export async function fetchBookFromOpenLibrary(id: string): Promise<Book | null> {
  console.log(`[fetchBookFromOpenLibrary] Fetching book ID from Open Library: "${id}"`);
  const isIsbn = /^\d+$/.test(id) && (id.length === 10 || id.length === 13);
  
  try {
    if (isIsbn) {
      console.log(`[fetchBookFromOpenLibrary] Fetching by ISBN: "${id}"`);
      return await getBookByISBN(id);
    } else {
      console.log(`[fetchBookFromOpenLibrary] Fetching by Open Library Work Key: "${id}"`);
      // Strip /works/ if present to get clean work key
      const cleanKey = id.replace(/^\/works\//, "");
      return await getBookByOpenLibraryKey(cleanKey);
    }
  } catch (error) {
    console.error(`[fetchBookFromOpenLibrary] API failure fetching book ID "${id}":`, error);
    return null;
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  console.log(`[getBookById] Initializing load for book ID: "${id}"`);
  if (!id) {
    console.error("[getBookById] Routing failure: Received empty or undefined book ID");
    return null;
  }

  // 1. Try Cache
  const cached = await getBookFromCache(id);
  if (cached) {
    return cached;
  }

  // 2. Fetch & Cache
  const fetched = await fetchBookFromOpenLibrary(id);
  if (fetched) {
    console.log(`[getBookById] Successfully retrieved and cached book ID: "${id}" from Open Library`);
    return fetched;
  }

  console.warn(`[getBookById] Book detail resolution failed for ID: "${id}"`);
  return null;
}
