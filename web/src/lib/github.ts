import { githubConfig, repoSlug } from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GithubUser = {
  login: string;
  avatar_url?: string;
  html_url?: string;
};

export type GithubLabel = {
  name: string;
};

export type GithubIssue = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  user: GithubUser;
  labels: GithubLabel[];
  pull_request?: Record<string, unknown>;
};

export type GithubPullRequest = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  state: "open" | "closed";
  user: GithubUser;
};

export type GithubReview = {
  id: number;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED";
  user: GithubUser;
  submitted_at: string;
};

export type PullRequestStatus =
  | "draft"
  | "open"
  | "approved"
  | "changes-requested";

// ---------------------------------------------------------------------------
// Low-level fetch helper
// ---------------------------------------------------------------------------

const API_VERSION = "2022-11-28";

const baseHeaders: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": API_VERSION,
};

const withAuthHeaders = () => {
  if (!githubConfig.token) {
    return baseHeaders;
  }
  return { ...baseHeaders, Authorization: `Bearer ${githubConfig.token}` };
};

const ensureRepoSlug = () => {
  if (!repoSlug) {
    throw new Error(
      "Missing GitHub config. Set GITHUB_OWNER and GITHUB_REPO in the environment.",
    );
  }
};

const buildUrl = (
  path: string,
  params: Record<string, string | number | undefined> = {},
) => {
  const url = new URL(`${githubConfig.apiBase}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

/** Generic GitHub fetch helper (accepts absolute URLs or /path strings). */
export async function fetchGitHub<T>(
  path: string,
  options: RequestInit & { next?: { revalidate?: number } } = {},
): Promise<T> {
  const headers = new Headers({
    ...withAuthHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  });

  const url = path.startsWith("http")
    ? path
    : `${githubConfig.apiBase}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
    next: options.next ?? { revalidate: 300 },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

const githubRequest = async <T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> => {
  ensureRepoSlug();
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    headers: withAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
};

// ---------------------------------------------------------------------------
// Public API helpers
// ---------------------------------------------------------------------------

export const listOpenIssues = async (): Promise<GithubIssue[]> => {
  return githubRequest<GithubIssue[]>(`/repos/${repoSlug}/issues`, {
    state: "open",
    per_page: 100,
    sort: "updated",
  });
};

export const listOpenPullRequests = async (): Promise<GithubPullRequest[]> => {
  return githubRequest<GithubPullRequest[]>(`/repos/${repoSlug}/pulls`, {
    state: "open",
    per_page: 50,
    sort: "updated",
  });
};

export const listPullRequestReviews = async (
  prNumber: number,
): Promise<GithubReview[]> => {
  return githubRequest<GithubReview[]>(
    `/repos/${repoSlug}/pulls/${prNumber}/reviews`,
    { per_page: 100 },
  );
};

export const getPullRequestStatus = (
  pr: GithubPullRequest,
  reviews: GithubReview[],
): PullRequestStatus => {
  if (pr.draft) return "draft";
  if (reviews.some((r) => r.state === "CHANGES_REQUESTED"))
    return "changes-requested";
  if (reviews.some((r) => r.state === "APPROVED")) return "approved";
  return "open";
};

export const getStatusLabel = (labels: GithubLabel[]): string | null => {
  const statusLabel = labels.find((label) => label.name.startsWith("status/"));
  return statusLabel?.name ?? null;
};
