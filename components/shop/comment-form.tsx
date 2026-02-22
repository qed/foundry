'use client'

import { useState, useCallback } from 'react'
import { MessageSquareQuote } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CommentFormProps {
  selectedText?: string
  onSubmit: (content: string, anchorData?: { selectedText: string }) => Promise<void>
  onCancel?: () => void
  placeholder?: string
}

export function CommentForm({
  selectedText,
  onSubmit,
  onCancel,
  placeholder = 'Add a comment...',
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return
    setIsSubmitting(true)
    try {
      const anchorData = selectedText ? { selectedText } : undefined
      await onSubmit(content.trim(), anchorData)
      setContent('')
    } finally {
      setIsSubmitting(false)
    }
  }, [content, selectedText, onSubmit])

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
      {selectedText && (
        <div className="mb-2 flex items-start gap-1.5 px-2 py-1 rounded bg-accent-cyan/5 border-l-2 border-accent-cyan/40">
          <MessageSquareQuote className="w-3 h-3 text-accent-cyan/60 flex-shrink-0 mt-0.5" />
          <span className="text-[11px] text-text-secondary italic line-clamp-2">
            {selectedText}
          </span>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-2 py-1.5 text-sm bg-bg-primary border border-border-default rounded text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-accent-cyan/50"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
        }}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-text-tertiary">Ctrl+Enter to post</span>
        <div className="flex gap-1.5">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!content.trim()}
          >
            Post Comment
          </Button>
        </div>
      </div>
    </div>
  )
}
