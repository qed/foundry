# Phase 034: Individual Build Phase Card

**Status:** Build Stage (Step 6.1) | **Phase Number:** 034 | **Epic:** 5

## Objective

Create a detailed phase card view that displays comprehensive information about a single build phase from the Build Plan. This phase enables users to understand what needs to be built, track its status progression, and access build evidence. The card serves as the entry point to Phase 035 (Build Completion Flow).

## Prerequisites

- Phase 033 complete: helix_build_phases table populated with phases
- Route `/org/[orgSlug]/project/[projectId]/helix/phase/[phaseId]` available
- Build Phase Overview functional with phase data accessible
- TypeScript types defined for build phase data structure

## Epic Context (Epic 5)

Phase 034 provides the detailed view for individual phases, allowing users to understand the scope of each build phase and transition it through status states. It acts as the bridge between Phase 033 (overview) and Phase 035 (completion flow), providing visibility into what was built and storing evidence of completion.

## Context

Each build phase represents a discrete chunk of work extracted from the Build Plan. The phase card displays:
- Full specification/description from the uploaded plan
- Current status with visual indicators
- Build evidence collected during execution
- Test evidence from testing stages
- Controls to advance phase status

The card is accessed by clicking "View" on a phase from the overview list.

## Detailed Requirements with Code

### 1. Route Handler for Phase Detail

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/phase/[phaseId]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import BuildPhaseCard from './components/BuildPhaseCard';

interface PageParams {
  params: Promise<{
    orgSlug: string;
    projectId: string;
    phaseId: string;
  }>;
}

