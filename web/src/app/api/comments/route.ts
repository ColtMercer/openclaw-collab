import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Comment } from "@/lib/models/Comment"

export async function GET(request: Request) {
  await connectToDatabase()
  const { searchParams } = new URL(request.url)
  const articleId = searchParams.get("articleId")

  const query: Record<string, string> = {}
  if (articleId) query.articleId = articleId

  const comments = await Comment.find(query).sort({ createdAt: 1 })
  return NextResponse.json(comments)
}

export async function POST(request: Request) {
  await connectToDatabase()
  const payload = await request.json()

  const comment = await Comment.create({
    articleId: payload.articleId,
    paragraphIndex: payload.paragraphIndex,
    content: payload.content,
    resolved: false,
  })

  return NextResponse.json(comment, { status: 201 })
}
