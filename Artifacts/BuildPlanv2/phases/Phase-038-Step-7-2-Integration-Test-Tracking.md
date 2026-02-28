# Phase 038: Step 7.2 - Integration Test Tracking

**Status:** Testing Stage (Step 7.2) | **Phase Number:** 038 | **Epic:** 5

## Objective

Implement end-to-end integration testing tracking that validates the complete system works cohesively. This phase captures integration test results, tracks bugs found during integration, assigns severity levels, and establishes a gate: no unresolved critical bugs before deployment.

## Prerequisites

- Phase 037 complete: All phases at least AI-tested
- Database schema for integration tests and bug tracking
- Route `/org/[orgSlug]/project/[projectId]/helix/step/7.2/` available
- Bug severity classification system (critical, high, medium, low)

## Epic Context (Epic 5)

Phase 038 represents the integration testing layer after individual phase testing (Phase 037). While Phase 037 tests phases in isolation, Phase 038 tests the entire system end-to-end, ensuring all phases work together without conflicts. This is the final testing gate before deployment.

## Context

Integration testing differs from phase testing because it:
1. Tests the entire built system as a cohesive unit
2. Validates data flows between phases
3. Identifies conflicts or integration issues
4. Tracks bugs with severity and resolution status
5. Provides pass/fail determination for the entire build

The form captures test description, results, and any bugs found. Bugs are tracked with severity levels, and the pass/fail determination depends on critical bug resolution.

## Detailed Requirements with Code

### 1. Database Schema: Integration Tests & Bugs

```sql
CREATE TABLE helix_integration_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  helix_process_id UUID NOT NULL REFERENCES helix_processes(id) ON DELETE CASCADE,

  test_description TEXT NOT NULL,
  test_scope TEXT,
  tested_at TIMESTAMP DEFAULT NOW(),
  tested_by UUID REFERENCES auth.users(id),

  result VARCHAR(50) NOT NULL,
  result_details JSONB,
  duration_minutes INT,

  evidence_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(helix_process_id)
);

CREATE TABLE helix_integration_bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  helix_process_id UUID NOT NULL REFERENCES helix_processes(id) ON DELETE CASCADE,
  integration_test_id UUID NOT NULL REFERENCES helix_integration_tests(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL,
  affected_phases JSONB DEFAULT '[]',

  status VARCHAR(50) NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_helix_integration_tests_project_id ON helix_integration_tests(project_id);
CREATE INDEX idx_helix_integration_bugs_severity ON helix_integration_bugs(severity);
CREATE INDEX idx_helix_integration_bugs_status ON helix_integration_bugs(status);
CREATE INDEX idx_helix_integration_bugs_test_id ON helix_integration_bugs(integration_test_id);
```

### 2. Server Actions: Integration Testing

