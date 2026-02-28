# Phase 009 — Step Detail View Component

## Objective
Build a reusable, responsive component for displaying any Helix step's detail page with a dual-panel layout. The left panel presents step instructions and context; the right panel handles evidence submission and status tracking. This component forms the foundation for all individual step implementations throughout the Helix process.

## Prerequisites
- Phase 005 — Step Configuration Schema — required to reference step definitions and instructions
- Phase 008 — Gate Check Engine — required for status validation before marking steps complete
- Phase 006 — Helix Sidebar Navigation — required for navigation context and routing

## Epic Context
**Epic:** 2 — Planning Stage (Steps 1.1–1.3)
**Phase:** 009 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The Step Detail View is the primary UI component users interact with for completing individual Helix steps. Rather than building a unique page for each step, this reusable component provides a standardized interface that adapts to different evidence types and submission requirements. The component must display read-only step instructions (pulled from the step configuration), show the current step status, and provide context-aware evidence submission fields.

The component supports five evidence types (text, file, URL, checklist, manual), each with different input mechanisms. By building this once, all 50+ steps across the Helix process can reuse the same component, ensuring consistent UX and reducing maintenance burden.

---

## Detailed Requirements

### 1. StepDetailView Component (Main Container)
#### File: `components/helix/StepDetailView.tsx` (NEW)
Dual-panel responsive layout with left panel (instructions) and right panel (evidence submission).

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { HelixStep } from '@/types/helix';
import EvidencePanel from './EvidencePanel';
import { getStepConfig } from '@/lib/helix/stepConfig';

interface StepDetailViewProps {
  step: HelixStep;
  stepKey: string;
  onComplete: (evidence: any) => Promise<void>;
  onNavigate: (direction: 'prev' | 'next') => void;
  isLoading?: boolean;
  error?: string;
}

