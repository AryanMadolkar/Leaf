/** Matches frontend/src/app/globals.css light-mode tokens, with mobile elevation helpers. */
export const colors = {
  brand: "#2E4D38",
  brandLight: "#416B4E",
  brandMuted: "#5B7B63",
  brandDeep: "#1F3526",
  cream: "#FAF8F5",
  creamDark: "#F3ECE2",
  creamCard: "#FAF9F6",
  creamBorder: "#E6E1D8",
  /** Slightly warmer paper for panels / featured blocks */
  paper: "#F7F2EA",
  charcoal: "#1C1C1A",
  charcoalLight: "#2D2C29",
  charcoalMuted: "#7A7873",
  white: "#FFFFFF",
  gold: "#C9A13B",
  goldSoft: "#E8D5A3",
  error: "#B3261E",
  /** Soft brand wash for chips / selected states */
  brandWash: "rgba(46, 77, 56, 0.08)",
  brandMist: "rgba(46, 77, 56, 0.11)",
  brandGlow: "rgba(46, 77, 56, 0.18)",
  /** Hairline overlays */
  inkFade: "rgba(28, 28, 26, 0.06)",
  inkSoft: "rgba(28, 28, 26, 0.4)",
};

/** Matches the web app's font-serif (Instrument Serif) / font-sans (Inter) split. */
export const fonts = {
  serif: "InstrumentSerif_400Regular",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

/** Soft editorial elevation — keep shadows warm/cream-tinted, never harsh black. */
export const shadows = {
  soft: {
    shadowColor: "#1C1C1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    shadowColor: "#1C1C1A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  cover: {
    shadowColor: "#1C1C1A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 7,
  },
  float: {
    shadowColor: "#2E4D38",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 9,
  },
} as const;
