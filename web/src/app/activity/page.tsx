import Link from "next/link";

import ActivityToggle, { ActivityItem } from "@/app/activity/ActivityToggle";
import { githubConfig } from "@/lib/config";
import { fetchGitHub } from "@/lib/github";

type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  closed_at: string | null;
  updated_at: string;
  pull_request?: unknown;
  user: {
    login: string;
  } | null;
};

type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  merged_at: string | null;
  updated_at: string;
  user: {
    login: string;
  } | null;
};

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const weekFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function toDateKey(isoDate: string) {
  return isoDate.slice(0, 10);
}

function formatDayLabel(dateKey: string) {
  return dayFormatter.format(new Date(`${dateKey}T00:00:00Z`));
}

function startOfWeek(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return toDateKey(date.toISOString());
}

function formatWeekLabel(dateKey: string) {
  return `Week of ${weekFormatter.format(new Date(`${dateKey}T00:00:00Z`))}`;
}

function groupItems(items: ActivityItem[], labelForKey: (key: string) => string) {
  const map = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const existing = map.get(item.dateKey) ?? [];
    existing.push(item);
    map.set(item.dateKey, existing);
  }

  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, groupedItems]) => ({
      key,
      label: labelForKey(key),
      items: groupedItems,
    }));
}

function buildGroups(items: ActivityItem[]) {
  const daily = groupItems(items, formatDayLabel);
  const weeklyItems = items.map((item) => ({
    ...item,
    dateKey: startOfWeek(item.dateKey),
  }));
  const weekly = groupItems(weeklyItems, formatWeekLabel);

  return { daily, weekly };
}

export default async function ActivityPage() {
  const hasConfig = githubConfig.owner && githubConfig.repo;
  let errorMessage = "";
  let issueItems: ActivityItem[] = [];
  let prItems: ActivityItem[] = [];

  if (!hasConfig) {
    errorMessage = "Set GITHUB_OWNER and GITHUB_REPO to load activity.";
  } else {
    try {
      const [issues, pulls] = await Promise.all([
        fetchGitHub<GitHubIssue[]>(
          `/repos/${githubConfig.owner}/${githubConfig.repo}/issues?state=closed&sort=updated&direction=desc&per_page=100`
        ),
        fetchGitHub<GitHubPullRequest[]>(
          `/repos/${githubConfig.owner}/${githubConfig.repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`
        ),
      ]);

      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

      issueItems = issues
        .filter((issue) => !issue.pull_request)
        .filter((issue) => issue.closed_at && new Date(issue.closed_at).getTime() >= cutoff)
        .map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          user: issue.user?.login ?? "unknown",
          dateKey: toDateKey(issue.closed_at as string),
        }));

      prItems = pulls
        .filter((pull) => pull.merged_at && new Date(pull.merged_at).getTime() >= cutoff)
        .map((pull) => ({
          id: pull.id,
          number: pull.number,
          title: pull.title,
          url: pull.html_url,
          user: pull.user?.login ?? "unknown",
          dateKey: toDateKey(pull.merged_at as string),
        }));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load activity.";
    }
  }

  const issueGroups = buildGroups(issueItems);
  const prGroups = buildGroups(prItems);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <nav className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            {"<-"} Dashboard
          </Link>
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
            Activity
          </span>
        </nav>

        {errorMessage ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {errorMessage}
          </div>
        ) : (
          <ActivityToggle
            daily={{ issues: issueGroups.daily, prs: prGroups.daily }}
            weekly={{ issues: issueGroups.weekly, prs: prGroups.weekly }}
          />
        )}
      </div>
    </div>
  );
}
