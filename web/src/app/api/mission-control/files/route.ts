import { NextResponse } from "next/server"
import {
  agentFileAllowlist,
  agentFileDescriptions,
  getAgentFilePath,
} from "@/lib/mission-control"

export async function GET() {
  const files = agentFileAllowlist.map((name) => ({
    name,
    path: getAgentFilePath(name),
    description: agentFileDescriptions[name],
  }))

  return NextResponse.json(files)
}
