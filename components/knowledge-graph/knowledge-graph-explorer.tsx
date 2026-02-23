'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Search, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownLeft, Trash2, Sparkles, Plus } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-container'
import { ConnectionTypeIcon, CONNECTION_TYPE_CONFIG } from './connection-type-icon'
import { EntityTypeIcon, getEntityTypeLabel } from './entity-type-icon'
import { LinkEntityDialog } from './link-entity-dialog'
import type { EntityConnectionType, GraphEntityType } from '@/types/database'

interface EnrichedConnection {
  connection_id: string
  connection_type: EntityConnectionType
  is_auto_detected: boolean
  created_at: string
  target?: { type: GraphEntityType; id: string; name: string }
  source?: { type: GraphEntityType; id: string; name: string }
}

interface KnowledgeGraphExplorerProps {
  entityType: GraphEntityType
  entityId: string
  entityName?: string
  projectId: string
  isOpen: boolean
  onClose: () => void
  onNavigate?: (entityType: string, entityId: string) => void
  editable?: boolean
}

interface DeleteTarget {
  connectionId: string
  entityName: string
  connectionType: EntityConnectionType
}

const TYPE_ORDER: EntityConnectionType[] = [
  'implements', 'depends_on', 'references', 'relates_to',
  'derived_from', 'conflicts_with', 'complements',
]

function groupByType(connections: EnrichedConnection[]): Map<EntityConnectionType, EnrichedConnection[]> {
  const groups = new Map<EntityConnectionType, EnrichedConnection[]>()
  for (const c of connections) {
    const type = c.connection_type as EntityConnectionType
    const existing = groups.get(type) || []
    existing.push(c)
    groups.set(type, existing)
  }
  // Sort by predefined order
  const sorted = new Map<EntityConnectionType, EnrichedConnection[]>()
  for (const t of TYPE_ORDER) {
    if (groups.has(t)) sorted.set(t, groups.get(t)!)
  }
  return sorted
}

