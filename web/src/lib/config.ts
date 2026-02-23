export const githubConfig = {
  apiBase: process.env.GITHUB_API_BASE ?? "https://api.github.com",
  owner: process.env.GITHUB_OWNER ?? "ColtMercer",
  repo: process.env.GITHUB_REPO ?? "openclaw-collab",
  token: process.env.GITHUB_TOKEN ?? "",
};

export const repoSlug = githubConfig.owner && githubConfig.repo
  ? `${githubConfig.owner}/${githubConfig.repo}`
  : "";

export const repoUrl = repoSlug ? `https://github.com/${repoSlug}` : "";
