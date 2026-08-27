import { NextResponse } from "next/server";
import { getRequestUser } from "@/utils/auth/getRequestUser";
import { recomputeReadingDna } from "@/utils/readingDna";

export async function POST() {
  try {
    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const dna = await recomputeReadingDna(user.id);
    return NextResponse.json({ success: true, dna });
  } catch (err: any) {
    console.error("[reading-dna] recompute failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Could not recompute Reading DNA" },
      { status: 500 }
    );
  }
}
