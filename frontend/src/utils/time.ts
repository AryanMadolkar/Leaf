/** Relative time label for community stream cards. */
export function formatRelativeTime(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return "just now";
  const then = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  if (Number.isNaN(then.getTime())) return "just now";

  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
