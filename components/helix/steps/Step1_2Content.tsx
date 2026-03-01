'use client'

import React, { useState } from 'react'
import { Copy, CheckCircle2, AlertCircle, Loader2, Clipboard } from 'lucide-react'
import type { HelixStep } from '@/types/database'
import { completeHelixStep } from '@/lib/helix/actions'
import StepHeaderNav from '@/components/helix/StepHeaderNav'

interface Step1_2ContentProps {
  step: HelixStep
  projectId: string
  orgSlug: string
  companyName: string
}

export default function Step1_2Content({
  step,
  projectId,
  orgSlug,
  companyName,
}: Step1_2ContentProps) {
  const isComplete = step.status === 'complete'

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  const handleMarkComplete = async () => {
    try {
      setIsSaving(true)
      setError(null)
      await completeHelixStep(projectId, '1.2', { prompt: promptText, completedAt: new Date().toISOString() }, 'Brainstorming Prompt')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark step as complete')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">1.2 — Brainstorming Prompt</h1>
            <p className="text-text-secondary mt-1">Step 2 of 3 — Planning Stage</p>
          </div>
          <StepHeaderNav stepKey="1.2" orgSlug={orgSlug} projectId={projectId} />
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
                      You can revisit this prompt at any time.
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
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {isComplete ? (
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/1.3`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Continue to Step 1.3
                </a>
              ) : (
                <button
                  onClick={handleMarkComplete}
                  disabled={isSaving}
                  className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={20} className="animate-spin" />}
                  {isSaving ? 'Saving...' : 'Mark as Complete'}
                </button>
              )}

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
