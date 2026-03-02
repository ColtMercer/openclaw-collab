import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/finance-db";

type AmazonItem = {
  name: string;
  qty?: number;
  price?: number;
  order_id?: string;
};

type OrderGroup = {
  orderId: string;
  orderDate: Date | null;
  orderTotal: number;
  items: AmazonItem[];
};

type TransactionCandidate = {
  _id: ObjectId;
  amount?: number;
  transaction_id?: string;
};

type ImportMatch = {
  orderId: string;
  orderDate: string;
  orderTotal: number;
  transaction_id?: string;
  matches?: Array<string | undefined>;
  items: AmazonItem[];
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      const next = text[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseMoney(value: string | undefined) {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOrderDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const csv = body?.csv;
  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV appears empty" }, { status: 400 });
  }

  const headers = rows[0].map((h) => h.trim());
  const headerMap = new Map<string, number>();
  headers.forEach((header, index) => {
    headerMap.set(normalizeHeader(header), index);
  });

  const getValue = (row: string[], candidates: string[]) => {
    for (const candidate of candidates) {
      const idx = headerMap.get(normalizeHeader(candidate));
      if (idx !== undefined) return row[idx] ?? "";
    }
    return "";
  };

  const groups = new Map<string, OrderGroup>();

  for (const row of rows.slice(1)) {
    const orderId = getValue(row, ["Order ID", "OrderId", "Amazon Order ID"]);
    if (!orderId) continue;

    const orderDateStr = getValue(row, ["Order Date", "Purchase Date", "Order Date (UTC)"]);
    const itemName = getValue(row, ["Title", "Item Name", "Product Name", "Description"]) || "Amazon Item";
    const qtyStr = getValue(row, ["Quantity", "Qty", "Item Quantity"]) || "1";

    const itemTotalStr = getValue(row, [
      "Item Total",
      "Item Subtotal",
      "Item Price",
      "Price",
      "Total Charged",
      "Total Owed",
      "Amount",
    ]);

    const qty = Number(qtyStr) || 1;
    const itemTotal = parseMoney(itemTotalStr);
    const orderDate = parseOrderDate(orderDateStr);

    const item: AmazonItem = {
      name: itemName,
      qty,
      price: itemTotal || undefined,
      order_id: orderId,
    };

    const group = groups.get(orderId) || {
      orderId,
      orderDate,
      orderTotal: 0,
      items: [],
    };

    group.orderDate = group.orderDate || orderDate;
    group.items.push(item);
    group.orderTotal += itemTotal;

    groups.set(orderId, group);
  }

  const db = await getDb();
  const matched: ImportMatch[] = [];
  const unmatched: ImportMatch[] = [];
  const ambiguous: ImportMatch[] = [];

  for (const group of groups.values()) {
    const orderDate = group.orderDate || new Date();
    const from = new Date(orderDate);
    from.setDate(from.getDate() - 2);
    const to = new Date(orderDate);
    to.setDate(to.getDate() + 2);

    const candidates = await db
      .collection("transactions")
      .find({ date: { $gte: from, $lte: to }, amount: { $ne: null } })
      .toArray();

    const matches = (candidates as TransactionCandidate[])
      .filter((t) => Math.abs(Math.abs(t.amount || 0) - group.orderTotal) <= 0.5);

    if (matches.length === 1) {
      const match = matches[0];
      await db.collection("transactions").updateOne(
        { _id: match._id },
        {
          $set: {
            amazon_items: group.items,
            amazon_order_id: group.orderId,
            amazon_order_date: group.orderDate,
            amazon_order_total: group.orderTotal,
            amazon_imported_at: new Date(),
          },
        }
      );

      matched.push({
        orderId: group.orderId,
        orderDate: (group.orderDate || orderDate).toISOString(),
        orderTotal: group.orderTotal,
        transaction_id: match.transaction_id,
        items: group.items,
      });
    } else if (matches.length === 0) {
      unmatched.push({
        orderId: group.orderId,
        orderDate: (group.orderDate || orderDate).toISOString(),
        orderTotal: group.orderTotal,
        items: group.items,
      });
    } else {
      ambiguous.push({
        orderId: group.orderId,
        orderDate: (group.orderDate || orderDate).toISOString(),
        orderTotal: group.orderTotal,
        matches: matches.map((m) => m.transaction_id),
        items: group.items,
      });
    }
  }

  return NextResponse.json({ matched, unmatched, ambiguous });
}
