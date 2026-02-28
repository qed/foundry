# Phase 135 — Role-Based Step Assignments

## Objective
Assign specific team members to Helix steps with role support. Provide assignment UI with project member dropdown, create "My Steps" filter view, show workload visibility (who has how many steps), and notify users when assigned to a step.

## Prerequisites
- Phase 133 — Notification System For Helix Events — Notifications in place
- project_members table exists with role information

## Epic Context
**Epic:** 16 — Real-Time Collaboration
**Phase:** 135 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Steps need clear ownership. Assigning a step to a team member makes expectations clear. Workload visibility helps distribute work evenly. "My Steps" view lets team members focus on their assigned work.

---

## Detailed Requirements

### 1. Step Assignment Service
#### File: `src/lib/helix/step-assignments.ts` (NEW)
```typescript
// src/lib/helix/step-assignments.ts

import { createClient } from '@/lib/supabase';
import { createHelixNotification } from './helix-notifications';

/**
 * Assign step to user
 */
export async function assignStep(stepId: string, userId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('helix_steps')
    .update({ assigned_to: userId, updated_at: new Date().toISOString() })
    .eq('id', stepId);

  // Notify user
  const { data: step } = await supabase
    .from('helix_steps')
    .select('name, project_id')
    .eq('id', stepId)
    .single();

  if (step) {
    await createHelixNotification(
      userId,
      'step_assigned',
      'Step Assigned',
      `You have been assigned to: ${step.name}`,
      stepId,
      'helix_step'
    );
  }
}

/**
 * Get user's assigned steps
 */
export async function getUserSteps(userId: string, projectId: string): Promise<any[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('helix_steps')
    .select('*')
    .eq('project_id', projectId)
    .eq('assigned_to', userId)
    .order('stage_number', { ascending: true })
    .order('step_number', { ascending: true });

  return data || [];
}

/**
 * Get workload summary
 */
export async function getWorkloadSummary(projectId: string): Promise<Record<string, number>> {
  const supabase = createClient();

  const { data } = await supabase
    .from('helix_steps')
    .select('assigned_to')
    .eq('project_id', projectId)
    .not('assigned_to', 'is', null);

  const workload: Record<string, number> = {};
  for (const step of data || []) {
    workload[step.assigned_to] = (workload[step.assigned_to] || 0) + 1;
  }

  return workload;
}
```

### 2. Assignment UI Components
#### File: `src/app/helix/components/step-assignment.tsx` (NEW)
```typescript
// src/app/helix/components/step-assignment.tsx

'use client';

import { useEffect, useState } from 'react';
import { assignStep } from '@/lib/helix/step-assignments';
import { createClient } from '@/lib/supabase';

interface StepAssignmentProps {
  stepId: string;
  currentAssignedTo?: string;
  projectId: string;
}

export function StepAssignment({ stepId, currentAssignedTo, projectId }: StepAssignmentProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState(currentAssignedTo || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  async function loadMembers() {
    const supabase = createClient();

    const { data } = await supabase
      .from('project_members')
      .select('*, profiles:user_id(name, avatar_url)')
      .eq('project_id', projectId);

    setMembers(data || []);
    setLoading(false);
  }

  async function handleAssign(userId: string) {
    try {
      await assignStep(stepId, userId);
      setSelected(userId);
    } catch (error) {
      console.error('Failed to assign step:', error);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold">Assign to</label>

      {loading ? (
        <p className="text-sm text-gray-600">Loading members...</p>
      ) : (
        <select
          value={selected}
          onChange={e => handleAssign(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
        >
          <option value="">Unassigned</option>
          {members.map(member => (
            <option key={member.user_id} value={member.user_id}>
              {member.profiles?.name || member.user_id}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

#### File: `src/app/helix/projects/[projectId]/my-steps-view.tsx` (NEW)
```typescript
// src/app/helix/projects/[projectId]/my-steps-view.tsx

'use client';

import { useEffect, useState } from 'react';
import { getUserSteps } from '@/lib/helix/step-assignments';

interface MyStepsViewProps {
  projectId: string;
  currentUserId: string;
}

