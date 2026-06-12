import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import { INITIAL_BOOKS, INITIAL_REVIEWS, INITIAL_DIARY_LOGS } from "@/data/mockData";

// Path to SQLite database file
const DB_PATH = path.resolve(process.cwd(), "leaf.db");

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH, { verbose: console.log });
    // Enable WAL mode for performance
    dbInstance.pragma("journal_mode = WAL");
  }
  return dbInstance;
}

export function initDatabase() {
  const db = getDatabase();

  // 1. Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      open_library_key TEXT UNIQUE,
      isbn_10 TEXT,
      isbn_13 TEXT,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      author_name TEXT,
      author_key TEXT,
      first_publish_year INTEGER,
      page_count INTEGER,
      language TEXT,
      cover_url TEXT,
      subjects TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY,
      open_library_author_key TEXT UNIQUE,
      name TEXT NOT NULL,
      bio TEXT,
      photo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS user_books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('want_to_read', 'reading', 'finished')) NOT NULL,
      rating REAL,
      review TEXT,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_books_open_library_key ON books(open_library_key);
    CREATE INDEX IF NOT EXISTS idx_books_isbn_10 ON books(isbn_10);
    CREATE INDEX IF NOT EXISTS idx_books_isbn_13 ON books(isbn_13);
    CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON user_books(book_id);
    CREATE INDEX IF NOT EXISTS idx_authors_key ON authors(open_library_author_key);
  `);

  // Add current_page to user_books if it doesn't exist
  const userBooksTableInfo = db.prepare("PRAGMA table_info(user_books)").all() as any[];
  const hasCurrentPage = userBooksTableInfo.some((col) => col.name === "current_page");
  if (!hasCurrentPage) {
    db.exec("ALTER TABLE user_books ADD COLUMN current_page INTEGER DEFAULT 0");
  }

  // Create reading_sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      pages_read INTEGER NOT NULL,
      start_page INTEGER NOT NULL,
      end_page INTEGER NOT NULL,
      note TEXT,
      reading_minutes INTEGER,
      logged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reading_sessions_user ON reading_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_reading_sessions_book ON reading_sessions(book_id);
  `);

  // Create user_reading_stats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_reading_stats (
      user_id TEXT PRIMARY KEY,
      total_pages_read INTEGER DEFAULT 0,
      total_books_completed INTEGER DEFAULT 0,
      total_reading_hours REAL DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      average_pages_per_day REAL DEFAULT 0,
      average_book_length REAL DEFAULT 0,
      favorite_genre TEXT DEFAULT 'Fiction'
    );
  `);

  // 2. Seed database if it's empty
  const bookCountRow = db.prepare("SELECT COUNT(*) as count FROM books").get() as { count: number };
  
  if (bookCountRow.count === 0) {
    console.log("Seeding books database with initial mock data...");

    // Map to keep track of generated UUIDs for the 6 initial books
    // keyed by their original ISBN string (from mockData.ts)
    const isbnToUuidMap = new Map<string, string>();

    // Seed Books
    const insertBook = db.prepare(`
      INSERT INTO books (
        id, open_library_key, isbn_10, isbn_13, title, subtitle, description, 
        author_name, author_key, first_publish_year, page_count, language, cover_url, subjects
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const b of INITIAL_BOOKS) {
      const bookUuid = crypto.randomUUID();
      isbnToUuidMap.set(b.id, bookUuid);

      // Guess keys if we don't have them
      const keySuffix = b.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const openLibraryKey = `/works/OL_${keySuffix}_W`;

      insertBook.run(
        bookUuid,
        openLibraryKey,
        b.id.length === 10 ? b.id : null,
        b.id.length === 13 ? b.id : null,
        b.title,
        null, // subtitle
        b.description,
        b.author,
        `OL_A_${keySuffix}`, // author_key
        b.year,
        b.pages,
        "eng",
        b.coverImage,
        JSON.stringify(b.genres)
      );
    }

    // Seed user_books (Logs & Reviews)
    const insertUserBook = db.prepare(`
      INSERT INTO user_books (
        id, user_id, book_id, status, rating, review, likes_count, comments_count, started_at, finished_at, created_at, current_page
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const userBookRecordMap = new Map<string, {
      id: string;
      userId: string;
      bookUuid: string;
      status: string;
      rating?: number;
      review?: string;
      likesCount?: number;
      commentsCount?: number;
      dateLogged: string;
    }>();

    // First process reading logs
    for (const log of INITIAL_DIARY_LOGS) {
      const bookUuid = isbnToUuidMap.get(log.bookId);
      if (!bookUuid) continue;

      const key = `${log.userId}_${bookUuid}`;
      const mappedStatus = log.status === "Want to Read" 
        ? "want_to_read" 
        : log.status === "Currently Reading" 
        ? "reading" 
        : "finished";

      userBookRecordMap.set(key, {
        id: crypto.randomUUID(),
        userId: log.userId,
        bookUuid,
        status: mappedStatus,
        rating: log.rating,
        likesCount: 0,
        commentsCount: 0,
        dateLogged: log.dateLogged,
      });
    }

    // Then process reviews to merge rating and review text into finished logs
    for (const rev of INITIAL_REVIEWS) {
      const bookUuid = isbnToUuidMap.get(rev.bookId);
      if (!bookUuid) continue;

      const key = `${rev.userId}_${bookUuid}`;
      const existing = userBookRecordMap.get(key);

      const parsedDate = new Date(rev.dateString);
      const isoDate = isNaN(parsedDate.getTime()) 
        ? new Date().toISOString().split("T")[0] 
        : parsedDate.toISOString().split("T")[0];

      if (existing) {
        userBookRecordMap.set(key, {
          ...existing,
          status: "finished",
          rating: rev.rating,
          review: rev.content,
          likesCount: rev.likesCount || 0,
          commentsCount: rev.commentsCount || 0,
          dateLogged: isoDate,
        });
      } else {
        userBookRecordMap.set(key, {
          id: crypto.randomUUID(),
          userId: rev.userId,
          bookUuid,
          status: "finished",
          rating: rev.rating,
          review: rev.content,
          likesCount: rev.likesCount || 0,
          commentsCount: rev.commentsCount || 0,
          dateLogged: isoDate,
        });
      }
    }

    // Insert all user_books into the database
    for (const record of userBookRecordMap.values()) {
      const dbBook = db.prepare("SELECT page_count FROM books WHERE id = ?").get(record.bookUuid) as { page_count: number };
      const pageCount = dbBook ? dbBook.page_count : 300;
      
      insertUserBook.run(
        record.id,
        record.userId,
        record.bookUuid,
        record.status,
        record.rating ?? null,
        record.review ?? null,
        record.likesCount ?? 0,
        record.commentsCount ?? 0,
        record.status === "reading" ? record.dateLogged : null, // started_at
        record.status === "finished" ? record.dateLogged : null, // finished_at
        record.dateLogged, // created_at
        record.status === "finished" ? pageCount : 0 // current_page
      );
    }

    // Add some "Want to Read" shelf items for mock users to populate their libraries
    const wantToReadData = [
      { userId: "currentUser", isbn: "9781984822178" }, // Normal People
      { userId: "user-emma", isbn: "9780593318171" }, // Klara and the Sun
      { userId: "user-alex", isbn: "9780140167771" }, // The Secret History
      { userId: "user-sophia", isbn: "9780593135204" }, // Project Hail Mary
    ];

    for (const item of wantToReadData) {
      const bookUuid = isbnToUuidMap.get(item.isbn);
      if (!bookUuid) continue;

      const key = `${item.userId}_${bookUuid}`;
      if (!userBookRecordMap.has(key)) {
        insertUserBook.run(
          crypto.randomUUID(),
          item.userId,
          bookUuid,
          "want_to_read",
          null,
          null,
          0,
          0,
          null,
          null,
          new Date().toISOString().split("T")[0],
          0 // current_page
        );
      }
    }

    console.log("Database seeded successfully.");
  }

  // 3. Seed Reading Sessions if reading_sessions is empty
  const sessionCountRow = db.prepare("SELECT COUNT(*) as count FROM reading_sessions").get() as { count: number };
  if (sessionCountRow.count === 0) {
    console.log("Seeding reading sessions with historical progress...");
    
    const dbBooksList = db.prepare("SELECT id, title, page_count FROM books").all() as { id: string; title: string; page_count: number }[];
    const titleToBookMap = new Map<string, { id: string; page_count: number }>();
    for (const bk of dbBooksList) {
      titleToBookMap.set(bk.title, bk);
    }

    const insertSession = db.prepare(`
      INSERT INTO reading_sessions (
        id, user_id, book_id, pages_read, start_page, end_page, note, reading_minutes, logged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Helper to log sessions
    const logSess = (userId: string, bookTitle: string, pagesRead: number, start: number, end: number, note: string | null, mins: number, dateStr: string) => {
      const bookInfo = titleToBookMap.get(bookTitle);
      if (!bookInfo) return;
      insertSession.run(
        crypto.randomUUID(),
        userId,
        bookInfo.id,
        pagesRead,
        start,
        end,
        note,
        mins,
        `${dateStr} 20:00:00`
      );
    };

    // --- Rowan Archer (currentUser) ---
    // Klara and the Sun (307 pages) - Finished on 2026-05-10
    logSess("currentUser", "Klara and the Sun", 50, 0, 50, "Klara is such a fascinating narrator. Extremely unique perspective.", 65, "2026-05-01");
    logSess("currentUser", "Klara and the Sun", 60, 50, 110, "Intriguing world details about the Sun and 'lifting'.", 70, "2026-05-02");
    logSess("currentUser", "Klara and the Sun", 60, 110, 170, null, 75, "2026-05-04");
    logSess("currentUser", "Klara and the Sun", 60, 170, 230, "The mother's secret is disturbing...", 72, "2026-05-06");
    logSess("currentUser", "Klara and the Sun", 50, 230, 280, "Tense scenes at the waterfall.", 60, "2026-05-08");
    logSess("currentUser", "Klara and the Sun", 27, 280, 307, "What an elegant, quiet, and heartbreaking ending. Ishiguro does it again.", 35, "2026-05-10");

    // Project Hail Mary (476 pages) - Finished on 2026-05-28
    logSess("currentUser", "Project Hail Mary", 60, 0, 60, "A science teacher waking up on a spaceship with amnesia. Count me in.", 70, "2026-05-15");
    logSess("currentUser", "Project Hail Mary", 70, 60, 130, "The science logic in this book is incredibly engaging and fast-paced.", 80, "2026-05-17");
    logSess("currentUser", "Project Hail Mary", 65, 130, 195, "We just met another spaceship! First contact!", 75, "2026-05-19");
    logSess("currentUser", "Project Hail Mary", 80, 195, 275, "Rocky is the absolute best character! Happy happy happy!", 90, "2026-05-21");
    logSess("currentUser", "Project Hail Mary", 75, 275, 350, "Solving problems with alien biology. So satisfying.", 85, "2026-05-23");
    logSess("currentUser", "Project Hail Mary", 70, 350, 420, "Rocky and Ryland are a match made in heaven.", 78, "2026-05-26");
    logSess("currentUser", "Project Hail Mary", 56, 420, 476, "What an epic sacrifice. A truly fantastic science fiction masterpiece.", 60, "2026-05-28");

    // The Secret History (559 pages) - Finished on 2026-06-11
    logSess("currentUser", "The Secret History", 70, 0, 70, "Atmospheric, elitist, and dark academia at its finest. Pretentious Greek class.", 80, "2026-06-02");
    logSess("currentUser", "The Secret History", 70, 70, 140, "They are planning something awful. The prose is so elegant.", 82, "2026-06-03");
    logSess("currentUser", "The Secret History", 70, 140, 210, "The tension is thick. Henry is a terrifyingly quiet character.", 85, "2026-06-05");
    logSess("currentUser", "The Secret History", 70, 210, 280, null, 78, "2026-06-06");
    logSess("currentUser", "The Secret History", 80, 280, 360, "They pushed Bunny. Oh my god.", 95, "2026-06-08");
    logSess("currentUser", "The Secret History", 70, 360, 430, "The funeral is so drawn out and painful.", 80, "2026-06-09");
    logSess("currentUser", "The Secret History", 70, 430, 500, "Paranoia is ripping the group apart.", 85, "2026-06-10");
    logSess("currentUser", "The Secret History", 59, 500, 559, "Absolutely haunting. The weight of their choices will linger forever.", 68, "2026-06-11");

    // Dune (604 pages) - Currently Reading, at 340 pages
    logSess("currentUser", "Dune", 50, 0, 50, "Rereading Dune. Arrakis is as brutal and magnificent as I remember.", 60, "2026-06-01");
    logSess("currentUser", "Dune", 60, 50, 110, "The Gom Jabbar test. Pure tension.", 70, "2026-06-04");
    logSess("currentUser", "Dune", 55, 110, 165, "Paul and the Duke discussing the shield and spice harvester.", 65, "2026-06-07");
    logSess("currentUser", "Dune", 45, 165, 210, null, 50, "2026-06-09");
    logSess("currentUser", "Dune", 50, 210, 260, "The betrayal of Dr. Yueh. Heartbreaking.", 62, "2026-06-10");
    logSess("currentUser", "Dune", 40, 260, 300, "Paul and Jessica escaping into the desert storm.", 48, "2026-06-12");
    logSess("currentUser", "Dune", 40, 300, 340, "They found the Fremen. Stilgar and Chani introduced.", 48, "2026-06-13");

    // --- Emma Sterling (user-emma) ---
    // The Secret History (559 pages) - Finished June 9
    logSess("user-emma", "The Secret History", 100, 0, 100, "Stunning introduction. Tartt writes like a dream.", 110, "2026-06-03");
    logSess("user-emma", "The Secret History", 120, 100, 220, null, 130, "2026-06-05");
    logSess("user-emma", "user-emma", 150, 220, 370, "Deeply engrossing. The secret is out.", 160, "2026-06-07");
    logSess("user-emma", "The Secret History", 189, 370, 559, "The ending was tragic and beautifully written.", 210, "2026-06-09");
    
    // Klara and the Sun (307 pages) - Currently Reading at 120 pages
    logSess("user-emma", "Klara and the Sun", 40, 0, 40, "Klara is such a sweet narrator.", 45, "2026-06-10");
    logSess("user-emma", "Klara and the Sun", 50, 40, 90, "Interesting world.", 55, "2026-06-11");
    logSess("user-emma", "Klara and the Sun", 30, 90, 120, null, 35, "2026-06-12");

    // --- Alex Petrov (user-alex) ---
    // Project Hail Mary (476 pages) - Finished June 7
    logSess("user-alex", "Project Hail Mary", 120, 0, 120, "Fascinating hard science puzzle.", 130, "2026-06-02");
    logSess("user-alex", "Project Hail Mary", 150, 120, 270, "Fascinating science details.", 160, "2026-06-04");
    logSess("user-alex", "Project Hail Mary", 206, 270, 476, "Amazing. The science and friendship made this book.", 220, "2026-06-07");

    // --- Sophia Chen (user-sophia) ---
    // Normal People (273 pages) - Finished June 10
    logSess("user-sophia", "Normal People", 100, 0, 100, "Sally Rooney's writing style is so raw.", 110, "2026-06-07");
    logSess("user-sophia", "Normal People", 100, 100, 200, "They keep missing each other.", 115, "2026-06-09");
    logSess("user-sophia", "Normal People", 73, 200, 273, "Broke my heart. Beautiful.", 80, "2026-06-10");
    
    // Klara and the Sun (307 pages) - Finished May 14
    logSess("user-sophia", "Klara and the Sun", 150, 0, 150, "Beginning this.", 160, "2026-05-11");
    logSess("user-sophia", "Klara and the Sun", 157, 150, 307, "A quiet devastation.", 170, "2026-05-14");

    // --- Julian Vance (user-julian) ---
    // The Great Gatsby (180 pages) - Finished May 27
    logSess("user-julian", "The Great Gatsby", 90, 0, 90, "Classic prose. Incredibly lyrical.", 100, "2026-05-25");
    logSess("user-julian", "The Great Gatsby", 90, 90, 180, "A tragic, beautiful reflection of longing.", 95, "2026-05-27");

    // Sync all user_books current_page counts to database
    db.exec(`
      UPDATE user_books SET current_page = (
        SELECT MAX(end_page) FROM reading_sessions 
        WHERE reading_sessions.user_id = user_books.user_id 
          AND reading_sessions.book_id = user_books.book_id
      )
      WHERE EXISTS (
        SELECT 1 FROM reading_sessions 
        WHERE reading_sessions.user_id = user_books.user_id 
          AND reading_sessions.book_id = user_books.book_id
      )
    `);

    // Force finished status items to have full page count
    db.exec(`
      UPDATE user_books 
      SET current_page = (SELECT page_count FROM books WHERE books.id = user_books.book_id)
      WHERE status = 'finished'
    `);

    // Recalculate stats for all seeded users
    const usersList = ["currentUser", "user-emma", "user-alex", "user-sophia", "user-julian"];
    for (const uId of usersList) {
      recalculateUserStats(uId);
    }

    console.log("Reading sessions and stats populated successfully.");
  }
}

