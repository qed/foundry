# Phase 040: Step 8.1 - Prepare for Deployment

**Status:** Deployment Stage (Step 8.1) | **Phase Number:** 040 | **Epic:** 5

## Objective

Implement a deployment preparation checklist that ensures all prerequisites are met before executing the deployment. This phase verifies infrastructure, configuration, monitoring, and rollback readiness through a comprehensive pre-deployment checklist.

## Prerequisites

- Phase 039 complete: Testing gate passed
- Route `/org/[orgSlug]/project/[projectId]/helix/step/8.1/` available
- Database schema for deployment checklists
- Access to infrastructure configuration information

## Epic Context (Epic 5)

Phase 040 marks the beginning of the Deployment stage (Stage 8). Before production deployment, a series of prerequisite checks must be completed. This phase creates a structured checklist that serves as the final quality gate before going live.

## Context

Deployment readiness requires multiple technical and operational checks:
1. Code is merged and ready
2. Build succeeds without errors
3. Environment variables configured for production
4. Database migrations prepared
5. DNS/domain configuration verified
6. SSL certificate in place
7. Monitoring/alerting configured
8. Rollback plan documented

Each item has a checkbox and optional notes field. All items should be checked before proceeding to Step 8.2 (deployment execution).

## Detailed Requirements with Code

### 1. Database Schema: Deployment Checklist

```sql
CREATE TABLE helix_deployment_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  helix_process_id UUID NOT NULL REFERENCES helix_processes(id) ON DELETE CASCADE,

  merged_to_main BOOLEAN DEFAULT FALSE,
  merged_at TIMESTAMP,
  merge_notes TEXT,

  final_build_success BOOLEAN DEFAULT FALSE,
  build_completed_at TIMESTAMP,
  build_notes TEXT,

  env_configured BOOLEAN DEFAULT FALSE,
  env_notes TEXT,

  migrations_ready BOOLEAN DEFAULT FALSE,
  migrations_notes TEXT,

  dns_verified BOOLEAN DEFAULT FALSE,
  dns_notes TEXT,

  ssl_ready BOOLEAN DEFAULT FALSE,
  ssl_notes TEXT,

  monitoring_configured BOOLEAN DEFAULT FALSE,
  monitoring_notes TEXT,

  rollback_plan BOOLEAN DEFAULT FALSE,
  rollback_plan_notes TEXT,

  all_checked BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES auth.users(id),

  evidence_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(helix_process_id)
);

CREATE INDEX idx_helix_deployment_checklists_project_id ON helix_deployment_checklists(project_id);
```

### 2. Server Actions: Deployment Preparation

Create `/app/actions/helix/deploymentPrep.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export type ChecklistItem =
  | 'merged_to_main'
  | 'final_build_success'
  | 'env_configured'
  | 'migrations_ready'
  | 'dns_verified'
  | 'ssl_ready'
  | 'monitoring_configured'
  | 'rollback_plan';

export async function getDeploymentChecklist(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  let { data: checklist, error } = await supabase
    .from('helix_deployment_checklists')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  // If no checklist exists, create one
  if (error && error.code === 'PGRST116') {
    const { data: newChecklist, error: createError } = await supabase
      .from('helix_deployment_checklists')
      .insert({
        project_id: projectId,
        helix_process_id: helixProcessId
      })
      .select()
      .single();

    if (createError) throw createError;
    checklist = newChecklist;
  } else if (error) {
    throw error;
  }

  return checklist;
}

export async function updateChecklistItem(
  projectId: string,
  helixProcessId: string,
  item: ChecklistItem,
  checked: boolean,
  notes?: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Get current checklist
  const { data: checklist, error: fetchError } = await supabase
    .from('helix_deployment_checklists')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  if (fetchError) throw fetchError;

  const notesField = `${item}_notes`;
  const updateData: any = {
    [item]: checked,
    [notesField]: notes || null,
    updated_at: new Date().toISOString()
  };

  // If checking an item for the first time, set timestamp
  if (checked && !checklist[item]) {
    const timestampField = `${item.replace('_', '_')}_at` || `${item}`;
    if (timestampField.endsWith('_at')) {
      updateData[timestampField] = new Date().toISOString();
    }
  }

  const { error: updateError } = await supabase
    .from('helix_deployment_checklists')
    .update(updateData)
    .eq('helix_process_id', helixProcessId);

  if (updateError) throw updateError;

  return { success: true };
}

export async function getChecklistStats(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();

  const { data: checklist } = await supabase
    .from('helix_deployment_checklists')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  if (!checklist) {
    return {
      total: 8,
      checked: 0,
      percent: 0,
      all_checked: false
    };
  }

  const items: ChecklistItem[] = [
    'merged_to_main',
    'final_build_success',
    'env_configured',
    'migrations_ready',
    'dns_verified',
    'ssl_ready',
    'monitoring_configured',
    'rollback_plan'
  ];

  const checked = items.filter(item => checklist[item]).length;

  return {
    total: items.length,
    checked,
    percent: Math.round((checked / items.length) * 100),
    all_checked: checked === items.length
  };
}

export async function markChecklistComplete(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Verify all items checked
  const stats = await getChecklistStats(projectId, helixProcessId);

  if (!stats.all_checked) {
    throw new Error('All checklist items must be completed');
  }

  const { error } = await supabase
    .from('helix_deployment_checklists')
    .update({
      all_checked: true,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('helix_process_id', helixProcessId);

  if (error) throw error;

  return { success: true, message: 'Deployment preparation complete' };
}
```

