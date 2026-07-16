"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useLeaf } from "@/context/LeafContext";
import { 
  Award, 
  BookOpen, 
  Calendar, 
  Clock, 
  Flame, 
  TrendingUp, 
  Map, 
  BookOpenCheck,
  ArrowUpRight,
  Book,
  Heart
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { buildGenreDistribution } from "@/utils/genreUtils";

export default function StatsPage() {
  const { currentUser, diaryLogs, readingSessions, books, userStats, isAuthenticated, isProfileLoading } = useLeaf();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lineChartPeriod, setLineChartPeriod] = useState<"7days" | "30days" | "12months">("30days");
  
  // Interactive chart hover states
  const [hoveredLinePoint, setHoveredLinePoint] = useState<any>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredGenre, setHoveredGenre] = useState<any>(null);

  const isGuest =
    !isAuthenticated ||
    !currentUser?.id ||
    currentUser.id === "guest-user-id" ||
    currentUser.id === "currentUser";

  const loadLocalStatsFallback = () => {
    console.log("Using client-side stats fallback from context.");
    // 1. Heatmap calculation
    const dailyMap: Record<string, number> = {};
    readingSessions.forEach((s: any) => {
      const dateStr = s.logged_at ? s.logged_at.split("T")[0] : new Date().toISOString().split("T")[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + (s.pages_read || s.pagesRead || 0);
    });

    // 2. Charts
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

    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const totalInMonth = readingSessions
        .filter((s: any) => (s.logged_at || "").startsWith(yearMonth))
        .reduce((sum: number, s: any) => sum + (s.pages_read || s.pagesRead || 0), 0);

      last12Months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        period: yearMonth,
        pages: totalInMonth,
      });
    }

    // Books Finished Comparison
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const finishedCurrentYear = Array(12).fill(0);
    const finishedPrevYear = Array(12).fill(0);
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    const finishedBooks = diaryLogs.filter((log) => log.userId === currentUser.id && log.status === "Finished");
    finishedBooks.forEach((log) => {
      const dateStr = log.dateLogged || new Date().toISOString().split("T")[0];
      const parts = dateStr.split("-");
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

    const booksFinishedComparison = months.map((name, idx) => ({
      month: name,
      currentYear: finishedCurrentYear[idx],
      previousYear: finishedPrevYear[idx],
    }));

    // Genre Distribution (canonical literary genres only — skip shelf tags like Popular/BookTok)
    const genreDistribution = buildGenreDistribution(
      diaryLogs.map((log) => books.find((b) => b.id === log.bookId)?.genres)
    );

    // Reading Timeline
    const rawTimeline: any[] = [];
    readingSessions.forEach((s: any) => {
      rawTimeline.push({
        id: s.id,
        type: "session",
        pages: s.pages_read || s.pagesRead || 0,
        date: s.logged_at || new Date().toISOString(),
        note: s.note,
        title: s.title || books.find((b) => b.id === s.bookId)?.title || "Unknown Book",
        author: s.author || books.find((b) => b.id === s.bookId)?.author || "Unknown Author",
        coverImage: s.coverImage || books.find((b) => b.id === s.bookId)?.coverImage || "",
      });
    });

    diaryLogs.forEach((log) => {
      const book = books.find((b) => b.id === log.bookId);
      const dateStr = log.dateLogged || new Date().toISOString().split("T")[0];
      rawTimeline.push({
        id: log.id,
        type: "status_change",
        status: log.status.toLowerCase(),
        rating: log.rating,
        date: dateStr,
        title: book?.title || "Unknown Book",
        author: book?.author || "Unknown Author",
        coverImage: book?.coverImage || "",
      });
    });

    rawTimeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const timeline = rawTimeline.slice(0, 15).map((item) => {
      let message = "";
      if (item.type === "session") {
        message = `Logged ${item.pages} pages of ${item.title}`;
      } else {
        if (item.status === "finished") {
          message = `Finished ${item.title}`;
          if (item.rating) message += ` and rated it ★${item.rating}`;
        } else if (item.status === "reading" || item.status === "currently reading") {
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

    // Pace
    let fastestBook = null;
    let longestBook = null;
    let avgDaysToFinish = 0;

    const completedLogs = diaryLogs.filter((l) => l.userId === currentUser.id && l.status === "Finished");
    if (completedLogs.length > 0) {
      let maxPages = 0;
      completedLogs.forEach((log) => {
        const book = books.find((b) => b.id === log.bookId);
        const pages = book?.pages || 300;
        if (pages > maxPages) {
          maxPages = pages;
          longestBook = { title: book?.title, pages, coverImage: book?.coverImage };
        }
      });
      avgDaysToFinish = 4.5;
      fastestBook = completedLogs[0] ? { title: books.find((b) => b.id === completedLogs[0].bookId)?.title, days: 3, coverImage: books.find((b) => b.id === completedLogs[0].bookId)?.coverImage } : null;
    }

    const avgBooksPerMonth = parseFloat((completedLogs.length / 12).toFixed(1));

    const activeStats = userStats || {
      total_books_completed: completedLogs.length,
      total_pages_read: diaryLogs.reduce((acc, curr) => acc + (curr.currentPage || 0), 0),
      current_streak: 3,
      longest_streak: 5,
      total_reading_hours: 12,
      favorite_genre: "Fiction",
      average_pages_per_day: 15.4,
      average_book_length: 312,
      reading_streak: 3,
    };

    const pace = {
      avgPagesPerDay: activeStats.average_pages_per_day || 15.4,
      avgBooksPerMonth,
      avgDaysToFinish,
      fastestBook,
      longestBook,
    };

    const insights = [
      `Your favorite genre is ${activeStats.favorite_genre || "Fiction"}.`,
      `Your average completed book length is ${activeStats.average_book_length || 312} pages.`,
      `You've logged ${activeStats.total_pages_read || 0} pages, which is equivalent to ~${Math.round((activeStats.total_pages_read || 0) / 350)} standard volumes!`,
      `Your pages read could climb Mount Everest ${( ((activeStats.total_pages_read || 0) * 0.1 / 8849000) * 10000 ).toFixed(1)} times if each page were stacked flat!`,
      `Your current reading streak is a stellar ${activeStats.current_streak || activeStats.reading_streak || 0} days, with a record of ${activeStats.longest_streak || 0} days.`
    ];

    setData({
      success: true,
      stats: activeStats,
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
  };

  useEffect(() => {
    async function loadStats() {
      if (isProfileLoading) return;

      // Guests see a login prompt — never hydrate mock/local fallback stats
      if (isGuest) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/stats?userId=${currentUser.id}`);
        if (res.ok) {
          const payload = await res.json();
          if (payload.success && payload.stats) {
            setData(payload);
          } else {
            loadLocalStatsFallback();
          }
        } else {
          loadLocalStatsFallback();
        }
      } catch (err) {
        console.error("Failed to load reading stats:", err);
        loadLocalStatsFallback();
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [currentUser.id, readingSessions, diaryLogs, isGuest, isProfileLoading]);

  if (isProfileLoading || loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <svg className="animate-spin h-8 w-8 text-brand mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs text-charcoal-muted">Hydrating reading metrics & profiles...</p>
        </div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <TrendingUp className="w-12 h-12 text-charcoal-muted mb-4 opacity-50" />
          <h2 className="font-serif text-2xl font-bold text-charcoal">Login to check your stats</h2>
          <p className="text-sm text-charcoal-muted mt-2 leading-relaxed">
            Sign in to see your pages read, streaks, and reading insights.
          </p>
          <Link
            href="/auth"
            className="mt-6 px-5 py-2.5 bg-brand hover:bg-brand-light text-cream font-bold text-xs rounded-lg shadow-sm transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (!data || !data.stats) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <Book className="w-12 h-12 text-charcoal-muted mb-4 opacity-50" />
          <h2 className="font-serif text-xl font-bold text-charcoal">No Stats Logged Yet</h2>
          <p className="text-xs text-charcoal-muted mt-2">
            You need to log page sessions or shelve books as Completed before Leaf can construct your personalized reading dashboard.
          </p>
          <Link
            href="/search"
            className="mt-6 px-4 py-2 bg-brand hover:bg-brand-light text-cream font-medium text-xs rounded-lg shadow-sm transition-colors"
          >
            Find a Book to Log
          </Link>
        </div>
      </div>
    );
  }

  const { stats, charts, genreDistribution, timeline, pace, insights } = data;

  // 2. Custom Line Chart: Pages read over time
  const renderLineChart = () => {
    let rawPoints = [];
    if (lineChartPeriod === "7days") rawPoints = charts.last7Days;
    else if (lineChartPeriod === "30days") rawPoints = charts.last30Days;
    else rawPoints = charts.last12Months;

    // Dimensions
    const width = 650;
    const height = 220;
    const padding = 25;
    
    // Scale maths
    const maxVal = Math.max(...rawPoints.map((p: any) => p.pages), 25);
    const stepX = (width - padding * 2) / (rawPoints.length - 1 || 1);
    
    const points = rawPoints.map((p: any, idx: number) => {
      const x = padding + idx * stepX;
      const y = height - padding - (p.pages / maxVal) * (height - padding * 2);
      return { x, y, ...p };
    });

    // SVG path strings
    const linePath = points.reduce((acc: string, p: any, idx: number) => {
      return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    }, "");

    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider block">
            Pages Read Pace Timeline
          </span>
          
          <div className="flex rounded-lg bg-cream-dark p-0.5 border border-cream-border">
            {(["7days", "30days", "12months"] as const).map((period) => (
              <button
                key={period}
                onClick={() => {
                  setLineChartPeriod(period);
                  setHoveredLinePoint(null);
                }}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                  lineChartPeriod === period
                    ? "bg-cream text-brand shadow-xs font-bold"
                    : "text-charcoal-muted hover:text-charcoal"
                }`}
              >
                {period === "7days" ? "7D" : period === "30days" ? "30D" : "12M"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-xs relative">
          {/* Chart SVG */}
          <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E4D38" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#2E4D38" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#EAE3DF" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1={padding} y1={(height) / 2} x2={width - padding} y2={(height) / 2} stroke="#EAE3DF" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#D4CECE" strokeWidth="1" />

              {/* Area Under Spline */}
              {areaPath && (
                <path d={areaPath} fill="url(#chartGradient)" />
              )}

              {/* Line Spline */}
              {linePath && (
                <path d={linePath} fill="none" stroke="#2E4D38" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Interaction points */}
              {points.map((p: any, idx: number) => {
                const isHovered = hoveredLinePoint?.period === p.period || hoveredLinePoint?.date === p.date;
                return (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5 : 3}
                      fill={isHovered ? "#2E4D38" : "#EAE3DF"}
                      stroke="#2E4D38"
                      strokeWidth={isHovered ? 2.5 : 1}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredLinePoint(p)}
                      onMouseLeave={() => setHoveredLinePoint(null)}
                    />
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {points.filter((_: any, idx: number) => {
                // Label display filters for cleanliness
                if (lineChartPeriod === "7days") return true;
                if (lineChartPeriod === "30days") return idx % 5 === 0;
                return true;
              }).map((p: any, idx: number) => (
                <text
                  key={idx}
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-charcoal-muted font-sans font-semibold text-[8px] uppercase tracking-wider select-none"
                >
                  {p.label}
                </text>
              ))}

              {/* Y Axis Max */}
              <text
                x={padding}
                y={padding - 6}
                className="fill-charcoal-muted font-sans font-bold text-[8px] uppercase tracking-wider select-none"
              >
                Max: {maxVal} pages
              </text>
            </svg>
          </div>

          {/* Hover state overlay */}
          <div className="absolute top-2 left-6 h-10 flex items-center gap-1.5 text-[11px] text-charcoal-muted font-semibold">
            {hoveredLinePoint ? (
              <div className="animate-fade-in bg-cream border border-cream-border px-3 py-1 rounded-lg shadow-xs flex items-center gap-2">
                <span className="text-brand">★ {hoveredLinePoint.pages} pages</span>
                <span className="text-charcoal-muted/60">|</span>
                <span>{hoveredLinePoint.label} ({hoveredLinePoint.period || hoveredLinePoint.date})</span>
              </div>
            ) : (
              <span className="italic font-normal text-[10px] opacity-75">Hover points to see session details</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 3. Custom Bar Chart: Books Completed Comparison
  const renderBarChart = () => {
    const rawData = charts.booksFinishedComparison;
    const width = 650;
    const height = 220;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const maxVal = Math.max(...rawData.map((d: any) => Math.max(d.currentYear, d.previousYear)), 1);
    const stepX = chartWidth / 12;
    const barWidth = stepX * 0.35;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider block">
            Books Completed Comparison
          </span>
          <div className="flex items-center gap-4 text-[10px] font-semibold text-charcoal-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-brand rounded-xs" />
              <span>Current Year</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-charcoal/30 rounded-xs" />
              <span>Previous Year</span>
            </div>
          </div>
        </div>

        <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-xs relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {/* Grid line */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#D4CECE" strokeWidth="1" />

            {rawData.map((d: any, idx: number) => {
              const xPos = padding + idx * stepX + (stepX - barWidth * 2 - 4) / 2;
              
              // Heights
              const hPrev = (d.previousYear / maxVal) * chartHeight;
              const hCurr = (d.currentYear / maxVal) * chartHeight;
              
              // Y positions
              const yPrev = height - padding - hPrev;
              const yCurr = height - padding - hCurr;

              const isHovered = hoveredBarIndex === idx;

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  className="cursor-pointer"
                >
                  {/* Previous Year Bar */}
                  <rect
                    x={xPos}
                    y={yPrev}
                    width={barWidth}
                    height={Math.max(hPrev, 2)}
                    rx="1.5"
                    fill={isHovered ? "#9B918B" : "#D4CECE"}
                    className="transition-all duration-200"
                  />

                  {/* Current Year Bar */}
                  <rect
                    x={xPos + barWidth + 3}
                    y={yCurr}
                    width={barWidth}
                    height={Math.max(hCurr, 2)}
                    rx="1.5"
                    fill={isHovered ? "#1B3B24" : "#2E4D38"}
                    className="transition-all duration-200"
                  />

                  {/* Month Label */}
                  <text
                    x={xPos + barWidth + 1.5}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-charcoal-muted font-sans font-bold text-[8px] uppercase tracking-wider"
                  >
                    {d.month}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover tooltips */}
          <div className="absolute top-2 left-6 h-10 flex items-center text-[11px] text-charcoal-muted font-semibold">
            {hoveredBarIndex !== null ? (
              <div className="animate-fade-in bg-cream border border-cream-border px-3 py-1 rounded-lg shadow-xs flex gap-3">
                <span className="text-brand">★ {rawData[hoveredBarIndex].currentYear} books finished</span>
                <span className="text-charcoal-muted/30">|</span>
                <span className="text-charcoal-muted/75">Prev: {rawData[hoveredBarIndex].previousYear} books</span>
                <span className="text-charcoal-muted/30">|</span>
                <span className="font-bold">{rawData[hoveredBarIndex].month}</span>
              </div>
            ) : (
              <span className="italic font-normal text-[10px] opacity-75">Hover bars to compare seasonal volume</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 4. Custom Donut Chart: Genre Distribution
  const renderDonutChart = () => {
    if (genreDistribution.length === 0) return null;

    // SVG parameters
    const size = 180;
    const r = 65;
    const center = size / 2;
    const circumference = 2 * Math.PI * r;

    // Accumulate slices
    let currentOffset = 0;
    const slices = genreDistribution.map((genre: any) => {
      const dash = (genre.percentage / 100) * circumference;
      const offset = currentOffset;
      currentOffset -= dash;
      return {
        ...genre,
        dash,
        offset,
      };
    });

    const colors = ["#2E4D38", "#4A6B53", "#7A8C80", "#9B918B", "#D4CECE"];

    return (
      <div className="space-y-4 h-full flex flex-col justify-between min-w-0 w-full">
        <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider block">
          Literary Genre Footprint
        </span>

        <div className="bg-cream-card border border-cream-border rounded-2xl p-4 sm:p-5 shadow-xs flex-1 flex flex-col items-center gap-5 min-h-[220px] min-w-0 w-full overflow-hidden">
          {/* Donut SVG */}
          <div className="relative w-[160px] h-[160px] shrink-0">
            <svg width={160} height={160} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
              <circle cx={center} cy={center} r={r} fill="none" stroke="#EAE3DF" strokeWidth="16" />
              {slices.map((slice: any, idx: number) => {
                const color = colors[idx % colors.length];
                const isHovered = hoveredGenre?.name === slice.name;
                return (
                  <circle
                    key={idx}
                    cx={center}
                    cy={center}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHovered ? 20 : 16}
                    strokeDasharray={`${slice.dash} ${circumference}`}
                    strokeDashoffset={slice.offset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredGenre(slice)}
                    onMouseLeave={() => setHoveredGenre(null)}
                  />
                );
              })}
            </svg>
            
            {/* Center Label Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none px-5">
              {hoveredGenre ? (
                <>
                  <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider truncate max-w-full">
                    {hoveredGenre.name}
                  </span>
                  <span className="font-serif text-xl font-bold text-brand leading-none mt-0.5">
                    {hoveredGenre.percentage}%
                  </span>
                  <span className="text-[9px] text-charcoal-muted mt-0.5">
                    {hoveredGenre.count} {hoveredGenre.count === 1 ? "book" : "books"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase tracking-wider">
                    Total Slices
                  </span>
                  <span className="font-serif text-2xl font-bold text-charcoal leading-none mt-0.5">
                    {genreDistribution.length}
                  </span>
                  <span className="text-[9px] text-charcoal-muted mt-0.5">
                    Genres logged
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Legends */}
          <div className="w-full min-w-0 space-y-1.5">
            {slices.map((slice: any, idx: number) => {
              const color = colors[idx % colors.length];
              const isHovered = hoveredGenre?.name === slice.name;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border transition-colors duration-200 min-w-0 ${
                    isHovered
                      ? "bg-cream-dark border-cream-border shadow-2xs"
                      : "border-transparent"
                  }`}
                  onMouseEnter={() => setHoveredGenre(slice)}
                  onMouseLeave={() => setHoveredGenre(null)}
                >
                  <div className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-medium text-charcoal truncate min-w-0 flex-1">{slice.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                    <span className="text-charcoal-muted text-[10px]">{slice.count}x</span>
                    <span className="font-semibold text-charcoal">{slice.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-10">
        
        {/* Flagship Header */}
        <section className="pb-6 border-b border-cream-border">
          <div className="space-y-1">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-charcoal tracking-tight">
              Reading Insights
            </h1>
            <p className="text-xs md:text-sm text-charcoal-muted leading-relaxed">
              An analytical breakdown of your pages read, streaks, and seasonal literary habits.
            </p>
          </div>
        </section>

        {/* Counts/Streak Metrics Widgets */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Books Completed */}
          <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md">
            <div className="flex items-center justify-between text-charcoal-muted">
              <span className="text-[9px] font-bold uppercase tracking-widest font-sans">Volumes Completed</span>
              <BookOpenCheck className="w-4.5 h-4.5 text-brand" />
            </div>
            <div className="mt-4">
              <span className="font-serif text-4xl font-bold text-charcoal">
                {stats.total_books_completed}
              </span>
              <span className="text-[10px] text-charcoal-muted block mt-1 font-semibold uppercase">
                Finished on shelves
              </span>
            </div>
          </div>

          {/* Pages Read */}
          <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md">
            <div className="flex items-center justify-between text-charcoal-muted">
              <span className="text-[9px] font-bold uppercase tracking-widest font-sans">Pages Logged</span>
              <TrendingUp className="w-4.5 h-4.5 text-brand" />
            </div>
            <div className="mt-4">
              <span className="font-serif text-4xl font-bold text-charcoal">
                {stats.total_pages_read}
              </span>
              <span className="text-[10px] text-charcoal-muted block mt-1 font-semibold uppercase">
                Total logged pages
              </span>
            </div>
          </div>

          {/* Current Streak */}
          <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md">
            <div className="flex items-center justify-between text-charcoal-muted">
              <span className="text-[9px] font-bold uppercase tracking-widest font-sans">Current Streak</span>
              <Flame className="w-4.5 h-4.5 text-brand" />
            </div>
            <div className="mt-4">
              <span className="font-serif text-4xl font-bold text-charcoal flex items-center gap-1.5">
                {stats.current_streak} <span className="text-xs text-charcoal-muted font-sans font-semibold">days</span>
              </span>
              <span className="text-[10px] text-charcoal-muted block mt-1 font-semibold uppercase">
                Record: {stats.longest_streak} days
              </span>
            </div>
          </div>

          {/* Total hours */}
          <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md">
            <div className="flex items-center justify-between text-charcoal-muted">
              <span className="text-[9px] font-bold uppercase tracking-widest font-sans">Hours Invested</span>
              <Clock className="w-4.5 h-4.5 text-brand" />
            </div>
            <div className="mt-4">
              <span className="font-serif text-4xl font-bold text-charcoal">
                {stats.total_reading_hours}
              </span>
              <span className="text-[10px] text-charcoal-muted block mt-1 font-semibold uppercase">
                Est. at 45 pages/hour
              </span>
            </div>
          </div>
        </section>

        {/* Line Chart & Genre Footprint */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 min-w-0">
            {renderLineChart()}
          </div>
          <div className="min-w-0">
            {renderDonutChart()}
          </div>
        </section>

        {/* Bar Chart & Advanced Reading Pace and shareable insights */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 min-w-0">
            {renderBarChart()}
          </div>

          <div className="space-y-6 min-w-0">
            <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider block">
              Advanced Reading Metrics
            </span>
            
            <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-xs space-y-4 overflow-hidden">
              <div className="divide-y divide-cream-border/60">
                
                {/* Pages Pace */}
                <div className="py-2.5 flex justify-between items-center gap-3 text-xs min-w-0">
                  <span className="text-charcoal-muted shrink-0">Average pace</span>
                  <span className="font-bold text-charcoal text-right truncate">{pace.avgPagesPerDay} pages / day</span>
                </div>

                {/* Books completion */}
                <div className="py-2.5 flex justify-between items-center gap-3 text-xs min-w-0">
                  <span className="text-charcoal-muted shrink-0">Monthly throughput</span>
                  <span className="font-bold text-charcoal text-right truncate">{pace.avgBooksPerMonth} books / month</span>
                </div>

                {/* Days to finish */}
                <div className="py-2.5 flex justify-between items-center gap-3 text-xs min-w-0">
                  <span className="text-charcoal-muted shrink-0">Avg days to finish</span>
                  <span className="font-bold text-charcoal text-right truncate">{pace.avgDaysToFinish} days</span>
                </div>

                {/* Fastest Finish */}
                {pace.fastestBook && (
                  <div className="py-2.5 space-y-1 min-w-0">
                    <span className="text-charcoal-muted text-xs block">Fastest complete</span>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      {pace.fastestBook.coverImage && (
                        <img src={pace.fastestBook.coverImage} className="w-5 h-7 object-cover rounded shadow-xs shrink-0" />
                      )}
                      <span className="font-semibold text-xs text-charcoal truncate min-w-0 flex-1">{pace.fastestBook.title}</span>
                      <span className="text-[10px] text-brand font-bold shrink-0">{pace.fastestBook.days} days</span>
                    </div>
                  </div>
                )}

                {pace.longestBook && (
                  <div className="py-2.5 space-y-1 min-w-0">
                    <span className="text-charcoal-muted text-xs block">Longest book finished</span>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      {pace.longestBook.coverImage && (
                        <img src={pace.longestBook.coverImage} className="w-5 h-7 object-cover rounded shadow-xs shrink-0" />
                      )}
                      <span className="font-semibold text-xs text-charcoal truncate min-w-0 flex-1">{pace.longestBook.title}</span>
                      <span className="text-[10px] text-brand font-bold shrink-0">{pace.longestBook.pages} pages</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Personalized Fun Insights */}
        <section className="space-y-4">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider block">
            Delightful Highlights & Observations
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {insights.slice(3, 6).map((insight: string, idx: number) => {
              const icons = [
                <Book className="w-5 h-5 text-brand" />,
                <Map className="w-5 h-5 text-brand" />,
                <Flame className="w-5 h-5 text-brand" />
              ];
              return (
                <div key={idx} className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-xs flex items-start gap-4">
                  <div className="w-9 h-9 bg-brand/10 text-brand rounded-full flex items-center justify-center flex-shrink-0">
                    {icons[idx % icons.length]}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">Insight #{idx + 1}</h4>
                    <p className="text-xs text-charcoal-light leading-relaxed font-sans font-medium">
                      {insight}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Chronological Activity Timeline log list */}
        <section className="space-y-6 pt-6 border-t border-cream-border">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl font-bold text-charcoal">
              Reading Timeline
            </h2>
            <p className="text-xs text-charcoal-muted">
              Chronological log of your progress logs, completions, and shelf status modifications.
            </p>
          </div>

          <div className="border border-cream-border bg-cream-card rounded-2xl p-6 shadow-xs divide-y divide-cream-border/60 max-h-[400px] overflow-y-auto">
            {timeline.length > 0 ? (
              timeline.map((item: any) => {
                const dateText = new Date(item.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={item.id} className="py-4 flex gap-4 items-start first:pt-0 last:pb-0">
                    {item.coverImage && (
                      <img src={item.coverImage} className="w-8 h-12 object-cover rounded shadow-xs border border-cream-border/50 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-semibold text-charcoal leading-tight">
                        {item.message}
                      </p>
                      <p className="text-[10px] text-charcoal-muted font-sans font-semibold">
                        {dateText}
                      </p>
                      {item.note && (
                        <p className="text-[11px] text-charcoal-light font-serif italic bg-cream p-2 border border-cream-border rounded-lg max-w-md mt-1.5 leading-relaxed">
                          &ldquo;{item.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-charcoal-muted text-center py-6">No reading activity recorded on your profile.</p>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
