import { NextResponse } from "next/server"
import { readFile } from "fs/promises"

const cronJobsPath = "/Users/colt/.openclaw/cron/jobs.json"

type CronFile = {
  jobs: unknown[]
}

export async function GET() {
  try {
    const raw = await readFile(cronJobsPath, "utf-8")
    const data = JSON.parse(raw) as CronFile
    return NextResponse.json(data.jobs ?? [])
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cron jobs."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
