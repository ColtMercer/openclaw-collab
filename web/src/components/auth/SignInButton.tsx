"use client"

import Image from "next/image"
import { Github } from "lucide-react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function SignInButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => signIn("github")}
      >
        <Github className="size-4" />
        Sign in with GitHub
      </Button>
    )
  }

  const displayName = session.user.name ?? session.user.email ?? "GitHub User"

  return (
    <div className="flex items-center gap-2">
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt={displayName}
          width={28}
          height={28}
          className="rounded-full"
        />
      ) : (
        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="max-w-[140px] truncate text-sm text-foreground">
        {displayName}
      </span>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  )
}
