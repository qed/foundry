# Phase 074 — Replace Manual Steps 3.1-3.2 With In-App

## Objective
Update Steps 3.1 and 3.2 pages to offer AI-powered build planning (default) or manual workflow, integrate all components into full planning experience, save summary and specs as artifacts, and update gate checks.

## Prerequisites
- Phase 073 — Build Plan Revision Workflow — revision workflow complete

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 074 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Steps 3.1 and 3.2 previously directed users to manually prompt Claude for building brief summary and phase specs, then upload results. This phase integrates the complete AI-powered build planning flow into the Foundry app. Users follow the guided process: epic scoping → phase sizing → summary generation → phase specs → optional revision. Results are saved as artifacts and evidence, completing the gate checks for move to Stage 4.

---

## Detailed Requirements

### 1. Step 3.1 Page Component
#### File: `app/org/[orgSlug]/project/[projectId]/helix/step/3-1/page.tsx` (NEW)
Build Planning Step Page.

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BuildPlanningFlow } from '@/components/helix/build-planning/BuildPlanningFlow';

interface Step3_1PageProps {
  params: {
    orgSlug: string;
    projectId: string;
  };
  searchParams: {
    path?: 'ai' | 'manual';
    sessionId?: string;
  };
}

export default async function Step3_1Page({
  params: { orgSlug, projectId },
  searchParams: { path = 'ai', sessionId },
}: Step3_1PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status')
    .eq('id', projectId)
    .eq('org_slug', orgSlug)
    .single();

  if (!project) redirect('/');

  // Load project brief from Step 1.2 artifact
  const { data: briefArtifact } = await supabase
    .from('helix_artifacts')
    .select('*')
    .eq('project_id', projectId)
    .eq('artifact_type', 'project_brief')
    .single();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Step 3.1 — Build Planning
          </h1>
          <p className="text-slate-600">
            Create a comprehensive build plan with epics, phases, and detailed specifications.
          </p>
        </div>

        {path === 'ai' ? (
          <BuildPlanningFlow
            projectId={projectId}
            projectName={project.name}
            projectBrief={briefArtifact?.content || ''}
            sessionId={sessionId}
            existingPlanArtifactId={null}
          />
        ) : (
          <ManualBuildPlanningPath
            projectId={projectId}
            projectName={project.name}
          />
        )}
      </div>
    </div>
  );
}

function ManualBuildPlanningPath({ projectId, projectName }: any) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Manual Build Planning
      </h2>
      <p className="text-slate-600 mb-4">
        Use your preferred tools or Claude directly to create a building brief summary and phase specifications. Then upload the results below.
      </p>
      {/* File upload form similar to Phase 062 */}
    </div>
  );
}
```

### 2. Build Planning Flow Orchestrator
#### File: `components/helix/build-planning/BuildPlanningFlow.tsx` (NEW)
Orchestrates all build planning phases.

```typescript
'use client';

import { useState } from 'react';
import { EpicScoping } from './EpicScoping';
import { PhaseSizing } from './PhaseSizing';
import { SummaryGeneration } from './SummaryGeneration';
import { PhaseFileGeneration } from './PhaseFileGeneration';
import { RevisionWorkflow } from './RevisionWorkflow';
import { Phase } from '@/lib/helix/build-planning-state';

type BuildPlanStep = 'epic-scoping' | 'phase-sizing' | 'summary' | 'phase-files' | 'revision' | 'complete';

interface BuildPlanningFlowProps {
  projectId: string;
  projectName: string;
  projectBrief: string;
  sessionId?: string;
  existingPlanArtifactId?: string;
}

