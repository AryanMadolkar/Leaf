import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/utils/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  // Also clear legacy guest markers
  response.cookies.set("leaf_guest_session", "", { path: "/", maxAge: 0 });
  response.cookies.set("leaf_guest_onboarded", "", { path: "/", maxAge: 0 });
  return response;
}
