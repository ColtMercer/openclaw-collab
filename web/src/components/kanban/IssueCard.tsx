"use client"

import { GripVertical } from "lucide-react"
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd"
import { differenceInCalendarDays, isValid, parseISO, startOfDay } from "date-fns"
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

const getDueInfo = (dueDate?: string | null) => {
  if (!dueDate) return null
  const parsed = parseISO(dueDate)
  if (!isValid(parsed)) return null
  const today = startOfDay(new Date())
  const dueDay = startOfDay(parsed)
  const diff = differenceInCalendarDays(dueDay, today)

  if (diff === 0) {
    return {
      label: "Due today",
      className: "bg-amber-500/20 text-amber-100 border-amber-500/40",
      isOverdue: false,
    }
  }

  if (diff < 0) {
    const days = Math.abs(diff)
    return {
      label: `Overdue ${days}d`,
      className: "bg-rose-500/20 text-rose-100 border-rose-500/40",
      isOverdue: true,
    }
  }

  return {
    label: `Due in ${diff}d`,
    className: "bg-sky-500/20 text-sky-100 border-sky-500/40",
    isOverdue: false,
  }
}

export function IssueCard({
  issue,
  onOpen,
  isHighlighted = false,
  selected = false,
  isDragDisabled = false,
  onToggleSelect,
  dragHandleProps,
  isDragging = false,
}: {
  issue: Issue
  onOpen?: (issue: Issue) => void
  isHighlighted?: boolean
  selected?: boolean
  isDragDisabled?: boolean
  onToggleSelect?: (id: string) => void
  dragHandleProps?: DraggableProvidedDragHandleProps | null
  isDragging?: boolean
}) {
  const ageLabel = formatAge(issue.createdAt)
  const showCheckbox = typeof onToggleSelect === "function"
  const dueInfo = getDueInfo(issue.dueDate)

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-shadow duration-150 hover:-translate-y-0.5 hover:border-border/90 hover:shadow-md",
        dueInfo?.isOverdue && "border-l-4 border-l-rose-500/80",
        isDragging && "opacity-70 shadow-lg",
        isHighlighted && "ring-2 ring-blue-500/50 ring-offset-1 ring-offset-background",
        onOpen && "cursor-pointer"
      )}
      onClick={() => onOpen?.(issue)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            disabled={isDragDisabled}
            className={cn(
              "mt-0.5 rounded-md border border-border/60 bg-muted/30 p-1 text-muted-foreground transition hover:text-foreground",
              isDragDisabled && "cursor-not-allowed opacity-50"
            )}
            onClick={(event) => event.stopPropagation()}
            {...dragHandleProps}
          >
            <GripVertical className="size-4" />
          </button>
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
          {dueInfo ? (
            <Badge variant="outline" className={cn("shrink-0 text-[11px]", dueInfo.className)}>
              {dueInfo.label}
            </Badge>
          ) : null}
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
