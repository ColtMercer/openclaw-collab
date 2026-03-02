import { NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import path from "path"
import type { SkillItem } from "@/types"

const BUILTIN_SKILLS_DIR = "/opt/homebrew/lib/node_modules/openclaw/skills"
const USER_SKILLS_DIR = "/Users/colt/.openclaw/workspace/skills"

function parseFrontmatter(frontmatter: string, fallbackName: string) {
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const descriptionMatch = frontmatter.match(/^description:\s*(.+)$/m)
  const emojiMatch = frontmatter.match(/"emoji":\s*"(.+?)"/)

  return {
    name: (nameMatch?.[1] ?? fallbackName).trim(),
    description: (descriptionMatch?.[1] ?? "").trim(),
    emoji: (emojiMatch?.[1] ?? "").trim(),
  }
}

async function readSkillsFromDirectory(
  directory: string,
  source: SkillItem["source"]
): Promise<SkillItem[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    const skills = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const skillDir = path.join(directory, entry.name)
          const skillPath = path.join(skillDir, "SKILL.md")
          try {
            const raw = await readFile(skillPath, "utf-8")
            const parts = raw.split("---")
            const frontmatter = parts[1] ?? ""
            const parsed = parseFrontmatter(frontmatter, entry.name)
            if (!parsed.name) return null
            return {
              name: parsed.name,
              description: parsed.description,
              emoji: parsed.emoji,
              source,
              skillPath,
            }
          } catch {
            return null
          }
        })
    )

    return skills.filter((skill): skill is SkillItem => Boolean(skill))
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err?.code === "ENOENT") {
      return []
    }
    throw error
  }
}

export async function GET() {
  try {
    const [builtinSkills, userSkills] = await Promise.all([
      readSkillsFromDirectory(BUILTIN_SKILLS_DIR, "builtin"),
      readSkillsFromDirectory(USER_SKILLS_DIR, "user"),
    ])

    const byName = new Map<string, SkillItem>()
    for (const skill of builtinSkills) {
      byName.set(skill.name.toLowerCase(), skill)
    }
    for (const skill of userSkills) {
      byName.set(skill.name.toLowerCase(), skill)
    }

    const skills = Array.from(byName.values()).sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === "user" ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json(skills)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load skills."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
