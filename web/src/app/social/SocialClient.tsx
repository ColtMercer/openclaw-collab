"use client"

import * as React from "react"
import { format, startOfWeek } from "date-fns"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { SocialPost, SocialStatus } from "@/types"

const STATUS_ORDER: SocialStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "posted",
]

const STATUS_LABELS: Record<SocialStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  posted: "Posted",
}

const STATUS_STYLES: Record<SocialStatus, string> = {
  draft: "border-slate-700/70 bg-slate-950/60",
  pending_review: "border-yellow-500/40 bg-yellow-500/10",
  approved: "border-emerald-500/40 bg-emerald-500/10",
  posted: "border-blue-500/40 bg-blue-500/10",
}

const PLATFORM_STYLES: Record<SocialPost["platform"], string> = {
  tiktok: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
  twitter: "bg-sky-500/15 text-sky-200 border-sky-500/40",
}

const emptyNewPost = {
  title: "",
  platform: "tiktok" as SocialPost["platform"],
  script: "",
  hook: "",
  hashtags: "",
  topic: "",
  notes: "",
  video_path: "",
}

const emptyEngagement = {
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
}

type SocialClientProps = {
  initialPosts: SocialPost[]
}

const parseDate = (value?: string | null) => (value ? new Date(value) : null)

const formatDate = (value?: string | null, formatString = "MMM d") => {
  if (!value) return "—"
  const parsed = parseDate(value)
  if (!parsed || Number.isNaN(parsed.getTime())) return "—"
  return format(parsed, formatString)
}

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toString()
}

