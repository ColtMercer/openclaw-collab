"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { SkillItem } from "@/types"
import { toast } from "sonner"

type AgentFileMeta = {
  name: string
  path: string
  description: string
}

type AgentFile = {
  name: string
  content: string
  updatedAt: string
}

type CronSchedule = {
  kind?: string
  expr?: string
  everyMs?: number
  tz?: string
}

type CronState = {
  lastRunAtMs?: number
  lastDurationMs?: number
  lastStatus?: string
}

type CronPayload = {
  text?: string
  message?: string
}

type CronJob = {
  id: string
  name?: string
  enabled?: boolean
  schedule?: CronSchedule
  payload?: CronPayload
  state?: CronState
}

function formatRelativeTime(timestampMs?: number) {
  if (!timestampMs) return "—"
  const diffMs = Date.now() - timestampMs
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  const formatter = (value: number, unit: string) =>
    `${value}${unit}${diffMs >= 0 ? " ago" : ""}`

  if (absMs < minute) {
    const seconds = Math.max(1, Math.round(absMs / 1000))
    return formatter(seconds, "s")
  }
  if (absMs < hour) {
    const minutes = Math.round(absMs / minute)
    return formatter(minutes, "m")
  }
  if (absMs < day) {
    const hours = Math.round(absMs / hour)
    return formatter(hours, "h")
  }
  if (absMs < 7 * day) {
    const days = Math.round(absMs / day)
    return formatter(days, "d")
  }

  return new Date(timestampMs).toLocaleDateString()
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined || durationMs === null) return "—"
  const seconds = Math.max(0, Math.round(durationMs / 1000))
  return `${seconds}s`
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatHour(hour: number, minute: number) {
  const h = hour % 12 || 12
  const m = String(minute).padStart(2, "0")
  const ampm = hour < 12 ? "AM" : "PM"
  return `${h}:${m} ${ampm}`
}

function parseCronExpr(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return expr

  const [minPart, hourPart, domPart, monPart, dowPart] = parts

  const everyMin = minPart.startsWith("*/")
  const everyHour = hourPart.startsWith("*/")

  // Every N minutes (e.g. */15 * * * *)
  if (everyMin && hourPart === "*" && domPart === "*" && monPart === "*" && dowPart === "*") {
    const n = parseInt(minPart.slice(2), 10)
    return n === 1 ? "Every minute" : `Every ${n} minutes`
  }

  // Every N hours (e.g. 0 */2 * * *)
  if (everyHour && domPart === "*" && monPart === "*" && dowPart === "*") {
    const n = parseInt(hourPart.slice(2), 10)
    const label = n === 1 ? "Every hour" : `Every ${n} hours`
    return minPart === "0" ? label : `${label} at :${minPart.padStart(2, "0")}`
  }

  const min = parseInt(minPart, 10)
  const hour = parseInt(hourPart, 10)
  const timeOk = !isNaN(min) && !isNaN(hour) && minPart === String(min) && hourPart === String(hour)
  const timeStr = timeOk ? formatHour(hour, min) : null

  // Specific day of week (e.g. 0 9 * * 1)
  if (timeOk && domPart === "*" && monPart === "*" && dowPart !== "*") {
    const dow = parseInt(dowPart, 10)
    if (!isNaN(dow) && dow >= 0 && dow <= 6) {
      return `${DAYS[dow]}s at ${timeStr}`
    }
  }

  // Specific day of month every month (e.g. 0 9 15 * *)
  if (timeOk && domPart !== "*" && monPart === "*" && dowPart === "*") {
    const dom = parseInt(domPart, 10)
    if (!isNaN(dom)) {
      const suffix = dom === 1 ? "st" : dom === 2 ? "nd" : dom === 3 ? "rd" : "th"
      return `Monthly on the ${dom}${suffix} at ${timeStr}`
    }
  }

  // Specific month + day (e.g. 0 9 28 8 *)
  if (timeOk && domPart !== "*" && monPart !== "*" && dowPart === "*") {
    const dom = parseInt(domPart, 10)
    const mon = parseInt(monPart, 10)
    if (!isNaN(dom) && !isNaN(mon) && mon >= 1 && mon <= 12) {
      return `${MONTHS[mon - 1]} ${dom} at ${timeStr}`
    }
  }

  // Daily at specific time (e.g. 0 8 * * *)
  if (timeOk && domPart === "*" && monPart === "*" && dowPart === "*") {
    return `Daily at ${timeStr}`
  }

  return expr
}

