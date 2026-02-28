# Phase 007 — Hard-Block Gate Check Engine

## Objective
Implement server-side gate checking logic that enforces linear progression through Helix stages. No step or stage can be advanced until all prerequisites are complete with valid evidence, creating a hard-block quality control mechanism.

## Prerequisites
- Phase 001 — Helix Mode Database Migration — database tables ready
- Phase 005 — Stage & Step Data Model — evidence requirements defined
- All previous phases complete

## Epic Context
**Epic:** 1 — Foundation & Mode Infrastructure
**Phase:** 007 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Helix Mode's core strength is enforcing quality through hard-block gates. A user cannot advance to the next step unless the current step has valid evidence. A user cannot enter the next stage until all steps in the current stage are complete. This phase implements the server-side validation that enforces these rules.

The gate check engine validates:
1. Evidence exists and meets type requirements
2. All steps in current stage are complete
3. Previous stage gate is passed
4. Current step is not locked

---

## Detailed Requirements

### 1. Create Gate Check Service
#### File: `lib/helix/gate-check.ts` (NEW)
Create the core gate checking logic for step and stage progression.

```typescript
import {
  getProjectSteps,
  getStageGate,
  HelixStep,
  HelixStageGate,
} from '@/lib/db/helix';
import { getStep, getStage } from '@/config/helix-process';

export interface GateCheckResult {
  canAdvance: boolean;
  blockers: string[];
  warnings: string[];
  nextAction?: string;
}

/**
 * Check if a step can be marked complete
 */
export async function canCompleteStep(
  projectId: string,
  stepKey: string
): Promise<GateCheckResult> {
  const step = getStep(stepKey);

  if (!step) {
    return {
      canAdvance: false,
      blockers: ['Step not found in Helix process definition'],
    };
  }

  // Check if previous step is complete
  const prevStep = getPreviousStepKey(stepKey);
  if (prevStep) {
    const allSteps = await getProjectSteps(projectId);
    const prevStepData = allSteps.find((s) => s.step_key === prevStep);
    if (!prevStepData || prevStepData.status !== 'complete') {
      return {
        canAdvance: false,
        blockers: [`Must complete step ${prevStep} first`],
      };
    }
  }

  return {
    canAdvance: true,
    blockers: [],
    nextAction: `Complete step ${stepKey} with required evidence`,
  };
}

/**
 * Check if a step can be unlocked/activated
 */
export async function canActivateStep(
  projectId: string,
  stepKey: string
): Promise<GateCheckResult> {
  const allSteps = await getProjectSteps(projectId);
  const step = allSteps.find((s) => s.step_key === stepKey);

  if (!step) {
    return {
      canAdvance: false,
      blockers: ['Step not found in project'],
    };
  }

  // Cannot activate if already active or complete
  if (step.status !== 'locked') {
    return {
      canAdvance: false,
      blockers: [`Step is already ${step.status}`],
    };
  }

  // Check if previous step is complete
  const [stageNum, stepNum] = stepKey.split('.').map(Number);
  const prevStepKey = stepNum > 1 ? `${stageNum}.${stepNum - 1}` : null;

  if (prevStepKey) {
    const prevStep = allSteps.find((s) => s.step_key === prevStepKey);
    if (!prevStep || prevStep.status !== 'complete') {
      return {
        canAdvance: false,
        blockers: [
          `Previous step ${prevStepKey} must be complete first`,
        ],
      };
    }
  } else {
    // First step of a stage - check previous stage gate
    if (stageNum > 1) {
      const prevGate = await getStageGate(projectId, stageNum - 1);
      if (!prevGate || prevGate.status !== 'passed') {
        return {
          canAdvance: false,
          blockers: [
            `Stage ${stageNum - 1} gate must be passed before entering Stage ${stageNum}`,
          ],
        };
      }
    }
  }

  return {
    canAdvance: true,
    blockers: [],
    nextAction: `Proceed to step ${stepKey}`,
  };
}

/**
 * Check if a stage gate can be passed
 * Gate passes when all steps in the stage are complete with valid evidence
 */
export async function canPassStageGate(
  projectId: string,
  stageNumber: number
): Promise<GateCheckResult> {
  if (stageNumber < 1 || stageNumber > 8) {
    return {
      canAdvance: false,
      blockers: ['Invalid stage number'],
    };
  }

  const stage = getStage(stageNumber);
  if (!stage) {
    return {
      canAdvance: false,
      blockers: ['Stage not found in process definition'],
    };
  }

  // Check if previous stage gate is passed
  if (stageNumber > 1) {
    const prevGate = await getStageGate(projectId, stageNumber - 1);
    if (!prevGate || prevGate.status !== 'passed') {
      return {
        canAdvance: false,
        blockers: [`Stage ${stageNumber - 1} gate must be passed first`],
      };
    }
  }

  // Check if all steps in stage are complete with valid evidence
  const allSteps = await getProjectSteps(projectId);
  const stageSteps = allSteps.filter((s) => s.stage_number === stageNumber);

  const blockers: string[] = [];

  for (const stepConfig of stage.steps) {
    const stepData = stageSteps.find((s) => s.step_key === stepConfig.key);

    if (!stepData) {
      blockers.push(`Step ${stepConfig.key} data not found`);
      continue;
    }

    if (stepData.status !== 'complete') {
      blockers.push(`Step ${stepConfig.key} is not complete`);
      continue;
    }

    // Validate evidence
    const evidenceValidation = validateEvidence(
      stepData,
      stepConfig.evidenceRequirements
    );
    if (!evidenceValidation.valid) {
      blockers.push(...evidenceValidation.errors);
    }
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
    nextAction: blockers.length === 0 ? `Stage ${stageNumber} is ready to pass` : undefined,
  };
}

/**
 * Validate that evidence meets requirements
 */
function validateEvidence(
  step: HelixStep,
  requirements: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!step.evidence_data) {
    errors.push(`Step ${step.step_key} has no evidence`);
    return { valid: false, errors };
  }

  // Type-specific validation
  switch (requirements.type) {
    case 'text':
      if (typeof step.evidence_data.text !== 'string') {
        errors.push(`Step ${step.step_key}: evidence must be text`);
      } else if (
        requirements.minLength &&
        step.evidence_data.text.length < requirements.minLength
      ) {
        errors.push(
          `Step ${step.step_key}: text is too short (minimum ${requirements.minLength} characters)`
        );
      } else if (
        requirements.maxLength &&
        step.evidence_data.text.length > requirements.maxLength
      ) {
        errors.push(
          `Step ${step.step_key}: text is too long (maximum ${requirements.maxLength} characters)`
        );
      }
      break;

    case 'file':
      if (!step.evidence_data.file_url) {
        errors.push(`Step ${step.step_key}: no file uploaded`);
      } else if (
        requirements.validFileTypes &&
        !requirements.validFileTypes.some((ext: string) =>
          step.evidence_data.file_url.endsWith(ext)
        )
      ) {
        errors.push(
          `Step ${step.step_key}: invalid file type (allowed: ${requirements.validFileTypes.join(', ')})`
        );
      }
      break;

    case 'url':
      if (!step.evidence_data.url) {
        errors.push(`Step ${step.step_key}: no URL provided`);
      } else if (!isValidUrl(step.evidence_data.url)) {
        errors.push(`Step ${step.step_key}: invalid URL format`);
      }
      break;

    case 'checklist':
      if (!Array.isArray(step.evidence_data.items)) {
        errors.push(`Step ${step.step_key}: checklist items invalid`);
      } else {
        const unchecked = (step.evidence_data.items as any[]).filter(
          (item) => !item.checked
        );
        if (unchecked.length > 0) {
          errors.push(
            `Step ${step.step_key}: ${unchecked.length} checklist item(s) not completed`
          );
        }
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Helper to validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to get previous step key
 */
function getPreviousStepKey(stepKey: string): string | null {
  const [stageNum, stepNum] = stepKey.split('.').map(Number);

  if (stepNum > 1) {
    return `${stageNum}.${stepNum - 1}`;
  }

  // Previous stage's last step
  if (stageNum > 1) {
    const prevStage = getStage(stageNum - 1);
    if (prevStage && prevStage.steps.length > 0) {
      const lastStep = prevStage.steps[prevStage.steps.length - 1];
      return lastStep.key;
    }
  }

  return null;
}
```

