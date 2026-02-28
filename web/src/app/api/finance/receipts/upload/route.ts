import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/finance-db";

function normalizeDataUrl(image: string, filename?: string) {
  if (image.startsWith("data:")) return image;
  const ext = filename?.toLowerCase().split(".").pop();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${type};base64,${image}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { transaction_id, image, filename } = body || {};

  if (!transaction_id || !image) {
    return NextResponse.json({ error: "transaction_id and image are required" }, { status: 400 });
  }

  const db = await getDb();
  const attachment = {
    transaction_id,
    filename: filename || null,
    image: normalizeDataUrl(image, filename),
    created_at: new Date(),
    line_items: [],
  };

  const result = await db.collection("receipt_attachments").insertOne(attachment);

  return NextResponse.json({ ...attachment, _id: result.insertedId.toString() });
}
