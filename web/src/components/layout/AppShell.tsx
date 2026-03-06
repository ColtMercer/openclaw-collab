"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { SignInButton } from "@/components/auth/SignInButton"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Toaster } from "sonner"

const navItems = [
  { href: "/", label: "Kanban" },
  { href: "/activity", label: "Activity" },
  { href: "/articles", label: "Articles" },
  { href: "/finance", label: "Finance" },
  { href: "/shopper", label: "Shopper" },
  { href: "/social", label: "Social" },
  { href: "/mission-control", label: "Mission Control" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-zinc-900 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-black/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              OpenClaw Collab
            </p>
            <h1 className="text-lg font-semibold">Mission Control</h1>
          </div>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  className={cn(
                    "relative pb-1 transition hover:text-foreground",
                    isActive &&
                      "text-foreground after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary"
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              )
            })}
            <ChatPanel />
            <SignInButton />
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <ChatPanel />
            <SignInButton />
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    OpenClaw Collab
                  </p>
                  <h2 className="text-lg font-semibold">Navigation</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {navItems.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "rounded-lg border border-border/40 px-3 py-2 text-sm text-muted-foreground transition hover:border-border/80 hover:text-foreground",
                          isActive && "border-primary/50 text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
                <div className="pt-2">
                  <SignInButton />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Separator className="mb-8" />
        {children}
      </main>
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  )
}
