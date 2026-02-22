'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { extractTextFromContent } from '@/lib/blueprints/version-utils'

interface BlueprintVersionViewProps {
  open: boolean
  onClose: () => void
  projectId: string
  blueprintId: string
  versionNumber: number
}

interface VersionDetail {
  version_number: number
  content: unknown
  created_at: string
  change_note: string | null
  trigger_type: string | null
  created_by: { id: string; name: string; avatar_url: string | null }
}

export function BlueprintVersionView({
  open,
  onClose,
  projectId,
  blueprintId,
  versionNumber,
}: BlueprintVersionViewProps) {
  const [version, setVersion] = useState<VersionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/projects/${projectId}/blueprints/${blueprintId}/versions/${versionNumber}`
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load version')
        }
        const data = await res.json()
        setVersion(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load version')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, projectId, blueprintId, versionNumber])

  if (!open) return null

  const plainText = version ? extractTextFromContent(version.content) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[80vw] max-w-3xl max-h-[85vh] bg-bg-secondary border border-border-default rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Version {versionNumber}
            </h3>
            {version && (
              <p className="text-xs text-text-tertiary mt-0.5">
                {timeAgo(version.created_at)} by {version.created_by.name}
                {version.change_note && ` — ${version.change_note}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            aria-label="Close version view"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-text-tertiary text-center py-8">Loading version...</p>
          ) : error ? (
            <p className="text-sm text-accent-error text-center py-8">{error}</p>
          ) : (
            <div className="max-w-3xl mx-auto prose-foundry">
              <pre className="whitespace-pre-wrap text-sm text-text-primary leading-relaxed font-sans">
                {plainText || 'Empty content'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
