# Phase 037: Step 7.1 - Per-Phase Testing Tracker

**Status:** Testing Stage (Step 7.1) | **Phase Number:** 037 | **Epic:** 5

## Objective

Implement a comprehensive testing matrix that tracks three tiers of testing (AI-Tested, Human-Tested, User-Tested) for each built phase. This phase provides visibility into testing coverage and establishes the gate that all phases must be at least AI-tested before advancing to Integration Testing.

## Prerequisites

- Phase 035 complete: Multiple phases marked as 'built' with evidence
- Phase 036 complete: Dashboard functional
- Route `/org/[orgSlug]/project/[projectId]/helix/step/7.1/` available
- helix_testing_matrix table created (or use helix_build_phases.evidence_data for test evidence)

## Epic Context (Epic 5)

Phase 037 marks the transition to the Testing stage (Stage 7). Rather than testing individual components, the Helix process tests completed build phases holistically across three tiers. The three-tier testing model ensures coverage: AI models provide initial verification, humans provide QA rigor, and actual users provide real-world validation. This phase establishes a hard gate: all phases must reach AI-tested minimum.

## Context

After phases are built (Phase 035), they enter the testing queue. The testing matrix displays all built phases and allows testers to:
1. Mark phases as AI-tested with a description of what was tested
2. Mark phases as Human-tested with test results and notes
3. Mark phases as User-tested with feedback/validation data

The matrix provides color-coded visual feedback (gray=untested, yellow=partial, green=complete) and prevents advancement until all phases meet the minimum AI-tested gate.

## Detailed Requirements with Code

### 1. Database Schema: Testing Matrix

```sql
CREATE TABLE helix_testing_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  helix_process_id UUID NOT NULL REFERENCES helix_processes(id) ON DELETE CASCADE,
  helix_build_phase_id UUID NOT NULL REFERENCES helix_build_phases(id) ON DELETE CASCADE,

  ai_tested BOOLEAN DEFAULT FALSE,
  ai_tested_by UUID REFERENCES auth.users(id),
  ai_tested_at TIMESTAMP,
  ai_test_notes TEXT,
  ai_test_details JSONB,

  human_tested BOOLEAN DEFAULT FALSE,
  human_tested_by UUID REFERENCES auth.users(id),
  human_tested_at TIMESTAMP,
  human_test_notes TEXT,
  human_test_results JSONB,

  user_tested BOOLEAN DEFAULT FALSE,
  user_tested_by UUID REFERENCES auth.users(id),
  user_tested_at TIMESTAMP,
  user_test_feedback TEXT,
  user_test_data JSONB,

  testing_status VARCHAR(50) NOT NULL DEFAULT 'untested',
  evidence_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(helix_build_phase_id)
);

CREATE INDEX idx_helix_testing_matrix_project_id ON helix_testing_matrix(project_id);
CREATE INDEX idx_helix_testing_matrix_status ON helix_testing_matrix(testing_status);
CREATE INDEX idx_helix_testing_matrix_phase_id ON helix_testing_matrix(helix_build_phase_id);
```

### 2. Server Actions: Testing Matrix Operations

