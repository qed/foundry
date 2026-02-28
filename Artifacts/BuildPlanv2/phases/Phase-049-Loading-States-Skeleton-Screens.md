# PHASE 049 — Loading States & Skeleton Screens

## Objective
Implement skeleton loaders and loading states for all Helix components that match layout structure and provide visual feedback during data loading. Use existing v1 skeleton patterns with Tailwind CSS animations.

## Prerequisites
- Phase 001-044 completed (all Helix MVP components)
- v1 skeleton loader patterns available (animate-pulse with bg-tertiary)
- Suspense boundaries setup in App Router
- CSS animations configured in Tailwind CSS

## Epic Context
**Epic 6 — MVP Polish & Cross-Cutting**
Phase 049 adds visual loading states across Helix. This cross-cutting concern improves perceived performance and user experience by providing immediate visual feedback while data loads.

## Context
The Helix MVP components load data asynchronously but lack skeleton screens. Users see blank spaces while data fetches. This phase delivers:
- Skeleton loaders matching each component's final layout
- Loading states during data fetching
- Suspense boundaries at route level
- Consistent animation and styling
- Smooth transitions from skeleton to content

## Detailed Requirements

### 1. Base Skeleton Component
```typescript
// components/helix/skeletons/SkeletonBase.tsx
import React from 'react';

interface SkeletonBaseProps {
  className?: string;
  shimmer?: boolean;
}

export const SkeletonBase: React.FC<SkeletonBaseProps> = ({
  className = '',
  shimmer = true,
}) => {
  return (
    <div
      className={`${
        shimmer ? 'animate-pulse' : ''
      } bg-gray-800 rounded ${className}`}
    />
  );
};

/**
 * Skeleton text line
 */
export const SkeletonLine: React.FC<{ width?: string; className?: string }> = ({
  width = 'w-full',
  className = '',
}) => {
  return <SkeletonBase className={`h-4 ${width} ${className}`} />;
};

/**
 * Skeleton heading
 */
export const SkeletonHeading: React.FC<{ level?: 1 | 2 | 3; className?: string }> = ({
  level = 1,
  className = '',
}) => {
  const heightMap = { 1: 'h-10', 2: 'h-8', 3: 'h-6' };
  return <SkeletonBase className={`${heightMap[level]} w-3/4 ${className}`} />;
};

/**
 * Skeleton button
 */
export const SkeletonButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <SkeletonBase className={`h-10 w-24 rounded ${className}`} />;
};

/**
 * Skeleton circle (for avatars, status icons)
 */
export const SkeletonCircle: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeMap = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' };
  return <SkeletonBase className={`rounded-full ${sizeMap[size]} ${className}`} />;
};

export default SkeletonBase;
```

### 2. Dashboard Skeleton
```typescript
// components/helix/skeletons/DashboardSkeleton.tsx
import React from 'react';
import {
  SkeletonBase,
  SkeletonLine,
  SkeletonHeading,
  SkeletonButton,
} from './SkeletonBase';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <SkeletonHeading level={1} className="mb-2" />
          <SkeletonLine width="w-2/3" />
        </div>

        {/* Progress section */}
        <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-6 mb-6">
          <SkeletonHeading level={2} className="mb-4" />
          <div className="space-y-3">
            <SkeletonLine />
            <SkeletonLine width="w-3/4" />
          </div>
        </div>

        {/* Stages grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#1a1d27] border border-gray-800 rounded-lg p-4">
              {/* Stage card skeleton */}
              <SkeletonLine width="w-2/3" className="mb-2" />
              <SkeletonLine width="w-1/2" className="mb-4" />
              <div className="space-y-2 mb-4">
                <SkeletonLine width="w-3/4" />
                <SkeletonLine width="w-2/3" />
              </div>
              <SkeletonButton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
```

### 3. Step Detail Skeleton
```typescript
// components/helix/skeletons/StepDetailSkeleton.tsx
import React from 'react';
import {
  SkeletonBase,
  SkeletonLine,
  SkeletonHeading,
  SkeletonButton,
} from './SkeletonBase';

export const StepDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header breadcrumbs */}
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <React.Fragment key={i}>
              <SkeletonLine width="w-16" />
              {i < 2 && <span className="text-gray-600">/</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Step content */}
          <div className="lg:col-span-2">
            <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-6">
              {/* Title */}
              <SkeletonHeading level={1} className="mb-2" />
              <SkeletonLine width="w-3/4" className="mb-6" />

              {/* Description */}
              <div className="space-y-2 mb-6">
                <SkeletonLine />
                <SkeletonLine width="w-5/6" />
                <SkeletonLine width="w-4/6" />
              </div>

              {/* Sections */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="mb-6 pb-6 border-b border-gray-800">
                  <SkeletonHeading level={2} width="w-1/3" className="mb-4" />
                  <div className="space-y-3">
                    <SkeletonLine />
                    <SkeletonLine width="w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Evidence sidebar */}
          <div>
            <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-6 sticky top-6">
              <SkeletonHeading level={2} className="mb-4" />

              {/* Evidence items */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mb-4 pb-4 border-b border-gray-800">
                  <SkeletonLine width="w-2/3" className="mb-2" />
                  <SkeletonLine width="w-1/2" />
                </div>
              ))}

              <SkeletonButton className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepDetailSkeleton;
```

