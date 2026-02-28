# Phase 004 — Helix Sidebar & Navigation Shell

## Objective
Implement the Helix-specific sidebar navigation that displays all 8 stages and 22 steps with status indicators. The sidebar replaces the v1 module sidebar when in Helix Mode and serves as the primary navigation for the Helix process.

## Prerequisites
- Phase 001 — Helix Mode Database Migration — tables in place
- Phase 002 — Mode Context Provider & Toggle — context providing step data
- Phase 003 — Helix Route Structure — Helix layout in place

## Epic Context
**Epic:** 1 — Foundation & Mode Infrastructure
**Phase:** 004 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The Helix sidebar is the primary navigation for Helix Mode. It shows all 8 stages as collapsible sections, each containing the steps within that stage. Status indicators (locked, active, complete) use color coding (gray, cyan, green) to give users a visual overview of progress. The current step is highlighted with an accent color and scroll-into-view behavior. A progress bar at the top shows overall completion.

This is the central navigation hub for the entire Helix Mode experience and will be heavily used throughout all 8 stages.

---

## Detailed Requirements

### 1. Create Helix Sidebar Component
#### File: `src/components/HelixSidebar.tsx` (NEW)
Create the main sidebar component showing all stages and steps with status indicators.

```typescript
'use client';

import { useState } from 'react';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { useProject } from '@/contexts/ProjectContext';
import Link from 'next/link';
import { ChevronDown, Lock, CheckCircle2, Play } from 'lucide-react';

const STAGE_TITLES: Record<number, string> = {
  1: 'Planning',
  2: 'Documentation',
  3: 'Build Planning',
  4: 'Repo Setup',
  5: 'Review',
  6: 'Build',
  7: 'Testing',
  8: 'Deployment',
};

const STAGE_DESCRIPTIONS: Record<number, string> = {
  1: 'Define the project and gather requirements',
  2: 'Collect and organize documentation',
  3: 'Create the build plan',
  4: 'Set up repository and initialize',
  5: 'Review and validate build plan',
  6: 'Execute build phases',
  7: 'Test and verify quality',
  8: 'Deploy to production',
};

export function HelixSidebar() {
  const { allSteps, stageProgress, currentStep } = useHelixMode();
  const { project } = useProject();
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set([1]));

  if (!project) return null;

  const toggleStage = (stageNumber: number) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageNumber)) {
      newExpanded.delete(stageNumber);
    } else {
      newExpanded.add(stageNumber);
    }
    setExpandedStages(newExpanded);
  };

  const getStepStatus = (stepKey: string): 'locked' | 'active' | 'complete' => {
    const step = allSteps.find((s) => s.step_key === stepKey);
    return step?.status || 'locked';
  };

  const getStatusIcon = (status: 'locked' | 'active' | 'complete') => {
    switch (status) {
      case 'locked':
        return <Lock className="w-4 h-4" />;
      case 'active':
        return <Play className="w-4 h-4" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: 'locked' | 'active' | 'complete') => {
    switch (status) {
      case 'locked':
        return 'text-gray-400 dark:text-gray-500';
      case 'active':
        return 'text-accent-cyan';
      case 'complete':
        return 'text-green-600 dark:text-green-500';
    }
  };

  // Calculate overall progress
  let totalCompleted = 0;
  let totalSteps = 0;
  for (let i = 1; i <= 8; i++) {
    const progress = stageProgress.get(i);
    if (progress) {
      totalCompleted += progress.completed;
      totalSteps += progress.total;
    }
  }
  const overallProgress = totalSteps > 0 ? (totalCompleted / totalSteps) * 100 : 0;

  return (
    <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Helix Process
        </h2>

        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-accent-cyan h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Stages List */}
      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: 8 }).map((_, i) => {
          const stageNumber = i + 1;
          const isExpanded = expandedStages.has(stageNumber);
          const progress = stageProgress.get(stageNumber);
          const stepsInStage = allSteps.filter((s) => s.stage_number === stageNumber);

          return (
            <div
              key={stageNumber}
              className="border-b border-gray-100 dark:border-gray-800"
            >
              {/* Stage Header */}
              <button
                onClick={() => toggleStage(stageNumber)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${
                    isExpanded ? 'transform rotate-0' : '-rotate-90'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    Stage {stageNumber}: {STAGE_TITLES[stageNumber]}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {progress?.completed}/{progress?.total} steps
                  </p>
                </div>
              </button>

              {/* Stage Progress Bar */}
              <div className="px-4 py-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div
                    className="bg-accent-cyan h-1 rounded-full transition-all"
                    style={{
                      width:
                        progress && progress.total > 0
                          ? `${(progress.completed / progress.total) * 100}%`
                          : '0%',
                    }}
                  ></div>
                </div>
              </div>

              {/* Steps List */}
              {isExpanded && (
                <div className="bg-gray-50 dark:bg-gray-800/50">
                  {stepsInStage.map((step) => {
                    const isCurrentStep = currentStep?.id === step.id;
                    const status = getStepStatus(step.step_key);

                    return (
                      <Link
                        key={step.id}
                        href={`/org/${project.org_slug}/project/${project.id}/helix/step/${step.step_key}`}
                        className={`block px-4 py-2 mx-2 my-1 rounded-md flex items-center gap-3 transition-all text-sm ${
                          isCurrentStep
                            ? 'bg-accent-cyan/10 border-l-2 border-accent-cyan'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 ${getStatusColor(status)}`}
                        >
                          {getStatusIcon(status)}
                        </span>
                        <span className="flex-1 min-w-0 text-gray-900 dark:text-gray-300 truncate">
                          {step.step_key}
                        </span>
                        {status === 'complete' && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                            Done
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <button className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          Project Settings
        </button>
      </div>
    </aside>
  );
}
```

### 2. Integrate Sidebar into Helix Layout
#### File: `src/app/(auth)/org/[orgSlug]/project/[projectId]/(helix)/layout.tsx` (UPDATED)
Update the Helix layout to include the HelixSidebar component.

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { useProject } from '@/contexts/ProjectContext';
import { useEffect } from 'react';
import { HelixSidebar } from '@/components/HelixSidebar';

export default function HelixLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { project } = useProject();
  const { isHelixMode, isLoading } = useHelixMode();

  // Navigation guard: redirect if mode is not Helix
  useEffect(() => {
    if (isLoading) return;

    if (!isHelixMode) {
      const modulePath = `/org/${project?.org_slug}/project/${project?.id}/modules/hall`;
      router.replace(modulePath);
    }
  }, [isHelixMode, isLoading, project, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    );
  }

  if (!isHelixMode) {
    return null;
  }

  return (
    <div className="flex h-screen bg-bg-primary dark:bg-bg-primary-dark">
      {/* Helix Sidebar - NEW */}
      <HelixSidebar />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {/* Will show current step/stage title */}
            </h1>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
```

### 3. Create Step Navigation Hook
#### File: `src/hooks/useStepNavigation.ts` (NEW)
Create a hook for navigating between steps with validation.

```typescript
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { useHelixMode } from '@/contexts/HelixModeContext';

export function useStepNavigation() {
  const router = useRouter();
  const { project } = useProject();
  const { allSteps } = useHelixMode();

  const navigateToStep = useCallback(
    (stepKey: string) => {
      if (!project) return;

      const step = allSteps.find((s) => s.step_key === stepKey);
      if (!step) {
        console.error(`Step ${stepKey} not found`);
        return;
      }

      // Only allow navigation to non-locked steps
      if (step.status === 'locked') {
        console.warn(`Step ${stepKey} is locked`);
        return;
      }

      const href = `/org/${project.org_slug}/project/${project.id}/helix/step/${stepKey}`;
      router.push(href);
    },
    [project, allSteps, router]
  );

  const navigateToNextStep = useCallback(() => {
    const currentStep = allSteps.find((s) => s.status === 'active');
    if (!currentStep) return;

    const currentIndex = allSteps.findIndex((s) => s.id === currentStep.id);
    if (currentIndex === -1 || currentIndex === allSteps.length - 1) return;

    const nextStep = allSteps[currentIndex + 1];
    navigateToStep(nextStep.step_key);
  }, [allSteps, navigateToStep]);

  const navigateToPreviousStep = useCallback(() => {
    const currentStep = allSteps.find((s) => s.status === 'active');
    if (!currentStep) return;

    const currentIndex = allSteps.findIndex((s) => s.id === currentStep.id);
    if (currentIndex <= 0) return;

    const previousStep = allSteps[currentIndex - 1];
    navigateToStep(previousStep.step_key);
  }, [allSteps, navigateToStep]);

  return {
    navigateToStep,
    navigateToNextStep,
    navigateToPreviousStep,
  };
}
```

### 4. Create Responsive Sidebar Wrapper
#### File: `src/components/HelixSidebarWrapper.tsx` (NEW)
Create a wrapper that handles sidebar visibility on mobile/tablet devices.

```typescript
'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { HelixSidebar } from './HelixSidebar';

export function HelixSidebarWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile/Tablet Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden absolute top-4 left-4 z-40 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:relative left-0 top-0 h-full z-40 transition-transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <HelixSidebar />
      </div>
    </>
  );
}
```

---

## File Structure
```
src/
├── components/
│   ├── HelixSidebar.tsx (NEW)
│   └── HelixSidebarWrapper.tsx (NEW)
├── hooks/
│   └── useStepNavigation.ts (NEW)
└── app/(auth)/org/[orgSlug]/project/[projectId]/
    └── (helix)/
        └── layout.tsx (UPDATED)
