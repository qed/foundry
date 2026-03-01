'use client'

import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, FileUp, Eye, Code } from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { completeHelixStep } from '@/lib/helix/actions'
import { extractTextFromFile } from '@/lib/helix/fileProcessing'
import MarkdownRenderer from '@/components/helix/MarkdownRenderer'

interface Step1_3ContentProps {
  step: HelixStep
  projectId: string
  orgSlug: string
}

interface ProjectBrief {
  source: 'paste' | 'file'
  content: string
  fileName?: string
  fileType?: string
  uploadedAt: string
}

export default function Step1_3Content({
  step,
  projectId,
  orgSlug,
}: Step1_3ContentProps) {
  const [briefContent, setBriefContent] = useState<ProjectBrief | null>(
    step.evidence_data as ProjectBrief | null
  )
  const [pastedContent, setPastedContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const validateContent = (content: string): boolean => {
    setValidationError(null)
    if (!content || content.trim().length === 0) {
      setValidationError('Project Brief cannot be empty')
      return false
    }
    if (content.length < 100) {
      setValidationError('Project Brief must be at least 100 characters')
      return false
    }
    return true
  }

  const handlePasteContent = async () => {
    if (!validateContent(pastedContent)) return

    const brief: ProjectBrief = {
      source: 'paste',
      content: pastedContent,
      uploadedAt: new Date().toISOString(),
    }

    try {
      setIsSaving(true)
      setError(null)
      await completeHelixStep(projectId, '1.3', brief, 'Project Brief')
      setBriefContent(brief)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project brief')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setError(null)
      setValidationError(null)
      const text = await extractTextFromFile(file)

      if (!text || text.trim().length === 0) {
        setValidationError(`The file "${file.name}" appears to be empty. Please upload a file with text content.`)
        return
      }

      setPastedContent(text)
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : `Could not read "${file.name}". Please upload a .txt, .md, or .docx file.`)
    }
  }

  if (step.status === 'complete' && briefContent) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-text-primary">1.3 — Save Project Brief</h1>
            <p className="text-text-secondary mt-1">Step 3 of 3 — Planning Stage</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 size={24} className="text-green-500" />
                  <h2 className="text-xl font-semibold text-text-primary">Completed</h2>
                </div>
                <p className="text-sm text-text-secondary mb-6">
                  Project Brief saved on {new Date(briefContent.uploadedAt).toLocaleDateString()}
                </p>
                {briefContent.source === 'file' && (
                  <p className="text-sm text-text-secondary mb-6 flex items-center gap-2">
                    <FileUp size={16} />
                    Uploaded file: {briefContent.fileName}
                  </p>
                )}
                <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6">
                  <div className="prose prose-sm prose-invert max-w-none">
                    <MarkdownRenderer content={briefContent.content} />
                  </div>
                </div>
                <div className="mt-8 p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <p className="text-sm text-green-300">
                    Your Project Brief has been saved and locked. The Planning Stage is now complete.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Planning Complete</h3>
                <p className="text-sm text-text-secondary mb-6">
                  Stage 1 — Planning is now complete. Your project is ready for the next stage.
                </p>
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Back to Helix Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-text-primary">1.3 — Save Project Brief</h1>
          <p className="text-text-secondary mt-1">Step 3 of 3 — Planning Stage</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8 space-y-8">
              {/* Instructions */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Instructions</h2>
                <ol className="space-y-3">
                  {[
                    'Upload your Project Brief document or paste the content below',
                    'Preview the brief in markdown format',
                    'Click "Save Project Brief" to complete the Planning Stage',
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

              {/* Paste Area with Preview Toggle */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Paste Project Brief</h2>
                <div className="mb-3 flex gap-2">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                      !previewMode
                        ? 'bg-accent-cyan text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                    }`}
                  >
                    <Code size={16} />
                    Source
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                      previewMode
                        ? 'bg-accent-cyan text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                    }`}
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                </div>

                {previewMode ? (
                  <div className="border border-bg-tertiary rounded-lg p-6 bg-bg-primary min-h-[16rem]">
                    {pastedContent.length > 0 ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <MarkdownRenderer content={pastedContent} />
                      </div>
                    ) : (
                      <p className="text-text-secondary text-center py-12">
                        Paste your Project Brief to see a preview here
                      </p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={pastedContent}
                    onChange={(e) => {
                      setPastedContent(e.target.value)
                      setValidationError(null)
                    }}
                    placeholder="Paste your Project Brief here (markdown or plain text)..."
                    className="w-full h-64 px-4 py-3 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none font-mono text-sm"
                  />
                )}

                <p
                  className={`text-xs mt-2 ${pastedContent.length >= 100 ? 'text-green-500' : 'text-text-secondary'}`}
                >
                  {pastedContent.length} / 100 characters (minimum)
                </p>
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-4 py-4">
                <div className="flex-1 h-px bg-bg-tertiary" />
                <span className="text-sm text-text-secondary">OR</span>
                <div className="flex-1 h-px bg-bg-tertiary" />
              </div>

              {/* File Upload */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Upload Project Brief</h2>
                <div className="border-2 border-dashed border-bg-tertiary rounded-lg p-6 text-center hover:border-accent-cyan transition-colors">
                  <input
                    type="file"
                    accept=".md,.txt,.markdown,.text,.docx"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                    }}
                    className="hidden"
                    id="file-upload-1-3"
                  />
                  <label htmlFor="file-upload-1-3" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileUp size={32} className="text-text-secondary" />
                    <p className="text-sm font-medium text-text-primary">Click to upload</p>
                    <p className="text-xs text-text-secondary">Text, Markdown, or Word files</p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Save Project Brief</h3>

              {(validationError || error) && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{validationError || error}</p>
                </div>
              )}

              <p className="text-sm text-text-secondary mb-6">
                Upload or paste your Project Brief, then save to complete the Planning Stage.
              </p>

              <button
                onClick={handlePasteContent}
                disabled={isSaving || pastedContent.trim().length === 0 || pastedContent.length < 100}
                className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mb-3"
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Project Brief'}
              </button>

              <p className="text-xs text-text-secondary text-center">Minimum 100 characters required</p>

              <div className="mt-6 pt-6 border-t border-bg-tertiary">
                <p className="text-xs text-text-secondary">
                  The Project Brief will be referenced throughout the project.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
