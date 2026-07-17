import { NextResponse, type NextRequest } from "next/server";

/**
 * JWT auth is Bearer-token based (localStorage) and is enforced on API routes + client.
 */
export async function updateSession(_request: NextRequest) {
  return NextResponse.next();
}
