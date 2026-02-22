'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface AgentInputProps {
  onSend: (content: string) => void
  disabled: boolean
}

export function AgentInput({ onSend, disabled }: AgentInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-border-default flex gap-2 items-end"
    >
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask the Hall Agent..."
        disabled={disabled}
        rows={1}
        className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent resize-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="p-2 bg-accent-cyan text-bg-primary rounded-lg hover:bg-accent-cyan/90 disabled:opacity-30 transition-colors flex-shrink-0"
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  )
}
