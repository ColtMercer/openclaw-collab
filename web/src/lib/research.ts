import os from "os"
import path from "path"
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises"

export type ResearchFileMeta = {
  slug: string
  filename: string
  title: string
  excerpt: string
  createdAt: string
  modifiedAt: string
  size: number
  wordCount: number
}

export type ResearchFileDetail = ResearchFileMeta & {
  content: string
}

export function getResearchDirectory() {
  return path.join(os.homedir(), ".openclaw", "workspace", "research")
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function getTitleFromContent(content: string, filename: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || filename.replace(/\.md$/i, "")
}

function getExcerptFromContent(content: string) {
  const withoutHeading = content.replace(/^#\s+.+$/m, "")
  const excerpt = normalizeWhitespace(withoutHeading).slice(0, 200)
  return excerpt
}

function getWordCount(content: string) {
  const trimmed = normalizeWhitespace(content)
  return trimmed ? trimmed.split(" ").length : 0
}

export function getResearchFilePath(filename: string) {
  return path.join(getResearchDirectory(), filename)
}

export function slugToFilename(slug: string) {
  return `${slug}.md`
}

export function isValidResearchFilename(filename: string) {
  return /^[a-zA-Z0-9._-]+\.md$/.test(filename)
}

export async function ensureResearchDirectory() {
  await mkdir(getResearchDirectory(), { recursive: true })
}

export async function listResearchFiles(): Promise<ResearchFileMeta[]> {
  await ensureResearchDirectory()
  const entries = await readdir(getResearchDirectory(), { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))

  const researchFiles = await Promise.all(
    files.map(async (entry) => {
      const filePath = getResearchFilePath(entry.name)
      const [content, stats] = await Promise.all([
        readFile(filePath, "utf-8"),
        stat(filePath),
      ])

      return {
        slug: entry.name.replace(/\.md$/i, ""),
        filename: entry.name,
        title: getTitleFromContent(content, entry.name),
        excerpt: getExcerptFromContent(content),
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        size: stats.size,
        wordCount: getWordCount(content),
      }
    })
  )

  return researchFiles.sort((left, right) =>
    right.modifiedAt.localeCompare(left.modifiedAt)
  )
}

export async function readResearchFile(slug: string): Promise<ResearchFileDetail> {
  const filename = slugToFilename(slug)
  const filePath = getResearchFilePath(filename)
  const [content, stats] = await Promise.all([
    readFile(filePath, "utf-8"),
    stat(filePath),
  ])

  return {
    slug,
    filename,
    title: getTitleFromContent(content, filename),
    excerpt: getExcerptFromContent(content),
    createdAt: stats.birthtime.toISOString(),
    modifiedAt: stats.mtime.toISOString(),
    size: stats.size,
    wordCount: getWordCount(content),
    content,
  }
}

export async function createResearchFile(filename: string, content: string) {
  await ensureResearchDirectory()
  await writeFile(getResearchFilePath(filename), content, {
    encoding: "utf-8",
    flag: "wx",
  })

  return readResearchFile(filename.replace(/\.md$/i, ""))
}

export async function deleteResearchFile(slug: string) {
  await unlink(getResearchFilePath(slugToFilename(slug)))
}
