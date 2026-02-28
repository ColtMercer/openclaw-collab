"use client"

import dynamic from "next/dynamic"
import type { Dispatch, SetStateAction } from "react"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div data-color-mode="dark">
      <MDEditor value={value} onChange={(next) => onChange(next ?? "")} height={240} />
    </div>
  )
}
