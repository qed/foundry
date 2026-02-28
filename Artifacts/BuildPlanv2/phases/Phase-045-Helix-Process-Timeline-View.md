# PHASE 045 — Helix Process Timeline View

## Objective
Create a visual vertical timeline component that displays all 8 Helix stages and their 22 child steps chronologically. Enable users to see the complete process flow at a glance, understand current position, and navigate between phases interactively.

## Prerequisites
- Phase 001-044 completed (all Helix MVP modes, stages, steps, gates, tracking, deployments)
- Database schema supports step completion timestamps
- Existing navigation infrastructure in place
- CSS variables defined (bg-primary, bg-secondary, accent-cyan)

## Epic Context
**Epic 6 — MVP Polish & Cross-Cutting**
This phase adds visual polish and cross-cutting concerns to the Helix MVP. Phase 045 focuses on timeline visualization—helping users understand process progression through a cohesive visual representation that works across all device sizes.

## Context
The Helix Mode MVP (Phases 001-044) provides full process tracking but lacks a comprehensive visual timeline. Users need a clear chronological view showing:
- All 8 stages with visual hierarchy
- 22 child steps grouped by stage
- Status indicators (not started, in progress, completed)
- Duration and completion dates
- Current position highlighting
- Responsive layout for mobile, tablet, desktop

This phase delivers a beautiful, interactive timeline that serves as both navigation tool and progress visualization.

## Detailed Requirements

