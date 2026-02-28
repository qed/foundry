# Phase 062 — Replace Manual Step 1.2 With In-App

## Objective
Update Step 1.2 page to offer AI brainstorming or manual prompt workflow, integrate all brainstorming components into unified workflow, save brief as artifact, and update gate checks.

## Prerequisites
- Phase 061 — Brainstorming Session Persistence — all brainstorming features complete

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 062 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Step 1.2 previously directed users to manually run brainstorming prompt in Claude Chat, copy the result, and paste back as evidence. This phase integrates the complete 4-phase brainstorming flow into the Foundry app, offering AI as the default path with manual workflow as fallback. When users complete brainstorming, the generated brief is saved as an artifact (attachment to step), and the gate check validates completion automatically.

---

## Detailed Requirements

### 1. Step 1.2 Page Component
#### File: `app/org/[orgSlug]/project/[projectId]/helix/step/1-2/page.tsx` (UPDATED)
Main step page integrating both AI and manual paths.

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BrainstormingWorkflow } from '@/components/helix/brainstorming/BrainstormingWorkflow';
import { ManualBrainstormingPath } from '@/components/helix/brainstorming/ManualBrainstormingPath';

interface Step1_2PageProps {
  params: {
    orgSlug: string;
    projectId: string;
  };
  searchParams: {
    path?: 'ai' | 'manual';
    sessionId?: string;
  };
}

export default async function Step1_2Page({
  params: { orgSlug, projectId },
  searchParams: { path = 'ai', sessionId },
}: Step1_2PageProps) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // Fetch project and step evidence
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, name, description, status')
    .eq('id', projectId)
    .eq('org_slug', orgSlug)
    .single();

  if (projError || !project) {
    redirect('/');
  }

  const { data: stepEvidence } = await supabase
    .from('helix_step_evidence')
    .select('*')
    .eq('project_id', projectId)
    .eq('step_id', '1-2')
    .single();

  const briefArtifactId = stepEvidence?.artifact_id || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Step 1.2 — Brainstorm & Ideate
          </h1>
          <p className="text-slate-600">
            Develop your project idea with AI assistance or manually using your
            preferred tools.
          </p>
        </div>

        {/* Path Selection or Active Path */}
        {path === 'ai' ? (
          <BrainstormingWorkflow
            projectId={projectId}
            projectName={project.name}
            projectDescription={project.description}
            sessionId={sessionId}
            existingBriefArtifactId={briefArtifactId}
            onBriefSaved={async (briefContent) => {
              // Save brief as artifact (handled in component)
              console.log('Brief saved:', briefContent);
            }}
          />
        ) : path === 'manual' ? (
          <ManualBrainstormingPath
            projectId={projectId}
            projectName={project.name}
            existingBriefArtifactId={briefArtifactId}
          />
        ) : (
          // Path selector
          <PathSelector projectId={projectId} />
        )}
      </div>
    </div>
  );
}

