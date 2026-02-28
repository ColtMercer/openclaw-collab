import { getSpendingHeatmapData } from "@/lib/finance-queries";
import HeatmapClient from "./HeatmapClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function HeatmapPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month !== undefined ? parseInt(params.month) : now.getMonth();

  const { dailyTotals, transactions } = await getSpendingHeatmapData(year, month);

  const serialized = {
    dailyTotals: JSON.parse(JSON.stringify(dailyTotals)),
    transactions: JSON.parse(JSON.stringify(transactions)),
  };

  return (
    <HeatmapClient
      dailyTotals={serialized.dailyTotals}
      transactions={serialized.transactions}
      year={year}
      month={month}
    />
  );
}
