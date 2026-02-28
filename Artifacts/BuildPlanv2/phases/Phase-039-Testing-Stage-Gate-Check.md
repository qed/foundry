# Phase 039: Testing Stage Gate Check

**Status:** Testing Stage (Gate) | **Phase Number:** 039 | **Epic:** 5

## Objective

Implement a comprehensive gate check that validates all testing requirements have been met before allowing advancement to the Deployment stage. This phase serves as a quality assurance checkpoint, ensuring no substandard code reaches production.

## Prerequisites

- Phase 037 complete: All phases at least AI-tested
- Phase 038 complete: Integration testing with bug tracking
- Database schema includes all testing data
- Route `/org/[orgSlug]/project/[projectId]/helix/step/gates/7/` available

## Epic Context (Epic 5)

Phase 039 is a hard-block gate preventing advancement from Testing (Stage 7) to Deployment (Stage 8). Like the gate in Phase 032, this gate enforces quality standards by requiring evidence of comprehensive testing and bug resolution.

## Context

The Testing stage consists of two steps:
- Step 7.1: Per-phase testing (3-tier matrix)
- Step 7.2: Integration testing (end-to-end validation)

This gate validates that both steps are complete and evidence is present. The gate has three hard requirements:
1. All build phases are at minimum AI-tested
2. Integration testing completed with PASS result
3. No unresolved critical bugs

Until all three are met, the gate blocks advancement.

## Detailed Requirements with Code

### 1. Gate Requirements & Validation

Create `/lib/helix/gateValidation.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

export interface GateCheckResult {
  passed: boolean;
  requirements: {
    allPhasesAITested: boolean;
    integrationTestPassed: boolean;
    noCriticalBugs: boolean;
  };
  details: {
    untested_phases: number;
    integration_test_status: string | null;
    unresolved_critical_bugs: number;
  };
  blockReason?: string;
}

export async function validateTestingGate(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  helixProcessId: string
): Promise<GateCheckResult> {
  // Check 1: All phases at least AI-tested
  const { data: testingMatrix } = await supabase
    .from('helix_testing_matrix')
    .select('testing_status')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  const untested_phases = testingMatrix?.filter(m => m.testing_status === 'untested').length || 0;
  const allPhasesAITested = untested_phases === 0;

  // Check 2: Integration test passed
  const { data: integrationTest } = await supabase
    .from('helix_integration_tests')
    .select('result')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  const integrationTestPassed = integrationTest?.result === 'pass';
  const integration_test_status = integrationTest?.result || 'not_started';

  // Check 3: No unresolved critical bugs
  const { data: bugs } = await supabase
    .from('helix_integration_bugs')
    .select('severity, status')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  const unresolved_critical_bugs = bugs?.filter(
    b => b.severity === 'critical' && b.status !== 'resolved'
  ).length || 0;
  const noCriticalBugs = unresolved_critical_bugs === 0;

  // Determine overall result and block reason
  const passed = allPhasesAITested && integrationTestPassed && noCriticalBugs;

  let blockReason = '';
  if (!allPhasesAITested) {
    blockReason += `${untested_phases} phase(s) not tested. `;
  }
  if (!integrationTestPassed) {
    blockReason += `Integration test not passed (status: ${integration_test_status}). `;
  }
  if (!noCriticalBugs) {
    blockReason += `${unresolved_critical_bugs} unresolved critical bug(s). `;
  }

  return {
    passed,
    requirements: {
      allPhasesAITested,
      integrationTestPassed,
      noCriticalBugs
    },
    details: {
      untested_phases,
      integration_test_status,
      unresolved_critical_bugs
    },
    blockReason: blockReason.trim()
  };
}

export async function recordGateCheck(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  helixProcessId: string,
  gateResult: GateCheckResult,
  userId: string
): Promise<any> {
  // Record gate check in evidence
  const { data, error } = await supabase
    .from('helix_step_evidence')
    .insert({
      project_id: projectId,
      helix_process_id: helixProcessId,
      step_key: '7-gate',
      evidence_type: 'gate_check',
      status: gateResult.passed ? 'passed' : 'blocked',
      evidence_data: {
        timestamp: new Date().toISOString(),
        checked_by: userId,
        requirements: gateResult.requirements,
        details: gateResult.details
      }
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 2. Server Actions: Gate Validation

Create `/app/actions/helix/testingGate.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import { validateTestingGate, recordGateCheck } from '@/lib/helix/gateValidation';

