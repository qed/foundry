'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { RequirementsEditor } from './requirements-editor'
import { ExportDocumentDialog } from './export-document-dialog'
import { VersionHistoryPanel } from './version-history-panel'
import { VersionViewModal } from './version-view-modal'
import { VersionCompareModal } from './version-compare-modal'
import { RestoreVersionDialog } from './restore-version-dialog'
import { CommentsPanel } from './comments-panel'

interface VersionInfo {
  version_number: number
  content: string
  created_by: { name: string }
  created_at: string
  change_summary: string | null
}

interface ProductOverviewEditorProps {
  projectId: string
}

export function ProductOverviewEditor({ projectId }: ProductOverviewEditorProps) {
  const [content, setContent] = useState('')
  const [docId, setDocId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)

  // Versioning state
  const [versionRefreshKey, setVersionRefreshKey] = useState(0)
  const [viewVersion, setViewVersion] = useState<VersionInfo | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<VersionInfo | null>(null)
  const [compareFrom, setCompareFrom] = useState(0)
  const [compareTo, setCompareTo] = useState(0)
  const [showCompare, setShowCompare] = useState(false)
  const [editorKey, setEditorKey] = useState(0)

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

  // Auto-version on significant content save
  const handleContentSaved = useCallback(async (html: string, previousHtml: string) => {
    if (!docId) return
    try {
      await fetch(
        `/api/projects/${projectId}/requirements-documents/${docId}/versions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: html, previousContent: previousHtml }),
        }
      )
      setVersionRefreshKey((k) => k + 1)
    } catch {
      // Silently ignore version creation errors
    }
  }, [projectId, docId])

  const handleCompare = useCallback((from: number, to: number) => {
    setCompareFrom(from)
    setCompareTo(to)
    setShowCompare(true)
  }, [])

  const handleRestoreComplete = useCallback((restoredContent: string) => {
    setContent(restoredContent)
    setEditorKey((k) => k + 1)
    setVersionRefreshKey((k) => k + 1)
  }, [])

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

  const versionPanel = (
    <>
      <VersionHistoryPanel
        projectId={projectId}
        docId={docId}
        onView={setViewVersion}
        onRestore={setRestoreVersion}
        onCompare={handleCompare}
        refreshKey={versionRefreshKey}
      />
      <VersionViewModal
        open={!!viewVersion}
        onOpenChange={(open) => { if (!open) setViewVersion(null) }}
        version={viewVersion}
      />
      <RestoreVersionDialog
        open={!!restoreVersion}
        onOpenChange={(open) => { if (!open) setRestoreVersion(null) }}
        projectId={projectId}
        docId={docId}
        version={restoreVersion}
        onRestoreComplete={handleRestoreComplete}
      />
      <VersionCompareModal
        open={showCompare}
        onOpenChange={setShowCompare}
        projectId={projectId}
        docId={docId}
        fromVersion={compareFrom}
        toVersion={compareTo}
      />
    </>
  )

  return (
    <RequirementsEditor
      key={`${docId}-${editorKey}`}
      content={content}
      onSave={handleSave}
      toolbarExtra={toolbarExtra}
      versionPanel={versionPanel}
      onContentSaved={handleContentSaved}
      commentsPanel={({ selectedText, onClearSelection }) => (
        <CommentsPanel
          projectId={projectId}
          entityType="requirement_doc"
          entityId={docId}
          selectedText={selectedText}
          onClearSelection={onClearSelection}
        />
      )}
    />
  )
}
