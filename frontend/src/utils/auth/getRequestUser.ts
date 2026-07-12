import { headers } from "next/headers";
import { getUserFromAuthHeader, type SessionUser } from "@/utils/auth/session";

/** Resolve the current user from the Authorization: Bearer JWT header. */
export async function getRequestUser(): Promise<{ user: SessionUser | null; error: Error | null }> {
  try {
    const headerStore = await headers();
    const user = await getUserFromAuthHeader(headerStore.get("authorization"));
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error };
  }
}
