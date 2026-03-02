import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { ChatMessage } from "@/lib/models/ChatMessage"

export async function GET() {
  await connectToDatabase()
  const messages = await ChatMessage.find().sort({ createdAt: 1 }).limit(200)
  return NextResponse.json(messages)
}

export async function DELETE() {
  await connectToDatabase()
  await ChatMessage.deleteMany({})
  return NextResponse.json({ ok: true })
}

export async function POST(request: Request) {
  await connectToDatabase()
  const payload = await request.json()

  const message = await ChatMessage.create({
    role: payload.role,
    content: payload.content,
    context: payload.context,
  })

  return NextResponse.json(message, { status: 201 })
}
