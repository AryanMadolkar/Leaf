/** Deterministic spine sizing / colors for the mobile bookshelf. */

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

/** Wider spines so titles stay readable on phone. */
export function spineWidthFromPages(pages?: number): number {
  if (!pages || pages <= 0) return 34;
  return clamp(Math.round(pages / 12), 28, 52);
}

/** Tall enough for a readable vertical title run. */
export function spineHeightFromSeed(seed: string, pages?: number): number {
  const h = hashString(seed);
  let height = 148 + (h % 42); // 148–189
  if (pages && pages >= 550) height = Math.min(198, height + 12);
  if (pages && pages >= 750) height = 198;
  return height;
}

export type SpinePalette = {
  bg: string;
  bgDeep: string;
  text: string;
  accent: string;
  foil: boolean;
};

/** High-contrast bookstore spines (readable titles). */
const PALETTES: SpinePalette[] = [
  { bg: "#B71C1C", bgDeep: "#7F0000", text: "#FFF8E1", accent: "#FFD54F", foil: true },
  { bg: "#0D47A1", bgDeep: "#002171", text: "#E3F2FD", accent: "#90CAF9", foil: false },
  { bg: "#F9A825", bgDeep: "#C17900", text: "#1A1A1A", accent: "#1A1A1A", foil: false },
  { bg: "#111111", bgDeep: "#000000", text: "#F5F5F5", accent: "#C9A13B", foil: true },
  { bg: "#F5F5F5", bgDeep: "#CFCFCF", text: "#111111", accent: "#B71C1C", foil: false },
  { bg: "#1B5E20", bgDeep: "#003300", text: "#E8F5E9", accent: "#C9A13B", foil: true },
  { bg: "#4A148C", bgDeep: "#12005E", text: "#F3E5F5", accent: "#CE93D8", foil: false },
  { bg: "#006064", bgDeep: "#00363A", text: "#E0F7FA", accent: "#4DD0E1", foil: false },
  { bg: "#3E2723", bgDeep: "#1B0000", text: "#EFEBE9", accent: "#D7CCC8", foil: false },
  { bg: "#E65100", bgDeep: "#A04000", text: "#FFF3E0", accent: "#FFCC80", foil: false },
  { bg: "#263238", bgDeep: "#000A12", text: "#ECEFF1", accent: "#90A4AE", foil: false },
  { bg: "#880E4F", bgDeep: "#560027", text: "#FCE4EC", accent: "#F48FB1", foil: true },
  { bg: "#1A237E", bgDeep: "#000051", text: "#E8EAF6", accent: "#C9A13B", foil: true },
  { bg: "#827717", bgDeep: "#524C00", text: "#F9FBE7", accent: "#1A1A1A", foil: false },
  { bg: "#01579B", bgDeep: "#002F6C", text: "#E1F5FE", accent: "#81D4FA", foil: false },
  { bg: "#BF360C", bgDeep: "#870000", text: "#FBE9E7", accent: "#FFAB91", foil: false },
];

export function paletteFromSeed(seed: string): SpinePalette {
  return PALETTES[hashString(seed) % PALETTES.length];
}

export function titleFontSize(spineWidth: number, titleLength: number): number {
  if (spineWidth < 30) return titleLength > 28 ? 10 : 11;
  if (spineWidth < 36) return titleLength > 36 ? 11 : 12;
  if (spineWidth < 44) return titleLength > 40 ? 12 : 13;
  return titleLength > 42 ? 13 : 14;
}
