import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import { LeafProvider } from "@/context/LeafContext";
import { ThemeProvider, THEME_INLINE_SCRIPT } from "@/context/ThemeContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leaf — A Home for People Who Love Books",
  description: "Track what you read, share what you love, and curate your literary identity. A premium social platform for book lovers.",
  keywords: ["books", "reading diary", "book club", "reviews", "literary profile", "letterboxd for books"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Leaf — A Home for People Who Love Books",
    description: "Track what you read, share what you love, and curate your literary identity. A premium social platform for book lovers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INLINE_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-charcoal font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <LeafProvider>
            {children}
          </LeafProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
