# Phase 033: Build Stage Overview & Phase Tracker

**Status:** Build Stage (Step 6.1) | **Phase Number:** 033 | **Epic:** 5

## Objective

Provide a comprehensive visual overview of the Build stage by parsing the uploaded Build Plan artifact, extracting all build phases, and presenting them in an organized, trackable interface. This serves as the main dashboard for Step 6.1 and enables the user to monitor progress through all build phases with status tracking.

## Prerequisites

- Epic 4 complete: Build Plan artifact uploaded and stored in helix_artifacts table
- Route `/org/[orgSlug]/project/[projectId]/helix/step/[stepKey]/` functional for Stage 6, Step 6.1
- Database schema updated with helix_build_phases table
- Gate checks from Stage 5 passed (hard-block system active)

## Epic Context (Epic 5)

Epic 5 ("Build, Testing & Deployment Stages") introduces the execution layer of the Helix Mode workflow. Phase 033 launches Step 6.1 (Build phases) by providing visibility into the entire build plan and establishing status tracking for each phase. Subsequent phases (034-035) handle the detailed build execution, phases 037-039 cover testing, and phases 040-044 handle deployment and completion.

## Context

The user has uploaded a Build Plan document (artifact) in Phase 032 that contains a structured list of build phases. This phase extracts that plan and makes it actionable by:
1. Parsing the artifact to identify phases
2. Creating database records for each phase
3. Displaying an organized view with status progression
4. Showing overall progress metrics

This is the entry point to the active build execution workflow.

## Detailed Requirements with Code

### 1. Database Schema: helix_build_phases

```sql
CREATE TABLE helix_build_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  helix_process_id UUID NOT NULL REFERENCES helix_processes(id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  commit_hash VARCHAR(40),
  build_notes TEXT,
  evidence_data JSONB DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  tested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, phase_number)
);

CREATE INDEX idx_helix_build_phases_project_id ON helix_build_phases(project_id);
CREATE INDEX idx_helix_build_phases_status ON helix_build_phases(status);
CREATE INDEX idx_helix_build_phases_helix_process_id ON helix_build_phases(helix_process_id);
```

### 2. Parse Build Plan Artifact Function

Create `/lib/helix/buildPlanParser.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

interface BuildPhase {
  number: number;
  title: string;
  description: string;
}

export async function parseBuildPlanArtifact(
  artifactData: any
): Promise<BuildPhase[]> {
  // Extract phases from artifact
  // Handle both markdown and JSON formats

  if (artifactData.format === 'markdown') {
    return parseMarkdownPlan(artifactData.content);
  } else if (artifactData.format === 'json') {
    return artifactData.phases || [];
  }

  return [];
}

function parseMarkdownPlan(content: string): BuildPhase[] {
  const phases: BuildPhase[] = [];
  const phaseRegex = /##\s+Phase\s+(\d+)[:\s]+(.+?)\n([\s\S]*?)(?=##\s+Phase|\Z)/g;

  let match;
  while ((match = phaseRegex.exec(content)) !== null) {
    phases.push({
      number: parseInt(match[1]),
      title: match[2].trim(),
      description: match[3].trim().substring(0, 500)
    });
  }

  return phases.sort((a, b) => a.number - b.number);
}

export async function seedBuildPhasesFromArtifact(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  helixProcessId: string,
  artifactData: any
): Promise<string[]> {
  const phases = await parseBuildPlanArtifact(artifactData);
  const createdIds: string[] = [];

  for (const phase of phases) {
    const { data, error } = await supabase
      .from('helix_build_phases')
      .insert({
        project_id: projectId,
        helix_process_id: helixProcessId,
        phase_number: phase.number,
        title: phase.title,
        description: phase.description,
        status: 'not_started'
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Error creating phase ${phase.number}:`, error);
    } else if (data) {
      createdIds.push(data.id);
    }
  }

  return createdIds;
}
```

### 3. Server Action: Fetch Build Phases

Create `/app/actions/helix/buildPhases.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function fetchBuildPhases(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Verify project access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('org_id', user.org_id)
    .single();

  if (projectError || !project) {
    throw new Error('Project not found or access denied');
  }

  const { data: phases, error } = await supabase
    .from('helix_build_phases')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .order('phase_number', { ascending: true });

  if (error) throw error;

  return phases || [];
}

