'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { RequirementsEditor } from './requirements-editor'
import { ExportDocumentDialog } from './export-document-dialog'

interface ProductOverviewEditorProps {
  projectId: string
}

export function ProductOverviewEditor({ projectId }: ProductOverviewEditorProps) {
  const [content, setContent] = useState('')
  const [docId, setDocId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch(`/api/projects/${projectId}/product-overview`)
        if (!res.ok) throw new Error('Failed to load product overview')
        const data = await res.json()
        if (!cancelled) {
          setContent(data.content || '')
          setDocId(data.id)
        }
      } catch (err) {
        console.error('Error loading product overview:', err)
        if (!cancelled) setError('Failed to load product overview')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [projectId])

  const handleSave = useCallback(async (html: string) => {
    const res = await fetch(`/api/projects/${projectId}/product-overview`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: html }),
    })
    if (!res.ok) throw new Error('Save failed')
  }, [projectId])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-w-0">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !docId) {
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

  const toolbarExtra = (
    <>
      <button
        onClick={() => setShowExport(true)}
        title="Export Document"
        className="p-1.5 rounded transition-colors text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
      >
        <Download className="w-4 h-4" />
      </button>
      <ExportDocumentDialog
        open={showExport}
        onOpenChange={setShowExport}
        projectId={projectId}
        documentId={docId}
        documentTitle="Product Overview"
      />
    </>
  )

  return (
    <RequirementsEditor
      key={docId}
      content={content}
      onSave={handleSave}
      toolbarExtra={toolbarExtra}
    />
  )
}
