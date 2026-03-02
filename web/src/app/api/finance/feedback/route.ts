import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/finance-db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { transactionId, description, amount, category, date, comment, page } = body;

  if (!comment?.trim()) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  const db = await getDb();

  const feedback = {
    transaction_id: transactionId || null,
    description: description || null,
    amount: amount || null,
    category: category || null,
    date: date || null,
    comment: comment.trim(),
    page: page || "unknown",
    created_at: new Date(),
    status: "pending", // pending → acknowledged → resolved
  };

  await db.collection("feedback").insertOne(feedback);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const db = await getDb();
  const items = await db.collection("feedback")
    .find({})
    .sort({ created_at: -1 })
    .limit(50)
    .toArray();
  return NextResponse.json(items);
}
