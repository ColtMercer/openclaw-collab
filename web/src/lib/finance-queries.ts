import { getDb } from "./finance-db";

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

export async function getRecentTransactions(limit = 20) {
  const db = await getDb();
  return db.collection("transactions").find({ amount: { $ne: null } }).sort({ date: -1 }).limit(limit).toArray();
}

export async function getTransactions(params: {
  search?: string; category?: string; account?: string;
  dateFrom?: string; dateTo?: string;
  page?: number; limit?: number;
}) {
  const db = await getDb();
  const filter: any = { amount: { $ne: null } };
  
  if (params.search) filter.description = { $regex: params.search, $options: "i" };
  if (params.category) filter.category = params.category;
  if (params.account) filter.account = params.account;
  if (params.dateFrom || params.dateTo) {
    filter.date = {};
    if (params.dateFrom) filter.date.$gte = new Date(params.dateFrom);
    if (params.dateTo) filter.date.$lte = new Date(params.dateTo);
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

// ─── AI Spend Tracker ──────────────────────────────────────────────────────
export async function getAISpendData() {
  const db = await getDb();

  const aiKeywords = [
    "openai", "anthropic", "claude", "chatgpt", "midjourney", "github copilot",
    "cursor", "perplexity", "cohere", "replicate", "together ai", "groq",
    "elevenlabs", "runway", "pika labs", "suno", "stability ai", "heygen",
    "jasper", "copy.ai", "writesonic", "hugging face", "alpacadb", "alpaca",
    "replit", "codeium", "tabnine",
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiRegex: any[] = aiKeywords.map((v) => new RegExp(v, "i"));

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

// ─── Convenience Store Creep ───────────────────────────────────────────────
export async function getConvenienceStoreData(months = 6) {
  const db = await getDb();
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const convKeywords = [
    "7-eleven", "7eleven", "quiktrip", "qt ", " qt\\b", "wawa", "sheetz",
    "casey's", "circle k", "speedway", "ampm", "am-pm", "shell", "chevron",
    "exxon", "bp ", "sunoco", "marathon", "pilot", "flying j", "love's",
    "kum & go", "kwik trip", "kwiktrip", "racetrac", "race trac",
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

  const aiKeywords = [
    "openai", "anthropic", "claude", "chatgpt", "midjourney", "github copilot",
    "cursor", "perplexity", "cohere", "replicate", "together ai", "groq",
    "elevenlabs", "runway", "pika labs", "suno", "stability ai", "heygen",
    "jasper", "copy.ai", "writesonic", "hugging face", "alpacadb", "alpaca",
    "replit", "codeium", "tabnine",
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiRegex: any[] = aiKeywords.map((v) => new RegExp(v, "i"));

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
