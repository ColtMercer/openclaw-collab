import { NextResponse } from "next/server"
import { readFile, stat, writeFile } from "fs/promises"
import { getAgentFilePath, isAgentFileName } from "@/lib/mission-control"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  if (!isAgentFileName(name)) {
    return NextResponse.json(
      { error: "File not allowed." },
      { status: 400 }
    )
  }

  try {
    const filePath = getAgentFilePath(name)
    const [content, stats] = await Promise.all([
      readFile(filePath, "utf-8"),
      stat(filePath),
    ])

    return NextResponse.json({
      name,
      content,
      updatedAt: stats.mtime.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load file."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  if (!isAgentFileName(name)) {
    return NextResponse.json(
      { error: "File not allowed." },
      { status: 400 }
    )
  }

  try {
    const payload = await request.json()
    if (typeof payload?.content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string." },
        { status: 400 }
      )
    }

    const filePath = getAgentFilePath(name)
    await writeFile(filePath, payload.content, "utf-8")
    const stats = await stat(filePath)

    return NextResponse.json({
      ok: true,
      updatedAt: stats.mtime.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save file."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
