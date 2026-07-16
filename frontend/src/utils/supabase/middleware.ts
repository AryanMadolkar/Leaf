import { NextResponse, type NextRequest } from "next/server";

/**
 * JWT auth is Bearer-token based (localStorage) and is enforced on API routes + client.
 * Guests must be able to reach /auth to sign in — do not redirect them away.
 */
export async function updateSession(_request: NextRequest) {
  return NextResponse.next();
}
