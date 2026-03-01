'use client'

import React, { useState } from 'react'
import { Copy, CheckCircle2, AlertCircle, Loader2, FileUp, Clipboard } from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { completeHelixStep } from '@/lib/helix/actions'
import { extractTextFromFile } from '@/lib/helix/fileProcessing'

interface Step1_2ContentProps {
  step: HelixStep
  projectId: string
  orgSlug: string
  companyName: string
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
  companyName,
}: Step1_2ContentProps) {
  const existingOutput = step.evidence_data as BrainstormingOutput | null
  const isComplete = step.status === 'complete'

  const [pastedText, setPastedText] = useState(existingOutput?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  const generatePrompt = (): string => {
    const name = companyName || '[Company Name]'
    return `Prompt: ${name} Hackathon Project Brief

Part 1: Business Context
${name} is [Company Description]. Their website is [website]. Before doing anything else, visit their website and learn about their business — what products and services they offer, who their customers are (consumers, businesses, sub-dealers), how their retail and B2B operations work, and what makes them distinctive. Summarize what you learn before proceeding.

Part 2: Hackathon Context
You are creating a project brief for a Helix Hackathon. Here's what that means:

These are Best of the Best hackathons — only teams who have won at least $5,000 at previous hackathons participate.
You will have a team of 4 elite AI-native engineers working for you for a full 30-hour weekend to build something new and useful for your business.
This is Top Gun, and you get to direct the pilots.
The goal is to build a working prototype of real software that delivers immediate, measurable value.
In addition to the 30 hours, you will have access to the engineers for another 90 hours, so make a plan for a full 120-hour project.

Part 3: The Project Brief
I want a project brief for software that will materially improve some part of ${name}'s business. The working title is "${name} Helper".
The brief should specify what ${name} Helper should do, how it would be built, and what questions still need answers.
Work in phases. Wait for my approval before moving to the next phase.
Phase 1 — Discovery: Ask me clarifying questions about ${name}'s operations, pain points, customers, and priorities. Ask whatever you need to write a strong brief. Please ask one question at a time. Do not proceed until I tell you I'm ready to move on.
Phase 2 — Proposal: Based on what you've learned from the website and my answers, propose your recommended approach for what ${name} Helper should do. Explain your reasoning — why this particular problem, why this solution. If you need to, you can propose 2 or 3 potential projects and, again one question at a time, work with me to figure out which one will deliver the biggest ROI.
Phase 3 — Review: Step back and critically review your own proposal. Does it align with my goals? Is the impact meaningful enough to justify building it? Flag any concerns or adjustments.
Phase 4 — Final Brief: Based on your review, write a detailed final project brief containing:

What ${name} Helper does — a clear description of the product and the problem it solves
Who it's for — the specific users within or around ${name}
Key features — what it actually does, in concrete terms
Build plan — steps or phases to build it, including milestones (showing what gets done in the initial 30-hour sprint and what follows in the additional 90 hours)
Tech considerations — any assumptions about stack, integrations, or data
Open questions — things you don't yet know that the team will need to resolve
Success criteria — how we'll know if ${name} Helper is working and delivering value

Put as many details as possible into this brief. It should be specific enough that four strong engineers can read it and start building.`
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

  const handleSubmit = async () => {
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
      setValidationError(null)
      const text = await extractTextFromFile(file)

      if (!text || text.trim().length === 0) {
        setValidationError(`The file "${file.name}" appears to be empty. Please upload a file with text content.`)
        return
      }

      if (text.length < 500) {
        setValidationError(`The file "${file.name}" only contains ${text.length} characters. The brainstorming output must be at least 500 characters.`)
        return
      }

      // Load the file content into the textarea so user can review/edit before submitting
      setPastedText(text)
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : `Could not read "${file.name}". Please upload a .txt, .md, or .docx file.`)
    }
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
                      You can still edit and re-save your brainstorming output.
                    </p>
                  </div>
                </div>
              )}

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
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                    }}
                    className="hidden"
                    id="file-upload-1-2"
                  />
                  <label htmlFor="file-upload-1-2" className="cursor-pointer flex flex-col items-center gap-2">
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
              {(validationError || error) && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{validationError || error}</p>
                </div>
              )}

              {isComplete && (
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/1.3`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Continue to Step 1.3
                </a>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSaving || pastedText.trim().length === 0 || pastedText.length < 500}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isComplete
                    ? 'mt-3 border border-border-default text-text-secondary hover:text-text-primary hover:border-accent-cyan/50'
                    : 'bg-accent-cyan text-white hover:bg-opacity-90'
                }`}
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                {isComplete ? 'Re-save Changes' : 'Save and Complete'}
              </button>

              <p className="text-xs text-text-secondary text-center mt-3">Minimum 500 characters required</p>

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
