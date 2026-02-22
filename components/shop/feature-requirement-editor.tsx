'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Save, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestContentRef = useRef('')

  // Fetch or auto-create FRD
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
          if (!cancelled) {
            const found = listData.documents[0]
            setDoc(found)
            latestContentRef.current = found.content || ''
          }
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
              const found = retryData.documents[0]
              setDoc(found)
              latestContentRef.current = found.content || ''
            }
          }
          return
        }

        if (!createRes.ok) throw new Error('Failed to create FRD')

        const created = await createRes.json()
        if (!cancelled) {
          setDoc(created)
          latestContentRef.current = created.content || ''
        }
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

  // Save function
  const save = useCallback(async (html: string) => {
    if (!doc) return
    setSaveStatus('saving')
    try {
      const res = await fetch(
        `/api/projects/${projectId}/requirements-documents/${doc.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: html }),
        }
      )
      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Error saving FRD:', err)
      setSaveStatus('idle')
    }
  }, [projectId, doc])

  // Handle input with debounced auto-save
  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    latestContentRef.current = html

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      save(latestContentRef.current)
    }, 2000)
  }, [save])

  // Cleanup timer on unmount
  useEffect(() => {
    const timer = saveTimerRef.current
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Word count
  const wordCount = doc?.content
    ? doc.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
    : 0

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
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
        <span className="text-sm font-medium text-text-primary truncate">
          {doc.title}
        </span>
        <div className="flex-1" />

        {/* Save status */}
        <div className="flex items-center gap-1.5">
          {saveStatus === 'saving' && (
            <>
              <Save className="w-3.5 h-3.5 text-text-tertiary animate-pulse" />
              <span className="text-xs text-text-tertiary">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
              <span className="text-xs text-accent-success">Saved</span>
            </>
          )}
        </div>

        <span className="text-xs text-text-tertiary">{wordCount} words</span>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          ref={editorRef}
          className={cn(
            'max-w-3xl mx-auto prose-foundry',
            'outline-none min-h-[400px]'
          )}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: doc.content }}
        />
      </div>
    </div>
  )
}