function formatSchedule(schedule?: CronSchedule) {
  if (!schedule) return "—"
  if (schedule.kind === "every" && schedule.everyMs) {
    const ms = schedule.everyMs
    if (ms < 60_000) return `Every ${Math.round(ms / 1000)}s`
    if (ms < 3_600_000) return `Every ${Math.round(ms / 60_000)}m`
    if (ms < 86_400_000) return `Every ${Math.round(ms / 3_600_000)}h`
    return `Every ${Math.round(ms / 86_400_000)}d`
  }
  if (schedule.expr) {
    return parseCronExpr(schedule.expr)
  }
  return "—"
}

function statusBadge(status?: string) {
  if (status === "ok") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
  }
  if (status === "error") {
    return "border-rose-500/40 bg-rose-500/10 text-rose-200"
  }
  return "border-zinc-500/40 bg-zinc-500/10 text-zinc-200"
}

export default function MissionControlPage() {
  const [files, setFiles] = useState<AgentFileMeta[]>([])
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<AgentFile | null>(null)
  const [draftContent, setDraftContent] = useState("")
  const [filesLoading, setFilesLoading] = useState(true)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileSaving, setFileSaving] = useState(false)

  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [cronLoading, setCronLoading] = useState(true)
  const [expandedCronId, setExpandedCronId] = useState<string | null>(null)
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, string>>(
    {}
  )
  const [cronSaving, setCronSaving] = useState<Record<string, boolean>>({})

  const [skills, setSkills] = useState<SkillItem[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [skillsQuery, setSkillsQuery] = useState("")
  const [skillsReloadToken, setSkillsReloadToken] = useState(0)

  const selectedMeta = useMemo(
    () => files.find((file) => file.name === selectedFileName) ?? null,
    [files, selectedFileName]
  )

  const isDirty =
    selectedFile && draftContent !== selectedFile.content && !fileSaving

  useEffect(() => {
    let active = true

    async function loadFiles() {
      setFilesLoading(true)
      try {
        const response = await fetch("/api/mission-control/files")
        if (!response.ok) {
          throw new Error("Failed to load files.")
        }
        const data = (await response.json()) as AgentFileMeta[]
        if (!active) return
        setFiles(data)
        const memoryFile = data.find((file) => file.name === "MEMORY.md")
        setSelectedFileName(memoryFile?.name ?? data[0]?.name ?? null)
      } catch (error) {
        if (!active) return
        const message =
          error instanceof Error ? error.message : "Failed to load files."
        toast.error(message)
      } finally {
        if (active) setFilesLoading(false)
      }
    }

    void loadFiles()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadSkills() {
      setSkillsLoading(true)
      setSkillsError(null)
      try {
        const response = await fetch("/api/mission-control/skills")
        if (!response.ok) {
          throw new Error("Failed to load skills.")
        }
        const data = (await response.json()) as SkillItem[]
        if (!active) return
        setSkills(data)
      } catch (error) {
        if (!active) return
        const message =
          error instanceof Error ? error.message : "Failed to load skills."
        setSkillsError(message)
        toast.error(message)
      } finally {
        if (active) setSkillsLoading(false)
      }
    }

    void loadSkills()

    return () => {
      active = false
    }
  }, [skillsReloadToken])

  useEffect(() => {
    if (!selectedFileName) return
    let active = true

    async function loadFile() {
      setFileLoading(true)
      try {
        const response = await fetch(
          `/api/mission-control/files/${selectedFileName}`
        )
        if (!response.ok) {
          throw new Error("Failed to load file content.")
        }
        const data = (await response.json()) as AgentFile
        if (!active) return
        setSelectedFile(data)
        setDraftContent(data.content)
      } catch (error) {
        if (!active) return
        const message =
          error instanceof Error ? error.message : "Failed to load file content."
        toast.error(message)
      } finally {
        if (active) setFileLoading(false)
      }
    }

    void loadFile()

    return () => {
      active = false
    }
  }, [selectedFileName])

  useEffect(() => {
    let active = true

    async function loadCrons() {
      setCronLoading(true)
      try {
        const response = await fetch("/api/mission-control/crons")
        if (!response.ok) {
          throw new Error("Failed to load cron jobs.")
        }
        const data = (await response.json()) as CronJob[]
        if (!active) return
        setCronJobs(data)
      } catch (error) {
        if (!active) return
        const message =
          error instanceof Error ? error.message : "Failed to load cron jobs."
        toast.error(message)
      } finally {
        if (active) setCronLoading(false)
      }
    }

    void loadCrons()

    return () => {
      active = false
    }
  }, [])

  const filteredSkills = useMemo(() => {
    const query = skillsQuery.trim().toLowerCase()
    if (!query) return skills
    return skills.filter((skill) => {
      const haystack = `${skill.name} ${skill.description}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [skills, skillsQuery])

  const userSkills = useMemo(
    () => filteredSkills.filter((skill) => skill.source === "user"),
    [filteredSkills]
  )
  const builtinSkills = useMemo(
    () => filteredSkills.filter((skill) => skill.source === "builtin"),
    [filteredSkills]
  )

  async function handleSaveFile() {
    if (!selectedFileName) return
    setFileSaving(true)
    try {
      const response = await fetch(
        `/api/mission-control/files/${selectedFileName}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draftContent }),
        }
      )
      if (!response.ok) {
        throw new Error("Failed to save file.")
      }
      const data = (await response.json()) as { updatedAt: string }
      setSelectedFile((prev) =>
        prev
          ? {
              ...prev,
              content: draftContent,
              updatedAt: data.updatedAt,
            }
          : prev
      )
      toast.success("File saved.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save file."
      toast.error(message)
    } finally {
      setFileSaving(false)
    }
  }

  function handleDiscardChanges() {
    if (!selectedFile) return
    setDraftContent(selectedFile.content)
  }

  async function patchCronJob(id: string, payload: object) {
    setCronSaving((prev) => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/mission-control/crons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error("Failed to update cron job.")
      }
      const updated = (await response.json()) as CronJob
      setCronJobs((prev) =>
        prev.map((job) => (job.id === id ? updated : job))
      )
      toast.success("Cron job updated.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update cron job."
      toast.error(message)
    } finally {
      setCronSaving((prev) => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Mission Control
        </p>
        <h2 className="text-2xl font-semibold">Agent Operations</h2>
        <p className="text-sm text-muted-foreground">
          Review agent context files and manage scheduled automation runs.
        </p>
      </div>

      <Tabs defaultValue="files" className="gap-6">
        <TabsList className="w-fit">
          <TabsTrigger value="files">Agent Files</TabsTrigger>
          <TabsTrigger value="crons">Cron Jobs</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="w-full flex-shrink-0 lg:w-64">
              <div className="rounded-xl border border-border/50 bg-black/30 p-3">
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Files
                </div>
                <div className="flex flex-col gap-2">
                  {filesLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton
                          key={`file-skeleton-${index}`}
                          className="h-9 w-full rounded-lg"
                        />
                      ))
                    : files.map((file) => {
                        const isActive = file.name === selectedFileName
                        return (
                          <button
                            key={file.name}
                            type="button"
                            onClick={() => setSelectedFileName(file.name)}
                            className={cn(
                              "rounded-lg border border-transparent px-3 py-2 text-left text-sm transition",
                              isActive
                                ? "border-primary/50 bg-primary/10 text-foreground"
                                : "border-border/40 bg-transparent text-muted-foreground hover:border-border/80 hover:text-foreground"
                            )}
                          >
                            <div className="font-medium text-foreground">
                              {file.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {file.description}
                            </div>
                          </button>
                        )
                      })}
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-xl border border-border/50 bg-black/20 p-5">
              {fileLoading || !selectedFile ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">
                        {selectedFile.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedMeta?.description ?? ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated {new Date(selectedFile.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={handleDiscardChanges}
                        disabled={!isDirty}
                      >
                        Discard
                      </Button>
                      <Button onClick={handleSaveFile} disabled={!isDirty}>
                        {fileSaving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>

                  <textarea
                    className="min-h-[60vh] w-full resize-y rounded-lg border border-border/50 bg-black/70 px-3 py-2 font-mono text-sm text-foreground focus:border-primary/60 focus:outline-none"
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="crons">
          <div className="rounded-xl border border-border/50 bg-black/20 p-5">
            {cronLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={`cron-skeleton-${index}`} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <tr>
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Schedule</th>
                      <th className="pb-3">Last Run</th>
                      <th className="pb-3">Last Duration</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Enabled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {cronJobs.map((job) => {
                      const isExpanded = expandedCronId === job.id
                      const payloadText =
                        job.payload?.text ?? job.payload?.message ?? ""
                      const scheduleValue =
                        scheduleDrafts[job.id] ?? job.schedule?.expr ?? ""

                      return (
                        <Fragment key={job.id}>
                          <tr
                            className="cursor-pointer transition hover:bg-white/5"
                            onClick={() =>
                              setExpandedCronId((prev) =>
                                prev === job.id ? null : job.id
                              )
                            }
                          >
                            <td className="py-3 pr-4">
                              <div className="font-medium text-foreground">
                                {job.name ?? job.id}
                              </div>
                            </td>
                            <td
                              className="py-3 pr-4 text-muted-foreground"
                              title={job.schedule?.expr ?? undefined}
                            >
                              {formatSchedule(job.schedule)}
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              {formatRelativeTime(job.state?.lastRunAtMs)}
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              {formatDuration(job.state?.lastDurationMs)}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border px-2 py-0.5 text-[11px]",
                                  statusBadge(job.state?.lastStatus)
                                )}
                              >
                                {job.state?.lastStatus ?? "unknown"}
                              </Badge>
                            </td>
                            <td className="py-3 text-right">
                              <input
                                type="checkbox"
                                checked={job.enabled ?? false}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  patchCronJob(job.id, {
                                    enabled: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-primary"
                              />
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-black/40 p-4">
                                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                                  <div>
                                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                      Payload
                                    </div>
                                    <textarea
                                      readOnly
                                      className="min-h-[140px] w-full rounded-lg border border-border/40 bg-black/70 px-3 py-2 font-mono text-xs text-muted-foreground"
                                      value={payloadText}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-3">
                                    <div>
                                      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                        Schedule (cron expr)
                                      </div>
                                      <input
                                        className="w-full rounded-lg border border-border/50 bg-black/70 px-3 py-2 text-sm text-foreground focus:border-primary/60 focus:outline-none"
                                        value={scheduleValue}
                                        onChange={(event) =>
                                          setScheduleDrafts((prev) => ({
                                            ...prev,
                                            [job.id]: event.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                    <Button
                                      onClick={() =>
                                        patchCronJob(job.id, {
                                          schedule: { expr: scheduleValue },
                                        })
                                      }
                                      disabled={cronSaving[job.id]}
                                    >
                                      {cronSaving[job.id]
                                        ? "Saving..."
                                        : "Save Schedule"}
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="skills">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Skills
                </div>
                <div className="text-xs text-muted-foreground">
                  {skills.length} skills installed
                </div>
              </div>
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Search skills..."
                  value={skillsQuery}
                  onChange={(event) => setSkillsQuery(event.target.value)}
                />
              </div>
            </div>

            {skillsLoading ? (
              <div className="rounded-xl border border-border/50 bg-black/20 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton
                      key={`skill-skeleton-${index}`}
                      className="h-20 w-full rounded-lg"
                    />
                  ))}
                </div>
              </div>
            ) : skillsError ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-black/20 p-5">
                <div className="text-sm text-rose-200">
                  {skillsError}
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setSkillsReloadToken((prev) => prev + 1)}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <details open className="rounded-xl border border-border/50 bg-black/20 p-5">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Installed (User){" "}
                    <span className="text-xs text-muted-foreground">
                      ({userSkills.length})
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {userSkills.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No user-installed skills found.
                      </div>
                    ) : (
                      userSkills.map((skill) => (
                        <div
                          key={`${skill.source}-${skill.name}`}
                          className="flex items-start gap-3 rounded-lg border border-border/50 bg-black/40 p-4"
                        >
                          <div className="text-2xl">
                            {skill.emoji || "🧩"}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-foreground">
                                {skill.name}
                              </div>
                              <Badge
                                variant="outline"
                                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              >
                                User
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {skill.description || "No description provided."}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>

                <details open className="rounded-xl border border-border/50 bg-black/20 p-5">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Built-in{" "}
                    <span className="text-xs text-muted-foreground">
                      ({builtinSkills.length})
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {builtinSkills.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No built-in skills found.
                      </div>
                    ) : (
                      builtinSkills.map((skill) => (
                        <div
                          key={`${skill.source}-${skill.name}`}
                          className="flex items-start gap-3 rounded-lg border border-border/50 bg-black/40 p-4"
                        >
                          <div className="text-2xl">
                            {skill.emoji || "🧩"}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-foreground">
                                {skill.name}
                              </div>
                              <Badge
                                variant="outline"
                                className="border-zinc-500/40 bg-zinc-500/10 text-zinc-200"
                              >
                                Built-in
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {skill.description || "No description provided."}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
