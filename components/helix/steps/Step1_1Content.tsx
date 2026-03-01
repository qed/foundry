'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { completeHelixStep } from '@/lib/helix/actions'
import { debounce } from '@/lib/utils/debounce'

interface Step1_1ContentProps {
  step: HelixStep
  projectId: string
  orgSlug: string
}

interface ProjectIdea {
  projectName: string
  problemStatement: string
  targetUsers: string
  vision: string
  ideaText: string
}

export default function Step1_1Content({
  step,
  projectId,
  orgSlug,
}: Step1_1ContentProps) {
  const [formData, setFormData] = useState<ProjectIdea>(() => {
    if (step.evidence_data && typeof step.evidence_data === 'object' && !Array.isArray(step.evidence_data)) {
      const data = step.evidence_data as Record<string, unknown>
      return {
        projectName: (data.projectName as string) || '',
        problemStatement: (data.problemStatement as string) || '',
        targetUsers: (data.targetUsers as string) || '',
        vision: (data.vision as string) || '',
        ideaText: (data.ideaText as string) || '',
      }
    }
    return {
      projectName: '',
      problemStatement: '',
      targetUsers: '',
      vision: '',
      ideaText: '',
    }
  })

  const isComplete = step.status === 'complete'
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [validationError, setValidationError] = useState<string | null>(null)

  // TipTap editor for the full project idea text
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your complete project idea here...',
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: formData.ideaText || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setFormData((prev) => ({ ...prev, ideaText: html }))
    },
  })

  // Auto-save with debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedAutoSave = useCallback(
    debounce(async (data: ProjectIdea) => {
      if (!data.projectName && !data.problemStatement && !data.targetUsers && !data.ideaText) {
        return
      }

      try {
        setSaveStatus('saving')
        const response = await fetch(
          `/api/helix/projects/${projectId}/steps/1.1/auto-save`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
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

  // Trigger auto-save on form changes
  useEffect(() => {
    debouncedAutoSave(formData)
  }, [formData, debouncedAutoSave])

  const validateForm = useCallback((): boolean => {
    setValidationError(null)
    if (!formData.projectName.trim()) {
      setValidationError('Project name is required')
      return false
    }
    if (!formData.problemStatement.trim()) {
      setValidationError('Problem statement is required')
      return false
    }
    if (!formData.targetUsers.trim()) {
      setValidationError('Target users must be described')
      return false
    }
    // Strip HTML tags for length check
    const plainText = formData.ideaText.replace(/<[^>]*>/g, '').trim()
    if (plainText.length < 50) {
      setValidationError('Project idea must be at least 50 characters long')
      return false
    }
    return true
  }, [formData])

  const handleComplete = async () => {
    if (!validateForm()) return
    try {
      setIsSaving(true)
      await completeHelixStep(projectId, '1.1', formData, 'Project Idea Definition')
      window.location.reload()
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to complete step')
    } finally {
      setIsSaving(false)
    }
  }

  const plainTextLength = formData.ideaText.replace(/<[^>]*>/g, '').trim().length
  const isFormValid =
    formData.projectName.trim().length > 0 &&
    formData.problemStatement.trim().length > 0 &&
    formData.targetUsers.trim().length > 0 &&
    plainTextLength >= 50

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-text-primary">
            1.1 — Define Project Idea
          </h1>
          <p className="text-text-secondary mt-1">Step 1 of 3 — Planning Stage</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8 space-y-8">
              {/* Completed banner */}
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
                      You can still edit and re-save your project idea.
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Instructions</h2>
                <ol className="space-y-3">
                  {[
                    'Give your project a clear, concise name',
                    'Define the problem your project solves',
                    'Describe who your target users are',
                    'Write your complete project idea in the text editor',
                  ].map((instruction, idx) => (
                    <li key={idx} className="flex gap-4">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan/10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                        {idx + 1}
                      </span>
                      <span className="text-text-secondary pt-0.5">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, projectName: e.target.value }))}
                    placeholder="e.g., Task Management App"
                    className="w-full px-4 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Problem Statement *
                  </label>
                  <textarea
                    value={formData.problemStatement}
                    onChange={(e) => setFormData((prev) => ({ ...prev, problemStatement: e.target.value }))}
                    placeholder="What problem does this project solve?"
                    className="w-full h-32 px-4 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Target Users *
                  </label>
                  <textarea
                    value={formData.targetUsers}
                    onChange={(e) => setFormData((prev) => ({ ...prev, targetUsers: e.target.value }))}
                    placeholder="Who will use this project? Describe your target audience."
                    className="w-full h-32 px-4 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Vision (Optional)
                  </label>
                  <textarea
                    value={formData.vision}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vision: e.target.value }))}
                    placeholder="What is the long-term vision for this project?"
                    className="w-full h-24 px-4 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                  />
                </div>

                {/* Rich Text Editor */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Project Idea *
                  </label>
                  <p className="text-xs text-text-secondary mb-3">
                    Write your complete project idea. Minimum 50 characters.
                  </p>
                  <div className="border border-bg-tertiary rounded-lg overflow-hidden">
                    <div className="bg-bg-primary border-b border-bg-tertiary p-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          editor?.isActive('bold')
                            ? 'bg-accent-cyan text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                        }`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          editor?.isActive('italic')
                            ? 'bg-accent-cyan text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                        }`}
                      >
                        I
                      </button>
                      <div className="w-px bg-bg-tertiary" />
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          editor?.isActive('bulletList')
                            ? 'bg-accent-cyan text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                        }`}
                      >
                        Bullet List
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          editor?.isActive('orderedList')
                            ? 'bg-accent-cyan text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                        }`}
                      >
                        Ordered List
                      </button>
                    </div>
                    <EditorContent
                      editor={editor}
                      className="prose-foundry p-4 bg-bg-primary min-h-[16rem] focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[14rem]"
                    />
                  </div>
                  <p
                    className={`text-xs mt-2 ${plainTextLength >= 50 ? 'text-green-500' : 'text-text-secondary'}`}
                  >
                    {plainTextLength} / 50 characters (minimum)
                  </p>
                </div>
              </div>

              {/* Auto-Save Status */}
              {saveStatus !== 'idle' && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    saveStatus === 'saving'
                      ? 'bg-blue-900/20 text-blue-300'
                      : 'bg-green-900/20 text-green-300'
                  }`}
                >
                  {saveStatus === 'saving' && <Loader2 size={16} className="animate-spin" />}
                  {saveStatus === 'saved' && <CheckCircle2 size={16} />}
                  <p className="text-sm font-medium">
                    {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
              {validationError && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{validationError}</p>
                </div>
              )}

              <button
                onClick={handleComplete}
                disabled={isSaving || !isFormValid}
                className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                Save and Complete
              </button>

              <p className="text-sm text-text-secondary mt-4">
                Complete all fields above, then click to save your project idea and unlock Step 1.2.
              </p>

              {isComplete && (
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/1.2`}
                  className="w-full block px-4 py-3 mt-4 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Continue to Step 1.2
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
