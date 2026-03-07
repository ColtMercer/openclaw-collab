import { getDb } from "./finance-db";

export type IncomeSource = {
  source: string;
  amount: number;
  percentage: number;
  count: number;
};

export type IncomeTrendPoint = {
  month: string;
  total: number;
};

export type IncomeTransaction = {
  transaction_id?: string;
  date: Date | string;
  description: string;
  amount: number;
  category?: string | null;
};

export type IncomeBreakdownResult = {
  month: string;
  totalIncome: number;
  monthOverMonthChangePct: number | null;
  payFrequency: "Weekly" | "Bi-weekly" | "Monthly" | "Irregular";
  incomeSources: IncomeSource[];
  trend: IncomeTrendPoint[];
  topTransactions: IncomeTransaction[];
};

export type CashFlowCalendarDay = {
  date: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  isPaycheckDay: boolean;
};

export type CashFlowCalendarSummary = {
  biggestSpendDay: {
    date: string;
    expenses: number;
    net: number;
  } | null;
  mostFrequentBigSpendDayOfWeek: {
    dayOfWeek: string;
    count: number;
  } | null;
  avgDailyBurn: number;
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
};

export type CashFlowCalendarResult = {
  month: string;
  startDate: string;
  endDate: string;
  daysInMonth: number;
  days: CashFlowCalendarDay[];
  summary: CashFlowCalendarSummary;
};

function toMonthBounds(month?: string) {
  const now = new Date();
  const parsed = month && /^\d{4}-\d{2}$/.test(month)
    ? month.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const year = parsed[0];
  const monthIndex = parsed[1] - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return { start, end, monthKey, daysInMonth: new Date(year, monthIndex + 1, 0).getDate() };
}

