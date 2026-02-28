# Phase 002 — Mode Context Provider & Toggle

## Objective
Implement the Helix Mode context provider and UI toggle mechanism, allowing projects to switch between Open Mode (v1) and Helix Mode (v2). This establishes the central state management for mode switching and makes the toggle accessible in the project layout.

## Prerequisites
- Phase 001 — Helix Mode Database Migration — database tables and columns in place

## Epic Context
**Epic:** 1 — Foundation & Mode Infrastructure
**Phase:** 002 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The mode context is the glue between the database and the UI. It tracks whether a project is in Open or Helix Mode, provides the current stage and step, and handles mode toggling with persistence to the database. The toggle UI component sits in the project header and allows users to switch modes. Visual indicators show the current mode and provide immediate feedback.

All Helix-specific UI will consume this context to determine whether to show v1 module navigation or Helix stage navigation.

---

## Detailed Requirements

### 1. Create Helix Mode Context Provider
#### File: `src/contexts/HelixModeContext.tsx` (NEW)
Create the context and provider component for managing Helix Mode state.

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectSteps, getProjectStageGates } from '@/lib/db/helix';
import { HelixStep, HelixStageGate } from '@/lib/db/helix';

interface HelixModeContextType {
  isHelixMode: boolean;
  isLoading: boolean;
  toggleMode: () => Promise<void>;
  currentStage: number | null;
  currentStep: HelixStep | null;
  allSteps: HelixStep[];
  stageGates: HelixStageGate[];
  stageProgress: Map<number, { completed: number; total: number }>;
  canToggleMode: boolean;
  toggleError: string | null;
}

const HelixModeContext = createContext<HelixModeContextType | undefined>(
  undefined
);

