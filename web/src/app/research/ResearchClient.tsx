"use client"

import { useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Search, FileText, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"

type ResearchFileMeta = {
  slug: string
  filename: string
  title: string
  excerpt: string
  createdAt: string
  modifiedAt: string
  size: number
  wordCount: number
}

type ResearchFileDetail = ResearchFileMeta & {
  content: string
}

const emptyForm = {
  filename: "",
  content: "# New Research\n\n",
}

export function ResearchClient() {
  const [files, setFiles] = useState<ResearchFileMeta[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<ResearchFileDetail | null>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function fetchFiles() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/research", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load research.")
      }

      setFiles(payload)
      if (payload.length > 0) {
        setSelectedSlug((current: string | null) => current ?? payload[0].slug)
      } else {
        setSelectedSlug(null)
        setSelectedFile(null)
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load research.")
    } finally {
      setLoading(false)
    }
  }

  async function fetchDetail(slug: string) {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const response = await fetch(`/api/research/${slug}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load research file.")
      }
      setSelectedFile(payload)
    } catch (fetchError) {
      setDetailError(fetchError instanceof Error ? fetchError.message : "Failed to load research file.")
      setSelectedFile(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    void fetchFiles()
  }, [])

  useEffect(() => {
    if (!selectedSlug) return
    void fetchDetail(selectedSlug)
  }, [selectedSlug])

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return files

    return files.filter((file) =>
      [file.title, file.excerpt, file.filename].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    )
  }, [files, query])

  async function handleCreate() {
    setIsCreating(true)
    setError(null)
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create research file.")
      }

      setCreateOpen(false)
      setForm(emptyForm)
      await fetchFiles()
      setSelectedSlug(payload.slug)
      setSelectedFile(payload)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create research file.")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete() {
    if (!selectedSlug) return
    setIsDeleting(true)
    setDetailError(null)
    try {
      const response = await fetch(`/api/research/${selectedSlug}`, {
        method: "DELETE",
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete research file.")
      }

      const remaining = files.filter((file) => file.slug !== selectedSlug)
      setFiles(remaining)
      const nextSlug = remaining[0]?.slug ?? null
      setSelectedSlug(nextSlug)
      setSelectedFile(null)
    } catch (deleteError) {
      setDetailError(deleteError instanceof Error ? deleteError.message : "Failed to delete research file.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="space-y-3">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-emerald-300/70">Research</p>
              <CardTitle className="mt-2 text-2xl text-white">Workspace notes</CardTitle>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search research"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-center gap-2">
                  <Plus className="size-4" />
                  New Research
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create research file</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="market-landscape.md"
                    value={form.filename}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, filename: event.target.value }))
                    }
                  />
                  <Textarea
                    className="min-h-[320px] font-mono text-sm"
                    value={form.content}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, content: event.target.value }))
                    }
                  />
                  <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create research"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading research…</p>
                ) : filteredFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No research files found.</p>
                ) : (
                  filteredFiles.map((file) => {
                    const active = file.slug === selectedSlug
                    return (
                      <button
                        key={file.slug}
                        type="button"
                        onClick={() => setSelectedSlug(file.slug)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-emerald-400/60 bg-emerald-500/10"
                            : "border-border/60 bg-background/30 hover:border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{file.title}</p>
                            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{file.excerpt || "No excerpt yet."}</p>
                          </div>
                          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDate(file.modifiedAt)}</span>
                          <span>{file.wordCount} words</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>

      <section className="space-y-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-emerald-300/70">Detail</p>
              <CardTitle className="mt-2 text-3xl text-white">
                {selectedFile?.title ?? "Research detail"}
              </CardTitle>
              {selectedFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Updated {formatDate(selectedFile.modifiedAt)} · {selectedFile.wordCount} words · {selectedFile.size} bytes
                </p>
              )}
            </div>
            {selectedSlug && (
              <Button variant="outline" className="gap-2" onClick={handleDelete} disabled={isDeleting}>
                <Trash2 className="size-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {detailError && <p className="text-sm text-red-300">{detailError}</p>}
            {!loading && !selectedSlug && !error && (
              <p className="text-sm text-muted-foreground">Create a research note to get started.</p>
            )}
            {detailLoading ? (
              <p className="text-sm text-muted-foreground">Loading note…</p>
            ) : selectedFile ? (
              <article className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-code:text-emerald-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedFile.content}</ReactMarkdown>
              </article>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