### 4. Build Phase Tracker Skeleton
```typescript
// components/helix/skeletons/BuildPhaseTrackerSkeleton.tsx
import React from 'react';
import {
  SkeletonBase,
  SkeletonLine,
  SkeletonHeading,
  SkeletonButton,
} from './SkeletonBase';

export const BuildPhaseTrackerSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <SkeletonHeading level={1} className="mb-2" />
          <SkeletonLine width="w-2/3" />
        </div>

        {/* Phase list */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#1a1d27] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-4">
                {/* Status icon */}
                <SkeletonBase className="w-6 h-6 rounded-full" />

                {/* Content */}
                <div className="flex-1">
                  <SkeletonLine width="w-2/3" className="mb-2" />
                  <SkeletonLine width="w-1/2" />
                </div>

                {/* Action button */}
                <SkeletonButton />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuildPhaseTrackerSkeleton;
```

### 5. Testing Matrix Skeleton
```typescript
// components/helix/skeletons/TestingMatrixSkeleton.tsx
import React from 'react';
import { SkeletonBase, SkeletonLine, SkeletonHeading } from './SkeletonBase';

export const TestingMatrixSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <SkeletonHeading level={1} className="mb-2" />
          <SkeletonLine width="w-2/3" />
        </div>

        {/* Table skeleton */}
        <div className="bg-[#1a1d27] border border-gray-800 rounded-lg overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-5 gap-4 p-4 bg-gray-900 border-b border-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} />
            ))}
          </div>

          {/* Body rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 p-4 border-b border-gray-800">
              {Array.from({ length: 5 }).map((_, j) => (
                <SkeletonLine key={j} width={j === 0 ? 'w-4/5' : 'w-3/4'} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestingMatrixSkeleton;
```

### 6. Timeline Skeleton
```typescript
// components/helix/skeletons/TimelineSkeleton.tsx
import React from 'react';
import {
  SkeletonBase,
  SkeletonLine,
  SkeletonHeading,
  SkeletonCircle,
} from './SkeletonBase';

export const TimelineSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <SkeletonHeading level={1} className="mb-2" />
          <SkeletonLine width="w-2/3" />
        </div>

        {/* Timeline */}
        <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-8">
          <div className="space-y-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                {/* Timeline node */}
                <div className="flex flex-col items-center">
                  <SkeletonCircle />
                  {i < 7 && (
                    <div className="w-0.5 h-12 bg-gray-700 my-2" />
                  )}
                </div>

                {/* Stage content */}
                <div className="flex-1 pt-1">
                  <SkeletonLine width="w-2/3" className="mb-2" />
                  <SkeletonLine width="w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineSkeleton;
```

### 7. Index file for skeleton exports
```typescript
// components/helix/skeletons/index.ts
export { SkeletonBase, SkeletonLine, SkeletonHeading, SkeletonButton, SkeletonCircle } from './SkeletonBase';
export { DashboardSkeleton } from './DashboardSkeleton';
export { StepDetailSkeleton } from './StepDetailSkeleton';
export { BuildPhaseTrackerSkeleton } from './BuildPhaseTrackerSkeleton';
export { TestingMatrixSkeleton } from './TestingMatrixSkeleton';
export { TimelineSkeleton } from './TimelineSkeleton';
```

### 8. Usage in Route Pages with Suspense
```typescript
// app/[workspaceSlug]/projects/[projectKey]/helix/dashboard/page.tsx
'use client';

import React, { Suspense } from 'react';
import DashboardContent from '@/components/helix/HelixDashboard';
import { DashboardSkeleton } from '@/components/helix/skeletons';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

// app/[workspaceSlug]/projects/[projectKey]/helix/step/[stepKey]/page.tsx
'use client';

import React, { Suspense } from 'react';
import StepDetailView from '@/components/helix/StepDetailView';
import { StepDetailSkeleton } from '@/components/helix/skeletons';

export default function StepPage() {
  return (
    <Suspense fallback={<StepDetailSkeleton />}>
      <StepDetailView />
    </Suspense>
  );
}

// app/[workspaceSlug]/projects/[projectKey]/helix/timeline/page.tsx
'use client';

import React, { Suspense } from 'react';
import TimelineView from '@/components/helix/ProcessTimeline';
import { TimelineSkeleton } from '@/components/helix/skeletons';

export default function TimelinePage() {
  return (
    <Suspense fallback={<TimelineSkeleton />}>
      <TimelineView />
    </Suspense>
  );
}
```

