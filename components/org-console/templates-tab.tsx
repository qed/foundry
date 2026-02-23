'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Lock, Pencil, Trash2, Star, ChevronDown, ChevronRight, Archive, ArchiveRestore, Copy, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-container'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { BlueprintTemplate, BlueprintType, BlueprintTemplateCategory } from '@/types/database'
import type { TemplateOutline, TemplateSection } from '@/lib/blueprints/system-templates'

interface TemplatesTabProps {
  orgId: string
}

const TYPE_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  system_diagram: 'System Diagram',
  feature: 'Feature',
}

const TYPE_OPTIONS: BlueprintType[] = ['foundation', 'system_diagram', 'feature']

const CATEGORY_OPTIONS: { value: BlueprintTemplateCategory; label: string }[] = [
  { value: 'architecture', label: 'Architecture' },
  { value: 'api', label: 'API' },
  { value: 'database', label: 'Database' },
  { value: 'feature', label: 'Feature' },
  { value: 'devops', label: 'DevOps' },
  { value: 'security', label: 'Security' },
  { value: 'general', label: 'General' },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
)

function emptySection(): TemplateSection {
  return { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: '', placeholder: '', required: false }
}

export function TemplatesTab({ orgId }: TemplatesTabProps) {
  const [systemTemplates, setSystemTemplates] = useState<BlueprintTemplate[]>([])
  const [orgTemplates, setOrgTemplates] = useState<BlueprintTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active')
  const { addToast } = useToast()

  // Modal state
  const [editModal, setEditModal] = useState<{
    mode: 'create' | 'edit'
    templateId?: string
    name: string
    blueprintType: BlueprintType
    description: string
    category: BlueprintTemplateCategory | ''
    sections: TemplateSection[]
    isDefault: boolean
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<BlueprintTemplate | null>(null)

  // Usage panel state
  const [usageTarget, setUsageTarget] = useState<{ id: string; name: string } | null>(null)
  const [usageData, setUsageData] = useState<{ blueprints: { id: string; title: string; blueprint_type: string; status: string; project_name: string; created_at: string }[]; total: number; project_count: number } | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/orgs/${orgId}/blueprint-templates?include_archived=true`)
      if (!res.ok) return
      const data = await res.json()
      setSystemTemplates(data.system_templates || [])
      setOrgTemplates(data.org_templates || [])
    } catch {
      addToast('Failed to load templates', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, addToast])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCreate = useCallback(() => {
    setEditModal({
      mode: 'create',
      name: '',
      blueprintType: 'foundation',
      description: '',
      category: '',
      sections: [emptySection()],
      isDefault: false,
    })
  }, [])

  const handleEdit = useCallback((template: BlueprintTemplate) => {
    const outline = template.outline_content as TemplateOutline | null
    setEditModal({
      mode: 'edit',
      templateId: template.id,
      name: template.name,
      blueprintType: template.blueprint_type,
      description: template.description || outline?.description || '',
      category: template.category || '',
      sections: outline?.sections || [emptySection()],
      isDefault: template.is_default,
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!editModal) return
    if (!editModal.name.trim()) {
      addToast('Name is required', 'error')
      return
    }
    if (editModal.sections.length === 0 || editModal.sections.every((s) => !s.title.trim())) {
      addToast('At least one section with a title is required', 'error')
      return
    }

    setIsSaving(true)
    try {
      const outline: TemplateOutline = {
        description: editModal.description,
        sections: editModal.sections.filter((s) => s.title.trim()),
      }

      const url = editModal.mode === 'create'
        ? `/api/orgs/${orgId}/blueprint-templates`
        : `/api/orgs/${orgId}/blueprint-templates/${editModal.templateId}`

      const res = await fetch(url, {
        method: editModal.mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editModal.name.trim(),
          blueprint_type: editModal.blueprintType,
          outline_content: outline,
          is_default: editModal.isDefault,
          description: editModal.description.trim() || null,
          category: editModal.category || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save template')
      }

      addToast(editModal.mode === 'create' ? 'Template created' : 'Template updated', 'success')
      setEditModal(null)
      await fetchTemplates()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [editModal, orgId, addToast, fetchTemplates])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/orgs/${orgId}/blueprint-templates/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete')
      }
      addToast('Template deleted', 'success')
      setDeleteTarget(null)
      await fetchTemplates()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, orgId, addToast, fetchTemplates])

  const handleSetDefault = useCallback(async (templateId: string) => {
    try {
      const res = await fetch(`/api/orgs/${orgId}/blueprint-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      })
      if (!res.ok) throw new Error('Failed')
      addToast('Set as default', 'success')
      await fetchTemplates()
    } catch {
      addToast('Failed to set default', 'error')
    }
  }, [orgId, addToast, fetchTemplates])

  const handleArchive = useCallback(async (templateId: string, archive: boolean) => {
    try {
      const res = await fetch(`/api/orgs/${orgId}/blueprint-templates/${templateId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: archive }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed')
      }
      addToast(archive ? 'Template archived' : 'Template restored', 'success')
      await fetchTemplates()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update', 'error')
    }
  }, [orgId, addToast, fetchTemplates])

  const handleDuplicate = useCallback(async (templateId: string) => {
    try {
      const res = await fetch(`/api/orgs/${orgId}/blueprint-templates/${templateId}/duplicate`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to duplicate')
      }
      addToast('Template duplicated', 'success')
      await fetchTemplates()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to duplicate', 'error')
    }
  }, [orgId, addToast, fetchTemplates])

  const handleViewUsage = useCallback(async (templateId: string, templateName: string) => {
    setUsageTarget({ id: templateId, name: templateName })
    setUsageLoading(true)
    setUsageData(null)
    try {
      const res = await fetch(`/api/orgs/${orgId}/blueprint-templates/${templateId}/usage`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setUsageData(data)
    } catch {
      addToast('Failed to load usage data', 'error')
      setUsageTarget(null)
    } finally {
      setUsageLoading(false)
    }
  }, [orgId, addToast])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  const activeOrg = orgTemplates.filter((t) => !t.is_archived)
  const archivedOrg = orgTemplates.filter((t) => t.is_archived)

  const displayTemplates = viewTab === 'active'
    ? [
        ...systemTemplates.map((t) => ({ ...t, isSystem: true })),
        ...activeOrg.map((t) => ({ ...t, isSystem: false })),
      ]
    : archivedOrg.map((t) => ({ ...t, isSystem: false }))

  const groupedByType = TYPE_OPTIONS.reduce<Record<string, typeof displayTemplates>>((acc, t) => {
    acc[t] = displayTemplates.filter((tpl) => tpl.blueprint_type === t)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Blueprint Templates</h2>
          <p className="text-xs text-text-tertiary mt-1">
            Manage templates for blueprint creation. System templates are read-only.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleCreate}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Template
        </Button>
      </div>

      {/* Active / Archived tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border-default">
        <button
          onClick={() => setViewTab('active')}
          className={cn(
            'px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
            viewTab === 'active'
              ? 'border-accent-cyan text-accent-cyan'
              : 'border-transparent text-text-tertiary hover:text-text-secondary'
          )}
        >
          Active ({systemTemplates.length + activeOrg.length})
        </button>
        <button
          onClick={() => setViewTab('archived')}
          className={cn(
            'px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
            viewTab === 'archived'
              ? 'border-accent-warning text-accent-warning'
              : 'border-transparent text-text-tertiary hover:text-text-secondary'
          )}
        >
          Archived ({archivedOrg.length})
        </button>
      </div>

      {/* Templates grouped by type */}
      <div className="space-y-2">
        {TYPE_OPTIONS.map((typeKey) => {
          const templates = groupedByType[typeKey] || []
          if (templates.length === 0 && viewTab === 'archived') return null
          const isExpanded = expandedType === typeKey || expandedType === null
          return (
            <div key={typeKey} className="glass-panel rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedType(expandedType === typeKey ? null : typeKey)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-bg-tertiary transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-text-tertiary" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-tertiary" />
                )}
                <span className="text-sm font-medium text-text-primary">{TYPE_LABELS[typeKey]}</span>
                <span className="text-xs text-text-tertiary ml-auto">{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-border-default">
                  {templates.length === 0 ? (
                    <p className="text-xs text-text-tertiary px-4 py-3">No templates for this type.</p>
                  ) : (
                    templates.map((tpl) => {
                      const desc = tpl.description || (tpl.outline_content as TemplateOutline | null)?.description
                      return (
                        <div
                          key={tpl.id}
                          className="flex items-center gap-3 px-4 py-2.5 border-t border-border-default first:border-t-0 hover:bg-bg-tertiary/50 transition-colors group"
                        >
                          {tpl.isSystem ? (
                            <Lock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 flex-shrink-0" />
                          )}

                          <button
                            onClick={() => setPreviewTemplate(tpl)}
                            className={cn(
                              'text-sm hover:text-accent-cyan transition-colors text-left truncate flex-1',
                              tpl.is_archived ? 'text-text-tertiary' : 'text-text-primary'
                            )}
                          >
                            {tpl.name}
                          </button>

                          {tpl.category && (
                            <span className="text-[9px] text-text-tertiary border border-border-default rounded px-1.5 py-0.5 flex-shrink-0 hidden sm:block">
                              {CATEGORY_LABELS[tpl.category] || tpl.category}
                            </span>
                          )}

                          {desc && !tpl.category && (
                            <span className="text-[10px] text-text-tertiary truncate max-w-[180px] hidden sm:block">
                              {desc}
                            </span>
                          )}

                          {tpl.is_default && (
                            <span className="text-[9px] text-accent-cyan border border-accent-cyan/30 rounded px-1.5 py-0.5 flex-shrink-0">
                              default
                            </span>
                          )}

                          {tpl.is_archived && (
                            <span className="text-[9px] text-accent-warning border border-accent-warning/30 rounded px-1.5 py-0.5 flex-shrink-0">
                              archived
                            </span>
                          )}

                          {/* Actions */}
                          {!tpl.isSystem && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={() => handleViewUsage(tpl.id, tpl.name)}
                                title="View usage"
                                className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-accent-purple"
                              >
                                <BarChart3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(tpl.id)}
                                title="Duplicate"
                                className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-accent-cyan"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              {!tpl.is_archived && (
                                <>
                                  {!tpl.is_default && (
                                    <button
                                      onClick={() => handleSetDefault(tpl.id)}
                                      title="Set as default"
                                      className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-accent-cyan"
                                    >
                                      <Star className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleEdit(tpl)}
                                    title="Edit"
                                    className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-text-primary"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleArchive(tpl.id, true)}
                                    title="Archive"
                                    className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-accent-warning"
                                  >
                                    <Archive className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              {tpl.is_archived && (
                                <button
                                  onClick={() => handleArchive(tpl.id, false)}
                                  title="Restore"
                                  className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-accent-success"
                                >
                                  <ArchiveRestore className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteTarget({ id: tpl.id, name: tpl.name })}
                                title="Delete"
                                className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-accent-error"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* System template: allow duplicate */}
                          {tpl.isSystem && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={() => handleDuplicate(tpl.id)}
                                title="Duplicate to org"
                                className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-accent-cyan"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={editModal !== null} onOpenChange={(open) => { if (!open) setEditModal(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editModal?.mode === 'create' ? 'Create Template' : 'Edit Template'}</DialogTitle>
          </DialogHeader>

          {editModal && (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">Name</label>
                <input
                  type="text"
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  placeholder="e.g., Custom Foundation Template"
                  maxLength={255}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                />
              </div>

              {/* Blueprint type (only on create) */}
              {editModal.mode === 'create' && (
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block">Blueprint Type</label>
                  <select
                    value={editModal.blueprintType}
                    onChange={(e) => setEditModal({ ...editModal, blueprintType: e.target.value as BlueprintType })}
                    className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">Category (optional)</label>
                <select
                  value={editModal.category}
                  onChange={(e) => setEditModal({ ...editModal, category: e.target.value as BlueprintTemplateCategory | '' })}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                >
                  <option value="">No category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">Description (optional)</label>
                <input
                  type="text"
                  value={editModal.description}
                  onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                  placeholder="Brief description of this template..."
                  className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                />
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-text-secondary">Sections</label>
                  <button
                    onClick={() => setEditModal({ ...editModal, sections: [...editModal.sections, emptySection()] })}
                    className="text-[10px] text-accent-cyan hover:text-accent-cyan/80 transition-colors flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Section
                  </button>
                </div>

                <div className="space-y-3">
                  {editModal.sections.map((section, i) => (
                    <div key={section.id || i} className="p-3 bg-bg-primary border border-border-default rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-text-tertiary w-4">{i + 1}.</span>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => {
                            const updated = [...editModal.sections]
                            updated[i] = { ...updated[i], title: e.target.value }
                            setEditModal({ ...editModal, sections: updated })
                          }}
                          placeholder="Section title"
                          maxLength={100}
                          className="flex-1 px-2 py-1 bg-bg-secondary border border-border-default rounded text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                        />
                        <label className="flex items-center gap-1 text-[10px] text-text-tertiary flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={section.required}
                            onChange={(e) => {
                              const updated = [...editModal.sections]
                              updated[i] = { ...updated[i], required: e.target.checked }
                              setEditModal({ ...editModal, sections: updated })
                            }}
                            className="w-3 h-3"
                          />
                          Required
                        </label>
                        {editModal.sections.length > 1 && (
                          <button
                            onClick={() => {
                              const updated = editModal.sections.filter((_, j) => j !== i)
                              setEditModal({ ...editModal, sections: updated })
                            }}
                            className="p-0.5 text-text-tertiary hover:text-accent-error transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={section.placeholder}
                        onChange={(e) => {
                          const updated = [...editModal.sections]
                          updated[i] = { ...updated[i], placeholder: e.target.value }
                          setEditModal({ ...editModal, sections: updated })
                        }}
                        placeholder="Placeholder text for this section..."
                        className="w-full px-2 py-1 bg-bg-secondary border border-border-default rounded text-[10px] text-text-secondary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                      />
                      <input
                        type="text"
                        value={section.help_text || ''}
                        onChange={(e) => {
                          const updated = [...editModal.sections]
                          updated[i] = { ...updated[i], help_text: e.target.value || undefined }
                          setEditModal({ ...editModal, sections: updated })
                        }}
                        placeholder="Help text (optional)"
                        className="w-full px-2 py-1 mt-1 bg-bg-secondary border border-border-default rounded text-[10px] text-text-secondary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Default checkbox */}
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={editModal.isDefault}
                  onChange={(e) => setEditModal({ ...editModal, isDefault: e.target.checked })}
                  className="w-3.5 h-3.5"
                />
                Set as organization default for {TYPE_LABELS[editModal.blueprintType]}
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
              {editModal?.mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary py-2">
            Delete <span className="font-medium text-text-primary">{deleteTarget?.name}</span>? Existing blueprints using this template won&apos;t be affected.
          </p>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview modal */}
      <Dialog open={previewTemplate !== null} onOpenChange={(open) => { if (!open) setPreviewTemplate(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (() => {
            const outline = previewTemplate.outline_content as TemplateOutline | null
            const desc = previewTemplate.description || outline?.description
            return (
              <div className="py-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-text-tertiary border border-border-default rounded px-1.5 py-0.5">
                    {TYPE_LABELS[previewTemplate.blueprint_type]}
                  </span>
                  {previewTemplate.category && (
                    <span className="text-[10px] text-text-tertiary border border-border-default rounded px-1.5 py-0.5">
                      {CATEGORY_LABELS[previewTemplate.category] || previewTemplate.category}
                    </span>
                  )}
                  {previewTemplate.is_default && (
                    <span className="text-[10px] text-accent-cyan border border-accent-cyan/30 rounded px-1.5 py-0.5">default</span>
                  )}
                  {previewTemplate.is_archived && (
                    <span className="text-[10px] text-accent-warning border border-accent-warning/30 rounded px-1.5 py-0.5">archived</span>
                  )}
                </div>
                {desc && (
                  <p className="text-xs text-text-tertiary mb-3">{desc}</p>
                )}
                <div className="space-y-2">
                  {outline?.sections?.map((section, i) => (
                    <div key={section.id || i} className="p-2.5 bg-bg-primary border border-border-default rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-primary">{section.title}</span>
                        {section.required && <span className="text-[9px] text-accent-warning">required</span>}
                      </div>
                      {section.placeholder && (
                        <p className="text-[10px] text-text-tertiary mt-1 italic">{section.placeholder}</p>
                      )}
                      {section.help_text && (
                        <p className="text-[10px] text-accent-cyan/70 mt-0.5">{section.help_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setPreviewTemplate(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage modal */}
      <Dialog open={usageTarget !== null} onOpenChange={(open) => { if (!open) { setUsageTarget(null); setUsageData(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Usage: {usageTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {usageLoading ? (
              <div className="flex justify-center py-6"><Spinner size="md" /></div>
            ) : usageData ? (
              <>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-xs text-text-secondary">{usageData.total} blueprint{usageData.total !== 1 ? 's' : ''}</span>
                  <span className="text-xs text-text-tertiary">across {usageData.project_count} project{usageData.project_count !== 1 ? 's' : ''}</span>
                </div>
                {usageData.blueprints.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No blueprints have been created from this template yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {usageData.blueprints.map((bp) => (
                      <div key={bp.id} className="flex items-center gap-2 p-2 bg-bg-primary border border-border-default rounded text-xs">
                        <span className="text-text-primary font-medium truncate flex-1">{bp.title}</span>
                        <span className="text-[9px] text-text-tertiary border border-border-default rounded px-1.5 py-0.5 flex-shrink-0">{bp.status}</span>
                        <span className="text-[10px] text-text-tertiary truncate max-w-[120px] flex-shrink-0">{bp.project_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => { setUsageTarget(null); setUsageData(null) }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
