import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenClaw Dashboard",
  description: "GitHub workflow dashboard for OpenClaw collaboration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
          <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link
                href="/"
                className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500"
              >
                OpenClaw
              </Link>
              <nav className="flex items-center gap-4 text-xs font-semibold text-zinc-600">
                <Link
                  href="/"
                  className="rounded-full border border-transparent px-3 py-2 transition hover:border-zinc-200 hover:text-zinc-900"
                >
                  Kanban
                </Link>
                <Link
                  href="/articles"
                  className="rounded-full border border-transparent px-3 py-2 transition hover:border-zinc-200 hover:text-zinc-900"
                >
                  Articles
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
