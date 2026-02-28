import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { Issue } from "@/lib/models/Issue"

export async function POST(request: Request) {
  await connectToDatabase()
  const payload = await request.json()

  const updates: Array<{
    id: string
    project: string
    status: string
    order: number
  }> = payload?.updates ?? []

  if (updates.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const bulk = updates.map((update) => ({
    updateOne: {
      filter: { _id: update.id },
      update: {
        project: update.project,
        status: update.status,
        order: update.order,
      },
    },
  }))

  await Issue.bulkWrite(bulk)
  return NextResponse.json({ ok: true })
}