export function MyStepsView({ projectId, currentUserId }: MyStepsViewProps) {
  const [mySteps, setMySteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadMySteps();
  }, [projectId, currentUserId]);

  async function loadMySteps() {
    try {
      const steps = await getUserSteps(currentUserId, projectId);
      setMySteps(steps);
    } catch (error) {
      console.error('Failed to load my steps:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterStatus === 'all'
    ? mySteps
    : mySteps.filter(s => s.status === filterStatus);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">My Steps</h2>
        <div className="flex gap-2">
          {['all', 'planning', 'in-progress', 'in-review', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded text-sm ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading your steps...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600">No steps assigned to you yet</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map(step => (
            <a
              key={step.id}
              href={`/helix/projects/${projectId}/steps/${step.id}`}
              className="p-4 border rounded hover:shadow-md transition bg-white"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{step.name}</h3>
                  <p className="text-sm text-gray-600">
                    Stage {step.stage_number} • Step {step.step_number}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  step.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : step.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {step.status}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### File: `src/app/helix/components/workload-summary.tsx` (NEW)
```typescript
// src/app/helix/components/workload-summary.tsx

'use client';

import { useEffect, useState } from 'react';
import { getWorkloadSummary } from '@/lib/helix/step-assignments';

interface WorkloadSummaryProps {
  projectId: string;
}

export function WorkloadSummary({ projectId }: WorkloadSummaryProps) {
  const [workload, setWorkload] = useState<Record<string, number>>({});
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadWorkload();
  }, [projectId]);

  async function loadWorkload() {
    try {
      const summary = await getWorkloadSummary(projectId);
      setWorkload(summary);
    } catch (error) {
      console.error('Failed to load workload:', error);
    }
  }

  const maxWorkload = Math.max(...Object.values(workload), 1);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold mb-3">Team Workload</h3>

      <div className="space-y-2">
        {Object.entries(workload).map(([userId, count]) => (
          <div key={userId} className="flex items-center gap-2">
            <span className="text-sm font-medium w-20">{memberNames[userId] || userId}</span>
            <div className="flex-1 bg-gray-200 rounded h-6">
              <div
                className="bg-blue-500 h-full rounded transition-all"
                style={{ width: `${(count / maxWorkload) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-700 w-8">{count}</span>
          </div>
        ))}
      </div>

      {Object.keys(workload).length === 0 && (
        <p className="text-sm text-gray-600 text-center">No steps assigned yet</p>
      )}
    </div>
  );
}
```

---

## File Structure
```
src/lib/helix/
├── step-assignments.ts (NEW)

src/app/helix/components/
├── step-assignment.tsx (NEW)
├── workload-summary.tsx (NEW)

src/app/helix/projects/[projectId]/
├── my-steps-view.tsx (NEW)
```

---

## Dependencies
- helix_steps table with assigned_to column
- project_members table
- profiles table (for member names)
- Notifications (Phase 133)

---

## Tech Stack
- TypeScript for assignment logic
- React for UI
- Supabase for data

---

## Acceptance Criteria
1. assignStep updates helix_steps.assigned_to
2. Notification created when step assigned
3. getUserSteps filters by assigned_to and projectId
4. getWorkloadSummary aggregates steps per user
5. StepAssignment shows member dropdown
6. Selected member is pre-filled
7. MyStepsView displays user's assigned steps
8. Filter buttons work (all, planning, etc.)
9. WorkloadSummary shows bar chart
10. Max workload used to scale bars

---

## Testing Instructions
1. Assign step to User A
2. Verify notification sent to User A
3. Call getUserSteps for User A
4. Verify step appears
5. Load MyStepsView as User A
6. Verify assigned step displays
7. Filter by status
8. Verify filter works
9. Assign multiple steps
10. Load WorkloadSummary
11. Verify bars show relative workload

---

## Notes for the AI Agent
- Assignments are optional (can be null)
- Notifications keep teams in sync
- Workload visibility helps balance work
- MyStepsView is personal dashboard for each team member
- Consider adding auto-assignment suggestions based on skills/history
