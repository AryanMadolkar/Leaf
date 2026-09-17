import { NextResponse } from "next/server";
import type { SessionUser } from "@/utils/auth/session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value));
}

/**
 * Resolve the target user for private data routes.
 * Only the authenticated user may access their own records — `userId` query
 * overrides that do not match the session are rejected (IDOR guard).
 */
export function requireOwnUserId(
  user: SessionUser | null,
  requestedUserId: string | null
): { userId: string } | { error: NextResponse } {
  if (!user?.id) {
    return {
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (requestedUserId && requestedUserId !== user.id) {
    return {
      error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    };
  }
  if (!isUuid(user.id)) {
    return {
      error: NextResponse.json({ success: false, error: "Invalid session" }, { status: 400 }),
    };
  }
  return { userId: user.id };
}
