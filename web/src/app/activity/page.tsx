import Link from "next/link"
import { CheckCircle2, CircleDotDashed, PlusCircle } from "lucide-react"

import { connectToDatabase } from "@/lib/db"
import { Activity } from "@/lib/models/Activity"

type ActivityEntry = {
  _id: string
  action: "created" | "status_changed"
  issueId: string
  issueTitle: string
  project: string
  fromStatus?: string | null
  toStatus?: string | null
  timestamp: Date
  actor: string
}

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
})

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = (day + 6) % 7
  start.setDate(start.getDate() - diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function formatDayLabel(dateKey: string, todayKey: string, yesterdayKey: string) {
  if (dateKey === todayKey) return "Today"
  if (dateKey === yesterdayKey) return "Yesterday"
  return dayFormatter.format(new Date(`${dateKey}T00:00:00`))
}

function groupByDate(entries: ActivityEntry[]) {
  const groups = new Map<string, ActivityEntry[]>()
  for (const entry of entries) {
    const key = toDateKey(new Date(entry.timestamp))
    const existing = groups.get(key) ?? []
    existing.push(entry)
    groups.set(key, existing)
  }

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => ({
      key,
      items: items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    }))
}

function buildSummary(entries: ActivityEntry[]) {
  const weekStart = startOfWeek(new Date())
  let created = 0
  let completed = 0

  for (const entry of entries) {
    const timestamp = new Date(entry.timestamp)
    if (timestamp < weekStart) continue
    if (entry.action === "created") created += 1
    if (entry.action === "status_changed" && entry.toStatus === "Done") completed += 1
  }

  return { created, completed }
}

function buildEntryText(entry: ActivityEntry) {
  if (entry.action === "created") {
    return `Issue ${entry.issueTitle} created in ${entry.project}`
  }
  if (entry.toStatus) {
    return `Issue ${entry.issueTitle} moved to ${entry.toStatus} in ${entry.project}`
  }
  return `Issue ${entry.issueTitle} updated in ${entry.project}`
}

function getIcon(entry: ActivityEntry) {
  if (entry.action === "created") {
    return <PlusCircle className="size-5 text-emerald-400" />
  }
  if (entry.toStatus === "Done") {
    return <CheckCircle2 className="size-5 text-emerald-400" />
  }
  return <CircleDotDashed className="size-5 text-sky-400" />
}

export default async function ActivityPage() {
  await connectToDatabase()
  const entries = (await Activity.find({})
    .sort({ timestamp: -1 })
    .limit(200)
    .lean()) as unknown as ActivityEntry[]

  const grouped = groupByDate(entries)
  const todayKey = toDateKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toDateKey(yesterday)
  const summary = buildSummary(entries)

  return (
    <div className="flex flex-col gap-10">
      <nav className="flex items-center justify-between text-sm text-muted-foreground">
        <Link href="/" className="inline-flex items-center gap-2 transition hover:text-foreground">
          {"<-"} Dashboard
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
          Activity
        </span>
      </nav>

      <section className="rounded-2xl border border-border/60 bg-black/40 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Activity feed
            </h1>
            <p className="text-sm text-muted-foreground">
              Daily rollups of issue creation and status changes across projects.
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                This week
              </span>
              <span className="text-2xl font-semibold text-foreground">
                {summary.completed}
              </span>
              <span className="text-xs text-muted-foreground">Issues completed</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                This week
              </span>
              <span className="text-2xl font-semibold text-foreground">{summary.created}</span>
              <span className="text-xs text-muted-foreground">Issues created</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-black/40 p-6 text-sm text-muted-foreground">
            No activity yet. Create or move issues on the Kanban board to populate this feed.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {formatDayLabel(group.key, todayKey, yesterdayKey)}
              </h2>
              <div className="space-y-3">
                {group.items.map((entry) => (
                  <div
                    key={entry._id}
                    className="flex items-start justify-between gap-6 rounded-2xl border border-border/50 bg-black/40 p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getIcon(entry)}</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {buildEntryText(entry)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">by {entry.actor}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
