"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MarkdownEditor } from "@/components/articles/MarkdownEditor"
import { ARTICLE_STATUSES } from "@/lib/constants"
import type { Article, ArticleStatus, Project } from "@/types"
import { cn } from "@/lib/utils"

const ALL_STATUS = "All"

const statusStyles: Record<ArticleStatus, string> = {
  Draft: "bg-slate-500/20 text-slate-200",
  "In Review": "bg-amber-500/20 text-amber-200",
  "Revision Needed": "bg-rose-500/20 text-rose-200",
  "Ready to Publish": "bg-emerald-500/20 text-emerald-200",
  Published: "bg-indigo-500/20 text-indigo-200",
}

export default function ArticlesPage() {
  const [articles, setArticles] = React.useState<Article[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [activeStatus, setActiveStatus] = React.useState<string>(ALL_STATUS)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const [form, setForm] = React.useState({
    title: "",
    content: "",
    project: "",
  })

  const fetchArticles = React.useCallback(async (status?: string) => {
    setLoading(true)
    setError(null)
    try {
      const query =
        status && status !== ALL_STATUS
          ? `?status=${encodeURIComponent(status)}`
          : ""
      const response = await fetch(`/api/articles${query}`)
      if (!response.ok) throw new Error("Failed to load articles")
      const data = await response.json()
      setArticles(data)
    } catch (err) {
      setError("Unable to load articles. Please retry.")
      toast.error("Failed to fetch articles.")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProjects = React.useCallback(async () => {
    try {
      const response = await fetch("/api/projects")
      if (!response.ok) throw new Error("Failed to load projects")
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      toast.error("Failed to load projects.")
    }
  }, [])

  React.useEffect(() => {
    void fetchArticles(activeStatus)
  }, [activeStatus, fetchArticles])

  React.useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  React.useEffect(() => {
    if (projects.length > 0 && !form.project) {
      setForm((prev) => ({ ...prev, project: projects[0].name }))
    }
  }, [projects, form.project])

  const handleCreate = async () => {
    if (!form.title || !form.project) return
    setIsCreating(true)
    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          project: form.project,
          status: "Draft",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create article")
      }

      const created = await response.json()
      setArticles((prev) => [created, ...prev])
      setForm({ title: "", content: "", project: form.project })
      setOpen(false)
      toast.success("Article created.")
    } catch (err) {
      toast.error("Could not create the article.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Article Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Manage editorial workflows with structured review states.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Article</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create article</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
              <Select
                value={form.project}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, project: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project._id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MarkdownEditor
                value={form.content}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, content: value ?? "" }))
                }
              />
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create article"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeStatus} onValueChange={setActiveStatus}>
        <TabsList className="flex flex-wrap">
          {[ALL_STATUS, ...ARTICLE_STATUSES].map((status) => (
            <TabsTrigger key={status} value={status}>
              {status}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading && (
        <div className="grid gap-4">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-border/60 bg-card/70 p-4"
            >
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-3 h-4 w-64" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">Articles offline</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => void fetchArticles(activeStatus)}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {articles.map((article) => (
            <Link
              key={article._id}
              href={`/articles/${article._id}`}
              className="rounded-2xl border border-border/60 bg-card/70 p-4 transition hover:border-border"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {article.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {article.project} - Updated{" "}
                    {new Date(article.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn("text-xs", statusStyles[article.status])}
                >
                  {article.status}
                </Badge>
              </div>
            </Link>
          ))}
          {articles.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center">
              <h2 className="text-lg font-semibold text-foreground">No articles yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Draft an article to start your editorial workflow.
              </p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                New Article
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
