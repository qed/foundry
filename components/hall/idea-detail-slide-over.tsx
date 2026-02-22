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
import { IdeaEditForm } from './idea-edit-form'
import { PromotionWizard } from './promotion-wizard'
import type { IdeaWithDetails } from './types'

interface IdeaDetailSlideOverProps {
  ideaId: string | null
  isOpen: boolean
  onClose: () => void
  onTagClick?: (tagId: string) => void
  projectId: string
  orgSlug: string
  onIdeaUpdated?: (updatedIdea: IdeaWithDetails) => void
  onIdeaArchived?: (ideaId: string) => Promise<void>
}

export function IdeaDetailSlideOver({
  ideaId,
  isOpen,
  onClose,
  onTagClick,
  projectId,
  orgSlug,
  onIdeaUpdated,
  onIdeaArchived,
}: IdeaDetailSlideOverProps) {
  const [idea, setIdea] = useState<IdeaWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showPromotionWizard, setShowPromotionWizard] = useState(false)

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
      setIsEditing(false) // Reset edit mode when opening a new idea
    }
    if (!isOpen) {
      // Reset after close animation
      const timer = setTimeout(() => {
        setIdea(null)
        setError(null)
        setIsEditing(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, ideaId, fetchIdea])

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isEditing) {
          // Let the edit form handle Escape via its own cancel logic
          return
        }
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isEditing])

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
      requestAnimationFrame(() => setIsAnimating(true))
    } else {
      setIsAnimating(false)
    }
  }, [isOpen])

  // Navigate to a connected idea
  const handleConnectedIdeaClick = useCallback((connectedIdeaId: string) => {
    setIsEditing(false) // Exit edit mode when navigating
    fetchIdea(connectedIdeaId)
  }, [fetchIdea])

  // Handle tag click — close slide-over and filter hall by tag
  const handleTagClick = useCallback((tagId: string) => {
    onClose()
    onTagClick?.(tagId)
  }, [onClose, onTagClick])

  // Handle edit save
  const handleSaved = useCallback((updatedIdea: IdeaWithDetails) => {
    setIdea(updatedIdea)
    onIdeaUpdated?.(updatedIdea)
  }, [onIdeaUpdated])

  // Handle archive
  const handleArchive = useCallback(async () => {
    if (!idea || !onIdeaArchived) return
    await onIdeaArchived(idea.id)
    onClose()
  }, [idea, onIdeaArchived, onClose])

  // Handle promotion success — refetch to get updated status
  const handlePromoted = useCallback(
    (_seedId: string) => {
      if (ideaId) fetchIdea(ideaId)
    },
    [ideaId, fetchIdea]
  )

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-40 transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={isEditing ? undefined : onClose}
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
            {isEditing ? 'Edit Idea' : (idea?.title || 'Idea Detail')}
          </h2>
          <button
            onClick={isEditing ? () => setIsEditing(false) : onClose}
            className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary hover:text-text-primary shrink-0"
            aria-label={isEditing ? 'Exit edit mode' : 'Close'}
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
            {isEditing ? (
              /* Edit mode */
              <div className="flex-1 overflow-y-auto">
                <IdeaEditForm
                  idea={idea}
                  projectId={projectId}
                  onCancel={() => setIsEditing(false)}
                  onSaved={handleSaved}
                />
              </div>
            ) : (
              <>
                {/* Read-only view */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-6">
                    <IdeaDetailHeader idea={idea} />
                    {idea.body && <IdeaDetailBody body={idea.body} />}
                    <IdeaDetailTags tags={idea.tags} onTagClick={handleTagClick} />
                    <RelatedIdeasSection
                      ideaId={idea.id}
                      onIdeaClick={handleConnectedIdeaClick}
                    />
                    <IdeaInfoPanel idea={idea} />
                  </div>
                </div>

                {/* Action buttons */}
                <IdeaActionButtons
                  idea={idea}
                  isEditing={isEditing}
                  onEdit={() => setIsEditing(true)}
                  onArchive={handleArchive}
                  onPromote={() => setShowPromotionWizard(true)}
                  orgSlug={orgSlug}
                  projectId={projectId}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Promotion Wizard */}
      {idea && (
        <PromotionWizard
          idea={idea}
          isOpen={showPromotionWizard}
          onClose={() => setShowPromotionWizard(false)}
          onPromoted={handlePromoted}
          orgSlug={orgSlug}
          projectId={projectId}
        />
      )}
    </>
  )
}