export function BuildPlanningFlow({
  projectId,
  projectName,
  projectBrief,
  sessionId = '',
  existingPlanArtifactId,
}: BuildPlanningFlowProps) {
  const [step, setStep] = useState<BuildPlanStep>('epic-scoping');
  const [epics, setEpics] = useState<any[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [generatedPhaseFiles, setGeneratedPhaseFiles] = useState<any[]>([]);

  const progressPercent = {
    'epic-scoping': 20,
    'phase-sizing': 40,
    'summary': 60,
    'phase-files': 75,
    'revision': 90,
    'complete': 100,
  }[step];

  const handleEpicsValidated = (validated: any[], state: any) => {
    setEpics(validated);
    setStep('phase-sizing');
  };

  const handlePhasesValidated = (validated: Phase[], state: any) => {
    setPhases(validated);
    setStep('summary');
  };

  const handleSummaryComplete = (summaryContent: string, state: any) => {
    setSummary(summaryContent);
    setStep('phase-files');
  };

  const handleFilesGenerated = (files: any[]) => {
    setGeneratedPhaseFiles(files);
    setStep('revision');
  };

  const handleRevisionComplete = async (finalPhases: Phase[]) => {
    // Save plan to artifacts
    const supabase = await import('@/lib/supabase/client').then(m => m.createClient());

    const planArtifactId = existingPlanArtifactId || `plan_${Date.now()}`;

    // Save summary
    await supabase.from('helix_artifacts').upsert({
      id: planArtifactId,
      project_id: projectId,
      artifact_type: 'building_brief_summary',
      content: summary,
      metadata: {
        epics: epics.length,
        phases: finalPhases.length,
        totalHours: finalPhases.reduce((sum, p) => sum + p.estimatedHours, 0),
      },
    });

    // Save phase specs
    for (const file of generatedPhaseFiles) {
      await supabase.from('helix_artifacts').insert({
        project_id: projectId,
        artifact_type: 'phase_specification',
        content: file.content,
        metadata: {
          phaseNumber: file.number,
          phaseTitle: file.title,
        },
      });
    }

    // Update step evidence
    await supabase.from('helix_step_evidence').upsert({
      project_id: projectId,
      step_id: '3-1',
      status: 'completed',
      artifact_id: planArtifactId,
      evidence_data: {
        epics: epics.length,
        phases: finalPhases.length,
        completedAt: new Date().toISOString(),
      },
    });

    setStep('complete');
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Planning Progress</span>
          <span className="text-sm font-bold text-slate-900">{progressPercent}%</span>
        </div>
        <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 min-h-[600px]">
        {step === 'epic-scoping' && (
          <EpicScoping
            projectId={projectId}
            projectName={projectName}
            projectBrief={projectBrief}
            sessionId={sessionId}
            onEpicsValidated={handleEpicsValidated}
          />
        )}

        {step === 'phase-sizing' && epics.length > 0 && (
          <PhaseSizing
            projectId={projectId}
            projectName={projectName}
            projectBrief={projectBrief}
            epics={epics}
            sessionId={sessionId}
            onPhasesValidated={handlePhasesValidated}
          />
        )}

        {step === 'summary' && phases.length > 0 && (
          <SummaryGeneration
            projectId={projectId}
            projectName={projectName}
            projectBrief={projectBrief}
            epics={epics}
            phases={phases}
            sessionId={sessionId}
            onSummaryComplete={handleSummaryComplete}
          />
        )}

        {step === 'phase-files' && summary && (
          <PhaseFileGeneration
            phases={phases}
            projectName={projectName}
            onFilesGenerated={handleFilesGenerated}
          />
        )}

        {step === 'revision' && generatedPhaseFiles.length > 0 && (
          <RevisionWorkflow
            projectId={projectId}
            projectName={projectName}
            initialPhases={phases}
            sessionId={sessionId}
            onRevisionComplete={handleRevisionComplete}
          />
        )}

        {step === 'complete' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Build Plan Complete!
            </h2>
            <p className="text-slate-600 mb-6">
              Your comprehensive build plan has been saved. You can now proceed to Step 3.2 for detailed phase specifications, or review your plan below.
            </p>
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              View Final Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. Step 3.2 Page Reference
#### File: `app/org/[orgSlug]/project/[projectId]/helix/step/3-2/page.tsx` (REFERENCE)
Step 3.2 mirrors Step 3.1 but focuses on detailed phase specifications review and approval. Implementation identical pattern to Step 3.1.

---

## File Structure
```
app/org/[orgSlug]/project/[projectId]/helix/step/
├── 3-1/
│   └── page.tsx (NEW)
└── 3-2/
    └── page.tsx (REFERENCE - same pattern as 3-1)

components/helix/build-planning/
└── BuildPlanningFlow.tsx (NEW)
```

---

## Dependencies
- All Phase 063-073 components
- React 19+, Supabase

---

## Tech Stack for This Phase
- TypeScript, React Hooks
- Next.js server/client components
- Supabase for persistence

---

## Acceptance Criteria
1. Step 3.1 displays path selector (AI vs manual)
2. AI path launches full planning flow
3. Progress bar updates through all steps
4. Flow completes epic-scoping → phase-sizing → summary → phase-files → revision
5. Summary artifact saved with building_brief_summary type
6. Phase spec artifacts saved with phase_specification type
7. Step evidence updated with status=completed and artifact_id
8. Manual path available as fallback
9. Both paths produce valid artifacts and evidence
10. Step 3.2 mirrors Step 3.1 (reference implementation)

---

## Testing Instructions
1. Navigate to Step 3.1, verify path selector displays
2. Click AI path, verify epic scoping starts
3. Complete epic scoping, verify phases sizing launches
4. Complete phase sizing, verify summary generation starts
5. Complete summary, verify phase files generate
6. Complete phase files, verify revision workflow shown
7. Accept final plan, verify success message
8. Verify artifacts created in helix_artifacts table
9. Verify step evidence updated in helix_step_evidence table
10. Navigate to Step 3.2, verify same pattern available

---

## Notes for the AI Agent
- BuildPlanningFlow orchestrates all sub-components in sequence.
- Progress percentage can be fine-tuned based on user feedback on pace.
- Manual path template can be enhanced with example prompts.
- Step 3.2 can have additional review/approval logic specific to detailed specs.
- Gate checks for move to Stage 4 should validate presence of planning artifacts.
