import Link from "next/link";
import { repoUrl } from "@/lib/config";
import {
  getPullRequestStatus,
  listOpenPullRequests,
  listPullRequestReviews,
  PullRequestStatus,
} from "@/lib/github";

const STATUS_STYLES: Record<
  PullRequestStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-zinc-100 text-zinc-700",
  },
  open: {
    label: "Open",
    className: "bg-sky-100 text-sky-700",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700",
  },
  "changes-requested": {
    label: "Changes Requested",
    className: "bg-rose-100 text-rose-700",
  },
};

export default async function ArticlesPage() {
  let errorMessage: string | null = null;
  let items: {
    id: number;
    number: number;
    title: string;
    author: string;
    url: string;
    status: PullRequestStatus;
  }[] = [];

  try {
    const pullRequests = await listOpenPullRequests();
    const reviewsByPr = await Promise.all(
      pullRequests.map((pr) =>
        listPullRequestReviews(pr.number).catch(() => [])
      )
    );

    items = pullRequests.map((pr, index) => {
      const status = getPullRequestStatus(pr, reviewsByPr[index]);
      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        url: pr.html_url,
        status,
      };
    });
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load GitHub pull requests.";
  }

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Article Workflow
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Articles</h1>
            <p className="max-w-xl text-sm text-zinc-600">
              Review open pull requests and keep article drafts moving through
              the pipeline.
            </p>
          </div>
          {repoUrl ? (
            <Link
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
              href={`${repoUrl}/pulls`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View All PRs
            </Link>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
              No open pull requests right now.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => {
                const statusStyle = STATUS_STYLES[item.status];
                return (
                  <article
                    key={item.id}
                    className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            PR #{item.number}
                          </p>
                          <h2 className="text-base font-semibold text-zinc-900">
                            {item.title}
                          </h2>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyle.className}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">by {item.author}</p>
                    </div>
                    <div className="pt-4">
                      <Link
                        className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open on GitHub
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