export default async function PhaseDetailPage({ params }: PageParams) {
  const { orgSlug, projectId, phaseId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  // Verify project access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project || project.org_id !== user.org_id) {
    return notFound();
  }

  // Fetch phase
  const { data: phase, error: phaseError } = await supabase
    .from('helix_build_phases')
    .select('*')
    .eq('id', phaseId)
    .eq('project_id', projectId)
    .single();

  if (phaseError || !phase) {
    return notFound();
  }

  // Fetch helix process for navigation
  const { data: helixProcess } = await supabase
    .from('helix_processes')
    .select('id, step_key')
    .eq('id', phase.helix_process_id)
    .single();

  return (
    <BuildPhaseCard
      phase={phase}
      projectId={projectId}
      orgSlug={orgSlug}
      helixProcessId={phase.helix_process_id}
      stepKey={helixProcess?.step_key}
    />
  );
}
```

### 2. Server Actions for Phase Operations

Create `/app/actions/helix/phaseCard.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function updatePhaseStatus(
  phaseId: string,
  projectId: string,
  status: 'not_started' | 'in_progress' | 'built' | 'tested',
  evidence?: { notes?: string; screenshot_url?: string }
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Verify access
  const { data: phase, error: fetchError } = await supabase
    .from('helix_build_phases')
    .select('id')
    .eq('id', phaseId)
    .eq('project_id', projectId)
    .single();

  if (fetchError || !phase) {
    throw new Error('Phase not found');
  }

  const updateData: any = { status, updated_at: new Date().toISOString() };

  if (status === 'in_progress' && !phase.started_at) {
    updateData.started_at = new Date().toISOString();
  }

  if ((status === 'built' || status === 'tested') && evidence) {
    updateData.evidence_data = evidence;
  }

  if (status === 'built') {
    updateData.completed_at = new Date().toISOString();
  }

  if (status === 'tested') {
    updateData.tested_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('helix_build_phases')
    .update(updateData)
    .eq('id', phaseId);

  if (error) throw error;

  return { success: true };
}

export async function getPhaseDetails(phaseId: string, projectId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { data: phase, error } = await supabase
    .from('helix_build_phases')
    .select('*')
    .eq('id', phaseId)
    .eq('project_id', projectId)
    .single();

  if (error) throw error;

  return phase;
}

export async function getPhaseIndex(
  projectId: string,
  helixProcessId: string,
  phaseId: string
) {
  const supabase = await createClient();

  const { data: phases, error } = await supabase
    .from('helix_build_phases')
    .select('id')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .order('phase_number', { ascending: true });

  if (error) throw error;

  const index = phases?.findIndex(p => p.id === phaseId) ?? -1;
  return {
    current: index,
    total: phases?.length ?? 0,
    hasPrevious: index > 0,
    hasNext: index < (phases?.length ?? 0) - 1,
    previousId: index > 0 ? phases?.[index - 1]?.id : null,
    nextId: index < (phases?.length ?? 0) - 1 ? phases?.[index + 1]?.id : null
  };
}
```

### 3. React Component: Build Phase Card

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/phase/[phaseId]/components/BuildPhaseCard.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updatePhaseStatus, getPhaseIndex } from '@/app/actions/helix/phaseCard';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface BuildPhaseCardProps {
  phase: any;
  projectId: string;
  orgSlug: string;
  helixProcessId: string;
  stepKey?: string;
}

export default function BuildPhaseCard({
  phase,
  projectId,
  orgSlug,
  helixProcessId,
  stepKey
}: BuildPhaseCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState<any>(null);

  useEffect(() => {
    async function loadIndex() {
      try {
        const index = await getPhaseIndex(projectId, helixProcessId, phase.id);
        setPhaseIndex(index);
      } catch (error) {
        console.error('Failed to load phase index:', error);
      }
    }

    loadIndex();
  }, [phase.id, projectId, helixProcessId]);

  const handleStartBuilding = async () => {
    setLoading(true);
    try {
      await updatePhaseStatus(phase.id, projectId, 'in_progress');
      router.refresh();
    } catch (error) {
      console.error('Failed to start building:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-900';
      case 'in_progress': return 'bg-blue-100 text-blue-900';
      case 'built': return 'bg-green-100 text-green-900';
      case 'tested': return 'bg-emerald-100 text-emerald-900';
      default: return 'bg-gray-100 text-gray-900';
    }
  };

  const getStatusBadgeVariant = (status: string): any => {
    switch (status) {
      case 'not_started': return 'secondary';
      case 'in_progress': return 'default';
      case 'built': return 'default';
      case 'tested': return 'success';
      default: return 'secondary';
    }
  };

  const specPreview = phase.description?.substring(0, 500) || 'No description available';
  const hasEvidence = phase.evidence_data && Object.keys(phase.evidence_data).length > 0;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href={`/org/${orgSlug}/project/${projectId}/helix/step/6.1/`}>
          <Button variant="outline" size="sm">
            ← Back to Overview
          </Button>
        </Link>
        <div className="flex gap-2">
          {phaseIndex?.hasPrevious && (
            <Link href={`/org/${orgSlug}/project/${projectId}/helix/phase/${phaseIndex.previousId}`}>
              <Button variant="outline" size="sm">
                ← Previous Phase
              </Button>
            </Link>
          )}
          {phaseIndex?.hasNext && (
            <Link href={`/org/${orgSlug}/project/${projectId}/helix/phase/${phaseIndex.nextId}`}>
              <Button variant="outline" size="sm">
                Next Phase →
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono text-gray-600">
                  Phase {phase.phase_number} of {phaseIndex?.total || '?'}
                </span>
              </div>
              <CardTitle className="text-3xl">{phase.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {stepKey && `Step ${stepKey} - Build Stage`}
              </CardDescription>
            </div>
            <Badge
              variant={getStatusBadgeVariant(phase.status)}
              className={`text-base px-4 py-2 ${getStatusColor(phase.status)}`}
            >
              {phase.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Spec Preview */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Specification Preview</h3>
            <div className="bg-gray-50 p-4 rounded-lg border text-sm text-gray-700 max-h-48 overflow-y-auto">
              {specPreview}
            </div>
            {phase.description && phase.description.length > 500 && (
              <p className="text-xs text-gray-500 mt-2">... (truncated, full spec in Build Plan)</p>
            )}
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 font-semibold">STARTED</div>
              <div className="text-sm font-mono mt-1">
                {phase.started_at
                  ? new Date(phase.started_at).toLocaleDateString()
                  : 'Not started'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 font-semibold">BUILT</div>
              <div className="text-sm font-mono mt-1">
                {phase.completed_at
                  ? new Date(phase.completed_at).toLocaleDateString()
                  : 'Pending'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 font-semibold">TESTED</div>
              <div className="text-sm font-mono mt-1">
                {phase.tested_at
                  ? new Date(phase.tested_at).toLocaleDateString()
                  : 'Pending'}
              </div>
            </div>
          </div>

          {/* Build Evidence Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Build Evidence</h3>
            {hasEvidence ? (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2 text-sm">
                    {phase.evidence_data?.build_notes && (
                      <div>
                        <strong>Notes:</strong> {phase.evidence_data.build_notes}
                      </div>
                    )}
                    {phase.evidence_data?.commit_hash && (
                      <div>
                        <strong>Commit:</strong>{' '}
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {phase.evidence_data.commit_hash.substring(0, 8)}
                        </code>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription className="text-gray-500">
                  No build evidence collected yet
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Test Evidence Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Test Evidence</h3>
            {phase.tested_at ? (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription>
                  <div className="text-sm">
                    <strong>Tested at:</strong>{' '}
                    {new Date(phase.tested_at).toLocaleDateString()}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription className="text-gray-500">
                  Testing not yet completed
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {phase.status === 'not_started' && (
              <Button
                size="lg"
                onClick={handleStartBuilding}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Starting...' : 'Start Building'}
              </Button>
            )}

            {phase.status === 'in_progress' && (
              <Link href={`/org/${orgSlug}/project/${projectId}/helix/phase/${phase.id}/complete`}>
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  Mark as Built
                </Button>
              </Link>
            )}

            {(phase.status === 'built' || phase.status === 'tested') && (
              <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold">Phase {phase.status}</p>
                <p className="text-xs text-gray-600">
                  {phase.status === 'built'
                    ? 'Waiting for testing phase'
                    : 'Testing complete'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {phaseIndex && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              Phase {phaseIndex.current + 1} of {phaseIndex.total}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(((phaseIndex.current + 1) / phaseIndex.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((phaseIndex.current + 1) / phaseIndex.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Status Badge Component

Create `/components/phase/StatusIndicator.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';

interface StatusIndicatorProps {
  status: 'not_started' | 'in_progress' | 'built' | 'tested';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const variants: Record<string, { badge: any; text: string }> = {
    not_started: { badge: 'secondary', text: 'Not Started' },
    in_progress: { badge: 'default', text: 'In Progress' },
    built: { badge: 'default', text: 'Built' },
    tested: { badge: 'success', text: 'Tested' }
  };

  const config = variants[status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge variant={config.badge} className={sizeClasses[size]}>
      {config.text}
    </Badge>
  );
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/phase/[phaseId]/
├── page.tsx (route handler)
├── components/
│   └── BuildPhaseCard.tsx (main card)
/app/actions/helix/
├── phaseCard.ts (server actions)
/components/phase/
├── StatusIndicator.tsx (reusable badge)
```

## Dependencies

- `@supabase/supabase-js` - Database operations
- Next.js 16+ - Routing and SSR
- React hooks - State management
- UI Components: `Card`, `Badge`, `Button`, `Alert`

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions + Router refresh

## Acceptance Criteria

1. Phase card displays phase number, title, status badge, and full description
2. Status badge color changes based on phase status (not_started, in_progress, built, tested)
3. Specification preview shows first 500 characters with truncation indicator
4. Build Evidence section displays commit hash and build notes when available
5. Test Evidence section shows testing status and date when tested
6. Timeline section shows started_at, completed_at, tested_at dates
7. "Start Building" button appears only when phase.status === 'not_started'
8. "Mark as Built" button appears only when phase.status === 'in_progress'
9. Phase navigation shows previous/next phase links when available
10. Phase progress indicator shows current phase position (X of Y) with visual bar

## Testing Instructions

1. **Phase Card Display:**
   - Navigate to a phase detail page
   - Verify phase number, title, and status badge display
   - Verify description preview is truncated at 500 chars

2. **Status Progression:**
   - Click "Start Building" button
   - Verify status changes to 'in_progress'
   - Verify started_at timestamp is set
   - Verify button changes to "Mark as Built"

3. **Navigation:**
   - Verify back button returns to overview
   - Click next/previous phase buttons
   - Verify navigation to correct adjacent phases

4. **Evidence Display:**
   - Mark a phase as built with evidence
   - Return to phase card
   - Verify build evidence displays

5. **Timeline Display:**
   - Verify all three timeline blocks show correct dates
   - Verify "Not started" or "Pending" displays for unset dates

6. **Progress Bar:**
   - Verify phase position calculated correctly
   - Verify percentage matches position

7. **Button States:**
   - Test button disabled state while loading
   - Test button visibility based on phase status

8. **Responsive Design:**
   - Test on mobile (375px)
   - Verify all sections readable
   - Verify buttons accessible

9. **Error Handling:**
   - Test with invalid phase ID
   - Verify 404 or error message

10. **Refresh Persistence:**
    - Make status changes
    - Refresh page
    - Verify state persisted

## Notes for AI Agent

- Phase card is accessed from Phase 033 overview by clicking "View" button
- The spec_preview comes from phase.description, which is populated from the Build Plan artifact
- Status transitions: not_started → in_progress → built → tested
- Each status change should update corresponding timestamp (started_at, completed_at, tested_at)
- Evidence is stored in the evidence_data JSONB column
- Navigation between phases should be smooth with previous/next links
- The card is read-only display of build artifacts; actual build execution details are added in Phase 035
- Always verify project ownership and phase membership before displaying
- The phase index calculation helps determine position in the overall build process