export async function checkTestingGate(
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
  const gateResult = await validateTestingGate(
    supabase,
    projectId,
    helixProcessId
  );

  // Record the check
  if (user) {
    try {
      await recordGateCheck(supabase, projectId, helixProcessId, gateResult, user.id);
    } catch (error) {
      console.warn('Failed to record gate check:', error);
      // Non-blocking error
    }
  }

  return gateResult;
}

export async function getTestingGateStatus(
  projectId: string,
  helixProcessId: string
) {
  return checkTestingGate(projectId, helixProcessId);
}

export async function proceedToDeploymentStage(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Validate gate first
  const gateResult = await validateTestingGate(
    supabase,
    projectId,
    helixProcessId
  );

  if (!gateResult.passed) {
    throw new Error(`Gate blocked: ${gateResult.blockReason}`);
  }

  // Update helix process to advance stage
  const { error } = await supabase
    .from('helix_processes')
    .update({
      current_stage: 8,
      current_step: '8.1',
      updated_at: new Date().toISOString()
    })
    .eq('id', helixProcessId);

  if (error) throw error;

  // Record advancement
  await supabase
    .from('helix_step_evidence')
    .insert({
      project_id: projectId,
      helix_process_id: helixProcessId,
      step_key: '7-gate-passed',
      evidence_type: 'gate_passed',
      status: 'passed',
      evidence_data: {
        timestamp: new Date().toISOString(),
        advanced_by: user.id,
        next_stage: 8,
        next_step: '8.1'
      }
    });

  return { success: true, message: 'Advanced to Deployment Stage' };
}
```

### 3. React Component: Gate Check View

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/gates/7/page.tsx`:

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
  RefreshCw
} from 'lucide-react';
import {
  checkTestingGate,
  proceedToDeploymentStage
} from '@/app/actions/helix/testingGate';

interface GatePageProps {
  params: Promise<{
    orgSlug: string;
    projectId: string;
  }>;
}

