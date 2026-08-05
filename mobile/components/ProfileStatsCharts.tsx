import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import type {
  BooksFinishedMonth,
  FullStatsPayload,
  GenreSlice,
  PaceStats,
  StatsPoint,
} from "@/lib/stats";
import { colors, fonts, radii, shadows } from "@/constants/theme";

const GENRE_COLORS = ["#2E4D38", "#4A6B53", "#7A8C80", "#9B918B", "#D4CECE"];

type Period = "7days" | "30days" | "12months";

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function PagesLineChart({
  last7Days,
  last30Days,
  last12Months,
}: {
  last7Days: StatsPoint[];
  last30Days: StatsPoint[];
  last12Months: StatsPoint[];
}) {
  const [period, setPeriod] = useState<Period>("7days");
  const [width, setWidth] = useState(320);
  const [selected, setSelected] = useState<StatsPoint | null>(null);

  const rawPoints =
    period === "7days" ? last7Days : period === "30days" ? last30Days : last12Months;

  const height = 180;
  const padding = 22;
  const maxVal = Math.max(...rawPoints.map((p) => p.pages), 25);
  const stepX = (width - padding * 2) / Math.max(rawPoints.length - 1, 1);

  const points = rawPoints.map((p, idx) => {
    const x = padding + idx * stepX;
    const y = height - padding - (p.pages / maxVal) * (height - padding * 2);
    return { x, y, ...p };
  });

  const linePath = points.reduce(
    (acc, p, idx) => acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
    ""
  );
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

  const labelEvery =
    period === "7days" ? 1 : period === "30days" ? 5 : 1;

  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <SectionLabel>Pages read pace</SectionLabel>
        <View style={styles.periodRow}>
          {([
            ["7days", "7D"],
            ["30days", "30D"],
            ["12months", "12M"],
          ] as const).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => {
                setPeriod(key);
                setSelected(null);
              }}
              style={[styles.periodChip, period === key && styles.periodChipActive]}
            >
              <Text style={[styles.periodText, period === key && styles.periodTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Card>
        <Text style={styles.hint}>
          {selected
            ? `${selected.pages} pages · ${selected.label}`
            : `Max ${maxVal} pages · tap a point`}
        </Text>
        <View
          style={{ height }}
          onLayout={(e: LayoutChangeEvent) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== width) setWidth(w);
          }}
        >
          <Svg width={width} height={height} pointerEvents="none">
            <Defs>
              <LinearGradient id="pagesFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.brand} stopOpacity="0.22" />
                <Stop offset="100%" stopColor={colors.brand} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Line
              x1={padding}
              y1={padding}
              x2={width - padding}
              y2={padding}
              stroke={colors.creamBorder}
              strokeWidth={0.8}
              strokeDasharray="3 3"
            />
            <Line
              x1={padding}
              y1={height / 2}
              x2={width - padding}
              y2={height / 2}
              stroke={colors.creamBorder}
              strokeWidth={0.8}
              strokeDasharray="3 3"
            />
            <Line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#D4CECE"
              strokeWidth={1}
            />
            {areaPath ? <Path d={areaPath} fill="url(#pagesFill)" /> : null}
            {linePath ? (
              <Path
                d={linePath}
                fill="none"
                stroke={colors.brand}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {points.map((p, idx) => {
              const active =
                selected?.date === p.date ||
                selected?.period === p.period ||
                (selected?.label === p.label && selected?.pages === p.pages);
              return (
                <Circle
                  key={`${p.label}-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={active ? 5 : 3}
                  fill={active ? colors.brand : colors.creamDark}
                  stroke={colors.brand}
                  strokeWidth={active ? 2.5 : 1}
                />
              );
            })}
            {points
              .filter((_, idx) => idx % labelEvery === 0)
              .map((p, idx) => (
                <SvgText
                  key={`label-${idx}`}
                  x={p.x}
                  y={height - 6}
                  fill={colors.charcoalMuted}
                  fontSize="8"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              ))}
          </Svg>
          {points.map((p, idx) => (
            <Pressable
              key={`hit-${p.label}-${idx}`}
              onPress={() => setSelected(p)}
              style={[styles.chartHit, { left: p.x - 14, top: p.y - 14 }]}
              hitSlop={4}
            />
          ))}
        </View>
      </Card>
    </View>
  );
}

function GenreDonut({ genres }: { genres: GenreSlice[] }) {
  if (genres.length === 0) return null;

  const size = 160;
  const r = 58;
  const center = size / 2;
  const circumference = 2 * Math.PI * r;
  const [selected, setSelected] = useState<GenreSlice | null>(null);

  let offset = 0;
  const slices = genres.map((genre) => {
    const dash = (genre.percentage / 100) * circumference;
    const slice = { ...genre, dash, offset };
    offset -= dash;
    return slice;
  });

  return (
    <View style={styles.block}>
      <SectionLabel>Literary genre footprint</SectionLabel>
      <Card>
        <View style={styles.donutWrap}>
          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }} pointerEvents="none">
              <Circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={colors.creamBorder}
                strokeWidth={16}
              />
              {slices.map((slice, idx) => (
                <Circle
                  key={slice.name}
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke={GENRE_COLORS[idx % GENRE_COLORS.length]}
                  strokeWidth={selected?.name === slice.name ? 20 : 16}
                  strokeDasharray={`${slice.dash} ${circumference}`}
                  strokeDashoffset={slice.offset}
                />
              ))}
            </Svg>
            <View style={styles.donutCenter} pointerEvents="none">
              {selected ? (
                <>
                  <Text style={styles.donutSmall} numberOfLines={1}>
                    {selected.name}
                  </Text>
                  <Text style={styles.donutBig}>{selected.percentage}%</Text>
                  <Text style={styles.donutSmall}>
                    {selected.count} {selected.count === 1 ? "book" : "books"}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.donutSmall}>Genres</Text>
                  <Text style={styles.donutBig}>{genres.length}</Text>
                  <Text style={styles.donutSmall}>logged</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.legend}>
            {slices.map((slice, idx) => (
              <Pressable
                key={slice.name}
                style={[styles.legendRow, selected?.name === slice.name && styles.legendRowActive]}
                onPress={() => setSelected(slice)}
              >
                <View
                  style={[styles.legendDot, { backgroundColor: GENRE_COLORS[idx % GENRE_COLORS.length] }]}
                />
                <Text style={styles.legendName} numberOfLines={1}>
                  {slice.name}
                </Text>
                <Text style={styles.legendPct}>{slice.percentage}%</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Card>
    </View>
  );
}

function FinishedBarChart({ data }: { data: BooksFinishedMonth[] }) {
  const [width, setWidth] = useState(320);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const height = 180;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxVal = Math.max(...data.map((d) => Math.max(d.currentYear, d.previousYear)), 1);
  const stepX = chartWidth / 12;
  const barWidth = stepX * 0.32;

  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <SectionLabel>Books completed</SectionLabel>
        <View style={styles.legendInline}>
          <View style={styles.legendInlineItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.brand }]} />
            <Text style={styles.legendInlineText}>This year</Text>
          </View>
          <View style={styles.legendInlineItem}>
            <View style={[styles.legendDot, { backgroundColor: "#D4CECE" }]} />
            <Text style={styles.legendInlineText}>Last year</Text>
          </View>
        </View>
      </View>
      <Card>
        <Text style={styles.hint}>
          {selectedIdx != null
            ? `${data[selectedIdx].month}: ${data[selectedIdx].currentYear} this year · ${data[selectedIdx].previousYear} last year`
            : "Tap a month to compare"}
        </Text>
        <View
          style={{ height }}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== width) setWidth(w);
          }}
        >
          <Svg width={width} height={height} pointerEvents="none">
            <Line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#D4CECE"
              strokeWidth={1}
            />
            {data.map((d, idx) => {
              const xPos = padding + idx * stepX + (stepX - barWidth * 2 - 3) / 2;
              const hPrev = (d.previousYear / maxVal) * chartHeight;
              const hCurr = (d.currentYear / maxVal) * chartHeight;
              const yPrev = height - padding - hPrev;
              const yCurr = height - padding - hCurr;
              const active = selectedIdx === idx;
              return (
                <React.Fragment key={d.month}>
                  <Rect
                    x={xPos}
                    y={yPrev}
                    width={barWidth}
                    height={Math.max(hPrev, 2)}
                    rx={1.5}
                    fill={active ? "#9B918B" : "#D4CECE"}
                  />
                  <Rect
                    x={xPos + barWidth + 3}
                    y={yCurr}
                    width={barWidth}
                    height={Math.max(hCurr, 2)}
                    rx={1.5}
                    fill={active ? "#1B3B24" : colors.brand}
                  />
                  {(idx % 2 === 0 || width > 360) && (
                    <SvgText
                      x={xPos + barWidth + 1.5}
                      y={height - 8}
                      fill={colors.charcoalMuted}
                      fontSize="7"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {d.month.slice(0, 1)}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
          {data.map((d, idx) => {
            const xPos = padding + idx * stepX;
            return (
              <Pressable
                key={`bar-hit-${d.month}`}
                onPress={() => setSelectedIdx(idx)}
                style={{
                  position: "absolute",
                  left: xPos,
                  top: padding,
                  width: stepX,
                  height: chartHeight + 8,
                }}
              />
            );
          })}
        </View>
      </Card>
    </View>
  );
}

function PaceCard({ pace }: { pace: PaceStats }) {
  return (
    <View style={styles.block}>
      <SectionLabel>Reading pace</SectionLabel>
      <View style={styles.paceGrid}>
        <View style={styles.paceTile}>
          <Text style={styles.paceValue}>{pace.avgPagesPerDay || 0}</Text>
          <Text style={styles.paceLabel}>Avg pages / day</Text>
        </View>
        <View style={styles.paceTile}>
          <Text style={styles.paceValue}>{pace.avgBooksPerMonth || 0}</Text>
          <Text style={styles.paceLabel}>Books / month</Text>
        </View>
        <View style={styles.paceTile}>
          <Text style={styles.paceValue}>{pace.avgDaysToFinish || "—"}</Text>
          <Text style={styles.paceLabel}>Days to finish</Text>
        </View>
      </View>
      {(pace.fastestBook?.title || pace.longestBook?.title) && (
        <Card>
          {pace.fastestBook?.title ? (
            <Text style={styles.paceNote}>
              Fastest finish: <Text style={styles.paceEm}>{pace.fastestBook.title}</Text>
              {pace.fastestBook.days != null ? ` · ${pace.fastestBook.days}d` : ""}
            </Text>
          ) : null}
          {pace.longestBook?.title ? (
            <Text style={styles.paceNote}>
              Longest book: <Text style={styles.paceEm}>{pace.longestBook.title}</Text>
              {pace.longestBook.pages != null ? ` · ${pace.longestBook.pages}p` : ""}
            </Text>
          ) : null}
        </Card>
      )}
    </View>
  );
}

function InsightsCard({ insights }: { insights: string[] }) {
  if (!insights.length) return null;
  return (
    <View style={styles.block}>
      <SectionLabel>Highlights</SectionLabel>
      <View style={{ gap: 8 }}>
        {insights.slice(0, 4).map((insight, idx) => (
          <View key={idx} style={styles.insightCard}>
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TimelineCard({
  timeline,
}: {
  timeline: FullStatsPayload["timeline"];
}) {
  if (!timeline?.length) return null;
  return (
    <View style={styles.block}>
      <SectionLabel>Recent activity</SectionLabel>
      <Card>
        <View style={{ gap: 12 }}>
          {timeline.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.timelineMessage}>{item.message}</Text>
                <Text style={styles.timelineDate}>
                  {new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

export default function ProfileStatsCharts({ data }: { data: FullStatsPayload }) {
  const hours = useMemo(() => {
    if (data.stats?.total_reading_hours != null) return data.stats.total_reading_hours;
    const pages = data.stats?.total_pages_read || 0;
    return parseFloat((pages / 45).toFixed(1));
  }, [data.stats]);

  if (!data.charts) return null;

  const completed = data.stats?.total_books_completed ?? data.stats?.books_completed ?? 0;
  const streak = data.stats?.current_streak ?? data.stats?.reading_streak ?? 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Reading stats</Text>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{completed}</Text>
          <Text style={styles.metricLabel}>Volumes</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{data.stats?.total_pages_read || 0}</Text>
          <Text style={styles.metricLabel}>Pages</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{streak}</Text>
          <Text style={styles.metricLabel}>Streak</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{hours}</Text>
          <Text style={styles.metricLabel}>Hours</Text>
        </View>
      </View>

      <PagesLineChart
        last7Days={data.charts.last7Days || []}
        last30Days={data.charts.last30Days || []}
        last12Months={data.charts.last12Months || []}
      />
      <GenreDonut genres={data.genreDistribution || []} />
      <FinishedBarChart data={data.charts.booksFinishedComparison || []} />
      {data.pace ? <PaceCard pace={data.pace} /> : null}
      <InsightsCard insights={data.insights || []} />
      <TimelineCard timeline={data.timeline || []} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18, marginTop: 4 },
  heading: {
    fontSize: 22,
    fontFamily: fonts.serif,
    color: colors.charcoal,
    letterSpacing: -0.3,
  },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 70,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
    ...shadows.soft,
  },
  metricValue: { fontSize: 17, fontFamily: fonts.serif, color: colors.charcoal },
  metricLabel: {
    fontSize: 9,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  block: { gap: 8 },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  card: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.xl,
    padding: 14,
    gap: 8,
    ...shadows.soft,
  },
  periodRow: {
    flexDirection: "row",
    backgroundColor: colors.creamDark,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    padding: 2,
  },
  periodChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  periodChipActive: { backgroundColor: colors.creamCard },
  periodText: { fontSize: 10, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  periodTextActive: { color: colors.brand, fontFamily: fonts.sansBold },
  hint: { fontSize: 11, fontFamily: fonts.sans, color: colors.charcoalMuted, fontStyle: "italic" },
  chartHit: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  donutWrap: { alignItems: "center", gap: 14 },
  donutCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  donutSmall: {
    fontSize: 9,
    fontFamily: fonts.sansBold,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  donutBig: { fontSize: 22, fontFamily: fonts.serif, color: colors.charcoal, marginTop: 2 },
  legend: { width: "100%", gap: 4 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  legendRowActive: {
    backgroundColor: colors.creamDark,
    borderColor: colors.creamBorder,
  },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendName: { flex: 1, fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  legendPct: { fontSize: 11, fontFamily: fonts.sansBold, color: colors.charcoalMuted },
  legendInline: { flexDirection: "row", gap: 10 },
  legendInlineItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendInlineText: { fontSize: 10, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  paceGrid: { flexDirection: "row", gap: 8 },
  paceTile: {
    flex: 1,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    padding: 12,
    alignItems: "center",
    gap: 4,
    ...shadows.soft,
  },
  paceValue: { fontSize: 18, fontFamily: fonts.serif, color: colors.charcoal },
  paceLabel: {
    fontSize: 9,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoalMuted,
    textAlign: "center",
    textTransform: "uppercase",
  },
  paceNote: { fontSize: 12, fontFamily: fonts.sans, color: colors.charcoalLight, lineHeight: 17 },
  paceEm: { fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  insightCard: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    padding: 14,
    ...shadows.soft,
  },
  insightText: { fontSize: 12, fontFamily: fonts.sans, color: colors.charcoalLight, lineHeight: 18 },
  timelineRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
    marginTop: 4,
  },
  timelineMessage: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoal, lineHeight: 17 },
  timelineDate: { fontSize: 10, fontFamily: fonts.sans, color: colors.charcoalMuted },
});