```

---

## Dependencies
- lucide-react (existing)
- React 18+ (existing)
- Next.js 16+ (existing)

---

## Tech Stack for This Phase
- React Hooks for state management
- Next.js Link for client-side navigation
- TypeScript for type safety
- Tailwind CSS for responsive design
- Custom color system (accent-cyan, bg-primary, etc.)

---

## Acceptance Criteria
1. HelixSidebar component renders with all 8 stages as collapsible sections
2. Sidebar shows overall progress percentage at top with progress bar
3. Each stage shows title, description, and step count (X/Y)
4. Stages are collapsed by default except Stage 1 which is expanded
5. Clicking stage header toggles expand/collapse with smooth animation
6. Expanded stages show all steps with status icons (lock, play, check)
7. Status icons are color-coded: gray (locked), cyan (active), green (complete)
8. Clicked/active step is highlighted with cyan accent and left border
9. Steps can only navigate to non-locked steps (no unauthorized access)
10. Sidebar integrates into Helix layout and displays alongside content area

---

## Testing Instructions
1. Render HelixSidebar in test project with steps data
2. Verify all 8 stages appear as collapsed sections except Stage 1
3. Click stage header and verify expand/collapse animation
4. Verify overall progress bar matches calculation: totalCompleted/totalSteps * 100
5. Click locked step and verify no navigation occurs
6. Click active/complete step and verify navigation to step detail page
7. Verify current step is highlighted with cyan styling
8. Test useStepNavigation hook by calling navigateToNextStep and navigateToPreviousStep
9. Test responsive behavior at mobile (375px), tablet (768px), and desktop (1024px) breakpoints
10. Verify sidebar collapse/expand icon animates correctly on toggle

---

## Notes for the AI Agent
- The sidebar is 288px wide (w-72) on desktop; adjust if layout needs change
- Stage 1 expands by default to guide new users
- The progress bar animation uses transition-all duration-300 for smooth visual feedback
- Step navigation includes validation to prevent accessing locked steps
- The useStepNavigation hook is designed to be reused in step detail pages for next/previous navigation
- Sidebar footer can house additional settings later; placeholder for "Project Settings" button
- On mobile, sidebar uses fixed positioning with overlay; on desktop it's relative and always visible
- Color scheme uses existing v1 theme variables (accent-cyan, text colors, backgrounds)
