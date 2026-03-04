"use client"

import { GripVertical } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import type { Issue } from "@/types"
import { cn } from "@/lib/utils"

const priorityStyles: Record<Issue["priority"], string> = {
  Low: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  Medium: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  High: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  Critical: "bg-rose-500/20 text-rose-200 border-rose-500/30",
  Urgent: "bg-rose-500/20 text-rose-200 border-rose-500/30",
}

const displayPriority = (priority: Issue["priority"]) =>
  priority === "Urgent" ? "Critical" : priority

const formatAge = (createdAt: string) => {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return ""
  const diff = Math.max(0, Date.now() - created)
  const hour = 1000 * 60 * 60
  const day = hour * 24
  const week = day * 7
  const month = day * 30
  const year = day * 365

  if (diff < hour) return "<1h"
  if (diff < day) return `${Math.floor(diff / hour)}h`
  if (diff < week) return `${Math.floor(diff / day)}d`
  if (diff < week * 4) return `${Math.floor(diff / week)}w`
  if (diff < month * 12) return `${Math.floor(diff / month)}mo`
  return `${Math.floor(diff / year)}y`
}

const ageColor = (createdAt: string) => {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return "text-emerald-400"
  const diff = Math.max(0, Date.now() - created)
  const day = 1000 * 60 * 60 * 24

  if (diff < day * 7) return "text-emerald-400"
  if (diff <= day * 30) return "text-amber-400"
  return "text-rose-400"
}

export function IssueCard({
  issue,
  onOpen,
  isOverlay = false,
  isHighlighted = false,
  selected = false,
  onToggleSelect,
}: {
  issue: Issue
  onOpen?: (issue: Issue) => void
  isOverlay?: boolean
  isHighlighted?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue._id,
    data: { type: "issue", issue },
    disabled: isOverlay,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const ageLabel = formatAge(issue.createdAt)
  const showCheckbox = !isOverlay && typeof onToggleSelect === "function"

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border border-border/70 bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-border/90 hover:shadow-md",
        isDragging && "opacity-70 shadow-lg",
        isHighlighted && "ring-2 ring-blue-500/50 ring-offset-1 ring-offset-background",
        onOpen && "cursor-pointer"
      )}
      onClick={() => onOpen?.(issue)}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {!isOverlay && (
            <button
              ref={setActivatorNodeRef}
              type="button"
              className="mt-0.5 rounded-md border border-border/60 bg-muted/30 p-1 text-muted-foreground transition hover:text-foreground"
              onClick={(event) => event.stopPropagation()}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          )}
          <div>
            <h4 className="text-sm font-semibold text-foreground">{issue.title}</h4>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {issue.description?.trim() || "No description added yet."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-[11px] uppercase tracking-wide",
              priorityStyles[issue.priority]
            )}
          >
            {displayPriority(issue.priority)}
          </Badge>
          {showCheckbox && (
            <label
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground transition",
                selected
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selected}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  event.stopPropagation()
                  onToggleSelect?.(issue._id)
                }}
                className="h-3.5 w-3.5 accent-blue-500"
              />
            </label>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Created {new Date(issue.createdAt).toLocaleDateString()}
      </p>
      {ageLabel ? (
        <span
          className={cn("absolute bottom-2 right-2 text-[10px] font-mono", ageColor(issue.createdAt))}
        >
          {ageLabel}
        </span>
      ) : null}
    </article>
  )
}