Create `/app/actions/helix/testingMatrix.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function getTestingMatrix(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Get all built phases
  const { data: phases, error: phasesError } = await supabase
    .from('helix_build_phases')
    .select('id, phase_number, title, status')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .in('status', ['built', 'tested'])
    .order('phase_number', { ascending: true });

  if (phasesError) throw phasesError;

  if (!phases || phases.length === 0) {
    return { phases: [], matrixRows: [] };
  }

  // Get or create testing matrix rows
  const phaseIds = phases.map(p => p.id);

  const { data: matrix, error: matrixError } = await supabase
    .from('helix_testing_matrix')
    .select('*')
    .eq('project_id', projectId)
    .in('helix_build_phase_id', phaseIds);

  if (matrixError) throw matrixError;

  // Create matrix map for easy lookup
  const matrixMap = new Map((matrix || []).map(m => [m.helix_build_phase_id, m]));

  // Ensure all phases have matrix entries
  const matrixRows = phases.map(phase => {
    const existing = matrixMap.get(phase.id);
    return {
      phase,
      matrix: existing || {
        helix_build_phase_id: phase.id,
        ai_tested: false,
        human_tested: false,
        user_tested: false,
        testing_status: 'untested'
      }
    };
  });

  return {
    phases,
    matrixRows
  };
}

export async function markPhaseAsAITested(
  projectId: string,
  phaseId: string,
  notes: string,
  details?: Record<string, any>
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Get or create matrix row
  const { data: existing } = await supabase
    .from('helix_testing_matrix')
    .select('id')
    .eq('helix_build_phase_id', phaseId)
    .eq('project_id', projectId)
    .single();

  const now = new Date().toISOString();
  const data = {
    project_id: projectId,
    helix_build_phase_id: phaseId,
    ai_tested: true,
    ai_tested_by: user.id,
    ai_tested_at: now,
    ai_test_notes: notes,
    ai_test_details: details || {},
    testing_status: 'ai_tested',
    updated_at: now
  };

  let result;
  if (existing) {
    result = await supabase
      .from('helix_testing_matrix')
      .update(data)
      .eq('helix_build_phase_id', phaseId)
      .select()
      .single();
  } else {
    result = await supabase
      .from('helix_testing_matrix')
      .insert(data)
      .select()
      .single();
  }

  if (result.error) throw result.error;
  return result.data;
}

export async function markPhaseAsHumanTested(
  projectId: string,
  phaseId: string,
  notes: string,
  results?: Record<string, any>
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { data: existing } = await supabase
    .from('helix_testing_matrix')
    .select('id, ai_tested, user_tested')
    .eq('helix_build_phase_id', phaseId)
    .single();

  if (!existing) throw new Error('Matrix entry not found');

  const now = new Date().toISOString();
  const status = existing.user_tested ? 'fully_tested' : (existing.ai_tested ? 'human_tested' : 'human_tested');

  const { error } = await supabase
    .from('helix_testing_matrix')
    .update({
      human_tested: true,
      human_tested_by: user.id,
      human_tested_at: now,
      human_test_notes: notes,
      human_test_results: results || {},
      testing_status: status,
      updated_at: now
    })
    .eq('helix_build_phase_id', phaseId);

  if (error) throw error;

  return { success: true };
}

export async function markPhaseAsUserTested(
  projectId: string,
  phaseId: string,
  feedback: string,
  data?: Record<string, any>
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('helix_testing_matrix')
    .update({
      user_tested: true,
      user_tested_by: user.id,
      user_tested_at: now,
      user_test_feedback: feedback,
      user_test_data: data || {},
      testing_status: 'fully_tested',
      updated_at: now
    })
    .eq('helix_build_phase_id', phaseId);

  if (error) throw error;

  return { success: true };
}

export async function getTestingMatrixStats(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();

  const { data: matrix } = await supabase
    .from('helix_testing_matrix')
    .select('testing_status')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  if (!matrix) {
    return {
      total: 0,
      untested: 0,
      ai_tested: 0,
      human_tested: 0,
      fully_tested: 0,
      all_ai_tested: false
    };
  }

  const stats = {
    total: matrix.length,
    untested: matrix.filter(m => m.testing_status === 'untested').length,
    ai_tested: matrix.filter(m => m.testing_status === 'ai_tested').length,
    human_tested: matrix.filter(m => m.testing_status === 'human_tested').length,
    fully_tested: matrix.filter(m => m.testing_status === 'fully_tested').length,
    all_ai_tested: matrix.every(m => m.testing_status !== 'untested')
  };

  return stats;
}
```

### 3. React Component: Testing Matrix

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/7.1/components/TestingMatrix.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import {
  getTestingMatrix,
  getTestingMatrixStats
} from '@/app/actions/helix/testingMatrix';
import TestingMatrixRow from './TestingMatrixRow';

interface TestingMatrixProps {
  projectId: string;
  orgSlug: string;
  helixProcessId: string;
}

