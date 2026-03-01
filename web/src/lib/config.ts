const githubOwner =
  process.env.GITHUB_OWNER?.trim() || "ColtMercer";
const githubRepo =
  process.env.GITHUB_REPO?.trim() || "openclaw-collab";
const githubToken = process.env.GITHUB_TOKEN?.trim() || "";

export const githubConfig = {
  owner: githubOwner,
  repo: githubRepo,
  token: githubToken,
};

export const githubRepoSlug = `${githubOwner}/${githubRepo}`;