### 3. React Component: Deployment Preparation Checklist

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/8.1/components/DeploymentPrepChecklist.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  getDeploymentChecklist,
  updateChecklistItem,
  getChecklistStats,
  markChecklistComplete,
  ChecklistItem
} from '@/app/actions/helix/deploymentPrep';

interface DeploymentPrepChecklistProps {
  projectId: string;
  orgSlug: string;
  helixProcessId: string;
}

interface ChecklistState {
  merged_to_main: boolean;
  final_build_success: boolean;
  env_configured: boolean;
  migrations_ready: boolean;
  dns_verified: boolean;
  ssl_ready: boolean;
  monitoring_configured: boolean;
  rollback_plan: boolean;
}

interface NotesState {
  merged_to_main: string;
  final_build_success: string;
  env_configured: string;
  migrations_ready: string;
  dns_verified: string;
  ssl_ready: string;
  monitoring_configured: string;
  rollback_plan: string;
}

const checklistItems: Array<{
  key: ChecklistItem;
  label: string;
  description: string;
  details: string;
}> = [
  {
    key: 'merged_to_main',
    label: 'Dev branch merged to main',
    description: 'All built phases are merged into main branch',
    details: 'Verify your feature branch is merged to main or production branch'
  },
  {
    key: 'final_build_success',
    label: 'Final build succeeds without errors',
    description: 'Clean production build completed successfully',
    details: 'Run final build on main branch and verify no errors or warnings'
  },
  {
    key: 'env_configured',
    label: 'Environment variables configured for production',
    description: 'All environment variables set correctly for production',
    details: 'Verify database URLs, API keys, secrets, and service endpoints'
  },
  {
    key: 'migrations_ready',
    label: 'Database migrations ready for production',
    description: 'All database schema changes ready to apply',
    details: 'Review migrations for backward compatibility and test rollback'
  },
  {
    key: 'dns_verified',
    label: 'DNS/domain configuration verified',
    description: 'Domain points to production infrastructure',
    details: 'Verify DNS records, CNAME/A records, and CDN configuration'
  },
  {
    key: 'ssl_ready',
    label: 'SSL certificate in place',
    description: 'HTTPS certificate installed and valid',
    details: 'Check certificate expiration, chain, and renewal automation'
  },
  {
    key: 'monitoring_configured',
    label: 'Monitoring/alerting configured',
    description: 'Error tracking and performance monitoring active',
    details: 'Sentry/LogRocket running, alerts configured, notification channels ready'
  },
  {
    key: 'rollback_plan',
    label: 'Rollback plan documented',
    description: 'Plan documented for reverting deployment if needed',
    details: 'Document rollback procedure, database rollback steps, and communication plan'
  }
];

