"use client"

import { Droppable, Draggable } from "@hello-pangea/dnd"
import type { Issue, IssueStatus } from "@/types"
import { IssueCard } from "@/components/kanban/IssueCard"
import { cn } from "@/lib/utils"

export function BoardColumn({
  id,
  title,
  issues,
  countLabel,
  onOpenIssue,
  selectedIds,
  onToggleSelect,
  isDragDisabled = false,
  highlightMatches = false,
  emptyStateLabel = "No issues yet",
}: {
  id: string
  title: IssueStatus
  issues: Issue[]
  countLabel?: string
  onOpenIssue?: (issue: Issue) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  isDragDisabled?: boolean
  highlightMatches?: boolean
  emptyStateLabel?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col rounded-2xl border p-3",
        title === "Blocked"
          ? "border-amber-500/60 bg-amber-950/20"
          : "border-border/50 bg-muted/20"
      )}
    >
      <div className="mb-3 flex min-h-[36px] items-center justify-between">
        <h3
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            title === "Blocked" ? "text-amber-400" : "text-muted-foreground"
          )}
        >
          {title === "Blocked" ? "🚫 Blocked" : title}
        </h3>
        <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-semibold text-foreground/80 shadow-sm">
          {countLabel ?? issues.length}
        </span>
      </div>
      <Droppable droppableId={id} isDropDisabled={isDragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex flex-1 flex-col gap-3 rounded-xl p-2 transition",
              snapshot.isDraggingOver ? "bg-muted/60" : "bg-transparent"
            )}
          >
            {issues.map((issue, index) => (
              <Draggable
                key={issue._id}
                draggableId={issue._id}
                index={index}
                isDragDisabled={isDragDisabled}
              >
                {(dragProvided, dragSnapshot) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                    <IssueCard
                      issue={issue}
                      onOpen={onOpenIssue}
                      isHighlighted={highlightMatches}
                      selected={Boolean(selectedIds?.has(issue._id))}
                      isDragDisabled={isDragDisabled}
                      onToggleSelect={onToggleSelect}
                      dragHandleProps={dragProvided.dragHandleProps}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {issues.length === 0 && (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-6 text-center text-xs text-muted-foreground">
                {emptyStateLabel}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
