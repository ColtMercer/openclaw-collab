import { NextResponse } from "next/server";
import { getSpendingForecast } from "@/lib/finance-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getSpendingForecast();
  return NextResponse.json(data);
}
