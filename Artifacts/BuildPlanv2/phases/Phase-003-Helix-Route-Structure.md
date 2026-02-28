# Phase 003 — Helix Route Structure

## Objective
Create the route group and layout structure for Helix Mode, including navigation guards that redirect between Open and Helix modes based on project setting. This establishes the foundation for all future Helix-specific pages.

## Prerequisites
- Phase 001 — Helix Mode Database Migration — database tables in place
- Phase 002 — Mode Context Provider & Toggle — context and mode persistence working

## Epic Context
**Epic:** 1 — Foundation & Mode Infrastructure
**Phase:** 003 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The Helix Mode UI lives under `/org/[orgSlug]/project/[projectId]/helix/` which is a separate route group from the main v1 app. A navigation guard in the layout ensures users are routed correctly: if mode is Helix, they go to the Helix layout; if mode is Open, they're redirected to v1 modules. The catch-all route handles unmapped Helix sub-routes and shows an appropriate error.

This phase creates the skeleton for all future Helix pages while maintaining separation from v1 code.

---

## Detailed Requirements

### 1. Create Helix Route Group
#### File: `app/org/[orgSlug]/project/[projectId]/helix/layout.tsx` (NEW)
Create the main Helix layout with navigation guard and HelixModeProvider.

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { useProject } from '@/contexts/ProjectContext';
import { useEffect } from 'react';
import { HelixMideProvider } from '@/contexts/HelixModeContext';

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
    if (isLoading) return; // Wait for mode to load

    if (!isHelixMode) {
      // Redirect to open mode (v1 modules)
      // Default to Hall module if switching away
      const modulePath = `/org/${project?.org_slug}/project/${project?.id}/modules/hall`;
      router.replace(modulePath);
    }
  }, [isHelixMode, isLoading, project, router]);

  // Show loading state while checking mode
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    );
  }

  // If not in Helix Mode, don't render (will redirect above)
  if (!isHelixMode) {
    return null;
  }

  return (
    <div className="flex h-screen bg-bg-primary dark:bg-bg-primary-dark">
      {/* Helix-specific sidebar will be added in Phase 004 */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700">
        {/* Sidebar content */}
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with breadcrumbs and mode toggle */}
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Helix Mode
            </h1>
            {/* Mode toggle will render here via parent layout */}
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

### 2. Create Helix Loading Skeleton
#### File: `app/org/[orgSlug]/project/[projectId]/helix/loading.tsx` (NEW)
Create a loading skeleton for Helix pages to show while data is loading.

```typescript
export default function HelixLoading() {
  return (
    <div className="flex-1 overflow-auto bg-bg-secondary dark:bg-bg-secondary-dark">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header skeleton */}
        <div className="mb-8 space-y-4">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          <div className="h-6 w-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>

        {/* Pipeline skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3"
            >
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 3. Create Helix Root Page
#### File: `app/org/[orgSlug]/project/[projectId]/helix/page.tsx` (NEW)
Create the main Helix dashboard page that will be rendered when accessing `/helix`.

```typescript
'use client';

import { Suspense } from 'react';
import { useHelixMode } from '@/contexts/HelixModeContext';
import HelixLoading from './loading';

export default function HelixPage() {
  const { currentStage, stageProgress } = useHelixMode();

  return (
    <Suspense fallback={<HelixLoading />}>
      <div className="flex-1 overflow-auto bg-bg-secondary dark:bg-bg-secondary-dark">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Helix Process
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Follow the 8-stage development process to deliver quality software
            </p>
          </div>

          {/* Overall Progress */}
          <div className="mb-8 bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Overall Progress
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {calculateOverallProgress(stageProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-accent-cyan h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${calculateOverallProgress(stageProgress)}%`,
                  }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {currentStage ? `Currently on Stage ${currentStage}` : 'Ready to begin'}
            </p>
          </div>

          {/* 8 Stages Pipeline - will be populated in Phase 006 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => {
              const stageNum = i + 1;
              const progress = stageProgress.get(stageNum);
              const isActive = currentStage === stageNum;

              return (
                <div
                  key={stageNum}
                  className={`rounded-lg p-4 border-2 transition-all ${
                    isActive
                      ? 'border-accent-cyan bg-accent-cyan/5 dark:bg-accent-cyan/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Stage {stageNum}
                  </h3>
                  {progress && (
                    <>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {progress.completed} / {progress.total} steps
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div
                          className="bg-accent-cyan h-1 rounded-full"
                          style={{
                            width: `${
                              progress.total > 0
                                ? (progress.completed / progress.total) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Suspense>
  );
}

function calculateOverallProgress(
  stageProgress: Map<number, { completed: number; total: number }>
): number {
  let totalCompleted = 0;
  let totalSteps = 0;

  for (let i = 1; i <= 8; i++) {
    const progress = stageProgress.get(i);
    if (progress) {
      totalCompleted += progress.completed;
      totalSteps += progress.total;
    }
  }

  return totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;
}
```

### 4. Create Catch-All Route for Helix Sub-Routes
#### File: `app/org/[orgSlug]/project/[projectId]/helix/[...slug]/page.tsx` (NEW)
Create a catch-all route that handles undefined Helix sub-routes and shows an error message.

```typescript
'use client';

import Link from 'next/link';
import { useProject } from '@/contexts/ProjectContext';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function HelixNotFound({
  params,
}: {
  params: { slug: string[] };
}) {
  const { project } = useProject();

  return (
    <div className="flex-1 overflow-auto bg-bg-secondary dark:bg-bg-secondary-dark flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The Helix page "{params.slug.join('/')}" doesn't exist yet.
        </p>
        <Link
          href={`/org/${project?.org_slug}/project/${project?.id}/helix`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-cyan text-white hover:bg-accent-cyan/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Helix Dashboard
        </Link>
      </div>
    </div>
  );
}
```

### 5. Create Route Structure Type Definitions
#### File: `types/helix-routes.ts` (NEW)
Create TypeScript types for Helix route parameters to ensure type safety.

```typescript
/**
 * Helix Route Parameters
 * All Helix routes follow pattern:
 * /org/[orgSlug]/project/[projectId]/helix/[...route]
 */

export type HelixRootParams = {
  orgSlug: string;
  projectId: string;
};

export type HelixStageParams = HelixRootParams & {
  stageNumber: string;
};

export type HelixStepParams = HelixRootParams & {
  stageNumber: string;
  stepKey: string;
};

/**
 * Helix page routes to be implemented
 */
export const HELIX_ROUTES = {
  ROOT: (orgSlug: string, projectId: string) =>
    `/org/${orgSlug}/project/${projectId}/helix`,
  DASHBOARD: (orgSlug: string, projectId: string) =>
    `/org/${orgSlug}/project/${projectId}/helix`,
  STAGE: (orgSlug: string, projectId: string, stageNumber: number) =>
    `/org/${orgSlug}/project/${projectId}/helix/stage/${stageNumber}`,
  STEP: (orgSlug: string, projectId: string, stepKey: string) =>
    `/org/${orgSlug}/project/${projectId}/helix/step/${stepKey}`,
  SETTINGS: (orgSlug: string, projectId: string) =>
    `/org/${orgSlug}/project/${projectId}/helix/settings`,
};

export const getHelixBreadcrumbs = (
  orgSlug: string,
  projectId: string,
  current?: 'dashboard' | 'stage' | 'step' | 'settings'
) => {
  const items = [
    { label: 'Dashboard', href: HELIX_ROUTES.ROOT(orgSlug, projectId) },
  ];

  if (current) {
    switch (current) {
      case 'stage':
        items.push({ label: 'Stage', href: '#' });
        break;
      case 'step':
        items.push({ label: 'Step', href: '#' });
        break;
      case 'settings':
        items.push({ label: 'Settings', href: HELIX_ROUTES.SETTINGS(orgSlug, projectId) });
        break;
    }
  }

  return items;
};
```

---

## File Structure
```
app/org/[orgSlug]/project/[projectId]/
└── helix/
    ├── layout.tsx (NEW)
    ├── loading.tsx (NEW)
    ├── page.tsx (NEW)
    └── [...slug]/
        └── page.tsx (NEW)

types/
└── helix-routes.ts (NEW)
```

---

## Dependencies
- React 18+ (existing)
- Next.js 16+ (existing)
- TypeScript v5+ (existing)

---

## Tech Stack for This Phase
- Next.js Route Groups
- Next.js Dynamic Routes
- React Suspense
- TypeScript for route safety
- Tailwind CSS for styling

---

## Acceptance Criteria
1. Route directory `helix/` created under project layout (real folder, not route group)
2. Layout.tsx wraps children and applies navigation guard for mode checking
3. Navigation guard redirects to Open Mode if isHelixMode is false
4. Loading.tsx provides skeleton UI while page loads
5. Root Helix page (/helix) displays and shows 8 stage cards
6. Overall progress percentage calculated correctly on root page
7. Current stage highlighted with cyan border on root page
8. Catch-all route [...slug] shows 404 message with link back to dashboard
9. HELIX_ROUTES constants provide URL builders for all future Helix pages
10. All route parameters typed with TypeScript for IDE support

---

## Testing Instructions
1. Navigate to project with mode set to 'open' and attempt to access /helix route
2. Verify automatic redirect to Open Mode (v1 modules) occurs
3. Toggle project mode to 'helix' and navigate to /helix
4. Verify Helix layout renders with header and sidebar areas
5. Verify loading skeleton shows while page loads initially
6. Verify root Helix page displays with 8 stage cards and overall progress
7. Verify overall progress percentage updates when steps are completed
8. Navigate to `/helix/undefined` and verify 404 page with back link
9. Verify breadcrumb matches current page via HELIX_ROUTES
10. Test typing by using HELIX_ROUTES constants in a test component and verify TypeScript catches errors

---

## Notes for the AI Agent
- The navigation guard runs client-side after HelixModeProvider loads isHelixMode
- The loading skeleton uses animate-pulse from Tailwind for smooth appearance
- The root page renders stage cards in a responsive grid (1 col mobile, 2 col tablet, 4 col desktop)
- The catch-all route [...slug] will be improved in future phases with better error messaging
- HELIX_ROUTES should be imported wherever internal Helix links are generated
- The current implementation of the root page is a placeholder; Phase 006 will replace it with the full dashboard
- Do not add actual sidebar content yet; Phase 004 will implement the Helix sidebar navigation
- The layout component uses 'use client' directive to enable useHelixMode hook
