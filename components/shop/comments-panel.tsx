'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommentThread, type CommentData } from './comment-thread'
import { CommentForm } from './comment-form'
import { Spinner } from '@/components/ui/spinner'

interface CommentsPanelProps {
  projectId: string
  entityType: string
  entityId: string
  selectedText?: string
  onClearSelection?: () => void
}

type FilterType = 'all' | 'open' | 'resolved'

export function CommentsPanel({
  projectId,
  entityType,
  entityId,
  selectedText,
  onClearSelection,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/comments?entityType=${entityType}&entityId=${entityId}&filter=${filter}`
      )
      if (!res.ok) return
      const data = await res.json()
      setComments(data.comments || [])
    } catch {
      // Silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [projectId, entityType, entityId, filter])

  useEffect(() => {
    setIsLoading(true)
    fetchComments()
  }, [fetchComments])

  const handleCreateComment = useCallback(async (
    content: string,
    anchorData?: { selectedText: string }
  ) => {
    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        entityId,
        content,
        anchorData: anchorData || null,
      }),
    })
    if (!res.ok) throw new Error('Failed to post comment')
    onClearSelection?.()
    fetchComments()
  }, [projectId, entityType, entityId, fetchComments, onClearSelection])

  const handleReply = useCallback(async (parentCommentId: string, content: string) => {
    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        entityId,
        content,
        parentCommentId,
      }),
    })
    if (!res.ok) throw new Error('Failed to post reply')
    fetchComments()
  }, [projectId, entityType, entityId, fetchComments])

  const handleResolveToggle = useCallback(async (commentId: string) => {
    const res = await fetch(`/api/projects/${projectId}/comments/${commentId}/resolve`, {
      method: 'POST',
    })
    if (!res.ok) return
    fetchComments()
  }, [projectId, fetchComments])

  const handleDelete = useCallback(async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    const res = await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
      method: 'DELETE',
    })
    if (!res.ok) return
    fetchComments()
  }, [projectId, fetchComments])

  const openCount = comments.filter((c) => !c.is_resolved).length
  const resolvedCount = comments.filter((c) => c.is_resolved).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-accent-cyan" />
        <span className="text-sm font-medium text-text-primary">Comments</span>
        <span className="text-xs text-text-tertiary">({comments.length})</span>
      </div>

      {/* Filters */}
      <div className="px-3 py-1.5 border-b border-border-default flex items-center gap-1">
        {(['all', 'open', 'resolved'] as FilterType[]).map((f) => {
          const count = f === 'all' ? comments.length : f === 'open' ? openCount : resolvedCount
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                filter === f
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Resolved'} ({count})
            </button>
          )
        })}
      </div>

      {/* Comment form */}
      <div className="px-3 py-2 border-b border-border-default">
        <CommentForm
          selectedText={selectedText}
          onSubmit={handleCreateComment}
          onCancel={selectedText ? onClearSelection : undefined}
        />
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-50" />
            <p className="text-xs text-text-tertiary">
              {filter === 'all' ? 'No comments yet' : `No ${filter} comments`}
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              projectId={projectId}
              onResolveToggle={handleResolveToggle}
              onDelete={handleDelete}
              onReply={handleReply}
            />
          ))
        )}
      </div>
    </div>
  )
}