export async function getBuildPhaseStats(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();

  const { data: phases } = await supabase
    .from('helix_build_phases')
    .select('status')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId);

  if (!phases) return null;

  const stats = {
    total: phases.length,
    not_started: phases.filter(p => p.status === 'not_started').length,
    in_progress: phases.filter(p => p.status === 'in_progress').length,
    built: phases.filter(p => p.status === 'built').length,
    tested: phases.filter(p => p.status === 'tested').length
  };

  stats.completed = stats.built + stats.tested;

  return stats;
}
```

### 4. React Component: Build Phase Overview

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/[stepKey]/components/BuildPhaseOverview.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchBuildPhases, getBuildPhaseStats } from '@/app/actions/helix/buildPhases';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface BuildPhaseOverviewProps {
  projectId: string;
  helixProcessId: string;
  orgSlug: string;
}

export default function BuildPhaseOverview({
  projectId,
  helixProcessId,
  orgSlug
}: BuildPhaseOverviewProps) {
  const [phases, setPhases] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [phasesData, statsData] = await Promise.all([
          fetchBuildPhases(projectId, helixProcessId),
          getBuildPhaseStats(projectId, helixProcessId)
        ]);

        setPhases(phasesData);
        setStats(statsData);

        // Find current phase (first not_started, or first in_progress)
        const inProgress = phasesData.findIndex(p => p.status === 'in_progress');
        const notStarted = phasesData.findIndex(p => p.status === 'not_started');
        setCurrentPhaseIndex(inProgress >= 0 ? inProgress : notStarted >= 0 ? notStarted : 0);
      } catch (error) {
        console.error('Failed to load build phases:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId, helixProcessId]);

  if (loading) {
    return <div className="animate-pulse">Loading phases...</div>;
  }

  const progressPercent = stats?.total ? (stats.completed / stats.total) * 100 : 0;
  const currentPhase = phases[currentPhaseIndex];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100';
      case 'in_progress': return 'bg-blue-100';
      case 'built': return 'bg-green-100';
      case 'tested': return 'bg-emerald-100';
      default: return 'bg-gray-100';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Build Stage: Phase Tracker</h1>
        <p className="text-gray-600 mt-1">Step 6.1 - Executing build phases from your plan</p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Overall Progress</h2>
          <span className="text-2xl font-bold text-blue-600">
            {stats?.completed}/{stats?.total}
          </span>
        </div>
        <Progress value={progressPercent} className="h-3" />
        <p className="text-sm text-gray-600 mt-2">
          {Math.round(progressPercent)}% complete • {stats?.in_progress} in progress
        </p>
      </div>

      {/* Current Phase Highlight */}
      {currentPhase && (
        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-blue-900">Current Phase</h3>
              <p className="text-sm text-blue-700 mt-1">Phase {currentPhase.phase_number}: {currentPhase.title}</p>
              <p className="text-gray-700 mt-3">{currentPhase.description?.substring(0, 200)}...</p>
            </div>
            <Link href={`/org/${orgSlug}/project/${projectId}/helix/phase/${currentPhase.id}`}>
              <Button>Go to Phase</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Phases List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold">All Build Phases</h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {phases.map((phase, idx) => (
            <div
              key={phase.id}
              className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                idx === currentPhaseIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-gray-500">
                      #{phase.phase_number}
                    </span>
                    <h4 className="font-semibold">{phase.title}</h4>
                    <Badge variant={getStatusBadgeVariant(phase.status)}>
                      {phase.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {phase.description?.substring(0, 150)}...
                  </p>
                </div>
                <Link href={`/org/${orgSlug}/project/${projectId}/helix/phase/${phase.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-3xl font-bold text-gray-900">{stats?.total}</div>
          <div className="text-sm text-gray-600">Total Phases</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-3xl font-bold text-green-600">{stats?.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-3xl font-bold text-blue-600">{stats?.in_progress}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-3xl font-bold text-orange-600">{stats?.not_started}</div>
          <div className="text-sm text-gray-600">Not Started</div>
        </div>
      </div>
    </div>
  );
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/[stepKey]/
├── page.tsx (route handler for Step 6.1)
├── components/
│   └── BuildPhaseOverview.tsx (main view)
/app/actions/helix/
├── buildPhases.ts (server actions)
/lib/helix/
├── buildPlanParser.ts (artifact parsing)
```

## Dependencies

- `@supabase/supabase-js` - Database client
- `next/link` - Navigation
- React hooks: `useState`, `useEffect`
- UI Components: `Progress`, `Badge`, `Button`

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL, TypeScript
- **Database:** PostgreSQL (helix_build_phases table)
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Build Plan artifact is parsed and all phases extracted into helix_build_phases table
2. Overview page displays total phase count, completion percentage, and progress bar
3. Each phase shows: number, title, status badge, and truncated description
4. Current phase is highlighted with distinct background color
5. Statistics grid shows: total, completed, in progress, not started counts
6. Progress metrics update in real-time when phases are marked complete
7. "View" button on each phase links to Phase 034 detail card
8. First load auto-seeds database from latest artifact if phases don't exist
9. Phases sorted by phase_number in ascending order
10. Page is responsive and handles 50+ phases with scrollable list

## Testing Instructions

1. **Parse Artifact:**
   - Upload Build Plan artifact in Phase 032
   - Verify helix_build_phases table populated with correct phase data
   - Check phase_number, title, description fields populated

2. **Display Overview:**
   - Navigate to Step 6.1
   - Verify progress bar shows 0% (all phases not_started)
   - Verify phase count matches artifact

3. **Highlight Current Phase:**
   - Verify first not_started phase highlighted
   - Update a phase status to in_progress
   - Verify current phase indicator updates

4. **Statistics:**
   - Verify 4-column stat grid shows correct counts
   - Mark phases as built, verify counts update

5. **Navigation:**
   - Click "View" on any phase
   - Verify navigation to phase detail page
   - Verify phase data passed correctly

6. **Responsive Design:**
   - Test on mobile (375px width)
   - Verify scrollable list works
   - Verify buttons accessible on all sizes

7. **Performance:**
   - Verify phase list loads in <2s with 50+ phases
   - Verify no N+1 queries

8. **Data Integrity:**
   - Verify UNIQUE constraint on (project_id, phase_number)
   - Verify indexes created for common queries

9. **Error Handling:**
   - Test with missing artifact
   - Verify graceful fallback (empty phase list)

10. **Refresh:**
    - Manually mark phases as complete
    - Refresh page
    - Verify state persisted and stats accurate

## Notes for AI Agent

- The Build Plan artifact is already stored in helix_artifacts table from Phase 032
- Query helix_artifacts filtered by artifact_type='build_plan' and project_id to find the artifact
- Handle both markdown and JSON artifact formats
- Set all initial phases to status='not_started'
- The helix_build_phases table is the single source of truth for phase tracking throughout Epic 5
- Seed operation should be idempotent (check for existing phases before inserting)
- Phase numbers start at 1 and are contiguous in most cases
- When moving through phases, always check that current phase is either in_progress or the first not_started phase
- Evidence for this phase is the complete phase list display with status tracking enabled
