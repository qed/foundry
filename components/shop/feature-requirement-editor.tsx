'use client'

import { useEffect, useState, useCallback } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { RequirementsEditor } from './requirements-editor'

interface RequirementsDocument {
  id: string
  project_id: string
  feature_node_id: string | null
  doc_type: string
  title: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

interface FeatureRequirementEditorProps {
  projectId: string
  featureNodeId: string
}

export function FeatureRequirementEditor({
  projectId,
  featureNodeId,
}: FeatureRequirementEditorProps) {
  const [doc, setDoc] = useState<RequirementsDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        setDoc(null)

        // Try to find existing FRD
        const listRes = await fetch(
          `/api/projects/${projectId}/requirements-documents?featureNodeId=${featureNodeId}&docType=feature_requirement`
        )
        if (!listRes.ok) throw new Error('Failed to fetch')
        const listData = await listRes.json()

        if (listData.documents && listData.documents.length > 0) {
          if (!cancelled) setDoc(listData.documents[0])
          return
        }

        // Auto-create FRD
        const createRes = await fetch(
          `/api/projects/${projectId}/requirements-documents`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ featureNodeId }),
          }
        )

        if (createRes.status === 409) {
          // Already exists (race condition) — re-fetch
          const retryRes = await fetch(
            `/api/projects/${projectId}/requirements-documents?featureNodeId=${featureNodeId}&docType=feature_requirement`
          )
          if (retryRes.ok) {
            const retryData = await retryRes.json()
            if (!cancelled && retryData.documents?.length > 0) {
              setDoc(retryData.documents[0])
            }
          }
          return
        }

        if (!createRes.ok) throw new Error('Failed to create FRD')

        const created = await createRes.json()
        if (!cancelled) setDoc(created)
      } catch (err) {
        console.error('Error loading FRD:', err)
        if (!cancelled) setError('Failed to load requirements document')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [projectId, featureNodeId])

  const handleSave = useCallback(async (html: string) => {
    if (!doc) return
    const res = await fetch(
      `/api/projects/${projectId}/requirements-documents/${doc.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html }),
      }
    )
    if (!res.ok) throw new Error('Save failed')
  }, [projectId, doc])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-w-0">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex-1 flex items-center justify-center min-w-0 p-6">
        <div className="text-center">
          <p className="text-accent-error text-sm font-medium mb-4">
            {error || 'Failed to load document'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent-cyan text-bg-primary rounded-lg text-sm font-medium hover:bg-accent-cyan/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <RequirementsEditor
      key={doc.id}
      content={doc.content || ''}
      onSave={handleSave}
    />
  )
}
