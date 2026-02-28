import { NextResponse } from "next/server";
import { getDb } from "@/lib/finance-db";

const RULE_FIELDS = ["description", "full_description", "account", "institution"] as const;
const RULE_MATCH_TYPES = ["exact", "contains", "regex"] as const;

type RuleField = typeof RULE_FIELDS[number];
type RuleMatchType = typeof RULE_MATCH_TYPES[number];

type RuleDoc = {
  _id: any;
  name?: string;
  field?: RuleField;
  match_type?: RuleMatchType;
  match_value?: string;
  target_category?: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRuleQuery(rule: RuleDoc) {
  if (!RULE_FIELDS.includes(rule.field as RuleField)) return null;
  if (!RULE_MATCH_TYPES.includes(rule.match_type as RuleMatchType)) return null;
  if (!rule.match_value || !rule.match_value.trim()) return null;

  let pattern = rule.match_value;
  if (rule.match_type === "exact") {
    pattern = `^${escapeRegex(rule.match_value)}$`;
  } else if (rule.match_type === "contains") {
    pattern = escapeRegex(rule.match_value);
  }

  return {
    [rule.field as string]: { $regex: pattern, $options: "i" },
  };
}

export async function POST() {
  const db = await getDb();
  await db.collection("category_rules").createIndex({ enabled: 1, priority: -1 });
  const rules = await db
    .collection("category_rules")
    .find({ enabled: true })
    .sort({ priority: -1 })
    .toArray();

  const results: Array<{
    rule_id: string;
    name: string;
    matched: number;
    modified: number;
    error?: string;
  }> = [];

  for (const rule of rules) {
    const query = buildRuleQuery(rule as RuleDoc);
    if (!query) {
      results.push({
        rule_id: String(rule._id),
        name: rule.name || "Unnamed rule",
        matched: 0,
        modified: 0,
        error: "Invalid rule configuration",
      });
      continue;
    }

    const result = await db.collection("transactions").updateMany(query, {
      $set: {
        category: rule.target_category,
        categorized_by: "rule",
        rule_id: rule._id,
      },
    });

    results.push({
      rule_id: String(rule._id),
      name: rule.name || "Unnamed rule",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  }

  return NextResponse.json({ results });
}
