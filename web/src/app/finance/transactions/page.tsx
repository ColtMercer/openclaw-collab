import { getTransactions, getDistinctCategories, getDistinctAccounts } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransactionRow } from "@/components/finance/TransactionRow";

export const dynamic = "force-dynamic";

type TransactionsSearchParams = Record<string, string | string[] | undefined>;

type TransactionDoc = {
  transaction_id: string;
};

type TransactionResult = {
  docs: TransactionDoc[];
  total: number;
  page: number;
  pages: number;
};

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<TransactionsSearchParams> }) {
  const params = await searchParams;
  const search = getParam(params.search);
  const category = getParam(params.category);
  const account = getParam(params.account);
  const page = parseInt(getParam(params.page) || "1");
  const dateFrom = getParam(params.dateFrom);
  const dateTo = getParam(params.dateTo);

  const [result, categories, accounts] = await Promise.all([
    getTransactions({ search, category, account, page, dateFrom, dateTo, limit: 50 }),
    getDistinctCategories(),
    getDistinctAccounts(),
  ]);
  const typedResult = result as TransactionResult;

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({ search, category, account, dateFrom, dateTo, page: "1", ...overrides });
    return `/transactions?${p.toString()}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <p className="text-zinc-500">{typedResult.total.toLocaleString()} transactions</p>

      <form className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Search</label>
          <input name="search" defaultValue={search} placeholder="Description..."
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm w-48" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Category</label>
          <select name="category" defaultValue={category}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All</option>
            {(categories as string[]).filter(Boolean).sort().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Account</label>
          <select name="account" defaultValue={account}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All</option>
            {(accounts as string[]).filter(Boolean).sort().map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">From</label>
          <input type="date" name="dateFrom" defaultValue={dateFrom}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">To</label>
          <input type="date" name="dateTo" defaultValue={dateTo}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg text-sm font-medium">
          Filter
        </button>
      </form>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left bg-zinc-900/50">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-2 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {typedResult.docs.map((t) => (
              <TransactionRow key={t.transaction_id} t={JSON.parse(JSON.stringify(t))} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>Page {typedResult.page} of {typedResult.pages}</span>
        <div className="flex gap-2">
          {page > 1 && (
            <a href={buildUrl({ page: String(page - 1) })}
              className="bg-zinc-800 px-3 py-1 rounded-lg hover:bg-zinc-700">← Prev</a>
          )}
          {page < typedResult.pages && (
            <a href={buildUrl({ page: String(page + 1) })}
              className="bg-zinc-800 px-3 py-1 rounded-lg hover:bg-zinc-700">Next →</a>
          )}
        </div>
      </div>
    </div>
  );
}
