'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Info,
} from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { completeHelixStep } from '@/lib/helix/actions'
import StepHeaderNav from '@/components/helix/StepHeaderNav'
import { debounce } from '@/lib/utils/debounce'
import {
  STANDARD_CATEGORIES,
  MAX_CUSTOM_CATEGORIES,
  MAX_LOCATION_NOTES_LENGTH,
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
  createInitialCategories,
  createCustomCategory,
  buildInventoryEvidence,
  validateInventoryGate,
  type DocumentationCategory,
} from '@/lib/helix/documentation-inventory'

interface Step2_1ContentProps {
  step: HelixStep
  projectId: string
  orgSlug: string
}

/**
 * Step 2.1 — Identify Available Documentation
 *
 * A structured checklist form for inventorying all existing project documentation
 * across 10 standard categories plus up to 5 custom categories.
 */
export default function Step2_1Content({
  step,
  projectId,
  orgSlug,
}: Step2_1ContentProps) {
  const isComplete = step.status === 'complete'

  // Initialize categories from saved evidence or defaults
  const [categories, setCategories] = useState<DocumentationCategory[]>(() => {
    if (
      step.evidence_data &&
      typeof step.evidence_data === 'object' &&
      !Array.isArray(step.evidence_data)
    ) {
      const data = step.evidence_data as Record<string, unknown>
      if (data.inventory_type === 'documentation_inventory' && Array.isArray(data.categories)) {
        const saved = data.categories as Array<Record<string, unknown>>
        return saved.map((cat) => {
          // Restore icon from standard categories config or fallback
          const standardConfig = STANDARD_CATEGORIES.find(
            (sc) => sc.category_id === cat.category_id
          )
          return {
            category_id: (cat.category_id as string) || '',
            category_name: (cat.category_name as string) || '',
            description: (cat.description as string) || '',
            icon: standardConfig?.icon ?? STANDARD_CATEGORIES[9].icon,
            exists: (cat.exists as boolean) || false,
            location_notes: (cat.location_notes as string) || '',
            file_count_estimate: (cat.file_count_estimate as number) || 0,
            is_custom: (cat.is_custom as boolean) || false,
          }
        })
      }
    }
    return createInitialCategories()
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customName, setCustomName] = useState('')

  const customCount = categories.filter((c) => c.is_custom).length
  const checkedCount = categories.filter((c) => c.exists).length
  const isFormValid = checkedCount > 0

  // Auto-save with 2-second debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedAutoSave = useCallback(
    debounce(async (cats: DocumentationCategory[]) => {
      if (cats.every((c) => !c.exists && !c.location_notes && c.file_count_estimate === 0)) {
        return
      }
      try {
        setSaveStatus('saving')
        const evidence = buildInventoryEvidence(cats)
        const response = await fetch(
          `/api/helix/projects/${projectId}/steps/2.1/auto-save`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evidence),
          }
        )
        if (!response.ok) throw new Error('Failed to auto-save')
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('idle')
      }
    }, 2000),
    [projectId]
  )

  // Trigger auto-save on category changes
  useEffect(() => {
    debouncedAutoSave(categories)
  }, [categories, debouncedAutoSave])

  const updateCategory = useCallback(
    (categoryId: string, updates: Partial<DocumentationCategory>) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.category_id === categoryId ? { ...cat, ...updates } : cat
        )
      )
    },
    []
  )

  const handleAddCustomCategory = useCallback(() => {
    const trimmed = customName.trim()
    if (!trimmed) return
    if (customCount >= MAX_CUSTOM_CATEGORIES) return
    // Check for duplicates
    if (categories.some((c) => c.category_name.toLowerCase() === trimmed.toLowerCase())) return

    const newCat = createCustomCategory(trimmed)
    setCategories((prev) => [...prev, newCat])
    setCustomName('')
    setShowAddCustom(false)
  }, [customName, customCount, categories])

  const handleDeleteCustomCategory = useCallback((categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.category_id !== categoryId))
  }, [])

  const handleComplete = async () => {
    debouncedAutoSave.cancel()
    setValidationError(null)

    const gate = validateInventoryGate(categories)
    if (!gate.valid) {
      setValidationError(gate.error)
      return
    }

    try {
      setIsSaving(true)
      const evidence = buildInventoryEvidence(categories)
      await completeHelixStep(projectId, '2.1', evidence, 'Documentation Inventory')
    } catch {
      setValidationError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sticky Header */}
      <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              2.1 — Identify Available Documentation
            </h1>
            <p className="text-text-secondary mt-1">Step 1 of 4 — Documentation Stage</p>
          </div>
          <StepHeaderNav stepKey="2.1" orgSlug={orgSlug} projectId={projectId} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8 space-y-6">
              {/* Completed Banner */}
              {isComplete && (
                <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-300">
                      Completed on{' '}
                      {step.completed_at
                        ? new Date(step.completed_at).toLocaleDateString()
                        : 'unknown'}
                    </p>
                    <p className="text-xs text-green-300/70 mt-0.5">
                      You can still edit and re-save your inventory.
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-3">Instructions</h2>
                <p className="text-text-secondary text-sm">
                  Review each documentation category below. Check the box if you have existing
                  documentation in that category, add location notes describing where it&apos;s stored,
                  and estimate how many files or items exist. You can also add custom categories.
                </p>
              </div>

              {/* Category List */}
              <div className="space-y-3">
                {categories.map((cat) => {
                  const IconComponent = cat.icon
                  return (
                    <div
                      key={cat.category_id}
                      className={`rounded-lg border p-4 transition-colors duration-200 ${
                        cat.exists
                          ? 'border-accent-cyan/50 bg-accent-cyan/5'
                          : 'border-bg-tertiary bg-bg-primary'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <label className="flex items-center mt-0.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cat.exists}
                            onChange={(e) =>
                              updateCategory(cat.category_id, { exists: e.target.checked })
                            }
                            className="w-5 h-5 rounded border-bg-tertiary text-accent-cyan focus:ring-accent-cyan bg-bg-primary"
                          />
                        </label>

                        {/* Icon + Name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <IconComponent
                              size={18}
                              className={
                                cat.exists ? 'text-accent-cyan' : 'text-text-secondary'
                              }
                            />
                            <span className="font-medium text-text-primary">
                              {cat.category_name}
                            </span>
                            {cat.is_custom && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                                Custom
                              </span>
                            )}
                            <div className="relative group">
                              <Info size={14} className="text-text-secondary/50 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-bg-tertiary text-text-primary text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                {cat.description}
                              </div>
                            </div>
                          </div>

                          {/* Fields row */}
                          <div className="flex flex-col sm:flex-row gap-3 mt-2">
                            {/* Location/Notes */}
                            <div className="flex-1">
                              <label className="block text-xs text-text-secondary mb-1">
                                Location / Notes
                              </label>
                              <input
                                type="text"
                                value={cat.location_notes}
                                onChange={(e) =>
                                  updateCategory(cat.category_id, {
                                    location_notes: e.target.value.slice(
                                      0,
                                      MAX_LOCATION_NOTES_LENGTH
                                    ),
                                  })
                                }
                                placeholder="Where is this stored?"
                                className="w-full px-3 py-1.5 text-sm bg-bg-primary border border-bg-tertiary rounded text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                              />
                              <span className="text-xs text-text-secondary/50 mt-0.5 block text-right">
                                {cat.location_notes.length}/{MAX_LOCATION_NOTES_LENGTH}
                              </span>
                            </div>

                            {/* File Count */}
                            <div className="w-32">
                              <label className="block text-xs text-text-secondary mb-1">
                                Est. Files
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={cat.file_count_estimate || ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10)
                                  updateCategory(cat.category_id, {
                                    file_count_estimate: isNaN(val) || val < 0 ? 0 : val,
                                  })
                                }}
                                placeholder="0"
                                className="w-full px-3 py-1.5 text-sm bg-bg-primary border border-bg-tertiary rounded text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Delete button for custom categories */}
                        {cat.is_custom && (
                          <button
                            onClick={() => handleDeleteCustomCategory(cat.category_id)}
                            className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-900/20 transition-colors"
                            title="Remove custom category"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add Custom Category */}
              {customCount < MAX_CUSTOM_CATEGORIES && (
                <div>
                  {showAddCustom ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) =>
                          setCustomName(
                            e.target.value.slice(0, MAX_CUSTOM_CATEGORY_NAME_LENGTH)
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCustomCategory()
                          if (e.key === 'Escape') {
                            setShowAddCustom(false)
                            setCustomName('')
                          }
                        }}
                        placeholder="Category name"
                        className="flex-1 px-3 py-2 text-sm bg-bg-primary border border-bg-tertiary rounded text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                        autoFocus
                      />
                      <button
                        onClick={handleAddCustomCategory}
                        disabled={!customName.trim()}
                        className="px-4 py-2 text-sm rounded bg-accent-cyan text-white hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCustom(false)
                          setCustomName('')
                        }}
                        className="px-3 py-2 text-sm rounded border border-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddCustom(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm rounded border border-dashed border-bg-tertiary text-text-secondary hover:text-text-primary hover:border-accent-cyan/50 transition-colors"
                    >
                      <Plus size={16} />
                      Add Custom Category ({customCount}/{MAX_CUSTOM_CATEGORIES})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20 space-y-4">
              {/* Progress Summary */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">Inventory Progress</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-cyan rounded-full transition-all duration-300"
                      style={{
                        width: `${categories.length > 0 ? (checkedCount / categories.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-text-secondary whitespace-nowrap">
                    {checkedCount} / {categories.length}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  categories with existing documentation
                </p>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{validationError}</p>
                </div>
              )}

              {/* Continue to next step */}
              {isComplete && (
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/2.2`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Continue to Step 2.2
                </a>
              )}

              {/* Save Button */}
              <button
                onClick={handleComplete}
                disabled={isSaving || !isFormValid}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isComplete
                    ? 'border border-border-default text-text-secondary hover:text-text-primary hover:border-accent-cyan/50'
                    : 'bg-accent-cyan text-white hover:bg-opacity-90'
                }`}
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                {isComplete ? 'Re-save Changes' : 'Save and Complete'}
              </button>

              {/* Auto-Save Status */}
              <div className="flex items-center justify-center gap-1.5 h-5">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 size={14} className="animate-spin text-text-secondary" />
                    <span className="text-xs text-text-secondary">Auto-saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle2 size={14} className="text-green-400" />
                    <span className="text-xs text-green-400">Inventory saved</span>
                  </>
                )}
              </div>

              {!isComplete && (
                <p className="text-sm text-text-secondary">
                  Mark at least one category as existing, then click Save to complete this step
                  and unlock Step 2.2.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
