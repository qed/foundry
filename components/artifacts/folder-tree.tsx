'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ArtifactFolder } from '@/types/database'

interface TreeNode extends ArtifactFolder {
  children: TreeNode[]
}

interface FolderTreeProps {
  projectId: string
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null, folderName?: string) => void
}

function buildTree(folders: ArtifactFolder[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] })
  }

  for (const f of folders) {
    const node = map.get(f.id)!
    if (f.parent_folder_id && map.has(f.parent_folder_id)) {
      map.get(f.parent_folder_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export function FolderTree({ projectId, selectedFolderId, onFolderSelect }: FolderTreeProps) {
  const [folders, setFolders] = useState<ArtifactFolder[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/artifacts/folders?all=true`)
        if (res.ok) {
          const data = await res.json()
          setFolders(data.folders || [])
        }
      } catch {
        // Silently ignore
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId])

  // Auto-expand ancestors of selected folder
  useEffect(() => {
    if (!selectedFolderId) return
    const parentMap = new Map<string, string | null>()
    for (const f of folders) {
      parentMap.set(f.id, f.parent_folder_id)
    }

    const toExpand = new Set<string>()
    let current = parentMap.get(selectedFolderId) ?? null
    while (current) {
      toExpand.add(current)
      current = parentMap.get(current) ?? null
    }

    if (toExpand.size > 0) {
      setExpanded((prev) => {
        const next = new Set(prev)
        for (const id of toExpand) next.add(id)
        return next
      })
    }
  }, [selectedFolderId, folders])

  const toggleExpand = useCallback((folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const tree = buildTree(folders)

  function renderNode(node: TreeNode, depth: number) {
    const isExpanded = expanded.has(node.id)
    const isSelected = selectedFolderId === node.id
    const hasChildren = node.children.length > 0

    return (
      <div key={node.id}>
        <div
          onClick={() => onFolderSelect(node.id, node.name)}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
            isSelected
              ? 'bg-accent-cyan/10 text-accent-cyan font-medium'
              : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand toggle */}
          {hasChildren ? (
            <button
              onClick={(e) => toggleExpand(node.id, e)}
              className="p-0.5 hover:bg-bg-tertiary rounded shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Folder icon */}
          {isExpanded && hasChildren ? (
            <FolderOpen className="w-3.5 h-3.5 text-accent-warning shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-accent-warning shrink-0" />
          )}

          {/* Name */}
          <span className="truncate">{node.name}</span>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border-default">
        <h3 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
          Folders
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 px-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
          </div>
        ) : (
          <>
            {/* Root / All artifacts */}
            <div
              onClick={() => onFolderSelect(null)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                selectedFolderId === null
                  ? 'bg-accent-cyan/10 text-accent-cyan font-medium'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              )}
            >
              <Folder className="w-3.5 h-3.5 text-accent-warning shrink-0" />
              <span>All Artifacts</span>
            </div>

            {/* Tree */}
            {tree.map((node) => renderNode(node, 0))}

            {tree.length === 0 && (
              <p className="text-[10px] text-text-tertiary text-center py-3">
                No folders yet
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
