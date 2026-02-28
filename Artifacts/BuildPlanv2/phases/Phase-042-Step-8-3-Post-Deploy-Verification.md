# Phase 042: Step 8.3 - Post-Deploy Verification

**Status:** Deployment Stage (Step 8.3) | **Phase Number:** 042 | **Epic:** 5

## Objective

Implement a smoke test checklist that verifies the deployed application functions correctly in production. This phase ensures critical functionality works after deployment through a series of quick validation checks, with customizable items per project.

## Prerequisites

- Phase 041 complete: Deployment verified and live
- Route `/org/[orgSlug]/project/[projectId]/helix/step/8.3/` available
- Database schema for smoke tests
- Production environment accessible

## Epic Context (Epic 5)

Phase 042 is the final quality check after deployment. Smoke tests are quick, high-level checks that core features work. If smoke tests pass, the deployment is successful. If they fail, it indicates a critical production issue requiring immediate rollback.

## Context

Post-deployment smoke tests typically validate:
1. Homepage loads correctly
2. Authentication works (login/signup)
3. Core features functional
4. No console errors in production
5. Performance acceptable
6. Mobile responsive
7. Error monitoring receiving events

Each item has a pass/fail checkbox with optional notes. All items must pass before deployment is considered successful.

## Detailed Requirements with Code

### 1. Database Schema: Smoke Tests

```sql
CREATE TABLE helix_smoke_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  helix_process_id UUID NOT NULL REFERENCES helix_processes(id) ON DELETE CASCADE,

  test_name VARCHAR(255) NOT NULL,
  test_description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  sort_order INT,

  status VARCHAR(50) DEFAULT 'pending',
  passed BOOLEAN,
  passed_at TIMESTAMP,
  passed_by UUID REFERENCES auth.users(id),

  notes TEXT,
  evidence_data JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE helix_smoke_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  helix_process_id UUID NOT NULL REFERENCES helix_processes(id) ON DELETE CASCADE,

  total_tests INT,
  passed_tests INT,
  failed_tests INT,

  all_passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES auth.users(id),

  evidence_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(helix_process_id)
);

CREATE INDEX idx_helix_smoke_tests_project_id ON helix_smoke_tests(project_id);
CREATE INDEX idx_helix_smoke_test_runs_project_id ON helix_smoke_test_runs(project_id);
```

### 2. Server Actions: Smoke Tests

Create `/app/actions/helix/smokeTests.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

const DEFAULT_SMOKE_TESTS = [
  {
    name: 'Homepage loads correctly',
    description: 'Verify homepage is accessible and renders without errors',
    isRequired: true
  },
  {
    name: 'Authentication works',
    description: 'Verify login/signup flows function correctly',
    isRequired: true
  },
  {
    name: 'Core features functional',
    description: 'Verify primary app features work as expected',
    isRequired: true
  },
  {
    name: 'No console errors in production',
    description: 'Check browser console for JavaScript errors',
    isRequired: false
  },
  {
    name: 'Performance acceptable',
    description: 'Page load times under 3 seconds',
    isRequired: false
  },
  {
    name: 'Mobile responsive',
    description: 'Verify app renders correctly on mobile devices',
    isRequired: false
  },
  {
    name: 'Error monitoring receiving events',
    description: 'Verify Sentry/error tracking is working',
    isRequired: false
  }
];

export async function initializeSmokeTests(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Check if tests already exist
  const { data: existing } = await supabase
    .from('helix_smoke_tests')
    .select('id')
    .eq('helix_process_id', helixProcessId)
    .limit(1);

  if (existing && existing.length > 0) {
    // Tests already initialized
    return existing;
  }

  // Create default smoke tests
  const testsToCreate = DEFAULT_SMOKE_TESTS.map((test, idx) => ({
    project_id: projectId,
    helix_process_id: helixProcessId,
    test_name: test.name,
    test_description: test.description,
    is_required: test.isRequired,
    sort_order: idx
  }));

  const { data, error } = await supabase
    .from('helix_smoke_tests')
    .insert(testsToCreate)
    .select();

  if (error) throw error;
  return data;
}

export async function getSmokeTests(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Initialize if needed
  await initializeSmokeTests(projectId, helixProcessId);

  const { data: tests, error } = await supabase
    .from('helix_smoke_tests')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return tests || [];
}

export async function updateSmokeTest(
  testId: string,
  projectId: string,
  passed: boolean,
  notes?: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('helix_smoke_tests')
    .update({
      passed,
      status: passed ? 'passed' : 'failed',
      passed_at: new Date().toISOString(),
      passed_by: user.id,
      notes: notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', testId)
    .eq('project_id', projectId);

  if (error) throw error;

  return { success: true };
}

export async function getSmokeTestStats(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();

  const { data: tests } = await supabase
    .from('helix_smoke_tests')
    .select('id, passed, is_required')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  if (!tests) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      all_passed: false
    };
  }

  const passed = tests.filter(t => t.passed === true).length;
  const failed = tests.filter(t => t.passed === false).length;
  const pending = tests.filter(t => t.passed === null).length;

  return {
    total: tests.length,
    passed,
    failed,
    pending,
    all_passed: pending === 0 && failed === 0
  };
}

export async function completeSmokeTests(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const stats = await getSmokeTestStats(projectId, helixProcessId);

  if (!stats.all_passed) {
    throw new Error('All smoke tests must be completed (passed or failed)');
  }

  const { data: tests } = await supabase
    .from('helix_smoke_tests')
    .select('passed, is_required')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  const requiredPassed = tests
    ?.filter(t => t.is_required)
    .every(t => t.passed === true) || false;

  if (!requiredPassed) {
    throw new Error('All required tests must pass');
  }

  // Create smoke test run record
  const { error } = await supabase
    .from('helix_smoke_test_runs')
    .insert({
      project_id: projectId,
      helix_process_id: helixProcessId,
      total_tests: stats.total,
      passed_tests: stats.passed,
      failed_tests: stats.failed,
      all_passed: true,
      completed_at: new Date().toISOString(),
      completed_by: user.id
    });

  if (error) throw error;

  return { success: true, message: 'Post-deployment verification complete' };
}
```

