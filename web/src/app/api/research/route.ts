import { NextResponse } from "next/server"
import {
  createResearchFile,
  isValidResearchFilename,
  listResearchFiles,
} from "@/lib/research"

export async function GET() {
  try {
    const files = await listResearchFiles()
    return NextResponse.json(files)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load research files."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const filename = typeof payload?.filename === "string" ? payload.filename.trim() : ""
    const content = typeof payload?.content === "string" ? payload.content : ""

    if (!isValidResearchFilename(filename)) {
      return NextResponse.json(
        { error: "Filename must end in .md and contain only letters, numbers, dots, dashes, or underscores." },
        { status: 400 }
      )
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      )
    }

    const file = await createResearchFile(filename, content)
    return NextResponse.json(file, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error && "code" in error && error.code === "EEXIST"
        ? "A research file with that name already exists."
        : error instanceof Error
          ? error.message
          : "Failed to create research file."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
