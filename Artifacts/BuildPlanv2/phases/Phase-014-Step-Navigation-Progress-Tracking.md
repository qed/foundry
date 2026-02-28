# Phase 014 — Step Navigation & Progress Tracking

## Objective
Implement step-level navigation (previous/next buttons), stage progress visualization (X of Y steps complete), overall project progress percentage, breadcrumb navigation, and auto-advance to the next step when completion occurs. These components work together to guide users through the Helix process and provide visual feedback on overall progress.

## Prerequisites
- Phase 009 — Step Detail View Component — required as container for navigation elements
- Phase 010, 011, 012 — Steps 1.1-1.3 — required for testing with completed steps
- Phase 005 — Step Configuration Schema — required to determine step counts per stage
- Phase 008 — Gate Check Engine — required to validate step ordering for navigation

## Epic Context
**Epic:** 2 — Planning Stage (Steps 1.1–1.3)
**Phase:** 014 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
As users work through Helix steps, they need clear navigation paths and progress visibility. The Helix process has 50+ steps across 7+ stages; without good progress indication, users can feel lost. This phase implements:

1. **Breadcrumb Navigation:** Shows the user's path (Helix > Stage 1 — Planning > Step 1.1)
2. **Stage Progress Bar:** Visualizes completion within a stage (e.g., "2 of 3 complete" with bar)
3. **Overall Progress Percentage:** Shows overall project completion across all stages
4. **Previous/Next Buttons:** Navigate between steps with lock status validation
5. **Auto-Advance:** Automatically navigates to the next unlocked step after completion
6. **Progress Persistence:** Reads from helix_steps table to compute progress

---

## Detailed Requirements

### 1. Step Navigation Component
#### File: `components/helix/StepNavigation.tsx` (NEW)
Component for previous/next step navigation buttons.

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAdjacentSteps } from '@/lib/helix/stepNavigation';

interface StepNavigationProps {
  currentStepKey: string;
  currentStepStatus: 'locked' | 'active' | 'complete';
  projectId: string;
  orgSlug: string;
  onNavigate?: (stepKey: string) => void;
}

interface AdjacentStep {
  stepKey: string;
  title: string;
  status: 'locked' | 'active' | 'complete';
}

export default function StepNavigation({
  currentStepKey,
  currentStepStatus,
  projectId,
  orgSlug,
  onNavigate,
}: StepNavigationProps) {
  const router = useRouter();
  const [adjacent, setAdjacent] = useState<{
    prev: AdjacentStep | null;
    next: AdjacentStep | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadAdjacentSteps = async () => {
      try {
        const data = await getAdjacentSteps(projectId, currentStepKey);
        setAdjacent(data);
      } catch (err) {
        setError('Failed to load navigation');
      }
    };

    loadAdjacentSteps();
  }, [projectId, currentStepKey]);

  const handleNavigate = useCallback(
    (stepKey: string, status: string) => {
      if (status === 'locked') {
        setError('This step is locked. Complete the previous step to unlock it.');
        return;
      }

      setLoading(true);
      const url = `/org/${orgSlug}/project/${projectId}/helix/step/${stepKey}`;

      if (onNavigate) {
        onNavigate(stepKey);
      }

      router.push(url);
    },
    [router, projectId, orgSlug, onNavigate]
  );

  if (!adjacent) {
    return null; // Loading state
  }

  const canGoPrev = adjacent.prev !== null && adjacent.prev.status !== 'locked';
  const canGoNext = currentStepStatus === 'complete' && adjacent.next !== null;

  return (
    <div className="mt-12 space-y-4">
      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        {/* Previous Button */}
        <button
          onClick={() =>
            adjacent.prev && handleNavigate(adjacent.prev.stepKey, adjacent.prev.status)
          }
          disabled={!canGoPrev || loading}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            canGoPrev
              ? 'text-accent-cyan hover:bg-cyan-50 cursor-pointer'
              : 'text-text-secondary cursor-not-allowed opacity-50'
          }`}
          title={
            adjacent.prev?.status === 'locked'
              ? 'Complete the previous step to unlock navigation'
              : ''
          }
        >
          <ChevronLeft size={20} />
          <span>
            {adjacent.prev ? `Previous: ${adjacent.prev.title}` : 'No Previous Step'}
          </span>
        </button>

        {/* Step Counter */}
        <div className="text-center">
          <p className="text-sm text-text-secondary">
            Step <span className="font-semibold text-text-primary">{currentStepKey}</span>
          </p>
        </div>

        {/* Next Button */}
        <button
          onClick={() =>
            adjacent.next && handleNavigate(adjacent.next.stepKey, adjacent.next.status)
          }
          disabled={!canGoNext || loading}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            canGoNext
              ? 'text-accent-cyan hover:bg-cyan-50 cursor-pointer'
              : 'text-text-secondary cursor-not-allowed opacity-50'
          }`}
          title={
            !currentStepStatus === 'complete'
              ? 'Complete this step to proceed to the next one'
              : adjacent.next?.status === 'locked'
              ? 'The next step is locked'
              : ''
          }
        >
          <span>
            {adjacent.next ? `Next: ${adjacent.next.title}` : 'No Next Step'}
          </span>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
