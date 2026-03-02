import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { ChatMessage } from "@/lib/models/ChatMessage"

export async function POST(request: Request) {
  await connectToDatabase()
  const payload = await request.json()

  // Save user message
  await ChatMessage.create({
    role: "user",
    content: payload.content,
    context: payload.context,
  })

  // Echo response (placeholder — will be replaced with OpenClaw gateway)
  const reply = await ChatMessage.create({
    role: "assistant",
    content: `Echo: ${payload.content}`,
    context: payload.context,
  })

  return NextResponse.json(reply, { status: 201 })
}
