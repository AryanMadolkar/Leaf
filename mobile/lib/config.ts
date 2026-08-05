/**
 * Same backend the web app uses — no separate mobile API.
 * Local Expo web hits a running Next.js server so new routes
 * (e.g. /api/books/scan-shelf) work before Vercel deploy.
 * Override with EXPO_PUBLIC_API_BASE_URL when needed.
 */
const PRODUCTION_API = "https://leaf-peach.vercel.app";
const LOCAL_API = "http://localhost:3000";

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__ ? LOCAL_API : PRODUCTION_API);
