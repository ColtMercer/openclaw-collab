import type { ArticleStatus, IssuePriority, IssueStatus } from "@/types"

export const ISSUE_STATUSES: IssueStatus[] = [
  "Backlog",
  "In Progress",
  "Review",
  "Done",
]

export const ISSUE_PRIORITIES: IssuePriority[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
]

export const ARTICLE_STATUSES: ArticleStatus[] = [
  "Draft",
  "In Review",
  "Revision Needed",
  "Ready to Publish",
  "Published",
]

export const DEFAULT_PROJECTS = [
  { name: "GovChat", slug: "govchat" },
  { name: "AR Copilot", slug: "ar-copilot" },
  { name: "Tiller Finance", slug: "tiller-finance" },
  { name: "Tech News", slug: "tech-news" },
]
