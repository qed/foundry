# PHASE 048 — Error Handling & Edge Cases

## Objective
Implement comprehensive error boundaries, network error handling, save failure recovery, and edge case guards throughout all Helix pages. Ensure graceful degradation and helpful user feedback when things go wrong.

## Prerequisites
- Phase 001-044 completed (all Helix MVP functionality)
- Error boundary pattern from v1 available
- API routes for Helix data operations
- Network request infrastructure in place

## Epic Context
**Epic 6 — MVP Polish & Cross-Cutting**
Phase 048 implements robust error handling across Helix Mode. This cross-cutting concern ensures reliability, user trust, and maintainability by handling failures gracefully and providing clear recovery paths.

## Context
The Helix MVP (Phases 001-044) provides core functionality but may fail in various ways:
- Rendering errors in components (boundary conditions, bad data)
- Network failures (offline, API errors, timeouts)
- Save failures (database errors, race conditions)
- Incomplete data (missing evidence, locked steps, invalid state)
- Edge cases (0 phases, all steps done, navigation to locked/missing steps)

This phase delivers resilient error handling that keeps users in control and provides clear recovery options.

## Detailed Requirements

### 1. Helix Error Boundary Component
```typescript
// components/helix/HelixErrorBoundary.tsx
'use client';

import React, { ReactNode, ErrorInfo } from 'react';

interface HelixErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  level?: 'page' | 'section' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class HelixErrorBoundary extends React.Component<
  HelixErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: HelixErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('Helix Error Boundary caught:', error, errorInfo);

    this.setState({
      errorInfo,
    });

    // Could log to error tracking service here
    if (typeof window !== 'undefined') {
      // Example: Sentry integration
      // Sentry.captureException(error, { contexts: { helix: errorInfo } });
    }
  }

  retry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      const level = this.props.level || 'section';
      const isPageLevel = level === 'page';

      return (
        <div
          className={`${
            isPageLevel ? 'min-h-screen' : ''
          } bg-[#0f1117] flex items-center justify-center p-6`}
        >
          <div className="bg-[#1a1d27] border-l-4 border-red-500 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  {isPageLevel ? 'Helix Mode Error' : 'Component Error'}
                </h2>

                <p className="text-gray-400 mb-4 text-sm">
                  {isPageLevel
                    ? 'Something went wrong loading this page. Please try refreshing or contact support.'
                    : 'This section encountered an error. You can retry or navigate away.'}
                </p>

                {process.env.NODE_ENV === 'development' && (
                  <details className="mb-4 text-xs text-gray-500 bg-gray-900 p-2 rounded">
                    <summary className="cursor-pointer font-semibold">
                      Error Details (Dev Only)
                    </summary>
                    <pre className="mt-2 overflow-auto max-h-48">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={this.retry}
                    className="flex-1 px-4 py-2 bg-[#00d4ff] hover:bg-[#00a8cc] text-[#0f1117] rounded font-semibold transition-colors"
                  >
                    Retry
                  </button>

                  {isPageLevel && (
                    <button
                      onClick={() => (window.location.href = '/')}
                      className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded font-semibold transition-colors"
                    >
                      Go Home
                    </button>
                  )}
                </div>

                <div className="mt-4 text-xs text-gray-600">
                  Retry count: {this.state.retryCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HelixErrorBoundary;
```

### 2. Error Handling Library
```typescript
// lib/helix/error-handling.ts
import { AxiosError } from 'axios';

export class HelixError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'HelixError';
  }
}

/**
 * Network error detection and handling
 */
export function detectNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response; // Request made but no response
  }

  if (error instanceof TypeError) {
    return error.message.includes('fetch') || error.message.includes('network');
  }

  return false;
}

