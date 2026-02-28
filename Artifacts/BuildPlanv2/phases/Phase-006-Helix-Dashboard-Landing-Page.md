# Phase 006 — Helix Dashboard Landing Page

## Objective
Implement a comprehensive Helix Mode landing page that displays all 8 stages as a vertical pipeline with progress tracking, stage cards, and navigation. This serves as the primary entry point to Helix Mode.

## Prerequisites
- Phase 001 — Helix Mode Database Migration — data layer ready
- Phase 002 — Mode Context Provider & Toggle — context providing step and stage data
- Phase 003 — Helix Route Structure — routes in place
- Phase 004 — Helix Sidebar & Navigation Shell — sidebar navigation ready
- Phase 005 — Stage & Step Data Model — process configuration available

## Epic Context
**Epic:** 1 — Foundation & Mode Infrastructure
**Phase:** 006 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The Helix dashboard is the landing page for Helix Mode. It provides a visual overview of the entire 8-stage process, shows progress per stage, highlights the current stage, and enables quick navigation to any stage or step. The dashboard uses the stage configuration from Phase 005 to render dynamic stage cards with accurate metadata.

This page replaces the placeholder Helix page from Phase 003 with a fully functional dashboard.

---

## Detailed Requirements

### 1. Create Stage Card Component
#### File: `src/components/HelixStageCard.tsx` (NEW)
Create a reusable card component for displaying stage information and navigation.