export default function StepDetailView({
  step,
  stepKey,
  onComplete,
  onNavigate,
  isLoading = false,
  error,
}: StepDetailViewProps) {
  const [stepConfig, setStepConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getStepConfig(stepKey);
        setStepConfig(config);
      } catch (err) {
        console.error('Failed to load step config:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, [stepKey]);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-secondary">Loading step details...</div>
      </div>
    );
  }

  if (!stepConfig) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Failed to load step configuration</div>
      </div>
    );
  }

  const isLocked = step.status === 'locked';
  const isComplete = step.status === 'complete';

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {stepConfig.title}
              </h1>
              <p className="text-text-secondary mt-1">
                Step {step.stage_number}.{step.step_number}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isLocked && (
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary rounded-lg">
                  <Lock size={16} className="text-text-secondary" />
                  <span className="text-sm text-text-secondary">Locked</span>
                </div>
              )}
              {isComplete && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span className="text-sm text-green-600">Complete</span>
                </div>
              )}
              {step.status === 'active' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 rounded-lg">
                  <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
                  <span className="text-sm text-accent-cyan">Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Instructions */}
          <div className="lg:col-span-2">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8">
              {/* Actor & Tool Info */}
              <div className="mb-6 pb-6 border-b border-bg-tertiary">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary uppercase tracking-wide">
                      Guided By
                    </p>
                    <p className="text-base font-medium text-text-primary mt-1">
                      {stepConfig.actor === 'both'
                        ? 'Human + Claude'
                        : stepConfig.actor === 'claude'
                        ? 'Claude AI'
                        : 'Human'}
                    </p>
                  </div>
                  {stepConfig.toolReference && (
                    <div>
                      <p className="text-sm text-text-secondary uppercase tracking-wide">
                        Tool
                      </p>
                      <p className="text-base font-medium text-accent-cyan mt-1">
                        {stepConfig.toolReference}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-text-primary mb-3">
                  Overview
                </h2>
                <p className="text-text-secondary leading-relaxed">
                  {stepConfig.description}
                </p>
              </div>

              {/* Instructions */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Instructions
                </h2>
                <div className="space-y-4">
                  {stepConfig.instructions.map(
                    (instruction: string, idx: number) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-accent-cyan">
                            {idx + 1}
                          </span>
                        </div>
                        <p className="text-text-secondary leading-relaxed pt-1">
                          {instruction}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Context Notes */}
              {stepConfig.contextNotes && (
                <div className="mt-8 pt-8 border-t border-bg-tertiary">
                  <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 mb-1">
                        Context
                      </p>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {stepConfig.contextNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Evidence Submission */}
          <div className="lg:col-span-1">
            <EvidencePanel
              step={step}
              stepKey={stepKey}
              evidenceType={stepConfig.evidenceType}
              onComplete={onComplete}
              isLoading={isLoading}
              isLocked={isLocked}
              error={error}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-12 flex justify-between items-center">
          <button
            onClick={() => onNavigate('prev')}
            className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            disabled={isLocked}
          >
            <ChevronLeft size={20} />
            Previous Step
          </button>

          <button
            onClick={() => onNavigate('next')}
            className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            disabled={!isComplete}
          >
            Next Step
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2. EvidencePanel Component (Right Panel)
#### File: `components/helix/EvidencePanel.tsx` (NEW)
Handles evidence submission with type-specific inputs (text, file, URL, checklist).

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { HelixStep } from '@/types/helix';

interface EvidencePanelProps {
  step: HelixStep;
  stepKey: string;
  evidenceType: 'text' | 'file' | 'url' | 'checklist' | 'manual';
  onComplete: (evidence: any) => Promise<void>;
  isLoading?: boolean;
  isLocked?: boolean;
  error?: string;
}

export default function EvidencePanel({
  step,
  stepKey,
  evidenceType,
  onComplete,
  isLoading = false,
  isLocked = false,
  error,
}: EvidencePanelProps) {
  const [evidence, setEvidence] = useState<any>(
    step.evidence_data || null
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isComplete = step.status === 'complete';

  const validateEvidence = useCallback((): boolean => {
    setValidationError(null);

    if (!evidence) {
      setValidationError('Evidence is required to complete this step');
      return false;
    }

    switch (evidenceType) {
      case 'text':
        if (typeof evidence !== 'string' || evidence.trim().length < 50) {
          setValidationError('Text evidence must be at least 50 characters');
          return false;
        }
        break;
      case 'file':
        if (!evidence.fileName || !evidence.fileUrl) {
          setValidationError('File must be uploaded');
          return false;
        }
        break;
      case 'url':
        try {
          new URL(evidence);
        } catch {
          setValidationError('Please enter a valid URL');
          return false;
        }
        break;
      case 'checklist':
        if (!Array.isArray(evidence) || evidence.length === 0) {
          setValidationError('At least one item must be checked');
          return false;
        }
        const allChecked = evidence.every((item) => item.checked);
        if (!allChecked) {
          setValidationError('All items must be checked');
          return false;
        }
        break;
      case 'manual':
        break;
    }

    return true;
  }, [evidence, evidenceType]);

  const handleComplete = async () => {
    if (!validateEvidence()) {
      return;
    }

    try {
      setLocalError(null);
      await onComplete(evidence);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to complete step'
      );
    }
  };

  if (isComplete) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 size={24} className="text-green-600" />
          <h3 className="text-lg font-semibold text-text-primary">
            Step Complete
          </h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Evidence submitted on{' '}
          {step.completed_at
            ? new Date(step.completed_at).toLocaleDateString()
            : 'unknown date'}
        </p>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            This step has been completed. Evidence is stored and can be reviewed
            in the Artifacts section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Submit Evidence
      </h3>

      {isLocked ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              Step is Locked
            </p>
            <p className="text-xs text-yellow-800 mt-1">
              Complete the previous step to unlock this one.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Evidence Type Renderer */}
          <div className="mb-6">
            {evidenceType === 'text' && (
              <TextEvidenceInput
                value={evidence}
                onChange={setEvidence}
                placeholder="Write your response here (minimum 50 characters)..."
              />
            )}

            {evidenceType === 'file' && (
              <FileEvidenceInput
                value={evidence}
                onChange={setEvidence}
                acceptedFormats=".pdf,.docx,.txt,.md"
              />
            )}

            {evidenceType === 'url' && (
              <URLEvidenceInput
                value={evidence}
                onChange={setEvidence}
                placeholder="https://example.com/..."
              />
            )}

            {evidenceType === 'checklist' && (
              <ChecklistEvidenceInput
                value={evidence}
                onChange={setEvidence}
                items={[
                  'Item 1',
                  'Item 2',
                  'Item 3',
                  'Item 4',
                ]}
              />
            )}

            {evidenceType === 'manual' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  This step will be marked as complete after review.
                </p>
              </div>
            )}
          </div>

          {/* Validation Error */}
          {(validationError || localError || error) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-800 mt-1">
                  {validationError || localError || error}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleComplete}
            disabled={isLoading || !evidence}
            className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={20} className="animate-spin" />}
            Mark as Complete
          </button>

          <p className="text-xs text-text-secondary mt-3 text-center">
            Once submitted, evidence cannot be edited.
          </p>
        </>
      )}
    </div>
  );
}

// Evidence Type Input Components

function TextEvidenceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const charCount = value?.length || 0;

  return (
    <div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-64 p-4 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
      />
      <p className={`text-xs mt-2 ${charCount >= 50 ? 'text-green-600' : 'text-text-secondary'}`}>
        {charCount} / 50 characters (minimum)
      </p>
    </div>
  );
}

