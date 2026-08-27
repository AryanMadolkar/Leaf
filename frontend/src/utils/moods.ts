/** Mood ids shared by Discover UI and recommend API (client-safe). */
export const MOODS = [
  { id: "cozy", label: "Cozy", hint: "Warm, gentle, low stakes" },
  { id: "thrilling", label: "Thrilling", hint: "Suspense and pace" },
  { id: "thoughtful", label: "Thoughtful", hint: "Ideas and literary depth" },
  { id: "romantic", label: "Romantic", hint: "Heart-forward stories" },
  { id: "epic", label: "Epic", hint: "Worlds and journeys" },
  { id: "dark", label: "Dark", hint: "Bleak, intense, uncanny" },
  { id: "funny", label: "Funny", hint: "Wit and lightness" },
  { id: "true", label: "True stories", hint: "Memoir and nonfiction" },
] as const;

export type MoodId = (typeof MOODS)[number]["id"];
