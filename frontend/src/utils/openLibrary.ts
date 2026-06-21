import { Book } from "@/data/mockData";

export async function searchOpenLibrary(query: string): Promise<Book[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    const docs = data.docs || [];

    return docs.slice(0, 12).map((doc: any) => {
      const isbn = doc.isbn?.[0] || "";
      const coverUrl = doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80";

      // Stable pseudo-random rating based on title hash
      let ratingHash = 0;
      for (let i = 0; i < doc.title.length; i++) {
        ratingHash += doc.title.charCodeAt(i);
      }
      const averageRating = 3.6 + (ratingHash % 13) / 10;

      // Extract raw ID
      const bookId = isbn || doc.key.replace("/works/", "");

      return {
        id: bookId,
        title: doc.title,
        author: doc.author_name?.[0] || "Unknown Author",
        year: doc.first_publish_year || 2000,
        description:
          doc.first_sentence?.[0] ||
          `A literary work by ${doc.author_name?.[0] || "Unknown Author"} first published in ${
            doc.first_publish_year || 2000
          }.`,
        coverImage: coverUrl,
        averageRating: parseFloat(averageRating.toFixed(1)),
        genres: doc.subject?.slice(0, 4) || ["Fiction"],
        pages: doc.number_of_pages_median || doc.number_of_pages || 320,
      };
    });
  } catch (error) {
    console.error("Open Library search API error:", error);
    return [];
  }
}

export async function fetchBookByIsbnOrId(id: string): Promise<Book | null> {
  if (!id) return null;

  try {
    // If it is numeric, check if it's an ISBN
    const isIsbn = /^\d+$/.test(id);
    let url = "";
    if (isIsbn) {
      url = `https://openlibrary.org/isbn/${id}.json`;
    } else {
      url = `https://openlibrary.org/works/${id}.json`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      // Fallback search by title if fetching exact ID fails
      const searchRes = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(id)}`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.docs?.[0]) {
          const doc = searchData.docs[0];
          const firstIsbn = doc.isbn?.[0] || "";
          return {
            id: firstIsbn || doc.key.replace("/works/", ""),
            title: doc.title,
            author: doc.author_name?.[0] || "Unknown Author",
            year: doc.first_publish_year || 2000,
            description: doc.first_sentence?.[0] || "No description available.",
            coverImage: doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
              : firstIsbn
              ? `https://covers.openlibrary.org/b/isbn/${firstIsbn}-L.jpg`
              : "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
            averageRating: 4.2,
            genres: doc.subject?.slice(0, 4) || ["Fiction"],
            pages: doc.number_of_pages_median || 300,
          };
        }
      }
      return null;
    }

    const data = await res.json();
    const title = data.title;
    const firstIsbn = data.isbn_13?.[0] || data.isbn_10?.[0] || (isIsbn ? id : "");
    
    const coverUrl = data.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
      : firstIsbn
      ? `https://covers.openlibrary.org/b/isbn/${firstIsbn}-L.jpg`
      : "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80";

    let description = `A literary piece titled ${title}.`;
    if (data.description) {
      if (typeof data.description === "string") {
        description = data.description;
      } else if (data.description.value) {
        description = data.description.value;
      }
    }

    const genres = data.subjects?.slice(0, 4) || ["Fiction"];
    const pages = data.number_of_pages || data.number_of_pages_median || 280;

    // Resolve Author name
    let authorName = "Unknown Author";
    if (data.authors?.[0]?.name) {
      authorName = data.authors[0].name;
    } else if (data.authors?.[0]?.author?.key) {
      const authRes = await fetch(`https://openlibrary.org${data.authors[0].author.key}.json`);
      if (authRes.ok) {
        const authData = await authRes.json();
        authorName = authData.name;
      }
    } else if (data.by_statement) {
      authorName = data.by_statement;
    }

    // Stable average rating
    let ratingHash = 0;
    for (let i = 0; i < title.length; i++) {
      ratingHash += title.charCodeAt(i);
    }
    const averageRating = 3.6 + (ratingHash % 13) / 10;

    return {
      id,
      title,
      author: authorName,
      year: data.publish_date ? parseInt(data.publish_date) || 2000 : 2000,
      description,
      coverImage: coverUrl,
      averageRating: parseFloat(averageRating.toFixed(1)),
      genres,
      pages,
    };
  } catch (error) {
    console.error("Open Library detail fetch error:", error);
    return null;
  }
}