### 9. Conditional Loading State in Components
```typescript
// Example: Using loading state in component

import { DashboardSkeleton } from '@/components/helix/skeletons';

export const HelixDashboard: React.FC = () => {
  const { stages, isLoading } = useHelix();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    // Actual dashboard content
  );
};
```

### 10. Tailwind Configuration for Animations
```typescript
// tailwind.config.ts (verify these exist)
export default {
  theme: {
    extend: {
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      backgroundColor: {
        // Skeleton color (update to match bg-tertiary from v1)
        tertiary: '#1a1d27',
      },
    },
  },
};
```

## File Structure
```
components/helix/skeletons/
├── SkeletonBase.tsx             (Base skeleton components)
├── DashboardSkeleton.tsx        (Dashboard skeleton)
├── StepDetailSkeleton.tsx       (Step detail skeleton)
├── BuildPhaseTrackerSkeleton.tsx (Tracker skeleton)
├── TestingMatrixSkeleton.tsx    (Matrix skeleton)
├── TimelineSkeleton.tsx         (Timeline skeleton)
└── index.ts                     (Exports)

app/[workspaceSlug]/projects/[projectKey]/helix/
├── dashboard/page.tsx           (UPDATED with Suspense)
├── step/[stepKey]/page.tsx      (UPDATED with Suspense)
├── timeline/page.tsx            (UPDATED with Suspense)
└── ... (other pages updated similarly)
```

## Dependencies
- React 19+ (Suspense)
- Next.js 16+ (App Router)
- Tailwind CSS v4 (animate-pulse)
- TypeScript

## Tech Stack
- Next.js 16 App Router
- React Suspense boundaries
- Tailwind CSS animations
- TypeScript

## Acceptance Criteria
1. DashboardSkeleton displays 8 stage cards with correct layout matching final dashboard
2. StepDetailSkeleton displays split panel layout (content + sidebar) matching step detail
3. BuildPhaseTrackerSkeleton shows list items with status icon and action button
4. TestingMatrixSkeleton shows table with header and body rows
5. TimelineSkeleton shows vertical timeline with nodes and connectors
6. All skeleton components use animate-pulse animation
7. Skeleton animations are smooth and not too fast/slow (2s duration)
8. Suspense boundaries wrap data-loading components correctly
9. Skeletons appear immediately, real content replaces skeleton on load completion
10. Skeletons match color scheme (gray-800 for skeleton, matches surrounding bg)

## Testing Instructions
1. **Dashboard skeleton**: Add 2-3s delay to dashboard data fetch, verify skeleton displays and transitions smoothly
2. **Step detail skeleton**: Delay step data fetch, verify split-panel skeleton appears with correct proportions
3. **Animation smoothness**: Load page, verify skeleton animations are smooth (not jerky)
4. **All page skeletons**: Test each route page skeleton load (dashboard, step, tracker, matrix, timeline)
5. **Skeleton colors**: Verify skeleton colors match design (gray-800 background)
6. **Transition to content**: Verify skeleton disappears and content appears smoothly without layout shift
7. **Mobile skeleton layout**: Test skeletons on mobile, verify they adapt to single-column layout
8. **Long loading**: Simulate very slow network, ensure skeleton doesn't disappear prematurely
9. **Content mismatch**: Verify skeleton proportions match actual content (not too wide/tall)
10. **Accessibility**: Verify skeletons are properly marked as loading state (use aria-busy or similar)

## Notes for AI Agent
- Skeletons must match final layout exactly—no layout shift when content loads
- Use animate-pulse Tailwind directive—it's built-in and performant
- Skeleton colors should be slightly darker than background for visibility
- Keep skeleton animations subtle (2-3s duration) to avoid distraction
- Suspense boundaries should be at route level for best UX
- Test with network throttling to verify skeletons appear before content
- Each skeleton component should be a quick copy from the real component's HTML structure
- Consider adding aria-busy="true" to skeleton containers for accessibility
- Future enhancement: add "shimmer" animation option for more premium feel
- Don't over-engineer skeletons—simple animate-pulse is usually best
