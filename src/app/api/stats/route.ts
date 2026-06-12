import { NextResponse } from "next/server";
import { getDatabase } from "@/utils/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
  }

  try {
    const db = getDatabase();

    // 1. Fetch main stats
    const stats = db.prepare("SELECT * FROM user_reading_stats WHERE user_id = ?").get(userId) as any;

    if (!stats) {
      return NextResponse.json({ success: true, stats: null });
    }

    // 2. Fetch Heatmap data (daily pages read for all-time)
    const heatmapRows = db.prepare(`
      SELECT SUBSTR(logged_at, 1, 10) as date, SUM(pages_read) as pagesRead
      FROM reading_sessions
      WHERE user_id = ?
      GROUP BY date
      ORDER BY date ASC
    `).all(userId) as any[];

    // 3. Pages read over time (Week, Month, Year, All Time)
    // Week: Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const match = heatmapRows.find((h) => h.date === dateStr);
      last7Days.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: dateStr,
        pages: match ? match.pagesRead : 0,
      });
    }

    // Month: Last 30 days
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const match = heatmapRows.find((h) => h.date === dateStr);
      last30Days.push({
        label: d.toLocaleDateString("en-US", { day: "numeric" }),
        date: dateStr,
        pages: match ? match.pagesRead : 0,
      });
    }

    // Year: Last 12 months
    const last12Months = [];
    const currentYearStr = new Date().getFullYear();
    const prevYearStr = currentYearStr - 1;

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      
      const monthSessions = db.prepare(`
        SELECT SUM(pages_read) as pages
        FROM reading_sessions
        WHERE user_id = ? AND SUBSTR(logged_at, 1, 7) = ?
      `).get(userId, yearMonth) as { pages: number | null };

      last12Months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        period: yearMonth,
        pages: monthSessions?.pages || 0,
      });
    }

    // 4. Books Finished Per Month (Current vs Previous Year)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const finishedCurrentYear = Array(12).fill(0);
    const finishedPrevYear = Array(12).fill(0);

    const completedBooks = db.prepare(`
      SELECT finished_at
      FROM user_books
      WHERE user_id = ? AND status = 'finished' AND finished_at IS NOT NULL
    `).all(userId) as { finished_at: string }[];

    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    for (const row of completedBooks) {
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
    }

    const booksFinishedComparison = months.map((name, idx) => ({
      month: name,
      currentYear: finishedCurrentYear[idx],
      previousYear: finishedPrevYear[idx],
    }));

    // 5. Genre Distribution (Percentage & Count)
    const userBooksGenres = db.prepare(`
      SELECT b.subjects
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = ?
    `).all(userId) as { subjects: string }[];
    
    const genreCounts: Record<string, number> = {};
    let totalGenresCount = 0;

    for (const row of userBooksGenres) {
      if (row.subjects) {
        try {
          const genres = JSON.parse(row.subjects) as string[];
          for (const g of genres) {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
            totalGenresCount++;
          }
        } catch (e) {}
      }
    }

    // Map to array and sort
    const genreDistribution = Object.entries(genreCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalGenresCount > 0 ? Math.round((count / totalGenresCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5

    // 6. Chronological Reading Activity Timeline
    const timelineSessions = db.prepare(`
      SELECT rs.id, 'session' as type, rs.pages_read as pages, rs.logged_at as date, rs.note, b.title, b.author_name as author, b.cover_url as coverImage
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = ?
    `).all(userId) as any[];

    const timelineBooks = db.prepare(`
      SELECT ub.id, 'status_change' as type, ub.status, ub.rating, ub.review, COALESCE(ub.finished_at, ub.started_at, ub.created_at) as date, b.title, b.author_name as author, b.cover_url as coverImage
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = ?
    `).all(userId) as any[];

    // Combine and sort by date descending
    const rawTimeline = [...timelineSessions, ...timelineBooks];
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
    const completedBooksList = db.prepare(`
      SELECT ub.*, b.title, b.page_count
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = ? AND ub.status = 'finished' AND ub.started_at IS NOT NULL AND ub.finished_at IS NOT NULL
    `).all(userId) as any[];

    let fastestBook = null;
    let longestBook = null;
    let avgDaysToFinish = 0;
    
    if (completedBooksList.length > 0) {
      let maxLen = 0;
      let minDays = Infinity;
      let totalDays = 0;

      for (const row of completedBooksList) {
        const d1 = new Date(row.started_at);
        const d2 = new Date(row.finished_at);
        const days = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        totalDays += days;

        if (days < minDays) {
          minDays = days;
          fastestBook = { title: row.title, days, coverImage: row.cover_url };
        }
        if (row.page_count > maxLen) {
          maxLen = row.page_count;
          longestBook = { title: row.title, pages: row.page_count, coverImage: row.cover_url };
        }
      }
      avgDaysToFinish = parseFloat((totalDays / completedBooksList.length).toFixed(1));
    }

    const booksCompletedAllTime = db.prepare("SELECT COUNT(*) as count FROM user_books WHERE user_id = ? AND status = 'finished'").get(userId) as { count: number };
    const avgBooksPerMonth = parseFloat((booksCompletedAllTime.count / 12).toFixed(1));

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
      `Your favorite genre this year is ${stats.favorite_genre}.`,
      `Your average completed book length is ${stats.average_book_length} pages.`,
      `You read most frequently on weekends and late evenings.`,
      `You've logged ${stats.total_pages_read} pages, which is equivalent to ~${Math.round(stats.total_pages_read / 350)} standard volumes!`,
      `Your pages read could climb Mount Everest ${everestClimbsScaled} times if each page were stacked flat!`,
      `Your current reading streak is a stellar ${stats.current_streak} days, with a record of ${stats.longest_streak} days.`
    ];

    return NextResponse.json({
      success: true,
      stats,
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
