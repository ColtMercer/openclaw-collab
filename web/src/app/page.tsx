import { Suspense } from "react"
import { KanbanBoard } from "@/components/kanban/KanbanBoard"

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <KanbanBoard />
    </Suspense>
  )
}