```

### 2. Progress Bar Component
#### File: `components/helix/ProgressBar.tsx` (NEW)
Stage-level progress visualization component.

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { HelixStep } from '@/types/helix';

interface ProgressBarProps {
  projectId: string;
  stageNumber: number;
  stageName: string;
}

interface StageProgress {
  total: number;
  completed: number;
  percentage: number;
}

export default function ProgressBar({
  projectId,
  stageNumber,
  stageName,
}: ProgressBarProps) {
  const [progress, setProgress] = useState<StageProgress | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `/api/helix/projects/${projectId}/stages/${stageNumber}/progress`
        );
        const data = await response.json();
        setProgress(data);
      } catch (err) {
        console.error('Failed to fetch stage progress:', err);
      }
    };

    fetchProgress();
  }, [projectId, stageNumber]);

  if (!progress) {
    return null;
  }

  const percentage = progress.percentage;
  const isComplete = progress.completed === progress.total;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-text-primary">
          {stageName}
        </h3>
        <p className="text-sm text-text-secondary">
          {progress.completed} of {progress.total} completed
        </p>
      </div>

      <div className="w-full bg-bg-tertiary rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isComplete
              ? 'bg-gradient-to-r from-green-400 to-green-600'
              : 'bg-gradient-to-r from-accent-cyan to-accent-purple'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-text-secondary">
        {percentage.toFixed(0)}% complete
      </p>
    </div>
  );
}
```

### 3. Breadcrumb Navigation Component
#### File: `components/helix/BreadcrumbNav.tsx` (NEW)
Breadcrumb showing navigation path through the Helix process.

```typescript
'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { getStepConfig } from '@/lib/helix/stepConfig';

interface BreadcrumbNavProps {
  orgSlug: string;
  projectId: string;
  stageName: string;
  stageNumber: number;
  stepKey: string;
  stepTitle: string;
}

export default function BreadcrumbNav({
  orgSlug,
  projectId,
  stageName,
  stageNumber,
  stepKey,
  stepTitle,
}: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      <Link
        href={`/org/${orgSlug}/project/${projectId}/helix`}
        className="flex items-center gap-2 text-text-secondary hover:text-accent-cyan transition-colors"
      >
        <Home size={16} />
        <span>Helix</span>
      </Link>

      <ChevronRight size={16} className="text-text-secondary" />

      <span className="text-text-secondary">
        {stageNumber}. {stageName}
      </span>

      <ChevronRight size={16} className="text-text-secondary" />

      <span className="font-medium text-text-primary">
        {stepKey} — {stepTitle}
      </span>
    </nav>
  );
}
```

### 4. Progress Tracking Hook
#### File: `hooks/useHelixProgress.ts` (NEW)
React hook for fetching and computing progress across stages.

