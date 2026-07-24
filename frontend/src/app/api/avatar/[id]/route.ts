import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { CACHE_MEDIUM } from "@/utils/apiCache";

const DATA_URI_RE = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/;

/**
 * Same-origin avatar resolver. Some profiles store their custom picture as a
 * raw base64 data: URI instead of a storage link — several MB of text. List
 * endpoints (e.g. discover readers) point here instead of inlining that
 * value directly, so a user's real photo still renders without bloating
 * every list response that mentions them.
 *
 * GET /api/avatar/<profile id>
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", id)
      .maybeSingle();

    const avatarUrl = data?.avatar_url;
    if (error || !avatarUrl) {
      return new NextResponse(null, { status: 404 });
    }

    const match = avatarUrl.match(DATA_URI_RE);
    if (match) {
      const [, contentType, base64Data] = match;
      const bytes = Buffer.from(base64Data, "base64");
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": CACHE_MEDIUM,
        },
      });
    }

    // Already a real URL — redirect rather than proxy the bytes ourselves.
    return NextResponse.redirect(avatarUrl, { status: 302 });
  } catch (error: unknown) {
    console.error(`Avatar API error for ${id}:`, error);
    return new NextResponse(null, { status: 500 });
  }
}
