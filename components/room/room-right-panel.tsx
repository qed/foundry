'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, User, Send, Sparkles } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface RoomRightPanelProps {
  open: boolean
  projectId: string
  selectedBlueprintId: string | null
}

const EXAMPLE_PROMPTS = [
  'Generate a blueprint draft',
  'Review this blueprint',
  'Help with outline structure',
  'Suggest API endpoints',
]

export function RoomRightPanel({ open, projectId, selectedBlueprintId }: RoomRightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  // Load conversation history
  useEffect(() => {
    if (!open || historyLoaded) return

    async function load() {
      try {
        const res = await fetch(`/api/agent/room?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages)
          }
        }
      } catch {
        // Empty chat is fine
      }
      setHistoryLoaded(true)
    }

    load()
  }, [open, projectId, historyLoaded])

  const saveMessages = useCallback(
    async (msgs: Message[]) => {
      try {
        await fetch('/api/agent/room', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, messages: msgs }),
        })
      } catch {
        // Ignore save errors
      }
    },
    [projectId]
  )

  async function handleSend(content?: string) {
    const text = (content || input).trim()
    if (!text || isStreaming) return

    setInput('')

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsStreaming(true)

    const assistantId = crypto.randomUUID()
    let assistantContent = ''

    try {
      const res = await fetch('/api/agent/room/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: text,
          conversationHistory: messages,
          currentBlueprintId: selectedBlueprintId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to get response' }))
        throw new Error(data.error || 'Failed to get response')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        assistantContent += chunk

        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.id === assistantId) {
            updated[updated.length - 1] = { ...last, content: assistantContent }
          }
          return updated
        })
      }

      const finalMessages = [
        ...updatedMessages,
        { id: assistantId, role: 'assistant' as const, content: assistantContent, timestamp: new Date().toISOString() },
      ]
      setMessages(finalMessages)
      saveMessages(finalMessages)
    } catch (err) {
      const errorMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      }
      const finalMessages = [...updatedMessages, errorMsg]
      setMessages(finalMessages)
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className={cn(
        'flex-shrink-0 border-l border-border-default bg-bg-secondary overflow-hidden transition-all duration-200 ease-in-out',
        open ? 'w-[300px]' : 'w-0'
      )}
    >
      <div className="w-[300px] h-full flex flex-col">
        {/* Header */}
        <div className="h-12 flex items-center gap-2 px-4 border-b border-border-default flex-shrink-0">
          <Bot className="w-4 h-4 text-accent-purple" />
          <span className="text-sm font-medium text-text-primary">
            Control Room Agent
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Sparkles className="w-8 h-8 text-accent-purple/50 mb-3" />
              <p className="text-sm text-text-secondary mb-1">Control Room Agent</p>
              <p className="text-xs text-text-tertiary mb-4">
                Ask me to generate blueprints, review architecture, or help with technical outlines.
              </p>
              <div className="space-y-1.5 w-full">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left text-xs text-text-secondary hover:text-accent-cyan px-3 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === 'user'
            return (
              <div key={msg.id} className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-accent-purple" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed',
                    isUser
                      ? 'bg-accent-cyan/15 text-text-primary rounded-br-sm'
                      : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={cn(
                      'text-[10px] mt-1',
                      isUser ? 'text-accent-cyan/50' : 'text-text-tertiary'
                    )}
                  >
                    {timeAgo(msg.timestamp)}
                  </p>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-accent-cyan" />
                  </div>
                )}
              </div>
            )
          })}

          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-accent-purple" />
              </div>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
          className="p-3 border-t border-border-default flex gap-2 items-end"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about blueprints, architecture..."
            disabled={isStreaming}
            rows={1}
            aria-label="Message to Control Room Agent"
            className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="p-2 bg-accent-cyan text-bg-primary rounded-lg hover:bg-accent-cyan/90 disabled:opacity-30 transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
