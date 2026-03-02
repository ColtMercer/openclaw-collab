export type Project = {
  _id: string
  name: string
  slug: string
  createdAt: string
}

export type IssueStatus = "Backlog" | "In Progress" | "Blocked" | "Review" | "Done"
export type IssuePriority = "Low" | "Medium" | "High" | "Critical" | "Urgent"

export type Issue = {
  _id: string
  title: string
  description?: string
  project: string
  priority: IssuePriority
  status: IssueStatus
  labels?: Array<{ name: string } | string>
  order: number
  createdAt: string
}

export type ArticleStatus =
  | "Draft"
  | "In Review"
  | "Revision Needed"
  | "Ready to Publish"
  | "Published"

export type Article = {
  _id: string
  title: string
  content: string
  project: string
  status: ArticleStatus
  createdAt: string
  updatedAt: string
}

export type Comment = {
  _id: string
  articleId: string
  paragraphIndex: number
  content: string
  resolved: boolean
  createdAt: string
}

export type ChatMessage = {
  _id: string
  role: "user" | "assistant"
  content: string
  context: {
    path: string
    project?: string
  }
  createdAt: string
}
