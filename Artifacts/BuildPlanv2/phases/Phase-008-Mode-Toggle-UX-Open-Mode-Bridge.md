# Phase 008 — Mode Toggle UX & Open Mode Bridge

## Objective
Polish the mode toggle user experience, add warnings when switching away from incomplete Helix progress, ensure deep linking works across both modes, and bridge navigation between Helix and Open modes seamlessly.

## Prerequisites
- Phase 002 — Mode Context Provider & Toggle — toggle component exists
- Phase 003 — Helix Route Structure — Helix routes in place
- All previous phases complete

## Epic Context
**Epic:** 1 — Foundation & Mode Infrastructure
**Phase:** 008 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Mode switching must be safe and clear. Users should understand what happens when they toggle between modes, be warned about losing Helix progress, and be able to navigate seamlessly between the two. Deep links should work in both modes. When in Helix Mode, the sidebar shows Helix navigation; when in Open Mode, it shows v1 modules. This phase completes the bridge between the two modes and provides a polished user experience.

---

## Detailed Requirements

### 1. Enhance Mode Toggle with Better UX
#### File: `src/components/HelixModeToggle.tsx` (UPDATED)
Update the mode toggle with improved confirmation logic and progress warnings.

```typescript
'use client';

import { useState } from 'react';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface ModeToggleProps {
  showLabel?: boolean;
}

export function HelixModeToggle({ showLabel = true }: ModeToggleProps) {
  const {
    isHelixMode,
    toggleMode,
    canToggleMode,
    toggleError,
    isLoading,
    currentStage,
    stageProgress,
  } = useHelixMode();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggleClick = () => {
    if (isHelixMode && currentStage !== null) {
      // Show confirmation when switching away from active Helix Mode
      setShowConfirm(true);
    } else {
      // Direct toggle to Helix Mode or back when not started
      toggleMode();
    }
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    await toggleMode();
  };

  // Calculate progress info
  let progressInfo = '';
  if (isHelixMode && currentStage) {
    let totalCompleted = 0;
    let totalSteps = 0;
    for (let i = 1; i <= 8; i++) {
      const progress = stageProgress.get(i);
      if (progress) {
        totalCompleted += progress.completed;
        totalSteps += progress.total;
      }
    }
    const progressPercent = totalSteps > 0
      ? Math.round((totalCompleted / totalSteps) * 100)
      : 0;
    progressInfo = `${progressPercent}% complete`;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Mode Icon & Label */}
        {showLabel && (
          <div className="hidden sm:flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                isHelixMode ? 'bg-accent-cyan' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isHelixMode ? 'Helix' : 'Open'} Mode
            </span>
            {progressInfo && (
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                ({progressInfo})
              </span>
            )}
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={handleToggleClick}
          disabled={isLoading || !canToggleMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isHelixMode ? 'bg-accent-cyan' : 'bg-gray-300'
          } ${
            isLoading || !canToggleMode
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:shadow-md'
          }`}
          title={
            !canToggleMode
              ? 'Complete or reset Helix progress to switch modes'
              : `Switch to ${isHelixMode ? 'Open' : 'Helix'} Mode`
          }
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isHelixMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>

        {/* Info Tooltip */}
        {!canToggleMode && (
          <div className="hidden lg:flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <HelpCircle className="w-3 h-3" />
            <span>In progress</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {toggleError && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900 dark:text-red-200">
              {toggleError}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-md w-full animate-in">
            <div className="flex items-start gap-4 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Switch to Open Mode?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  You're currently in Stage {currentStage} of Helix Mode. Switching to Open Mode
                  will pause your progress.
                </p>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 mb-4 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                Your progress will be saved and you can return to Helix Mode later.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 text-white transition-colors font-medium"
              >
                Switch to Open Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

### 2. Create Unified Sidebar Navigation Component
#### File: `src/components/ProjectSidebar.tsx` (NEW)
Create a sidebar that shows either Helix or Open Mode navigation based on mode.

```typescript
'use client';

import { useHelixMode } from '@/contexts/HelixModeContext';
import { HelixSidebar } from './HelixSidebar';
import { OpenModuleSidebar } from './OpenModuleSidebar'; // Existing v1 component

export function ProjectSidebar() {
  const { isHelixMode, isLoading } = useHelixMode();

  if (isLoading) {
    return (
      <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return isHelixMode ? <HelixSidebar /> : <OpenModuleSidebar />;
}
```

### 3. Create Deep Link Handler
#### File: `src/lib/helix/deep-link.ts` (NEW)
Create utilities for handling deep links across both modes.

```typescript
/**
 * Deep Link Utilities for Helix and Open Modes
 * Ensures URLs work correctly in both modes
 */

export interface DeepLinkOptions {
  orgSlug: string;
  projectId: string;
  mode: 'helix' | 'open';
  targetType?: 'stage' | 'step' | 'module';
  targetId?: string | number;
}

/**
 * Generate a deep link for a specific location
 */
export function generateDeepLink({
  orgSlug,
  projectId,
  mode,
  targetType,
  targetId,
}: DeepLinkOptions): string {
  const baseUrl = `/org/${orgSlug}/project/${projectId}`;

  if (mode === 'helix') {
    if (!targetType || !targetId) {
      return `${baseUrl}/helix`;
    }

    switch (targetType) {
      case 'step':
        return `${baseUrl}/helix/step/${targetId}`;
      case 'stage':
        return `${baseUrl}/helix/stage/${targetId}`;
      default:
        return `${baseUrl}/helix`;
    }
  } else {
    // Open Mode (v1)
    if (!targetType || !targetId) {
      return `${baseUrl}/modules/hall`; // Default to Hall module
    }

    switch (targetType) {
      case 'module':
        return `${baseUrl}/modules/${targetId}`;
      default:
        return `${baseUrl}/modules/hall`;
    }
  }
}

/**
 * Parse a deep link to extract mode and target
 */
export function parseDeepLink(
  pathname: string
): { mode: 'helix' | 'open'; targetType?: string; targetId?: string } | null {
  const helixMatch = pathname.match(
    /\/org\/[^/]+\/project\/[^/]+\/helix(?:\/(\w+)\/([^/]+))?/
  );
  if (helixMatch) {
    return {
      mode: 'helix',
      targetType: helixMatch[1],
      targetId: helixMatch[2],
    };
  }

  const moduleMatch = pathname.match(
    /\/org\/[^/]+\/project\/[^/]+\/modules\/(\w+)/
  );
  if (moduleMatch) {
    return {
      mode: 'open',
      targetType: 'module',
      targetId: moduleMatch[1],
    };
  }

  return null;
}

/**
 * Translate a link from one mode to another
 * Used when switching modes to maintain context
 */
export function translateLinkBetweenModes(
  orgSlug: string,
  projectId: string,
  fromMode: 'helix' | 'open',
  toMode: 'helix' | 'open',
  targetType?: string,
  targetId?: string
): string {
  // If no specific target, go to default landing page
  if (!targetType) {
    return generateDeepLink({
      orgSlug,
      projectId,
      mode: toMode,
    });
  }

  // Try to find a meaningful equivalent in the target mode
  // For now, just go to the default landing page
  return generateDeepLink({
    orgSlug,
    projectId,
    mode: toMode,
  });
}
```

### 4. Create Navigation Guard for Deep Links
#### File: `src/components/DeepLinkNavigationGuard.tsx` (NEW)
Create a component that handles deep link navigation when switching modes.

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { useProject } from '@/contexts/ProjectContext';
import { parseDeepLink, translateLinkBetweenModes } from '@/lib/helix/deep-link';

/**
 * Navigation guard that redirects to appropriate URL when mode changes
 */
export function DeepLinkNavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { project } = useProject();
  const { isHelixMode, isLoading } = useHelixMode();

  useEffect(() => {
    if (isLoading || !project) return;

    const link = parseDeepLink(pathname);
    if (!link) return;

    // If current mode matches link mode, no redirect needed
    if (
      (isHelixMode && link.mode === 'helix') ||
      (!isHelixMode && link.mode === 'open')
    ) {
      return;
    }

    // Redirect to translated link in correct mode
    const newUrl = translateLinkBetweenModes(
      project.org_slug,
      project.id,
      link.mode,
      isHelixMode ? 'helix' : 'open',
      link.targetType,
      link.targetId
    );

    router.replace(newUrl);
  }, [isHelixMode, isLoading, pathname, project, router]);

  return null;
}
```

### 5. Create Breadcrumb Component for Both Modes
#### File: `src/components/ProjectBreadcrumb.tsx` (NEW)
Create breadcrumbs that work in both Helix and Open modes.

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { useHelixMode } from '@/contexts/HelixModeContext';
import { ChevronRight } from 'lucide-react';

export function ProjectBreadcrumb() {
  const pathname = usePathname();
  const { project } = useProject();
  const { isHelixMode, currentStage } = useHelixMode();

  if (!project) return null;

  const breadcrumbs: Array<{ label: string; href?: string }> = [
    { label: 'Projects', href: '/projects' },
    {
      label: project.name,
      href: `/org/${project.org_slug}/project/${project.id}/helix`,
    },
  ];

  if (isHelixMode) {
    breadcrumbs.push({
      label: 'Helix',
      href: `/org/${project.org_slug}/project/${project.id}/helix`,
    });

    if (currentStage) {
      breadcrumbs.push({
        label: `Stage ${currentStage}`,
      });
    }
  } else {
    breadcrumbs.push({
      label: 'Open Mode',
    });
  }

  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((crumb, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {idx > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
          )}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-white font-medium">
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
```

### 6. Update Project Layout to Include All Components
#### File: `src/app/(auth)/org/[orgSlug]/project/[projectId]/layout.tsx` (UPDATED)
Integrate all new components into the project layout.

```typescript
'use client';

import { HelixModeProvider } from '@/contexts/HelixModeContext';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { ProjectBreadcrumb } from '@/components/ProjectBreadcrumb';
import { HelixModeToggle } from '@/components/HelixModeToggle';
import { DeepLinkNavigationGuard } from '@/components/DeepLinkNavigationGuard';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HelixModeProvider>
      <DeepLinkNavigationGuard />
      <div className="flex h-screen bg-bg-primary dark:bg-bg-primary-dark">
        {/* Dynamic Sidebar - shows Helix or Open Mode nav */}
        <ProjectSidebar />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <ProjectBreadcrumb />
              <HelixModeToggle />
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </HelixModeProvider>
  );
}
```

---

## File Structure
```
src/
├── components/
│   ├── HelixModeToggle.tsx (UPDATED)
│   ├── ProjectSidebar.tsx (NEW)
│   ├── ProjectBreadcrumb.tsx (NEW)
│   └── DeepLinkNavigationGuard.tsx (NEW)
├── lib/
│   └── helix/
│       └── deep-link.ts (NEW)
└── app/(auth)/org/[orgSlug]/project/[projectId]/
    └── layout.tsx (UPDATED)
```

---

## Dependencies
- lucide-react (existing)
- React 18+ (existing)
- Next.js 16+ (existing)

---

## Tech Stack for This Phase
- React hooks and context
- Next.js routing and navigation
- TypeScript for type safety
- Tailwind CSS for styling

---

## Acceptance Criteria
1. HelixModeToggle shows progress percentage when in active Helix Mode
2. HelixModeToggle is disabled when Helix Mode in progress (mid-stage)
3. Confirmation dialog appears when switching away from active Helix Mode
4. Confirmation dialog shows current stage and warning about paused progress
5. ProjectSidebar renders HelixSidebar when isHelixMode=true
6. ProjectSidebar renders OpenModuleSidebar when isHelixMode=false
7. Deep link parser correctly identifies mode and target from pathname
8. generateDeepLink() creates correct URLs for both modes
9. DeepLinkNavigationGuard redirects when URL mode doesn't match project mode
10. ProjectBreadcrumb shows appropriate breadcrumbs for current mode

---

## Testing Instructions
1. Activate Helix Mode and complete Stage 1
2. Click mode toggle and verify confirmation dialog appears
3. Verify confirmation dialog shows Stage 1 and warning message
4. Click Cancel and verify mode doesn't change
5. Click Confirm and verify mode changes to Open
6. Switch back to Helix and verify Stage 1 progress is preserved
7. Test parseDeepLink() with various pathnames for both modes
8. Test generateDeepLink() with different targetTypes
9. Test translateLinkBetweenModes() translation logic
10. Verify breadcrumb updates correctly when mode changes

---

## Notes for the AI Agent
- The mode toggle disabled state prevents mid-process switching
- The confirmation dialog uses amber/warning color to indicate caution
- Progress info displayed in toggle helps users understand where they are
- Deep link utilities enable sharing URLs that work in correct mode context
- ProjectSidebar abstracts the choice between Helix and Open navigation
- The DeepLinkNavigationGuard runs on mount to redirect if needed
- Breadcrumb component is mode-aware and shows appropriate context
- All navigation between modes is safe; user progress is never lost
- Phase 008 completes the foundation phase, allowing all 157 phases to be built on this stable base
