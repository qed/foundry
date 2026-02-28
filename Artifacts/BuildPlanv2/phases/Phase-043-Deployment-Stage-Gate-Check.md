# Phase 043: Deployment Stage Gate Check

**Status:** Deployment Stage (Gate) | **Phase Number:** 043 | **Epic:** 5

## Objective

Implement the final gate check before marking the entire Helix process complete. This gate validates that all three deployment steps (8.1, 8.2, 8.3) are finished and the deployment is fully verified.

## Prerequisites

- Phase 042 complete: All smoke tests passed
- Database records created for all deployment steps
- Route `/org/[orgSlug]/project/[projectId]/helix/step/gates/8/` available

## Epic Context (Epic 5)

Phase 043 is the final gate in the Helix process. It validates that deployment is complete and successful, enabling the transition to Phase 044 (Process Complete State). This gate confirms:
1. Deployment preparation checklist complete
2. Deployment executed and verified
3. Smoke tests all passed

After this gate passes, the entire Helix process is marked as complete.

## Context

The Deployment stage consists of three sequential steps:
- Step 8.1: Prepare for Deployment (checklist)
- Step 8.2: Deploy to Production (execution)
- Step 8.3: Post-Deploy Verification (smoke tests)

This gate ensures all three are complete before the process can be marked as finished.

## Detailed Requirements with Code

### 1. Gate Requirements & Validation

Create `/lib/helix/deploymentGateValidation.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

export interface DeploymentGateCheckResult {
  passed: boolean;
  requirements: {
    preparationComplete: boolean;
    deploymentExecuted: boolean;
    deploymentVerified: boolean;
    smokeTestsPassed: boolean;
  };
  details: {
    preparation_status: string | null;
    deployment_status: string | null;
    verification_status: string | null;
    smoke_tests_status: string | null;
  };
  blockReason?: string;
}

export async function validateDeploymentGate(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  helixProcessId: string
): Promise<DeploymentGateCheckResult> {
  // Check 1: Preparation complete
  const { data: prepChecklist } = await supabase
    .from('helix_deployment_checklists')
    .select('all_checked')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  const preparationComplete = prepChecklist?.all_checked === true;
  const preparation_status = prepChecklist?.all_checked ? 'complete' : 'incomplete';

  // Check 2: Deployment executed
  const { data: deployment } = await supabase
    .from('helix_deployments')
    .select('status, verification_status')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  const deploymentExecuted = deployment?.status === 'deployed' || deployment?.status === 'verified';
  const deployment_status = deployment?.status || 'not_started';

  // Check 3: Deployment verified
  const deploymentVerified = deployment?.verification_status === 'verified';
  const verification_status = deployment?.verification_status || 'pending';

  // Check 4: Smoke tests passed
  const { data: smokeTestRun } = await supabase
    .from('helix_smoke_test_runs')
    .select('all_passed')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  const smokeTestsPassed = smokeTestRun?.all_passed === true;
  const smoke_tests_status = smokeTestRun?.all_passed ? 'passed' : 'pending';

  // Determine overall result and block reason
  const passed =
    preparationComplete &&
    deploymentExecuted &&
    deploymentVerified &&
    smokeTestsPassed;

  let blockReason = '';
  if (!preparationComplete) {
    blockReason += 'Deployment preparation incomplete. ';
  }
  if (!deploymentExecuted) {
    blockReason += `Deployment not executed (status: ${deployment_status}). `;
  }
  if (!deploymentVerified) {
    blockReason += 'Deployment not verified. ';
  }
  if (!smokeTestsPassed) {
    blockReason += 'Smoke tests not passed. ';
  }

  return {
    passed,
    requirements: {
      preparationComplete,
      deploymentExecuted,
      deploymentVerified,
      smokeTestsPassed
    },
    details: {
      preparation_status,
      deployment_status,
      verification_status,
      smoke_tests_status
    },
    blockReason: blockReason.trim()
  };
}
```

### 2. Server Actions: Deployment Gate

Create `/app/actions/helix/deploymentGate.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import { validateDeploymentGate } from '@/lib/helix/deploymentGateValidation';

export async function checkDeploymentGate(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Verify project access
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('org_id', user.org_id)
    .single();

  if (!project) {
    throw new Error('Project not found');
  }

  // Validate gate
  const gateResult = await validateDeploymentGate(
    supabase,
    projectId,
    helixProcessId
  );

  return gateResult;
}

export async function completeHelixProcess(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Validate gate first
  const gateResult = await validateDeploymentGate(
    supabase,
    projectId,
    helixProcessId
  );

  if (!gateResult.passed) {
    throw new Error(`Gate blocked: ${gateResult.blockReason}`);
  }

  // Update helix process to complete
  const { error } = await supabase
    .from('helix_processes')
    .update({
      status: 'completed',
      current_stage: 8,
      current_step: '8.3',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', helixProcessId);

  if (error) throw error;

  // Record completion
  await supabase
    .from('helix_step_evidence')
    .insert({
      project_id: projectId,
      helix_process_id: helixProcessId,
      step_key: '8-gate-complete',
      evidence_type: 'process_complete',
      status: 'completed',
      evidence_data: {
        timestamp: new Date().toISOString(),
        completed_by: user.id,
        helix_process_completed: true
      }
    });

  return {
    success: true,
    message: 'Helix process completed successfully',
    helixProcessId
  };
}
```

