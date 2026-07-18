import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

/** Origins allowed to call Leaf APIs from Expo web / local browsers. Native Expo Go has no CORS. */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".exp.direct") || hostname.endsWith(".expo.dev")) return true;
  } catch {
    return false;
  }
  return false;
}

function applyCors(response: NextResponse, origin: string | null) {
  if (!isAllowedOrigin(origin) || !origin) return;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept, X-Requested-With",
  );
  response.headers.set("Vary", "Origin");
}

export async function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  if (isApi && request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    applyCors(preflight, origin);
    return preflight;
  }

  const response = await updateSession(request);
  if (isApi) applyCors(response, origin);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
