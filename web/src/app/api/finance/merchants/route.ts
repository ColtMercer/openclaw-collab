import { NextRequest, NextResponse } from "next/server";
import { getMerchantSpend } from "@/lib/finance-queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || undefined;
  const category = req.nextUrl.searchParams.get("category") || undefined;
  const data = await getMerchantSpend(month, category);
  return NextResponse.json(data);
}