export default function SocialClient({ initialPosts }: SocialClientProps) {
  const [posts, setPosts] = React.useState<SocialPost[]>(initialPosts)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [newPost, setNewPost] = React.useState(emptyNewPost)
  const [isSaving, setIsSaving] = React.useState(false)
  const [detailDraft, setDetailDraft] = React.useState({
    notes: "",
    performance_notes: "",
    engagement: emptyEngagement,
  })

  const selectedPost = posts.find((post) => post._id === selectedId) ?? null

  React.useEffect(() => {
    if (!selectedPost) return
    setDetailDraft({
      notes: selectedPost.notes ?? "",
      performance_notes: selectedPost.performance_notes ?? "",
      engagement: {
        views: selectedPost.engagement?.views ?? 0,
        likes: selectedPost.engagement?.likes ?? 0,
        comments: selectedPost.engagement?.comments ?? 0,
        shares: selectedPost.engagement?.shares ?? 0,
      },
    })
  }, [selectedPost])

  const fetchPosts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/social/posts")
      if (!res.ok) throw new Error("Failed to load posts")
      const data = await res.json()
      setPosts(data.posts)
    } catch (err) {
      toast.error("Unable to refresh social posts.")
    }
  }, [])

  const handleCreatePost = async () => {
    setIsSaving(true)
    try {
      const payload = {
        title: newPost.title,
        platform: newPost.platform,
        script: newPost.script,
        hook: newPost.hook,
        hashtags: newPost.hashtags,
        topic: newPost.topic,
        notes: newPost.notes,
        video_path: newPost.video_path || undefined,
      }
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to create post")
      setDialogOpen(false)
      setNewPost(emptyNewPost)
      await fetchPosts()
      toast.success("Post submitted for review.")
    } catch (err) {
      toast.error("Could not create the post.")
    } finally {
      setIsSaving(false)
    }
  }

  const updatePost = async (id: string, updates: Partial<SocialPost>) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/social/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Update failed")
      const data = await res.json()
      setPosts((prev) => prev.map((post) => (post._id === id ? data.post : post)))
      toast.success("Post updated.")
    } catch (err) {
      toast.error("Unable to update the post.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (direction: "forward" | "back") => {
    if (!selectedPost) return
    const currentIndex = STATUS_ORDER.indexOf(selectedPost.status)
    const nextIndex = direction === "forward" ? currentIndex + 1 : currentIndex - 1
    const nextStatus = STATUS_ORDER[nextIndex]
    if (!nextStatus) return

    const updates: Partial<SocialPost> = { status: nextStatus }
    if (nextStatus === "posted") {
      updates.posted_at = new Date().toISOString()
    }
    if (selectedPost.status === "posted" && nextStatus !== "posted") {
      updates.posted_at = null
    }

    await updatePost(selectedPost._id, updates)
  }

  const handleSaveDetails = async () => {
    if (!selectedPost) return
    await updatePost(selectedPost._id, {
      notes: detailDraft.notes,
      performance_notes: detailDraft.performance_notes,
      engagement: {
        ...detailDraft.engagement,
        updated_at: new Date().toISOString(),
      },
    })
  }

  const report = React.useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weeklyPosts = posts.filter((post) => {
      const created = parseDate(post.created_at)
      return created && created >= weekStart
    })
    const weeklyViews = posts
      .filter((post) => {
        const postedAt = parseDate(post.posted_at)
        return postedAt && postedAt >= weekStart
      })
      .reduce((sum, post) => sum + (post.engagement?.views ?? 0), 0)

    const postedPosts = posts.filter(
      (post) => post.status === "posted" || post.posted_at
    )
    const sortedByViews = [...postedPosts].sort(
      (a, b) => (b.engagement?.views ?? 0) - (a.engagement?.views ?? 0)
    )
    const best = sortedByViews[0] ?? null
    const worst = sortedByViews[sortedByViews.length - 1] ?? null

    return {
      weeklyCount: weeklyPosts.length,
      weeklyViews,
      best,
      worst,
    }
  }, [posts])

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-300/70">
            Social Media Ops
          </p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Plan, review, and ship every social post.
          </h1>
          <p className="mt-3 text-base text-slate-400">
            Keep the hooks tight, the feedback loop visible, and the wins clearly
            tracked.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit a new post</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-slate-300">Title</label>
                <Input
                  value={newPost.title}
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Short title for the card"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Platform</label>
                <Select
                  value={newPost.platform}
                  onValueChange={(value) =>
                    setNewPost((prev) => ({
                      ...prev,
                      platform: value as SocialPost["platform"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Topic</label>
                <Input
                  value={newPost.topic}
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, topic: event.target.value }))
                  }
                  placeholder="Topic or pillar"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-slate-300">Hook</label>
                <Input
                  value={newPost.hook}
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, hook: event.target.value }))
                  }
                  placeholder="Hook preview"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-slate-300">Script / Copy</label>
                <Textarea
                  value={newPost.script}
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, script: event.target.value }))
                  }
                  placeholder="Full script or copy"
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Hashtags</label>
                <Input
                  value={newPost.hashtags}
                  onChange={(event) =>
                    setNewPost((prev) => ({
                      ...prev,
                      hashtags: event.target.value,
                    }))
                  }
                  placeholder="#dogtraining, #creator"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Video path</label>
                <Input
                  value={newPost.video_path}
                  onChange={(event) =>
                    setNewPost((prev) => ({
                      ...prev,
                      video_path: event.target.value,
                    }))
                  }
                  placeholder="/videos/dog-enrichment.mp4"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-slate-300">Notes</label>
                <Textarea
                  value={newPost.notes}
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="Review notes, production notes, etc."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={isSaving || !newPost.title}
                className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                {isSaving ? "Saving..." : "Submit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        <Card className="glass-panel border-slate-800/70 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Morning Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase text-slate-500">Posts this week</p>
              <p className="text-2xl font-semibold text-white">
                {report.weeklyCount}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Views this week</p>
              <p className="text-2xl font-semibold text-white">
                {formatNumber(report.weeklyViews)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Best performer</p>
              <p className="text-sm text-slate-200">
                {report.best ? report.best.title : "No posted content yet"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Needs attention</p>
              <p className="text-sm text-slate-200">
                {report.worst ? report.worst.title : "No posted content yet"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-slate-800/70 bg-slate-950/60 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Active Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Move posts through review, keep notes centralized, and track the wins
            once they go live.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const columnPosts = posts.filter((post) => post.status === status)
          return (
            <div key={status} className="space-y-3">
              <div
                className={cn(
                  "rounded-xl border px-4 py-3",
                  STATUS_STYLES[status]
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    {STATUS_LABELS[status]}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {columnPosts.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {columnPosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-xs text-slate-500">
                    No posts yet.
                  </div>
                ) : (
                  columnPosts.map((post) => {
                    const showEngagement =
                      post.status === "posted" ||
                      (post.engagement?.views ?? 0) > 0
                    const dateLabel =
                      post.status === "posted"
                        ? formatDate(post.posted_at)
                        : formatDate(post.created_at)

                    return (
                      <button
                        key={post._id}
                        type="button"
                        onClick={() => {
                          setSelectedId(post._id)
                          setSheetOpen(true)
                        }}
                        className="w-full text-left"
                      >
                        <Card className="border-slate-800/70 bg-slate-950/70 p-4 shadow-lg transition hover:border-emerald-500/40">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-semibold text-white">
                                  {post.title}
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                  {post.hook}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border text-[10px] uppercase tracking-[0.3em]",
                                  PLATFORM_STYLES[post.platform]
                                )}
                              >
                                {post.platform}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{dateLabel}</span>
                              {showEngagement ? (
                                <span>
                                  {formatNumber(post.engagement.views)} views
                                </span>
                              ) : (
                                <span>Pending</span>
                              )}
                            </div>
                          </div>
                        </Card>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </section>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedPost?.title ?? "Post details"}</SheetTitle>
          </SheetHeader>
          {selectedPost ? (
            <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 pb-6">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "border text-[10px] uppercase tracking-[0.3em]",
                    PLATFORM_STYLES[selectedPost.platform]
                  )}
                >
                  {selectedPost.platform}
                </Badge>
                <Badge variant="outline" className="border-slate-700 text-xs">
                  {STATUS_LABELS[selectedPost.status]}
                </Badge>
                <span className="text-xs text-slate-500">
                  Created {formatDate(selectedPost.created_at, "MMM d, yyyy")}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-slate-500">Hook</p>
                <p className="text-sm text-slate-200">{selectedPost.hook}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-slate-500">Script</p>
                <p className="whitespace-pre-wrap text-sm text-slate-200">
                  {selectedPost.script}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-slate-500">Topic</p>
                  <p className="text-sm text-slate-200">
                    {selectedPost.topic || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Hashtags</p>
                  <p className="text-sm text-slate-200">
                    {selectedPost.hashtags?.length
                      ? selectedPost.hashtags.join(", ")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Video path</p>
                  <p className="text-sm text-slate-200">
                    {selectedPost.video_path || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Publish ID</p>
                  <p className="text-sm text-slate-200">
                    {selectedPost.publish_id || "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase text-slate-500">Engagement</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-400">Views</label>
                    <Input
                      type="number"
                      value={detailDraft.engagement.views}
                      onChange={(event) =>
                        setDetailDraft((prev) => ({
                          ...prev,
                          engagement: {
                            ...prev.engagement,
                            views: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Likes</label>
                    <Input
                      type="number"
                      value={detailDraft.engagement.likes}
                      onChange={(event) =>
                        setDetailDraft((prev) => ({
                          ...prev,
                          engagement: {
                            ...prev.engagement,
                            likes: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Comments</label>
                    <Input
                      type="number"
                      value={detailDraft.engagement.comments}
                      onChange={(event) =>
                        setDetailDraft((prev) => ({
                          ...prev,
                          engagement: {
                            ...prev.engagement,
                            comments: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Shares</label>
                    <Input
                      type="number"
                      value={detailDraft.engagement.shares}
                      onChange={(event) =>
                        setDetailDraft((prev) => ({
                          ...prev,
                          engagement: {
                            ...prev.engagement,
                            shares: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase text-slate-500">Notes</label>
                  <Textarea
                    value={detailDraft.notes}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">
                    Performance notes
                  </label>
                  <Textarea
                    value={detailDraft.performance_notes}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({
                        ...prev,
                        performance_notes: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("back")}
                  disabled={
                    isSaving ||
                    STATUS_ORDER.indexOf(selectedPost.status) === 0
                  }
                >
                  Move Back
                </Button>
                <Button
                  onClick={() => handleStatusChange("forward")}
                  disabled={
                    isSaving ||
                    STATUS_ORDER.indexOf(selectedPost.status) ===
                      STATUS_ORDER.length - 1
                  }
                  className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  Move Forward
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveDetails}
                  disabled={isSaving}
                  className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"
                >
                  Save Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 text-sm text-slate-400">Select a post.</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