Create `/app/actions/helix/integrationTest.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';

export async function createIntegrationTest(
  projectId: string,
  helixProcessId: string,
  testDescription: string,
  testScope?: string,
  durationMinutes?: number
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('helix_integration_tests')
    .insert({
      project_id: projectId,
      helix_process_id: helixProcessId,
      test_description: testDescription,
      test_scope: testScope,
      duration_minutes: durationMinutes,
      tested_by: user.id,
      tested_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitIntegrationTestResult(
  projectId: string,
  testId: string,
  result: 'pass' | 'fail',
  details?: Record<string, any>
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('helix_integration_tests')
    .update({
      result,
      result_details: details || {},
      updated_at: new Date().toISOString()
    })
    .eq('id', testId)
    .eq('project_id', projectId);

  if (error) throw error;

  return { success: true };
}

export async function addIntegrationBug(
  projectId: string,
  helixProcessId: string,
  testId: string,
  title: string,
  description: string,
  severity: BugSeverity,
  affectedPhases?: string[]
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Validate severity
  const validSeverities: BugSeverity[] = ['critical', 'high', 'medium', 'low'];
  if (!validSeverities.includes(severity)) {
    throw new Error('Invalid severity level');
  }

  const { data, error } = await supabase
    .from('helix_integration_bugs')
    .insert({
      project_id: projectId,
      helix_process_id: helixProcessId,
      integration_test_id: testId,
      title,
      description,
      severity,
      affected_phases: affectedPhases || [],
      status: 'open'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function resolveBug(
  projectId: string,
  bugId: string,
  resolutionNotes: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('helix_integration_bugs')
    .update({
      status: 'resolved',
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', bugId)
    .eq('project_id', projectId);

  if (error) throw error;

  return { success: true };
}

export async function acknowledgeBug(
  projectId: string,
  bugId: string,
  acknowledgmentNotes: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('helix_integration_bugs')
    .update({
      status: 'acknowledged',
      resolution_notes: acknowledgmentNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', bugId)
    .eq('project_id', projectId);

  if (error) throw error;

  return { success: true };
}

export async function getIntegrationTestData(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { data: test, error: testError } = await supabase
    .from('helix_integration_tests')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  if (testError && testError.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw testError;
  }

  const { data: bugs, error: bugsError } = await supabase
    .from('helix_integration_bugs')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  if (bugsError) throw bugsError;

  return {
    test: test || null,
    bugs: bugs || []
  };
}

export async function getIntegrationTestStats(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();

  const { data: bugs } = await supabase
    .from('helix_integration_bugs')
    .select('severity, status')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  if (!bugs) {
    return {
      total: 0,
      critical: 0,
      critical_resolved: 0,
      high: 0,
      medium: 0,
      low: 0,
      open: 0,
      resolved: 0,
      acknowledged: 0,
      can_deploy: true
    };
  }

  const stats = {
    total: bugs.length,
    critical: bugs.filter(b => b.severity === 'critical').length,
    critical_resolved: bugs.filter(b => b.severity === 'critical' && b.status === 'resolved').length,
    high: bugs.filter(b => b.severity === 'high').length,
    medium: bugs.filter(b => b.severity === 'medium').length,
    low: bugs.filter(b => b.severity === 'low').length,
    open: bugs.filter(b => b.status === 'open').length,
    resolved: bugs.filter(b => b.status === 'resolved').length,
    acknowledged: bugs.filter(b => b.status === 'acknowledged').length,
    can_deploy: bugs.every(b => b.severity !== 'critical' || b.status === 'resolved')
  };

  return stats;
}
```

### 3. React Component: Integration Test Form

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/7.2/components/IntegrationTestForm.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  createIntegrationTest,
  submitIntegrationTestResult,
  addIntegrationBug,
  resolveBug,
  acknowledgeBug,
  getIntegrationTestData,
  getIntegrationTestStats,
  BugSeverity
} from '@/app/actions/helix/integrationTest';

interface IntegrationTestFormProps {
  projectId: string;
  orgSlug: string;
  helixProcessId: string;
}

