import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"

const cronJobsPath = "/Users/colt/.openclaw/cron/jobs.json"

type CronSchedule = {
  expr?: string
  everyMs?: number
  kind?: string
  tz?: string
}

type CronPayload = {
  text?: string
  message?: string
  [key: string]: unknown
}

type CronJob = {
  id: string
  name?: string
  enabled?: boolean
  schedule?: CronSchedule
  payload?: CronPayload
  updatedAtMs?: number
  [key: string]: unknown
}

type CronFile = {
  version?: number
  jobs: CronJob[]
}

type PatchPayload = {
  enabled?: boolean
  schedule?: {
    expr?: string
  }
  payload?: {
    text?: string
    message?: string
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const patch = (await request.json()) as PatchPayload
    const raw = await readFile(cronJobsPath, "utf-8")
    const data = JSON.parse(raw) as CronFile

    const jobIndex = data.jobs.findIndex((job) => job.id === id)
    if (jobIndex === -1) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 })
    }

    const job = data.jobs[jobIndex]
    if (typeof patch.enabled === "boolean") {
      job.enabled = patch.enabled
    }

    if (typeof patch.schedule?.expr === "string") {
      job.schedule = { ...job.schedule, expr: patch.schedule.expr }
    }

    if (typeof patch.payload?.text === "string") {
      job.payload = { ...job.payload, text: patch.payload.text }
    }

    if (typeof patch.payload?.message === "string") {
      job.payload = { ...job.payload, message: patch.payload.message }
    }

    job.updatedAtMs = Date.now()
    data.jobs[jobIndex] = job

    await writeFile(cronJobsPath, `${JSON.stringify(data, null, 2)}\n`, "utf-8")

    return NextResponse.json(job)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update cron job."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
