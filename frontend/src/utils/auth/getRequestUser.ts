import { getSessionUser, type SessionUser } from "@/utils/auth/session";

/** Drop-in replacement for supabase.auth.getUser() in API routes. */
export async function getRequestUser(): Promise<{ user: SessionUser | null; error: Error | null }> {
  try {
    const user = await getSessionUser();
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error };
  }
}
