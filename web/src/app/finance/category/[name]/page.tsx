import Link from "next/link";
import { Card } from "@/components/finance/Card";
import { formatCurrency } from "@/lib/utils";
import { getCategoryDetail } from "@/lib/finance-queries";
import CategoryClient from "./CategoryClient";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params: { name: string };
  searchParams: Promise<SearchParams>;
};

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function decodeCategory(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const rangeParam = getParam(resolvedParams.range) || "90";
  const rangeValue = rangeParam === "all" ? "all" : String(parseInt(rangeParam, 10) || 90);
  const days = rangeValue === "all" ? undefined : Number(rangeValue);

  const name = decodeCategory(params.name);
  const data = await getCategoryDetail(name, days);

  const transactions = JSON.parse(JSON.stringify(data.transactions));
  const monthlyTotals = JSON.parse(JSON.stringify(data.monthlyTotals));
  const topMerchants = JSON.parse(JSON.stringify(data.topMerchants));

  const rangeLabel = rangeValue === "all" ? "All time" : `Last ${rangeValue} days`;

  const ranges = [
    { value: "30", label: "30 days" },
    { value: "90", label: "90 days" },
    { value: "365", label: "365 days" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Link href="/finance/budget" className="hover:text-zinc-300 transition-colors">
              Budget
            </Link>
            <span>•</span>
            <span>Category</span>
          </div>
          <h1 className="text-2xl font-bold mt-2">{name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((range) => (
            <Link
              key={range.value}
              href={`/finance/category/${encodeURIComponent(name)}?range=${range.value}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                rangeValue === range.value
                  ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/40"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              {range.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          title="Lifetime Spend"
          value={formatCurrency(data.lifetimeTotal)}
          subtitle="All time"
        />
        <Card
          title="Avg Monthly Spend"
          value={formatCurrency(data.avgMonthly)}
          subtitle="Last 12 months"
        />
        <Card
          title="Transactions"
          value={transactions.length.toLocaleString()}
          subtitle={rangeLabel}
        />
      </div>

      <CategoryClient
        monthlyTotals={monthlyTotals}
        topMerchants={topMerchants}
        transactions={transactions}
        rangeLabel={rangeLabel}
      />
    </div>
  );
}