```typescript
'use client';

import Link from 'next/link';
import { useProject } from '@/contexts/ProjectContext';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { getStage } from '@/config/helix-process';
import { ChevronRight, Lock } from 'lucide-react';

interface HelixStageCardProps {
  stageNumber: number;
  isExpanded?: boolean;
  onToggleExpand?: (stageNumber: number) => void;
}

export function HelixStageCard({
  stageNumber,
  isExpanded = false,
  onToggleExpand,
}: HelixStageCardProps) {
  const { project } = useProject();
  const { stageProgress, currentStage } = useHelixMode();
  const stage = getStage(stageNumber);
  const progress = stageProgress.get(stageNumber);

  if (!stage || !project) return null;

  const isCurrentStage = currentStage === stageNumber;
  const isLocked = stageNumber > 1 && (!currentStage || currentStage < stageNumber - 1);
  const progressPercent = progress
    ? (progress.completed / progress.total) * 100
    : 0;

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        isCurrentStage
          ? 'border-accent-cyan bg-accent-cyan/5 dark:bg-accent-cyan/10 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
      } ${isLocked ? 'opacity-60' : ''}`}
    >
      {/* Card Header */}
      <button
        onClick={() => onToggleExpand?.(stageNumber)}
        disabled={isLocked}
        className={`w-full p-4 text-left flex items-start justify-between ${
          !isLocked ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold">
              {stageNumber}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {stage.title}
            </h3>
            {isCurrentStage && (
              <span className="px-2 py-1 rounded-md bg-accent-cyan text-white text-xs font-semibold">
                Current
              </span>
            )}
            {isLocked && (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-xs">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {stage.description}
          </p>
        </div>
        {!isLocked && onToggleExpand && (
          <ChevronRight
            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ml-4 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
      </button>

      {/* Progress Bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isCurrentStage ? 'bg-accent-cyan' : 'bg-gray-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {progress?.completed}/{progress?.total}
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {stage.gateCheckDescription}
        </p>
      </div>

      {/* Expanded Content - Steps List */}
      {isExpanded && !isLocked && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="space-y-2">
            {stage.steps.map((step, idx) => (
              <Link
                key={step.key}
                href={`/org/${project.org_slug}/project/${project.id}/helix/step/${step.key}`}
                className="block p-3 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-accent-cyan dark:hover:border-accent-cyan transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {step.key} — {step.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {step.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. Create Enhanced Helix Dashboard Page
#### File: `src/app/(auth)/org/[orgSlug]/project/[projectId]/(helix)/page.tsx` (UPDATED)
Replace the placeholder dashboard with a fully featured page using stage cards.

```typescript
'use client';

import { useState } from 'react';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { HELIX_STAGES } from '@/config/helix-process';
import { HelixStageCard } from '@/components/HelixStageCard';
import { Activity, TrendingUp } from 'lucide-react';

export default function HelixDashboard() {
  const { stageProgress, currentStage, allSteps } = useHelixMode();
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());

  const toggleExpand = (stageNumber: number) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageNumber)) {
      newExpanded.delete(stageNumber);
    } else {
      newExpanded.add(stageNumber);
    }
    setExpandedStages(newExpanded);
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

  // Get stats
  const completedStages = Array.from({ length: 8 }, (_, i) => {
    const progress = stageProgress.get(i + 1);
    return progress && progress.completed === progress.total ? i + 1 : null;
  }).filter(Boolean).length;

  return (
    <div className="flex-1 overflow-auto bg-bg-secondary dark:bg-bg-secondary-dark">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Helix Process
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Quality-controlled development through 8 stages
          </p>
        </div>

        {/* Overall Progress Card */}
        <div className="mb-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progress Bar */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-accent-cyan" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Overall Progress
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-accent-cyan to-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {totalCompleted} of {totalSteps} steps completed
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completedStages}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Stages Complete
                </p>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-accent-cyan">
                  {currentStage || '—'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Current Stage
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {currentStage === null && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              Ready to begin! Click on Stage 1 below to start the Helix process.
            </p>
          </div>
        )}

        {currentStage === 8 && overallProgress === 100 && (
          <div className="mb-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-900 dark:text-green-200 font-semibold">
                Project complete! All Helix stages successfully finished.
              </p>
            </div>
          </div>
        )}

        {/* Stages Pipeline */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Development Pipeline
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {HELIX_STAGES.map((stage) => (
              <HelixStageCard
                key={stage.number}
                stageNumber={stage.number}
                isExpanded={expandedStages.has(stage.number)}
                onToggleExpand={toggleExpand}
              />
            ))}
          </div>
        </div>

        {/* Key Concepts */}
        <div className="mt-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Helix Mode Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Linear Progression
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Move through 8 stages sequentially. Each stage must be complete before advancing.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Quality Gates
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hard-block gates ensure every step has evidence before proceeding to the next stage.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Evidence-Based
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Each step requires specific evidence (text, files, checklists) documenting completion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Create Dashboard Metrics Component
#### File: `src/components/HelixDashboardMetrics.tsx` (NEW)
Create a reusable metrics display component.

```typescript
'use client';

import { useHelixMode } from '@/contexts/HelixModeContext';
import { Activity, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export function HelixDashboardMetrics() {
  const { stageProgress, currentStage, allSteps } = useHelixMode();

  // Calculate metrics
  let totalCompleted = 0;
  let totalSteps = 0;
  let totalActive = 0;
  let totalLocked = 0;

  for (let i = 1; i <= 8; i++) {
    const progress = stageProgress.get(i);
    if (progress) {
      totalCompleted += progress.completed;
      totalSteps += progress.total;
    }
  }

  totalActive = allSteps.filter((s) => s.status === 'active').length;
  totalLocked = allSteps.filter((s) => s.status === 'locked').length;

  const metrics = [
    {
      label: 'Current Stage',
      value: currentStage ? `${currentStage}/8` : 'Not Started',
      icon: Activity,
      color: 'text-accent-cyan',
    },
    {
      label: 'Completed Steps',
      value: `${totalCompleted}/${totalSteps}`,
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-500',
    },
    {
      label: 'Active Step',
      value: totalActive > 0 ? 'Yes' : 'None',
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-500',
    },
    {
      label: 'Locked Steps',
      value: totalLocked,
      icon: AlertCircle,
      color: 'text-gray-600 dark:text-gray-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
              <Icon className={`w-5 h-5 ${metric.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## File Structure
```
src/
├── components/
│   ├── HelixStageCard.tsx (NEW)
│   └── HelixDashboardMetrics.tsx (NEW)
└── app/(auth)/org/[orgSlug]/project/[projectId]/
    └── (helix)/
        └── page.tsx (UPDATED)
```

---

## Dependencies
- lucide-react (existing)
- React 18+ (existing)
- Next.js 16+ (existing)

---

## Tech Stack for This Phase
- React components with hooks
- Next.js Link for navigation
- TypeScript for type safety
- Tailwind CSS for responsive design
- Configuration from Phase 005

---

## Acceptance Criteria
1. HelixStageCard component renders stage title, description, progress bar, and step count
2. Stage cards show different styling when isCurrentStage is true (cyan border, accent color)
3. Locked stages show lock icon and reduced opacity
4. Clicking stage header toggles expanded view if not locked
5. Expanded view shows all steps in that stage with navigation links
6. HelixDashboard page displays all 8 stage cards in responsive grid
7. Overall progress bar shows correct percentage calculated from all steps
8. Dashboard shows stats: completed stages count and current stage number
9. Status messages appear at top of page when at start or end of process
10. Dashboard includes overview section explaining key Helix concepts

---

## Testing Instructions
1. Navigate to project in Helix Mode and view dashboard
2. Verify overall progress bar and percentage match calculation
3. Verify stage cards display with correct titles from HELIX_STAGES config
4. Verify current stage is highlighted with cyan styling
5. Click on non-current stage and verify it expands to show steps
6. Click on a step link and verify navigation to step detail page
7. Mark several steps complete in database and refresh dashboard
8. Verify overall progress updates and stage progress bars reflect changes
9. Test responsive layout at mobile (375px), tablet (768px), and desktop (1024px)
10. Verify locked stages show lock icon and cannot be clicked

---

## Notes for the AI Agent
- The dashboard is the landing page for all Helix Mode users
- Stage cards are responsible for their own expand/collapse state, handled by parent page component
- The progress calculation should always match the sidebar calculation in Phase 004
- Locked stage detection: stage N is locked if stage N-1 is not complete
- Status messages guide users through the process (start, completion, etc.)
- The metrics component is extracted for reusability in other pages later
- Dashboard should refresh when steps are completed (automatic via context updates)
- The gradient progress bar uses Tailwind gradient for visual appeal
