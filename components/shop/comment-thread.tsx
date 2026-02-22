'use client'

import { useState, useCallback } from 'react'
import { CheckCircle2, Circle, Trash2, Reply, ChevronDown, ChevronRight, MessageSquareQuote } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'

interface CommentAuthor {
  id: string
  name: string
}

export interface CommentData {
  id: string
  content: string
  author: CommentAuthor
  author_id: string
  anchor_data: { selectedText?: string } | null
  is_resolved: boolean
  created_at: string
  replies: ReplyData[]
}

export interface ReplyData {
  id: string
  content: string
  author: CommentAuthor
  author_id: string
  created_at: string
}

interface CommentThreadProps {
  comment: CommentData
  projectId: string
  onResolveToggle: (commentId: string) => void
  onDelete: (commentId: string) => void
  onReply: (commentId: string, content: string) => Promise<void>
}

export function CommentThread({
  comment,
  projectId: _projectId,
  onResolveToggle,
  onDelete,
  onReply,
}: CommentThreadProps) {
  const { user } = useAuth()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(true)

  const isAuthor = user?.id === comment.author_id
  const selectedText = comment.anchor_data?.selectedText

  const handleReply = useCallback(async () => {
    if (!replyContent.trim()) return
    setIsReplying(true)
    try {
      await onReply(comment.id, replyContent.trim())
      setReplyContent('')
      setShowReplyForm(false)
    } finally {
      setIsReplying(false)
    }
  }, [comment.id, replyContent, onReply])

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        comment.is_resolved
          ? 'border-border-default/50 bg-bg-primary/50 opacity-70'
          : 'border-border-default bg-bg-secondary'
      )}
    >
      {/* Comment header */}
      <div className="px-3 pt-2.5 pb-1 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-accent-purple">
              {comment.author.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-text-primary truncate block">
              {comment.author.name}
            </span>
            <span className="text-[10px] text-text-tertiary">{timeAgo(comment.created_at)}</span>
          </div>
        </div>
        <button
          onClick={() => onResolveToggle(comment.id)}
          title={comment.is_resolved ? 'Re-open' : 'Resolve'}
          className={cn(
            'p-1 rounded transition-colors flex-shrink-0',
            comment.is_resolved
              ? 'text-accent-success hover:text-accent-success/80'
              : 'text-text-tertiary hover:text-accent-success'
          )}
        >
          {comment.is_resolved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Quoted text */}
      {selectedText && (
        <div className="mx-3 mb-1 flex items-start gap-1.5 px-2 py-1 rounded bg-accent-cyan/5 border-l-2 border-accent-cyan/40">
          <MessageSquareQuote className="w-3 h-3 text-accent-cyan/60 flex-shrink-0 mt-0.5" />
          <span className="text-[11px] text-text-secondary italic line-clamp-2">
            {selectedText}
          </span>
        </div>
      )}

      {/* Comment content */}
      <div className="px-3 pb-2">
        <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{comment.content}</p>
      </div>

      {/* Actions */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <Reply className="w-3 h-3" />
          Reply
        </button>
        {isAuthor && (
          <button
            onClick={() => onDelete(comment.id)}
            className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent-error transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        )}
        {comment.replies.length > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors ml-auto"
          >
            {showReplies ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Replies */}
      {showReplies && comment.replies.length > 0 && (
        <div className="mx-3 mb-2 pl-3 border-l-2 border-border-default space-y-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="py-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-4 h-4 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-semibold text-accent-cyan">
                    {reply.author.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-text-primary">{reply.author.name}</span>
                <span className="text-[10px] text-text-tertiary">{timeAgo(reply.created_at)}</span>
              </div>
              <p className="text-xs text-text-secondary whitespace-pre-wrap break-words pl-5.5">
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {showReplyForm && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-tertiary">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            className="w-full px-2 py-1.5 text-xs bg-bg-primary border border-border-default rounded text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-accent-cyan/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply()
            }}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-text-tertiary">Ctrl+Enter to send</span>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowReplyForm(false); setReplyContent('') }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReply}
                isLoading={isReplying}
                disabled={!replyContent.trim()}
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
