import { NextResponse } from "next/server";
import { getNetWorthSnapshot } from "@/lib/finance-queries";

export async function GET() {
  try {
    const snapshot = await getNetWorthSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Failed to load net worth snapshot", error);
    return NextResponse.json({ error: "Failed to load net worth snapshot" }, { status: 500 });
  }
}