### 2. Create API Route for Gate Checking
#### File: `app/api/helix/gate-check/route.ts` (NEW)
Create the API endpoint for evaluating gate checks.

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  canActivateStep,
  canCompleteStep,
  canPassStageGate,
} from '@/lib/helix/gate-check';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { projectId, targetType, target } = await request.json();

    // Validate project membership
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (!projectMember) {
      return NextResponse.json(
        { error: 'Not a project member' },
        { status: 403 }
      );
    }

    let result;

    switch (targetType) {
      case 'step-activate':
        result = await canActivateStep(projectId, target);
        break;
      case 'step-complete':
        result = await canCompleteStep(projectId, target);
        break;
      case 'stage-gate':
        result = await canPassStageGate(projectId, parseInt(target));
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid target type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Gate check error:', error);
    return NextResponse.json(
      { error: 'Gate check failed' },
      { status: 500 }
    );
  }
}
```

### 3. Create Hook for Gate Check Validation
#### File: `hooks/useGateCheck.ts` (NEW)
Create a hook for client-side gate checking.

```typescript
'use client';

import { useState } from 'react';

interface GateCheckResult {
  canAdvance: boolean;
  blockers: string[];
  warnings: string[];
  nextAction?: string;
}

export function useGateCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGate = async (
    projectId: string,
    targetType: 'step-activate' | 'step-complete' | 'stage-gate',
    target: string | number
  ): Promise<GateCheckResult | null> => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/helix/gate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          targetType,
          target: target.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Gate check failed');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  return { checkGate, isChecking, error };
}
```

### 4. Create Gate Check UI Component
#### File: `components/helix/gate-check-alert.tsx` (NEW)
Create a component for displaying gate check results to users.

```typescript
'use client';

