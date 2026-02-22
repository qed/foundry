'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Grid3X3,
  List,
  FolderPlus,
  Upload,
  Folder,
  MoreHorizontal,
  Trash2,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast-container'
import { FileTypeIcon } from './file-type-icon'
import { BreadcrumbNav, type BreadcrumbItem } from './breadcrumb-nav'
import { ArtifactContextMenu } from './artifact-context-menu'
import { FolderContextMenu } from './folder-context-menu'
import { ArtifactPreview } from './artifact-preview'
import { UploadZone } from './upload-zone'
import { formatFileSize } from '@/lib/artifacts/file-types'
import { timeAgo } from '@/lib/utils'
import type { Artifact, ArtifactFolder } from '@/types/database'

type ArtifactWithProfile = Artifact & {
  uploaded_by_profile?: { display_name: string | null; avatar_url: string | null } | null
}

interface ArtifactBrowserProps {
  projectId: string
}

export function ArtifactBrowser({ projectId }: ArtifactBrowserProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: null, name: 'Artifacts' }])

  const [folders, setFolders] = useState<ArtifactFolder[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactWithProfile | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Artifact[] | null>(null)
  const [searchResultCount, setSearchResultCount] = useState(0)

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameType, setRenameType] = useState<'artifact' | 'folder'>('artifact')

  // Move state
  const [movingArtifact, setMovingArtifact] = useState<string | null>(null)
  const [allFolders, setAllFolders] = useState<ArtifactFolder[]>([])

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingType, setDeletingType] = useState<'artifact' | 'folder'>('artifact')

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    artifactId: string
  } | null>(null)

  // Folder context menu
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number
    y: number
    folderId: string
    folderName: string
    depth: number
  } | null>(null)

  const { addToast } = useToast()

  // ── Data fetching ──────────────────────────────────────────
  const fetchContents = useCallback(async () => {
    setIsLoading(true)
    try {
      const folderParam = currentFolderId ? `?parentId=${currentFolderId}` : ''
      const artifactParam = currentFolderId ? `?folderId=${currentFolderId}` : ''

      const [foldersRes, artifactsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/artifacts/folders${folderParam}`),
        fetch(`/api/projects/${projectId}/artifacts${artifactParam}`),
      ])

      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(data.folders || [])
      }
      if (artifactsRes.ok) {
        const data = await artifactsRes.json()
        setArtifacts(data.artifacts || [])
      }
    } catch {
      addToast('Failed to load artifacts', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, currentFolderId, addToast])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  // ── Search (debounced 300ms) ──────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null)
      setSearchResultCount(0)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/artifacts/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            query: searchQuery,
            folder_id: currentFolderId,
            limit: 50,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.artifacts || [])
          setSearchResultCount(data.total_count || 0)
        }
      } catch {
        // Non-blocking
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery, projectId, currentFolderId])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults(null)
    setSearchResultCount(0)
  }, [])

  // ── Navigation ─────────────────────────────────────────────
  const navigateToFolder = useCallback(
    (folderId: string | null, folderName?: string) => {
      setCurrentFolderId(folderId)
      setSelectedArtifact(null)
      setContextMenu(null)

      if (folderId === null) {
        setBreadcrumb([{ id: null, name: 'Artifacts' }])
      } else {
        // Find index in breadcrumb
        const idx = breadcrumb.findIndex((b) => b.id === folderId)
        if (idx >= 0) {
          setBreadcrumb(breadcrumb.slice(0, idx + 1))
        } else {
          setBreadcrumb([...breadcrumb, { id: folderId, name: folderName || 'Folder' }])
        }
      }
    },
    [breadcrumb]
  )

  // ── Preview ────────────────────────────────────────────────
  const openPreview = useCallback(
    async (artifact: Artifact) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/artifacts/${artifact.id}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedArtifact(data)
        } else {
          setSelectedArtifact({ ...artifact, uploaded_by_profile: null })
        }
      } catch {
        setSelectedArtifact({ ...artifact, uploaded_by_profile: null })
      }
    },
    [projectId]
  )

  // ── CRUD Operations ────────────────────────────────────────
  const handleDownload = useCallback(
    async (artifactId: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/artifacts/${artifactId}/download`)
        if (!res.ok) {
          addToast('Failed to download', 'error')
          return
        }
        const { url } = await res.json()
        window.open(url, '_blank')
      } catch {
        addToast('Failed to download', 'error')
      }
    },
    [projectId, addToast]
  )

  const handleRenameStart = useCallback(
    (id: string, currentName: string, type: 'artifact' | 'folder') => {
      setRenamingId(id)
      setRenameValue(currentName)
      setRenameType(type)
    },
    []
  )

  const handleRenameConfirm = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) return

    try {
      if (renameType === 'artifact') {
        const res = await fetch(`/api/projects/${projectId}/artifacts/${renamingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: renameValue.trim() }),
        })
        if (!res.ok) {
          addToast('Failed to rename', 'error')
          return
        }
        setArtifacts((prev) =>
          prev.map((a) => (a.id === renamingId ? { ...a, name: renameValue.trim() } : a))
        )
        if (selectedArtifact?.id === renamingId) {
          setSelectedArtifact((prev) => prev ? { ...prev, name: renameValue.trim() } : prev)
        }
      } else {
        const res = await fetch(`/api/projects/${projectId}/artifacts/folders/${renamingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: renameValue.trim() }),
        })
        if (!res.ok) {
          const data = await res.json()
          addToast(data.error || 'Failed to rename folder', 'error')
          return
        }
        setFolders((prev) =>
          prev.map((f) => (f.id === renamingId ? { ...f, name: renameValue.trim() } : f))
        )
        // Update breadcrumb if this folder is in the path
        setBreadcrumb((prev) =>
          prev.map((b) => (b.id === renamingId ? { ...b, name: renameValue.trim() } : b))
        )
      }
      addToast('Renamed', 'success')
    } catch {
      addToast('Failed to rename', 'error')
    } finally {
      setRenamingId(null)
    }
  }, [renamingId, renameValue, renameType, projectId, addToast, selectedArtifact])

  const handleDelete = useCallback(async () => {
    if (!deletingId) return

    try {
      if (deletingType === 'artifact') {
        const res = await fetch(`/api/projects/${projectId}/artifacts/${deletingId}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          addToast('Failed to delete', 'error')
          return
        }
        setArtifacts((prev) => prev.filter((a) => a.id !== deletingId))
        if (selectedArtifact?.id === deletingId) setSelectedArtifact(null)
      } else {
        const res = await fetch(`/api/projects/${projectId}/artifacts/folders/${deletingId}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          addToast('Failed to delete folder', 'error')
          return
        }
        setFolders((prev) => prev.filter((f) => f.id !== deletingId))
      }
      addToast('Deleted', 'success')
    } catch {
      addToast('Failed to delete', 'error')
    } finally {
      setDeletingId(null)
    }
  }, [deletingId, deletingType, projectId, addToast, selectedArtifact])

  const handleMoveStart = useCallback(
    async (artifactId: string) => {
      setMovingArtifact(artifactId)
      // Fetch all folders for the move dialog
      try {
        const res = await fetch(`/api/projects/${projectId}/artifacts/folders?all=true`)
        if (res.ok) {
          const data = await res.json()
          setAllFolders(data.folders || [])
        }
      } catch {
        // Use current folders as fallback
        setAllFolders(folders)
      }
    },
    [projectId, folders]
  )

  const handleMoveConfirm = useCallback(
    async (targetFolderId: string | null) => {
      if (!movingArtifact) return

      try {
        const res = await fetch(
          `/api/projects/${projectId}/artifacts/${movingArtifact}/move`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_id: targetFolderId }),
          }
        )
        if (!res.ok) {
          addToast('Failed to move artifact', 'error')
          return
        }
        addToast('Moved', 'success')
        setArtifacts((prev) => prev.filter((a) => a.id !== movingArtifact))
        if (selectedArtifact?.id === movingArtifact) setSelectedArtifact(null)
      } catch {
        addToast('Failed to move artifact', 'error')
      } finally {
        setMovingArtifact(null)
      }
    },
    [movingArtifact, projectId, addToast, selectedArtifact]
  )

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return

    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), parentFolderId: currentFolderId }),
      })
      if (!res.ok) {
        addToast('Failed to create folder', 'error')
        return
      }
      const { folder } = await res.json()
      setFolders((prev) => [...prev, folder])
      addToast('Folder created', 'success')
    } catch {
      addToast('Failed to create folder', 'error')
    } finally {
      setShowNewFolder(false)
      setNewFolderName('')
    }
  }, [newFolderName, projectId, currentFolderId, addToast])

  const handleContextMenu = useCallback((e: React.MouseEvent, artifactId: string) => {
    e.preventDefault()
    setFolderContextMenu(null)
    setContextMenu({ x: e.clientX, y: e.clientY, artifactId })
  }, [])

  const handleFolderContextMenu = useCallback(
    (e: React.MouseEvent, folderId: string, folderName: string) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu(null)
      // Calculate depth from breadcrumb (breadcrumb length - 1 gives current depth, +1 for this folder)
      const currentDepth = breadcrumb.length - 1
      setFolderContextMenu({ x: e.clientX, y: e.clientY, folderId, folderName, depth: currentDepth + 1 })
    },
    [breadcrumb]
  )

  const handleCreateSubfolder = useCallback(
    (parentFolderId: string) => {
      // Navigate into the folder first, then show new folder input
      const folder = folders.find((f) => f.id === parentFolderId)
      if (folder) {
        navigateToFolder(folder.id, folder.name)
        // Use a short delay to let navigation complete before showing input
        setTimeout(() => setShowNewFolder(true), 100)
      }
    },
    [folders, navigateToFolder]
  )

  const contextArtifact = contextMenu
    ? (searchResults || artifacts).find((a) => a.id === contextMenu.artifactId)
    : null

  const displayArtifacts = searchResults || artifacts
  const isEmpty = folders.length === 0 && artifacts.length === 0 && !isLoading && !searchResults

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className={cn('flex-1 flex flex-col min-w-0', selectedArtifact && 'hidden sm:flex')}>
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border-default">
          <BreadcrumbNav path={breadcrumb} onNavigate={navigateToFolder} />

          <div className="flex items-center gap-2 shrink-0">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search artifacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 sm:w-48 pl-8 pr-7 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-tertiary hover:text-text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="w-px h-5 bg-border-default" />
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-cyan text-bg-primary rounded-lg hover:bg-accent-cyan/90 transition-colors"
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
            <button
              onClick={() => setShowNewFolder(true)}
              className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              title="New folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border-default" />
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'grid'
                  ? 'text-accent-cyan bg-accent-cyan/10'
                  : 'text-text-tertiary hover:text-text-primary'
              )}
              title="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'list'
                  ? 'text-accent-cyan bg-accent-cyan/10'
                  : 'text-text-tertiary hover:text-text-primary'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upload zone (collapsible) */}
        {showUpload && (
          <div className="px-4 md:px-6 py-3 border-b border-border-default">
            <UploadZone
              projectId={projectId}
              folderId={currentFolderId}
              onUploadComplete={(artifact) => {
                setArtifacts((prev) => [artifact, ...prev])
              }}
              compact
            />
          </div>
        )}

        {/* New folder input */}
        {showNewFolder && (
          <div className="px-4 md:px-6 py-3 border-b border-border-default">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-accent-warning shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') }
                }}
                className="flex-1 px-2 py-1 bg-bg-primary border border-border-default rounded text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                maxLength={255}
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-3 py-1 text-xs font-medium bg-accent-cyan text-bg-primary rounded hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                className="text-xs text-text-tertiary hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Folder className="w-12 h-12 text-text-tertiary mb-4" />
              <p className="text-sm text-text-secondary mb-1">No artifacts yet</p>
              <p className="text-xs text-text-tertiary mb-4">Upload files to get started</p>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-accent-cyan text-bg-primary rounded-lg hover:bg-accent-cyan/90 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Files
              </button>
            </div>
          )}

          {/* Search results info bar */}
          {searchResults !== null && !isSearching && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-secondary">
                {searchResultCount} artifact{searchResultCount !== 1 ? 's' : ''} found
              </p>
              <button
                onClick={clearSearch}
                className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
              >
                Clear search
              </button>
            </div>
          )}

          {isSearching && (
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-3.5 h-3.5 text-text-tertiary animate-spin" />
              <p className="text-xs text-text-tertiary">Searching...</p>
            </div>
          )}

          {searchResults !== null && searchResults.length === 0 && !isSearching && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-text-tertiary mb-3" />
              <p className="text-sm text-text-secondary mb-1">No results found</p>
              <p className="text-xs text-text-tertiary">Try a different search term</p>
            </div>
          )}

          {!isLoading && !isEmpty && (
            <>
              {/* Folders (hidden during search) */}
              {!searchResults && folders.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    Folders
                  </h3>
                  <div
                    className={cn(
                      viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                        : 'space-y-1'
                    )}
                  >
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => {
                          if (renamingId !== folder.id) navigateToFolder(folder.id, folder.name)
                        }}
                        onContextMenu={(e) => handleFolderContextMenu(e, folder.id, folder.name)}
                        className={cn(
                          'text-left transition-colors group relative cursor-pointer',
                          viewMode === 'grid'
                            ? 'p-3 rounded-lg border border-border-default hover:border-accent-warning/30 hover:bg-bg-tertiary/50'
                            : 'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-tertiary/50'
                        )}
                      >
                        <Folder
                          className={cn(
                            'text-accent-warning',
                            viewMode === 'grid' ? 'w-8 h-8 mb-2' : 'w-4 h-4 shrink-0'
                          )}
                        />
                        {renamingId === folder.id && renameType === 'folder' ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameConfirm()
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            onBlur={handleRenameConfirm}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-1 py-0.5 text-xs bg-bg-primary border border-accent-cyan rounded text-text-primary focus:outline-none"
                            maxLength={255}
                          />
                        ) : (
                          <span className="text-xs text-text-primary font-medium truncate block">
                            {folder.name}
                          </span>
                        )}
                        {/* Hover actions */}
                        {renamingId !== folder.id && (
                          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleFolderContextMenu(e, folder.id, folder.name)
                              }}
                              className="p-1 bg-bg-secondary/80 backdrop-blur rounded text-text-tertiary hover:text-text-primary"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artifacts */}
              {displayArtifacts.length > 0 && (
                <div>
                  {!searchResults && folders.length > 0 && (
                    <h3 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                      Files
                    </h3>
                  )}

                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {displayArtifacts.map((artifact) => (
                        <div
                          key={artifact.id}
                          onClick={() => openPreview(artifact)}
                          onContextMenu={(e) => handleContextMenu(e, artifact.id)}
                          className={cn(
                            'p-3 rounded-lg border cursor-pointer transition-all group relative',
                            selectedArtifact?.id === artifact.id
                              ? 'border-accent-cyan bg-accent-cyan/5'
                              : 'border-border-default hover:border-accent-cyan/30 hover:bg-bg-tertiary/50'
                          )}
                        >
                          {renamingId === artifact.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameConfirm()
                                if (e.key === 'Escape') setRenamingId(null)
                              }}
                              onBlur={handleRenameConfirm}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-1 py-0.5 text-xs bg-bg-primary border border-accent-cyan rounded text-text-primary focus:outline-none"
                              maxLength={255}
                            />
                          ) : (
                            <>
                              <div className="flex items-center justify-center py-4">
                                <FileTypeIcon
                                  fileType={artifact.file_type}
                                  className="w-8 h-8"
                                />
                              </div>
                              <p className="text-xs text-text-primary font-medium truncate">
                                {artifact.name}
                              </p>
                              <p className="text-[10px] text-text-tertiary mt-0.5">
                                {formatFileSize(artifact.file_size)}
                              </p>

                              {/* Hover actions */}
                              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleContextMenu(e, artifact.id)
                                  }}
                                  className="p-1 bg-bg-secondary/80 backdrop-blur rounded text-text-tertiary hover:text-text-primary"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-border-default rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-bg-tertiary text-text-tertiary border-b border-border-default">
                            <th className="text-left px-3 py-2 font-medium">Name</th>
                            <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Type</th>
                            <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Size</th>
                            <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Modified</th>
                            <th className="w-10 px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayArtifacts.map((artifact) => (
                            <tr
                              key={artifact.id}
                              onClick={() => openPreview(artifact)}
                              onContextMenu={(e) => handleContextMenu(e, artifact.id)}
                              className={cn(
                                'border-b border-border-default last:border-0 cursor-pointer transition-colors group',
                                selectedArtifact?.id === artifact.id
                                  ? 'bg-accent-cyan/5'
                                  : 'hover:bg-bg-tertiary/50'
                              )}
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <FileTypeIcon fileType={artifact.file_type} className="w-4 h-4 shrink-0" />
                                  {renamingId === artifact.id ? (
                                    <input
                                      autoFocus
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameConfirm()
                                        if (e.key === 'Escape') setRenamingId(null)
                                      }}
                                      onBlur={handleRenameConfirm}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 px-1 py-0.5 bg-bg-primary border border-accent-cyan rounded text-text-primary text-xs focus:outline-none"
                                      maxLength={255}
                                    />
                                  ) : (
                                    <span className="text-text-primary truncate">{artifact.name}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-text-tertiary uppercase hidden sm:table-cell">
                                {artifact.file_type}
                              </td>
                              <td className="px-3 py-2 text-text-tertiary hidden md:table-cell">
                                {formatFileSize(artifact.file_size)}
                              </td>
                              <td className="px-3 py-2 text-text-tertiary hidden lg:table-cell">
                                {timeAgo(artifact.updated_at)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleContextMenu(e, artifact.id)
                                  }}
                                  className="p-1 text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity rounded"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview panel */}
      {selectedArtifact && (
        <div className="w-full sm:w-[350px] lg:w-[400px] shrink-0 border-l border-border-default">
          <ArtifactPreview
            artifact={selectedArtifact}
            projectId={projectId}
            onClose={() => setSelectedArtifact(null)}
            onDelete={(id) => { setDeletingId(id); setDeletingType('artifact') }}
            onRename={(id) => handleRenameStart(id, selectedArtifact.name, 'artifact')}
            onDownload={handleDownload}
          />
        </div>
      )}

      {/* Context menu */}
      {contextMenu && contextArtifact && (
        <ArtifactContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onPreview={() => openPreview(contextArtifact)}
          onRename={() => handleRenameStart(contextArtifact.id, contextArtifact.name, 'artifact')}
          onMove={() => handleMoveStart(contextArtifact.id)}
          onDelete={() => { setDeletingId(contextArtifact.id); setDeletingType('artifact') }}
          onDownload={() => handleDownload(contextArtifact.id)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Folder context menu */}
      {folderContextMenu && (
        <FolderContextMenu
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          depth={folderContextMenu.depth}
          onRename={() => handleRenameStart(folderContextMenu.folderId, folderContextMenu.folderName, 'folder')}
          onDelete={() => { setDeletingId(folderContextMenu.folderId); setDeletingType('folder') }}
          onCreateSubfolder={() => handleCreateSubfolder(folderContextMenu.folderId)}
          onClose={() => setFolderContextMenu(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeletingId(null)} />
          <div className="relative bg-bg-secondary border border-border-default rounded-lg shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-accent-error/10 rounded-full">
                <Trash2 className="w-5 h-5 text-accent-error" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                Delete {deletingType === 'folder' ? 'folder' : 'artifact'}?
              </h3>
            </div>
            <p className="text-xs text-text-secondary mb-6">
              This cannot be undone. The {deletingType === 'folder' ? 'folder and its contents' : 'file'} will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-tertiary rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-medium text-white bg-accent-error hover:bg-accent-error/90 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move dialog */}
      {movingArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMovingArtifact(null)} />
          <div className="relative bg-bg-secondary border border-border-default rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Move to folder</h3>
            <div className="space-y-1 max-h-[300px] overflow-y-auto mb-4">
              <button
                onClick={() => handleMoveConfirm(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <Folder className="w-4 h-4 text-accent-warning" />
                Root (Artifacts)
              </button>
              {allFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMoveConfirm(folder.id)}
                  disabled={folder.id === currentFolderId}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors disabled:opacity-30"
                >
                  <Folder className="w-4 h-4 text-accent-warning" />
                  {folder.name}
                  {folder.id === currentFolderId && (
                    <span className="text-[10px] text-text-tertiary ml-auto">(current)</span>
                  )}
                </button>
              ))}
              {allFolders.length === 0 && (
                <p className="text-xs text-text-tertiary text-center py-4">
                  No other folders available
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setMovingArtifact(null)}
                className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-tertiary rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
