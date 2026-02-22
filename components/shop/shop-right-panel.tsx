'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, User, Send, Sparkles } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { ProposedTreeReview, type ProposedTreeStructure } from './proposed-tree-review'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ShopRightPanelProps {
  open: boolean
  projectId: string
  selectedNodeId: string | null
  onTreeInserted?: () => void
}

/**
 * Try to extract a generate_tree JSON from an assistant message.
 * Returns the parsed tree structure or null.
 */
function extractTreeFromMessage(content: string): ProposedTreeStructure | null {
  // Look for ```json ... ``` block containing generate_tree action
  const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/)
  if (!jsonBlockMatch) return null

  try {
    const parsed = JSON.parse(jsonBlockMatch[1].trim())
    if (parsed?.action === 'generate_tree' && parsed?.tree?.nodes) {
      return parsed.tree as ProposedTreeStructure
    }
  } catch {
    // Not valid JSON — show as plain text
  }
  return null
}

export function ShopRightPanel({ open, projectId, selectedNodeId, onTreeInserted }: ShopRightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  // Track which message IDs have had their tree cancelled/inserted (so we don't re-show review)
  const [dismissedTreeIds, setDismissedTreeIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
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
        const res = await fetch(`/api/agent/shop?projectId=${projectId}`)
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

  // Save conversation
  const saveMessages = useCallback(
    async (msgs: Message[]) => {
      try {
        await fetch('/api/agent/shop', {
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

  async function handleSend() {
    const content = input.trim()
    if (!content || isStreaming) return

    setInput('')

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsStreaming(true)

    const assistantId = crypto.randomUUID()
    let assistantContent = ''

    try {
      const res = await fetch('/api/agent/shop/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: content,
          conversationHistory: messages,
          selectedNodeId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to get response' }))
        throw new Error(data.error || 'Failed to get response')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      // Add assistant message shell
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        },
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

      // Save after streaming completes
      const finalMessages = [
        ...updatedMessages,
        {
          id: assistantId,
          role: 'assistant' as const,
          content: assistantContent,
          timestamp: new Date().toISOString(),
        },
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

  function handleTreeInserted(messageId: string) {
    setDismissedTreeIds((prev) => new Set(prev).add(messageId))

    // Add a success follow-up message
    const successMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Feature tree created! You can now edit individual nodes and their requirements in the left panel.',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => {
      const updated = [...prev, successMsg]
      saveMessages(updated)
      return updated
    })

    onTreeInserted?.()
  }

  function handleTreeCancel(messageId: string) {
    setDismissedTreeIds((prev) => new Set(prev).add(messageId))

    const cancelMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Generation cancelled. You can create nodes manually or ask me to try again.',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => {
      const updated = [...prev, cancelMsg]
      saveMessages(updated)
      return updated
    })
  }

  /** Render a single message. If it's an assistant tree response, show the review UI. */
  function renderMessage(msg: Message) {
    const isUser = msg.role === 'user'

    // Check if this assistant message contains a tree
    if (!isUser && !isStreaming) {
      const tree = extractTreeFromMessage(msg.content)
      if (tree && !dismissedTreeIds.has(msg.id)) {
        return (
          <div key={msg.id} className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-accent-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <ProposedTreeReview
                tree={tree}
                projectId={projectId}
                onInserted={() => handleTreeInserted(msg.id)}
                onCancel={() => handleTreeCancel(msg.id)}
              />
              <p className="text-[10px] text-text-tertiary mt-1">{timeAgo(msg.timestamp)}</p>
            </div>
          </div>
        )
      }

      // If tree was already dismissed, show a brief summary instead of raw JSON
      if (tree && dismissedTreeIds.has(msg.id)) {
        return (
          <div key={msg.id} className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-accent-purple" />
            </div>
            <div
              className="max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed bg-bg-tertiary text-text-primary rounded-bl-sm"
            >
              <p className="text-xs text-text-tertiary italic">
                Generated feature tree ({tree.summary || `${tree.nodes.length} epics`})
              </p>
              <p className="text-[10px] text-text-tertiary mt-1">{timeAgo(msg.timestamp)}</p>
            </div>
          </div>
        )
      }
    }

    // Regular message rendering
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
  }

  return (
    <div
      className={cn(
        'flex-shrink-0 border-l border-border-default bg-bg-secondary overflow-hidden transition-all duration-200 ease-in-out',
        open ? 'w-[360px]' : 'w-0'
      )}
    >
      <div className="w-[360px] h-full flex flex-col">
        {/* Header */}
        <div className="h-12 flex items-center gap-2 px-4 border-b border-border-default flex-shrink-0">
          <Bot className="w-4 h-4 text-accent-purple" />
          <span className="text-sm font-medium text-text-primary">
            Pattern Shop Agent
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Sparkles className="w-8 h-8 text-accent-purple/50 mb-3" />
              <p className="text-sm text-text-secondary mb-1">Pattern Shop Agent</p>
              <p className="text-xs text-text-tertiary">
                Ask me to generate feature trees, review requirements, or identify
                gaps in your product spec.
              </p>
            </div>
          )}

          {messages.map((msg) => renderMessage(msg))}

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
            placeholder="Ask the agent..."
            disabled={isStreaming}
            rows={1}
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
