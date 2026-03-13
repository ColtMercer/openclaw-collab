import { NextResponse } from "next/server"
import { deleteResearchFile, readResearchFile } from "@/lib/research"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const file = await readResearchFile(slug)
    return NextResponse.json(file)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load research file."
    const status = error instanceof Error && "code" in error && error.code === "ENOENT" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    await deleteResearchFile(slug)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete research file."
    const status = error instanceof Error && "code" in error && error.code === "ENOENT" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
