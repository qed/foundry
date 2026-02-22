'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Plus, Shield, Globe, Zap, Database, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TECH_REQ_CATEGORIES, type TechReqCategory } from '@/lib/shop/tech-req-templates'
import { CreateTechnicalRequirementDialog } from './create-technical-requirement-dialog'
import { Spinner } from '@/components/ui/spinner'

interface TechReqItem {
  id: string
  title: string
  category: TechReqCategory | null
  created_at: string
  updated_at: string
}

interface TechnicalRequirementsSectionProps {
  projectId: string
  selectedDocId: string | null
  onSelectDocument: (docId: string) => void
  refreshKey?: number
}

const CATEGORY_ICONS: Record<TechReqCategory, typeof Shield> = {
  auth_security: Shield,
  api_integrations: Globe,
  performance_scalability: Zap,
  data_storage: Database,
}

export function TechnicalRequirementsSection({
  projectId,
  selectedDocId,
  onSelectDocument,
  refreshKey = 0,
}: TechnicalRequirementsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [categories, setCategories] = useState<Record<string, TechReqItem[]>>({})
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createCategory, setCreateCategory] = useState<TechReqCategory | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const totalCount = Object.values(categories).reduce((sum, items) => sum + items.length, 0)

  const fetchRequirements = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/projects/${projectId}/technical-requirements`)
      if (!res.ok) return
      const data = await res.json()
      setCategories(data.categories || {})
      setHasLoaded(true)
    } catch {
      // Silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Fetch on first expand
  useEffect(() => {
    if (expanded && !hasLoaded) {
      fetchRequirements()
    }
  }, [expanded, hasLoaded, fetchRequirements])

  // Refetch on refreshKey change
  useEffect(() => {
    if (refreshKey > 0 && hasLoaded) {
      fetchRequirements()
    }
  }, [refreshKey, hasLoaded, fetchRequirements])

  const handleToggleCategory = useCallback((key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleAddToCategory = useCallback((category: TechReqCategory) => {
    setCreateCategory(category)
    setShowCreate(true)
  }, [])

  const handleCreateSuccess = useCallback((docId: string) => {
    fetchRequirements()
    onSelectDocument(docId)
  }, [fetchRequirements, onSelectDocument])

  const handleDelete = useCallback(async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (!confirm('Delete this technical requirement?')) return

    setDeletingId(docId)
    try {
      const res = await fetch(`/api/projects/${projectId}/requirements-documents/${docId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchRequirements()
        if (selectedDocId === docId) {
          onSelectDocument('')
        }
      }
    } catch {
      // Silently ignore
    } finally {
      setDeletingId(null)
    }
  }, [projectId, fetchRequirements, selectedDocId, onSelectDocument])

  return (
    <div className="border-t border-border-default">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider hover:text-text-secondary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>Technical Requirements</span>
        {totalCount > 0 && (
          <span className="ml-auto text-[10px] bg-bg-tertiary text-text-tertiary px-1.5 py-0.5 rounded">
            {totalCount}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {isLoading && !hasLoaded ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="space-y-0.5">
              {TECH_REQ_CATEGORIES.map((cat) => {
                const items = categories[cat.key] || []
                const isExpanded = expandedCategories.has(cat.key)
                const Icon = CATEGORY_ICONS[cat.key]

                return (
                  <div key={cat.key}>
                    {/* Category header */}
                    <button
                      onClick={() => handleToggleCategory(cat.key)}
                      className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-sm hover:bg-bg-tertiary transition-colors group"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-text-tertiary" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-text-tertiary" />
                      )}
                      <Icon className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                      <span className="text-text-secondary text-xs font-medium truncate">
                        {cat.label}
                      </span>
                      <span className="ml-auto text-[10px] bg-bg-tertiary text-text-tertiary px-1.5 py-0.5 rounded flex-shrink-0">
                        {items.length}
                      </span>
                    </button>

                    {/* Category items */}
                    {isExpanded && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => onSelectDocument(item.id)}
                            className={cn(
                              'w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors group/item',
                              selectedDocId === item.id
                                ? 'bg-accent-cyan/10 text-text-primary font-medium'
                                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                            )}
                          >
                            <span className="truncate flex-1 text-left">{item.title}</span>
                            <button
                              onClick={(e) => handleDelete(e, item.id)}
                              disabled={deletingId === item.id}
                              className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:bg-accent-error/20 hover:text-accent-error transition-all flex-shrink-0"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </button>
                        ))}
                        <button
                          onClick={() => handleAddToCategory(cat.key)}
                          className="w-full text-left text-[11px] text-accent-cyan hover:text-accent-cyan/80 px-2 py-1 rounded-md hover:bg-bg-tertiary transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Requirement
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Global add button */}
              <button
                onClick={() => {
                  setCreateCategory(undefined)
                  setShowCreate(true)
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-1 rounded-md text-xs text-accent-cyan hover:bg-bg-tertiary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Technical Requirement
              </button>
            </div>
          )}
        </div>
      )}

      <CreateTechnicalRequirementDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        projectId={projectId}
        defaultCategory={createCategory}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