export function HelixModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { project } = useProject();
  const { user } = useAuth();

  const [isHelixMode, setIsHelixMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allSteps, setAllSteps] = useState<HelixStep[]>([]);
  const [stageGates, setStageGates] = useState<HelixStageGate[]>([]);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Load mode and steps when project changes
  useEffect(() => {
    if (!project) {
      setIsLoading(false);
      return;
    }

    async function loadData() {
      try {
        setIsLoading(true);
        setToggleError(null);

        // Get current project mode from projects table
        const modeResponse = await fetch(
          `/api/projects/${project.id}/mode`
        );
        if (!modeResponse.ok) throw new Error('Failed to fetch mode');
        const { mode } = await modeResponse.json();
        setIsHelixMode(mode === 'helix');

        // Load helix data if in helix mode
        if (mode === 'helix') {
          const steps = await getProjectSteps(project.id);
          const gates = await getProjectStageGates(project.id);
          setAllSteps(steps);
          setStageGates(gates);
        }
      } catch (error) {
        console.error('Failed to load Helix Mode data:', error);
        setToggleError('Failed to load mode settings');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [project]);

  const toggleMode = async () => {
    if (!project || !user) return;

    try {
      setToggleError(null);
      const newMode = isHelixMode ? 'open' : 'helix';

      const response = await fetch(`/api/projects/${project.id}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });

      if (!response.ok) throw new Error('Failed to toggle mode');

      const { mode } = await response.json();
      setIsHelixMode(mode === 'helix');

      // Initialize helix data if switching to helix mode
      if (mode === 'helix' && allSteps.length === 0) {
        const steps = await getProjectSteps(project.id);
        const gates = await getProjectStageGates(project.id);
        setAllSteps(steps);
        setStageGates(gates);
      }
    } catch (error) {
      console.error('Failed to toggle mode:', error);
      setToggleError('Failed to change mode. Please try again.');
    }
  };

  // Calculate current stage and step
  const currentStep = allSteps.find((step) => step.status === 'active') || null;
  const currentStage = currentStep?.stage_number || null;

  // Calculate progress per stage
  const stageProgress = new Map<number, { completed: number; total: number }>();
  for (let i = 1; i <= 8; i++) {
    const stepsInStage = allSteps.filter((s) => s.stage_number === i);
    const completed = stepsInStage.filter((s) => s.status === 'complete').length;
    stageProgress.set(i, {
      completed,
      total: stepsInStage.length,
    });
  }

  // Can only toggle if all helix steps are complete or still in stage 1
  const canToggleMode =
    !isHelixMode || currentStage === null || currentStage === 1;

  const value: HelixModeContextType = {
    isHelixMode,
    isLoading,
    toggleMode,
    currentStage,
    currentStep,
    allSteps,
    stageGates,
    stageProgress,
    canToggleMode,
    toggleError,
  };

  return (
    <HelixModeContext.Provider value={value}>
      {children}
    </HelixModeContext.Provider>
  );
}

export function useHelixMode() {
  const context = useContext(HelixModeContext);
  if (!context) {
    throw new Error('useHelixMode must be used within HelixModeProvider');
  }
  return context;
}
```

### 2. Create Mode Toggle Component
#### File: `src/components/HelixModeToggle.tsx` (NEW)
Create a toggle switch component for switching between modes, with visual indicators.

```typescript
'use client';

import { useState } from 'react';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function HelixModeToggle() {
  const { isHelixMode, toggleMode, canToggleMode, toggleError, isLoading } =
    useHelixMode();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggleClick = () => {
    if (isHelixMode) {
      // Show confirmation when switching away from Helix Mode
      setShowConfirm(true);
    } else {
      // Direct toggle to Helix Mode
      toggleMode();
    }
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    await toggleMode();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Mode Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isHelixMode ? 'bg-accent-cyan' : 'bg-gray-400'
          }`}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isHelixMode ? 'Helix Mode' : 'Open Mode'}
        </span>
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleToggleClick}
        disabled={isLoading || !canToggleMode}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isHelixMode ? 'bg-accent-cyan' : 'bg-gray-300'
        } ${isLoading || !canToggleMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-label={`Switch to ${isHelixMode ? 'Open' : 'Helix'} Mode`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isHelixMode ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>

      {/* Error Message */}
      {toggleError && (
        <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{toggleError}</span>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Switch to Open Mode?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  You have incomplete Helix Mode steps. Switching to Open Mode will pause your
                  progress. You can return to Helix Mode later.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    Switch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Create API Route for Mode Toggling
#### File: `src/app/api/projects/[projectId]/mode/route.ts` (NEW)
Create the API endpoint to get and update project mode in the database.

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  initializeHelixSteps,
  initializeStageGates,
} from '@/lib/db/helix';

/**
 * GET /api/projects/[projectId]/mode
 * Get current project mode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createClient();
    const { projectId } = params;

    // Verify user is project member
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json(
        { error: 'Not a project member' },
        { status: 403 }
      );
    }

    // Get project mode
    const { data: project, error } = await supabase
      .from('projects')
      .select('mode')
      .eq('id', projectId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch project mode' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mode: project.mode || 'open' });
  } catch (error) {
    console.error('Error fetching mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[projectId]/mode
 * Update project mode and initialize Helix data if switching to helix mode
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createClient();
    const { projectId } = params;
    const { mode } = await request.json();

    // Validate mode
    if (!['open', 'helix'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    // Verify user is project member with edit permissions
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json(
        { error: 'Not a project member' },
        { status: 403 }
      );
    }

    // Check permission to edit project
    if (!['owner', 'admin'].includes(projectMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update project mode
    const { data: updated, error: updateError } = await supabase
      .from('projects')
      .update({ mode })
      .eq('id', projectId)
      .select('mode')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update mode' },
        { status: 500 }
      );
    }

    // Initialize Helix data if switching to helix mode
    if (mode === 'helix') {
      try {
        // Get the steps configuration from Phase 005
        const HELIX_STEPS = await getHelixStepsConfig();
        await initializeHelixSteps(projectId, HELIX_STEPS);
        await initializeStageGates(projectId);
      } catch (error) {
        console.error('Error initializing Helix data:', error);
        // Continue anyway - the steps might already exist
      }
    }

    return NextResponse.json({ mode: updated.mode });
  } catch (error) {
    console.error('Error updating mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Temporary helper - will be replaced by Phase 005
 */
async function getHelixStepsConfig() {
  return [
    // Stage 1 - Planning
    {
      stage_number: 1,
      step_number: 1,
      step_key: '1.1',
      evidence_type: 'text',
    },
    {
      stage_number: 1,
      step_number: 2,
      step_key: '1.2',
      evidence_type: 'text',
    },
    {
      stage_number: 1,
      step_number: 3,
      step_key: '1.3',
      evidence_type: 'file',
    },
    // Stage 2 - Documentation (4 steps)
    {
      stage_number: 2,
      step_number: 1,
      step_key: '2.1',
      evidence_type: 'checklist',
    },
    {
      stage_number: 2,
      step_number: 2,
      step_key: '2.2',
      evidence_type: 'text',
    },
    {
      stage_number: 2,
      step_number: 3,
      step_key: '2.3',
      evidence_type: 'file',
    },
    {
      stage_number: 2,
      step_number: 4,
      step_key: '2.4',
      evidence_type: 'checklist',
    },
    // Stages 3-8 (simplified for MVP)
    ...Array.from({ length: 6 }, (_, stageIdx) => {
      const stageNum = stageIdx + 3;
      return {
        stage_number: stageNum,
        step_number: 1,
        step_key: `${stageNum}.1`,
        evidence_type: 'text' as const,
      };
    }),
  ];
}
```

### 4. Integrate Toggle into Project Layout
#### File: `src/app/(auth)/org/[orgSlug]/project/[projectId]/layout.tsx` (UPDATED)
Add the HelixModeToggle to the project header, wrapping with HelixModeProvider.

```typescript
// Add to imports
import { HelixModeProvider } from '@/contexts/HelixModeContext';
import { HelixModeToggle } from '@/components/HelixModeToggle';

// Wrap layout children
export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HelixModeProvider>
      <div className="flex-1">
        {/* Project Header */}
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Breadcrumbs */}
              {/* ... existing breadcrumbs ... */}
            </div>
            {/* Mode Toggle - NEW */}
            <HelixModeToggle />
          </div>
        </header>

        {/* Project Content */}
        <main className="flex-1">{children}</main>
      </div>
    </HelixModeProvider>
  );
}
```

---

## File Structure
```
src/
├── contexts/
│   └── HelixModeContext.tsx (NEW)
├── components/
│   └── HelixModeToggle.tsx (NEW)
├── app/
│   └── api/
│       └── projects/
│           └── [projectId]/
│               └── mode/
│                   └── route.ts (NEW)
└── (auth)/
    └── org/
        └── [orgSlug]/
            └── project/
                └── [projectId]/
                    └── layout.tsx (UPDATED)
```

---

## Dependencies
- lucide-react (existing - for icons)
- React Context API (built-in)
- Next.js 16+ (existing)

---

## Tech Stack for This Phase
- React Context API for state management
- Next.js API Routes for mode persistence
- TypeScript for type safety
- Tailwind CSS for styling
- Lucide React for icons

---

## Acceptance Criteria
1. HelixModeContext exports useHelixMode() hook returning isHelixMode, toggleMode, currentStage, currentStep, allSteps, stageGates
2. HelixModeProvider wraps project layout and loads mode + Helix data on mount
3. HelixModeToggle component renders in project header
4. Toggle shows "Open Mode" or "Helix Mode" text with visual indicator
5. Clicking toggle when in Helix Mode shows confirmation dialog
6. Clicking toggle when in Open Mode switches immediately to Helix Mode
7. POST /api/projects/[projectId]/mode persists mode change to database
8. Switching to Helix Mode triggers initialization of helix_steps and helix_stage_gates
9. Toggle button is disabled during async operations (isLoading true)
10. Error messages display when mode toggle fails

---

## Testing Instructions
1. Create test project and render ProjectLayout
2. Verify HelixModeToggle appears in header next to breadcrumbs
3. Verify toggle shows "Open Mode" with gray indicator initially
4. Click toggle to switch to Helix Mode and verify button changes to cyan
5. Verify mode change persists by refreshing page
6. Verify confirmation dialog appears when clicking toggle in Helix Mode
7. Click Cancel in dialog and verify mode doesn't change
8. Click Confirm in dialog and verify mode switches back to Open Mode
9. Check network tab to confirm POST to /api/projects/[projectId]/mode occurs
10. Check database to confirm helix_steps and helix_stage_gates rows created when switching to Helix Mode

---

## Notes for the AI Agent
- The HelixModeProvider must wrap the entire project layout to be available to all sub-routes
- The useHelixMode hook will throw if used outside the provider; add clear error messages
- The stageProgress Map is computed from allSteps and updated whenever steps change
- The toggle is disabled if canToggleMode is false (protection against mid-process mode switches)
- Phase 002 uses a temporary HELIX_STEPS config in route.ts that will be replaced by Phase 005
- The confirmation dialog uses a modal overlay with z-50 to ensure visibility
- Error states persist in toggleError for user feedback; they should clear on next successful toggle
