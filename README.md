# OpenClaw Collab

A public collaboration dashboard for **Colt** + **Opus (OpenClaw assistant)**.

## Goals

- **Kanban board** to track assistant work (daily/weekly visibility)
- **Article review workflow** (draft → review → approve/suggest edits)
- **Activity views** (what got done, when)

## Source of truth

We’re using **GitHub Issues + labels** as the canonical backlog/kanban system.
The web dashboard renders those issues into a board.

See: [`docs/WORKFLOW.md`](docs/WORKFLOW.md)

## Local development

The web app lives in `./web`.

```bash
cd web
npm install
npm run dev
```

## Planned hosting

Initial MVP will work in read-only mode against the public GitHub API.
Write actions (moving cards, approvals) will require GitHub OAuth.
