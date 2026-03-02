"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ARTICLE_STATUSES } from "@/lib/constants"
import type { Article, ArticleStatus, Comment } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_ACTIONS: Record<ArticleStatus, Array<{ label: string; next: ArticleStatus }>> = {
  Draft: [{ label: "Submit for Review", next: "In Review" }],
  "In Review": [
    { label: "Request Changes", next: "Revision Needed" },
    { label: "Approve", next: "Ready to Publish" },
  ],
  "Revision Needed": [{ label: "Resubmit", next: "In Review" }],
  "Ready to Publish": [{ label: "Publish", next: "Published" }],
  Published: [],
}

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const [article, setArticle] = React.useState<Article | null>(null)
  const [comments, setComments] = React.useState<Comment[]>([])
  const [activeParagraph, setActiveParagraph] = React.useState<number | null>(null)
  const [commentInput, setCommentInput] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const fetchArticle = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/articles/${id}`)
      if (!response.ok) throw new Error("Failed to load article")
      const data = await response.json()
      setArticle(data)
    } catch (err) {
      setError("Unable to load this article. Please retry.")
      toast.error("Failed to load article.")
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchComments = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/comments?articleId=${id}`)
      if (!response.ok) throw new Error("Failed to load comments")
      const data = await response.json()
      setComments(data)
    } catch (err) {
      toast.error("Failed to load comments.")
    }
  }, [id])

  React.useEffect(() => {
    void fetchArticle()
    void fetchComments()
  }, [fetchArticle, fetchComments])

  const blocks = React.useMemo(() => {
    if (!article?.content) return []
    return article.content.split(/\n\s*\n/)?.filter(Boolean)
  }, [article?.content])

  const handleStatusChange = async (next: ArticleStatus) => {
    if (!article) return
    try {
      const response = await fetch(`/api/articles/${article._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })

      if (!response.ok) throw new Error("Failed to update status")
      const updated = await response.json()
      setArticle(updated)
      toast.success(`Status moved to ${next}.`)
    } catch (err) {
      toast.error("Could not update the status.")
    }
  }

  const handleAddComment = async (paragraphIndex: number) => {
    if (!commentInput.trim() || !article) return
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article._id,
          paragraphIndex,
          content: commentInput,
        }),
      })

      if (!response.ok) throw new Error("Failed to add comment")
      const created = await response.json()
      setComments((prev) => [...prev, created])
      setCommentInput("")
      setActiveParagraph(null)
      toast.success("Comment added.")
    } catch (err) {
      toast.error("Could not add the comment.")
    }
  }

  const toggleResolved = async (commentId: string, resolved: boolean) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      })

      if (!response.ok) throw new Error("Failed to update comment")
      const updated = await response.json()
      setComments((prev) =>
        prev.map((comment) => (comment._id === updated._id ? updated : comment))
      )
    } catch (err) {
      toast.error("Could not update the comment.")
    }
  }

  const handleDelete = async () => {
    if (!article) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/articles/${article._id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete")
      toast.success("Article deleted.")
      router.push("/articles")
    } catch (err) {
      toast.error("Could not delete the article.")
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card/60 p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">Article unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void fetchArticle()}>
          Retry
        </Button>
      </section>
    )
  }

  if (!article) {
    return <div className="text-sm text-muted-foreground">Article not found.</div>
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => router.push("/articles")}>
            Back to articles
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">{article.title}</h1>
          <p className="text-sm text-muted-foreground">Project: {article.project}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{article.status}</Badge>
          {STATUS_ACTIONS[article.status].map((action) => (
            <Button key={action.label} onClick={() => handleStatusChange(action.next)}>
              {action.label}
            </Button>
          ))}
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/70 p-6">
        <div className="space-y-6">
          {blocks.map((block, index) => {
            const blockComments = comments.filter(
              (comment) => comment.paragraphIndex === index
            )
            const unresolved = blockComments.some((comment) => !comment.resolved)
            return (
              <div
                key={index}
                className={cn(
                  "rounded-xl border border-transparent p-3 transition hover:border-border/70",
                  activeParagraph === index && "border-border/80 bg-muted/30"
                )}
                onClick={() => setActiveParagraph(index)}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>
                <div className="mt-3 space-y-2">
                  {blockComments.map((comment) => (
                    <div
                      key={comment._id}
                      className={cn(
                        "rounded-lg border border-border/60 px-3 py-2 text-sm",
                        comment.resolved && "opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p>{comment.content}</p>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            void toggleResolved(comment._id, !comment.resolved)
                          }}
                        >
                          {comment.resolved ? "Unresolve" : "Resolve"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {activeParagraph === index && (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add a comment"
                        value={commentInput}
                        onChange={(event) => setCommentInput(event.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleAddComment(index)
                        }}
                      >
                        Comment
                      </Button>
                    </div>
                  )}
                  {blockComments.length > 0 && unresolved && (
                    <p className="text-xs text-amber-200">Open comments require review.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Workflow states: {ARTICLE_STATUSES.join(" -> ")}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete article?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the article and its comments.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
