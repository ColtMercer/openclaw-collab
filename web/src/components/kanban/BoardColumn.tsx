"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { Issue, IssueStatus } from "@/types"
import { IssueCard } from "@/components/kanban/IssueCard"
import { cn } from "@/lib/utils"

export function BoardColumn({
  id,
  title,
  project,
  issues,
  countLabel,
  onOpenIssue,
  selectedIds,
  onToggleSelect,
  isDragDisabled = false,
  highlightMatches = false,
  emptyStateLabel = "Drop issues here",
}: {
  id: string
  title: IssueStatus
  project: string
  issues: Issue[]
  countLabel?: string
  onOpenIssue?: (issue: Issue) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  isDragDisabled?: boolean
  highlightMatches?: boolean
  emptyStateLabel?: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: "column", project, status: title },
  })

  return (
    <div className={cn(
      "flex min-h-[320px] flex-col rounded-2xl border p-3",
      title === "Blocked"
        ? "border-amber-500/60 bg-amber-950/20"
        : "border-border/50 bg-muted/20"
    )}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={cn(
          "text-sm font-semibold uppercase tracking-wide",
          title === "Blocked" ? "text-amber-400" : "text-muted-foreground"
        )}>
          {title === "Blocked" ? "🚫 Blocked" : title}
        </h3>
        <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
          {countLabel ?? issues.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-3 rounded-xl p-2 transition",
          isOver ? "bg-muted/60" : "bg-transparent"
        )}
      >
        <SortableContext
          items={issues.map((issue) => issue._id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue) => (
            <IssueCard
              key={issue._id}
              issue={issue}
              onOpen={onOpenIssue}
              isHighlighted={highlightMatches}
              selected={Boolean(selectedIds?.has(issue._id))}
              isDragDisabled={isDragDisabled}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </SortableContext>
        {issues.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
            {emptyStateLabel}
          </div>
        )}
      </div>
    </div>
  )
}