### 3. React Component: Smoke Test Checklist

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/8.3/components/SmokeTestChecklist.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import {
  getSmokeTests,
  updateSmokeTest,
  getSmokeTestStats,
  completeSmokeTests
} from '@/app/actions/helix/smokeTests';

interface SmokeTestChecklistProps {
  projectId: string;
  orgSlug: string;
  helixProcessId: string;
}

export default function SmokeTestChecklist({
  projectId,
  orgSlug,
  helixProcessId
}: SmokeTestChecklistProps) {
  const router = useRouter();

  const [tests, setTests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadTests();
  }, [projectId, helixProcessId]);

  const loadTests = async () => {
    try {
      const [testsData, statsData] = await Promise.all([
        getSmokeTests(projectId, helixProcessId),
        getSmokeTestStats(projectId, helixProcessId)
      ]);

      setTests(testsData);
      setStats(statsData);

      // Initialize notes from existing data
      const notesMap: Record<string, string> = {};
      testsData.forEach(test => {
        notesMap[test.id] = test.notes || '';
      });
      setNotes(notesMap);
    } catch (error) {
      console.error('Failed to load smoke tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestResult = async (
    testId: string,
    passed: boolean,
    testNotes?: string
  ) => {
    setUpdating(true);
    try {
      await updateSmokeTest(testId, projectId, passed, testNotes);
      await loadTests();
      setExpandedTest(null);
    } catch (error) {
      console.error('Failed to update test:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteVerification = async () => {
    setCompleting(true);
    try {
      await completeSmokeTests(projectId, helixProcessId);
      setShowConfetti(true);

      // Auto-advance after 2 seconds
      setTimeout(() => {
        router.push(`/org/${orgSlug}/project/${projectId}/helix/process-complete`);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to complete verification:', error);
      alert(error.message || 'Failed to complete verification');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading smoke tests...</div>;
  }

  const requiredTests = tests.filter(t => t.is_required);
  const requiredPassed = requiredTests.every(t => t.passed === true);
  const canComplete = stats?.all_passed && requiredPassed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Post-Deployment Verification (Step 8.3)</h1>
          <p className="text-gray-600 mt-1">Smoke tests to verify production deployment</p>
        </div>
        <Link href={`/org/${orgSlug}/project/${projectId}/helix`}>
          <Button variant="outline">Back to Helix</Button>
        </Link>
      </div>

      {/* Confetti celebration */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animation: `fall ${2 + Math.random() * 2}s linear forwards`,
                animationDelay: `${Math.random() * 0.5}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Status Alert */}
      {stats?.all_passed && requiredPassed ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Deployment Verified!</AlertTitle>
          <AlertDescription className="text-green-700">
            All required smoke tests passed. Deployment is successful.
          </AlertDescription>
        </Alert>
      ) : stats?.failed > 0 && requiredTests.some(t => t.passed === false) ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Required Tests Failed</AlertTitle>
          <AlertDescription>
            Critical smoke tests failed. Deployment may be unstable. Consider rolling back.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Tests In Progress</AlertTitle>
          <AlertDescription>
            Complete all smoke tests to verify deployment success.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Test Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Completion</span>
              <span className="text-2xl font-bold">
                {stats.passed + stats.failed}/{stats.total}
              </span>
            </div>
            <Progress
              value={((stats.passed + stats.failed) / stats.total) * 100}
              className="h-3"
            />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{stats.passed}</div>
                <div className="text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{stats.failed}</div>
                <div className="text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{stats.pending}</div>
                <div className="text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smoke Tests */}
      <div className="space-y-3">
        {tests.map(test => (
          <Card
            key={test.id}
            className={`border-2 transition cursor-pointer ${
              expandedTest === test.id
                ? 'border-blue-400 bg-blue-50'
                : test.passed === true
                  ? 'border-green-200'
                  : test.passed === false
                    ? 'border-red-200'
                    : 'border-gray-200'
            }`}
            onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {test.passed === true ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : test.passed === false ? (
                    <XCircle className="w-6 h-6 text-red-600" />
                  ) : (
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{test.test_name}</h4>
                    {test.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{test.test_description}</p>

                  {expandedTest === test.id && (
                    <div className="mt-4 space-y-3 pt-4 border-t">
                      <Textarea
                        placeholder="Add test results or notes..."
                        value={notes[test.id] || ''}
                        onChange={e => setNotes({ ...notes, [test.id]: e.target.value })}
                        className="min-h-[80px] text-sm"
                        onClick={e => e.stopPropagation()}
                      />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={e => {
                            e.stopPropagation();
                            handleTestResult(test.id, true, notes[test.id]);
                          }}
                          disabled={updating}
                        >
                          Mark Passed
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={e => {
                            e.stopPropagation();
                            handleTestResult(test.id, false, notes[test.id]);
                          }}
                          disabled={updating}
                        >
                          Mark Failed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={e => {
                            e.stopPropagation();
                            setExpandedTest(null);
                          }}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Categories Info */}
      <Card>
        <CardHeader>
          <CardTitle>What These Tests Verify</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Required Tests (all must pass):</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
              <li>Application core functionality is working</li>
              <li>Users can authenticate and use the system</li>
              <li>Critical features are operational</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-sm">Optional Tests (recommended to pass):</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
              <li>No JavaScript errors in production</li>
              <li>Performance is acceptable</li>
              <li>Mobile experience works</li>
              <li>Error tracking/monitoring is active</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1">
          Save Progress
        </Button>
        <Button
          onClick={handleCompleteVerification}
          disabled={!canComplete || completing}
          className="flex-1 bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {completing ? (
            <>Processing...</>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Complete Deployment
            </>
          )}
        </Button>
      </div>

      {!canComplete && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {stats?.pending > 0
              ? `Complete all ${stats.pending} pending test(s) before proceeding.`
              : 'Fix failing required tests before marking deployment as complete.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/8.3/
├── page.tsx (route handler)
├── components/
│   └── SmokeTestChecklist.tsx (smoke test component)
/app/actions/helix/
├── smokeTests.ts (server actions)
```

## Dependencies

- React hooks: `useState`, `useEffect`
- UI Components: `Card`, `Button`, `Checkbox`, `Textarea`, `Label`, `Alert`, `Progress`, `Badge`
- Icons: `lucide-react` (AlertCircle, CheckCircle2, XCircle, AlertTriangle, Sparkles)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Displays default 7 smoke tests (customizable per project)
2. Tests categorized as required or optional
3. Each test shows description and expandable notes field
4. Clicking test expands to show detailed guidance and result buttons
5. Tests can be marked as passed or failed
6. Progress bar shows tests completed (passed or failed)
7. Statistics show passed, failed, and pending counts
8. All required tests must pass before completion
9. "Complete Deployment" button disabled until all tests done and required ones pass
10. Success message displays with confetti animation when deployment verified

## Testing Instructions

1. **Display Tests:**
   - Navigate to Step 8.3
   - Verify 7 smoke tests display
   - Verify required badge on first 3 tests

2. **Expand Tests:**
   - Click test to expand
   - Verify test description and notes field appear
   - Verify pass/fail buttons appear

3. **Mark Results:**
   - Click "Mark Passed" on a test
   - Verify test shows checkmark
   - Verify stats update

4. **Mark Failed:**
   - Click "Mark Failed" on a test
   - Verify test shows X mark
   - Verify stats update

5. **Add Notes:**
   - Expand test
   - Add notes
   - Mark passed
   - Verify notes persisted

6. **Progress Tracking:**
   - Mark several tests
   - Verify progress bar updates
   - Verify count shows correct totals

7. **Required Tests Block:**
   - Mark required test as failed
   - Verify completion button disabled
   - Verify alert shows required test must pass

8. **Required Tests Pass:**
   - Mark all required tests as passed
   - Mark optional tests as failed
   - Verify completion button enabled

9. **Completion:**
   - Mark all tests
   - Click "Complete Deployment"
   - Verify navigation to completion page

10. **Responsive Design:**
    - Test on mobile
    - Verify tests readable
    - Verify expand/collapse works

## Notes for AI Agent

- Phase 042 is the final quality gate before the entire helix process completes
- Default smoke tests are customizable per project via database or configuration
- Required tests are non-negotiable: all must pass
- Optional tests improve confidence but aren't blockers
- Confetti animation provides celebratory feedback on successful deployment
- This phase marks the end of the 8-step Helix process
- Consider sending notifications when all tests pass
- Smoke tests should be quick (5-10 minutes total)
- If required tests fail, user should roll back deployment
- Notes on each test create documentation of actual testing performed