export function recalculateUserStats(userId: string): void {
  const db = getDatabase();

  // 1. total_pages_read
  const totalPagesRow = db.prepare("SELECT SUM(pages_read) as total FROM reading_sessions WHERE user_id = ?").get(userId) as { total: number | null };
  const totalPagesRead = totalPagesRow?.total || 0;

  // 2. total_books_completed
  const completedRow = db.prepare("SELECT COUNT(*) as count FROM user_books WHERE user_id = ? AND status = 'finished'").get(userId) as { count: number };
  const totalBooksCompleted = completedRow.count;

  // 3. total_reading_hours
  const totalReadingHours = parseFloat((totalPagesRead / 45).toFixed(1));

  // 4. longest_streak & current_streak
  const sessions = db.prepare("SELECT DISTINCT SUBSTR(logged_at, 1, 10) as date FROM reading_sessions WHERE user_id = ? ORDER BY date ASC").all(userId) as { date: string }[];
  
  let currentStreak = 0;
  let longestStreak = 0;

  if (sessions.length > 0) {
    const dates = sessions.map((s) => s.date);
    
    // Calculate longest streak
    let tempStreak = 1;
    let maxStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const d1 = new Date(dates[i - 1]);
      const d2 = new Date(dates[i]);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }
    longestStreak = maxStreak;

    // Calculate current streak (counting back from today or yesterday)
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const hasToday = dates.includes(todayStr);
    const hasYesterday = dates.includes(yesterdayStr);

    if (hasToday || hasYesterday) {
      let checkDate = hasToday ? new Date() : yesterday;
      currentStreak = 1;
      
      while (true) {
        // Create a copy of checking date, subtract one day
        const prevDate = new Date(checkDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const checkStr = prevDate.toISOString().split("T")[0];
        
        if (dates.includes(checkStr)) {
          currentStreak++;
          checkDate = prevDate;
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }
  }

  // 5. average_pages_per_day
  let avgPagesPerDay = 0;
  if (sessions.length > 0) {
    const firstDate = new Date(sessions[0].date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    avgPagesPerDay = parseFloat((totalPagesRead / diffDays).toFixed(1));
  }

  // 6. average_book_length
  const booksCompletedLengthRow = db.prepare(`
    SELECT AVG(b.page_count) as avg_len
    FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = ? AND ub.status = 'finished'
  `).get(userId) as { avg_len: number | null };
  const averageBookLength = booksCompletedLengthRow?.avg_len ? Math.round(booksCompletedLengthRow.avg_len) : 300;

  // 7. favorite_genre
  const userBooksGenres = db.prepare(`
    SELECT b.subjects
    FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = ?
  `).all(userId) as { subjects: string }[];
  
  const genreCounts: Record<string, number> = {};
  for (const row of userBooksGenres) {
    if (row.subjects) {
      try {
        const genres = JSON.parse(row.subjects) as string[];
        for (const g of genres) {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        }
      } catch (e) {}
    }
  }

  let favoriteGenre = "Fiction";
  let maxCount = 0;
  for (const [genre, count] of Object.entries(genreCounts)) {
    if (count > maxCount) {
      maxCount = count;
      favoriteGenre = genre;
    }
  }

  // Insert or Replace user stats
  db.prepare(`
    INSERT OR REPLACE INTO user_reading_stats (
      user_id, total_pages_read, total_books_completed, total_reading_hours,
      longest_streak, current_streak, average_pages_per_day, average_book_length, favorite_genre
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    totalPagesRead,
    totalBooksCompleted,
    totalReadingHours,
    longestStreak,
    currentStreak,
    avgPagesPerDay,
    averageBookLength,
    favoriteGenre
  );
}