function PathSelector({ projectId }: { projectId: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* AI Path Option */}
      <div className="border-2 border-blue-300 rounded-lg p-6 bg-blue-50 hover:bg-blue-100 transition cursor-pointer">
        <a
          href={`?path=ai`}
          className="block group"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚡</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-blue-900 group-hover:text-blue-700">
                AI-Powered Brainstorming
              </h2>
              <p className="text-sm text-blue-700 mt-2">
                Let Claude guide you through a structured 4-phase brainstorming
                process: discovery, proposal, review, and final brief.
              </p>
              <div className="mt-4 space-y-1 text-xs text-blue-600">
                <p>✓ Adaptive questioning</p>
                <p>✓ Real-time proposal generation</p>
                <p>✓ Self-review & validation</p>
                <p>✓ Comprehensive brief output</p>
              </div>
            </div>
          </div>
        </a>
      </div>

      {/* Manual Path Option */}
      <div className="border-2 border-slate-300 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
        <a
          href={`?path=manual`}
          className="block group"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">📝</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-slate-700">
                Manual Brainstorming
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Use your preferred brainstorming tool (Google Docs, Notion,
                FigJam) or Claude directly, then upload your results here.
              </p>
              <div className="mt-4 space-y-1 text-xs text-slate-600">
                <p>✓ Use any tool</p>
                <p>✓ Work offline</p>
                <p>✓ Upload existing documents</p>
                <p>✓ Copy-paste from Claude Chat</p>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
```

### 2. Brainstorming Workflow Component
#### File: `components/helix/brainstorming/BrainstormingWorkflow.tsx` (NEW)
Orchestrates all 4 phases and brief finalization.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SessionHistory } from './SessionHistory';
import { DiscoveryPhase } from './DiscoveryPhase';
import { ProposalPhase } from './ProposalPhase';
import { ReviewPhase } from './ReviewPhase';
import { FinalBriefPhase } from './FinalBriefPhase';
import { BriefEditor } from './BriefEditor';
import { useChatSession } from '@/hooks/useChatSession';

type WorkflowStep = 'session-select' | 'discovery' | 'proposal' | 'review' | 'brief' | 'edit' | 'complete';

interface BrainstormingWorkflowProps {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  sessionId?: string;
  existingBriefArtifactId?: string;
  onBriefSaved?: (briefContent: string) => void;
}

export function BrainstormingWorkflow({
  projectId,
  projectName,
  projectDescription,
  sessionId: initialSessionId,
  existingBriefArtifactId,
  onBriefSaved,
}: BrainstormingWorkflowProps) {
  const [step, setStep] = useState<WorkflowStep>('session-select');
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    initialSessionId
  );
  const [fullContext, setFullContext] = useState<any>(null);
  const [generatedBrief, setGeneratedBrief] = useState<string | null>(null);
  const [finalBrief, setFinalBrief] = useState<string | null>(null);

  const { sessionId } = useChatSession({
    projectId,
    stepId: '1-2',
    sessionId: currentSessionId,
    phaseName: 'Brainstorming',
  });

  const handleSessionContinue = (session: any) => {
    setCurrentSessionId(session.id);
    setStep(session.phase);
    setFullContext(session.phaseState);
  };

  const handleNewSession = () => {
    setCurrentSessionId(undefined);
    setStep('discovery');
    setFullContext(null);
  };

  const handleDiscoveryComplete = (state: any) => {
    setFullContext(state);
    setStep('proposal');
  };

  const handleProposalComplete = (state: any) => {
    setFullContext(state);
    setStep('review');
  };

  const handleReviewComplete = (state: any) => {
    setFullContext(state);
    setStep('brief');
  };

  const handleBriefComplete = (briefContent: string, state: any) => {
    setGeneratedBrief(briefContent);
    setFullContext(state);
    setStep('edit');
  };

  const handleBriefEditorSave = async (editedBrief: string) => {
    setFinalBrief(editedBrief);

    // Save brief to step artifact
    const supabase = await createClient();
    const artifactId = existingBriefArtifactId || `artifact_${Date.now()}`;

    await supabase.from('helix_artifacts').upsert({
      id: artifactId,
      project_id: projectId,
      artifact_type: 'project_brief',
      content: editedBrief,
      metadata: {
        generatedAt: new Date().toISOString(),
        phase: 'brainstorming',
      },
    });

    // Update step evidence
    await supabase.from('helix_step_evidence').upsert({
      project_id: projectId,
      step_id: '1-2',
      status: 'completed',
      artifact_id: artifactId,
      evidence_data: {
        sessionId,
        briefVersion: 1,
        completedAt: new Date().toISOString(),
      },
    });

    setStep('complete');
    if (onBriefSaved) {
      onBriefSaved(editedBrief);
    }
  };

  const progressPercent = {
    'session-select': 0,
    'discovery': 20,
    'proposal': 40,
    'review': 60,
    'brief': 80,
    'edit': 90,
    'complete': 100,
  }[step];

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">
            Brainstorming Progress
          </span>
          <span className="text-sm font-bold text-slate-900">{progressPercent}%</span>
        </div>
        <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 min-h-[600px]">
        {step === 'session-select' && (
          <SessionHistory
            projectId={projectId}
            stepId="1-2"
            phaseName="Brainstorming"
            onContinueSession={handleSessionContinue}
            onNewSession={handleNewSession}
          />
        )}

        {step === 'discovery' && (
          <DiscoveryPhase
            projectId={projectId}
            projectName={projectName}
            projectDescription={projectDescription}
            sessionId={currentSessionId || sessionId || ''}
            onPhaseComplete={handleDiscoveryComplete}
          />
        )}

        {step === 'proposal' && fullContext && (
          <ProposalPhase
            projectId={projectId}
            projectName={projectName}
            discoveryState={fullContext}
            sessionId={currentSessionId || sessionId || ''}
            onPhaseComplete={handleProposalComplete}
          />
        )}

        {step === 'review' && fullContext && (
          <ReviewPhase
            projectId={projectId}
            projectName={projectName}
            proposalState={fullContext}
            sessionId={currentSessionId || sessionId || ''}
            onPhaseComplete={handleReviewComplete}
          />
        )}

        {step === 'brief' && fullContext && (
          <FinalBriefPhase
            projectId={projectId}
            projectName={projectName}
            fullContext={fullContext}
            sessionId={currentSessionId || sessionId || ''}
            onBriefComplete={handleBriefComplete}
          />
        )}

        {step === 'edit' && generatedBrief && (
          <BriefEditor
            aiGeneratedBrief={generatedBrief}
            projectName={projectName}
            onSave={handleBriefEditorSave}
            onCancel={() => setStep('brief')}
          />
        )}

        {step === 'complete' && finalBrief && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Brainstorming Complete!
            </h2>
            <p className="text-slate-600 mb-6">
              Your project brief has been saved and you can now proceed to the
              next steps.
            </p>
            <button
              onClick={() => setStep('session-select')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Start Another Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. Manual Brainstorming Path
#### File: `components/helix/brainstorming/ManualBrainstormingPath.tsx` (NEW)
Fallback for users preferring manual workflow.

```typescript
'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';

const BRAINSTORMING_PROMPT = `# Project Brainstorming Prompt

You are a project brainstorming specialist. Help me develop my project idea through a structured conversation.

## Discovery Phase
Ask me 5-8 clarifying questions about:
1. What is the core purpose and desired outcomes?
2. Who are the primary users and their pain points?
3. What features or capabilities are needed?
4. What technical or business constraints exist?
5. What is the success criteria and timeline?

## Proposal Phase
Synthesize my answers into a recommended approach with:
- Understanding of the project
- Recommended approach
- Key components
- Rationale
- Alternatives (if applicable)

## Review Phase
Critically review the proposal against:
- Alignment with goals
- Feasibility
- Completeness
- Risks
- Clarity

## Final Brief Phase
Generate a comprehensive brief with sections:
- What (overview)
- Who (users/stakeholders)
- Features & Scope
- Build Plan Overview
- Tech Stack Assumptions
- Success Criteria
- Open Questions
- Next Steps

Start with the discovery phase.`;

interface ManualBrainstormingPathProps {
  projectId: string;
  projectName: string;
  existingBriefArtifactId?: string;
}

export function ManualBrainstormingPath({
  projectId,
  projectName,
  existingBriefArtifactId,
}: ManualBrainstormingPathProps) {
  const [briefContent, setBriefContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(BRAINSTORMING_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveBrief = async () => {
    if (!briefContent.trim()) {
      alert('Please paste your brainstorming results');
      return;
    }

    setIsSaving(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = await createClient();

      const artifactId = existingBriefArtifactId || `artifact_${Date.now()}`;

      await supabase.from('helix_artifacts').upsert({
        id: artifactId,
        project_id: projectId,
        artifact_type: 'project_brief',
        content: briefContent,
        metadata: {
          createdAt: new Date().toISOString(),
          source: 'manual',
        },
      });

      await supabase.from('helix_step_evidence').upsert({
        project_id: projectId,
        step_id: '1-2',
        status: 'completed',
        artifact_id: artifactId,
        evidence_data: { completedAt: new Date().toISOString() },
      });

      alert('Brief saved successfully!');
      setBriefContent('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-2">Manual Workflow</h2>
        <p className="text-sm text-blue-700">
          Copy the prompt below, run it in Claude Chat or your tool of choice,
          then paste the results back here.
        </p>
      </div>

      {/* Prompt Display & Copy */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">
            Brainstorming Prompt
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
        </div>
        <pre className="p-4 bg-white text-xs overflow-auto max-h-64 text-slate-700">
          {BRAINSTORMING_PROMPT}
        </pre>
      </div>

      {/* Results Input */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Paste Your Brainstorming Results
        </label>
        <textarea
          value={briefContent}
          onChange={(e) => setBriefContent(e.target.value)}
          placeholder="Paste the output from Claude Chat or your brainstorming tool here..."
          rows={10}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveBrief}
        disabled={!briefContent.trim() || isSaving}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Brainstorming Results'}
      </button>
    </div>
  );
}
```

---

## File Structure
```
app/org/[orgSlug]/project/[projectId]/helix/step/1-2/
└── page.tsx (UPDATED)

components/helix/brainstorming/
├── BrainstormingWorkflow.tsx (NEW)
├── ManualBrainstormingPath.tsx (NEW)
└── [all previous phase components]
```

---

## Dependencies
- React 19+ (all previous components)
- Supabase client for artifact storage
- All Phase 053-061 components and utilities

---

## Tech Stack for This Phase
- Next.js server/client components
- React Hooks
- Supabase for persistence
- Tailwind CSS

---

## Acceptance Criteria
1. Step 1.2 page displays path selector with AI and manual options
2. AI path launches full 4-phase brainstorming workflow
3. Manual path displays copyable prompt and textarea for results
4. BrainstormingWorkflow progresses through discovery → proposal → review → brief → edit → complete
5. Progress bar updates (0%, 20%, 40%, 60%, 80%, 90%, 100%)
6. SessionHistory allows continuing or starting new session
7. Final brief is saved to helix_artifacts table with artifact_type='project_brief'
8. Step evidence is updated with status='completed' and artifact_id
9. Manual path allows copy prompt and paste results
10. Both paths produce valid artifact saved to same location

---

## Testing Instructions
1. Navigate to Step 1.2, verify path selector displays with AI and manual options
2. Click AI path, verify workflow starts at discovery phase
3. Complete discovery (5+ messages), verify advance button appears
4. Complete proposal, review, brief phases in sequence
5. Edit brief in editor, verify changes persist and save
6. Verify artifact created in helix_artifacts table
7. Verify step evidence updated in helix_step_evidence table
8. Test manual path, verify prompt displays and copy button works
9. Paste results in textarea, click save, verify artifact created
10. Return to Step 1.2, verify both paths produce valid completed evidence

---

## Notes for the AI Agent
- The BrainstormingWorkflow uses useSessionState hook for session management.
- Manual path provides the original workflow as a fallback for users who prefer external tools.
- Progress bar can be enhanced with phase names in tooltips.
- Consider adding a "Save Draft" option for paused workflows before Phase 062 completion.
- Gate checks in Step 2.1 should validate presence of artifact_id in helix_step_evidence.
