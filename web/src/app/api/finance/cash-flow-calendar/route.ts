import { NextRequest, NextResponse } from "next/server";
import { getCashFlowCalendar } from "@/lib/finance-queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || undefined;
  const data = await getCashFlowCalendar(month);
  return NextResponse.json(data);
}
