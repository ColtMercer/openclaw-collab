import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Issue } from "@/lib/models/Issue"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  const payload = await request.json()
  const issue = await Issue.findByIdAndUpdate(id, payload, { new: true })
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
