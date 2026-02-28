import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Issue } from "@/lib/models/Issue"
import { Project } from "@/lib/models/Project"

// Normalize status strings to title-case canonical values
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

export async function GET(request: Request) {
  await connectToDatabase()
  const { searchParams } = new URL(request.url)
  const project = searchParams.get("project")
  const status = searchParams.get("status")

  // Build a slug→name lookup from projects collection
  const projects = await Project.find({})
  const slugToName: Record<string, string> = {}
  for (const p of projects) {
    slugToName[p.slug] = p.name
  }

  const query: Record<string, unknown> = {}
  if (project) query.project = project
  if (status) query.status = status

  const issues = await Issue.find(query).sort({ order: 1, createdAt: 1 })

  // Normalize each issue: resolve slug → project name, fix status casing
  const normalized = issues.map((issue) => {
    const doc = issue.toObject()

    // Resolve project field: could be a slug or already a name
    const projectVal = doc.project ?? ""
    if (slugToName[projectVal]) {
      doc.project = slugToName[projectVal]
    }

    // Normalize status casing
    if (doc.status) {
      doc.status = normalizeStatus(doc.status) as typeof doc.status
    }

    return doc
  })

  return NextResponse.json(normalized)
}

export async function POST(request: Request) {
  await connectToDatabase()
  const payload = await request.json()

  const issue = await Issue.create({
    title: payload.title,
    description: payload.description,
    project: payload.project,
    priority: payload.priority,
    status: payload.status ?? "Backlog",
    order: payload.order ?? 0,
  })

  return NextResponse.json(issue, { status: 201 })
}
