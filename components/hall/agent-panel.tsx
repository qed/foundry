'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, X, Sparkles } from 'lucide-react'
import { AgentMessage } from './agent-message'
import { AgentInput } from './agent-input'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface AgentPanelProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function AgentPanel({ projectId, isOpen, onClose }: AgentPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load conversation history
  useEffect(() => {
    if (!isOpen || historyLoaded) return

    async function load() {
      try {
        const res = await fetch(`/api/agent/hall?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages)
          }
        }
      } catch {
        // Silently ignore — empty chat is fine
      }
      setHistoryLoaded(true)
    }

    load()
  }, [isOpen, projectId, historyLoaded])

  // Save conversation after changes
  const saveMessages = useCallback(
    async (msgs: Message[]) => {
      try {
        await fetch('/api/agent/hall', {
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

  async function handleSend(content: string) {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsStreaming(true)

    // Create placeholder for assistant message
    const assistantId = crypto.randomUUID()
    let assistantContent = ''

    try {
      const res = await fetch('/api/agent/hall/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: content,
          conversationHistory: messages,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to get response' }))
        throw new Error(data.error || 'Failed to get response')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      // Add the assistant message shell
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

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-screen z-40 flex flex-col bg-bg-secondary border-l border-border-default shadow-xl transition-transform duration-300',
        'w-full sm:w-96',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent-purple" />
          <h2 className="text-sm font-semibold text-text-primary">Hall Agent</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
          aria-label="Close agent"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Sparkles className="w-8 h-8 text-accent-purple/50 mb-3" />
            <p className="text-sm text-text-secondary mb-1">Hall Agent</p>
            <p className="text-xs text-text-tertiary">
              Ask me about your ideas — I can find connections, suggest tags, spot duplicates, and help refine your thinking.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <AgentMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}

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
      <AgentInput onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}
