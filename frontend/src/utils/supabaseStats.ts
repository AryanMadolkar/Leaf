import { createClient } from "@/utils/supabase/server";
import { favoriteGenreFromTags } from "@/utils/genreUtils";

export async function recalculateUserStats(supabase: any, userId: string) {
  try {
    // 1. Fetch reading sessions to compute total pages & streaks
    const { data: sessions, error: sessionsError } = await supabase
      .from("reading_sessions")
      .select("pages_read, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true });

    if (sessionsError) {
      console.error("Recalculate stats error fetching sessions:", sessionsError);
      return;
    }

    const totalPagesRead = sessions ? sessions.reduce((acc: number, curr: any) => acc + curr.pages_read, 0) : 0;
    const totalReadingHours = parseFloat((totalPagesRead / 45).toFixed(1));

    // Compute streaks
    const dates = sessions 
      ? Array.from(new Set(sessions.map((s: any) => s.logged_at.split("T")[0]))) as string[]
      : [];
    
    let currentStreak = 0;
    let longestStreak = 0;

    if (dates.length > 0) {
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

      // Current streak calculation (counting back from today or yesterday)
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

    // 2. Fetch completed, reading, want to read counts
    const { count: completedCount } = await supabase
      .from("user_books")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", "finished");

    const booksCompleted = completedCount || 0;

    const { count: readingCount } = await supabase
      .from("user_books")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", "reading");

    const booksReading = readingCount || 0;

    const { count: wantToReadCount } = await supabase
      .from("user_books")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", "want_to_read");

    const booksWantToRead = wantToReadCount || 0;

    // 3. Compute average pages per day
    let averagePagesPerDay = 0.0;
    if (dates.length > 0) {
      const firstDate = new Date(dates[0]);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - firstDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      averagePagesPerDay = parseFloat((totalPagesRead / diffDays).toFixed(1));
    }

    // 4. Compute average rating
    const { data: ratingsData } = await supabase
      .from("user_books")
      .select("rating")
      .eq("user_id", userId)
      .eq("status", "finished")
      .not("rating", "is", null);

    let averageRating = 0.0;
    if (ratingsData && ratingsData.length > 0) {
      const sum = ratingsData.reduce((acc: number, curr: any) => acc + curr.rating, 0);
      averageRating = parseFloat((sum / ratingsData.length).toFixed(2));
    }

    // 5. Compute average book length & favorite genre
    const { data: userBooksData } = await supabase
      .from("user_books")
      .select(`
        rating,
        book:books(page_count, subjects)
      `)
      .eq("user_id", userId);

    let totalLength = 0;
    let lenCount = 0;
    const booksGenres: string[][] = [];

    if (userBooksData) {
      userBooksData.forEach((ub: any) => {
        if (ub.book?.page_count) {
          totalLength += ub.book.page_count;
          lenCount++;
        }
        if (ub.book?.subjects) {
          try {
            const genres = typeof ub.book.subjects === "string"
              ? JSON.parse(ub.book.subjects)
              : ub.book.subjects;
            booksGenres.push(Array.isArray(genres) ? genres : []);
          } catch {
            booksGenres.push([]);
          }
        }
      });
    }

    const averageBookLength = lenCount > 0 ? Math.round(totalLength / lenCount) : 300;
    const favoriteGenre = favoriteGenreFromTags(booksGenres);

    // 6. Update user_stats in database
    const { error: updateError } = await supabase
      .from("user_stats")
      .upsert({
        user_id: userId,
        books_completed: booksCompleted,
        books_reading: booksReading,
        books_want_to_read: booksWantToRead,
        total_pages_read: totalPagesRead,
        average_rating: averageRating,
        reading_streak: currentStreak,
        longest_streak: longestStreak,
        average_pages_per_day: averagePagesPerDay,
        average_book_length: averageBookLength,
        favorite_genre: favoriteGenre,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error("Failed to update user_stats:", updateError);
    }
  } catch (err) {
    console.error("Recalculate user stats error:", err);
  }
}
