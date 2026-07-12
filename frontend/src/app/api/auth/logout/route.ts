import { NextResponse } from "next/server";

export async function POST() {
  // JWT is stored client-side; nothing to clear on the server.
  return NextResponse.json({ success: true });
}
