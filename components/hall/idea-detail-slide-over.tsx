'use client'

import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { IdeaDetailHeader } from './idea-detail-header'
import { IdeaDetailBody } from './idea-detail-body'
import { IdeaDetailTags } from './idea-detail-tags'
import { RelatedIdeasSection } from './related-ideas-section'
import { IdeaInfoPanel } from './idea-info-panel'
import { IdeaActionButtons } from './idea-action-buttons'
import type { IdeaWithDetails } from './types'

interface IdeaDetailSlideOverProps {
  ideaId: string | null
  isOpen: boolean
  onClose: () => void
  onTagClick?: (tagId: string) => void
}

export function IdeaDetailSlideOver({
  ideaId,
  isOpen,
  onClose,
  onTagClick,
}: IdeaDetailSlideOverProps) {
  const [idea, setIdea] = useState<IdeaWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Fetch idea detail
  const fetchIdea = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/hall/ideas/${id}`)
      if (!res.ok) throw new Error('Failed to load idea details')
      const data = await res.json()
      setIdea(data)
    } catch (err) {
      console.error('Error fetching idea:', err)
      setError('Failed to load idea details')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch when ideaId changes and panel is open
  useEffect(() => {
    if (isOpen && ideaId) {
      fetchIdea(ideaId)
    }
    if (!isOpen) {
      // Reset after close animation
      const timer = setTimeout(() => {
        setIdea(null)
        setError(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, ideaId, fetchIdea])

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle animation
  useEffect(() => {
    if (isOpen) {
      // Trigger animation on next frame
      requestAnimationFrame(() => setIsAnimating(true))
    } else {
      setIsAnimating(false)
    }
  }, [isOpen])

  // Navigate to a connected idea
  const handleConnectedIdeaClick = useCallback((connectedIdeaId: string) => {
    fetchIdea(connectedIdeaId)
  }, [fetchIdea])

  // Handle tag click — close slide-over and filter hall by tag
  const handleTagClick = useCallback((tagId: string) => {
    onClose()
    onTagClick?.(tagId)
  }, [onClose, onTagClick])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-40 transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-50 w-full sm:w-[500px] lg:w-[600px]',
          'bg-bg-secondary border-l border-border-default shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-out',
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-detail-title"
      >
        {/* Header bar with title + close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0">
          <h2
            id="idea-detail-title"
            className="text-lg font-bold text-text-primary truncate pr-4"
          >
            {idea?.title || 'Idea Detail'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary hover:text-text-primary shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-accent-error text-sm font-medium mb-4">{error}</p>
              <button
                onClick={() => ideaId && fetchIdea(ideaId)}
                className="px-4 py-2 bg-accent-cyan text-bg-primary rounded-lg text-sm font-medium hover:bg-accent-cyan/80 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {idea && !isLoading && (
          <>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header — status, creator, timestamp */}
                <IdeaDetailHeader idea={idea} />

                {/* Full body */}
                {idea.body && <IdeaDetailBody body={idea.body} />}

                {/* Tags */}
                <IdeaDetailTags tags={idea.tags} onTagClick={handleTagClick} />

                {/* Related ideas */}
                <RelatedIdeasSection
                  ideaId={idea.id}
                  onIdeaClick={handleConnectedIdeaClick}
                />

                {/* Info panel */}
                <IdeaInfoPanel idea={idea} />
              </div>
            </div>

            {/* Action buttons */}
            <IdeaActionButtons idea={idea} />
          </>
        )}
      </div>
    </>
  )
}
