import { NextRequest, NextResponse } from "next/server";
import { getIncomeBreakdown } from "@/lib/finance-queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || undefined;
  const data = await getIncomeBreakdown(month);
  return NextResponse.json(data);
}
