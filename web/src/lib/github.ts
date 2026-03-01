import { githubConfig } from "@/lib/config";

type FetchOptions = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export async function fetchGitHub<T>(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");

  if (githubConfig.token) {
    headers.set("Authorization", `Bearer ${githubConfig.token}`);
  }

  const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
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
