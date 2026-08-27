/** Shared DNF reason keys — stored in dnf_records.reasons */
export const DNF_REASONS = [
  { id: "too_slow", label: "Too slow", emoji: "🐌" },
  { id: "boring", label: "Boring", emoji: "😴" },
  { id: "no_connection", label: "Didn't connect with the characters", emoji: "🙅" },
  { id: "writing", label: "Didn't like the writing", emoji: "✍️" },
  { id: "confusing", label: "Too confusing", emoji: "🤔" },
  { id: "not_expected", label: "Not what I expected", emoji: "📖" },
  { id: "come_back", label: "I'll come back later", emoji: "⏳" },
  { id: "other", label: "Other", emoji: "✏️" },
] as const;

export type DnfReasonId = (typeof DNF_REASONS)[number]["id"];

export const VALID_DNF_REASON_IDS = new Set(DNF_REASONS.map((r) => r.id));

export type DnfPayload = {
  dnfReasons?: string[];
  dnfNote?: string;
  stoppedAtPage?: number | null;
  stoppedAtChapter?: string | null;
};
