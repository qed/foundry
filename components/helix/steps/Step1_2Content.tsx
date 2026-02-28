'use client'

import React, { useState } from 'react'
import { Copy, CheckCircle2, AlertCircle, Loader2, FileUp, Clipboard } from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { completeHelixStep } from '@/lib/helix/actions'

interface Step1_2ContentProps {
  step: HelixStep
  projectId: string
  orgSlug: string
  projectIdea: string
}

interface BrainstormingOutput {
  source: 'paste' | 'file'
  content: string
  fileName?: string
  uploadedAt: string
}

export default function Step1_2Content({
  step,
  projectId,
  orgSlug,
  projectIdea,
}: Step1_2ContentProps) {
  const [brainstormingOutput, setBrainstormingOutput] = useState<BrainstormingOutput | null>(
    step.evidence_data as BrainstormingOutput | null
  )
  const [pastedText, setPastedText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  const generatePrompt = (): string => {
    return `# Helix Brainstorming Prompt

## Project Context
**Project Name:** ${projectIdea}

---

## Instructions
You are facilitating a structured brainstorming session for this project. Follow the 4-phase process below:

### Phase 1: Problem Deep Dive
1. Expand on the core problem statement
2. Identify pain points and user frustrations
3. Explore root causes
4. Define success criteria for solving this problem

### Phase 2: Solution Exploration
1. Brainstorm 5-10 potential solution approaches
2. Evaluate pros/cons of each approach
3. Identify constraints and dependencies
4. Recommend the most promising approach

### Phase 3: User & Market Research
1. Define detailed user personas
2. Describe user workflows and jobs-to-be-done
3. Analyze competitive landscape
4. Identify market opportunities and threats

### Phase 4: Project Brief Synthesis
1. Summarize the findings from Phases 1-3
2. Define the project scope and goals
3. Outline key features and requirements
4. Create a 1-2 paragraph executive summary

---

## Expected Output Format

After completing all 4 phases, provide a comprehensive Project Brief that includes:

**Executive Summary**
(1-2 paragraphs)

**Problem Statement**
(expanded from the original)

**Target Users & Personas**
(detailed descriptions)

**Solution Overview**
(recommended approach with justification)

**Key Features & Requirements**
(prioritized list)

**Success Metrics**
(how we'll measure success)

**Market & Competitive Analysis**
(landscape overview)

**Next Steps**
(recommended actions for project definition stage)

---

## How to Use This Prompt
1. Copy the entire prompt above
2. Go to Claude Chat (https://claude.ai)
3. Create a new conversation
4. Paste the prompt
5. Allow Claude to work through all 4 phases
6. Copy the final Project Brief back to Foundry
`
  }

  const promptText = generatePrompt()

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch {
      setError('Failed to copy prompt to clipboard')
    }
  }

  const validateOutput = (text: string): boolean => {
    setValidationError(null)
    if (!text || text.trim().length === 0) {
      setValidationError('Output cannot be empty')
      return false
    }
    if (text.length < 500) {
      setValidationError('Output must be at least 500 characters')
      return false
    }
    return true
  }

  const handlePasteOutput = async () => {
    if (!validateOutput(pastedText)) return

    const output: BrainstormingOutput = {
      source: 'paste',
      content: pastedText,
      uploadedAt: new Date().toISOString(),
    }

    try {
      setIsSaving(true)
      setError(null)
      await completeHelixStep(projectId, '1.2', output, 'Brainstorming Output')
      setBrainstormingOutput(output)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brainstorming output')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setError(null)
      const text = await file.text()
      if (!validateOutput(text)) return

      const output: BrainstormingOutput = {
        source: 'file',
        content: text,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      }

      setIsSaving(true)
      await completeHelixStep(projectId, '1.2', output, 'Brainstorming Output')
      setBrainstormingOutput(output)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process uploaded file')
    } finally {
      setIsSaving(false)
    }
  }

  if (step.status === 'complete' && brainstormingOutput) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-text-primary">1.2 — Brainstorming Prompt</h1>
            <p className="text-text-secondary mt-1">Step 2 of 3 — Planning Stage</p>
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
                  Brainstorming output received on{' '}
                  {new Date(brainstormingOutput.uploadedAt).toLocaleDateString()}
                </p>
                {brainstormingOutput.source === 'file' && (
                  <p className="text-sm text-text-secondary mb-6 flex items-center gap-2">
                    <FileUp size={16} />
                    Uploaded file: {brainstormingOutput.fileName}
                  </p>
                )}
                <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6 max-h-96 overflow-y-auto">
                  <div className="prose prose-sm prose-invert max-w-none text-text-secondary whitespace-pre-wrap">
                    {brainstormingOutput.content}
                  </div>
                </div>
                <div className="mt-8 p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <p className="text-sm text-green-300">
                    Your brainstorming output has been saved and locked.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Next Steps</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Step 1.2 is complete. Your brainstorming output is saved.
                </p>
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/1.3`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Continue to Step 1.3
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
          <h1 className="text-2xl font-bold text-text-primary">1.2 — Brainstorming Prompt</h1>
          <p className="text-text-secondary mt-1">Step 2 of 3 — Planning Stage</p>
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
                    'Click "Copy Prompt" to copy the brainstorming prompt',
                    'Open Claude Chat (https://claude.ai) in a new tab',
                    'Paste the prompt and follow Claude\'s guidance through all 4 phases',
                    'Copy the final Project Brief and paste it back here',
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

              {/* Prompt Display */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Brainstorming Prompt</h2>
                <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6 max-h-96 overflow-y-auto mb-4">
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                    {promptText}
                  </pre>
                </div>
                <button
                  onClick={copyPromptToClipboard}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    copiedToClipboard
                      ? 'bg-green-900/30 text-green-300'
                      : 'bg-accent-cyan text-white hover:bg-opacity-90'
                  }`}
                >
                  {copiedToClipboard ? (
                    <>
                      <CheckCircle2 size={18} />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 py-4">
                <div className="flex-1 h-px bg-bg-tertiary" />
                <span className="text-sm text-text-secondary">PASTE OUTPUT BELOW</span>
                <div className="flex-1 h-px bg-bg-tertiary" />
              </div>

              {/* Paste Output */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Paste Brainstorming Output
                </h2>
                <p className="text-sm text-text-secondary mb-3">
                  After completing the brainstorming in Claude Chat, paste the final Project Brief here.
                </p>
                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value)
                    setValidationError(null)
                  }}
                  placeholder="Paste the Project Brief from Claude Chat here (minimum 500 characters)..."
                  className="w-full h-64 px-4 py-3 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                />
                <p
                  className={`text-xs mt-2 ${pastedText.length >= 500 ? 'text-green-500' : 'text-text-secondary'}`}
                >
                  {pastedText.length} / 500 characters (minimum)
                </p>
              </div>

              {/* File Upload */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Or Upload a File</h2>
                <div className="border-2 border-dashed border-bg-tertiary rounded-lg p-6 text-center hover:border-accent-cyan transition-colors">
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                    }}
                    className="hidden"
                    id="file-upload-1-2"
                  />
                  <label htmlFor="file-upload-1-2" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileUp size={32} className="text-text-secondary" />
                    <p className="text-sm font-medium text-text-primary">Click to upload</p>
                    <p className="text-xs text-text-secondary">Markdown or Text files</p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Submit Output</h3>

              {(validationError || error) && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{validationError || error}</p>
                </div>
              )}

              <p className="text-sm text-text-secondary mb-6">
                Paste your brainstorming output or upload a file, then submit.
              </p>

              <button
                onClick={handlePasteOutput}
                disabled={isSaving || pastedText.trim().length === 0 || pastedText.length < 500}
                className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mb-3"
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                {isSaving ? 'Submitting...' : 'Submit Pasted Output'}
              </button>

              <p className="text-xs text-text-secondary text-center">Minimum 500 characters required</p>

              <div className="mt-6 pt-6 border-t border-bg-tertiary">
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-70 transition-all justify-center"
                >
                  <Clipboard size={16} />
                  Open Claude Chat
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