```typescript
'use client';

import { useState, useEffect } from 'react';

export interface HelixProgress {
  overall: {
    totalSteps: number;
    completedSteps: number;
    percentage: number;
  };
  byStage: {
    stageNumber: number;
    stageName: string;
    totalSteps: number;
    completedSteps: number;
    percentage: number;
  }[];
}

export function useHelixProgress(projectId: string) {
  const [progress, setProgress] = useState<HelixProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/helix/projects/${projectId}/progress`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }

        const data = await response.json();
        setProgress(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch progress'
        );
        setProgress(null);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProgress();
    }
  }, [projectId]);

  return { progress, loading, error };
}
```

### 5. API Routes for Progress
#### File: `app/api/helix/projects/[projectId]/progress/route.ts` (NEW)
API endpoint for overall project progress.

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();

    // Get all steps for this project
    const { data: steps, error: stepsError } = await supabase
      .from('helix_steps')
      .select('stage_number, status')
      .eq('project_id', params.projectId);

    if (stepsError) {
      return NextResponse.json(
        { error: stepsError.message },
        { status: 500 }
      );
    }

    // Compute overall progress
    const totalSteps = steps?.length || 0;
    const completedSteps = steps?.filter((s) => s.status === 'complete').length || 0;
    const percentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Compute progress by stage
    const stageMap = new Map();
    steps?.forEach((step) => {
      if (!stageMap.has(step.stage_number)) {
        stageMap.set(step.stage_number, { total: 0, completed: 0 });
      }
      const stageData = stageMap.get(step.stage_number);
      stageData.total += 1;
      if (step.status === 'complete') {
        stageData.completed += 1;
      }
    });

    const stageNames = {
      1: 'Planning',
      2: 'Documentation',
      3: 'Architecture',
      4: 'Implementation',
      5: 'Testing',
      6: 'Deployment',
      7: 'Maintenance',
    };

    const byStage = Array.from(stageMap.entries()).map(([stageNumber, data]) => ({
      stageNumber,
      stageName: stageNames[stageNumber as keyof typeof stageNames] || `Stage ${stageNumber}`,
      totalSteps: data.total,
      completedSteps: data.completed,
      percentage: data.total > 0 ? (data.completed / data.total) * 100 : 0,
    }));

    return NextResponse.json({
      overall: {
        totalSteps,
        completedSteps,
        percentage,
      },
      byStage,
    });
  } catch (error) {
    console.error('Progress calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate progress' },
      { status: 500 }
    );
  }
}
```

#### File: `app/api/helix/projects/[projectId]/stages/[stageNumber]/progress/route.ts` (NEW)
API endpoint for stage-level progress.

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; stageNumber: string } }
) {
  try {
    const supabase = createClient();

    const { data: steps, error: stepsError } = await supabase
      .from('helix_steps')
      .select('status')
      .eq('project_id', params.projectId)
      .eq('stage_number', parseInt(params.stageNumber));

    if (stepsError) {
      return NextResponse.json(
        { error: stepsError.message },
        { status: 500 }
      );
    }

    const total = steps?.length || 0;
    const completed = steps?.filter((s) => s.status === 'complete').length || 0;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return NextResponse.json({
      total,
      completed,
      percentage,
    });
  } catch (error) {
    console.error('Stage progress error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate stage progress' },
      { status: 500 }
    );
  }
}
```

### 6. Step Navigation Utility
#### File: `lib/helix/stepNavigation.ts` (NEW)
Helper functions for step navigation logic.

```typescript
import { createClient } from '@/lib/supabase/server';

export async function getAdjacentSteps(projectId: string, currentStepKey: string) {
  const supabase = createClient();

  // Parse current step
  const [currentStage, currentStep] = currentStepKey.split('-').map(Number);

  // Get all steps for this project
  const { data: allSteps } = await supabase
    .from('helix_steps')
    .select('step_key, status')
    .eq('project_id', projectId)
    .order('stage_number, step_number', { ascending: true });

  if (!allSteps) {
    return { prev: null, next: null };
  }

  // Find current index
  const currentIndex = allSteps.findIndex((s) => s.step_key === currentStepKey);
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  // Get previous and next steps
  const prevStep = currentIndex > 0 ? allSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < allSteps.length - 1 ? allSteps[currentIndex + 1] : null;

  // Fetch configs for step titles
  const { getStepConfig } = await import('./stepConfig');

  const prev = prevStep
    ? {
        stepKey: prevStep.step_key,
        title: (await getStepConfig(prevStep.step_key))?.title || prevStep.step_key,
        status: prevStep.status as any,
      }
    : null;

  const next = nextStep
    ? {
        stepKey: nextStep.step_key,
        title: (await getStepConfig(nextStep.step_key))?.title || nextStep.step_key,
        status: nextStep.status as any,
      }
    : null;

  return { prev, next };
}

export async function autoAdvanceStep(projectId: string, completedStepKey: string) {
  const supabase = createClient();

  // Get the next step
  const adjacent = await getAdjacentSteps(projectId, completedStepKey);

  if (adjacent.next && adjacent.next.status === 'active') {
    // Next step is already unlocked, caller can auto-navigate
    return adjacent.next.stepKey;
  }

  return null;
}
```

### 7. Updated Step Page to Include Navigation
#### File: `app/org/[orgSlug]/project/[projectId]/helix/step/[stepKey]/page.tsx` (UPDATED)
Add navigation components to step page layout.

```typescript
// Add these imports
import BreadcrumbNav from '@/components/helix/BreadcrumbNav';
import StepNavigation from '@/components/helix/StepNavigation';
import ProgressBar from '@/components/helix/ProgressBar';