function FileEvidenceInput({
  value,
  onChange,
  acceptedFormats,
}: {
  value: any;
  onChange: (value: any) => void;
  acceptedFormats: string;
}) {
  const handleFileChange = (file: File) => {
    onChange({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
      // In real implementation, upload to storage and get fileUrl
      fileUrl: URL.createObjectURL(file),
    });
  };

  return (
    <div>
      <div className="border-2 border-dashed border-bg-tertiary rounded-lg p-6 text-center hover:border-accent-cyan transition-colors">
        <input
          type="file"
          accept={acceptedFormats}
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileChange(e.target.files[0]);
            }
          }}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <div className="text-3xl">📁</div>
          <p className="text-sm font-medium text-text-primary">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-text-secondary">
            PDF, DOCX, TXT, or MD files
          </p>
        </label>
      </div>
      {value && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900 font-medium">{value.fileName}</p>
          <p className="text-xs text-green-700 mt-1">
            {(value.fileSize / 1024).toFixed(2)} KB
          </p>
        </div>
      )}
    </div>
  );
}

function URLEvidenceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="url"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
    />
  );
}

function ChecklistEvidenceInput({
  value = [],
  onChange,
  items,
}: {
  value: any[];
  onChange: (value: any[]) => void;
  items: string[];
}) {
  const checklist = value.length > 0 ? value : items.map((item) => ({
    label: item,
    checked: false,
  }));

  const handleToggle = (idx: number) => {
    const updated = [...checklist];
    updated[idx].checked = !updated[idx].checked;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {checklist.map((item, idx) => (
        <label key={idx} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => handleToggle(idx)}
            className="w-5 h-5 rounded border-bg-tertiary"
          />
          <span className={`text-sm ${item.checked ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
            {item.label}
          </span>
        </label>
      ))}
    </div>
  );
}
```

### 3. Step Route Handler
#### File: `app/org/[orgSlug]/project/[projectId]/helix/step/[stepKey]/page.tsx` (NEW)
Next.js page component that integrates StepDetailView with database queries.

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StepDetailView from '@/components/helix/StepDetailView';
import { HelixStep } from '@/types/helix';

interface StepPageProps {
  params: {
    orgSlug: string;
    projectId: string;
    stepKey: string;
  };
}

export default async function StepPage({
  params: { orgSlug, projectId, stepKey },
}: StepPageProps) {
  const supabase = createClient();

  // Verify user has access to this project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    redirect(`/org/${orgSlug}`);
  }

  // Get step data
  const { data: step, error: stepError } = await supabase
    .from('helix_steps')
    .select('*')
    .eq('project_id', projectId)
    .eq('step_key', stepKey)
    .single();

  if (stepError || !step) {
    redirect(`/org/${orgSlug}/project/${projectId}/helix`);
  }

  // Parse step numbers from step_key (e.g., "1-1" -> stage 1, step 1)
  const [stageNum, stepNum] = stepKey.split('-').map(Number);

  return (
    <div>
      <StepDetailView
        step={step as HelixStep}
        stepKey={stepKey}
        onComplete={async (evidence: any) => {
          'use server';

          const supabase = createClient();
          const { error } = await supabase
            .from('helix_steps')
            .update({
              status: 'complete',
              evidence_data: evidence,
              completed_at: new Date().toISOString(),
              completed_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .eq('id', step.id);

          if (error) {
            throw new Error('Failed to save evidence');
          }

          // Create artifact
          await supabase.from('artifacts').insert({
            project_id: projectId,
            type: 'helix_evidence',
            title: `Step ${stageNum}.${stepNum} Evidence`,
            content: evidence,
            metadata: {
              step_key: stepKey,
              evidence_type: step.evidence_type,
            },
          });
        }}
        onNavigate={async (direction: string) => {
          'use server';

          const nextStepKey =
            direction === 'next'
              ? `${stageNum}-${stepNum + 1}`
              : `${stageNum}-${stepNum - 1}`;

          redirect(
            `/org/${orgSlug}/project/${projectId}/helix/step/${nextStepKey}`
          );
        }}
      />
    </div>
  );
}
```

---

## File Structure

```
components/
  helix/
    StepDetailView.tsx (NEW)
    EvidencePanel.tsx (NEW)

app/
  org/
    [orgSlug]/
      project/
        [projectId]/
          helix/
            step/
              [stepKey]/
                page.tsx (NEW)

lib/
  helix/
    stepConfig.ts (referenced, from Phase 005)
```

---

## Dependencies
```json
{
  "lucide-react": "^0.263.1",
  "@supabase/supabase-js": "^2.38.0",
  "next": "^16.0.0"
}
```

---

## Tech Stack for This Phase
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 with CSS variables
- **Components:** React Client Components
- **State:** React useState hooks
- **Icons:** lucide-react

---

## Acceptance Criteria

1. StepDetailView renders with left panel (instructions) and right panel (evidence submission)
2. Step configuration loads from Phase 005 config and displays title, description, instructions, actor type, and tool reference
3. Status indicator correctly displays locked/active/complete state with appropriate styling
4. EvidencePanel supports all five evidence types (text, file, URL, checklist, manual)
5. Text input enforces 50-character minimum validation
6. File upload zone displays with drag-and-drop UI and accepts specified formats
7. Navigation buttons (previous/next) are disabled when appropriate (locked/not complete)
8. Responsive layout stacks to single column on mobile/tablet (< 1024px)
9. Error messages display clearly for validation failures and network errors
10. Completed steps display read-only confirmation with timestamp and disable further edits

---

## Testing Instructions

1. Navigate to `/org/test-org/project/123/helix/step/1-1` and verify page loads
2. Check that step configuration displays (title, instructions numbered 1-4, actor type)
3. Verify left panel is 66% width and right panel is sticky at 34% width on desktop
4. Test text evidence input: type < 50 chars, verify error message; type ≥ 50 chars, verify button enables
5. Test file upload: drag a PDF over zone, verify it highlights; release to upload; verify file details appear
6. Test URL input: enter invalid URL, verify error; enter valid URL, verify button enables
7. Test checklist: toggle items on/off, verify "Mark as Complete" only enables when all checked
8. Click "Mark as Complete" button, verify loading spinner appears, evidence saves to database
9. Refresh page and verify step shows as complete with timestamp and read-only state
10. Test responsive: resize to mobile width, verify layout stacks correctly and sticky panel reflows

---

## Notes for the AI Agent

- The component must be fully client-side interactive except for the server actions (onComplete, onNavigate)
- All step configuration is read-only on the left panel; only the right panel accepts user input
- The StepDetailView is reused for ALL steps throughout the Helix process — keep it generic and data-driven
- Evidence submission is the critical path; validation is strict to ensure quality of evidence
- File uploads in this MVP will use Supabase Storage (implement in Phase 010+)
- The "manual" evidence type is a placeholder for steps that require manual review (future admin features)
- Sticky positioning on the right panel must account for the header height (adjust top value if header changes)
- Do NOT implement auto-save for evidence inputs; users must explicitly click "Mark as Complete"
