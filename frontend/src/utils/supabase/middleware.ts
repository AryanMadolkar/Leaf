import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/utils/auth/tokens";

const protectedRoutes = [
  "/feed",
  "/profile",
  "/library",
  "/stats",
  "/lists",
  "/settings",
  "/onboarding",
];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isGuestSession = request.cookies.get("leaf_guest_session")?.value === "true";
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionUser = sessionToken ? await verifySessionToken(sessionToken) : null;
  const isAuthed = Boolean(sessionUser) || isGuestSession;

  const isProtected = protectedRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );
  const isPublicProfile = path.startsWith("/u/");

  if (!isAuthed && isProtected && !isPublicProfile) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  if (isAuthed && path === "/auth") {
    const url = request.nextUrl.clone();
    if (isGuestSession) {
      const isGuestOnboarded = request.cookies.get("leaf_guest_onboarded")?.value === "true";
      url.pathname = isGuestOnboarded ? "/feed" : "/onboarding";
    } else if (sessionUser) {
      // Lightweight gate — detailed onboarding check happens client-side via /api/auth/me
      url.pathname = "/feed";
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: { headers: request.headers },
  });
}