function normalizeIncomeSource(description?: string | null) {
  const raw = (description || "Unknown").trim();
  const cleaned = raw
    .toLowerCase()
    .replace(/\b(?:ach|ppd id|deposit|credit|direct dep(?:osit)?|directdep|payroll|salary|income|payment|transfer)\b/g, " ")
    .replace(/[0-9#*]+/g, " ")
    .replace(/[^a-z\s&.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return raw || "Unknown";

  const words = cleaned
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join(" ") || raw || "Unknown";
}

function getMonthKeys(month: string, count: number) {
  const [year, monthNum] = month.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, monthNum - 1 - (count - 1 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function detectPayFrequency(transactions: IncomeTransaction[]) {
  const sorted = [...transactions]
    .filter((tx) => tx.amount >= 500)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 3) return "Irregular" as const;

  const gaps: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = new Date(sorted[index - 1].date).getTime();
    const current = new Date(sorted[index].date).getTime();
    gaps.push(Math.round((current - prev) / (1000 * 60 * 60 * 24)));
  }

  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  if (averageGap >= 6 && averageGap <= 9) return "Weekly" as const;
  if (averageGap >= 12 && averageGap <= 17) return "Bi-weekly" as const;
  if (averageGap >= 26 && averageGap <= 35) return "Monthly" as const;
  return "Irregular" as const;
}

export async function getIncomeBreakdown(month?: string): Promise<IncomeBreakdownResult> {
  const db = await getDb();
  const { start, end, monthKey } = toMonthBounds(month);
  const previousStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const previousEnd = start;
  const trendMonthKeys = getMonthKeys(monthKey, 12);
  const trendStart = new Date(start.getFullYear(), start.getMonth() - 11, 1);
  const payFrequencyStart = new Date(start.getFullYear(), start.getMonth() - 5, 1);

  const baseFilter = { amount: { $gt: 0 }, category: { $ne: "Transfer" } };

  type TotalRow = { _id: null; total: number };
  type SourceRow = { _id: string; amount: number; count: number };
  type TrendRow = { _id: string; total: number };

  const [currentRows, previousRows, sourceRows, trendRows, topTransactions, recurringIncome] = await Promise.all([
    db.collection("transactions").aggregate<TotalRow>([
      { $match: { ...baseFilter, date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).toArray(),
    db.collection("transactions").aggregate<TotalRow>([
      { $match: { ...baseFilter, date: { $gte: previousStart, $lt: previousEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).toArray(),
    db.collection("transactions").aggregate<SourceRow>([
      { $match: { ...baseFilter, date: { $gte: start, $lt: end } } },
      { $project: { normalizedSource: "$description", amount: 1 } },
      { $group: { _id: "$normalizedSource", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
      { $limit: 100 },
    ]).toArray(),
    db.collection("transactions").aggregate<TrendRow>([
      { $match: { ...baseFilter, date: { $gte: trendStart, $lt: end } } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("transactions")
      .find({ ...baseFilter, date: { $gte: start, $lt: end } })
      .project({ transaction_id: 1, date: 1, description: 1, amount: 1, category: 1 })
      .sort({ amount: -1, date: -1 })
      .limit(5)
      .toArray() as Promise<IncomeTransaction[]>,
    db.collection("transactions")
      .find({ ...baseFilter, date: { $gte: payFrequencyStart, $lt: end } })
      .project({ transaction_id: 1, date: 1, description: 1, amount: 1, category: 1 })
      .sort({ date: 1 })
      .toArray() as Promise<IncomeTransaction[]>,
  ]);

  const totalIncome = currentRows[0]?.total || 0;
  const previousIncome = previousRows[0]?.total || 0;
  const monthOverMonthChangePct = previousIncome > 0
    ? ((totalIncome - previousIncome) / previousIncome) * 100
    : null;

  const groupedSources = new Map<string, { amount: number; count: number }>();
  for (const row of sourceRows) {
    const source = normalizeIncomeSource(row._id);
    const existing = groupedSources.get(source) || { amount: 0, count: 0 };
    existing.amount += row.amount || 0;
    existing.count += row.count || 0;
    groupedSources.set(source, existing);
  }

  const incomeSources: IncomeSource[] = Array.from(groupedSources.entries())
    .map(([source, value]) => ({
      source,
      amount: value.amount,
      count: value.count,
      percentage: totalIncome > 0 ? (value.amount / totalIncome) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const trendMap = new Map(trendRows.map((row) => [row._id, row.total || 0]));
  const trend: IncomeTrendPoint[] = trendMonthKeys.map((key) => ({ month: key, total: trendMap.get(key) || 0 }));

  return {
    month: monthKey,
    totalIncome,
    monthOverMonthChangePct,
    payFrequency: detectPayFrequency(recurringIncome),
    incomeSources,
    trend,
    topTransactions: topTransactions.map((tx) => ({
      transaction_id: tx.transaction_id,
      date: tx.date,
      description: tx.description || "Unknown",
      amount: tx.amount,
      category: tx.category,
    })),
  };
}

export async function getCashFlowCalendar(month?: string): Promise<CashFlowCalendarResult> {
  const db = await getDb();
  const { start, end, monthKey, daysInMonth } = toMonthBounds(month);

  const pipeline = [
    {
      $match: {
        date: { $gte: start, $lt: end },
        amount: { $ne: null },
        category: { $ne: "Transfer" },
      },
    },
    {
      $addFields: {
        dateKey: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
      },
    },
    {
      $group: {
        _id: "$dateKey",
        income: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
        expenses: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
        net: { $sum: "$amount" },
        positiveTransactionCount: { $sum: { $cond: [{ $gt: ["$amount", 0] }, 1, 0] } },
        maxPositiveAmount: { $max: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  type AggregateRow = {
    _id: string;
    income: number;
    expenses: number;
    net: number;
    positiveTransactionCount: number;
    maxPositiveAmount: number;
    transactionCount: number;
  };

  const rows = await db.collection("transactions").aggregate<AggregateRow>(pipeline).toArray();
  const maxPositiveAmount = rows.reduce((max, row) => Math.max(max, row.maxPositiveAmount || 0), 0);
  const paycheckThreshold = Math.max(1000, maxPositiveAmount * 0.6);

  const days: CashFlowCalendarDay[] = rows.map((row) => ({
    date: row._id,
    income: row.income || 0,
    expenses: row.expenses || 0,
    net: row.net || 0,
    transactionCount: row.transactionCount || 0,
    isPaycheckDay: (row.positiveTransactionCount || 0) > 0 && (row.maxPositiveAmount || 0) >= paycheckThreshold,
  }));

  const biggestSpendDay = days
    .filter((day) => day.expenses > 0)
    .sort((a, b) => b.expenses - a.expenses)[0];

  const bigSpendThreshold = days.length > 0
    ? Math.max(100, [...days].sort((a, b) => b.expenses - a.expenses)[Math.max(0, Math.ceil(days.length * 0.2) - 1)]?.expenses || 0)
    : 0;

  const spendDayCounts = new Map<string, number>();
  for (const day of days) {
    if (day.expenses < bigSpendThreshold || bigSpendThreshold <= 0) continue;
    const weekday = new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
    spendDayCounts.set(weekday, (spendDayCounts.get(weekday) || 0) + 1);
  }

  const mostFrequentBigSpendDayOfWeek = Array.from(spendDayCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  const totalIncome = days.reduce((sum, day) => sum + day.income, 0);
  const totalExpenses = days.reduce((sum, day) => sum + day.expenses, 0);
  const totalNet = days.reduce((sum, day) => sum + day.net, 0);

  return {
    month: monthKey,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    daysInMonth,
    days,
    summary: {
      biggestSpendDay: biggestSpendDay
        ? { date: biggestSpendDay.date, expenses: biggestSpendDay.expenses, net: biggestSpendDay.net }
        : null,
      mostFrequentBigSpendDayOfWeek: mostFrequentBigSpendDayOfWeek
        ? { dayOfWeek: mostFrequentBigSpendDayOfWeek[0], count: mostFrequentBigSpendDayOfWeek[1] }
        : null,
      avgDailyBurn: daysInMonth > 0 ? totalExpenses / daysInMonth : 0,
      totalIncome,
      totalExpenses,
      totalNet,
    },
  };
}

const AI_SPEND_KEYWORDS = [
  "openai", "anthropic", "claude", "chatgpt", "midjourney", "github copilot",
  "cursor", "perplexity", "cohere", "replicate", "together ai", "groq",
  "elevenlabs", "runway", "pika labs", "suno", "stability ai", "heygen",
  "jasper", "copy.ai", "writesonic", "hugging face", "alpacadb", "alpaca",
  "replit", "codeium", "tabnine",
] as const;

function getAISpendRegexes() {
  return AI_SPEND_KEYWORDS.map((vendor) => new RegExp(vendor, "i"));
}

type SubscriptionAuditGroupName =
  | "gym"
  | "streaming"
  | "ai_tools"
  | "cloud"
  | "adult"
  | "food_delivery"
  | "clothing"
  | "other";

export type SubscriptionAuditSubscription = {
  merchant: string;
  monthlyAmount: number;
  amountVariance: number;
  hasPriceCreep: boolean;
};

export type SubscriptionAuditGroup = {
  groupName: SubscriptionAuditGroupName;
  count: number;
  totalMonthly: number;
  isRedundant: boolean;
  subscriptions: SubscriptionAuditSubscription[];
};

export type SubscriptionAuditReport = {
  groups: SubscriptionAuditGroup[];
  healthScore: number;
  totalMonthlySpend: number;
  redundantGroupCount: number;
  priceCreepCount: number;
};

const SUBSCRIPTION_AUDIT_KEYWORDS: Array<{
  groupName: Exclude<SubscriptionAuditGroupName, "other">;
  keywords: string[];
}> = [
  {
    groupName: "gym",
    keywords: ["planet fitness", "la fitness", "anytime fitness", "ymca", "crunch", "equinox"],
  },
  {
    groupName: "streaming",
    keywords: ["netflix", "hulu", "disney", "spotify", "youtube", "paramount", "peacock", "apple tv", "max", "hbo", "prime video", "tidal", "deezer"],
  },
  {
    groupName: "ai_tools",
    keywords: ["openai", "anthropic", "chatgpt", "claude", "cursor", "replit", "perplexity", "alpacadb", "elevenlabs", "google one ai"],
  },
  {
    groupName: "cloud",
    keywords: ["vercel", "railway", "digitalocean", "heroku", "linode", "cloudflare", "godaddy", "github"],
  },
  {
    groupName: "adult",
    keywords: ["onlyfans", "fanvue"],
  },
  {
    groupName: "food_delivery",
    keywords: ["butcherbox", "hello fresh", "factor", "gobble", "hungryroot"],
  },
  {
    groupName: "clothing",
    keywords: ["fabletics", "stitch fix", "trunk club", "bombas"],
  },
];

function toMonthlyEquivalent(amount: number, frequency?: string | null): number {
  const normalized = (frequency || "monthly").toLowerCase();
  const absolute = Math.abs(amount);
  if (normalized.includes("annual") || normalized.includes("yearly")) return absolute / 12;
  if (normalized.includes("quarter")) return absolute / 3;
  if (normalized.includes("week")) return absolute * 4.33;
  return absolute;
}

function getSubscriptionAuditGroupName(description: string): SubscriptionAuditGroupName {
  const normalized = description.toLowerCase();
  for (const rule of SUBSCRIPTION_AUDIT_KEYWORDS) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.groupName;
    }
  }
  return "other";
}

export async function getAccountBalances() {
  const db = await getDb();
  return db.collection("accounts").find({ last_balance: { $ne: null } }).sort({ last_balance: -1 }).toArray();
}

export async function getMonthlyTotals(months = 6) {
  const db = await getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  
  const pipeline = [
    { $match: { date: { $gte: start }, amount: { $ne: null }, category: { $ne: "Transfer" } } },
    { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
    { $group: {
      _id: "$monthKey",
      income: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
      expenses: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
      count: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ];
  return db.collection("transactions").aggregate(pipeline).toArray();
}

export async function getCategorySpending(year?: number, month?: number) {
  const db = await getDb();
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);

  const pipeline = [
    { $match: { date: { $gte: start, $lt: end }, amount: { $lt: 0 }, category: { $nin: ["Transfer", null, ""] } } },
    { $group: { _id: "$category", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ];
  return db.collection("transactions").aggregate(pipeline).toArray();
}

export async function getCategoryDetail(name: string, days?: number) {
  const db = await getDb();
  const now = new Date();
  const startOfWindow = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthlyRows = await db.collection("transactions").aggregate([
    {
      $match: {
        category: name,
        amount: { $lt: 0 },
        date: { $gte: startOfWindow },
      },
    },
    { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
    { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } } } },
    { $sort: { _id: 1 } },
  ]).toArray();

  const monthlyMap: Record<string, number> = {};
  for (const row of monthlyRows as { _id: string; total: number }[]) {
    if (!row._id) continue;
    monthlyMap[row._id] = row.total;
  }
  const monthlyTotals = monthKeys.map((month) => ({
    month,
    total: monthlyMap[month] || 0,
  }));
  const avgMonthly = monthlyTotals.reduce((s, m) => s + m.total, 0) / monthlyTotals.length;

  const lifetimeRow = await db.collection("transactions").aggregate([
    { $match: { category: name, amount: { $lt: 0 } } },
    { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } },
  ]).toArray();
  const lifetimeTotal = (lifetimeRow[0] as { total?: number } | undefined)?.total || 0;

  const topMerchants = await db.collection("transactions").aggregate([
    { $match: { category: name, amount: { $lt: 0 }, description: { $ne: null } } },
    { $group: { _id: "$description", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]).toArray();

  const txFilter: Record<string, unknown> = {
    category: name,
    amount: { $lt: 0 },
  };
  if (typeof days === "number" && Number.isFinite(days)) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    txFilter.date = { $gte: since };
  }

  const transactions = await db.collection("transactions")
    .find(txFilter)
    .project({ transaction_id: 1, date: 1, description: 1, amount: 1 })
    .sort({ date: -1 })
    .toArray();

  return {
    transactions,
    monthlyTotals,
    topMerchants,
    avgMonthly,
    lifetimeTotal,
  };
}

export async function getRecentTransactions(limit = 20) {
  const db = await getDb();
  return db.collection("transactions").find({ amount: { $ne: null } }).sort({ date: -1 }).limit(limit).toArray();
}

// ─── Spending Anomaly Detector ─────────────────────────────────────────────
export async function getSpendingAnomalies() {
  const db = await getDb();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const monthKeys = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const currentMonthKey = monthKeys[monthKeys.length - 1];

  const [categoryAverages, recentTransactions, categoryMonthly, priorMerchants, currentMonthTransactions, merchantMonthly] =
    await Promise.all([
      db.collection("transactions").aggregate([
        {
          $match: {
            date: { $gte: sixMonthsAgo },
            amount: { $lt: 0 },
            category: { $nin: ["Transfer", null, ""] },
          },
        },
        { $group: { _id: "$category", avgAmount: { $avg: { $abs: "$amount" } }, count: { $sum: 1 } } },
        { $match: { avgAmount: { $gt: 0 } } },
      ]).toArray(),
      db.collection("transactions").find({
        date: { $gte: ninetyDaysAgo },
        amount: { $lt: 0 },
        category: { $nin: ["Transfer", null, ""] },
      }).project({ date: 1, description: 1, amount: 1, category: 1 }).sort({ date: -1 }).toArray(),
      db.collection("transactions").aggregate([
        {
          $match: {
            date: { $gte: threeMonthsAgo },
            amount: { $lt: 0 },
            category: { $nin: ["Transfer", null, ""] },
          },
        },
        { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
        { $group: { _id: { category: "$category", month: "$monthKey" }, total: { $sum: { $abs: "$amount" } } } },
      ]).toArray(),
      db.collection("transactions").distinct("description", {
        date: { $lt: startOfMonth },
        amount: { $lt: 0 },
        description: { $ne: null },
      }),
      db.collection("transactions").find({
        date: { $gte: startOfMonth },
        amount: { $lt: -20 },
        category: { $ne: "Transfer" },
        description: { $ne: null },
      }).project({ date: 1, description: 1, amount: 1, category: 1 }).sort({ date: -1 }).toArray(),
      db.collection("transactions").aggregate([
        {
          $match: {
            date: { $gte: threeMonthsAgo },
            amount: { $lt: 0 },
            category: { $ne: "Transfer" },
            description: { $ne: null },
          },
        },
        { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
        {
          $group: {
            _id: { description: "$description", month: "$monthKey" },
            count: { $sum: 1 },
            total: { $sum: { $abs: "$amount" } },
            lastSeen: { $max: "$date" },
            category: { $last: "$category" },
          },
        },
      ]).toArray(),
    ]);

  const avgMap = new Map<string, { avg: number; count: number }>();
  for (const row of categoryAverages as { _id: string; avgAmount: number; count: number }[]) {
    if (!row?._id) continue;
    avgMap.set(row._id, { avg: row.avgAmount, count: row.count });
  }

  const largeTransactions = (recentTransactions as { date: Date; description?: string; amount: number; category?: string }[])
    .map((tx) => {
      const category = tx.category || "Uncategorized";
      const avg = avgMap.get(category)?.avg || 0;
      const amount = Math.abs(Number(tx.amount) || 0);
      const multiple = avg > 0 ? amount / avg : 0;
      return {
        date: tx.date,
        description: tx.description || "Unknown",
        category,
        amount,
        categoryAvg: avg,
        multiple,
      };
    })
    .filter((tx) => tx.categoryAvg > 0 && tx.multiple >= 2)
    .sort((a, b) => b.multiple - a.multiple)
    .slice(0, 30);

  type CategoryRow = { _id: { category: string; month: string }; total: number };
  const categoryMap: Record<string, Record<string, number>> = {};
  for (const row of categoryMonthly as CategoryRow[]) {
    if (!row._id?.category) continue;
    if (!categoryMap[row._id.category]) categoryMap[row._id.category] = {};
    categoryMap[row._id.category][row._id.month] = row.total;
  }

  const categorySpikes = Object.entries(categoryMap).map(([category, months]) => {
    const currentTotal = months[currentMonthKey] || 0;
    const prevTotals = monthKeys.slice(0, 3).map((m) => months[m] || 0);
    const avgPrior3 = prevTotals.reduce((sum, v) => sum + v, 0) / 3;
    const ratio = avgPrior3 > 0 ? currentTotal / avgPrior3 : 0;
    return {
      category,
      currentTotal,
      avgPrior3,
      ratio,
    };
  }).filter((c) => c.avgPrior3 > 0 && c.currentTotal > c.avgPrior3 * 1.5)
    .sort((a, b) => b.ratio - a.ratio);

  const priorMerchantSet = new Set(priorMerchants as string[]);
  const newMerchantMap = new Map<string, {
    merchant: string;
    firstSeen: Date;
    category: string;
    total: number;
    count: number;
    largestAmount: number;
  }>();
  for (const tx of currentMonthTransactions as { date: Date; description?: string; amount: number; category?: string }[]) {
    const merchant = (tx.description || "").trim();
    if (!merchant || priorMerchantSet.has(merchant)) continue;
    const amount = Math.abs(Number(tx.amount) || 0);
    const existing = newMerchantMap.get(merchant);
    if (!existing) {
      newMerchantMap.set(merchant, {
        merchant,
        firstSeen: tx.date,
        category: tx.category || "Uncategorized",
        total: amount,
        count: 1,
        largestAmount: amount,
      });
    } else {
      existing.total += amount;
      existing.count += 1;
      if (tx.date < existing.firstSeen) existing.firstSeen = tx.date;
      if (amount > existing.largestAmount) existing.largestAmount = amount;
    }
  }
  const newMerchants = Array.from(newMerchantMap.values())
    .sort((a, b) => b.largestAmount - a.largestAmount)
    .slice(0, 30);

  type MerchantRow = { _id: { description: string; month: string }; count: number; total: number; lastSeen?: Date; category?: string };
  const merchantMap: Record<string, { counts: Record<string, number>; total: number; lastSeen?: Date; category?: string }> = {};
  for (const row of merchantMonthly as MerchantRow[]) {
    const desc = row._id?.description || "Unknown";
    if (!merchantMap[desc]) {
      merchantMap[desc] = { counts: {}, total: 0, lastSeen: row.lastSeen, category: row.category };
    }
    merchantMap[desc].counts[row._id.month] = row.count;
    merchantMap[desc].total += row.total;
    if (row.lastSeen && (!merchantMap[desc].lastSeen || row.lastSeen > merchantMap[desc].lastSeen!)) {
      merchantMap[desc].lastSeen = row.lastSeen;
    }
  }

  const frequencySpikes = Object.entries(merchantMap).map(([merchant, data]) => {
    const currentCount = data.counts[currentMonthKey] || 0;
    const prevCounts = monthKeys.slice(0, 3).map((m) => data.counts[m] || 0);
    const avgPrior3 = prevCounts.reduce((sum, v) => sum + v, 0) / 3;
    const ratio = avgPrior3 > 0 ? currentCount / avgPrior3 : 0;
    return {
      merchant,
      currentCount,
      avgPrior3,
      ratio,
      lastSeen: data.lastSeen,
      category: data.category || "Uncategorized",
    };
  }).filter((m) => m.avgPrior3 > 0 && m.currentCount >= 3 && m.ratio >= 1.5)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 30);

  return {
    largeTransactions,
    categorySpikes,
    newMerchants,
    frequencySpikes,
    currentMonthKey,
  };
}

// ─── Duplicate Charge Detector ────────────────────────────────────────────
export async function getDuplicateCharges() {
  const db = await getDb();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  type DuplicateCandidate = {
    transaction_id?: string;
    date: Date;
    description?: string;
    amount: number;
    category?: string | null;
  };

  type DuplicateCluster = {
    date: Date;
    description: string;
    amount: number;
    count: number;
    totalCharged: number;
    windowHours: number;
  };

  const transactions = await db.collection("transactions")
    .find({
      date: { $gte: ninetyDaysAgo },
      amount: { $lt: 0 },
      category: { $ne: "Transfer" },
    })
    .project({ transaction_id: 1, date: 1, description: 1, amount: 1, category: 1 })
    .sort({ description: 1, date: 1, amount: 1 })
    .toArray() as DuplicateCandidate[];

  const normalizeDescription = (value?: string) => value?.trim().replace(/\s+/g, " ").toLowerCase() || "";
  const maxWindowMs = 48 * 60 * 60 * 1000;
  const withinTolerance = (left: number, right: number) => {
    const leftAbs = Math.abs(left);
    const rightAbs = Math.abs(right);
    const base = Math.min(leftAbs, rightAbs);
    return Math.abs(leftAbs - rightAbs) <= base * 0.05;
  };

  const byDescription = new Map<string, DuplicateCandidate[]>();
  for (const tx of transactions) {
    const normalizedDescription = normalizeDescription(tx.description);
    if (!normalizedDescription) continue;
    const list = byDescription.get(normalizedDescription);
    if (list) list.push(tx);
    else byDescription.set(normalizedDescription, [tx]);
  }

  const clusters: DuplicateCluster[] = [];

  for (const group of byDescription.values()) {
    group.sort((a, b) => a.date.getTime() - b.date.getTime());

    let start = 0;
    while (start < group.length) {
      let end = start + 1;
      const cluster = [group[start]];
      let clusterMin = Math.abs(group[start].amount);
      let clusterMax = Math.abs(group[start].amount);

      while (end < group.length) {
        const earliest = group[start].date.getTime();
        const candidate = group[end];
        const candidateTime = candidate.date.getTime();
        if (candidateTime - earliest > maxWindowMs) break;

        const candidateAbs = Math.abs(candidate.amount);
        const nextMin = Math.min(clusterMin, candidateAbs);
        const nextMax = Math.max(clusterMax, candidateAbs);

        if (withinTolerance(nextMin, nextMax)) {
          cluster.push(candidate);
          clusterMin = nextMin;
          clusterMax = nextMax;
          end += 1;
          continue;
        }

        break;
      }

      if (cluster.length >= 2) {
        const sortedCluster = [...cluster].sort((a, b) => a.date.getTime() - b.date.getTime());
        const first = sortedCluster[0];
        const last = sortedCluster[sortedCluster.length - 1];
        clusters.push({
          date: first.date,
          description: first.description || "Unknown",
          amount: first.amount,
          count: sortedCluster.length,
          totalCharged: sortedCluster.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
          windowHours: Number((((last.date.getTime() - first.date.getTime()) / (60 * 60 * 1000))).toFixed(1)),
        });
        start = end;
      } else {
        start += 1;
      }
    }
  }

  return clusters.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getTransactions(params: {
  search?: string; category?: string; account?: string;
  dateFrom?: string; dateTo?: string;
  page?: number; limit?: number;
}) {
  const db = await getDb();
  const filter: Record<string, unknown> = { amount: { $ne: null } };
  
  if (params.search) filter.description = { $regex: params.search, $options: "i" };
  if (params.category) filter.category = params.category;
  if (params.account) filter.account = params.account;
  if (params.dateFrom || params.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (params.dateFrom) dateFilter.$gte = new Date(params.dateFrom);
    if (params.dateTo) dateFilter.$lte = new Date(params.dateTo);
    filter.date = dateFilter;
  }

  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;
  
  const pipeline = [
    { $match: filter },
    { $sort: { date: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "receipt_attachments",
        localField: "transaction_id",
        foreignField: "transaction_id",
        as: "receipt_attachments",
      },
    },
    { $addFields: { receipt_attachment_count: { $size: "$receipt_attachments" } } },
    { $project: { receipt_attachments: 0 } },
  ];

  const [docs, total] = await Promise.all([
    db.collection("transactions").aggregate(pipeline).toArray(),
    db.collection("transactions").countDocuments(filter),
  ]);
  return { docs, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getRecurringPatterns() {
  const db = await getDb();
  return db.collection("recurring_patterns").find({}).sort({ average_amount: 1 }).toArray();
}

export async function getSubscriptionAuditReport(): Promise<SubscriptionAuditReport> {
  const db = await getDb();
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  type PatternDoc = {
    description?: string | null;
    sample_description?: string | null;
    average_amount: number;
    frequency?: string | null;
    last_seen?: Date | string | null;
  };

  type MonthlyActualRow = {
    _id: { merchant: string; month: string };
    total: number;
  };

  const patterns = await db.collection("recurring_patterns")
    .find({
      average_amount: { $lt: 0 },
      last_seen: { $gte: twelveMonthsAgo },
    })
    .sort({ average_amount: 1 })
    .toArray() as unknown as PatternDoc[];

  const merchantNames = patterns
    .map((pattern) => (pattern.sample_description || pattern.description || "").trim())
    .filter((merchant) => merchant.length > 0);

  const monthlyActuals = merchantNames.length > 0
    ? await db.collection("transactions").aggregate([
        {
          $match: {
            date: { $gte: twelveMonthsAgo },
            amount: { $lt: 0 },
            description: { $in: merchantNames },
          },
        },
        { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
        {
          $group: {
            _id: { merchant: "$description", month: "$monthKey" },
            total: { $sum: { $abs: "$amount" } },
          },
        },
      ]).toArray() as MonthlyActualRow[]
    : [];

  const monthlyTotalsByMerchant = new Map<string, number[]>();
  for (const row of monthlyActuals) {
    const merchant = row._id?.merchant;
    if (!merchant) continue;
    const current = monthlyTotalsByMerchant.get(merchant) || [];
    current.push(row.total || 0);
    monthlyTotalsByMerchant.set(merchant, current);
  }

  const groupsMap = new Map<SubscriptionAuditGroupName, SubscriptionAuditGroup>();
  let redundantGroupCount = 0;
  let priceCreepCount = 0;
  let variancePenaltyCount = 0;

  for (const pattern of patterns) {
    const merchant = (pattern.sample_description || pattern.description || "Unknown").trim() || "Unknown";
    const monthlyAmount = toMonthlyEquivalent(pattern.average_amount, pattern.frequency);
    const monthlySeries = [...(monthlyTotalsByMerchant.get(merchant) || [])].sort((a, b) => a - b);
    const amountVariance = monthlySeries.length > 0
      ? Math.max(...monthlySeries) - Math.min(...monthlySeries)
      : 0;

    const firstThree = monthlySeries.slice(0, 3);
    const lastThree = monthlySeries.slice(-3);
    const firstThreeAvg = firstThree.length > 0 ? firstThree.reduce((sum, value) => sum + value, 0) / firstThree.length : monthlyAmount;
    const lastThreeAvg = lastThree.length > 0 ? lastThree.reduce((sum, value) => sum + value, 0) / lastThree.length : monthlyAmount;
    const hasPriceCreep = firstThreeAvg > 0 && lastThreeAvg > firstThreeAvg * 1.05;

    if (hasPriceCreep) priceCreepCount += 1;
    if (monthlyAmount > 0 && amountVariance > monthlyAmount * 0.1) variancePenaltyCount += 1;

    const groupName = getSubscriptionAuditGroupName(merchant);
    const existing = groupsMap.get(groupName) || {
      groupName,
      count: 0,
      totalMonthly: 0,
      isRedundant: false,
      subscriptions: [],
    };

    existing.count += 1;
    existing.totalMonthly += monthlyAmount;
    existing.subscriptions.push({
      merchant,
      monthlyAmount,
      amountVariance,
      hasPriceCreep,
    });
    groupsMap.set(groupName, existing);
  }

  const groups = Array.from(groupsMap.values()).map((group) => {
    const isRedundant = group.count >= 2;
    if (isRedundant) redundantGroupCount += 1;
    return {
      ...group,
      isRedundant,
      totalMonthly: Number(group.totalMonthly.toFixed(2)),
      subscriptions: group.subscriptions.sort((a, b) => b.monthlyAmount - a.monthlyAmount),
    };
  });

  const totalMonthlySpend = groups.reduce((sum, group) => sum + group.totalMonthly, 0);
  const healthScore = Math.max(0, 100 - (redundantGroupCount * 5) - (priceCreepCount * 2) - variancePenaltyCount);

  return {
    groups,
    healthScore,
    totalMonthlySpend: Number(totalMonthlySpend.toFixed(2)),
    redundantGroupCount,
    priceCreepCount,
  };
}

export async function getCategories() {
  const db = await getDb();
  return db.collection("categories").find({}).sort({ category: 1 }).toArray();
}

export async function getDistinctCategories() {
  const db = await getDb();
  return db.collection("transactions").distinct("category");
}

export async function getDistinctAccounts() {
  const db = await getDb();
  return db.collection("transactions").distinct("account");
}

export async function getInsightsData() {
  const db = await getDb();
  
  // Day of week spending
  const dowPipeline = [
    { $match: { amount: { $lt: 0 }, category: { $ne: "Transfer" }, date: { $ne: null } } },
    { $addFields: { dow: { $dayOfWeek: "$date" } } },
    { $group: { _id: "$dow", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];
  
  // Top merchants (by description, top 15)
  const merchantPipeline = [
    { $match: { amount: { $lt: 0 }, category: { $nin: ["Transfer", "Investment"] } } },
    { $group: { _id: "$description", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 15 },
  ];
  
  // Category trend (last 6 months, top 8 categories)
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const trendPipeline = [
    { $match: { date: { $gte: sixMonthsAgo }, amount: { $lt: 0 }, category: { $nin: ["Transfer", "Investment", null, ""] } } },
    { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
    { $group: { _id: { month: "$monthKey", category: "$category" }, total: { $sum: { $abs: "$amount" } } } },
    { $sort: { "_id.month": 1 } },
  ];
  
  const [dow, merchants, trends] = await Promise.all([
    db.collection("transactions").aggregate(dowPipeline).toArray(),
    db.collection("transactions").aggregate(merchantPipeline).toArray(),
    db.collection("transactions").aggregate(trendPipeline).toArray(),
  ]);
  
  return { dow, merchants, trends };
}

// ─── New Recurring Charge Alert ────────────────────────────────────────────
export async function getNewRecurringCharges() {
  const db = await getDb();

  const recurringKeywords = [
    "netflix", "spotify", "apple", "openai", "anthropic", "cursor", "alpacadb",
    "replit", "godaddy", "cloudflare", "vercel", "railway", "grammarly",
    "amazon", "adobe", "github", "google", "notion", "figma", "zoom",
    "dropbox", "finnhub", "massive", "myheritage",
  ];

  const now = new Date();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 60);
  windowStart.setHours(0, 0, 0, 0);

  const orderedKeywords = [...recurringKeywords].sort((a, b) => b.length - a.length);
  const keywordRegexes = orderedKeywords.map((k) => new RegExp(k, "i"));

  const recentTransactions = await db.collection("transactions").find({
    date: { $gte: windowStart },
    amount: { $lt: 0 },
    category: { $ne: "Transfer" },
    description: { $in: keywordRegexes },
  }).project({ description: 1, date: 1, amount: 1 }).toArray();

  const byMerchant = new Map<string, { merchant: string; firstSeenDate: Date; amount: number }>();

  for (const tx of recentTransactions) {
    const description = (tx.description || "").toString();
    if (!description) continue;

    let matchedKey: string | null = null;
    let matchedLabel: string | null = null;
    for (const keyword of orderedKeywords) {
      if (description.toLowerCase().includes(keyword)) {
        matchedKey = keyword;
        const match = description.match(new RegExp(keyword, "i"));
        matchedLabel = match?.[0] || keyword;
        break;
      }
    }
    if (!matchedKey) continue;

    const existing = byMerchant.get(matchedKey);
    const date = tx.date ? new Date(tx.date) : null;
    if (!date) continue;

    if (!existing || date < existing.firstSeenDate) {
      byMerchant.set(matchedKey, {
        merchant: matchedLabel || matchedKey,
        firstSeenDate: date,
        amount: Math.abs(Number(tx.amount) || 0),
      });
    }
  }

  const merchants = Array.from(byMerchant.entries());
  const priorChecks = await Promise.all(merchants.map(async ([key]) => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return db.collection("transactions").findOne({
      date: { $lt: windowStart },
      amount: { $lt: 0 },
      description: { $regex: new RegExp(escaped, "i") },
    }, { projection: { _id: 1 } });
  }));

  const results = merchants
    .filter((_, i) => !priorChecks[i])
    .map(([_, data]) => {
      const daysAgo = Math.floor((now.getTime() - data.firstSeenDate.getTime()) / 86400000);
      const projectedAnnualCost = data.amount * 12;
      return {
        merchant: data.merchant,
        firstSeenDate: data.firstSeenDate,
        amount: data.amount,
        daysAgo,
        projectedAnnualCost,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return results;
}

// ─── Subscription Audit ────────────────────────────────────────────────────
export async function getSubscriptionAudit() {
  const db = await getDb();

  // Recurring expense patterns
  const patterns = await db.collection("recurring_patterns")
    .find({ average_amount: { $lt: 0 } })
    .sort({ average_amount: 1 })
    .toArray();

  // Frequent merchants in last 90 days (2+ charges, look like subscriptions)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const frequentMerchants = await db.collection("transactions").aggregate([
    { $match: { date: { $gte: ninetyDaysAgo }, amount: { $lt: 0 }, category: { $ne: "Transfer" } } },
    {
      $group: {
        _id: "$description",
        count: { $sum: 1 },
        total: { $sum: { $abs: "$amount" } },
        avg: { $avg: { $abs: "$amount" } },
        lastSeen: { $max: "$date" },
        category: { $last: "$category" },
      },
    },
    { $match: { count: { $gte: 2 } } },
    { $sort: { avg: -1 } },
  ]).toArray();

  return { patterns, frequentMerchants };
}

// ─── Subscription Tier Escalation Alert ────────────────────────────────────
export async function getSubscriptionEscalations() {
  const db = await getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  start.setHours(0, 0, 0, 0);

  const subscriptionKeywords = [
    "netflix", "spotify", "apple", "google", "adobe", "github", "openai", "anthropic",
    "chatgpt", "cursor", "onlyfans", "alpacadb", "replit", "perplexity", "youtube",
    "dropbox", "notion", "figma", "canva", "zoom", "godaddy", "cloudflare", "vercel",
    "railway", "grammarly", "duolingo", "hulu", "disney", "amazon", "myheritage",
    "butcherbox", "massive", "finnhub",
  ];
  const keywordRegexes = subscriptionKeywords.map((k) => new RegExp(k, "i"));

  const rows = await db.collection("transactions").aggregate([
    {
      $match: {
        date: { $gte: start },
        amount: { $lt: 0 },
        category: { $ne: "Transfer" },
        description: { $in: keywordRegexes },
      },
    },
    { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
    {
      $group: {
        _id: { description: "$description", month: "$monthKey" },
        total: { $sum: { $abs: "$amount" } },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]).toArray();

  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  function normalizeMerchant(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayMerchant(raw: string): string {
    return raw.replace(/\s+/g, " ").trim();
  }

  type MonthlyRow = { _id: { description?: string; month: string }; total: number };
  const merchantMap: Record<string, { merchant: string; monthlyTotals: Record<string, number> }> = {};

  for (const row of rows as MonthlyRow[]) {
    const rawDesc = row._id.description || "Unknown";
    const normalized = normalizeMerchant(rawDesc);
    if (!normalized) continue;
    if (!merchantMap[normalized]) {
      merchantMap[normalized] = { merchant: displayMerchant(rawDesc), monthlyTotals: {} };
    }
    merchantMap[normalized].monthlyTotals[row._id.month] =
      (merchantMap[normalized].monthlyTotals[row._id.month] || 0) + row.total;
  }

  const results = Object.values(merchantMap)
    .map((m) => {
      const monthlyHistory = monthKeys.map((month) => ({
        month,
        amount: m.monthlyTotals[month] || 0,
      }));

      let biggestJump = 0;
      let jumpFromMonth = "";
      let jumpToMonth = "";

      for (let i = 1; i < monthlyHistory.length; i += 1) {
        const prev = monthlyHistory[i - 1].amount;
        const cur = monthlyHistory[i].amount;
        if (prev <= 0 || cur <= prev) continue;
        const pct = ((cur - prev) / prev) * 100;
        if (pct > biggestJump) {
          biggestJump = pct;
          jumpFromMonth = monthlyHistory[i - 1].month;
          jumpToMonth = monthlyHistory[i].month;
        }
      }

      let currentMonthlyAmount = 0;
      for (let i = monthlyHistory.length - 1; i >= 0; i -= 1) {
        if (monthlyHistory[i].amount > 0) {
          currentMonthlyAmount = monthlyHistory[i].amount;
          break;
        }
      }

      return {
        merchant: m.merchant,
        monthlyHistory,
        biggestJump,
        jumpFromMonth,
        jumpToMonth,
        currentMonthlyAmount,
      };
    })
    .filter((m) => m.biggestJump > 50)
    .sort((a, b) => b.biggestJump - a.biggestJump);

  return results;
}

// ─── AI Spend Tracker ──────────────────────────────────────────────────────
export async function getAISpendData() {
  const db = await getDb();
  const aiRegex = getAISpendRegexes();

  const [byVendor, monthlyTotals] = await Promise.all([
    db.collection("transactions").aggregate([
      { $match: { amount: { $lt: 0 }, description: { $in: aiRegex } } },
      {
        $group: {
          _id: "$description",
          total: { $sum: { $abs: "$amount" } },
          count: { $sum: 1 },
          lastSeen: { $max: "$date" },
          avgAmount: { $avg: { $abs: "$amount" } },
        },
      },
      { $sort: { total: -1 } },
    ]).toArray(),
    db.collection("transactions").aggregate([
      { $match: { amount: { $lt: 0 }, description: { $in: aiRegex } } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]).toArray(),
  ]);

  return { byVendor, monthlyTotals };
}

// ─── Trading Infrastructure Cost Center ───────────────────────────────────
export async function getTradingInfraCostCenter() {
  const db = await getDb();
  const vendorMatchers = [
    { name: "AlpacaDB", regex: /ALPACADB/i },
    { name: "Alpaca", regex: /ALPACA/i },
    { name: "Finnhub", regex: /FINNHUB/i },
    { name: "Finviz", regex: /FINVIZ/i },
    { name: "TradingView", regex: /TRADINGVIEW/i },
    { name: "Interactive Brokers", regex: /INTERACTIVE BROKERS/i },
    { name: "IBKR", regex: /IBKR/i },
    { name: "tastytrade", regex: /TASTYTRADE/i },
    { name: "tastyworks", regex: /TASTYWORKS/i },
    { name: "Polygon.io", regex: /POLYGON\.IO/i },
    { name: "Quandl", regex: /QUANDL/i },
    { name: "Intrinio", regex: /INTRINIO/i },
  ];

  const now = new Date();
  const monthKeys = Array.from({ length: 12 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const orPatterns = vendorMatchers.map((vendor) => ({ description: vendor.regex }));

  const rows = await db.collection("transactions").find({
    amount: { $lt: 0 },
    description: { $ne: null },
    $or: orPatterns,
  }).project({ date: 1, description: 1, amount: 1 }).sort({ date: 1 }).toArray();

  const monthlyMap: Record<string, number> = Object.fromEntries(monthKeys.map((month) => [month, 0]));
  const vendorMap = new Map<string, {
    name: string;
    total: number;
    chargeCount: number;
    lastCharge: Date | null;
    monthlyTotals: Record<string, number>;
  }>();

  const normalizeVendor = (description: string) => {
    const matched = vendorMatchers.find((vendor) => vendor.regex.test(description));
    return matched?.name || description.trim();
  };

  for (const row of rows as { date?: Date; description?: string; amount: number }[]) {
    const description = row.description || "Unknown";
    const vendor = normalizeVendor(description);
    const amount = Math.abs(Number(row.amount) || 0);
    const date = row.date ? new Date(row.date) : null;
    const monthKey = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : null;

    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, {
        name: vendor,
        total: 0,
        chargeCount: 0,
        lastCharge: null,
        monthlyTotals: {},
      });
    }

    const summary = vendorMap.get(vendor)!;
    summary.total += amount;
    summary.chargeCount += 1;
    if (date && (!summary.lastCharge || date > summary.lastCharge)) {
      summary.lastCharge = date;
    }
    if (monthKey) {
      summary.monthlyTotals[monthKey] = (summary.monthlyTotals[monthKey] || 0) + amount;
      if (monthKey in monthlyMap) {
        monthlyMap[monthKey] += amount;
      }
    }
  }

  const monthlyTotals = monthKeys.map((month) => ({ month, total: monthlyMap[month] || 0 }));
  const avgMonthly = monthlyTotals.reduce((sum, month) => sum + month.total, 0) / monthKeys.length;
  const grandTotal = Array.from(vendorMap.values()).reduce((sum, vendor) => sum + vendor.total, 0);

  const vendorSummaries = Array.from(vendorMap.values())
    .map((vendor) => ({
      name: vendor.name,
      total: vendor.total,
      monthlyAvg: vendor.total / monthKeys.length,
      lastCharge: vendor.lastCharge,
      chargeCount: vendor.chargeCount,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    vendorSummaries,
    monthlyTotals,
    grandTotal,
    avgMonthly,
  };
}

// ─── Auto Repair Timeline ──────────────────────────────────────────────────
export async function getAutoRepairTimeline() {
  const db = await getDb();

  const shopKeywords = [
    "integrity 1st",
    "rev-up",
    "revup",
    "brakes plus",
    "autozone",
    "oreilly",
    "o'reilly",
    "napa",
    "advance auto",
  ];
  const shopRegex = shopKeywords.map((k) => new RegExp(k, "i"));
  const categoryRegex = new RegExp("(auto|car|vehicle)", "i");

  const pipeline = [
    {
      $match: {
        amount: { $lt: 0 },
        date: { $ne: null },
        $or: [
          { description: { $in: shopRegex } },
          { category: { $regex: categoryRegex } },
        ],
      },
    },
    {
      $project: {
        _id: 0,
        date: 1,
        description: 1,
        amount: { $abs: "$amount" },
      },
    },
    { $sort: { date: 1 } },
  ];

  return db.collection("transactions").aggregate(pipeline).toArray();
}

export async function getInsuranceEventData() {
  const db = await getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 23, 1);
  const insuranceRegex = /insurance/i;

  const [transactions, monthlyRows, dayRows, merchantRows] = await Promise.all([
    db.collection("transactions")
      .find({
        date: { $gte: start },
        category: { $regex: insuranceRegex },
        amount: { $ne: null },
      })
      .project({ _id: 0, date: 1, description: 1, amount: 1, category: 1 })
      .sort({ date: -1 })
      .toArray(),
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: start },
          category: { $regex: insuranceRegex },
          amount: { $ne: null },
        },
      },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      {
        $group: {
          _id: "$monthKey",
          total: { $sum: { $abs: "$amount" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: start },
          category: { $regex: insuranceRegex },
          amount: { $ne: null },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$date" },
          count: { $sum: 1 },
          totalAmount: { $sum: { $abs: "$amount" } },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ]).toArray(),
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: start },
          category: { $regex: insuranceRegex },
          amount: { $ne: null },
          description: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$description",
          count: { $sum: 1 },
          total: { $sum: { $abs: "$amount" } },
          avgAmount: { $avg: { $abs: "$amount" } },
        },
      },
      { $sort: { count: -1, total: -1, _id: 1 } },
      { $limit: 10 },
    ]).toArray(),
  ]);

  const allTransactions = (transactions as { date: Date; description?: string; amount: number; category?: string }[])
    .map((tx) => ({
      date: tx.date,
      description: tx.description || "Unknown",
      amount: Math.abs(Number(tx.amount) || 0),
      category: tx.category || "Insurance",
    }));

  const rollingAverage = allTransactions.length > 0
    ? allTransactions.reduce((sum, tx) => sum + tx.amount, 0) / allTransactions.length
    : 0;

  const largeEvents = allTransactions
    .filter((tx) => rollingAverage > 0 && tx.amount > rollingAverage * 2)
    .map((tx) => ({
      ...tx,
      multiplier: tx.amount / rollingAverage,
    }));

  const monthKeys = Array.from({ length: 24 }, (_, index) => {
    const d = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthlyMap = new Map((monthlyRows as { _id: string; total: number; count: number }[]).map((row) => [
    row._id,
    { month: row._id, total: row.total, count: row.count },
  ]));

  const monthlyTotals = monthKeys.map((month) => monthlyMap.get(month) || { month, total: 0, count: 0 });

  const dayOfMonthPatterns = (dayRows as { _id: number; count: number; totalAmount: number }[]).map((row) => ({
    day: row._id,
    count: row.count,
    totalAmount: row.totalAmount,
  }));

  const topMerchants = (merchantRows as { _id: string; count: number; total: number; avgAmount: number }[]).map((row) => ({
    description: row._id || "Unknown",
    count: row.count,
    total: row.total,
    avgAmount: row.avgAmount,
  }));

  return {
    allTransactions,
    rollingAverage,
    largeEvents,
    monthlyTotals,
    dayOfMonthPatterns,
    topMerchants,
  };
}

// ─── Spending Heatmap Calendar ─────────────────────────────────────────────
export async function getSpendingHeatmapData(year: number, month: number) {
  const db = await getDb();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const [dailyTotals, transactions] = await Promise.all([
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: start, $lt: end }, amount: { $lt: 0 }, category: { $ne: "Transfer" } } },
      { $addFields: { dayKey: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } } },
      { $group: { _id: "$dayKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("transactions").find({
      date: { $gte: start, $lt: end },
      amount: { $lt: 0 },
      category: { $ne: "Transfer" },
    }).sort({ date: 1, amount: 1 }).toArray(),
  ]);

  return { dailyTotals, transactions };
}

// ─── Delivery vs Dine-In Comparison ───────────────────────────────────────
export async function getDeliveryVsDineInData(months = 6) {
  const db = await getDb();
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const deliveryKeywords = ["uber eats", "doordash", "grubhub", "instacart", "postmates", "seamless", "caviar", "gopuff"];
  const deliveryRegex = deliveryKeywords.map((k) => new RegExp(k, "i"));

  const [deliveryByMonth, dineInByMonth, deliveryMerchants, dineInMerchants] = await Promise.all([
    // Delivery by month
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: start }, amount: { $lt: 0 }, description: { $in: deliveryRegex } } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    // Dine-in (restaurants/food but NOT delivery) by month
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: start },
          amount: { $lt: 0 },
          category: { $in: ["Restaurants & Dining", "Food & Drink", "Dining", "Restaurants"] },
          description: { $nin: deliveryRegex },
        },
      },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    // Top delivery merchants
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: start }, amount: { $lt: 0 }, description: { $in: deliveryRegex } } },
      { $group: { _id: "$description", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 }, avg: { $avg: { $abs: "$amount" } } } },
      { $sort: { total: -1 } },
    ]).toArray(),
    // Top dine-in merchants
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: start },
          amount: { $lt: 0 },
          category: { $in: ["Restaurants & Dining", "Food & Drink", "Dining", "Restaurants"] },
          description: { $nin: deliveryRegex },
        },
      },
      { $group: { _id: "$description", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 }, avg: { $avg: { $abs: "$amount" } } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]).toArray(),
  ]);

  return { deliveryByMonth, dineInByMonth, deliveryMerchants, dineInMerchants };
}

// ─── Food Battle: Delivery vs Groceries ────────────────────────────────────
export async function getFoodBattleData(months = 6) {
  const db = await getDb();
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const deliveryPatterns = ["UBER EATS", "UBEREATS", "DOORDASH", "GRUBHUB", "INSTACART"];
  const groceryPatterns = ["KROGER", "HEB", "WHOLE FOODS", "WALMART", "TARGET", "SPROUTS", "COSTCO", "SAMS CLUB", "ALDI", "TRADER JOE"];

  const deliveryRegex = deliveryPatterns.map((pattern) => new RegExp(pattern, "i"));
  const groceryRegex = groceryPatterns.map((pattern) => new RegExp(pattern, "i"));

  const monthly = await db.collection("transactions").aggregate([
    {
      $match: {
        date: { $gte: start },
        amount: { $lt: 0 },
        $or: [
          { description: { $in: deliveryRegex } },
          { category: "Groceries" },
          { description: { $in: groceryRegex } },
        ],
      },
    },
    {
      $addFields: {
        monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } },
        absoluteAmount: { $abs: "$amount" },
        bucket: {
          $switch: {
            branches: [
              {
                case: {
                  $regexMatch: {
                    input: { $ifNull: ["$description", ""] },
                    regex: "UBER EATS|UBEREATS|DOORDASH|GRUBHUB|INSTACART",
                    options: "i",
                  },
                },
                then: "delivery",
              },
              {
                case: {
                  $or: [
                    { $eq: ["$category", "Groceries"] },
                    {
                      $regexMatch: {
                        input: { $ifNull: ["$description", ""] },
                        regex: "KROGER|HEB|WHOLE FOODS|WALMART|TARGET|SPROUTS|COSTCO|SAMS CLUB|ALDI|TRADER JOE",
                        options: "i",
                      },
                    },
                  ],
                },
                then: "grocery",
              },
            ],
            default: null,
          },
        },
      },
    },
    { $match: { bucket: { $in: ["delivery", "grocery"] } } },
    {
      $group: {
        _id: { month: "$monthKey", bucket: "$bucket" },
        total: { $sum: "$absoluteAmount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]).toArray();

  const monthMap = new Map<string, { month: string; delivery: number; grocery: number; deliveryCount: number; groceryCount: number; deliveryPct: number }>();

  for (const row of monthly) {
    const month = row._id.month;
    const current = monthMap.get(month) ?? {
      month,
      delivery: 0,
      grocery: 0,
      deliveryCount: 0,
      groceryCount: 0,
      deliveryPct: 0,
    };

    if (row._id.bucket === "delivery") {
      current.delivery = Number(row.total || 0);
      current.deliveryCount = Number(row.count || 0);
    }

    if (row._id.bucket === "grocery") {
      current.grocery = Number(row.total || 0);
      current.groceryCount = Number(row.count || 0);
    }

    monthMap.set(month, current);
  }

  const data = Array.from(monthMap.values()).map((item) => {
    const total = item.delivery + item.grocery;
    return {
      ...item,
      delivery: +item.delivery.toFixed(2),
      grocery: +item.grocery.toFixed(2),
      deliveryPct: total > 0 ? +((item.delivery / total) * 100).toFixed(1) : 0,
    };
  }).sort((a, b) => a.month.localeCompare(b.month));

  const allTime = await db.collection("transactions").aggregate([
    {
      $match: {
        amount: { $lt: 0 },
        $or: [
          { description: { $in: deliveryRegex } },
          { category: "Groceries" },
          { description: { $in: groceryRegex } },
        ],
      },
    },
    {
      $addFields: {
        absoluteAmount: { $abs: "$amount" },
        bucket: {
          $switch: {
            branches: [
              {
                case: {
                  $regexMatch: {
                    input: { $ifNull: ["$description", ""] },
                    regex: "UBER EATS|UBEREATS|DOORDASH|GRUBHUB|INSTACART",
                    options: "i",
                  },
                },
                then: "delivery",
              },
              {
                case: {
                  $or: [
                    { $eq: ["$category", "Groceries"] },
                    {
                      $regexMatch: {
                        input: { $ifNull: ["$description", ""] },
                        regex: "KROGER|HEB|WHOLE FOODS|WALMART|TARGET|SPROUTS|COSTCO|SAMS CLUB|ALDI|TRADER JOE",
                        options: "i",
                      },
                    },
                  ],
                },
                then: "grocery",
              },
            ],
            default: null,
          },
        },
      },
    },
    { $match: { bucket: { $in: ["delivery", "grocery"] } } },
    {
      $group: {
        _id: "$bucket",
        total: { $sum: "$absoluteAmount" },
      },
    },
  ]).toArray();

  const allTimeTotals = {
    delivery: +(allTime.find((item) => item._id === "delivery")?.total || 0).toFixed(2),
    grocery: +(allTime.find((item) => item._id === "grocery")?.total || 0).toFixed(2),
  };

  const currentMonthRatio = data.length > 0 ? data[data.length - 1].deliveryPct : 0;

  return {
    data,
    allTimeTotals,
    currentMonthRatio,
  };
}

// ─── Convenience Store Creep ───────────────────────────────────────────────
export async function getConvenienceStoreData(months = 12) {
  const db = await getDb();
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const convKeywords = [
    "7-eleven", "7eleven", "quiktrip", "qt ", " qt\\b", "wawa", "sheetz",
    "casey's", "circle k", "speedway", "ampm", "am-pm", "shell", "chevron",
    "exxon", "bp ", "sunoco", "marathon", "pilot", "flying j", "love's",
    "kum & go", "kwik trip", "kwiktrip", "racetrac", "race trac", "tom thumb",
    "kulsum", "speedy shop",
  ];
  const convRegex = convKeywords.map((k) => new RegExp(k, "i"));

  const [byMonth, byMerchant, recentTransactions] = await Promise.all([
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: start }, amount: { $lt: 0 }, description: { $in: convRegex } } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: start }, amount: { $lt: 0 }, description: { $in: convRegex } } },
      {
        $group: {
          _id: "$description",
          total: { $sum: { $abs: "$amount" } },
          count: { $sum: 1 },
          avg: { $avg: { $abs: "$amount" } },
          lastSeen: { $max: "$date" },
        },
      },
      { $sort: { total: -1 } },
    ]).toArray(),
    db.collection("transactions").find({
      date: { $gte: start },
      amount: { $lt: 0 },
      description: { $in: convRegex },
    }).sort({ date: -1 }).limit(50).toArray(),
  ]);

  return { byMonth, byMerchant, recentTransactions };
}

// ─── AI Vendor Monthly Breakdown (for MoM delta + Kill List) ──────────────
export async function getAIVendorMonthlyBreakdown() {
  const db = await getDb();
  const aiRegex = getAISpendRegexes();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  return db.collection("transactions").aggregate([
    { $match: { date: { $gte: sixMonthsAgo }, amount: { $lt: 0 }, description: { $in: aiRegex } } },
    { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
    {
      $group: {
        _id: { description: "$description", month: "$monthKey" },
        total: { $sum: { $abs: "$amount" } },
        count: { $sum: 1 },
        lastSeen: { $max: "$date" },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]).toArray();
}

export async function getAICategoryComparison() {
  const db = await getDb();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const aiRegex = getAISpendRegexes();

  const [categoryTotals, aiTotals] = await Promise.all([
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
          amount: { $lt: 0 },
          category: { $nin: ["Transfer", null, ""] },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: { $abs: "$amount" } },
        },
      },
      { $sort: { total: -1 } },
    ]).toArray(),
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
          amount: { $lt: 0 },
          description: { $in: aiRegex },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $abs: "$amount" } },
        },
      },
    ]).toArray(),
  ]);

  const aiTotal = (aiTotals[0] as { total?: number } | undefined)?.total || 0;
  const rows = (categoryTotals as Array<{ _id: string; total: number }>)
    .map((row) => ({ category: row._id, total: row.total }))
    .filter((row) => row.category);

  const aiIndex = rows.findIndex((row) => row.category === "AI Tools");
  if (aiIndex >= 0) {
    rows[aiIndex] = { category: "AI Tools", total: aiTotal };
  } else {
    rows.push({ category: "AI Tools", total: aiTotal });
  }

  return rows.sort((a, b) => b.total - a.total).slice(0, 8);
}

// ─── Utility Bill Anomaly Data ─────────────────────────────────────────────
export async function getUtilityBillData() {
  const db = await getDb();

  const utilityKeywords = [
    "4change", "at&t", "att ", "xfinity", "comcast", "t-mobile", "tmobile",
    "verizon", "spectrum", "google fiber", "cps energy", "txu energy",
    "reliant energy", "reliant", "oncor", "entergy", "southwest gas", "atmos",
    "republic services", "puget sound", "pg&e", "pge", "con edison",
    "duke energy", "dominion energy", "centerpoint",
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utilityRegex: any[] = utilityKeywords.map((k) => new RegExp(k, "i"));

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [rawByMonth, summary] = await Promise.all([
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: sixMonthsAgo }, amount: { $lt: 0 }, description: { $in: utilityRegex } } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      {
        $group: {
          _id: { description: "$description", month: "$monthKey" },
          total: { $sum: { $abs: "$amount" } },
          count: { $sum: 1 },
          lastSeen: { $max: "$date" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]).toArray(),
    // Overall utility spend by month
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: sixMonthsAgo }, amount: { $lt: 0 }, description: { $in: utilityRegex } } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  return { rawByMonth, summary };
}

// ─── Recurring Charge Change Detector ─────────────────────────────────────
export async function getRecurringChangeData() {
  const db = await getDb();

  const patterns = await db.collection("recurring_patterns")
    .find({ average_amount: { $lt: 0 } })
    .sort({ average_amount: 1 })
    .toArray();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  threeMonthsAgo.setDate(1);
  threeMonthsAgo.setHours(0, 0, 0, 0);

  // Build regexes from pattern descriptions to match actual transactions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const descMap: Map<string, string> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const descRegexes: any[] = patterns.map((p: any) => {
    const rawDesc = (p.sample_description || p.description || "").trim();
    // Escape special regex chars for safety
    const escaped = rawDesc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    descMap.set(rawDesc.toLowerCase(), rawDesc);
    return new RegExp(escaped, "i");
  }).filter((_: unknown, i: number) => patterns[i].sample_description || patterns[i].description);

  const monthlyActuals = descRegexes.length > 0
    ? await db.collection("transactions").aggregate([
        {
          $match: {
            date: { $gte: threeMonthsAgo },
            amount: { $lt: 0 },
            description: { $in: descRegexes },
          },
        },
        { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
        {
          $group: {
            _id: { description: "$description", month: "$monthKey" },
            total: { $sum: { $abs: "$amount" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.month": 1 } },
      ]).toArray()
    : [];

  return { patterns, monthlyActuals };
}

// ─── Cash Flow Projection ──────────────────────────────────────────────────
export async function getCashFlowProjection() {
  const db = await getDb();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [accounts, monthlyData, recurringPatterns, incomeSources] = await Promise.all([
    db.collection("accounts").find({ last_balance: { $ne: null } }).toArray(),
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: threeMonthsAgo }, amount: { $ne: null }, category: { $ne: "Transfer" } } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      {
        $group: {
          _id: "$monthKey",
          income: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
          expenses: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("recurring_patterns")
      .find({ average_amount: { $lt: 0 } })
      .sort({ average_amount: 1 })
      .toArray(),
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: sixtyDaysAgo }, amount: { $gt: 0 }, category: { $ne: "Transfer" } } },
      {
        $group: {
          _id: "$description",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          lastSeen: { $max: "$date" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]).toArray(),
  ]);

  return { accounts, monthlyData, recurringPatterns, incomeSources };
}

// ─── Savings Rate Timeline ─────────────────────────────────────────────────
export async function getMonthlySavingsRate(months = 12) {
  const db = await getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const pipeline = [
    { $match: { date: { $gte: start }, amount: { $ne: null }, category: { $ne: "Transfer" } } },
    { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
    {
      $group: {
        _id: "$monthKey",
        income: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
        expenses: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  type MonthlySavingsRow = { _id: string; income: number; expenses: number } & Record<string, unknown>;
  const rows = await db.collection("transactions").aggregate(pipeline).toArray() as MonthlySavingsRow[];
  return rows.map((r) => {
    // Cap income at 15k to avoid RSU/bonus anomaly months skewing the rate
    const cappedIncome = Math.min(r.income, 15000);
    const net = cappedIncome - r.expenses;
    const savingsRate = cappedIncome > 0 ? (net / cappedIncome) * 100 : 0;
    return { ...r, cappedIncome, net, savingsRate };
  });
}

// ─── Spending Velocity ─────────────────────────────────────────────────────
export async function getSpendingVelocity() {
  const db = await getDb();
  const now = new Date();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysInMonth = Math.floor((monthEnd.getTime() - monthStart.getTime()) / 86400000);
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / 86400000));
  const daysLeft = daysInMonth - daysElapsed;

  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const [dailyThisMonth, categoryBreakdown, historicalMonthly] = await Promise.all([
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: monthStart, $lt: now }, amount: { $lt: 0 }, category: { $ne: "Transfer" } } },
      { $addFields: { dayKey: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } } },
      { $group: { _id: "$dayKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: monthStart, $lt: now },
          amount: { $lt: 0 },
          category: { $nin: ["Transfer", null, ""] },
        },
      },
      { $group: { _id: "$category", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 8 },
    ]).toArray(),
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: threeMonthsAgo, $lt: monthStart }, amount: { $lt: 0 }, category: { $ne: "Transfer" } } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  const spentSoFar = (dailyThisMonth as Array<{ total: number }>).reduce((s, d) => s + d.total, 0);
  const dailyBurnRate = spentSoFar / daysElapsed;
  const projectedMonthEnd = dailyBurnRate * daysInMonth;
  const avgHistorical =
    historicalMonthly.length > 0
      ? (historicalMonthly as Array<{ total: number }>).reduce((s, m) => s + m.total, 0) / historicalMonthly.length
      : 0;

  return {
    daysInMonth,
    daysElapsed,
    daysLeft,
    spentSoFar,
    dailyBurnRate,
    projectedMonthEnd,
    avgHistorical,
    dailyThisMonth,
    categoryBreakdown,
    historicalMonthly,
  };
}

