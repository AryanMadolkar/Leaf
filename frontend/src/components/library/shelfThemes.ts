export type ShelfThemeId = "walnut" | "oak" | "dark" | "minimal" | "modern" | "vintage";

/** Luxury built-in bookshelf backing — warm parchment/linen */
export const BOOKCASE_WALL =
  "linear-gradient(180deg, #F2ECDD 0%, #EEE6D6 52%, #E8DECC 100%)";

export const SHELF_THEMES: Record<
  ShelfThemeId,
  {
    label: string;
    plank: string;
    edge: string;
    wall: string;
    shadow: string;
  }
> = {
  walnut: {
    label: "Walnut",
    plank: "linear-gradient(180deg, #9A7340 0%, #7A5528 35%, #5C3E1A 100%)",
    edge: "#3D2A0A",
    wall: BOOKCASE_WALL,
    shadow: "rgba(61, 42, 10, 0.35)",
  },
  oak: {
    label: "Oak",
    plank: "linear-gradient(180deg, #C4A574 0%, #A67C52 45%, #8B6914 100%)",
    edge: "#6B4F2A",
    wall: BOOKCASE_WALL,
    shadow: "rgba(107, 79, 42, 0.3)",
  },
  dark: {
    label: "Dark Library",
    plank: "linear-gradient(180deg, #3A3228 0%, #2A241C 50%, #1A1612 100%)",
    edge: "#0F0D0A",
    wall: BOOKCASE_WALL,
    shadow: "rgba(0, 0, 0, 0.45)",
  },
  minimal: {
    label: "Minimal White",
    plank: "linear-gradient(180deg, #F5F2EB 0%, #E8E2D6 100%)",
    edge: "#D4CEC2",
    wall: BOOKCASE_WALL,
    shadow: "rgba(28, 28, 26, 0.12)",
  },
  modern: {
    label: "Modern Floating",
    plank: "linear-gradient(180deg, #4A5560 0%, #2D343C 100%)",
    edge: "#1A1F24",
    wall: BOOKCASE_WALL,
    shadow: "rgba(26, 31, 36, 0.35)",
  },
  vintage: {
    label: "Vintage",
    plank: "linear-gradient(180deg, #A67B5B 0%, #8B5E3C 40%, #6F4A2E 100%)",
    edge: "#4A301C",
    wall: BOOKCASE_WALL,
    shadow: "rgba(74, 48, 28, 0.35)",
  },
};
