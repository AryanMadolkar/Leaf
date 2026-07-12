import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "leaf_session";
export const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!id) return null;
    return { id, email };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
