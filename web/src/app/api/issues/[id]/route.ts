import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Issue } from "@/lib/models/Issue"
import { Activity } from "@/lib/models/Activity"

const STATUS_MAP: Record<string, string> = {
  backlog: "Backlog",
  "in progress": "In Progress",
  "in-progress": "In Progress",
  review: "Review",
  done: "Done",
}

function normalizeStatus(status: string): string {
  return STATUS_MAP[status.toLowerCase()] ?? status
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  const payload = await request.json()
  const actor = payload.actor ?? "System"
  if (payload.actor) delete payload.actor

  const existing = await Issue.findById(id)
  if (!existing) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 })
  }

  if (payload.status) {
    payload.status = normalizeStatus(payload.status)
  }

  const issue = await Issue.findByIdAndUpdate(id, payload, { new: true })
  const fromStatus = existing.status
  const toStatus = issue?.status ?? existing.status
  const statusChanged = payload.status && fromStatus !== toStatus

  if (issue && statusChanged) {
    await Activity.create({
      action: "status_changed",
      issueId: issue._id,
      issueTitle: issue.title,
      project: issue.project,
      fromStatus,
      toStatus,
      timestamp: new Date(),
      actor,
    })
  }
  return NextResponse.json(issue)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  await Issue.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
