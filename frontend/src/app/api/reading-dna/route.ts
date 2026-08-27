import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { getOrRecomputeReadingDna } from "@/utils/readingDna";

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "1";

    const dna = await getOrRecomputeReadingDna(user.id, { force });
    return NextResponse.json({ success: true, dna });
  } catch (err: any) {
    console.error("[reading-dna] GET failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Could not load Reading DNA" },
      { status: 500 }
    );
  }
}
