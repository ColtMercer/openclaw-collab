import Link from "next/link";
import { repoUrl } from "@/lib/config";
import { getStatusLabel, listOpenIssues } from "@/lib/github";

const STATUS_COLUMNS = [
  { key: "status/backlog", title: "Backlog" },
  { key: "status/ready", title: "Ready" },
  { key: "status/in-progress", title: "In Progress" },
  { key: "status/review", title: "Review" },
  { key: "status/done", title: "Done" },
];

export default async function Home() {
  let issues = [] as Awaited<ReturnType<typeof listOpenIssues>>;
  let errorMessage: string | null = null;

  try {
    const allIssues = await listOpenIssues();
    issues = allIssues.filter((issue) => !issue.pull_request);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unable to load GitHub issues.";
  }

  const issuesByStatus = STATUS_COLUMNS.reduce(
    (acc, column) => ({ ...acc, [column.key]: [] as typeof issues }),
    {} as Record<string, typeof issues>
  );

  issues.forEach((issue) => {
    const statusLabel = getStatusLabel(issue.labels);
    const columnKey = STATUS_COLUMNS.some((column) => column.key === statusLabel)
      ? statusLabel!
      : "status/backlog";
    issuesByStatus[columnKey].push(issue);
  });

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          GitHub Issues
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Kanban</h1>
            <p className="max-w-xl text-sm text-zinc-600">
              Track the active issues and keep the board aligned with status
              labels.
            </p>
          </div>
          {repoUrl ? (
            <Link
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Repository
            </Link>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {STATUS_COLUMNS.map((column) => (
            <div key={column.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-700">
                  {column.title}
                </h2>
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                  {issuesByStatus[column.key].length}
                </span>
              </div>
              <div className="space-y-3">
                {issuesByStatus[column.key].length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-6 text-xs text-zinc-500">
                    No issues
                  </div>
                ) : (
                  issuesByStatus[column.key].map((issue) => (
                    <article
                      key={issue.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            #{issue.number}
                          </p>
                          <h3 className="text-sm font-semibold text-zinc-900">
                            {issue.title}
                          </h3>
                        </div>
                        <Link
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                        >
                          Open
                        </Link>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>by {issue.user.login}</span>
                        {issue.labels
                          .filter((label) => label.name.startsWith("type/"))
                          .map((label) => (
                            <span
                              key={label.name}
                              className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600"
                            >
                              {label.name.replace("type/", "")}
                            </span>
                          ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
