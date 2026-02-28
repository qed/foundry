# Phase 035: Build Phase Completion Flow

**Status:** Build Stage (Step 6.1) | **Phase Number:** 035 | **Epic:** 5

## Objective

Implement a structured completion flow that captures comprehensive evidence when marking a build phase as "built". This phase ensures that all build work is properly documented with required and optional evidence fields, validates the commit hash, and triggers automatic advancement to the next phase.

## Prerequisites

- Phase 034 complete: Individual phase card functional with "Mark as Built" button
- Route `/org/[orgSlug]/project/[projectId]/helix/phase/[phaseId]/complete` available
- helix_build_phases table with evidence_data JSONB field
- Commit hash validation utilities available

## Epic Context (Epic 5)

Phase 035 represents the critical handoff point between active build work and testing/deployment. By capturing structured evidence (commit hash, description, test results, issues), the system creates an audit trail of what was built and enables traceability throughout the rest of the Helix process. This completion flow is a hard gate—phases cannot advance without meeting requirements.

## Context

When a developer completes building a phase, they need to record:
1. **Required:** Commit hash (proof that code was committed)
2. **Required:** Description of what was built (minimum 50 chars)
3. **Optional:** Test results summary
4. **Optional:** Notes/issues encountered
5. **Optional:** Screenshot evidence

After submission, the phase transitions to "built" status and the user is automatically advanced to the next phase or returned to the overview.

## Detailed Requirements with Code

### 1. Completion Flow Route Handler

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/phase/[phaseId]/complete/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import BuildPhaseCompletionForm from './components/BuildPhaseCompletionForm';

interface PageParams {
  params: Promise<{
    orgSlug: string;
    projectId: string;
    phaseId: string;
  }>;
}

