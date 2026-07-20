export type RoomTheme = "Cozy Cabin" | "Modern Minimal" | "Dark Academia";

export type RoomObjectId =
  | "bookshelf"
  | "chair"
  | "desk"
  | "coffeeMug"
  | "plant"
  | "window"
  | "lamp"
  | "vinylPlayer"
  | "globe"
  | "fishTank"
  | "cat";

export interface ThemePalette {
  wall: string;
  wallTexture: string;
  floor: string;
  wood: string;
  woodDark: string;
  fabric: string;
  fabricDark: string;
  accent: string;
  text: string;
}

// Only "cozy-cabin" has extracted illustrated assets so far (see
// scripts/extract_room_assets.py). Modern Minimal / Dark Academia fall back
// to the same sprites until matching sheets are provided and cropped.
const THEME_SLUGS: Record<RoomTheme, string> = {
  "Cozy Cabin": "cozy-cabin",
  "Modern Minimal": "cozy-cabin",
  "Dark Academia": "cozy-cabin",
};

export function assetPath(theme: RoomTheme, name: string) {
  return `/room-assets/${THEME_SLUGS[theme]}/${name}.png`;
}

export const THEME_PALETTES: Record<RoomTheme, ThemePalette> = {
  "Cozy Cabin": {
    wall: "#EDE3D3",
    wallTexture: "#E4D7C0",
    floor: "#C9A57C",
    wood: "#6B4A31",
    woodDark: "#4A3120",
    fabric: "#5B6B4F",
    fabricDark: "#41503A",
    accent: "#7C8F63",
    text: "#2D2A26",
  },
  "Modern Minimal": {
    wall: "#F4F1EA",
    wallTexture: "#ECE7DC",
    floor: "#D8CBB6",
    wood: "#B8987A",
    woodDark: "#8C7259",
    fabric: "#A9AFA0",
    fabricDark: "#828A78",
    accent: "#9CA88E",
    text: "#33312C",
  },
  "Dark Academia": {
    wall: "#2A241E",
    wallTexture: "#231D18",
    floor: "#1C1611",
    wood: "#3C2A1C",
    woodDark: "#241811",
    fabric: "#3E4A34",
    fabricDark: "#28311F",
    accent: "#8A6B3E",
    text: "#E8E1D3",
  },
};