export function KnowledgeGraphExplorer({
  entityType,
  entityId,
  entityName = 'Entity',
  projectId,
  isOpen,
  onClose,
  onNavigate,
  editable = false,
}: KnowledgeGraphExplorerProps) {
  const [outbound, setOutbound] = useState<EnrichedConnection[]>([])
  const [inbound, setInbound] = useState<EnrichedConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { addToast } = useToast()

  const fetchConnections = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/connections?entityType=${entityType}&entityId=${entityId}&mode=explore`
      )
      if (res.ok) {
        const data = await res.json()
        setOutbound(data.outbound || [])
        setInbound(data.inbound || [])
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false)
    }
  }, [projectId, entityType, entityId])

  useEffect(() => {
    if (isOpen) fetchConnections()
  }, [isOpen, fetchConnections])

  const handleRequestDelete = useCallback((connectionId: string, name: string, connType: EntityConnectionType) => {
    setDeleteTarget({ connectionId, entityName: name, connectionType: connType })
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/connections/${deleteTarget.connectionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addToast('Connection removed', 'success')
        fetchConnections()
      }
    } catch {
      addToast('Failed to remove connection', 'error')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, projectId, fetchConnections, addToast])

  const handleLinkCreated = useCallback(() => {
    fetchConnections()
  }, [fetchConnections])

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // Filter by search
  const filteredOutbound = useMemo(() => {
    if (!searchQuery) return outbound
    const q = searchQuery.toLowerCase()
    return outbound.filter(c =>
      c.target?.name.toLowerCase().includes(q) ||
      getEntityTypeLabel(c.target?.type as GraphEntityType).toLowerCase().includes(q)
    )
  }, [outbound, searchQuery])

  const filteredInbound = useMemo(() => {
    if (!searchQuery) return inbound
    const q = searchQuery.toLowerCase()
    return inbound.filter(c =>
      c.source?.name.toLowerCase().includes(q) ||
      getEntityTypeLabel(c.source?.type as GraphEntityType).toLowerCase().includes(q)
    )
  }, [inbound, searchQuery])

  const totalFiltered = filteredOutbound.length + filteredInbound.length
  const totalAll = outbound.length + inbound.length

  const outboundGroups = groupByType(filteredOutbound)
  const inboundGroups = groupByType(filteredInbound)

  if (!isOpen) return null

  return (
    <div className="flex flex-col h-full border-l border-border-default bg-bg-primary w-80 lg:w-96 flex-shrink-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">Knowledge Graph</span>
          <span className="text-xs text-text-tertiary">({totalAll})</span>
        </div>
        <div className="flex items-center gap-1">
          {editable && (
            <button
              onClick={() => setLinkDialogOpen(true)}
              className="p-1 rounded text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
              title="Link entity"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border-default">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-bg-secondary border border-border-default rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan/50"
          />
        </div>
        {searchQuery && (
          <div className="mt-1 text-[10px] text-text-tertiary">
            {totalFiltered} match{totalFiltered !== 1 ? 'es' : ''} found
          </div>
        )}
      </div>

      {/* Connection list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : totalAll === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 text-text-tertiary" />
            </div>
            <p className="text-sm text-text-secondary mb-1">No connections yet</p>
            <p className="text-xs text-text-tertiary mb-3">
              Connections will appear here as entities are linked together.
            </p>
            {editable && (
              <Button variant="secondary" size="sm" onClick={() => setLinkDialogOpen(true)}>
                <Plus className="w-3 h-3 mr-1" />
                Link Entity
              </Button>
            )}
          </div>
        ) : (
          <div className="py-1">
            {/* Outbound */}
            {filteredOutbound.length > 0 && (
              <ConnectionSection
                title="Outbound"
                icon={<ArrowUpRight className="w-3.5 h-3.5 text-accent-cyan" />}
                groups={outboundGroups}
                direction="outbound"
                collapsedGroups={collapsedGroups}
                onToggleGroup={toggleGroup}
                onNavigate={onNavigate}
                onRequestDelete={editable ? handleRequestDelete : undefined}
              />
            )}

            {/* Inbound */}
            {filteredInbound.length > 0 && (
              <ConnectionSection
                title="Inbound"
                icon={<ArrowDownLeft className="w-3.5 h-3.5 text-accent-purple" />}
                groups={inboundGroups}
                direction="inbound"
                collapsedGroups={collapsedGroups}
                onToggleGroup={toggleGroup}
                onNavigate={onNavigate}
                onRequestDelete={editable ? handleRequestDelete : undefined}
              />
            )}

            {searchQuery && totalFiltered === 0 && (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-text-tertiary">
                  No connections matching &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Link entity dialog */}
      <LinkEntityDialog
        sourceType={entityType}
        sourceId={entityId}
        sourceName={entityName}
        projectId={projectId}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onCreated={handleLinkCreated}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Connection</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-text-secondary">
              Remove the <span className="font-medium text-text-primary">{deleteTarget && CONNECTION_TYPE_CONFIG[deleteTarget.connectionType].label}</span> connection to <span className="font-medium text-text-primary">{deleteTarget?.entityName}</span>?
            </p>
            <p className="text-xs text-text-tertiary mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmDelete} isLoading={isDeleting}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Sub-components ---

function ConnectionSection({
  title,
  icon,
  groups,
  direction,
  collapsedGroups,
  onToggleGroup,
  onNavigate,
  onRequestDelete,
}: {
  title: string
  icon: React.ReactNode
  groups: Map<EntityConnectionType, EnrichedConnection[]>
  direction: 'outbound' | 'inbound'
  collapsedGroups: Set<string>
  onToggleGroup: (key: string) => void
  onNavigate?: (entityType: string, entityId: string) => void
  onRequestDelete?: (connectionId: string, entityName: string, connectionType: EntityConnectionType) => void
}) {
  return (
    <div className="mb-2">
      <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
        {icon}
        {title}
      </div>
      {Array.from(groups.entries()).map(([type, items]) => {
        const groupKey = `${direction}-${type}`
        const isCollapsed = collapsedGroups.has(groupKey)
        const config = CONNECTION_TYPE_CONFIG[type]

        return (
          <div key={groupKey}>
            <button
              onClick={() => onToggleGroup(groupKey)}
              className="w-full px-3 py-1 flex items-center gap-1.5 text-xs hover:bg-bg-secondary transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-text-tertiary" />
              ) : (
                <ChevronDown className="w-3 h-3 text-text-tertiary" />
              )}
              <ConnectionTypeIcon type={type} className="w-3 h-3" />
              <span className="text-text-secondary font-medium">{config.label}</span>
              <span className="text-text-tertiary ml-auto">({items.length})</span>
            </button>

            {!isCollapsed && (
              <div className="ml-5 border-l border-border-default">
                {items.map((item) => {
                  const entity = direction === 'outbound' ? item.target : item.source
                  if (!entity) return null

                  return (
                    <div
                      key={item.connection_id}
                      className="group flex items-center gap-2 pl-3 pr-2 py-1.5 hover:bg-bg-secondary transition-colors"
                    >
                      <EntityTypeIcon type={entity.type as GraphEntityType} className="w-3.5 h-3.5 flex-shrink-0" />
                      <button
                        onClick={() => onNavigate?.(entity.type, entity.id)}
                        className="flex-1 text-left text-xs text-text-primary hover:text-accent-cyan truncate transition-colors"
                        title={entity.name}
                      >
                        {entity.name}
                      </button>
                      <span className="text-[10px] text-text-tertiary flex-shrink-0">
                        {getEntityTypeLabel(entity.type as GraphEntityType)}
                      </span>
                      {item.is_auto_detected && (
                        <span title="Auto-detected">
                          <Sparkles className="w-3 h-3 text-accent-warning flex-shrink-0" />
                        </span>
                      )}
                      {onRequestDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRequestDelete(item.connection_id, entity.name, item.connection_type)
                          }}
                          className="p-0.5 rounded text-text-tertiary hover:text-accent-error opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          title="Remove connection"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
