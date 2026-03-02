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

export function IssueCard({
  issue,
  onOpen,
  isOverlay = false,
  isHighlighted = false,
}: {
  issue: Issue
  onOpen?: (issue: Issue) => void
  isOverlay?: boolean
  isHighlighted?: boolean
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

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border border-border/70 bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-border/90 hover:shadow-md",
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
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[11px] uppercase tracking-wide",
            priorityStyles[issue.priority]
          )}
        >
          {displayPriority(issue.priority)}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Created {new Date(issue.createdAt).toLocaleDateString()}
      </p>
    </article>
  )
}