export default function TestingGatePage({ params }: GatePageProps) {
  const router = useRouter();
  const [pageParams, setPageParams] = useState<any>(null);
  const [gateResult, setGateResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await params;
      setPageParams(p);

      // Get helix process ID
      // This would come from the route context or query params in real implementation
      // For now, we'll fetch from the project
    })();
  }, [params]);

  useEffect(() => {
    if (!pageParams) return;

    async function checkGate() {
      try {
        // TODO: Get helixProcessId from route context
        // const result = await checkTestingGate(pageParams.projectId, helixProcessId);
        // setGateResult(result);
      } catch (error) {
        console.error('Failed to check gate:', error);
      } finally {
        setLoading(false);
      }
    }

    checkGate();
  }, [pageParams]);

  const handleProceed = async () => {
    if (!pageParams || !gateResult?.passed) return;

    setAdvancing(true);
    try {
      // TODO: Get helixProcessId
      // await proceedToDeploymentStage(pageParams.projectId, helixProcessId);
      // router.push(`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/step/8.1/`);
    } catch (error) {
      console.error('Failed to advance:', error);
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Checking testing gate...</div>;
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
          <h1 className="text-3xl font-bold">Testing Stage Gate Check</h1>
          <p className="text-gray-600 mt-1">Stage 7 → Stage 8 Advancement</p>
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
            All testing requirements met. You may proceed to the Deployment stage.
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
          <CardTitle>Testing Requirements</CardTitle>
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

          {/* Requirement 1: Phases AI-Tested */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              {gateResult.requirements.allPhasesAITested ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">All phases at minimum AI-tested</p>
                <p className="text-sm text-gray-600 mt-1">
                  {gateResult.requirements.allPhasesAITested
                    ? '✓ All phases have been AI-tested'
                    : `✗ ${gateResult.details.untested_phases} phase(s) remain untested`}
                </p>
              </div>
              <Link href={`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/step/7.1/`}>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </Link>
            </div>
          </div>

          {/* Requirement 2: Integration Test Passed */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              {gateResult.requirements.integrationTestPassed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">Integration test passed</p>
                <p className="text-sm text-gray-600 mt-1">
                  {gateResult.requirements.integrationTestPassed
                    ? `✓ Integration test result: ${gateResult.details.integration_test_status.toUpperCase()}`
                    : `✗ Integration test status: ${gateResult.details.integration_test_status}`}
                </p>
              </div>
              <Link href={`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/step/7.2/`}>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </Link>
            </div>
          </div>

          {/* Requirement 3: No Critical Bugs */}
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              {gateResult.requirements.noCriticalBugs ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">No unresolved critical bugs</p>
                <p className="text-sm text-gray-600 mt-1">
                  {gateResult.requirements.noCriticalBugs
                    ? '✓ All critical bugs resolved'
                    : `✗ ${gateResult.details.unresolved_critical_bugs} unresolved critical bug(s)`}
                </p>
              </div>
              <Link href={`/org/${pageParams.orgSlug}/project/${pageParams.projectId}/helix/step/7.2/`}>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Stage Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold">STEP 7.1</p>
              <p className="font-semibold mt-1">Per-Phase Testing</p>
              <p className="text-sm text-gray-600 mt-1">
                3-tier testing matrix: AI, Human, User
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-600 font-semibold">STEP 7.2</p>
              <p className="font-semibold mt-1">Integration Testing</p>
              <p className="text-sm text-gray-600 mt-1">
                End-to-end system validation
              </p>
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
          disabled={loading || advancing}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>

        {gateResult.passed ? (
          <Button
            onClick={handleProceed}
            disabled={advancing || !gateResult.passed}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {advancing ? 'Advancing...' : 'Proceed to Deployment'}
            <ArrowRight className="w-4 h-4 ml-2" />
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
                <li>Once you proceed, you'll enter the Deployment stage</li>
                <li>Step 8.1 will guide you through deployment preparation</li>
                <li>Step 8.2 will execute the deployment to production</li>
                <li>Step 8.3 will verify the deployment with smoke tests</li>
              </ul>
            ) : (
              <ul className="space-y-1 text-gray-600 list-disc pl-5">
                <li>Address the issues listed above to unblock the gate</li>
                <li>Use the "Review" buttons to navigate to the failing steps</li>
                <li>Complete any remaining testing or bug fixes</li>
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
/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/gates/7/
├── page.tsx (gate check view)
/app/actions/helix/
├── testingGate.ts (gate validation actions)
/lib/helix/
├── gateValidation.ts (validation logic)
```

## Dependencies

- React hooks: `useState`, `useEffect`
- Next.js navigation: `Link`, `useRouter`
- UI Components: `Card`, `Button`, `Alert`, `Badge`, `Progress`
- Icons: `lucide-react` (AlertCircle, CheckCircle2, Lock, ArrowRight, RefreshCw)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Gate displays three requirements with pass/fail status for each
2. Overall gate status shows "passed" or "blocked" based on all three requirements
3. Progress bar shows X/3 requirements met
4. Each requirement has a "Review" link to its corresponding step
5. Requirement 1: All phases AI-tested with count of untested phases if not met
6. Requirement 2: Integration test passed with actual test status
7. Requirement 3: No unresolved critical bugs with count of critical bugs if not met
8. Gate blocked alert displays with specific block reasons
9. Gate passed alert displays with confirmation message
10. "Proceed to Deployment" button disabled until all requirements met

## Testing Instructions

1. **Gate Blocked State:**
   - Complete phases but don't AI-test all
   - Navigate to gate
   - Verify requirement 1 shows as failed
   - Verify overall gate blocked

2. **Partial Progress:**
   - AI-test some phases
   - Don't complete integration test
   - Verify progress bar shows 1/3
   - Verify requirement 2 shows as failed

3. **Integration Test Status:**
   - Complete integration test with PASS
   - Verify requirement 2 shows as passed
   - Verify progress bar updates

4. **Critical Bugs Block:**
   - Add unresolved critical bug in integration test
   - Verify requirement 3 shows as failed
   - Verify overall gate blocked

5. **All Requirements Met:**
   - Complete all three requirements
   - Verify all three show as passed
   - Verify progress bar shows 3/3
   - Verify gate passed alert displays

6. **Proceed Button:**
   - With gate blocked, verify button is disabled and shows "Gate Blocked"
   - With gate passed, verify button shows "Proceed to Deployment"

7. **Review Links:**
   - Click requirement review buttons
   - Verify navigation to correct step pages

8. **Refresh Status:**
   - Click refresh button
   - Verify gate status re-checked

9. **Responsive Design:**
   - Test on mobile
   - Verify all requirements readable
   - Verify buttons accessible

10. **Gate Advancement:**
    - With all requirements met, click proceed
    - Verify navigation to deployment stage
    - Verify helix process stage updated

## Notes for AI Agent

- Phase 039 is a gate/checkpoint, not a buildable feature
- It's the hard-block preventing advancement to deployment
- The three requirements map directly to the two preceding steps (7.1 and 7.2)
- Gate logic is deterministic: all three must be true for passage
- Unresolved critical bugs are a hard blocker (no workaround)
- The gate should be checked before any deployment attempt
- Gate check results are recorded in helix_step_evidence for audit trail
- The gate view should be accessible from the main helix sidebar/navigation
- Consider adding a last-checked timestamp to the view
- The gate logic prevents human error in rushing to deployment with incomplete testing
