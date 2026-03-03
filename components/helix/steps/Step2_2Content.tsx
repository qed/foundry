'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import LinkExtension from '@tiptap/extension-link'
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code2,
  Link2,
  RemoveFormatting,
} from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { completeHelixStep } from '@/lib/helix/actions'
import StepHeaderNav from '@/components/helix/StepHeaderNav'
import { debounce } from '@/lib/utils/debounce'
import {
  KNOWLEDGE_SECTIONS,
  MIN_SECTIONS_FOR_GATE,
  MIN_CHARS_PER_SECTION,
  getPlainTextCharCount,
  countCompletedSections,
  buildKnowledgeEvidence,
  validateKnowledgeGate,
  createInitialSections,
  type SectionData,
  type KnowledgeSectionConfig,
} from '@/lib/helix/knowledge-sections'

// ─── Section Editor ──────────────────────────────────────────────────────────

interface SectionEditorProps {
  config: KnowledgeSectionConfig
  data: SectionData
  expanded: boolean
  onToggle: () => void
  onChange: (content: string) => void
  sectionSaveStatus: 'idle' | 'saving' | 'saved'
}

function SectionEditor({
  config,
  data,
  expanded,
  onToggle,
  onChange,
  sectionSaveStatus,
}: SectionEditorProps) {
  const charCount = getPlainTextCharCount(data.content)
  const isComplete = charCount >= MIN_CHARS_PER_SECTION
  const isWarning = charCount >= config.maxCharacters - 500 && charCount < config.maxCharacters

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder: config.placeholder,
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: data.content || '<p></p>',
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      const plainLen = getPlainTextCharCount(html)
      if (plainLen <= config.maxCharacters) {
        onChange(html)
      }
    },
  })

  return (
    <div
      className={`rounded-lg border transition-colors duration-200 ${
        isComplete
          ? 'border-accent-cyan/50 bg-accent-cyan/5'
          : 'border-bg-tertiary bg-bg-primary'
      }`}
    >
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {expanded ? (
          <ChevronDown size={18} className="text-text-secondary flex-shrink-0" />
        ) : (
          <ChevronRight size={18} className="text-text-secondary flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{config.title}</span>
            {isComplete && <CheckCircle2 size={16} className="text-green-500" />}
          </div>
          {!expanded && charCount > 0 && (
            <p className="text-xs text-text-secondary mt-0.5 truncate">
              {charCount} characters
            </p>
          )}
        </div>
        {/* Save status */}
        <div className="flex-shrink-0 w-16 text-right">
          {sectionSaveStatus === 'saving' && (
            <span className="text-xs text-text-secondary">Saving...</span>
          )}
          {sectionSaveStatus === 'saved' && (
            <span className="text-xs text-green-400">Saved</span>
          )}
        </div>
      </button>

      {/* Expanded Editor */}
      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-text-secondary mb-3">{config.description}</p>

          {/* Toolbar */}
          <div className="border border-bg-tertiary rounded-t-lg bg-bg-secondary p-2 flex flex-wrap gap-1">
            <ToolbarButton
              active={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <Italic size={16} />
            </ToolbarButton>
            <div className="w-px h-6 bg-bg-tertiary self-center" />
            <ToolbarButton
              active={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              title="Bullet List"
            >
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              title="Ordered List"
            >
              <ListOrdered size={16} />
            </ToolbarButton>
            <div className="w-px h-6 bg-bg-tertiary self-center" />
            <ToolbarButton
              active={editor?.isActive('heading', { level: 2 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
            >
              <span className="text-xs font-bold">H2</span>
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('heading', { level: 3 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
            >
              <span className="text-xs font-bold">H3</span>
            </ToolbarButton>
            <div className="w-px h-6 bg-bg-tertiary self-center" />
            <ToolbarButton
              active={editor?.isActive('codeBlock')}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              title="Code Block"
            >
              <Code2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              active={editor?.isActive('link')}
              onClick={() => {
                if (editor?.isActive('link')) {
                  editor.chain().focus().unsetLink().run()
                } else {
                  const url = window.prompt('URL:')
                  if (url) editor?.chain().focus().setLink({ href: url }).run()
                }
              }}
              title="Link"
            >
              <Link2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
              title="Clear Formatting"
            >
              <RemoveFormatting size={16} />
            </ToolbarButton>
          </div>

          {/* Editor Area */}
          <div className="border border-t-0 border-bg-tertiary rounded-b-lg overflow-hidden">
            <EditorContent
              editor={editor}
              className="prose-foundry p-4 bg-bg-primary min-h-[12rem] max-h-[24rem] overflow-y-auto focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[10rem]"
            />
          </div>

          {/* Character Counter */}
          <div className="flex justify-between mt-2">
            <span className="text-xs text-text-secondary">
              Min {MIN_CHARS_PER_SECTION} characters to count as complete
            </span>
            <span
              className={`text-xs ${
                isWarning
                  ? 'text-yellow-400'
                  : charCount >= config.maxCharacters
                    ? 'text-red-400'
                    : 'text-text-secondary'
              }`}
            >
              {charCount.toLocaleString()} / {config.maxCharacters.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick?: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent-cyan text-white'
          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface Step2_2ContentProps {
  step: HelixStep
  projectId: string
  orgSlug: string
}

export default function Step2_2Content({
  step,
  projectId,
  orgSlug,
}: Step2_2ContentProps) {
  const isComplete = step.status === 'complete'

  // Initialize sections from saved evidence or defaults
  const [sections, setSections] = useState<Record<string, SectionData>>(() => {
    if (
      step.evidence_data &&
      typeof step.evidence_data === 'object' &&
      !Array.isArray(step.evidence_data)
    ) {
      const data = step.evidence_data as Record<string, unknown>
      if (data.evidence_type === 'knowledge_capture' && data.sections) {
        return data.sections as Record<string, SectionData>
      }
    }
    return createInitialSections()
  })

  const [expandedSection, setExpandedSection] = useState<string>(
    KNOWLEDGE_SECTIONS[0].id
  )
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [sectionSaveStatuses, setSectionSaveStatuses] = useState<
    Record<string, 'idle' | 'saving' | 'saved'>
  >({})

  const completedCount = useMemo(
    () => countCompletedSections(sections),
    [sections]
  )
  const isFormValid = completedCount >= MIN_SECTIONS_FOR_GATE

  // Per-section auto-save with 3s debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedAutoSave = useCallback(
    debounce(async (sectionId: string, allSections: Record<string, SectionData>) => {
      try {
        setSectionSaveStatuses((prev) => ({ ...prev, [sectionId]: 'saving' }))
        const evidence = buildKnowledgeEvidence(allSections)
        const response = await fetch(
          `/api/helix/projects/${projectId}/steps/2.2/auto-save`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evidence),
          }
        )
        if (!response.ok) throw new Error('Failed to auto-save')
        setSectionSaveStatuses((prev) => ({ ...prev, [sectionId]: 'saved' }))
        setTimeout(
          () => setSectionSaveStatuses((prev) => ({ ...prev, [sectionId]: 'idle' })),
          2000
        )
      } catch {
        setSectionSaveStatuses((prev) => ({ ...prev, [sectionId]: 'idle' }))
      }
    }, 3000),
    [projectId]
  )

  const handleSectionChange = useCallback(
    (sectionId: string, content: string) => {
      setSections((prev) => {
        const updated = {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            content,
            character_count: getPlainTextCharCount(content),
            updated_at: new Date().toISOString(),
          },
        }
        debouncedAutoSave(sectionId, updated)
        return updated
      })
    },
    [debouncedAutoSave]
  )

  const handleComplete = async () => {
    debouncedAutoSave.cancel()
    setValidationError(null)

    const gate = validateKnowledgeGate(sections)
    if (!gate.valid) {
      setValidationError(gate.error)
      return
    }

    try {
      setIsSaving(true)
      const evidence = buildKnowledgeEvidence(sections)
      await completeHelixStep(projectId, '2.2', evidence, 'Domain Knowledge Capture')
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
              2.2 — Capture Undocumented Knowledge
            </h1>
            <p className="text-text-secondary mt-1">Step 2 of 4 — Documentation Stage</p>
          </div>
          <StepHeaderNav stepKey="2.2" orgSlug={orgSlug} projectId={projectId} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8 space-y-4">
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
                      You can still edit and re-save your knowledge capture.
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-text-primary mb-2">Instructions</h2>
                <p className="text-text-secondary text-sm">
                  Capture critical domain knowledge that exists only in your head. Expand each
                  section below and write about your project using the rich text editor. At
                  least {MIN_SECTIONS_FOR_GATE} sections need {MIN_CHARS_PER_SECTION}+ characters
                  each.
                </p>
              </div>

              {/* Section Editors */}
              <div className="space-y-3">
                {KNOWLEDGE_SECTIONS.map((config) => (
                  <SectionEditor
                    key={config.id}
                    config={config}
                    data={sections[config.id] ?? { title: config.title, content: '', character_count: 0, updated_at: '' }}
                    expanded={expandedSection === config.id}
                    onToggle={() =>
                      setExpandedSection((prev) =>
                        prev === config.id ? '' : config.id
                      )
                    }
                    onChange={(content) => handleSectionChange(config.id, content)}
                    sectionSaveStatus={sectionSaveStatuses[config.id] ?? 'idle'}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20 space-y-4">
              {/* Progress */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">
                  Sections Progress
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-cyan rounded-full transition-all duration-300"
                      style={{
                        width: `${(completedCount / KNOWLEDGE_SECTIONS.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-text-secondary whitespace-nowrap">
                    {completedCount} / {KNOWLEDGE_SECTIONS.length}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  sections with {MIN_CHARS_PER_SECTION}+ characters (need {MIN_SECTIONS_FOR_GATE})
                </p>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{validationError}</p>
                </div>
              )}

              {/* Next step link */}
              {isComplete && (
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/2.3`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Continue to Step 2.3
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

              {!isComplete && (
                <p className="text-sm text-text-secondary">
                  Fill in at least {MIN_SECTIONS_FOR_GATE} sections, then click Save to
                  complete this step and unlock Step 2.3.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
