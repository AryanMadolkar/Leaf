import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
  type SessionUser,
} from "@/utils/auth/tokens";

export {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
  type SessionUser,
};

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
