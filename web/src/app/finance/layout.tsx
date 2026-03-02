import { Nav } from "@/components/finance/Nav"

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-zinc-100">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