export default function TestingMatrix({
  projectId,
  orgSlug,
  helixProcessId
}: TestingMatrixProps) {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMatrix() {
      try {
        const [matrix, statsData] = await Promise.all([
          getTestingMatrix(projectId, helixProcessId),
          getTestingMatrixStats(projectId, helixProcessId)
        ]);

        setMatrixData(matrix);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load testing matrix:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMatrix();
  }, [projectId, helixProcessId]);

  if (loading) {
    return <div className="animate-pulse">Loading testing matrix...</div>;
  }

  if (!matrixData?.matrixRows || matrixData.matrixRows.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No phases have been built yet. Complete phases in the Build stage before testing.
        </AlertDescription>
      </Alert>
    );
  }

  const getTestingStatusColor = (status: string) => {
    switch (status) {
      case 'untested':
        return 'bg-gray-100 border-gray-200';
      case 'ai_tested':
        return 'bg-yellow-100 border-yellow-200';
      case 'human_tested':
        return 'bg-blue-100 border-blue-200';
      case 'fully_tested':
        return 'bg-green-100 border-green-200';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Testing Matrix (Step 7.1)</h1>
        <p className="text-gray-600 mt-1">
          Track testing status across three tiers: AI-Tested, Human-Tested, User-Tested
        </p>
      </div>

      {/* Gate Alert */}
      {!stats?.all_ai_tested && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Gate Blocker:</strong> All phases must be at least AI-tested before advancing to
            Integration Testing. Currently {stats?.untested} phases are untested.
          </AlertDescription>
        </Alert>
      )}

      {/* Gate Passed Alert */}
      {stats?.all_ai_tested && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <strong>Gate Passed:</strong> All {stats?.total} phases are at least AI-tested. You may
            proceed to Integration Testing (Step 7.2).
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats?.total}</div>
              <div className="text-sm text-gray-600">Total Phases</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-500">{stats?.untested}</div>
              <div className="text-sm text-gray-600">Untested</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats?.ai_tested}</div>
              <div className="text-sm text-gray-600">AI-Tested</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats?.human_tested}</div>
              <div className="text-sm text-gray-600">Human-Tested</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats?.fully_tested}</div>
              <div className="text-sm text-gray-600">Fully Tested</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Testing Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Status by Phase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Phase</th>
                  <th className="text-center py-3 px-4 font-semibold">AI-Tested</th>
                  <th className="text-center py-3 px-4 font-semibold">Human-Tested</th>
                  <th className="text-center py-3 px-4 font-semibold">User-Tested</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.matrixRows.map(({ phase, matrix }: any) => (
                  <TestingMatrixRow
                    key={phase.id}
                    phase={phase}
                    matrix={matrix}
                    projectId={projectId}
                    orgSlug={orgSlug}
                    onUpdate={() => {
                      // Refresh matrix after update
                      getTestingMatrix(projectId, helixProcessId).then(setMatrixData);
                      getTestingMatrixStats(projectId, helixProcessId).then(setStats);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Testing Tier Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="font-semibold text-yellow-900">AI-Tested</div>
            <p className="text-sm text-yellow-800">
              Phase validated by AI/automated testing. Tests functionality, performance, and basic
              requirements.
            </p>
          </div>
          <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="font-semibold text-blue-900">Human-Tested</div>
            <p className="text-sm text-blue-800">
              Phase validated by human QA tester. Tests user experience, edge cases, and
              integration with other phases.
            </p>
          </div>
          <div className="flex items-start gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="font-semibold text-green-900">User-Tested</div>
            <p className="text-sm text-green-800">
              Phase validated by actual end users. Confirms real-world usability and value
              delivery.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4. Table Row Component: Testing Matrix Row

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/7.1/components/TestingMatrixRow.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import {
  markPhaseAsAITested,
  markPhaseAsHumanTested,
  markPhaseAsUserTested
} from '@/app/actions/helix/testingMatrix';

interface TestingMatrixRowProps {
  phase: any;
  matrix: any;
  projectId: string;
  orgSlug: string;
  onUpdate: () => void;
}

export default function TestingMatrixRow({
  phase,
  matrix,
  projectId,
  orgSlug,
  onUpdate
}: TestingMatrixRowProps) {
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    notes: ''
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'untested':
        return 'bg-gray-200 text-gray-800';
      case 'ai_tested':
        return 'bg-yellow-200 text-yellow-800';
      case 'human_tested':
        return 'bg-blue-200 text-blue-800';
      case 'fully_tested':
        return 'bg-green-200 text-green-800';
      default:
        return 'bg-gray-200';
    }
  };

  const handleAITest = async () => {
    setLoading(true);
    try {
      await markPhaseAsAITested(projectId, phase.id, formData.notes);
      setFormData({ notes: '' });
      setExpandedTest(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to mark as AI-tested:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHumanTest = async () => {
    setLoading(true);
    try {
      await markPhaseAsHumanTested(projectId, phase.id, formData.notes);
      setFormData({ notes: '' });
      setExpandedTest(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to mark as human-tested:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserTest = async () => {
    setLoading(true);
    try {
      await markPhaseAsUserTested(projectId, phase.id, formData.notes);
      setFormData({ notes: '' });
      setExpandedTest(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to mark as user-tested:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <tr className={`border-b ${matrix.ai_tested || matrix.human_tested || matrix.user_tested ? '' : 'hover:bg-gray-50'}`}>
        <td className="py-4 px-4">
          <div>
            <p className="font-semibold">Phase {phase.phase_number}</p>
            <p className="text-sm text-gray-600">{phase.title}</p>
          </div>
        </td>

        {/* AI-Tested */}
        <td className="py-4 px-4 text-center">
          {matrix.ai_tested ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandedTest(expandedTest === 'ai' ? null : 'ai')}
            >
              Test
            </Button>
          )}
        </td>

        {/* Human-Tested */}
        <td className="py-4 px-4 text-center">
          {matrix.human_tested ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandedTest(expandedTest === 'human' ? null : 'human')}
              disabled={!matrix.ai_tested}
            >
              Test
            </Button>
          )}
        </td>

        {/* User-Tested */}
        <td className="py-4 px-4 text-center">
          {matrix.user_tested ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandedTest(expandedTest === 'user' ? null : 'user')}
              disabled={!matrix.human_tested}
            >
              Test
            </Button>
          )}
        </td>

        {/* Status Badge */}
        <td className="py-4 px-4">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(matrix.testing_status)}`}>
            {matrix.testing_status.replace('_', ' ')}
          </span>
        </td>
      </tr>

      {/* Expandable Testing Form */}
      {expandedTest === 'ai' && (
        <tr className="bg-yellow-50 border-b">
          <td colSpan={5} className="py-4 px-4">
            <div className="space-y-3">
              <p className="font-semibold">AI Test Notes for Phase {phase.phase_number}</p>
              <Textarea
                placeholder="Describe what was tested, results, any issues found..."
                value={formData.notes}
                onChange={e => setFormData({ notes: e.target.value })}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button onClick={handleAITest} disabled={!formData.notes || loading} className="bg-yellow-600">
                  {loading ? 'Marking...' : 'Mark as AI-Tested'}
                </Button>
                <Button variant="outline" onClick={() => setExpandedTest(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {expandedTest === 'human' && (
        <tr className="bg-blue-50 border-b">
          <td colSpan={5} className="py-4 px-4">
            <div className="space-y-3">
              <p className="font-semibold">Human Test Results for Phase {phase.phase_number}</p>
              <Textarea
                placeholder="QA test results, pass/fail status, edge cases tested, integration issues..."
                value={formData.notes}
                onChange={e => setFormData({ notes: e.target.value })}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button onClick={handleHumanTest} disabled={!formData.notes || loading} className="bg-blue-600">
                  {loading ? 'Marking...' : 'Mark as Human-Tested'}
                </Button>
                <Button variant="outline" onClick={() => setExpandedTest(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {expandedTest === 'user' && (
        <tr className="bg-green-50 border-b">
          <td colSpan={5} className="py-4 px-4">
            <div className="space-y-3">
              <p className="font-semibold">User Test Feedback for Phase {phase.phase_number}</p>
              <Textarea
                placeholder="User feedback, usability issues, feature validation, real-world performance..."
                value={formData.notes}
                onChange={e => setFormData({ notes: e.target.value })}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button onClick={handleUserTest} disabled={!formData.notes || loading} className="bg-green-600">
                  {loading ? 'Marking...' : 'Mark as User-Tested'}
                </Button>
                <Button variant="outline" onClick={() => setExpandedTest(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/7.1/
├── page.tsx (route handler)
├── components/
│   ├── TestingMatrix.tsx (main matrix)
│   └── TestingMatrixRow.tsx (individual row with inline testing)
/app/actions/helix/
├── testingMatrix.ts (server actions)
```

## Dependencies

- React hooks: `useState`, `useEffect`
- UI Components: `Card`, `Button`, `Textarea`, `Badge`, `Alert`
- Icons: `lucide-react` (CheckCircle2, Clock, AlertCircle)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Testing matrix displays all built phases as rows with phase number and title
2. Three testing columns (AI-Tested, Human-Tested, User-Tested) with checkboxes or buttons
3. Untested phases show gray background, AI-tested show yellow, human-tested show blue, fully-tested show green
4. Statistics summary shows count at each tier
5. Gate blocker alert displays when not all phases are AI-tested
6. Gate passed alert displays when all phases meet minimum AI-tested requirement
7. Clicking "Test" button on a phase expands inline form for notes entry
8. Human-tested button disabled until phase is AI-tested
9. User-tested button disabled until phase is human-tested
10. After marking complete, matrix updates with checkmark and status badge

## Testing Instructions

1. **Matrix Display:**
   - Navigate to Step 7.1
   - Verify all built phases display in table rows
   - Verify phase number and title correct

2. **Testing Tiers:**
   - Verify three columns for each testing tier
   - Verify "Test" buttons appear for untested phases
   - Verify checkmarks appear for tested phases

3. **Color Coding:**
   - Add AI test
   - Verify row background changes to yellow
   - Add human test
   - Verify row background changes to blue
   - Add user test
   - Verify row background changes to green

4. **Gate Blocker:**
   - With untested phases, verify warning alert displays
   - Mark all phases as AI-tested
   - Verify gate passed alert displays

5. **Testing Buttons:**
   - Try clicking human-tested without AI-tested (disabled)
   - AI-test a phase
   - Verify human-tested button enabled
   - Try clicking user-tested without human-tested (disabled)
   - Human-test phase
   - Verify user-tested button enabled

6. **Inline Forms:**
   - Click "Test" button
   - Verify form expands
   - Add notes
   - Click "Mark as Tested"
   - Verify phase marked and form collapses

7. **Statistics:**
   - Verify counts update as phases tested
   - Verify sum = total phases

8. **Persistence:**
   - Mark phases tested
   - Refresh page
   - Verify testing status persisted

9. **Responsive Table:**
   - Test on mobile
   - Verify table scrolls horizontally
   - Verify all buttons accessible

10. **Testing Tier Legend:**
    - Verify legend explains each tier
    - Verify descriptions clear

## Notes for AI Agent

- The testing matrix is the comprehensive tracking view for Step 7.1
- Three-tier model ensures breadth of coverage: AI (automated), Human (QA), User (real-world)
- The gate requirement (all AI-tested) is a hard block to advancement
- Buttons are cascading: human requires AI, user requires human
- Each test tier captures notes/feedback in the database
- The matrix doesn't prevent marking as tested; it just guides the workflow
- After testing, phases remain in 'built' status (testing happens in parallel with testing stage)
- The status field in helix_testing_matrix tracks which tiers have been completed
- Consider adding keyboard shortcuts for power users (A for AI-test, H for human, U for user)
- The matrix supports quick in-line testing without navigation away from the table
