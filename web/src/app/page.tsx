import { githubConfig, githubRepoSlug } from "@/lib/config";

type GitHubLabel = {
  id: number;
  name: string;
  color: string;
};

type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  labels: GitHubLabel[];
  pull_request?: unknown;
};

const STATUS_COLUMNS = [
  { key: "status/backlog", title: "Backlog" },
  { key: "status/ready", title: "Ready" },
  { key: "status/in-progress", title: "In Progress" },
  { key: "status/review", title: "Review" },
  { key: "status/done", title: "Done" },
] as const;

const typePriorityPrefix = ["type/", "priority/"];

function normalizeLabelName(label: string) {
  return label.trim().toLowerCase();
}

function getStatusKey(labels: GitHubLabel[]) {
  for (const column of STATUS_COLUMNS) {
    const match = labels.some(
      (label) => normalizeLabelName(label.name) === column.key,
    );
    if (match) {
      return column.key;
    }
  }
  return "status/backlog";
}

function getTypePriorityLabels(labels: GitHubLabel[]) {
  return labels.filter((label) =>
    typePriorityPrefix.some((prefix) =>
      normalizeLabelName(label.name).startsWith(prefix),
    ),
  );
}

async function fetchIssues() {
  const { owner, repo, token } = githubConfig;
  const params = new URLSearchParams({
    state: "open",
    per_page: "100",
  });

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?${params.toString()}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API error (${response.status}): ${errorBody || "Unknown error"}`,
    );
  }

  const data = (await response.json()) as GitHubIssue[];
  return data.filter((issue) => !issue.pull_request);
}

export default async function Home() {
  let issues: GitHubIssue[] = [];
  let errorMessage: string | null = null;

  try {
    issues = await fetchIssues();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  const groupedIssues = STATUS_COLUMNS.reduce(
    (accumulator, column) => {
      accumulator[column.key] = [];
      return accumulator;
    },
    {} as Record<string, GitHubIssue[]>,
  );

  for (const issue of issues) {
    const statusKey = getStatusKey(issue.labels);
    groupedIssues[statusKey].push(issue);
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Open Issues Kanban
          </p>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-3xl font-semibold leading-tight text-zinc-900">
              {githubRepoSlug}
            </h1>
            <span className="text-sm text-zinc-500">
              {issues.length} open issue{issues.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="max-w-2xl text-sm text-zinc-600">
            Issues are grouped by status labels. Issues without a status label
            default to Backlog. Pull requests are excluded.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-5">
          {STATUS_COLUMNS.map((column) => {
            const columnIssues = groupedIssues[column.key] ?? [];
            return (
              <div
                key={column.key}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
                    {column.title}
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                    {columnIssues.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnIssues.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
                      No open issues.
                    </div>
                  ) : (
                    columnIssues.map((issue) => {
                      const labelChips = getTypePriorityLabels(issue.labels);
                      return (
                        <a
                          key={issue.id}
                          href={issue.html_url}
                          className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                            <span>#{issue.number}</span>
                            <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                              GitHub
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold leading-snug text-zinc-900 group-hover:text-zinc-700">
                            {issue.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {labelChips.length === 0 ? (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                                No type/priority labels
                              </span>
                            ) : (
                              labelChips.map((label) => (
                                <span
                                  key={label.id}
                                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                                >
                                  {label.name}
                                </span>
                              ))
                            )}
                          </div>
                        </a>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
