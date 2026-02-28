import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Article } from "@/lib/models/Article"

export async function GET(request: Request) {
  await connectToDatabase()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const project = searchParams.get("project")

  const query: Record<string, string> = {}
  if (status) query.status = status
  if (project) query.project = project

  const articles = await Article.find(query).sort({ updatedAt: -1 })
  return NextResponse.json(articles)
}

export async function POST(request: Request) {
  await connectToDatabase()
  const payload = await request.json()

  const article = await Article.create({
    title: payload.title,
    content: payload.content,
    project: payload.project,
    status: payload.status ?? "Draft",
  })

  return NextResponse.json(article, { status: 201 })
}