// ─── Budget History (6-month budget vs actual) ─────────────────────────────
export async function getBudgetHistory(months = 6) {
  const db = await getDb();
  const now = new Date();

  const monthSlots = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      budgetKey: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };
  });

  const [spendingByMonth, categories] = await Promise.all([
    Promise.all(
      monthSlots.map(({ year, month }) =>
        db
          .collection("transactions")
          .aggregate([
            {
              $match: {
                date: { $gte: new Date(year, month, 1), $lt: new Date(year, month + 1, 1) },
                amount: { $lt: 0 },
                category: { $nin: ["Transfer", null, ""] },
              },
            },
            { $group: { _id: "$category", total: { $sum: { $abs: "$amount" } } } },
          ])
          .toArray()
      )
    ),
    db.collection("categories").find({ type: "Expense" }).toArray(),
  ]);

  const catMap: Record<
    string,
    { group: string; budgets: Record<string, number>; actuals: Record<string, number>; totalActual: number }
  > = {};

  (categories as unknown as Array<{ category: string; group?: string; monthly_budgets?: Record<string, number> }>).forEach((c) => {
    const budgets: Record<string, number> = {};
    monthSlots.forEach((slot) => {
      budgets[slot.key] = c.monthly_budgets?.[slot.budgetKey] || 0;
    });
    catMap[c.category] = { group: c.group || "", budgets, actuals: {}, totalActual: 0 };
  });

  spendingByMonth.forEach((monthData, i) => {
    const slot = monthSlots[i];
    (monthData as Array<{ _id: string; total: number }>).forEach((row) => {
      if (!catMap[row._id]) {
        catMap[row._id] = { group: "", budgets: {}, actuals: {}, totalActual: 0 };
      }
      catMap[row._id].actuals[slot.key] = row.total;
      catMap[row._id].totalActual += row.total;
    });
  });

  const rows = Object.entries(catMap)
    .filter(([, v]) => v.totalActual > 0)
    .sort(([, a], [, b]) => b.totalActual - a.totalActual)
    .map(([category, v]) => ({ category, ...v }));

  return { rows, monthSlots };
}

