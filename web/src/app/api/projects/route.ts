import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Project } from "@/lib/models/Project"
import { DEFAULT_PROJECTS } from "@/lib/constants"

export async function GET() {
  await connectToDatabase()
  const count = await Project.countDocuments()

  if (count === 0) {
    await Project.insertMany(DEFAULT_PROJECTS)
  }

  const projects = await Project.find().sort({ createdAt: 1 })
  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  await connectToDatabase()
  const payload = await request.json()

  const project = await Project.create({
    name: payload.name,
    slug: payload.slug,
  })

  return NextResponse.json(project, { status: 201 })
}