export default function DeploymentPrepChecklist({
  projectId,
  orgSlug,
  helixProcessId
}: DeploymentPrepChecklistProps) {
  const router = useRouter();

  const [checklist, setChecklist] = useState<ChecklistState | null>(null);
  const [notes, setNotes] = useState<NotesState>({
    merged_to_main: '',
    final_build_success: '',
    env_configured: '',
    migrations_ready: '',
    dns_verified: '',
    ssl_ready: '',
    monitoring_configured: '',
    rollback_plan: ''
  });

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [expandedItem, setExpandedItem] = useState<ChecklistItem | null>(null);

  useEffect(() => {
    loadChecklist();
  }, [projectId, helixProcessId]);

  const loadChecklist = async () => {
    try {
      const [checklistData, statsData] = await Promise.all([
        getDeploymentChecklist(projectId, helixProcessId),
        getChecklistStats(projectId, helixProcessId)
      ]);

      setChecklist({
        merged_to_main: checklistData.merged_to_main,
        final_build_success: checklistData.final_build_success,
        env_configured: checklistData.env_configured,
        migrations_ready: checklistData.migrations_ready,
        dns_verified: checklistData.dns_verified,
        ssl_ready: checklistData.ssl_ready,
        monitoring_configured: checklistData.monitoring_configured,
        rollback_plan: checklistData.rollback_plan
      });

      setNotes({
        merged_to_main: checklistData.merged_to_main_notes || '',
        final_build_success: checklistData.final_build_success_notes || '',
        env_configured: checklistData.env_configured_notes || '',
        migrations_ready: checklistData.migrations_ready_notes || '',
        dns_verified: checklistData.dns_verified_notes || '',
        ssl_ready: checklistData.ssl_ready_notes || '',
        monitoring_configured: checklistData.monitoring_configured_notes || '',
        rollback_plan: checklistData.rollback_plan_notes || ''
      });

      setStats(statsData);
    } catch (error) {
      console.error('Failed to load checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckItem = async (item: ChecklistItem, checked: boolean) => {
    setUpdating(true);
    try {
      await updateChecklistItem(projectId, helixProcessId, item, checked, notes[item]);
      setChecklist(prev => prev ? { ...prev, [item]: checked } : null);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to update checklist:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleNotesChange = (item: ChecklistItem, value: string) => {
    setNotes(prev => ({ ...prev, [item]: value }));
  };

  const handleSaveNotes = async (item: ChecklistItem) => {
    setUpdating(true);
    try {
      await updateChecklistItem(
        projectId,
        helixProcessId,
        item,
        checklist?.[item] || false,
        notes[item]
      );
      setExpandedItem(null);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteAndProceed = async () => {
    setUpdating(true);
    try {
      await markChecklistComplete(projectId, helixProcessId);
      router.push(`/org/${orgSlug}/project/${projectId}/helix/step/8.2/`);
    } catch (error) {
      console.error('Failed to complete checklist:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading deployment checklist...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prepare for Deployment (Step 8.1)</h1>
          <p className="text-gray-600 mt-1">Pre-deployment checklist and readiness verification</p>
        </div>
        <Link href={`/org/${orgSlug}/project/${projectId}/helix`}>
          <Button variant="outline">Back to Helix</Button>
        </Link>
      </div>

      {/* Progress Section */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Checklist Progress</span>
              <span className="text-2xl font-bold text-blue-600">{stats.percent}%</span>
            </div>
            <Progress value={stats.percent} className="h-3" />
            <p className="text-sm text-gray-600">
              {stats.checked} of {stats.total} items completed
            </p>
          </CardContent>
        </Card>
      )}

      {/* Alert: All Complete */}
      {stats?.all_checked && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Ready for Deployment!</AlertTitle>
          <AlertDescription className="text-green-700">
            All deployment preparation steps are complete. You may proceed to execution.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert: Incomplete */}
      {!stats?.all_checked && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Deployment Preparation Incomplete</AlertTitle>
          <AlertDescription>
            Complete all checklist items before proceeding to deployment execution.
          </AlertDescription>
        </Alert>
      )}

      {/* Checklist Items */}
      <div className="space-y-3">
        {checklistItems.map((item) => (
          <Card
            key={item.key}
            className={`border-2 transition cursor-pointer ${
              expandedItem === item.key ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => setExpandedItem(expandedItem === item.key ? null : item.key)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Checkbox
                  id={item.key}
                  checked={checklist?.[item.key] || false}
                  onCheckedChange={(checked) => {
                    handleCheckItem(item.key, checked as boolean);
                  }}
                  disabled={updating}
                  className="mt-1"
                  onClick={e => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor={item.key} className="font-semibold cursor-pointer">
                    {item.label}
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  {expandedItem === item.key && (
                    <div className="mt-4 space-y-3 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-700 mb-2">{item.details}</p>
                      </div>
                      <Textarea
                        placeholder="Add notes for this checklist item..."
                        value={notes[item.key]}
                        onChange={e => handleNotesChange(item.key, e.target.value)}
                        className="min-h-[80px] text-sm"
                        onClick={e => e.stopPropagation()}
                      />
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveNotes(item.key);
                        }}
                        disabled={updating}
                      >
                        Save Notes
                      </Button>
                    </div>
                  )}
                </div>
                {checklist?.[item.key] && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deployment Readiness Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Requirements Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
            <li>
              <strong>Code Quality:</strong> Merged to main, final build succeeds
            </li>
            <li>
              <strong>Configuration:</strong> Environment variables and database migrations ready
            </li>
            <li>
              <strong>Infrastructure:</strong> DNS verified, SSL certificate in place
            </li>
            <li>
              <strong>Operations:</strong> Monitoring configured, rollback plan documented
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1">
          Save Progress
        </Button>
        <Button
          onClick={handleCompleteAndProceed}
          disabled={!stats?.all_checked || updating}
          className="flex-1 bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {updating ? 'Processing...' : 'Complete & Proceed to Deployment'}
        </Button>
      </div>
    </div>
  );
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/8.1/
├── page.tsx (route handler)
├── components/
│   └── DeploymentPrepChecklist.tsx (checklist component)
/app/actions/helix/
├── deploymentPrep.ts (server actions)
```

## Dependencies

- React hooks: `useState`, `useEffect`
- UI Components: `Card`, `Button`, `Checkbox`, `Input`, `Textarea`, `Label`, `Alert`, `Progress`
- Icons: `lucide-react` (AlertCircle, CheckCircle2, AlertTriangle)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Checklist displays 8 pre-deployment items with descriptions
2. Each item has checkbox and optional notes field
3. Clicking item expands to show detailed guidance and notes textarea
4. Progress bar shows X/8 items completed and percentage
5. Stats display total items and completed count
6. All items must be checked before proceeding
7. "Proceed to Deployment" button disabled until all items checked
8. Clicking item checkbox updates status immediately
9. Notes can be added/edited for each item
10. Completing checklist allows advancement to Step 8.2

## Testing Instructions

1. **Checklist Display:**
   - Navigate to Step 8.1
   - Verify all 8 items display
   - Verify descriptions are clear

2. **Expand Items:**
   - Click on a checklist item
   - Verify item expands
   - Verify detailed guidance displays

3. **Add Notes:**
   - Click item to expand
   - Type notes in textarea
   - Click "Save Notes"
   - Verify notes persist

4. **Check Items:**
   - Click checkbox on item
   - Verify checkbox checked
   - Verify status persisted

5. **Progress Tracking:**
   - Check several items
   - Verify progress bar updates
   - Verify percentage calculates correctly

6. **Button State:**
   - With items unchecked, verify proceed button disabled
   - Check all items
   - Verify proceed button enabled

7. **Proceed to Deployment:**
   - Complete all items
   - Click proceed button
   - Verify navigation to Step 8.2

8. **Notes Persistence:**
   - Add notes to items
   - Refresh page
   - Verify notes persisted

9. **Responsive Design:**
   - Test on mobile
   - Verify checklist readable
   - Verify expand/collapse works

10. **Update Validation:**
    - Update items while another tab is also updating
    - Verify no conflicts or lost updates

## Notes for AI Agent

- Phase 040 is a readiness verification checklist, not a deployment execution
- All 8 items must be completed before proceeding to Step 8.2
- The checklist provides guidance (details field) for each item
- Notes can be used to document actual verification steps taken
- This is the last gate before production deployment
- Consider sending a notification/email when all items are complete
- The checklist should be reviewed thoroughly to prevent production incidents
- Items can be updated after initial completion if issues are found
- The checklist serves as audit documentation of pre-deployment verification
