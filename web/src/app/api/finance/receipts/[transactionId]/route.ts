import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/finance-db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  const db = await getDb();
  const items = await db
    .collection("receipt_attachments")
    .find({ transaction_id: transactionId })
    .sort({ created_at: -1 })
    .toArray();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialized = items.map((item: any) => ({
    ...item,
    _id: item._id.toString(),
  }));

  return NextResponse.json(serialized);
}
