import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Project } from "@/lib/models/Project"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  const payload = await request.json()
  const project = await Project.findByIdAndUpdate(id, payload, { new: true })
  return NextResponse.json(project)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  await Project.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
