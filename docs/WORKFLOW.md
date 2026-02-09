# Workflow (source of truth)

This project is a collaboration space for **Colt** + **Opus (OpenClaw assistant)**.

## Principles

- **Everything gets tracked**: all work is represented by a GitHub Issue.
- **Kanban = GitHub Issues + labels** (the web dashboard renders these).
- **No direct pushes to main** for feature work: open a PR, then Colt reviews/merges.
- **Articles are PRs**: drafts live in-repo and are reviewed like code.

## Kanban statuses

We use *one* `status/*` label per issue:

- `status/backlog` — not started
- `status/ready` — ready to begin
- `status/in-progress` — actively being worked
- `status/review` — waiting for Colt review
- `status/done` — completed (usually also **closed**)

## Types

Use one `type/*` label:

- `type/feature`
- `type/bug`
- `type/article`

## Opus work tracking

When Opus starts work on an issue:

1. Add label `agent/opus`
2. Move it to `status/in-progress`
3. Create a branch named: `opus/<issue-number>-<short-slug>`
4. Open a PR that references the issue: `Closes #123`
5. Move issue to `status/review`

When Colt merges:

- Issue should be closed automatically via `Closes #...`
- If not, move it to `status/done` and close it manually.

## Articles

- Article requests are issues labeled `type/article`.
- Drafts live under `content/articles/drafts/` (to be added).
- PRs for articles should include preview notes and reviewer checklist.
