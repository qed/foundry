'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Upload } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { RequirementsEditor } from './requirements-editor'
import { ExportDocumentDialog } from './export-document-dialog'
import { ImportDocumentDialog } from './import-document-dialog'
import { VersionHistoryPanel } from './version-history-panel'
import { VersionViewModal } from './version-view-modal'
import { VersionCompareModal } from './version-compare-modal'
import { RestoreVersionDialog } from './restore-version-dialog'
import { CommentsPanel } from './comments-panel'

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

interface VersionInfo {
  version_number: number
  content: string
  created_by: { name: string }
  created_at: string
  change_summary: string | null
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
  const [showExport, setShowExport] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // Versioning state
  const [versionRefreshKey, setVersionRefreshKey] = useState(0)
  const [viewVersion, setViewVersion] = useState<VersionInfo | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<VersionInfo | null>(null)
  const [compareFrom, setCompareFrom] = useState(0)
  const [compareTo, setCompareTo] = useState(0)
  const [showCompare, setShowCompare] = useState(false)
  // Track editor content key for force-remount on restore
  const [editorKey, setEditorKey] = useState(0)

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

  const handleImportSuccess = useCallback(() => {
    window.location.reload()
  }, [])

  // Auto-version on significant content save
  const handleContentSaved = useCallback(async (html: string, previousHtml: string) => {
    if (!doc) return
    try {
      await fetch(
        `/api/projects/${projectId}/requirements-documents/${doc.id}/versions`,
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
  }, [projectId, doc])

  const handleCompare = useCallback((from: number, to: number) => {
    setCompareFrom(from)
    setCompareTo(to)
    setShowCompare(true)
  }, [])

  const handleRestoreComplete = useCallback((restoredContent: string) => {
    if (doc) {
      setDoc({ ...doc, content: restoredContent })
      setEditorKey((k) => k + 1)
      setVersionRefreshKey((k) => k + 1)
    }
  }, [doc])

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

  const toolbarExtra = (
    <>
      <button
        onClick={() => setShowImport(true)}
        title="Import Document"
        className="p-1.5 rounded transition-colors text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
      >
        <Upload className="w-4 h-4" />
      </button>
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
        documentId={doc.id}
        documentTitle={doc.title}
      />
      <ImportDocumentDialog
        open={showImport}
        onOpenChange={setShowImport}
        projectId={projectId}
        featureNodeId={featureNodeId}
        onImportSuccess={handleImportSuccess}
      />
    </>
  )

  const versionPanel = (
    <>
      <VersionHistoryPanel
        projectId={projectId}
        docId={doc.id}
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
        docId={doc.id}
        version={restoreVersion}
        onRestoreComplete={handleRestoreComplete}
      />
      <VersionCompareModal
        open={showCompare}
        onOpenChange={setShowCompare}
        projectId={projectId}
        docId={doc.id}
        fromVersion={compareFrom}
        toVersion={compareTo}
      />
    </>
  )

  return (
    <RequirementsEditor
      key={`${doc.id}-${editorKey}`}
      content={doc.content || ''}
      onSave={handleSave}
      toolbarExtra={toolbarExtra}
      versionPanel={versionPanel}
      onContentSaved={handleContentSaved}
      commentsPanel={({ selectedText, onClearSelection }) => (
        <CommentsPanel
          projectId={projectId}
          entityType="requirement_doc"
          entityId={doc.id}
          selectedText={selectedText}
          onClearSelection={onClearSelection}
        />
      )}
    />
  )
}
