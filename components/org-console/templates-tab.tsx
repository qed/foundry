'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Lock, Pencil, Trash2, Star, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-container'
import { Spinner } from '@/components/ui/spinner'
import type { BlueprintTemplate, BlueprintType } from '@/types/database'
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

function emptySection(): TemplateSection {
  return { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: '', placeholder: '', required: false }
}

export function TemplatesTab({ orgId }: TemplatesTabProps) {
  const [systemTemplates, setSystemTemplates] = useState<BlueprintTemplate[]>([])
  const [orgTemplates, setOrgTemplates] = useState<BlueprintTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const { addToast } = useToast()

  // Modal state
  const [editModal, setEditModal] = useState<{
    mode: 'create' | 'edit'
    templateId?: string
    name: string
    blueprintType: BlueprintType
    description: string
    sections: TemplateSection[]
    isDefault: boolean
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<BlueprintTemplate | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/orgs/${orgId}/blueprint-templates`)
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
      description: outline?.description || '',
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  const allTemplates = [
    ...systemTemplates.map((t) => ({ ...t, isSystem: true })),
    ...orgTemplates.map((t) => ({ ...t, isSystem: false })),
  ]

  const groupedByType = TYPE_OPTIONS.reduce<Record<string, typeof allTemplates>>((acc, t) => {
    acc[t] = allTemplates.filter((tpl) => tpl.blueprint_type === t)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      {/* Templates grouped by type */}
      <div className="space-y-2">
        {TYPE_OPTIONS.map((typeKey) => {
          const templates = groupedByType[typeKey] || []
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
                      const outline = tpl.outline_content as TemplateOutline | null
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
                            className="text-sm text-text-primary hover:text-accent-cyan transition-colors text-left truncate flex-1"
                          >
                            {tpl.name}
                          </button>

                          {outline?.description && (
                            <span className="text-[10px] text-text-tertiary truncate max-w-[200px] hidden sm:block">
                              {outline.description}
                            </span>
                          )}

                          {tpl.is_default && (
                            <span className="text-[9px] text-accent-cyan border border-accent-cyan/30 rounded px-1.5 py-0.5 flex-shrink-0">
                              default
                            </span>
                          )}

                          {!tpl.isSystem && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                                onClick={() => setDeleteTarget({ id: tpl.id, name: tpl.name })}
                                title="Delete"
                                className="p-1 rounded hover:bg-bg-primary transition-colors text-text-tertiary hover:text-accent-error"
                              >
                                <Trash2 className="w-3 h-3" />
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
            return (
              <div className="py-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-text-tertiary border border-border-default rounded px-1.5 py-0.5">
                    {TYPE_LABELS[previewTemplate.blueprint_type]}
                  </span>
                  {previewTemplate.is_default && (
                    <span className="text-[10px] text-accent-cyan border border-accent-cyan/30 rounded px-1.5 py-0.5">default</span>
                  )}
                </div>
                {outline?.description && (
                  <p className="text-xs text-text-tertiary mb-3">{outline.description}</p>
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
    </div>
  )
}
