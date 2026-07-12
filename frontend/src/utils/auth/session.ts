import { createSessionToken, verifySessionToken, type SessionUser } from "@/utils/auth/tokens";

export { createSessionToken, verifySessionToken, type SessionUser };

function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

export async function getUserFromAuthHeader(
  authorization: string | null,
): Promise<SessionUser | null> {
  const token = extractBearerToken(authorization);
  if (!token) return null;
  return verifySessionToken(token);
}