import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface GateCheckAlertProps {
  canAdvance: boolean;
  blockers: string[];
  warnings: string[];
  nextAction?: string;
}

export function GateCheckAlert({
  canAdvance,
  blockers,
  warnings,
  nextAction,
}: GateCheckAlertProps) {
  if (canAdvance && blockers.length === 0 && warnings.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-200">
              Ready to proceed
            </h3>
            {nextAction && (
              <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                {nextAction}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blockers.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Cannot proceed
              </h3>
              <ul className="mt-2 space-y-1">
                {blockers.map((blocker, idx) => (
                  <li key={idx} className="text-sm text-red-800 dark:text-red-300">
                    • {blocker}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">
                Warnings
              </h3>
              <ul className="mt-2 space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-300">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## File Structure
```
lib/
└── helix/
    └── gate-check.ts (NEW)
hooks/
└── useGateCheck.ts (NEW)
components/
└── helix/
    └── gate-check-alert.tsx (NEW)
app/
└── api/
    └── helix/
        └── gate-check/
            └── route.ts (NEW)
```

---

## Dependencies
- TypeScript v5+ (existing)
- @supabase/supabase-js (existing)

---

## Tech Stack for This Phase
- TypeScript for type safety
- Server-side validation logic
- Next.js API Routes
- React hooks for client integration
- Tailwind CSS for UI

---

## Acceptance Criteria
1. canCompleteStep() returns canAdvance=false if previous step not complete
2. canActivateStep() returns canAdvance=false if step already active/complete
3. canActivateStep() returns canAdvance=false if previous stage gate not passed
4. canPassStageGate() returns canAdvance=false if any step in stage incomplete
5. validateEvidence() checks text length, file types, URL validity, checklist completion
6. GateCheckAlert component shows green success state when canAdvance=true
7. GateCheckAlert component shows red error state with blocker list when canAdvance=false
8. useGateCheck() hook handles async checking and error states
9. POST /api/helix/gate-check validates project membership before checking
10. All blockers are clear and actionable error messages

---

## Testing Instructions
1. Create test project with steps in database
2. Mark step 1.1 complete with valid evidence
3. Call canActivateStep(projectId, '1.2') and verify returns canAdvance=true
4. Mark step 1.1 as locked and call canActivateStep again; verify canAdvance=false with blocker
5. Call canPassStageGate(projectId, 1) with incomplete steps; verify canAdvance=false
6. Complete all steps in stage 1 and call canPassStageGate; verify canAdvance=true
7. Test text validation: add step with min/max length requirements
8. Test file validation: add step with validFileTypes and validate extension
9. Test URL validation: add step with URL requirement and validate format
10. Test checklist validation: add step with checklist items and verify all must be checked

---

## Notes for the AI Agent
- The gate check engine is the enforcement mechanism for the entire Helix Mode
- All gate checks are server-side to prevent client-side tampering
- Evidence validation is strict; any mismatch in requirements returns detailed error messages
- The GateCheckAlert component is reused in step detail pages and stage gate review screens
- Blockers are the hard requirements; warnings are informational
- The validation functions are pure (no side effects) and can be tested in isolation
- Future phases will use these gate checks in the step completion UI (Phase 009+)
