import path from "path"

export const agentFileAllowlist = [
  "AGENTS.md",
  "MEMORY.md",
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "HEARTBEAT.md",
] as const

export type AgentFileName = (typeof agentFileAllowlist)[number]

export const agentFileDescriptions: Record<AgentFileName, string> = {
  "AGENTS.md": "Local agent instructions and operating rules.",
  "MEMORY.md": "Long-term memory and context shared across sessions.",
  "SOUL.md": "Values, tone, and guiding principles.",
  "IDENTITY.md": "Identity and role definition for the system.",
  "USER.md": "User profile, preferences, and constraints.",
  "TOOLS.md": "Tooling inventory and usage notes.",
  "HEARTBEAT.md": "Heartbeat status and check-in details.",
}

export const agentWorkspaceRoot = "/Users/colt/.openclaw/workspace"

export function isAgentFileName(name: string): name is AgentFileName {
  return (agentFileAllowlist as readonly string[]).includes(name)
}

export function getAgentFilePath(name: AgentFileName) {
  return path.join(agentWorkspaceRoot, name)
}
