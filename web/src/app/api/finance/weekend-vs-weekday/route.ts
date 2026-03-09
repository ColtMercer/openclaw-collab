import { NextResponse } from "next/server";
import { getWeekendVsWeekdaySpending } from "@/lib/finance-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getWeekendVsWeekdaySpending();
  return NextResponse.json(data);
}
