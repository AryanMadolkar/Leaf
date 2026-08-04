/** Ported from frontend/src/components/library/spineUtils.ts — deterministic
 * spine sizing/coloring so the mobile bookshelf visually matches the web one. */

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function spineWidthFromPages(pages?: number): number {
  if (!pages || pages <= 0) return 32;
  return clamp(Math.round(pages / 14), 20, 55);
}

export function spineHeightFromSeed(seed: string, pages?: number): number {
  const h = hashString(seed);
  let height = 130 + (h % 21); // scaled down for phone screens (web: 240-280)
  if (pages && pages >= 550) height = Math.min(160, height + 10);
  if (pages && pages >= 750) height = 160;
  return height;
}

export type SpinePalette = { bg: string; text: string; accent: string };

const PALETTES: SpinePalette[] = [
  { bg: "#2E4D38", text: "#F5E6C8", accent: "#C9A227" },
  { bg: "#4A2C1A", text: "#F0E0C8", accent: "#D4A574" },
  { bg: "#1C2A3A", text: "#E8DCC8", accent: "#8FA8C0" },
  { bg: "#5C1A1A", text: "#F2E6D0", accent: "#E8B86D" },
  { bg: "#3A3A3A", text: "#F0E8D8", accent: "#C0B8A8" },
  { bg: "#2A3F4A", text: "#EDE4D4", accent: "#A8C4B0" },
  { bg: "#5A3D2A", text: "#F5EAD8", accent: "#E0C090" },
  { bg: "#1F3A2E", text: "#E8F0E4", accent: "#B8D4A8" },
  { bg: "#3D2A4A", text: "#F0E8F4", accent: "#C8A8D8" },
  { bg: "#4A3A1A", text: "#F8F0D8", accent: "#E8D080" },
];

export function paletteFromSeed(seed: string): SpinePalette {
  return PALETTES[hashString(seed) % PALETTES.length];
}