### 3. React Component: Deployment Gate View

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/gates/8/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  checkDeploymentGate,
  completeHelixProcess
} from '@/app/actions/helix/deploymentGate';

interface GatePageProps {
  params: Promise<{
    orgSlug: string;
    projectId: string;
  }>;
}

export default function DeploymentGatePage({ params }: GatePageProps) {
  const router = useRouter();
  const [pageParams, setPageParams] = useState<any>(null);
  const [gateResult, setGateResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await params;
      setPageParams(p);
    })();
  }, [params]);

  useEffect(() => {
    if (!pageParams) return;

    async function checkGate() {
      try {
        // TODO: Get helixProcessId from route context
        // const result = await checkDeploymentGate(pageParams.projectId, helixProcessId);
        // setGateResult(result);
      } catch (error) {
        console.error('Failed to check gate:', error);
      } finally {
        setLoading(false);
      }
    }

    checkGate();
  }, [pageParams]);

  const handleComplete = async () => {
    if (!pageParams || !gateResult?.passed) return;

    setCompleting(true);
    try {
      // TODO: Get helixProcessId
      // await completeHelixProcess(pageParams.projectId, helixProcessId);
      // router.push(`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/process-complete`);
    } catch (error) {
      console.error('Failed to complete process:', error);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Checking deployment gate...</div>;
  }

  if (!gateResult) {
    return <div>Unable to load gate status</div>;
  }

  const passedCount = Object.values(gateResult.requirements).filter(Boolean).length;
  const totalCount = Object.keys(gateResult.requirements).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployment Stage Gate Check</h1>
          <p className="text-gray-600 mt-1">Final validation before marking deployment complete</p>
        </div>
        <Link href={`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix`}>
          <Button variant="outline">Back to Helix</Button>
        </Link>
      </div>

      {/* Gate Result Alert */}
      {gateResult.passed ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-900">Gate Passed!</AlertTitle>
          <AlertDescription className="text-green-700">
            Deployment is complete and verified. Helix process ready to be marked complete.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Gate Blocked</AlertTitle>
          <AlertDescription>{gateResult.blockReason}</AlertDescription>
        </Alert>
      )}

      {/* Requirements Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Gate Requirements</span>
              <span className="text-lg font-bold">
                {passedCount}/{totalCount}
              </span>
            </div>
            <Progress value={(passedCount / totalCount) * 100} className="h-3" />
          </div>

          {/* Requirement 1: Preparation Complete */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              {gateResult.requirements.preparationComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">Deployment preparation complete</p>
                <p className="text-sm text-gray-600 mt-1">
                  {gateResult.requirements.preparationComplete
                    ? '✓ Pre-deployment checklist completed'
                    : '✗ Pre-deployment checklist incomplete'}
                </p>
              </div>
              <Link href={`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/step/8.1/`}>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </Link>
            </div>
          </div>

          {/* Requirement 2: Deployment Executed */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              {gateResult.requirements.deploymentExecuted ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">Deployment executed</p>
                <p className="text-sm text-gray-600 mt-1">
                  {gateResult.requirements.deploymentExecuted
                    ? `✓ Deployment status: ${gateResult.details.deployment_status}`
                    : `✗ Deployment status: ${gateResult.details.deployment_status}`}
                </p>
              </div>
              <Link href={`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/step/8.2/`}>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </Link>
            </div>
          </div>

          {/* Requirement 3: Deployment Verified */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              {gateResult.requirements.deploymentVerified ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">Deployment verified</p>
                <p className="text-sm text-gray-600 mt-1">
                  {gateResult.requirements.deploymentVerified
                    ? '✓ Production URL is live and accessible'
                    : `✗ Verification status: ${gateResult.details.verification_status}`}
                </p>
              </div>
              <Link href={`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/step/8.2/`}>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </Link>
            </div>
          </div>

          {/* Requirement 4: Smoke Tests Passed */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              {gateResult.requirements.smokeTestsPassed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">Smoke tests passed</p>
                <p className="text-sm text-gray-600 mt-1">
                  {gateResult.requirements.smokeTestsPassed
                    ? '✓ All required smoke tests passed'
                    : `✗ Smoke tests status: ${gateResult.details.smoke_tests_status}`}
                </p>
              </div>
              <Link href={`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/step/8.3/`}>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Stage Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold">STEP 8.1</p>
              <p className="font-semibold mt-1">Preparation</p>
              <p className="text-sm text-gray-600 mt-1">Pre-deployment checklist</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-600 font-semibold">STEP 8.2</p>
              <p className="font-semibold mt-1">Execution</p>
              <p className="text-sm text-gray-600 mt-1">Production deployment</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-600 font-semibold">STEP 8.3</p>
              <p className="font-semibold mt-1">Verification</p>
              <p className="text-sm text-gray-600 mt-1">Smoke tests</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => {
            // Refresh gate status
            setLoading(true);
          }}
          className="flex-1"
          disabled={loading || completing}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>

        {gateResult.passed ? (
          <Button
            onClick={handleComplete}
            disabled={completing || !gateResult.passed}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {completing ? 'Completing...' : 'Mark Process Complete'}
            <Sparkles className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            disabled
            className="flex-1"
            size="lg"
          >
            <Lock className="w-4 h-4 mr-2" />
            Gate Blocked
          </Button>
        )}
      </div>

      {/* Info Panel */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">What's Next?</p>
            {gateResult.passed ? (
              <ul className="space-y-1 text-gray-600 list-disc pl-5">
                <li>Click "Mark Process Complete" to finish the Helix process</li>
                <li>You'll see a summary of the entire process with all artifacts</li>
                <li>The deployment will be recorded in the project history</li>
                <li>You can start a new Helix process for the next iteration</li>
              </ul>
            ) : (
              <ul className="space-y-1 text-gray-600 list-disc pl-5">
                <li>Address the issues listed above to unblock the gate</li>
                <li>Use the "Review" buttons to navigate to the failing steps</li>
                <li>Complete any remaining verification steps</li>
                <li>Click "Refresh Status" to re-check the gate requirements</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/gates/8/
├── page.tsx (gate check view)
/app/actions/helix/
├── deploymentGate.ts (gate validation actions)
/lib/helix/
├── deploymentGateValidation.ts (validation logic)
```

## Dependencies

- React hooks: `useState`, `useEffect`
- Next.js navigation: `Link`, `useRouter`
- UI Components: `Card`, `Button`, `Alert`, `Badge`, `Progress`
- Icons: `lucide-react` (AlertCircle, CheckCircle2, Lock, ArrowRight, RefreshCw, Sparkles)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Gate displays four requirements with pass/fail status for each
2. Overall gate status shows "passed" or "blocked" based on all four requirements
3. Progress bar shows X/4 requirements met
4. Each requirement has a "Review" link to its corresponding step
5. Requirement 1: Preparation complete checklist
6. Requirement 2: Deployment executed with status
7. Requirement 3: Deployment verified and live
8. Requirement 4: All smoke tests passed
9. Gate blocked alert displays with specific block reasons
10. "Mark Process Complete" button disabled until all requirements met

## Testing Instructions

1. **All Requirements Met:**
   - Complete all 8 steps (6.1-8.3 plus both gates)
   - Navigate to gate 8
   - Verify all 4 requirements show as passed
   - Verify progress bar shows 4/4
   - Verify gate passed alert displays

2. **Preparation Incomplete:**
   - Complete all steps except 8.1
   - Verify requirement 1 shows as failed
   - Verify overall gate blocked

3. **Deployment Not Executed:**
   - Skip step 8.2
   - Verify requirement 2 shows as failed

4. **Deployment Not Verified:**
   - Complete 8.2 but don't verify
   - Verify requirement 3 shows as failed

5. **Smoke Tests Failed:**
   - Don't mark smoke tests passed in 8.3
   - Verify requirement 4 shows as failed

6. **Review Links:**
   - Click requirement review buttons
   - Verify navigation to correct step pages

7. **Refresh Status:**
   - Click refresh button
   - Verify gate status re-checked

8. **Mark Process Complete:**
   - With all requirements met, click mark complete
   - Verify navigation to completion page
   - Verify helix process marked as completed

9. **Responsive Design:**
   - Test on mobile
   - Verify all requirements readable
   - Verify buttons accessible

10. **Gate Blocks Completion:**
    - With any requirement failed, verify completion button disabled
    - Verify only "Gate Blocked" button shows

## Notes for AI Agent

- Phase 043 is the final gate in the entire Helix process
- It validates all deployment steps are complete
- After this gate passes, the process transitions to completion
- The four requirements ensure nothing is skipped
- This gate prevents marking process complete prematurely
- Gate logic is deterministic: all four must be true for passage
- After marking complete, user sees the process summary (Phase 044)
- Deployment history should be accessible from project page
- Consider sending notifications when process completes successfully
