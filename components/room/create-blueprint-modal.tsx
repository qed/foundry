'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Lock, FileText } from 'lucide-react'
import type { BlueprintType, BlueprintTemplate } from '@/types/database'
import type { DiagramType } from '@/lib/blueprints/system-diagram-template'
import { DIAGRAM_TYPE_OPTIONS } from '@/lib/blueprints/system-diagram-template'
import type { TemplateOutline } from '@/lib/blueprints/system-templates'

interface CreateBlueprintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onCreated: (blueprint: { id: string; title: string; blueprint_type: BlueprintType }) => void
}

const TYPE_OPTIONS: { value: BlueprintType; label: string; description: string }[] = [
  {
    value: 'foundation',
    label: 'Foundation',
    description: 'Project-wide technical decisions and architectural principles',
  },
  {
    value: 'system_diagram',
    label: 'System Diagram',
    description: 'Architecture diagrams and system overviews',
  },
]

export function CreateBlueprintModal({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: CreateBlueprintModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<BlueprintType>('foundation')
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Template state
  const [systemTemplates, setSystemTemplates] = useState<BlueprintTemplate[]>([])
  const [orgTemplates, setOrgTemplates] = useState<BlueprintTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)

  // Fetch templates when modal opens
  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/blueprint-templates`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setSystemTemplates(data.system_templates || [])
          setOrgTemplates(data.org_templates || [])
        }
      } catch {
        // Non-critical — templates are optional
      }
    }

    load()
    return () => { cancelled = true }
  }, [open, projectId])

  // Auto-select default template when type changes
  useEffect(() => {
    const orgDefault = orgTemplates.find((t) => t.blueprint_type === type && t.is_default)
    const systemDefault = systemTemplates.find((t) => t.blueprint_type === type && t.is_default)
    setSelectedTemplateId(orgDefault?.id ?? systemDefault?.id ?? null)
  }, [type, systemTemplates, orgTemplates])

  const handleClose = useCallback(() => {
    setTitle('')
    setType('foundation')
    setDiagramType('flowchart')
    setError(null)
    setSelectedTemplateId(null)
    setShowTemplatePreview(false)
    onOpenChange(false)
  }, [onOpenChange])

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (trimmedTitle.length > 255) {
      setError('Title must be 255 characters or less')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // If template selected, get its content first
      let templateContent = undefined
      if (selectedTemplateId) {
        const allTemplates = [...systemTemplates, ...orgTemplates]
        const selectedTemplate = allTemplates.find((t) => t.id === selectedTemplateId)
        if (selectedTemplate?.outline_content) {
          const convertRes = await fetch(`/api/projects/${projectId}/blueprint-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outline_content: selectedTemplate.outline_content }),
          })
          if (convertRes.ok) {
            const convertData = await convertRes.json()
            templateContent = convertData.content
          }
        }
      }

      const res = await fetch(`/api/projects/${projectId}/blueprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint_type: type,
          title: trimmedTitle,
          ...(type === 'system_diagram' && { diagram_type: diagramType }),
          ...(templateContent && { template_content: templateContent }),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create blueprint')
      }

      const data = await res.json()
      onCreated(data.blueprint)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create blueprint')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, type, diagramType, selectedTemplateId, systemTemplates, orgTemplates, projectId, onCreated, handleClose])

  // Filter templates by current type
  const filteredSystem = systemTemplates.filter((t) => t.blueprint_type === type)
  const filteredOrg = orgTemplates.filter((t) => t.blueprint_type === type)
  const hasTemplates = filteredSystem.length > 0 || filteredOrg.length > 0

  // Get selected template for preview
  const selectedTemplate = selectedTemplateId
    ? [...systemTemplates, ...orgTemplates].find((t) => t.id === selectedTemplateId)
    : null
  const selectedOutline = selectedTemplate?.outline_content as TemplateOutline | null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={showTemplatePreview ? 'max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle>Create Blueprint</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type selector */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-colors',
                    type === opt.value
                      ? 'border-accent-cyan bg-accent-cyan/5'
                      : 'border-border-default hover:border-border-default/80 hover:bg-bg-tertiary'
                  )}
                >
                  <p className={cn(
                    'text-sm font-medium',
                    type === opt.value ? 'text-accent-cyan' : 'text-text-primary'
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Diagram type selector (only for system diagrams) */}
          {type === 'system_diagram' && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-2 block">Diagram Type</label>
              <div className="grid grid-cols-2 gap-2">
                {DIAGRAM_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDiagramType(opt.value)}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-colors',
                      diagramType === opt.value
                        ? 'border-accent-purple bg-accent-purple/5'
                        : 'border-border-default hover:border-border-default/80 hover:bg-bg-tertiary'
                    )}
                  >
                    <p className={cn(
                      'text-xs font-medium',
                      diagramType === opt.value ? 'text-accent-purple' : 'text-text-primary'
                    )}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Template selector */}
          {hasTemplates && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-secondary">Template</label>
                {selectedTemplate && (
                  <button
                    onClick={() => setShowTemplatePreview((p) => !p)}
                    className="text-[10px] text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                  >
                    {showTemplatePreview ? 'Hide preview' : 'Preview sections'}
                  </button>
                )}
              </div>

              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                {/* System templates */}
                {filteredSystem.length > 0 && (
                  <>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider px-1 pt-1">System Templates</p>
                    {filteredSystem.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id === selectedTemplateId ? null : t.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors',
                          selectedTemplateId === t.id
                            ? 'bg-accent-cyan/10 text-text-primary'
                            : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                        )}
                      >
                        <Lock className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                        <span className="truncate">{t.name}</span>
                        {t.is_default && (
                          <span className="text-[9px] text-accent-cyan ml-auto flex-shrink-0">default</span>
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Org templates */}
                {filteredOrg.length > 0 && (
                  <>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider px-1 pt-1">Organization Templates</p>
                    {filteredOrg.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id === selectedTemplateId ? null : t.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors',
                          selectedTemplateId === t.id
                            ? 'bg-accent-cyan/10 text-text-primary'
                            : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                        )}
                      >
                        <FileText className="w-3 h-3 text-accent-purple flex-shrink-0" />
                        <span className="truncate">{t.name}</span>
                        {t.is_default && (
                          <span className="text-[9px] text-accent-purple ml-auto flex-shrink-0">default</span>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Template preview */}
              {showTemplatePreview && selectedOutline && (
                <div className="mt-2 p-3 bg-bg-primary border border-border-default rounded-lg">
                  <p className="text-[10px] text-text-tertiary mb-2">{selectedOutline.description}</p>
                  <div className="space-y-1.5">
                    {selectedOutline.sections?.map((section, i) => (
                      <div key={section.id || i} className="flex items-start gap-2">
                        <span className="text-[10px] text-text-tertiary mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <div className="min-w-0">
                          <p className="text-xs text-text-primary font-medium">{section.title}</p>
                          {section.help_text && (
                            <p className="text-[10px] text-text-tertiary">{section.help_text}</p>
                          )}
                        </div>
                        {section.required && (
                          <span className="text-[9px] text-accent-warning flex-shrink-0 ml-auto">required</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title input */}
          <div>
            <label htmlFor="blueprint-title" className="text-xs font-medium text-text-secondary mb-1.5 block">
              Title
            </label>
            <input
              id="blueprint-title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isSubmitting) handleSubmit() }}
              placeholder={type === 'foundation' ? 'e.g., Backend Architecture' : 'e.g., System Overview Diagram'}
              maxLength={255}
              autoFocus
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
            />
            <div className="flex items-center justify-between mt-1">
              {error ? (
                <p className="text-xs text-accent-error">{error}</p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-text-tertiary">{title.length}/255</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!title.trim() || isSubmitting}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
