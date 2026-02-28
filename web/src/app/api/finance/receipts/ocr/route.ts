import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/finance-db";

function normalizeDataUrl(image: string) {
  if (image.startsWith("data:")) return image;
  return `data:image/jpeg;base64,${image}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { image, attachment_id } = body || {};

  if (!image) {
    return NextResponse.json({ error: "image is required" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract receipt line items and return JSON in the shape {items:[{name, qty, price}]}. qty and price must be numbers. Use qty=1 if unknown. Use price as the line total. Return an empty items array if nothing is found.",
            },
            {
              type: "image_url",
              image_url: { url: normalizeDataUrl(image) },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: "OpenAI request failed", detail: err }, { status: 500 });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  let parsed: any = { items: [] };
  try {
    parsed = content ? JSON.parse(content) : { items: [] };
  } catch {
    parsed = { items: [] };
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map((item: any) => ({
          name: String(item.name || "").trim(),
          qty: typeof item.qty === "number" ? item.qty : Number(item.qty) || 1,
          price: typeof item.price === "number" ? item.price : Number(item.price),
        }))
        .filter((item: any) => item.name.length > 0)
    : [];

  if (attachment_id) {
    const db = await getDb();
    await db
      .collection("receipt_attachments")
      .updateOne({ _id: new ObjectId(attachment_id) }, { $set: { line_items: items } });
  }

  return NextResponse.json({ items });
}