export async function getMonthlyBudgetHistory(months = 6) {
  return getBudgetHistory(months);
}

// ─── Peer Payments (Zelle / Venmo / Apple Cash / Cash App) ────────────────
export async function getPeerPaymentData(months = 12) {
  const db = await getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const descFilters = [
    { description: { $regex: "zelle", $options: "i" } },
    { description: { $regex: "venmo", $options: "i" } },
    { description: { $regex: "apple cash", $options: "i" } },
    { description: { $regex: "cash app", $options: "i" } },
    { description: { $regex: "cashapp", $options: "i" } },
    { description: { $regex: "send money", $options: "i" } },
  ];

  const [allTransactions, byMonth] = await Promise.all([
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: start }, amount: { $ne: null }, $or: descFilters } },
      { $sort: { date: -1 } },
      { $limit: 500 },
    ]).toArray(),
    db.collection("transactions").aggregate([
      { $match: { date: { $gte: start }, amount: { $lt: 0 }, $or: descFilters } },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  function extractRecipient(desc: string): string {
    const d = desc.trim();
    const toMatch = d.match(/(?:payment\s+to|transfer\s+to|sent\s+to|zelle\s+to)\s+(.+)/i);
    if (toMatch) return toMatch[1].trim();
    const zelleMatch = d.match(/zelle\s+([A-Za-z].+)/i);
    if (zelleMatch) return zelleMatch[1].trim();
    const venmoMatch = d.match(/venmo\s+(?:payment\s*[-\u2013]\s*|to\s+)?(.+)/i);
    if (venmoMatch) return venmoMatch[1].replace(/^[-\s]+/, "").trim();
    const appleMatch = d.match(/apple\s+cash\s+(.+)/i);
    if (appleMatch) return appleMatch[1].trim();
    return d;
  }

  type PeerTransaction = { amount?: number; description?: string; date: string };
  const recipientMap: Record<string, { total: number; count: number; lastDate: string; platform: string; transactions: PeerTransaction[] }> = {};
  for (const t of allTransactions as PeerTransaction[]) {
    if ((t.amount || 0) >= 0) continue;
    const recipient = extractRecipient(t.description || "");
    const desc = (t.description || "").toLowerCase();
    const platform = desc.includes("zelle") ? "Zelle"
      : desc.includes("venmo") ? "Venmo"
      : desc.includes("apple cash") ? "Apple Cash"
      : desc.includes("cash app") || desc.includes("cashapp") ? "Cash App"
      : "P2P";
    if (!recipientMap[recipient]) {
      recipientMap[recipient] = { total: 0, count: 0, lastDate: t.date, platform, transactions: [] };
    }
    recipientMap[recipient].total += Math.abs(t.amount ?? 0);
    recipientMap[recipient].count += 1;
    if (new Date(t.date) > new Date(recipientMap[recipient].lastDate)) {
      recipientMap[recipient].lastDate = t.date;
    }
    if (recipientMap[recipient].transactions.length < 5) {
      recipientMap[recipient].transactions.push(t);
    }
  }

  const byRecipient = Object.entries(recipientMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);

  const totalSent = byRecipient.reduce((s, r) => s + r.total, 0);
  const totalReceived = (allTransactions as PeerTransaction[])
    .filter((t) => (t.amount || 0) > 0)
    .reduce((s, t) => s + (t.amount || 0), 0);

  return { byRecipient, byMonth, allTransactions, totalSent, totalReceived };
}

// ─── Restaurant Loyalty Map ────────────────────────────────────────────────
export async function getRestaurantData(months = 12) {
  const db = await getDb();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const descFilters = [
    { description: { $regex: "restaurant", $options: "i" } },
    { description: { $regex: "bistro", $options: "i" } },
    { description: { $regex: "grille?", $options: "i" } },
    { description: { $regex: "tavern", $options: "i" } },
    { description: { $regex: "steakhouse", $options: "i" } },
    { description: { $regex: "sushi", $options: "i" } },
    { description: { $regex: "ramen", $options: "i" } },
    { description: { $regex: "kitchen", $options: "i" } },
    { description: { $regex: "^tst\\*", $options: "i" } },
    { description: { $regex: "^sq \\*", $options: "i" } },
    { description: { $regex: "perry.?s", $options: "i" } },
    { description: { $regex: "crown block", $options: "i" } },
    { description: { $regex: "chill.*grapevine", $options: "i" } },
    { description: { $regex: "whataburger", $options: "i" } },
    { description: { $regex: "chipotle", $options: "i" } },
    { description: { $regex: "wingstop", $options: "i" } },
    { description: { $regex: "chick.?fil.?a", $options: "i" } },
  ];

  const [byMerchantRaw, byMonth, recentTransactions] = await Promise.all([
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: start },
          amount: { $lt: 0 },
          $or: [{ category: "Restaurants" }, ...descFilters],
        },
      },
      {
        $group: {
          _id: "$description",
          total: { $sum: { $abs: "$amount" } },
          count: { $sum: 1 },
          avgAmount: { $avg: { $abs: "$amount" } },
          firstVisit: { $min: "$date" },
          lastVisit: { $max: "$date" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 80 },
    ]).toArray(),
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: start },
          amount: { $lt: 0 },
          $or: [{ category: "Restaurants" }, ...descFilters],
        },
      },
      { $addFields: { monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } } } },
      { $group: { _id: "$monthKey", total: { $sum: { $abs: "$amount" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection("transactions").aggregate([
      {
        $match: {
          date: { $gte: start },
          amount: { $lt: 0 },
          $or: [{ category: "Restaurants" }, ...descFilters],
        },
      },
      { $sort: { date: -1 } },
      { $limit: 30 },
    ]).toArray(),
  ]);

  function cleanName(raw: string): string {
    return raw
      .replace(/^tst\s*\*/i, "")
      .replace(/^sq\s+\*/i, "")
      .replace(/\s+#\d+.*$/, "")
      .replace(/\b\d{4,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mergedMap: Record<string, { name: string; total: number; count: number; firstVisit: any; lastVisit: any }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of byMerchantRaw as any[]) {
    const clean = cleanName(row._id || "");
    if (!clean) continue;
    if (!mergedMap[clean]) {
      mergedMap[clean] = { name: clean, total: 0, count: 0, firstVisit: row.firstVisit, lastVisit: row.lastVisit };
    }
    mergedMap[clean].total += row.total;
    mergedMap[clean].count += row.count;
    if (new Date(row.firstVisit) < new Date(mergedMap[clean].firstVisit)) mergedMap[clean].firstVisit = row.firstVisit;
    if (new Date(row.lastVisit) > new Date(mergedMap[clean].lastVisit)) mergedMap[clean].lastVisit = row.lastVisit;
  }

  const merchants = Object.values(mergedMap)
    .map((m) => ({ ...m, avgAmount: m.total / m.count }))
    .sort((a, b) => b.total - a.total);

  const totalSpend = merchants.reduce((s, m) => s + m.total, 0);
  const totalVisits = merchants.reduce((s, m) => s + m.count, 0);

  return { merchants, byMonth, recentTransactions, totalSpend, totalVisits };
}

// ─── Category Accuracy Auditor ────────────────────────────────────────────
type CategoryMismatch = {
  description: string;
  amount: number;
  date: string;
  currentCategory: string;
  suggestedCategory: string;
  confidence: "high" | "medium";
};

const CATEGORY_AUDITOR_RULES = [
  {
    suggestedCategory: "Legal",
    confidence: "high" as const,
    keywords: ["coker robb", "attorney", "legal", "law firm", "esquire", "law group", "paralegal"],
  },
  {
    suggestedCategory: "Auto Maintenance",
    confidence: "high" as const,
    keywords: ["rev-up", "integrity-1st", "integrity 1st", "jiffy lube", "firestone", "pep boys", "midas", "transmission", "brake", "oil change", "auto repair", "tire"],
  },
  {
    suggestedCategory: "Legal",
    confidence: "medium" as const,
    keywords: ["attorney", "legal", "esquire", "paralegal", "law"],
  },
  {
    suggestedCategory: "Medical",
    confidence: "high" as const,
    keywords: ["hospital", "clinic", "urgent care", "pharmacy", "cvs", "walgreens", "dental", "optometry", "vision"],
  },
  {
    suggestedCategory: "Auto Maintenance",
    confidence: "medium" as const,
    keywords: ["brake", "tire", "oil", "repair", "transmission", "auto"],
  },
  {
    suggestedCategory: "Groceries",
    confidence: "high" as const,
    keywords: ["whole foods", "kroger", "safeway", "heb", "trader joe", "aldi", "publix"],
  },
  {
    suggestedCategory: "Medical",
    confidence: "medium" as const,
    keywords: ["clinic", "pharmacy", "cvs", "walgreens", "dental", "vision", "optometry", "medical"],
  },
  {
    suggestedCategory: "Pet",
    confidence: "high" as const,
    keywords: ["petco", "petsmart", "vet", "veterinary", "animal hospital"],
  },
  {
    suggestedCategory: "Groceries",
    confidence: "medium" as const,
    keywords: ["grocery", "market", "foods", "kroger", "aldi", "publix"],
  },
  {
    suggestedCategory: "Pet",
    confidence: "medium" as const,
    keywords: ["vet"],
  },
] as const;

function normalizeCategory(value: string | null | undefined): string {
  return (value || "Uncategorized").trim();
}

function normalizeCategoryLoose(value: string | null | undefined): string {
  return normalizeCategory(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSuggestedCategory(description: string): Pick<CategoryMismatch, "suggestedCategory" | "confidence"> | null {
  const lower = description.toLowerCase();

  for (const rule of CATEGORY_AUDITOR_RULES) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return { suggestedCategory: rule.suggestedCategory, confidence: rule.confidence };
    }
  }

  return null;
}

export async function getCategoryMismatches(): Promise<CategoryMismatch[]> {
  const db = await getDb();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);

  type TransactionRow = {
    description?: string;
    amount: number;
    date: Date;
    category?: string | null;
  };

  const rows = await db.collection("transactions").find({
    date: { $gte: start },
    amount: { $lt: -200 },
    description: { $exists: true, $ne: null },
  }).project({ description: 1, amount: 1, date: 1, category: 1 }).toArray() as TransactionRow[];

  return rows
    .map((row) => {
      const description = (row.description || "").trim();
      if (!description) return null;

      const detected = detectSuggestedCategory(description);
      if (!detected) return null;

      const currentCategory = normalizeCategory(row.category);
      const currentLoose = normalizeCategoryLoose(currentCategory);
      const suggestedLoose = normalizeCategoryLoose(detected.suggestedCategory);
      if (currentLoose.includes(suggestedLoose) || suggestedLoose.includes(currentLoose)) return null;

      return {
        description,
        amount: Math.abs(Number(row.amount) || 0),
        date: new Date(row.date).toISOString(),
        currentCategory,
        suggestedCategory: detected.suggestedCategory,
        confidence: detected.confidence,
      } satisfies CategoryMismatch;
    })
    .filter((row): row is CategoryMismatch => Boolean(row))
    .sort((a, b) => b.amount - a.amount);
}

// ─── Rent Tracker ─────────────────────────────────────────────────────────
type RentTrackerPayment = {
  month: string;
  amount: number;
  date: string;
  description: string;
};

type RentTrackerMonth = {
  month: string;
  amount: number;
};

type RentTrackerHistoryRow = {
  month: string;
  amount: number;
  date: string | null;
  description: string | null;
  status: "Paid" | "Gap";
};

export async function getRentTrackerData() {
  const db = await getDb();

  type RentRow = {
    description?: string;
    amount: number;
    date: Date;
  };

  const rows = await db.collection("transactions").find({
    amount: { $lt: 0 },
    $or: [
      { description: /ali\s+khan/i },
      { description: /zelle/i, $expr: { $regexMatch: { input: "$description", regex: /lavaca/i } } },
    ],
  }).project({ description: 1, amount: 1, date: 1 }).sort({ date: 1 }).toArray() as RentRow[];

  const payments: RentTrackerPayment[] = rows.map((row) => ({
    month: `${new Date(row.date).getFullYear()}-${String(new Date(row.date).getMonth() + 1).padStart(2, "0")}`,
    amount: Math.abs(Number(row.amount) || 0),
    date: new Date(row.date).toISOString(),
    description: row.description || "",
  }));

  const monthlyMap = new Map<string, RentTrackerHistoryRow>();
  for (const payment of payments) {
    const existing = monthlyMap.get(payment.month);
    if (!existing) {
      monthlyMap.set(payment.month, {
        month: payment.month,
        amount: payment.amount,
        date: payment.date,
        description: payment.description,
        status: "Paid",
      });
      continue;
    }

    existing.amount += payment.amount;
    if (existing.date && new Date(payment.date) > new Date(existing.date)) {
      existing.date = payment.date;
      existing.description = payment.description;
    }
  }

  const paidMonths = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  const monthKeys: string[] = [];
  if (paidMonths.length > 0) {
    const first = paidMonths[0].month.split("-").map(Number);
    const last = paidMonths[paidMonths.length - 1].month.split("-").map(Number);
    let cursor = new Date(first[0], first[1] - 1, 1);
    const end = new Date(last[0], last[1] - 1, 1);

    while (cursor <= end) {
      monthKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }

  const monthlyHistory: RentTrackerMonth[] = monthKeys.map((month) => ({
    month,
    amount: monthlyMap.get(month)?.amount || 0,
  }));

  const historyWithGaps: RentTrackerHistoryRow[] = monthKeys.map((month) => {
    const existing = monthlyMap.get(month);
    if (existing) return existing;
    return { month, amount: 0, date: null, description: null, status: "Gap" };
  });

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paymentCount = payments.length;
  const monthlyAvg = paidMonths.length > 0 ? totalPaid / paidMonths.length : 0;
  const currentMonthlyRate = [...paidMonths].reverse().find((row) => row.amount > 0)?.amount || 0;
  const firstPayment = payments[0] || null;
  const latestPayment = payments[payments.length - 1] || null;
  return {
    payments,
    totalPaid,
    monthlyAvg,
    currentMonthlyRate,
    firstPayment,
    latestPayment,
    paymentCount,
    monthlyHistory,
    historyWithGaps,
    gaps: historyWithGaps.filter((row) => row.status === "Gap").map((row) => row.month),
  };
}

// ─── API Usage Spike Detector ─────────────────────────────────────────────
const API_VENDOR_DEFINITIONS = [
  { name: "OpenAI", keywords: ["openai"] },
  { name: "Anthropic", keywords: ["anthropic"] },
  { name: "Claude", keywords: ["claude"] },
  { name: "ElevenLabs", keywords: ["elevenlabs"] },
  { name: "Replicate", keywords: ["replicate"] },
  { name: "Stability", keywords: ["stability", "stability ai"] },
  { name: "Mistral", keywords: ["mistral"] },
  { name: "Groq", keywords: ["groq"] },
  { name: "Together", keywords: ["together", "together ai"] },
  { name: "Fireworks", keywords: ["fireworks", "fireworks ai"] },
  { name: "Perplexity", keywords: ["perplexity"] },
  { name: "Cohere", keywords: ["cohere"] },
] as const;

function detectApiVendor(description: string): string | null {
  const lower = description.toLowerCase();
  const match = API_VENDOR_DEFINITIONS.find((vendor) => vendor.keywords.some((keyword) => lower.includes(keyword)));
  return match?.name || null;
}

export async function getAPIUsageSpikeData() {
  const db = await getDb();
  const regex = new RegExp(API_VENDOR_DEFINITIONS.flatMap((vendor) => vendor.keywords).join("|"), "i");

  type ApiRow = {
    description?: string;
    amount: number;
    date: Date;
  };

  const rows = await db.collection("transactions").find({
    amount: { $lt: 0 },
    description: { $regex: regex },
  }).project({ description: 1, amount: 1, date: 1 }).sort({ date: 1 }).toArray() as ApiRow[];

  const monthlyMap = new Map<string, { month: string; vendor: string; count: number; total: number }>();
  for (const row of rows) {
    const description = row.description || "";
    const vendor = detectApiVendor(description);
    if (!vendor) continue;
    const date = new Date(row.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const key = `${vendor}::${month}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { month, vendor, count: 0, total: 0 });
    }
    const current = monthlyMap.get(key)!;
    current.count += 1;
    current.total += Math.abs(Number(row.amount) || 0);
  }

  const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) => {
    const monthCompare = a.month.localeCompare(b.month);
    return monthCompare !== 0 ? monthCompare : a.vendor.localeCompare(b.vendor);
  });

  const latestMonth = monthlyBreakdown[monthlyBreakdown.length - 1]?.month || "";

  const vendors = API_VENDOR_DEFINITIONS.map((vendor) => {
    const entries = monthlyBreakdown.filter((row) => row.vendor === vendor.name).sort((a, b) => a.month.localeCompare(b.month));
    const currentMonth = entries.find((row) => row.month === latestMonth) || { count: 0, total: 0, month: latestMonth, vendor: vendor.name };
    const priorEntries = entries.filter((row) => row.month < latestMonth);
    const trailing = priorEntries.slice(-3);
    const trailingAvgCount = trailing.length > 0 ? trailing.reduce((sum, row) => sum + row.count, 0) / trailing.length : 0;
    const trailingAvgTotal = trailing.length > 0 ? trailing.reduce((sum, row) => sum + row.total, 0) / trailing.length : 0;
    const avgMonthly = priorEntries.length > 0 ? priorEntries.reduce((sum, row) => sum + row.total, 0) / priorEntries.length : currentMonth.total;
    const avgCount = priorEntries.length > 0 ? priorEntries.reduce((sum, row) => sum + row.count, 0) / priorEntries.length : currentMonth.count;
    const countSpike = trailingAvgCount > 0 && currentMonth.count >= trailingAvgCount * 3;
    const totalSpike = trailingAvgTotal > 0 && currentMonth.total >= trailingAvgTotal * 2;
    const pctAboveAvg = avgMonthly > 0 ? ((currentMonth.total - avgMonthly) / avgMonthly) * 100 : 0;

    return {
      name: vendor.name,
      currentMonth: { count: currentMonth.count, total: currentMonth.total, month: currentMonth.month },
      avgMonthly,
      avgCount,
      trailingAvgCount,
      trailingAvgTotal,
      isSpike: countSpike || totalSpike,
      pctAboveAvg,
    };
  }).filter((vendor) => vendor.currentMonth.count > 0 || vendor.avgMonthly > 0);

  const totalApiSpend = monthlyBreakdown.reduce((sum, row) => sum + row.total, 0);

  return { vendors, monthlyBreakdown, totalApiSpend, latestMonth };
}
