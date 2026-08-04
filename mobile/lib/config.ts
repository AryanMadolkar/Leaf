import Constants from "expo-constants";

/** Same backend the web app uses — no separate mobile API. */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) || "https://leaf-peach.vercel.app";
