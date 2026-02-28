import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Comment } from "@/lib/models/Comment"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  const payload = await request.json()
  const comment = await Comment.findByIdAndUpdate(id, payload, { new: true })
  return NextResponse.json(comment)
}
