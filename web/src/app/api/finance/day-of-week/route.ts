import { NextResponse } from "next/server";
import { getDayOfWeekSpending } from "@/lib/finance-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDayOfWeekSpending();
  return NextResponse.json(data);
}
