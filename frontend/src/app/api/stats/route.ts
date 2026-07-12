import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { buildGenreDistribution } from "@/utils/genreUtils";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    // Default to active user session, fallback to searchParam if querying another profile
    const { user } = await getRequestUser();
    const targetUserId = searchParams.get("userId") || user?.id;

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: "Missing target userId" }, { status: 400 });
    }

    // 1. Fetch main user stats row (with self-healing fallback)
    let stats = null;
    const { data: existingStats, error: statsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (statsError) {
      console.error("[DEBUG] [stats] Error fetching user_stats:", statsError);
    }

    if (!existingStats) {
      console.log("[DEBUG] [stats] Stats row not found for user:", targetUserId, ". Creating fallback stats.");
      // Check if user has a profile first (to respect foreign key)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();

      if (profile) {
        const { data: insertedStats, error: insertStatsError } = await supabase
          .from("user_stats")
          .insert({ user_id: targetUserId })
          .select()
          .maybeSingle();

        if (!insertStatsError) {
          stats = insertedStats;
        } else {
          console.error("[DEBUG] [stats] Failed to insert stats fallback:", insertStatsError);
        }
      } else {
        console.warn("[DEBUG] [stats] Cannot create stats because profile row is missing.");
      }
    } else {
      stats = existingStats;
    }

    if (!stats) {
      return NextResponse.json({ success: true, stats: null });
    }

    // 2. Fetch all reading sessions to compute charts in memory
    const { data: allSessions } = await supabase
      .from("reading_sessions")
      .select("pages_read, logged_at")
      .eq("user_id", targetUserId)
      .order("logged_at", { ascending: true });

    const sessionsList = allSessions || [];

    // Group daily pages read for all-time heatmap
    const dailyMap: Record<string, number> = {};
    sessionsList.forEach((s: any) => {
      const dateStr = s.logged_at.split("T")[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + s.pages_read;
    });

    const heatmapRows = Object.entries(dailyMap).map(([date, pagesRead]) => ({
      date,
      pagesRead,
    }));

    // 3. Pages read over time (Week, Month, Year, All Time)
    // Week: Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      last7Days.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: dateStr,
        pages: dailyMap[dateStr] || 0,
      });
    }

    // Month: Last 30 days
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      last30Days.push({
        label: d.toLocaleDateString("en-US", { day: "numeric" }),
        date: dateStr,
        pages: dailyMap[dateStr] || 0,
      });
    }

    // Year: Last 12 months
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      
      const totalInMonth = sessionsList
        .filter((s: any) => s.logged_at.startsWith(yearMonth))
        .reduce((sum: number, s: any) => sum + s.pages_read, 0);

      last12Months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        period: yearMonth,
        pages: totalInMonth,
      });
    }

    // 4. Books Finished Per Month (Current vs Previous Year)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const finishedCurrentYear = Array(12).fill(0);
    const finishedPrevYear = Array(12).fill(0);

    const { data: completedBooks } = await supabase
      .from("user_books")
      .select("finished_at")
      .eq("user_id", targetUserId)
      .eq("status", "finished")
      .not("finished_at", "is", null);

    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    if (completedBooks) {
      completedBooks.forEach((row: any) => {
        const parts = row.finished_at.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const monthIdx = parseInt(parts[1]) - 1;
          if (year === currentYear) {
            finishedCurrentYear[monthIdx]++;
          } else if (year === prevYear) {
            finishedPrevYear[monthIdx]++;
          }
        }
      });
    }

    const booksFinishedComparison = months.map((name, idx) => ({
      month: name,
      currentYear: finishedCurrentYear[idx],
      previousYear: finishedPrevYear[idx],
    }));

    // 5. Genre Distribution (canonical literary genres — skip shelf tags)
    const { data: userBooksGenres } = await supabase
      .from("user_books")
      .select(`
        book:books(subjects)
      `)
      .eq("user_id", targetUserId);

    const booksGenres = (userBooksGenres || []).map((row: any) => {
      if (!row.book?.subjects) return [];
      try {
        const genres = typeof row.book.subjects === "string"
          ? JSON.parse(row.book.subjects)
          : row.book.subjects;
        return Array.isArray(genres) ? genres : [];
      } catch {
        return [];
      }
    });

    const genreDistribution = buildGenreDistribution(booksGenres);

    // 6. Chronological Reading Activity Timeline
    const { data: timelineSessions } = await supabase
      .from("reading_sessions")
      .select(`
        id,
        pages_read,
        logged_at,
        note,
        book:books(title, author_name, cover_url)
      `)
      .eq("user_id", targetUserId);

    const { data: timelineBooks } = await supabase
      .from("user_books")
      .select(`
        id,
        status,
        rating,
        review,
        started_at,
        finished_at,
        created_at,
        book:books(title, author_name, cover_url)
      `)
      .eq("user_id", targetUserId);

    const rawTimeline: any[] = [];
    if (timelineSessions) {
      timelineSessions.forEach((s: any) => {
        rawTimeline.push({
          id: s.id,
          type: "session",
          pages: s.pages_read,
          date: s.logged_at,
          note: s.note,
          title: s.book?.title || "Unknown Book",
          author: s.book?.author_name || "Unknown Author",
          coverImage: s.book?.cover_url || "",
        });
      });
    }

    if (timelineBooks) {
      timelineBooks.forEach((ub: any) => {
        const dateStr = ub.finished_at || ub.started_at || ub.created_at || new Date().toISOString();
        rawTimeline.push({
          id: ub.id,
          type: "status_change",
          status: ub.status,
          rating: ub.rating,
          review: ub.review,
          date: dateStr,
          title: ub.book?.title || "Unknown Book",
          author: ub.book?.author_name || "Unknown Author",
          coverImage: ub.book?.cover_url || "",
        });
      });
    }

    // Sort by date descending
    rawTimeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const timeline = rawTimeline.slice(0, 15).map((item) => {
      let message = "";
      if (item.type === "session") {
        message = `Logged ${item.pages} pages of ${item.title}`;
      } else {
        if (item.status === "finished") {
          message = `Finished ${item.title}`;
          if (item.rating) message += ` and rated it ★${item.rating}`;
        } else if (item.status === "reading") {
          message = `Started reading ${item.title}`;
        } else {
          message = `Added ${item.title} to Want to Read shelf`;
        }
      }

      return {
        id: item.id,
        type: item.type,
        status: item.status,
        pages: item.pages,
        note: item.note,
        title: item.title,
        author: item.author,
        coverImage: item.coverImage,
        date: item.date,
        message,
      };
    });

    // 7. Advanced Reading Pace details
    const { data: completedBooksList } = await supabase
      .from("user_books")
      .select(`
        started_at,
        finished_at,
        current_page,
        book:books(title, page_count, cover_url)
      `)
      .eq("user_id", targetUserId)
      .eq("status", "finished")
      .not("started_at", "is", null)
      .not("finished_at", "is", null);

    let fastestBook = null;
    let longestBook = null;
    let avgDaysToFinish = 0;
    
    if (completedBooksList && completedBooksList.length > 0) {
      let maxLen = 0;
      let minDays = Infinity;
      let totalDays = 0;

      completedBooksList.forEach((row: any) => {
        const d1 = new Date(row.started_at);
        const d2 = new Date(row.finished_at);
        const days = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        totalDays += days;

        const pageCount = row.book?.page_count || 300;

        if (days < minDays) {
          minDays = days;
          fastestBook = { title: row.book?.title, days, coverImage: row.book?.cover_url };
        }
        if (pageCount > maxLen) {
          maxLen = pageCount;
          longestBook = { title: row.book?.title, pages: pageCount, coverImage: row.book?.cover_url };
        }
      });
      avgDaysToFinish = parseFloat((totalDays / completedBooksList.length).toFixed(1));
    }

    const { count: completedCount } = await supabase
      .from("user_books")
      .select("id", { count: "exact" })
      .eq("user_id", targetUserId)
      .eq("status", "finished");

    const booksCompletedAllTime = completedCount || 0;
    const avgBooksPerMonth = parseFloat((booksCompletedAllTime / 12).toFixed(1));

    const pace = {
      avgPagesPerDay: stats.average_pages_per_day,
      avgBooksPerMonth,
      avgDaysToFinish,
      fastestBook,
      longestBook,
    };

    // 8. Generate delight personalized shareable insights
    const totalPages = stats.total_pages_read;
    const everestHeightMm = 8849000; // Mt Everest height in mm
    const paperThicknessMm = 0.1; // typical thickness of a page in mm
    const heightClimbedMm = totalPages * paperThicknessMm;
    const everestClimbs = parseFloat((heightClimbedMm / everestHeightMm).toFixed(4));
    const everestClimbsScaled = (everestClimbs * 10000).toFixed(1); // scalable metric

    const insights = [
      `Your favorite genre is ${stats.favorite_genre}.`,
      `Your average completed book length is ${stats.average_book_length} pages.`,
      `You've logged ${stats.total_pages_read} pages, which is equivalent to ~${Math.round(stats.total_pages_read / 350)} standard volumes!`,
      `Your pages read could climb Mount Everest ${everestClimbsScaled} times if each page were stacked flat!`,
      `Your current reading streak is a stellar ${stats.reading_streak} days, with a record of ${stats.longest_streak} days.`
    ];

    const mappedStats = {
      ...stats,
      total_books_completed: stats.books_completed,
      total_pages_read: stats.total_pages_read,
      current_streak: stats.reading_streak,
      longest_streak: stats.longest_streak,
      total_reading_hours: parseFloat((stats.total_pages_read / 45).toFixed(1)),
      average_pages_per_day: stats.average_pages_per_day,
      average_book_length: stats.average_book_length,
      favorite_genre: stats.favorite_genre,
    };

    return NextResponse.json({
      success: true,
      stats: mappedStats,
      heatmap: heatmapRows,
      charts: {
        last7Days,
        last30Days,
        last12Months,
        booksFinishedComparison,
      },
      genreDistribution,
      timeline,
      pace,
      insights,
    });
  } catch (error: any) {
    console.error("Fetch reading stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
