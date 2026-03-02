"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types"

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const GATEWAY_URL = "ws://localhost:4210"

export function ChatPanel() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const [gatewayStatus, setGatewayStatus] = React.useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const wsRef = React.useRef<WebSocket | null>(null)
  const gatewayEnabled =
    process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY === "true"

  React.useEffect(() => {
    let isMounted = true
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) setMessages(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (isMounted) toast.error("Unable to load chat history.")
      })
    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping, open])

  React.useEffect(() => {
    if (!gatewayEnabled) return
    setGatewayStatus("connecting")
    const ws = new WebSocket(GATEWAY_URL)
    wsRef.current = ws

    ws.onopen = () => setGatewayStatus("connected")
    ws.onclose = () => setGatewayStatus("disconnected")
    ws.onerror = () => setGatewayStatus("disconnected")
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.content) {
          setMessages((prev) => [
            ...prev,
            {
              _id: payload._id || uid(),
              role: payload.role || "assistant",
              content: payload.content,
              context: payload.context || { path: pathname },
              createdAt: payload.createdAt || new Date().toISOString(),
            },
          ])
        }
      } catch {
        // ignore malformed gateway payloads
      }
    }

    return () => {
      ws.close()
    }
  }, [gatewayEnabled, pathname])

  const sendViaGateway = (content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ content, context: { path: pathname } })
      )
      return true
    }
    return false
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const content = input
    setInput("")

    const userMsg: ChatMessage = {
      _id: uid(),
      role: "user",
      content,
      context: { path: pathname },
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      if (gatewayEnabled && sendViaGateway(content)) {
        setIsTyping(false)
        return
      }

      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, context: { path: pathname } }),
      })

      if (!res.ok) {
        throw new Error("Failed to send")
      }

      const reply = await res.json()
      setMessages((prev) => [
        ...prev,
        {
          _id: reply._id || uid(),
          role: "assistant",
          content: reply.content,
          context: reply.context,
          createdAt: reply.createdAt || new Date().toISOString(),
        },
      ])
    } catch {
      toast.error("Failed to reach the agent.")
      setMessages((prev) => [
        ...prev,
        {
          _id: uid(),
          role: "assistant",
          content: "Failed to reach the agent. Try again.",
          context: { path: pathname },
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const clearChat = async () => {
    try {
      await fetch("/api/chat", { method: "DELETE" })
      setMessages([])
      toast.success("Chat cleared.")
    } catch {
      toast.error("Unable to clear chat history.")
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary">Chat Agent</Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Opus
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-xs",
                  gatewayEnabled
                    ? gatewayStatus === "connected"
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-amber-500/20 text-amber-200"
                    : "bg-slate-500/20 text-slate-200"
                )}
              >
                {gatewayEnabled
                  ? gatewayStatus === "connected"
                    ? "gateway online"
                    : "gateway connecting"
                  : "rest mode"}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 rounded-2xl border border-border/60 bg-muted/20 p-3">
          <div className="space-y-4">
            {messages.map((message) => {
              const isUser = message.role === "user"
              return (
                <div
                  key={message._id}
                  className={cn(
                    "flex items-start gap-2",
                    isUser ? "justify-end" : "justify-start"
                  )}
                >
                  {!isUser && (
                    <div className="flex size-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                      O
                    </div>
                  )}
                  <div className={cn("max-w-[75%]", isUser && "text-right")}>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {isUser ? "You" : "Opus"}
                    </p>
                    <div
                      className={cn(
                        "mt-1 rounded-2xl px-3 py-2 text-sm shadow-sm",
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      <p>{message.content}</p>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isUser && (
                    <div className="flex size-8 items-center justify-center rounded-full bg-slate-500/30 text-xs font-semibold text-slate-100">
                      Y
                    </div>
                  )}
                </div>
              )
            })}
            {isTyping && (
              <div className="text-xs text-muted-foreground">Opus is thinking...</div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ask Opus..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void sendMessage()
              }
            }}
          />
          <Button onClick={() => void sendMessage()} disabled={!input.trim()}>
            Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Context: {pathname}</p>
      </SheetContent>
    </Sheet>
  )
}
