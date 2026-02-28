import Link from 'next/link';

export default function Header() {
  return (
    <header className="relative z-20 border-b border-white/5 bg-base-900/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/shopper" className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-lg font-semibold text-emerald-300">S</span>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">Shopper</p>
            <p className="text-lg font-semibold text-white">Aggregator Dashboard</p>
          </div>
        </Link>
        <div className="hidden items-center gap-3 text-sm text-slate-300 sm:flex">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">Local Tool</span>
          <span>MongoDB · DFW</span>
        </div>
      </div>
    </header>
  );
}
