"use client";

import { useMemo, useState } from "react";

export type ActivityItem = {
  id: number;
  number: number;
  title: string;
  url: string;
  user: string;
  dateKey: string;
};

export type ActivityGroup = {
  key: string;
  label: string;
  items: ActivityItem[];
};

type ActivityData = {
  issues: ActivityGroup[];
  prs: ActivityGroup[];
};

type ActivityToggleProps = {
  daily: ActivityData;
  weekly: ActivityData;
};

export default function ActivityToggle({ daily, weekly }: ActivityToggleProps) {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const data = useMemo(() => (view === "daily" ? daily : weekly), [daily, weekly, view]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Activity
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Summaries of closed issues and merged PRs from the last 7 days.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => setView("daily")}
            className={`rounded-full px-4 py-2 font-medium transition ${
              view === "daily"
                ? "bg-zinc-950 text-zinc-50 shadow-sm dark:bg-zinc-50 dark:text-zinc-950"
                : "hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setView("weekly")}
            className={`rounded-full px-4 py-2 font-medium transition ${
              view === "weekly"
                ? "bg-zinc-950 text-zinc-50 shadow-sm dark:bg-zinc-50 dark:text-zinc-950"
                : "hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Closed issues</h2>
            <span className="text-xs uppercase tracking-wide text-zinc-500">{view}</span>
          </div>
          <div className="space-y-6">
            {data.issues.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No issues closed in the last 7 days.</p>
            ) : (
              data.issues.map((group) => (
                <div key={group.key} className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{group.label}</h3>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                      >
                        <span className="font-medium">{item.title}</span>
                        <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                          #{item.number} · {item.user}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Merged PRs</h2>
            <span className="text-xs uppercase tracking-wide text-zinc-500">{view}</span>
          </div>
          <div className="space-y-6">
            {data.prs.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No PRs merged in the last 7 days.</p>
            ) : (
              data.prs.map((group) => (
                <div key={group.key} className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{group.label}</h3>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                      >
                        <span className="font-medium">{item.title}</span>
                        <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                          #{item.number} · {item.user}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
