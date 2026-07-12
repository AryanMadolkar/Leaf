import { NextResponse, type NextRequest } from "next/server";

/**
 * Guest cookie redirects only.
 * JWT auth is Bearer-token based (localStorage) and is enforced on API routes + client.
 */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isGuestSession = request.cookies.get("leaf_guest_session")?.value === "true";

  if (isGuestSession && path === "/auth") {
    const url = request.nextUrl.clone();
    const isGuestOnboarded = request.cookies.get("leaf_guest_onboarded")?.value === "true";
    url.pathname = isGuestOnboarded ? "/feed" : "/onboarding";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: { headers: request.headers },
  });
}
