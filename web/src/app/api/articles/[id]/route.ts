import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Article } from "@/lib/models/Article"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  const article = await Article.findById(id)
  return NextResponse.json(article)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  const payload = await request.json()
  const article = await Article.findByIdAndUpdate(id, payload, { new: true })
  return NextResponse.json(article)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectToDatabase()
  await Article.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