export default async function PhaseCompletionPage({ params }: PageParams) {
  const { orgSlug, projectId, phaseId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  // Verify project access
  const { data: project } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single();

  if (!project || project.org_id !== user.org_id) {
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

  // Verify phase is in_progress
  if (phase.status !== 'in_progress') {
    return notFound();
  }

  // Fetch next phase for auto-advance
  const { data: nextPhase } = await supabase
    .from('helix_build_phases')
    .select('id, phase_number')
    .eq('project_id', projectId)
    .eq('helix_process_id', phase.helix_process_id)
    .gt('phase_number', phase.phase_number)
    .order('phase_number', { ascending: true })
    .limit(1)
    .single();

  return (
    <BuildPhaseCompletionForm
      phase={phase}
      projectId={projectId}
      orgSlug={orgSlug}
      nextPhaseId={nextPhase?.id}
      nextPhaseNumber={nextPhase?.phase_number}
    />
  );
}
```

### 2. Server Actions for Completion

Create `/app/actions/helix/phaseCompletion.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

interface CompletionData {
  commitHash: string;
  description: string;
  testResultsSummary?: string;
  notes?: string;
  screenshotUrl?: string;
}

// Validate commit hash format (SHA-1: 40 hex chars, or partial for git short hash)
function validateCommitHash(hash: string): boolean {
  return /^[a-f0-9]{7,40}$/i.test(hash.trim());
}

// Validate description length
function validateDescription(desc: string): boolean {
  return desc.trim().length >= 50;
}

export async function completeBuildPhase(
  phaseId: string,
  projectId: string,
  data: CompletionData
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Validation
  if (!validateCommitHash(data.commitHash)) {
    throw new Error('Invalid commit hash format (expected 7-40 hex characters)');
  }

  if (!validateDescription(data.description)) {
    throw new Error('Description must be at least 50 characters');
  }

  // Fetch phase
  const { data: phase, error: fetchError } = await supabase
    .from('helix_build_phases')
    .select('*')
    .eq('id', phaseId)
    .eq('project_id', projectId)
    .single();

  if (fetchError || !phase) {
    throw new Error('Phase not found');
  }

  if (phase.status !== 'in_progress') {
    throw new Error('Phase is not in progress');
  }

  // Build evidence object
  const evidence = {
    commit_hash: data.commitHash.trim(),
    description: data.description.trim(),
    test_results_summary: data.testResultsSummary?.trim(),
    notes: data.notes?.trim(),
    screenshot_url: data.screenshotUrl,
    completed_by: user.id,
    completed_at: new Date().toISOString(),
    form_version: '1.0'
  };

  // Update phase
  const { error: updateError } = await supabase
    .from('helix_build_phases')
    .update({
      status: 'built',
      commit_hash: data.commitHash.trim(),
      build_notes: data.description.trim(),
      evidence_data: evidence,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', phaseId);

  if (updateError) {
    throw new Error(`Failed to complete phase: ${updateError.message}`);
  }

  return {
    success: true,
    phaseId,
    status: 'built',
    evidence
  };
}

export async function getNextPhaseForAutoAdvance(
  projectId: string,
  helixProcessId: string,
  currentPhaseNumber: number
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { data: nextPhase, error } = await supabase
    .from('helix_build_phases')
    .select('id, phase_number, title, status')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .gt('phase_number', currentPhaseNumber)
    .eq('status', 'not_started')
    .order('phase_number', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    return null; // No more not_started phases
  }

  return nextPhase;
}

export async function autoAdvanceToNextPhase(
  projectId: string,
  helixProcessId: string,
  currentPhaseNumber: number
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Find next not_started phase
  const nextPhase = await getNextPhaseForAutoAdvance(
    projectId,
    helixProcessId,
    currentPhaseNumber
  );

  if (!nextPhase) {
    return null; // No more phases to advance to
  }

  // Mark it as in_progress
  const { error } = await supabase
    .from('helix_build_phases')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', nextPhase.id);

  if (error) {
    throw new Error(`Failed to advance to next phase: ${error.message}`);
  }

  return nextPhase;
}
```

### 3. React Component: Completion Form

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/phase/[phaseId]/complete/components/BuildPhaseCompletionForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import {
  completeBuildPhase,
  autoAdvanceToNextPhase
} from '@/app/actions/helix/phaseCompletion';

interface BuildPhaseCompletionFormProps {
  phase: any;
  projectId: string;
  orgSlug: string;
  nextPhaseId?: string;
  nextPhaseNumber?: number;
}

export default function BuildPhaseCompletionForm({
  phase,
  projectId,
  orgSlug,
  nextPhaseId,
  nextPhaseNumber
}: BuildPhaseCompletionFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    commitHash: '',
    description: '',
    testResultsSummary: '',
    notes: '',
    screenshotUrl: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Track form validity
  const isValid =
    formData.commitHash.trim().length >= 7 &&
    formData.description.trim().length >= 50;

  const descriptionChars = formData.description.trim().length;
  const descriptionPercentage = Math.min((descriptionChars / 50) * 100, 100);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Submit completion
      await completeBuildPhase(phase.id, projectId, formData);
      setSuccess(true);

      // Auto-advance to next phase
      if (nextPhaseId) {
        try {
          await autoAdvanceToNextPhase(
            projectId,
            phase.helix_process_id,
            phase.phase_number
          );
        } catch (error) {
          console.warn('Auto-advance failed (continuing anyway):', error);
        }
      }

      // Redirect after success
      setTimeout(() => {
        router.push(`/org/${orgSlug}/project/${projectId}/helix/step/6.1/`);
      }, 2000);
    } catch (error: any) {
      if (error.message.includes('commit hash')) {
        setErrors(prev => ({ ...prev, commitHash: error.message }));
      } else if (error.message.includes('Description')) {
        setErrors(prev => ({ ...prev, description: error.message }));
      } else {
        setErrors(prev => ({ ...prev, submit: error.message }));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <div>
                <h2 className="text-2xl font-bold text-green-900">Phase Complete!</h2>
                <p className="text-green-700 mt-1">
                  Phase {phase.phase_number}: {phase.title}
                </p>
                {nextPhaseNumber && (
                  <p className="text-sm text-green-600 mt-2">
                    Auto-advancing to Phase {nextPhaseNumber}...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Evidence Recorded:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Commit Hash: {formData.commitHash}</li>
                <li>✓ Description: {formData.description.substring(0, 50)}...</li>
                {formData.testResultsSummary && (
                  <li>✓ Test Results: {formData.testResultsSummary.substring(0, 50)}...</li>
                )}
                {formData.notes && <li>✓ Notes: {formData.notes.substring(0, 50)}...</li>}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href={`/org/${orgSlug}/project/${projectId}/helix/step/6.1/`}>
            <Button className="w-full">Return to Overview</Button>
          </Link>
          {nextPhaseId && (
            <Link href={`/org/${orgSlug}/project/${projectId}/helix/phase/${nextPhaseId}`}>
              <Button variant="outline" className="w-full">
                Go to Next Phase <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Complete Build Phase</h1>
        <p className="text-gray-600 mt-1">
          Phase {phase.phase_number}: {phase.title}
        </p>
      </div>

      {/* Error Alert */}
      {errors.submit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.submit}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Required Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Commit Hash */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="commitHash" className="text-base font-semibold">
                  Commit Hash *
                </Label>
                <span className="text-xs text-gray-500">
                  {formData.commitHash.length ? `${formData.commitHash.length} chars` : ''}
                </span>
              </div>
              <Input
                id="commitHash"
                placeholder="e.g., a1b2c3d or a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
                value={formData.commitHash}
                onChange={e => handleChange('commitHash', e.target.value)}
                className={errors.commitHash ? 'border-red-500' : ''}
              />
              {errors.commitHash && (
                <p className="text-sm text-red-600">{errors.commitHash}</p>
              )}
              <p className="text-xs text-gray-500">
                Git commit SHA (7-40 hex characters)
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-base font-semibold">
                  What Was Built? *
                </Label>
                <span className={`text-xs ${descriptionChars >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                  {descriptionChars}/50 min
                </span>
              </div>
              <Textarea
                id="description"
                placeholder="Describe what you built in this phase. Include key features, changes, and accomplishments."
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                className={`min-h-[120px] ${errors.description ? 'border-red-500' : ''}`}
              />
              {/* Progress bar for character count */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    descriptionChars >= 50 ? 'bg-green-600' : 'bg-orange-600'
                  }`}
                  style={{ width: `${descriptionPercentage}%` }}
                />
              </div>
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Optional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Optional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Results Summary */}
            <div className="space-y-2">
              <Label htmlFor="testResults" className="text-base font-semibold">
                Test Results Summary
              </Label>
              <Textarea
                id="testResults"
                placeholder="Summary of any testing performed on this phase (e.g., 'Unit tests passed: 45/45', 'Manual testing: Login flow verified')"
                value={formData.testResultsSummary}
                onChange={e => handleChange('testResultsSummary', e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base font-semibold">
                Notes / Issues Encountered
              </Label>
              <Textarea
                id="notes"
                placeholder="Any issues encountered, workarounds applied, or notes for the team"
                value={formData.notes}
                onChange={e => handleChange('notes', e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Screenshot URL */}
            <div className="space-y-2">
              <Label htmlFor="screenshot" className="text-base font-semibold">
                Screenshot URL
              </Label>
              <Input
                id="screenshot"
                type="url"
                placeholder="https://example.com/screenshot.png"
                value={formData.screenshotUrl}
                onChange={e => handleChange('screenshotUrl', e.target.value)}
              />
              <p className="text-xs text-gray-500">
                URL to a screenshot showing the completed work
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link href={`/org/${orgSlug}/project/${projectId}/helix/phase/${phase.id}`}>
            <Button type="button" variant="outline" className="flex-1">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={!isValid || loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Completing...' : 'Mark Phase as Built'}
          </Button>
        </div>
      </form>

      {/* Info Alert */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>What happens next:</strong> This phase will be marked as "built" and moved to the
          testing queue. If there are more phases, the next one will automatically start. Your
          evidence is recorded for audit and traceability.
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

### 4. Utility: Commit Hash Validation

Create `/lib/helix/validation.ts`:

```typescript
export const commitHashRegex = /^[a-f0-9]{7,40}$/i;

export function isValidCommitHash(hash: string): boolean {
  return commitHashRegex.test(hash.trim());
}

export function validateCommitHashFormatted(hash: string): { valid: boolean; error?: string } {
  const trimmed = hash.trim();
  if (!trimmed) {
    return { valid: false, error: 'Commit hash required' };
  }
  if (trimmed.length < 7) {
    return { valid: false, error: 'Commit hash too short (minimum 7 characters)' };
  }
  if (trimmed.length > 40) {
    return { valid: false, error: 'Commit hash too long (maximum 40 characters)' };
  }
  if (!commitHashRegex.test(trimmed)) {
    return { valid: false, error: 'Commit hash must be hexadecimal characters' };
  }
  return { valid: true };
}

export function isValidDescription(desc: string): boolean {
  return desc.trim().length >= 50;
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/phase/[phaseId]/complete/
├── page.tsx (route handler)
├── components/
│   └── BuildPhaseCompletionForm.tsx (form component)
/app/actions/helix/
├── phaseCompletion.ts (server actions)
/lib/helix/
├── validation.ts (validation utilities)
```

## Dependencies

- React hooks: `useState`, `useRouter`
- Next.js 16+ navigation
- UI Components: `Card`, `Button`, `Input`, `Textarea`, `Label`, `Alert`
- Icons: `lucide-react` (CheckCircle2, AlertCircle, ArrowRight)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL, TypeScript
- **Validation:** Custom regex and utility functions
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Form requires commit hash (7-40 hex characters) with validation
2. Form requires description with minimum 50 character validation
3. Description character counter shows progress (0-50, then 50+)
4. Test results and notes fields optional but collected when provided
5. Screenshot URL field accepts valid URLs
6. Submit button disabled until required fields valid
7. On successful submit, phase status changes to 'built'
8. Evidence saved to helix_build_phases.evidence_data JSONB
9. Auto-advance triggers next not_started phase to in_progress
10. Success view shows completion confirmation and next phase info

## Testing Instructions

1. **Validation - Commit Hash:**
   - Try submitting without commit hash (error)
   - Try hash < 7 chars (error)
   - Try hash > 40 chars (error)
   - Try non-hex characters (error)
   - Try valid hash (7-40 hex) (success)

2. **Validation - Description:**
   - Try submitting without description (error)
   - Try description < 50 chars (error)
   - Watch character counter update in real-time
   - Try valid description (success)

3. **Character Counter:**
   - Type in description field
   - Verify counter increments
   - Verify progress bar fills as minimum met
   - Verify color change at 50 chars

4. **Optional Fields:**
   - Submit without test results, notes, screenshot (success)
   - Submit with all optional fields (success)
   - Verify optional data saved to evidence_data

5. **Auto-Advance:**
   - Complete a phase with next not_started phase available
   - Verify next phase auto-marked as in_progress
   - Check next phase started_at timestamp set

6. **Success Flow:**
   - Submit valid form
   - Verify success view displays
   - Verify evidence summary shown
   - Verify "Return to Overview" button works
   - Verify "Go to Next Phase" button visible if next phase exists

7. **Error Handling:**
   - Mock server error during submit
   - Verify error displayed
   - Verify form data preserved

8. **Responsive Design:**
   - Test on mobile
   - Verify form readable
   - Verify all fields accessible

9. **Persistence:**
   - Complete phase
   - Navigate away and back
   - Verify phase status changed to 'built'
   - Verify evidence persisted

10. **Edge Cases:**
    - Complete last phase (no next phase)
    - Verify no auto-advance
    - Verify success message adjusted

## Notes for AI Agent

- This phase implements a critical gate in the build process
- Evidence is captured in a structured JSONB format with metadata (completed_by, completed_at, form_version)
- Commit hash format follows Git's short SHA format (7 chars minimum, 40 full SHA)
- Description requirement (50 chars) ensures meaningful documentation
- Auto-advance only triggers if there's a not_started phase available
- If auto-advance fails, completion still succeeds (fail-safe design)
- The completion form is accessed only if phase.status === 'in_progress'
- All evidence is immutable once saved (no edit after completion)
- Always verify user authorization before allowing completion
- The success view auto-redirects after 2 seconds to prevent user getting stuck
