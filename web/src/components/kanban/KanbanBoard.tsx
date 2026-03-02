"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "@/lib/constants"
import type { Issue, IssuePriority, IssueStatus, Project } from "@/types"
import { BoardColumn } from "@/components/kanban/BoardColumn"
import { IssueCard } from "@/components/kanban/IssueCard"
import { cn } from "@/lib/utils"

const columnId = (project: string, status: IssueStatus) =>
  `column:${project}:${status}`

const normalizePriority = (priority: IssuePriority) =>
  priority === "Urgent" ? "Critical" : priority

function sortIssues(issues: Issue[]) {
  return [...issues].sort((a, b) => a.order - b.order)
}

const truncateTitle = (title: string, maxLength = 30) => {
  if (title.length <= maxLength) return title
  return `${title.slice(0, Math.max(0, maxLength - 3))}...`
}

export function KanbanBoard() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [issues, setIssues] = React.useState<Issue[]>([])
  const [activeIssue, setActiveIssue] = React.useState<Issue | null>(null)
  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null)
  const [issueDraft, setIssueDraft] = React.useState({
    title: "",
    description: "",
    project: "",
    priority: "Medium" as IssuePriority,
    status: "Backlog" as IssueStatus,
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [issueDialogOpen, setIssueDialogOpen] = React.useState(false)
  const [issueDetailOpen, setIssueDetailOpen] = React.useState(false)
  const [issueDeleteOpen, setIssueDeleteOpen] = React.useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false)
  const [isSavingIssue, setIsSavingIssue] = React.useState(false)
  const [isDeletingIssue, setIsDeletingIssue] = React.useState(false)
  const [isCreatingIssue, setIsCreatingIssue] = React.useState(false)
  const [isCreatingProject, setIsCreatingProject] = React.useState(false)
  const [searchInput, setSearchInput] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [activeLabelFilters, setActiveLabelFilters] = React.useState<string[]>([])
  const [activeProjectFilters, setActiveProjectFilters] = React.useState<string[]>([])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const pendingIssues = React.useMemo(
    () =>
      sortIssues(
        issues.filter((issue) => issue.status === "Review" || issue.status === "Blocked")
      ),
    [issues]
  )

  const [newIssue, setNewIssue] = React.useState({
    title: "",
    description: "",
    project: "",
    priority: "Medium" as IssuePriority,
  })

  const [newProject, setNewProject] = React.useState({ name: "", slug: "" })

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projectsRes, issuesRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/issues"),
      ])

      if (!projectsRes.ok || !issuesRes.ok) {
        throw new Error("Failed to fetch board data")
      }

      const [projectsData, issuesData] = await Promise.all([
        projectsRes.json(),
        issuesRes.json(),
      ])

      setProjects(projectsData)
      setIssues(
        issuesData.map((issue: Issue) => ({
          ...issue,
          priority: normalizePriority(issue.priority),
        }))
      )
    } catch (err) {
      setError("Unable to load the board. Please try again.")
      toast.error("Failed to load the kanban board.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  React.useEffect(() => {
    if (projects.length > 0 && !newIssue.project) {
      setNewIssue((prev) => ({ ...prev, project: projects[0].name }))
    }
  }, [projects, newIssue.project])

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(searchInput.trim().toLowerCase())
    }, 200)
    return () => clearTimeout(handle)
  }, [searchInput])

  const labelBuckets = React.useMemo(() => {
    const typeLabels = new Set<string>()
    const priorityLabels = new Set<string>()
    issues.forEach((issue) => {
      const labels = issue.labels ?? []
      labels.forEach((label) => {
        const name = typeof label === "string" ? label : label.name
        if (!name) return
        if (name.startsWith("type/")) typeLabels.add(name)
        if (name.startsWith("priority/")) priorityLabels.add(name)
      })
    })
    return {
      type: Array.from(typeLabels).sort(),
      priority: Array.from(priorityLabels).sort(),
    }
  }, [issues])

  const isFiltering = debouncedQuery.length > 0 || activeLabelFilters.length > 0

  const getLabelNames = React.useCallback((issue: Issue) => {
    const labels = issue.labels ?? []
    return labels
      .map((label) => (typeof label === "string" ? label : label.name))
      .filter(Boolean) as string[]
  }, [])

  const matchesFilters = React.useCallback(
    (issue: Issue) => {
      const matchesSearch =
        debouncedQuery.length === 0 ||
        issue.title.toLowerCase().includes(debouncedQuery)
      if (!matchesSearch) return false

      if (activeLabelFilters.length === 0) return true
      const labels = getLabelNames(issue)
      return activeLabelFilters.every((label) => labels.includes(label))
    },
    [activeLabelFilters, debouncedQuery, getLabelNames]
  )

  const toggleLabel = (label: string) => {
    setActiveLabelFilters((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  const toggleProject = (projectName: string) => {
    setActiveProjectFilters((prev) =>
      prev.includes(projectName) ? prev.filter((p) => p !== projectName) : [...prev, projectName]
    )
  }

  const clearFilters = () => {
    setSearchInput("")
    setDebouncedQuery("")
    setActiveLabelFilters([])
    setActiveProjectFilters([])
  }

  const hasActiveFilters =
    searchInput.trim().length > 0 ||
    activeLabelFilters.length > 0 ||
    activeProjectFilters.length > 0

  const handleCreateIssue = async () => {
    if (!newIssue.title || !newIssue.project) return
    setIsCreatingIssue(true)
    const currentIssues = issues.filter(
      (issue) => issue.project === newIssue.project && issue.status === "Backlog"
    )
    const order = currentIssues.length

    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newIssue.title,
          description: newIssue.description,
          project: newIssue.project,
          priority: newIssue.priority,
          status: "Backlog",
          order,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create issue")
      }

      const created = await response.json()
      setIssues((prev) => [
        ...prev,
        { ...created, priority: normalizePriority(created.priority) },
      ])
      setNewIssue({
        title: "",
        description: "",
        project: newIssue.project,
        priority: "Medium",
      })
      setIssueDialogOpen(false)
      toast.success("Issue created.")
    } catch (err) {
      toast.error("Could not create the issue.")
    } finally {
      setIsCreatingIssue(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.slug) return
    setIsCreatingProject(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      const created = await response.json()
      setProjects((prev) => [...prev, created])
      setNewProject({ name: "", slug: "" })
      setProjectDialogOpen(false)
      toast.success("Project created.")
    } catch (err) {
      toast.error("Could not create the project.")
    } finally {
      setIsCreatingProject(false)
    }
  }

  const persistReorder = async (
    updates: Array<{ id: string; project: string; status: IssueStatus; order: number }>
  ) => {
    if (updates.length === 0) return
    try {
      const response = await fetch("/api/issues/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      if (!response.ok) {
        throw new Error("Failed to reorder issues")
      }
    } catch (err) {
      toast.error("Unable to reorder issues.")
    }
  }

  const openIssue = (issue: Issue) => {
    const normalized = { ...issue, priority: normalizePriority(issue.priority) }
    setSelectedIssue(normalized)
    setIssueDraft({
      title: normalized.title,
      description: normalized.description ?? "",
      project: normalized.project,
      priority: normalized.priority,
      status: normalized.status,
    })
    setIssueDetailOpen(true)
  }

  const handleUpdateIssue = async () => {
    if (!selectedIssue) return
    setIsSavingIssue(true)

    const moving =
      selectedIssue.project !== issueDraft.project ||
      selectedIssue.status !== issueDraft.status

    let order = selectedIssue.order
    let reorderUpdates: Array<{
      id: string
      project: string
      status: IssueStatus
      order: number
    }> = []

    if (moving) {
      const sourceIssues = sortIssues(
        issues.filter(
          (issue) =>
            issue.project === selectedIssue.project &&
            issue.status === selectedIssue.status &&
            issue._id !== selectedIssue._id
        )
      )
      const destinationIssues = sortIssues(
        issues.filter(
          (issue) =>
            issue.project === issueDraft.project &&
            issue.status === issueDraft.status &&
            issue._id !== selectedIssue._id
        )
      )

      order = destinationIssues.length

      const sourceUpdates = sourceIssues.map((issue, index) => ({
        id: issue._id,
        project: issue.project,
        status: issue.status,
        order: index,
      }))
      const destinationUpdates = [...destinationIssues, selectedIssue].map(
        (_issue, index) => ({
          id: _issue._id,
          project: issueDraft.project,
          status: issueDraft.status,
          order: index,
        })
      )

      reorderUpdates = [...sourceUpdates, ...destinationUpdates]
    }

    try {
      const response = await fetch(`/api/issues/${selectedIssue._id}` , {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issueDraft.title,
          description: issueDraft.description,
          project: issueDraft.project,
          priority: issueDraft.priority,
          status: issueDraft.status,
          order,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update issue")
      }

      const updated = await response.json()
      const normalized = {
        ...updated,
        priority: normalizePriority(updated.priority),
      }

      setIssues((prev) => {
        const updatedBase = prev.map((issue) => {
          const reorder = reorderUpdates.find((item) => item.id === issue._id)
          if (!reorder) return issue
          return {
            ...issue,
            project: reorder.project,
            status: reorder.status,
            order: reorder.order,
          }
        })

        return updatedBase.map((issue) =>
          issue._id === normalized._id ? normalized : issue
        )
      })

      if (reorderUpdates.length > 0) {
        await persistReorder(reorderUpdates)
      }

      setSelectedIssue(normalized)
      toast.success("Issue updated.")
    } catch (err) {
      toast.error("Could not update the issue.")
    } finally {
      setIsSavingIssue(false)
    }
  }

  const handleDeleteIssue = async () => {
    if (!selectedIssue) return
    setIsDeletingIssue(true)
    try {
      const response = await fetch(`/api/issues/${selectedIssue._id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete issue")
      }

      const remaining = issues.filter((issue) => issue._id !== selectedIssue._id)
      const sourceIssues = sortIssues(
        remaining.filter(
          (issue) =>
            issue.project === selectedIssue.project &&
            issue.status === selectedIssue.status
        )
      )
      const updates = sourceIssues.map((issue, index) => ({
        id: issue._id,
        project: issue.project,
        status: issue.status,
        order: index,
      }))

      setIssues(
        remaining.map((issue) => {
          const reorder = updates.find((item) => item.id === issue._id)
          return reorder ? { ...issue, order: reorder.order } : issue
        })
      )

      if (updates.length > 0) {
        await persistReorder(updates)
      }

      setIssueDeleteOpen(false)
      setIssueDetailOpen(false)
      toast.success("Issue deleted.")
    } catch (err) {
      toast.error("Could not delete the issue.")
    } finally {
      setIsDeletingIssue(false)
    }
  }

  const onDragStart = (event: DragStartEvent) => {
    const issue = issues.find((item) => item._id === event.active.id)
    setActiveIssue(issue ?? null)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)

    if (!over) return

    const activeIssue = issues.find((item) => item._id === active.id)
    if (!activeIssue) return

    const overIssue = issues.find((item) => item._id === over.id)
    let destinationProject = activeIssue.project
    let destinationStatus = activeIssue.status
    let destinationIndex = 0

    if (overIssue) {
      destinationProject = overIssue.project
      destinationStatus = overIssue.status
    } else if (typeof over.id === "string" && over.id.startsWith("column:")) {
      const [, projectName, statusName] = over.id.split(":")
      destinationProject = projectName
      destinationStatus = statusName as IssueStatus
    }

    const sourceKey = `${activeIssue.project}:${activeIssue.status}`
    const destinationKey = `${destinationProject}:${destinationStatus}`

    const sourceIssues = sortIssues(
      issues.filter(
        (issue) => issue.project === activeIssue.project && issue.status === activeIssue.status
      )
    )
    const destinationIssues = sortIssues(
      issues.filter(
        (issue) => issue.project === destinationProject && issue.status === destinationStatus
      )
    )

    const sourceIndex = sourceIssues.findIndex((issue) => issue._id === activeIssue._id)
    if (sourceIndex === -1) return

    if (overIssue) {
      destinationIndex = destinationIssues.findIndex((issue) => issue._id === overIssue._id)
    } else {
      destinationIndex = destinationIssues.length
    }

    if (sourceKey === destinationKey) {
      if (sourceIndex === destinationIndex) return
      const reordered = arrayMove(sourceIssues, sourceIndex, destinationIndex)
      const updates = reordered.map((issue, index) => ({
        id: issue._id,
        project: issue.project,
        status: issue.status,
        order: index,
      }))

      setIssues((prev) =>
        prev.map((issue) => {
          const updated = updates.find((item) => item.id === issue._id)
          return updated ? { ...issue, order: updated.order } : issue
        })
      )

      void persistReorder(updates)
      return
    }

    const nextSource = [...sourceIssues]
    nextSource.splice(sourceIndex, 1)
    const nextDestination = [...destinationIssues]
    nextDestination.splice(destinationIndex, 0, {
      ...activeIssue,
      project: destinationProject,
      status: destinationStatus,
    })

    const sourceUpdates = nextSource.map((issue, index) => ({
      id: issue._id,
      project: issue.project,
      status: issue.status,
      order: index,
    }))

    const destinationUpdates = nextDestination.map((issue, index) => ({
      id: issue._id,
      project: destinationProject,
      status: destinationStatus,
      order: index,
    }))

    setIssues((prev) =>
      prev.map((issue) => {
        const updated = [...sourceUpdates, ...destinationUpdates].find(
          (item) => item.id === issue._id
        )
        if (!updated) return issue
        return {
          ...issue,
          project: updated.project,
          status: updated.status,
          order: updated.order,
        }
      })
    )

    void persistReorder([...sourceUpdates, ...destinationUpdates])
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="space-y-8">
          {[0, 1].map((item) => (
            <div key={item} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                {[0, 1, 2, 3, 4].map((column) => (
                  <div
                    key={column}
                    className="rounded-2xl border border-border/50 bg-muted/20 p-3"
                  >
                    <Skeleton className="mb-3 h-4 w-24" />
                    <div className="space-y-3">
                      {[0, 1].map((card) => (
                        <Skeleton key={card} className="h-20 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card/60 p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">Board offline</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void fetchData()}>
          Retry
        </Button>
      </section>
    )
  }

  return (
    <section className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kanban Board</h1>
          <p className="text-sm text-muted-foreground">
            Track initiatives by project. Drag cards to reprioritize.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Add Project</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New project</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Project name"
                  value={newProject.name}
                  onChange={(event) =>
                    setNewProject((prev) => ({
                      ...prev,
                      name: event.target.value,
                      slug: event.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                />
                <Input
                  placeholder="Slug"
                  value={newProject.slug}
                  onChange={(event) =>
                    setNewProject((prev) => ({ ...prev, slug: event.target.value }))
                  }
                />
                <Button className="w-full" onClick={handleCreateProject} disabled={isCreatingProject}>
                  {isCreatingProject ? "Creating..." : "Create project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Issue</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create issue</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Issue title"
                  value={newIssue.title}
                  onChange={(event) =>
                    setNewIssue((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <Textarea
                  placeholder="Issue description"
                  rows={4}
                  value={newIssue.description}
                  onChange={(event) =>
                    setNewIssue((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
                <Select
                  value={newIssue.project}
                  onValueChange={(value) =>
                    setNewIssue((prev) => ({ ...prev, project: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project._id} value={project.name}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newIssue.priority}
                  onValueChange={(value: IssuePriority) =>
                    setNewIssue((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={handleCreateIssue} disabled={isCreatingIssue}>
                  {isCreatingIssue ? "Creating..." : "Create issue"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {pendingIssues.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              ⏳ Pending Your Attention ({pendingIssues.length})
            </h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingIssues.map((issue) => {
              const displayNumber =
                typeof (issue as Issue & { number?: number }).number === "number"
                  ? (issue as Issue & { number?: number }).number
                  : issue.order + 1
              const isBlocked = issue.status === "Blocked"
              return (
                <button
                  key={issue._id}
                  type="button"
                  onClick={() => openIssue(issue)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition hover:opacity-90",
                    isBlocked
                      ? "border-amber-600/60 bg-amber-600/20 text-amber-100"
                      : "border-amber-400/50 bg-amber-400/15 text-amber-100"
                  )}
                >
                  <span>{isBlocked ? "⛔" : "🕵️"}</span>
                  <span className="whitespace-nowrap">
                    #{displayNumber} · {truncateTitle(issue.title)} · {issue.project}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">No projects yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first project to start organizing issues.
          </p>
          <Button className="mt-4" onClick={() => setProjectDialogOpen(true)}>
            Add Project
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search issue titles..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {hasActiveFilters ? "Filters active" : "No filters applied"}
            </div>
          </div>
          <Button variant="secondary" onClick={clearFilters} disabled={!hasActiveFilters}>
            Clear All
          </Button>
        </div>
        {projects.length > 1 && (
          <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
              Project
            </span>
            {projects.map((project) => {
              const isActive = activeProjectFilters.includes(project.name)
              return (
                <button
                  key={project._id}
                  type="button"
                  onClick={() => toggleProject(project.name)}
                  aria-pressed={isActive}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                    isActive
                      ? "border-violet-500/60 bg-violet-500/20 text-violet-100"
                      : "border-border/60 text-muted-foreground hover:border-border"
                  )}
                >
                  {project.name}
                </button>
              )
            })}
          </div>
        )}
        <div className="mt-3 flex flex-nowrap gap-3 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Type
            </span>
            {labelBuckets.type.map((label) => {
              const isActive = activeLabelFilters.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  aria-pressed={isActive}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                    isActive
                      ? "border-blue-500/60 bg-blue-500/20 text-blue-100"
                      : "border-border/60 text-muted-foreground hover:border-border"
                  )}
                >
                  {label}
                </button>
              )
            })}
            {labelBuckets.type.length === 0 && (
              <span className="text-xs text-muted-foreground">No type labels</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Priority
            </span>
            {labelBuckets.priority.map((label) => {
              const isActive = activeLabelFilters.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  aria-pressed={isActive}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                    isActive
                      ? "border-blue-500/60 bg-blue-500/20 text-blue-100"
                      : "border-border/60 text-muted-foreground hover:border-border"
                  )}
                >
                  {label}
                </button>
              )
            })}
            {labelBuckets.priority.length === 0 && (
              <span className="text-xs text-muted-foreground">No priority labels</span>
            )}
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="space-y-10">
          {projects
            .filter((project) =>
              activeProjectFilters.length === 0 || activeProjectFilters.includes(project.name)
            )
            .map((project) => (
            <div key={project._id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{project.name}</h2>
                  <p className="text-xs text-muted-foreground">{project.slug}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    const projectIssues = issues.filter(
                      (issue) => issue.project === project.name
                    )
                    const matching = projectIssues.filter(matchesFilters)
                    if (!isFiltering) {
                      return `${projectIssues.length} issues`
                    }
                    return `${matching.length} of ${projectIssues.length} issues`
                  })()}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                {ISSUE_STATUSES.map((status) => {
                  const filtered = sortIssues(
                    issues
                      .filter(
                        (issue) =>
                          issue.project === project.name && issue.status === status
                      )
                      .filter(matchesFilters)
                  )
                  return (
                    <BoardColumn
                      key={`${project._id}-${status}`}
                      id={columnId(project.name, status)}
                      title={status}
                      project={project.name}
                      issues={filtered}
                      onOpenIssue={openIssue}
                      highlightMatches={isFiltering}
                      emptyStateLabel={isFiltering ? "No matching issues" : "Drop issues here"}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeIssue ? (
            <div className="w-72">
              <IssueCard issue={activeIssue} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={issueDetailOpen}
        onOpenChange={(nextOpen) => {
          setIssueDetailOpen(nextOpen)
          if (!nextOpen) {
            setSelectedIssue(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue details</DialogTitle>
          </DialogHeader>
          {selectedIssue ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                Created {new Date(selectedIssue.createdAt).toLocaleString()}
              </div>
              <Input
                placeholder="Title"
                value={issueDraft.title}
                onChange={(event) =>
                  setIssueDraft((prev) => ({ ...prev, title: event.target.value }))
                }
              />
              <Textarea
                placeholder="Description"
                rows={5}
                value={issueDraft.description}
                onChange={(event) =>
                  setIssueDraft((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  value={issueDraft.project}
                  onValueChange={(value) =>
                    setIssueDraft((prev) => ({ ...prev, project: value }))
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
                <Select
                  value={issueDraft.status}
                  onValueChange={(value: IssueStatus) =>
                    setIssueDraft((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={issueDraft.priority}
                  onValueChange={(value: IssuePriority) =>
                    setIssueDraft((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="destructive"
                  onClick={() => setIssueDeleteOpen(true)}
                >
                  Delete
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setIssueDetailOpen(false)}
                  >
                    Close
                  </Button>
                  <Button onClick={handleUpdateIssue} disabled={isSavingIssue}>
                    {isSavingIssue ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={issueDeleteOpen} onOpenChange={setIssueDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete issue?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the issue and its history.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIssueDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteIssue}
              disabled={isDeletingIssue}
              className={cn(isDeletingIssue && "opacity-80")}
            >
              {isDeletingIssue ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