/**
 * User-friendly error messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof HelixError) {
    return error.message;
  }

  if (error instanceof AxiosError) {
    if (!error.response) {
      return 'Network error. Please check your connection and try again.';
    }

    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authenticated. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'There was a conflict with your request. Please refresh and try again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return `Error: ${error.response.statusText || 'Unknown error'}`;
    }
  }

  if (error instanceof Error) {
    return error.message || 'An unknown error occurred.';
  }

  return 'An unknown error occurred.';
}

/**
 * Validation errors for incomplete data
 */
export function validateStepData(step: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!step.key) errors.push('Step key is missing');
  if (!step.name) errors.push('Step name is missing');
  if (Array.isArray(step.evidence) && step.evidence.length === 0) {
    errors.push('No evidence collected for this step');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateStageData(stage: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!stage.key) errors.push('Stage key is missing');
  if (!stage.name) errors.push('Stage name is missing');
  if (!Array.isArray(stage.steps)) errors.push('Stage steps are missing');
  if (Array.isArray(stage.steps) && stage.steps.length === 0) {
    errors.push('Stage has no steps');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Save failure queue for offline support
 */
export interface QueuedSave {
  id: string;
  type: 'step-evidence' | 'step-completion' | 'gate-check';
  data: any;
  timestamp: number;
  retryCount: number;
}

export class SaveQueue {
  private queue: Map<string, QueuedSave> = new Map();
  private isProcessing = false;

  add(queuedSave: QueuedSave): void {
    this.queue.set(queuedSave.id, queuedSave);
    this.persistQueue();
  }

  getAll(): QueuedSave[] {
    return Array.from(this.queue.values());
  }

  remove(id: string): void {
    this.queue.delete(id);
    this.persistQueue();
  }

  async processQueue(handler: (save: QueuedSave) => Promise<void>): Promise<void> {
    if (this.isProcessing || this.queue.size === 0) return;

    this.isProcessing = true;

    try {
      for (const [id, save] of this.queue) {
        if (save.retryCount >= 3) {
          console.warn(`Save ${id} exceeded max retries`);
          continue;
        }

        try {
          await handler(save);
          this.remove(id);
        } catch (error) {
          save.retryCount++;
          this.add(save);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private persistQueue(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'helix-save-queue',
        JSON.stringify(Array.from(this.queue.values()))
      );
    }
  }

  private loadQueue(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('helix-save-queue');
      if (stored) {
        try {
          const items = JSON.parse(stored) as QueuedSave[];
          items.forEach(item => this.queue.set(item.id, item));
        } catch (error) {
          console.error('Failed to load save queue:', error);
        }
      }
    }
  }
}

/**
 * Offline detection and handling
 */
export class OfflineDetector {
  private isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
  private listeners: ((online: boolean) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true));
      window.addEventListener('offline', () => this.setOnline(false));
    }
  }

  private setOnline(online: boolean): void {
    this.isOnline = online;
    this.listeners.forEach(listener => listener(online));
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const offlineDetector = new OfflineDetector();
export const saveQueue = new SaveQueue();
```

### 3. Network Error Handling Hook
```typescript
// hooks/helix/useHelixNetworkError.ts
import { useState, useCallback, useEffect } from 'react';
import { detectNetworkError, getErrorMessage, offlineDetector } from '@/lib/helix/error-handling';

export function useHelixNetworkError() {
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineDetector.subscribe(online => {
      setIsOnline(online);
      if (online && error) {
        setError(null);
      }
    });

    return unsubscribe;
  }, [error]);

  const handleError = useCallback((error: unknown) => {
    if (detectNetworkError(error)) {
      setError('Network error. Your changes may not be saved.');
    } else {
      setError(getErrorMessage(error));
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retryLastAction = useCallback(async (action: () => Promise<void>) => {
    try {
      setIsRetrying(true);
      await action();
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsRetrying(false);
    }
  }, [handleError]);

  return {
    error,
    isOnline,
    isRetrying,
    handleError,
    clearError,
    retryLastAction,
  };
}
```

### 4. Edge Case Handlers
```typescript
// lib/helix/edge-case-handlers.ts
import { Stage, Step } from '@/types/helix';

/**
 * Check if process has 0 phases (empty)
 */
export function isProcessEmpty(stages: Stage[]): boolean {
  return stages.length === 0 || stages.every(s => !s.steps || s.steps.length === 0);
}

/**
 * Check if all steps are already complete
 */
export function isProcessFullyComplete(stages: Stage[]): boolean {
  const allSteps = stages.flatMap(s => s.steps || []);
  return allSteps.length > 0 && allSteps.every(s => s.completedAt);
}

/**
 * Check if user can navigate to step
 */
export function canNavigateToStep(step: Step, allSteps: Step[]): boolean {
  // Can always navigate to completed steps
  if (step.completedAt) return true;

  // Can navigate to current or next available step
  const stepIndex = allSteps.findIndex(s => s.key === step.key);
  if (stepIndex === 0) return true; // First step always available

  // Check if previous step is complete
  const previousStep = allSteps[stepIndex - 1];
  return previousStep?.completedAt ? true : false;
}

/**
 * Get next available step
 */
export function getNextAvailableStep(
  stages: Stage[],
  currentStepKey?: string
): Step | null {
  const allSteps = stages.flatMap(s => s.steps || []);

  if (allSteps.length === 0) return null;

  const currentIndex = currentStepKey
    ? allSteps.findIndex(s => s.key === currentStepKey)
    : -1;

  for (let i = currentIndex + 1; i < allSteps.length; i++) {
    if (!allSteps[i].completedAt) {
      return allSteps[i];
    }
  }

  return allSteps[0]; // Default to first step
}

/**
 * Handle missing evidence gracefully
 */
export function getMissingEvidenceMessage(step: Step): string | null {
  if (!step.evidence || step.evidence.length === 0) {
    return `No evidence collected yet. At least one evidence item is required to complete this step.`;
  }
  return null;
}

/**
 * Validate step navigation
 */
export interface StepNavigationError {
  canNavigate: boolean;
  reason?: string;
}

export function validateStepNavigation(
  targetStep: Step,
  allSteps: Step[],
  currentStageKey: string,
  allStages: Stage[]
): StepNavigationError {
  // Check if step exists
  if (!targetStep) {
    return { canNavigate: false, reason: 'Step not found' };
  }

  // Check if locked/not-yet-available
  if (!canNavigateToStep(targetStep, allSteps)) {
    const previousStep = allSteps[allSteps.indexOf(targetStep) - 1];
    return {
      canNavigate: false,
      reason: `This step is locked. You must complete "${previousStep?.name || 'the previous step'}" first.`,
    };
  }

  // Check if stage is locked
  const stage = allStages.find(s => s.key === currentStageKey);
  if (stage?.locked) {
    return {
      canNavigate: false,
      reason: 'This stage is locked and cannot be accessed.',
    };
  }

  return { canNavigate: true };
}
```

### 5. 404 Page for Invalid Steps
```typescript
// app/[workspaceSlug]/projects/[projectKey]/helix/step/[stepKey]/not-found.tsx
'use client';

import Link from 'next/link';

export default function StepNotFound() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold text-white mb-2">Step Not Found</h1>
        <p className="text-gray-400 mb-6">
          The step you're looking for doesn't exist or has been deleted.
        </p>

        <Link
          href="/helix/dashboard"
          className="inline-block px-6 py-3 bg-[#00d4ff] hover:bg-[#00a8cc] text-[#0f1117] rounded font-semibold transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

### 6. Integration in Helix Pages
```typescript
// In app/[workspaceSlug]/projects/[projectKey]/helix/layout.tsx

import HelixErrorBoundary from '@/components/helix/HelixErrorBoundary';

export default function HelixLayout({ children }: { children: React.ReactNode }) {
  return (
    <HelixErrorBoundary level="page">
      {children}
    </HelixErrorBoundary>
  );
}

// For individual step pages:
// app/[workspaceSlug]/projects/[projectKey]/helix/step/[stepKey]/page.tsx

import HelixErrorBoundary from '@/components/helix/HelixErrorBoundary';
import { validateStepNavigation, getNextAvailableStep } from '@/lib/helix/edge-case-handlers';

export default function StepPage() {
  const { stages, steps } = useHelix();

  // Handle edge cases
  const validation = validateStepNavigation(currentStep, allSteps, currentStageKey, stages);
  if (!validation.canNavigate) {
    return (
      <div className="p-6 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded">
        <p className="text-yellow-300">{validation.reason}</p>
        <button
          onClick={() => navigateToStep(getNextAvailableStep(stages)?.key || '')}
          className="mt-3 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded"
        >
          Go to Next Available Step
        </button>
      </div>
    );
  }

  return (
    <HelixErrorBoundary level="section">
      <StepDetailView step={currentStep} />
    </HelixErrorBoundary>
  );
}
```

## File Structure
```
components/helix/
├── HelixErrorBoundary.tsx       (Error boundary component)
lib/helix/
├── error-handling.ts            (Error utilities and classes)
├── edge-case-handlers.ts        (Edge case logic)
hooks/helix/
└── useHelixNetworkError.ts      (Network error hook)
app/[workspaceSlug]/projects/[projectKey]/helix/
├── layout.tsx                   (UPDATED with error boundary)
└── step/[stepKey]/
    ├── not-found.tsx            (404 page)
    └── page.tsx                 (UPDATED with edge case handling)
```

## Dependencies
- React 19+
- Next.js 16+ (App Router)
- axios (for HTTP error detection)
- TypeScript

## Tech Stack
- Next.js 16 App Router
- TypeScript
- React Error Boundaries
- localStorage for queue persistence
- Browser online/offline events

## Acceptance Criteria
1. HelixErrorBoundary catches component rendering errors and displays recovery UI
2. Network errors detected and user receives "Network error" message, can retry
3. Offline detection works: UI shows offline state when navigator.onLine is false
4. Save failures queued in localStorage, automatically retried when online
5. Empty process (0 stages/0 steps) shows helpful message instead of breaking
6. All steps completed process shows completion state properly
7. Invalid step navigation shows "Step locked" error with previous step name
8. Missing evidence shows clear message about required evidence
9. Invalid step keys trigger 404 page with link back to dashboard
10. Error messages are user-friendly and suggest recovery actions

## Testing Instructions
1. **Error boundary rendering**: Trigger error in Helix component, verify error boundary displays with retry button
2. **Network error handling**: Disable network in DevTools, attempt save, verify offline message and queue
3. **Offline recovery**: Go offline, queue a save, then go online, verify save retries automatically
4. **Empty process**: Create project with 0 phases, load Helix mode, verify friendly message appears
5. **Process complete edge case**: Complete all steps, verify UI shows completion state
6. **Locked step navigation**: Attempt to navigate to step 2 without completing step 1, verify lock message
7. **Invalid step key**: Navigate to `/helix/step/invalid-key`, verify 404 page shows
8. **Missing evidence**: Try to complete step with no evidence, verify validation message
9. **Retry functionality**: Queue multiple saves, verify retry count increments and display updates
10. **Development error details**: Build in development mode, trigger error, verify error details show in error boundary

## Notes for AI Agent
- Error boundaries are essential for user trust—use them liberally at page and section levels
- Network error detection must handle timeout errors, CORS errors, connection resets
- Save queue persists in localStorage—clear on app upgrade
- Offline detection uses browser events but can also use periodic ping requests for reliability
- Edge case handlers prevent silent failures—always validate before rendering
- Error messages should suggest actions: "Network error. Please check your connection." vs "Error"
- Test error boundary with intentional errors in development
- Consider Sentry or similar error tracking for production
- Rate limit retries: 3 attempts max per save, then alert user
- Test with slow network (DevTools throttling) to ensure error handling works
- Future enhancement: persist failed saves longer, show notification when they complete
