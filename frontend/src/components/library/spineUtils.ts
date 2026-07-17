/** Deterministic hash for stable spine dimensions / colors */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Spine width from page count (paperback → hardcover → large) */
export function spineWidthFromPages(pages?: number): number {
  if (!pages || pages <= 0) return 32;
  // Dense bookstore packing: ~20–55px
  return clamp(Math.round(pages / 14), 20, 55);
}

/** Typical height 240–280; thick volumes up to 300 */
export function spineHeightFromSeed(seed: string, pages?: number): number {
  const h = hashString(seed);
  let height = 240 + (h % 41); // 240–280
  if (pages && pages >= 550) height = Math.min(300, height + 16);
  if (pages && pages >= 750) height = 300;
  return height;
}

export function spineTiltFromSeed(seed: string): number {
  const h = hashString(seed + ":tilt");
  return ((h % 21) - 10) / 10; // ±1°
}

export type SpinePalette = {
  bg: string;
  bgDeep: string;
  text: string;
  accent: string;
  foil: boolean;
  texture: "cloth" | "leather" | "paper" | "linen";
};

const FALLBACK_PALETTES: SpinePalette[] = [
  { bg: "#2E4D38", bgDeep: "#1A2E20", text: "#F5E6C8", accent: "#C9A227", foil: true, texture: "cloth" },
  { bg: "#4A2C1A", bgDeep: "#2A180E", text: "#F0E0C8", accent: "#D4A574", foil: false, texture: "leather" },
  { bg: "#1C2A3A", bgDeep: "#0E1620", text: "#E8DCC8", accent: "#8FA8C0", foil: false, texture: "linen" },
  { bg: "#5C1A1A", bgDeep: "#350E0E", text: "#F2E6D0", accent: "#E8B86D", foil: true, texture: "cloth" },
  { bg: "#3A3A3A", bgDeep: "#1E1E1E", text: "#F0E8D8", accent: "#C0B8A8", foil: false, texture: "paper" },
  { bg: "#2A3F4A", bgDeep: "#152430", text: "#EDE4D4", accent: "#A8C4B0", foil: false, texture: "linen" },
  { bg: "#5A3D2A", bgDeep: "#342116", text: "#F5EAD8", accent: "#E0C090", foil: true, texture: "leather" },
  { bg: "#1F3A2E", bgDeep: "#102018", text: "#E8F0E4", accent: "#B8D4A8", foil: false, texture: "cloth" },
  { bg: "#3D2A4A", bgDeep: "#201628", text: "#F0E8F4", accent: "#C8A8D8", foil: false, texture: "linen" },
  { bg: "#4A3A1A", bgDeep: "#2A200E", text: "#F8F0D8", accent: "#E8D080", foil: true, texture: "paper" },
];

export function paletteFromSeed(seed: string): SpinePalette {
  const h = hashString(seed);
  return FALLBACK_PALETTES[h % FALLBACK_PALETTES.length];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(r: number, g: number, b: number) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function darken(r: number, g: number, b: number, amount: number) {
  return {
    r: Math.round(r * (1 - amount)),
    g: Math.round(g * (1 - amount)),
    b: Math.round(b * (1 - amount)),
  };
}

/** Sample dominant colors from a cover image URL (client-only). */
export async function extractSpinePaletteFromCover(
  coverUrl: string,
  seed: string,
): Promise<SpinePalette> {
  const fallback = paletteFromSeed(seed);
  if (!coverUrl || coverUrl.includes("placeholder")) return fallback;

  try {
    const img = await loadImage(coverUrl);
    const canvas = document.createElement("canvas");
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Skip near-white / near-black noise
      const lum = luminance(r, g, b);
      if (lum > 0.92 || lum < 0.06) continue;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const cur = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.n += 1;
      buckets.set(key, cur);
    }

    const sorted = Array.from(buckets.values())
      .map((c) => ({
        r: Math.round(c.r / c.n),
        g: Math.round(c.g / c.n),
        b: Math.round(c.b / c.n),
        n: c.n,
      }))
      .sort((a, b) => b.n - a.n);

    if (!sorted.length) return fallback;

    const primary = sorted[0];
    const deep = darken(primary.r, primary.g, primary.b, 0.35);
    const accent =
      sorted.find((c) => Math.abs(luminance(c.r, c.g, c.b) - luminance(primary.r, primary.g, primary.b)) > 0.25) ||
      sorted[1] ||
      primary;

    const bgLum = luminance(primary.r, primary.g, primary.b);
    const text =
      bgLum > 0.55 ? "#1C1C1A" : "#F5EDE0";

    const h = hashString(seed);
    const textures: SpinePalette["texture"][] = ["cloth", "leather", "paper", "linen"];
    return {
      bg: rgbToHex(primary.r, primary.g, primary.b),
      bgDeep: rgbToHex(deep.r, deep.g, deep.b),
      text,
      accent: rgbToHex(accent.r, accent.g, accent.b),
      foil: h % 5 === 0,
      texture: textures[h % textures.length],
    };
  } catch {
    return fallback;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export type ReadingStatus =
  | "Want to Read"
  | "Currently Reading"
  | "Finished"
  | "Did Not Finish"
  | undefined;

export function statusStripColor(status?: ReadingStatus) {
  if (status === "Finished") return "#2E4D38";
  if (status === "Currently Reading") return "#C4782A";
  if (status === "Want to Read") return "#8A8680";
  if (status === "Did Not Finish") return "#B83A3A";
  return "transparent";
}

export function ribbonForBook(opts: {
  status?: ReadingStatus;
  isFavorite?: boolean;
}): { color: string; label: string } | null {
  if (opts.isFavorite) return { color: "#C9A227", label: "favorite" };
  if (opts.status === "Currently Reading") return { color: "#B83A3A", label: "reading" };
  if (opts.status === "Want to Read") return { color: "#3A6EA5", label: "wishlist" };
  if (opts.status === "Did Not Finish") return { color: "#8B4513", label: "dnf" };
  return null;
}