export default function IntegrationTestForm({
  projectId,
  orgSlug,
  helixProcessId
}: IntegrationTestFormProps) {
  const router = useRouter();

  const [testPhase, setTestPhase] = useState<'form' | 'results' | 'bugs'>('form');
  const [testData, setTestData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [testDescription, setTestDescription] = useState('');
  const [testScope, setTestScope] = useState('');
  const [duration, setDuration] = useState('');
  const [testResult, setTestResult] = useState<'pass' | 'fail'>('pass');

  // Bug form state
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSeverity, setBugSeverity] = useState<BugSeverity>('medium');
  const [bugs, setBugs] = useState<any[]>([]);

  useEffect(() => {
    loadTestData();
  }, [projectId, helixProcessId]);

  const loadTestData = async () => {
    try {
      const [data, statsData] = await Promise.all([
        getIntegrationTestData(projectId, helixProcessId),
        getIntegrationTestStats(projectId, helixProcessId)
      ]);

      setTestData(data);
      setStats(statsData);
      setBugs(data.bugs || []);

      if (data.test) {
        setTestPhase('results');
        setTestDescription(data.test.test_description);
        setTestScope(data.test.test_scope || '');
        setDuration(data.test.duration_minutes?.toString() || '');
        setTestResult(data.test.result || 'pass');
      }
    } catch (error) {
      console.error('Failed to load test data:', error);
    }
  };

  const handleCreateTest = async () => {
    setLoading(true);
    try {
      const test = await createIntegrationTest(
        projectId,
        helixProcessId,
        testDescription,
        testScope,
        duration ? parseInt(duration) : undefined
      );

      setTestData({ ...testData, test });
      setTestPhase('results');
    } catch (error) {
      console.error('Failed to create test:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!testData?.test?.id) return;

    setLoading(true);
    try {
      await submitIntegrationTestResult(
        projectId,
        testData.test.id,
        testResult,
        {
          duration_minutes: duration ? parseInt(duration) : null,
          result_timestamp: new Date().toISOString()
        }
      );

      setTestPhase('bugs');
      await loadTestData();
    } catch (error) {
      console.error('Failed to submit result:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBug = async () => {
    if (!testData?.test?.id || !bugTitle || !bugDescription) return;

    setLoading(true);
    try {
      await addIntegrationBug(
        projectId,
        helixProcessId,
        testData.test.id,
        bugTitle,
        bugDescription,
        bugSeverity
      );

      setBugTitle('');
      setBugDescription('');
      setBugSeverity('medium');
      await loadTestData();
    } catch (error) {
      console.error('Failed to add bug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveBug = async (bugId: string) => {
    const notes = prompt('Resolution notes:');
    if (!notes) return;

    setLoading(true);
    try {
      await resolveBug(projectId, bugId, notes);
      await loadTestData();
    } catch (error) {
      console.error('Failed to resolve bug:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: BugSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityBadge = (severity: BugSeverity) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Phase 1: Create Test
  if (testPhase === 'form' && !testData?.test) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integration Testing (Step 7.2)</h1>
          <p className="text-gray-600 mt-1">End-to-end system testing and bug tracking</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Integration Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Test Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the integration test plan. What systems/components are being tested together?"
                value={testDescription}
                onChange={e => setTestDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope" className="text-base font-semibold">
                Test Scope
              </Label>
              <Textarea
                id="scope"
                placeholder="Scope of testing: which phases are integrated, what data flows are tested, which endpoints/features are verified?"
                value={testScope}
                onChange={e => setTestScope(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-base font-semibold">
                Estimated Duration (minutes)
              </Label>
              <Input
                id="duration"
                type="number"
                placeholder="120"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreateTest}
              disabled={!testDescription || loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Creating...' : 'Create Integration Test'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase 2: Results
  if (testPhase === 'results' && testData?.test) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integration Test Results</h1>
          <p className="text-gray-600 mt-1">Record test outcome and proceed to bug tracking</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Description</p>
              <p className="font-semibold">{testData.test.test_description}</p>
            </div>
            {testData.test.test_scope && (
              <div>
                <p className="text-sm text-gray-600">Scope</p>
                <p className="text-sm">{testData.test.test_scope}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="result" className="text-base font-semibold">
                Test Result *
              </Label>
              <Select value={testResult} onValueChange={(v: any) => setTestResult(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">✓ PASS - All integration tests passed</SelectItem>
                  <SelectItem value="fail">✗ FAIL - Some integration tests failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration2" className="text-base font-semibold">
                Actual Duration (minutes)
              </Label>
              <Input
                id="duration2"
                type="number"
                placeholder="120"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSubmitResult}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {loading ? 'Submitting...' : 'Submit Result & Track Bugs'}
            </Button>
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            Next, you'll track any bugs found during this integration test. Bugs can be marked as
            critical, high, medium, or low severity.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Phase 3: Bug Tracking
  if (testPhase === 'bugs' && testData?.test) {
    const criticalUnresolved = bugs.filter(
      b => b.severity === 'critical' && b.status !== 'resolved'
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Integration Test: Bug Tracking</h1>
            <p className="text-gray-600 mt-1">
              Test Result: <span className={testData.test.result === 'pass' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {testData.test.result?.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {/* Gate Status */}
        {stats && (
          <>
            {stats.can_deploy ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Gate Passed</AlertTitle>
                <AlertDescription>
                  No unresolved critical bugs. Ready to proceed to deployment.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Gate Blocker</AlertTitle>
                <AlertDescription>
                  {criticalUnresolved} critical bug(s) must be resolved before deployment.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Bug Statistics */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Bugs</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
                  <div className="text-sm text-gray-600">Critical</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{stats.high}</div>
                  <div className="text-sm text-gray-600">High</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.medium}</div>
                  <div className="text-sm text-gray-600">Medium</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.low}</div>
                  <div className="text-sm text-gray-600">Low</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Bug Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Bug Found During Integration Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bugTitle" className="text-base font-semibold">
                Bug Title *
              </Label>
              <Input
                id="bugTitle"
                placeholder="e.g., 'Login fails when using SSO with Phase 3 integration'"
                value={bugTitle}
                onChange={e => setBugTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bugDesc" className="text-base font-semibold">
                Description *
              </Label>
              <Textarea
                id="bugDesc"
                placeholder="Detailed description of the bug: steps to reproduce, expected behavior, actual behavior..."
                value={bugDescription}
                onChange={e => setBugDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity" className="text-base font-semibold">
                Severity *
              </Label>
              <Select value={bugSeverity} onValueChange={(v: any) => setBugSeverity(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical - Blocks deployment</SelectItem>
                  <SelectItem value="high">🟠 High - Major functionality broken</SelectItem>
                  <SelectItem value="medium">🟡 Medium - Some functionality affected</SelectItem>
                  <SelectItem value="low">🔵 Low - Minor issue, low priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddBug}
              disabled={!bugTitle || !bugDescription || loading}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Adding...' : 'Add Bug'}
            </Button>
          </CardContent>
        </Card>

        {/* Bugs List */}
        {bugs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bugs Found ({bugs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bugs.map(bug => (
                  <div key={bug.id} className={`p-4 rounded-lg border ${getSeverityColor(bug.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{bug.title}</h4>
                          <Badge variant={getSeverityBadge(bug.severity) as any}>
                            {bug.severity.toUpperCase()}
                          </Badge>
                          <Badge variant={bug.status === 'resolved' ? 'success' : 'outline'}>
                            {bug.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm mt-2">{bug.description}</p>
                        {bug.resolution_notes && (
                          <p className="text-xs mt-2">
                            <strong>Resolution:</strong> {bug.resolution_notes}
                          </p>
                        )}
                      </div>
                      {bug.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveBug(bug.id)}
                          disabled={loading}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            Save Progress
          </Button>
          {stats?.can_deploy && (
            <Button className="flex-1 bg-green-600 hover:bg-green-700">
              Proceed to Deployment
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <div>Loading...</div>;
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/7.2/
├── page.tsx (route handler)
├── components/
│   └── IntegrationTestForm.tsx (main form)
/app/actions/helix/
├── integrationTest.ts (server actions)
```

## Dependencies

- React hooks: `useState`, `useEffect`
- UI Components: `Card`, `Button`, `Input`, `Textarea`, `Label`, `Alert`, `Badge`, `Select`
- Icons: `lucide-react` (AlertCircle, CheckCircle2, Plus, Trash2)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Test form captures test description, scope, and estimated duration
2. Results phase allows pass/fail selection with actual duration tracking
3. Bug tracking form allows adding bugs with title, description, and severity
4. Bugs display in list with severity-based color coding
5. Bug severity levels: critical (red), high (orange), medium (yellow), low (blue)
6. Gate blocker displays if unresolved critical bugs exist
7. Gate passed displays if all critical bugs resolved or none exist
8. Bug statistics show counts by severity and status
9. Bugs can be marked as resolved with resolution notes
10. Integration test result (pass/fail) tracked and displayed

## Testing Instructions

1. **Create Test:**
   - Navigate to Step 7.2
   - Fill in test description
   - Click "Create Integration Test"
   - Verify test created and phase advances

2. **Test Results:**
   - Select "PASS" or "FAIL"
   - Enter actual duration
   - Click "Submit Result"
   - Verify results saved and bug tracking form appears

3. **Add Bugs:**
   - Fill in bug title and description
   - Select severity
   - Click "Add Bug"
   - Verify bug appears in list with correct severity color

4. **Bug Severity:**
   - Add bug with critical severity
   - Verify gate blocker alert displays
   - Resolve critical bug
   - Verify gate passed alert displays

5. **Bug Statistics:**
   - Verify counts match bugs in list
   - Add bugs of different severities
   - Verify stats update

6. **Bug Resolution:**
   - Click "Resolve" on a bug
   - Enter resolution notes
   - Verify bug status changes to resolved

7. **Gate System:**
   - With critical unresolved bugs, verify proceed button disabled
   - Resolve all critical bugs
   - Verify proceed button enabled

8. **Responsive Design:**
   - Test on mobile
   - Verify all forms readable
   - Verify bug list scrollable

9. **Data Persistence:**
   - Complete integration test
   - Navigate away and back
   - Verify all data persisted

10. **Bug Tracking:**
    - Add multiple bugs
    - Resolve some
    - Verify list updates correctly

## Notes for AI Agent

- Integration testing is the final testing gate before deployment
- The three-phase flow (Create Test → Results → Bugs) guides the user through systematic testing
- Critical bugs are a hard block to deployment; the gate cannot be bypassed
- Bug severity guides priority for fixing: critical > high > medium > low
- Integration tests validate system cohesion, not individual component functionality
- The test result (pass/fail) is metadata; actual gate determination comes from critical bugs
- All bugs are tracked in database for audit trail
- Consider providing a bug template or checklist for common integration issues
- The integration test is per-helix-process (one test per deployment cycle)
