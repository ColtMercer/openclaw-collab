const githubOwner =
  process.env.GITHUB_OWNER?.trim() || "ColtMercer";
const githubRepo =
  process.env.GITHUB_REPO?.trim() || "openclaw-collab";
const githubToken = process.env.GITHUB_TOKEN?.trim() || "";

export const githubConfig = {
  apiBase: process.env.GITHUB_API_BASE ?? "https://api.github.com",
  owner: githubOwner,
  repo: githubRepo,
  token: githubToken,
};

/** "owner/repo" shorthand */
export const repoSlug = `${githubOwner}/${githubRepo}`;

/** Alias used by some pages */
export const githubRepoSlug = repoSlug;

export const repoUrl = `https://github.com/${repoSlug}`;