### 1. Timeline Component Architecture
```typescript
// components/helix/ProcessTimeline.tsx
import React, { useState } from 'react';
import { Stage, Step } from '@/types/helix';
import TimelineNode from './timeline/TimelineNode';
import TimelineConnector from './timeline/TimelineConnector';

interface ProcessTimelineProps {
  stages: Stage[];
  steps: Map<string, Step[]>; // stage key -> steps
  currentStageKey: string;
  currentStepKey: string;
  onStageClick: (stageKey: string) => void;
  onStepClick: (stepKey: string) => void;
  isCompact?: boolean; // mobile simplified mode
}

export const ProcessTimeline: React.FC<ProcessTimelineProps> = ({
  stages,
  steps,
  currentStageKey,
  currentStepKey,
  onStageClick,
  onStepClick,
  isCompact = false,
}) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    new Set([currentStageKey])
  );

  const toggleStageExpand = (stageKey: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageKey)) {
      newExpanded.delete(stageKey);
    } else {
      newExpanded.add(stageKey);
    }
    setExpandedStages(newExpanded);
  };

  const getStageStatus = (stageKey: string): 'future' | 'active' | 'done' => {
    const stageIndex = stages.findIndex(s => s.key === stageKey);
    const currentIndex = stages.findIndex(s => s.key === currentStageKey);
    if (stageIndex < currentIndex) return 'done';
    if (stageIndex === currentIndex) return 'active';
    return 'future';
  };

  const getConnectorColor = (stageIndex: number): string => {
    const status = getStageStatus(stages[stageIndex].key);
    if (status === 'done') return 'bg-green-500';
    if (status === 'active') return 'bg-[#00d4ff]';
    return 'bg-gray-600';
  };

  return (
    <div className={`flex flex-col ${isCompact ? 'gap-2' : 'gap-8'}`}>
      {stages.map((stage, stageIndex) => (
        <div key={stage.key} className="relative">
          {/* Connector from previous stage */}
          {stageIndex > 0 && (
            <TimelineConnector
              color={getConnectorColor(stageIndex - 1)}
              height={isCompact ? 'h-6' : 'h-12'}
            />
          )}

          {/* Stage node */}
          <div className="flex gap-4">
            <div className={`flex flex-col items-center ${isCompact ? 'w-6' : 'w-8'}`}>
              <TimelineNode
                label={`${stageIndex + 1}`}
                status={getStageStatus(stage.key)}
                isCurrentStage={stage.key === currentStageKey}
                size={isCompact ? 'sm' : 'md'}
                onClick={() => onStageClick(stage.key)}
                pulsing={stage.key === currentStageKey}
              />
            </div>

            {/* Stage content */}
            <div className="flex-1 pt-1">
              <button
                onClick={() => toggleStageExpand(stage.key)}
                className={`text-left font-semibold transition-colors ${
                  getStageStatus(stage.key) === 'done'
                    ? 'text-green-400'
                    : getStageStatus(stage.key) === 'active'
                    ? 'text-[#00d4ff]'
                    : 'text-gray-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{stage.name}</span>
                  <span
                    className={`text-xs transition-transform ${
                      expandedStages.has(stage.key) ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </span>
              </button>

              {/* Stage metadata */}
              <div className="text-xs text-gray-500 mt-1">
                {steps.get(stage.key)?.length || 0} steps
                {stage.completedAt && ` · Completed ${stage.completedAt}`}
              </div>

              {/* Child steps */}
              {expandedStages.has(stage.key) && (
                <div className={`mt-4 space-y-3 pl-4 border-l border-gray-700 ${isCompact ? '' : ''}`}>
                  {(steps.get(stage.key) || []).map((step, stepIndex) => {
                    const stepStatus =
                      step.completedAt ? 'done' :
                      step.key === currentStepKey ? 'active' :
                      'future';
                    return (
                      <div key={step.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <TimelineNode
                            label={`${stepIndex + 1}`}
                            status={stepStatus}
                            isCurrentStage={step.key === currentStepKey}
                            size="xs"
                            onClick={() => onStepClick(step.key)}
                          />
                        </div>
                        <div className="flex-1">
                          <button
                            onClick={() => onStepClick(step.key)}
                            className={`text-sm transition-colors ${
                              stepStatus === 'done'
                                ? 'text-green-400'
                                : stepStatus === 'active'
                                ? 'text-[#00d4ff]'
                                : 'text-gray-500'
                            }`}
                          >
                            {step.name}
                          </button>
                          {step.completedAt && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {step.completedAt}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProcessTimeline;
```

### 2. Timeline Node Component
```typescript
// components/helix/timeline/TimelineNode.tsx
import React from 'react';

interface TimelineNodeProps {
  label: string;
  status: 'future' | 'active' | 'done';
  size?: 'xs' | 'sm' | 'md';
  isCurrentStage?: boolean;
  onClick?: () => void;
  pulsing?: boolean;
}

export const TimelineNode: React.FC<TimelineNodeProps> = ({
  label,
  status,
  size = 'md',
  isCurrentStage = false,
  onClick,
  pulsing = false,
}) => {
  const sizeMap = {
    xs: 'w-5 h-5 text-xs',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
  };

  const statusColor = {
    done: 'bg-green-500 border-green-500 text-white',
    active: 'bg-[#00d4ff] border-[#00d4ff] text-[#0f1117]',
    future: 'bg-gray-700 border-gray-600 text-gray-300',
  };

  return (
    <button
      onClick={onClick}
      className={`${sizeMap[size]} rounded-full border-2 flex items-center justify-center font-semibold transition-all ${
        statusColor[status]
      } ${isCurrentStage ? 'ring-2 ring-offset-2 ring-offset-[#0f1117] ring-[#00d4ff]' : ''} ${
        pulsing ? 'animate-pulse' : ''
      } hover:scale-110`}
      title={`Status: ${status}`}
    >
      {status === 'done' ? '✓' : label}
    </button>
  );
};

export default TimelineNode;
```

### 3. Timeline Connector Component
```typescript
// components/helix/timeline/TimelineConnector.tsx
import React from 'react';

interface TimelineConnectorProps {
  color: string;
  height?: string;
}

export const TimelineConnector: React.FC<TimelineConnectorProps> = ({
  color,
  height = 'h-12',
}) => {
  return (
    <div className={`mx-auto ${color} transition-colors duration-500`}>
      <div className={`w-0.5 ${height}`} />
    </div>
  );
};

export default TimelineConnector;
```

### 4. Timeline Route Page
```typescript
// app/[workspaceSlug]/projects/[projectKey]/helix/timeline/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHelix } from '@/hooks/helix/useHelix';
import ProcessTimeline from '@/components/helix/ProcessTimeline';
import { Stage, Step } from '@/types/helix';
import Loading from '@/components/helix/skeletons/TimelineSkeleton';

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const { stages, currentStage, currentStep, navigateToStep, isLoading } = useHelix();
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Auto-expand current stage
    if (currentStage) {
      setExpandedStages(new Set([currentStage.key]));
    }
  }, [currentStage]);

  if (isLoading) return <Loading />;

  // Build steps map from stages
  const stepsMap = new Map<string, Step[]>();
  stages.forEach(stage => {
    stepsMap.set(stage.key, stage.steps || []);
  });

  const handleStageClick = (stageKey: string) => {
    const stage = stages.find(s => s.key === stageKey);
    if (stage?.steps && stage.steps.length > 0) {
      navigateToStep(stage.steps[0].key);
    }
  };

  const handleStepClick = (stepKey: string) => {
    navigateToStep(stepKey);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Process Timeline</h1>
          <p className="text-gray-400">
            Visual overview of all stages and steps in your Helix process
          </p>
        </div>

        <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-8">
          <ProcessTimeline
            stages={stages}
            steps={stepsMap}
            currentStageKey={currentStage?.key || ''}
            currentStepKey={currentStep?.key || ''}
            onStageClick={handleStageClick}
            onStepClick={handleStepClick}
            isCompact={false}
          />
        </div>
      </div>
    </div>
  );
}
```

### 5. Mobile Responsive Timeline
On mobile (<768px), the timeline switches to simplified list mode:

```typescript
// Mobile variant in ProcessTimeline component
{isCompact && (
  <div className="space-y-2">
    {stages.map((stage) => (
      <button
        key={stage.key}
        onClick={() => onStageClick(stage.key)}
        className={`w-full text-left p-3 rounded border transition-colors ${
          stage.key === currentStageKey
            ? 'bg-[#00d4ff] bg-opacity-20 border-[#00d4ff]'
            : 'bg-gray-900 border-gray-700 hover:border-gray-600'
        }`}
      >
        <div className="font-semibold text-sm">{stage.name}</div>
        <div className="text-xs text-gray-500">{(steps.get(stage.key) || []).length} steps</div>
      </button>
    ))}
  </div>
)}
```

## File Structure
```
components/helix/
├── ProcessTimeline.tsx          (Main component)
├── timeline/
│   ├── TimelineNode.tsx         (Status indicator node)
│   ├── TimelineConnector.tsx    (Visual connector line)
│   └── index.ts
app/[workspaceSlug]/projects/[projectKey]/helix/
└── timeline/
    └── page.tsx                 (Route page)
```

## Dependencies
- React 19+
- Next.js 16+
- TypeScript
- Tailwind CSS v4
- @/hooks/helix/useHelix
- @/types/helix

## Tech Stack
- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4 with custom bg/accent variables
- React hooks (useState, useEffect)

## Acceptance Criteria
1. Timeline displays all 8 stages in correct order with stage number, name, and step count
2. Timeline displays all steps when stage is expanded, grouped by parent stage
3. Completed stages/steps show green checkmark, active show cyan highlight, future show gray
4. Current stage/step pulses with cyan ring animation
5. Clicking stage node navigates to first step of that stage
6. Clicking step node navigates directly to that step
7. Timeline expands/collapses stages on click, preserves expanded state during session
8. On mobile (<768px), timeline collapses to simplified card list view with horizontal scrolling support
9. Completion dates display below stage/step names where available
10. Timeline loads without errors and responds to prop changes (stage/step updates) immediately

## Testing Instructions
1. **Desktop timeline rendering**: Load timeline page, verify all 8 stages display with correct names and counts
2. **Expand/collapse stages**: Click stage names, confirm stages expand to show steps, collapse to hide steps
3. **Stage status colors**: Complete several steps in different stages, refresh timeline, verify completed stages show green, current shows cyan, future shows gray
4. **Current position indicator**: Navigate through steps, confirm current step pulses and has cyan ring
5. **Navigation from timeline**: Click on different stage/step nodes, confirm URL changes and correct content loads
6. **Mobile responsiveness**: Resize to <768px, verify timeline switches to simplified card layout
7. **Completion dates**: Mark steps complete with timestamps, verify dates display in timeline
8. **Keyboard navigation**: Tab through timeline nodes, confirm all clickable elements are accessible, Enter key triggers navigation
9. **Performance**: Load timeline with all 22 steps, verify smooth animations and no lag
10. **Edge cases**: Test timeline with 0 completed steps, all steps completed, and empty stages

## Notes for AI Agent
- Timeline is the primary visual reference for Helix process state—keep it performant
- Color scheme: green for done, cyan for active, gray for future (CSS variables: text-green-400, text-[#00d4ff], text-gray-600)
- Mobile simplification is important—test at various breakpoints
- Timeline nodes should be clickable and keyboard-accessible
- Consider adding "jump to current" button for long timelines
- Animation pulse on current stage uses Tailwind animate-pulse—ensure it performs well
- Timeline state (expanded stages) is session-only, not persisted to DB
- Future enhancement: add timeline zoom/collapse for very long processes