// Update the return statement to wrap StepDetailView:

return (
  <div>
    <div className="max-w-7xl mx-auto px-6 pt-6">
      <BreadcrumbNav
        orgSlug={orgSlug}
        projectId={projectId}
        stageName={stageConfig.stageName}
        stageNumber={step.stage_number}
        stepKey={stepKey}
        stepTitle={stepConfig.title}
      />

      <ProgressBar
        projectId={projectId}
        stageNumber={step.stage_number}
        stageName={stageConfig.stageName}
      />
    </div>

    <StepDetailView
      step={step as HelixStep}
      stepKey={stepKey}
      onComplete={async (evidence: any) => {
        'use server';
        // ... existing completion logic ...
      }}
      onNavigate={async (direction: string) => {
        'use server';
        // ... existing navigation logic ...
      }}
    />

    <div className="max-w-7xl mx-auto px-6 pb-12">
      <StepNavigation
        currentStepKey={stepKey}
        currentStepStatus={step.status}
        projectId={projectId}
        orgSlug={orgSlug}
      />
    </div>
  </div>
);
```

---

## File Structure

```
components/
  helix/
    StepNavigation.tsx (NEW)
    ProgressBar.tsx (NEW)
    BreadcrumbNav.tsx (NEW)
    StepDetailView.tsx (UPDATED - integrate nav components)

hooks/
  useHelixProgress.ts (NEW)

lib/
  helix/
    stepNavigation.ts (NEW)

app/
  api/
    helix/
      projects/
        [projectId]/
          progress/
            route.ts (NEW)
          stages/
            [stageNumber]/
              progress/
                route.ts (NEW)
  org/
    [orgSlug]/
      project/
        [projectId]/
          helix/
            step/
              [stepKey]/
                page.tsx (UPDATED)
```

---

## Dependencies
```json
{
  "lucide-react": "^0.263.1",
  "@supabase/supabase-js": "^2.38.0",
  "next": "^16.0.0"
}
```

---

## Tech Stack for This Phase
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 with CSS variables
- **State Management:** React hooks (useState, useEffect)
- **Database:** Supabase
- **Icons:** lucide-react

---

## Acceptance Criteria

1. Breadcrumb navigation displays path: Helix > Stage X — Name > Step X.Y — Title
2. Stage progress bar shows X of Y steps complete with percentage
3. Progress bar color changes to green when stage is 100% complete
4. Overall progress percentage displays correctly across all stages
5. Previous button is disabled if previous step is locked or doesn't exist
6. Next button is disabled until current step is marked complete
7. Next button is disabled if next step is locked
8. Clicking next navigates to the next step after current step completion
9. Progress data persists on page reload (reads from database)
10. Auto-advance happens automatically after step completion (user sees redirect)

---

## Testing Instructions

1. Navigate to Step 1.1 in an active Helix project
2. Verify breadcrumb shows: Helix > 1. Planning > 1-1 — Define Project Idea
3. Check stage progress bar shows 0 of 3 complete with 0% progress
4. Verify previous button is disabled (no previous step)
5. Verify next button is disabled (current step not complete)
6. Complete Step 1.1 and verify next button becomes enabled
7. Click next button and verify navigation to Step 1.2
8. Go back to Step 1.1 and verify breadcrumb updated
9. Verify stage progress shows 1 of 3 complete after Step 1.1 completion
10. Complete Step 1.3 and verify stage progress shows 3 of 3 complete (100%, bar is green)

---

## Notes for the AI Agent

- The breadcrumb "Helix" link should navigate to the main Helix dashboard
- Stage and overall progress are computed server-side from helix_steps table; keep API calls efficient
- Progress percentage should round to whole numbers (use toFixed(0))
- The gradient bar colors (cyan to purple) should match CSS variables
- Auto-advance is handled by the step completion server action; navigation happens via router.push()
- Previous/next button labels should show the actual step title from step configuration
- Disabled buttons should have opacity-50 and cursor-not-allowed
- Progress bars should animate smoothly with transition-all duration-300
- The step navigation hook (useHelixProgress) should work for fetching overall and stage-level progress
- Breadcrumbs should be visible on all step detail pages for consistent navigation context
