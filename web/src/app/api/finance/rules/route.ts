import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/finance-db";

const RULE_FIELDS = ["description", "full_description", "account", "institution"] as const;
const RULE_MATCH_TYPES = ["exact", "contains", "regex"] as const;

type RuleField = typeof RULE_FIELDS[number];
type RuleMatchType = typeof RULE_MATCH_TYPES[number];

type RuleInput = {
  name?: string;
  field?: RuleField;
  match_type?: RuleMatchType;
  match_value?: string;
  target_category?: string;
  priority?: number;
  enabled?: boolean;
};

async function ensureRuleIndexes() {
  const db = await getDb();
  await db.collection("category_rules").createIndex({ enabled: 1, priority: -1 });
}

function validateRuleInput(body: RuleInput) {
  const errors: string[] = [];
  if (!body.name?.trim()) errors.push("name is required");
  if (!RULE_FIELDS.includes(body.field as RuleField)) errors.push("field is invalid");
  if (!RULE_MATCH_TYPES.includes(body.match_type as RuleMatchType)) errors.push("match_type is invalid");
  if (!body.match_value?.trim()) errors.push("match_value is required");
  if (!body.target_category?.trim()) errors.push("target_category is required");
  return errors;
}

export async function GET() {
  await ensureRuleIndexes();
  const db = await getDb();
  const rules = await db
    .collection("category_rules")
    .find({})
    .sort({ priority: -1 })
    .toArray();
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  await ensureRuleIndexes();
  const body = (await req.json()) as RuleInput;
  const errors = validateRuleInput(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
  }

  const now = new Date();
  const doc = {
    name: body.name!.trim(),
    field: body.field!,
    match_type: body.match_type!,
    match_value: body.match_value!.trim(),
    target_category: body.target_category!.trim(),
    priority: typeof body.priority === "number" ? body.priority : 100,
    enabled: typeof body.enabled === "boolean" ? body.enabled : true,
    created_at: now,
    updated_at: now,
  };

  const db = await getDb();
  const result = await db.collection("category_rules").insertOne(doc);
  return NextResponse.json({ _id: result.insertedId, ...doc });
}

export async function PUT(req: NextRequest) {
  await ensureRuleIndexes();
  const body = (await req.json()) as RuleInput & { _id?: string };
  if (!body._id) {
    return NextResponse.json({ error: "_id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (RULE_FIELDS.includes(body.field as RuleField)) updates.field = body.field;
  if (RULE_MATCH_TYPES.includes(body.match_type as RuleMatchType)) updates.match_type = body.match_type;
  if (typeof body.match_value === "string") updates.match_value = body.match_value.trim();
  if (typeof body.target_category === "string") updates.target_category = body.target_category.trim();
  if (typeof body.priority === "number") updates.priority = body.priority;
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;

  const db = await getDb();
  await db.collection("category_rules").updateOne({ _id: new ObjectId(body._id) }, { $set: updates });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureRuleIndexes();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("category_rules").deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
