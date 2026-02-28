# Phase 010 — Step 1.1: Define Project Idea

## Objective
Implement the first Helix step (1.1) where users define their project idea using a rich text editor (TipTap). The step guides users through a structured format capturing project name, problem statement, target users, and optional vision. Evidence is auto-saved with debounce and stored both as step evidence and as an Artifact.

## Prerequisites
- Phase 009 — Step Detail View Component — required as the parent component framework
- Phase 005 — Step Configuration Schema — required for step 1.1 metadata and instructions
- Phase 004 — Artifact System Enhancement — required to create Artifact entries
- Phase 008 — Gate Check Engine — required to validate completion and unlock Step 1.2

## Epic Context
**Epic:** 2 — Planning Stage (Steps 1.1–1.3)
**Phase:** 010 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Step 1.1 is the entry point to the entire Helix Planning stage. Users must articulate their project idea in structured form before proceeding. Rather than a free-text area, this step uses a rich text editor (TipTap) to allow formatted text while maintaining a clean, professional output. The component enforces a minimum of 50 characters and auto-saves to provide a frictionless experience. Once the user marks the step complete, the project idea becomes locked and an Artifact entry is created for archival and future reference.

This step is critical because the project idea becomes the foundation for the brainstorming phase (Step 1.2) and all subsequent documentation phases. A clear, well-articulated idea ensures higher quality outputs downstream.

---

## Detailed Requirements

### 1. Step 1.1 Page Component
#### File: `app/org/[orgSlug]/project/[projectId]/helix/step/1-1/page.tsx` (NEW)
Page component that renders Step 1.1 using StepDetailView with a custom evidence input.

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StepDetailView from '@/components/helix/StepDetailView';
import Step1_1Content from '@/components/helix/steps/Step1_1Content';
import { HelixStep } from '@/types/helix';

interface Step1_1PageProps {
  params: {
    orgSlug: string;
    projectId: string;
  };
}

export default async function Step1_1Page({
  params: { orgSlug, projectId },
}: Step1_1PageProps) {
  const supabase = createClient();

  // Verify project access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    redirect(`/org/${orgSlug}`);
  }

  // Get or create Step 1.1
  let { data: step, error: stepError } = await supabase
    .from('helix_steps')
    .select('*')
    .eq('project_id', projectId)
    .eq('step_key', '1-1')
    .single();

  if (stepError || !step) {
    // Create step if it doesn't exist
    const { data: newStep, error: createError } = await supabase
      .from('helix_steps')
      .insert({
        project_id: projectId,
        stage_number: 1,
        step_number: 1,
        step_key: '1-1',
        status: 'active', // First step is always active
        evidence_type: 'text',
        evidence_data: null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create step:', createError);
      redirect(`/org/${orgSlug}/project/${projectId}/helix`);
    }

    step = newStep as HelixStep;
  }

  return (
    <Step1_1Content
      step={step as HelixStep}
      projectId={projectId}
      orgSlug={orgSlug}
    />
  );
}
```

### 2. Step 1.1 Content Component
#### File: `components/helix/steps/Step1_1Content.tsx` (NEW)
Rich text editor component for project idea with structured fields and auto-save.

```typescript
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { HelixStep } from '@/types/helix';
import StepDetailView from '../StepDetailView';
import { completeHelixStep } from '@/lib/helix/actions';
import { debounce } from '@/lib/utils/debounce';

interface Step1_1ContentProps {
  step: HelixStep;
  projectId: string;
  orgSlug: string;
}

interface ProjectIdea {
  projectName: string;
  problemStatement: string;
  targetUsers: string;
  vision?: string;
  ideaText: string;
}

export default function Step1_1Content({
  step,
  projectId,
  orgSlug,
}: Step1_1ContentProps) {
  const [formData, setFormData] = useState<ProjectIdea>(() => {
    if (step.evidence_data && typeof step.evidence_data === 'object') {
      return step.evidence_data as ProjectIdea;
    }
    return {
      projectName: '',
      problemStatement: '',
      targetUsers: '',
      vision: '',
      ideaText: '',
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // TipTap editor for the full project idea text
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your complete project idea here...',
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: formData.ideaText || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setFormData((prev) => ({
        ...prev,
        ideaText: html,
      }));
    },
  });

  // Auto-save with debounce
  const debouncedAutoSave = useCallback(
    debounce(async (data: ProjectIdea) => {
      if (
        !data.projectName ||
        !data.problemStatement ||
        !data.targetUsers ||
        !data.ideaText
      ) {
        return; // Don't save incomplete data
      }

      try {
        setSaveStatus('saving');
        const response = await fetch(
          `/api/helix/projects/${projectId}/steps/1-1/auto-save`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to auto-save');
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('idle');
      }
    }, 2000),
    [projectId]
  );

  // Trigger auto-save on form changes
  useEffect(() => {
    if (step.status !== 'complete') {
      debouncedAutoSave(formData);
    }
  }, [formData, debouncedAutoSave, step.status]);

  const validateForm = useCallback((): boolean => {
    setValidationError(null);

    if (!formData.projectName.trim()) {
      setValidationError('Project name is required');
      return false;
    }

    if (!formData.problemStatement.trim()) {
      setValidationError('Problem statement is required');
      return false;
    }

    if (!formData.targetUsers.trim()) {
      setValidationError('Target users must be described');
      return false;
    }

    if (!formData.ideaText.trim() || formData.ideaText.length < 50) {
      setValidationError(
        'Project idea must be at least 50 characters long'
      );
      return false;
    }

    return true;
  }, [formData]);

  const handleComplete = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      // Save as step evidence and artifact
      await completeHelixStep(
        projectId,
        '1-1',
        formData,
        'Project Idea Definition'
      );

      // Step will be marked complete and unlocks 1.2
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Failed to complete step'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (step.status === 'complete') {
    // Show read-only view for completed step
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-text-primary">
              1.1 — Define Project Idea
            </h1>
            <p className="text-text-secondary mt-1">Step 1.1</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 size={24} className="text-green-600" />
                  <h2 className="text-xl font-semibold text-text-primary">
                    Completed
                  </h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-text-secondary uppercase tracking-wide mb-2">
                      Project Name
                    </p>
                    <p className="text-lg font-medium text-text-primary">
                      {formData.projectName}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-text-secondary uppercase tracking-wide mb-2">
                      Problem Statement
                    </p>
                    <p className="text-text-secondary leading-relaxed">
                      {formData.problemStatement}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-text-secondary uppercase tracking-wide mb-2">
                      Target Users
                    </p>
                    <p className="text-text-secondary leading-relaxed">
                      {formData.targetUsers}
                    </p>
                  </div>

                  {formData.vision && (
                    <div>
                      <p className="text-sm text-text-secondary uppercase tracking-wide mb-2">
                        Vision
                      </p>
                      <p className="text-text-secondary leading-relaxed">
                        {formData.vision}
                      </p>
                    </div>
                  )}

                  <div className="pt-6 border-t border-bg-tertiary">
                    <p className="text-sm text-text-secondary uppercase tracking-wide mb-3">
                      Project Idea
                    </p>
                    <div className="prose prose-sm max-w-none text-text-secondary">
                      {/* Render ideaText as HTML */}
                      <div
                        dangerouslySetInnerHTML={{ __html: formData.ideaText }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-900">
                    Completed on{' '}
                    {step.completed_at
                      ? new Date(step.completed_at).toLocaleDateString()
                      : 'unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Next Steps
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Step 1.1 is complete. The project idea has been saved as an artifact.
                </p>
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/1-2`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Continue to Step 1.2
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-text-primary">
            1.1 — Define Project Idea
          </h1>
          <p className="text-text-secondary mt-1">Step 1 of 3 — Planning Stage</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8 space-y-8">
              {/* Instructions */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Instructions
                </h2>
                <ol className="space-y-3">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      1
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Give your project a clear, concise name
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      2
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Define the problem your project solves
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      3
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Describe who your target users are
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      4
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Write your complete project idea in the text editor
                    </span>
                  </li>
                </ol>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        projectName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Task Management App"
                    className="w-full px-4 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    {formData.projectName.length > 0 ? formData.projectName.length : 0} characters
                  </p>
                </div>

                {/* Problem Statement */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Problem Statement *
                  </label>
                  <textarea
                    value={formData.problemStatement}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        problemStatement: e.target.value,
                      }))
                    }
                    placeholder="What problem does this project solve?"
                    className="w-full h-32 px-4 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                  />
                </div>

                {/* Target Users */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Target Users *
                  </label>
                  <textarea
                    value={formData.targetUsers}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        targetUsers: e.target.value,
                      }))
                    }
                    placeholder="Who will use this project? Describe your target audience."
                    className="w-full h-32 px-4 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                  />
                </div>

                {/* Vision (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Vision (Optional)
                  </label>
                  <textarea
                    value={formData.vision || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vision: e.target.value,
                      }))
                    }
                    placeholder="What is the long-term vision for this project?"
                    className="w-full h-24 px-4 py-2 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                  />
                </div>

                {/* Rich Text Editor */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Project Idea *
                  </label>
                  <p className="text-xs text-text-secondary mb-3">
                    Write your complete project idea. Minimum 50 characters.
                  </p>
                  <div className="border border-bg-tertiary rounded-lg overflow-hidden">
                    <div className="bg-bg-primary border-b border-bg-tertiary p-3 flex gap-2">
                      <button
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          editor?.isActive('bold')
                            ? 'bg-accent-cyan text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                        }`}
                      >
                        B
                      </button>
                      <button
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          editor?.isActive('italic')
                            ? 'bg-accent-cyan text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                        }`}
                      >
                        I
                      </button>
                      <div className="w-px bg-bg-tertiary" />
                      <button
                        onClick={() =>
                          editor?.chain().focus().toggleBulletList().run()
                        }
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          editor?.isActive('bulletList')
                            ? 'bg-accent-cyan text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                        }`}
                      >
                        • List
                      </button>
                    </div>
                    <EditorContent
                      editor={editor}
                      className="prose prose-sm max-w-none p-4 bg-bg-primary min-h-64 focus-within:outline-none"
                    />
                  </div>
                  <p className={`text-xs mt-2 ${
                    formData.ideaText.length >= 50
                      ? 'text-green-600'
                      : 'text-text-secondary'
                  }`}>
                    {formData.ideaText.length} / 50 characters (minimum)
                  </p>
                </div>
              </div>

              {/* Auto-Save Status */}
              {saveStatus !== 'idle' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  saveStatus === 'saving'
                    ? 'bg-blue-50 text-blue-800'
                    : 'bg-green-50 text-green-800'
                }`}>
                  {saveStatus === 'saving' && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {saveStatus === 'saved' && (
                    <CheckCircle2 size={16} />
                  )}
                  <p className="text-sm font-medium">
                    {saveStatus === 'saving'
                      ? 'Saving...'
                      : 'Saved'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Mark as Complete
              </h3>

              {validationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{validationError}</p>
                </div>
              )}

              <p className="text-sm text-text-secondary mb-4">
                Complete all fields above, then click the button to save your project idea and unlock Step 1.2.
              </p>

              <button
                onClick={handleComplete}
                disabled={
                  isSaving ||
                  !formData.projectName ||
                  !formData.problemStatement ||
                  !formData.targetUsers ||
                  formData.ideaText.length < 50
                }
                className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                Mark as Complete
              </button>

              <p className="text-xs text-text-secondary mt-3 text-center">
                Once submitted, your project idea cannot be edited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. API Route for Auto-Save
#### File: `app/api/helix/projects/[projectId]/steps/1-1/auto-save/route.ts` (NEW)
Server-side auto-save endpoint for form data.

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const data = await request.json();

    // Update helix_steps with evidence_data (without marking complete)
    const { error } = await supabase
      .from('helix_steps')
      .update({
        evidence_data: data,
      })
      .eq('project_id', params.projectId)
      .eq('step_key', '1-1');

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auto-save error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-save' },
      { status: 500 }
    );
  }
}
```

### 4. Server Action for Completion
#### File: `lib/helix/actions.ts` (NEW)
Server-side actions for completing Helix steps and creating artifacts.

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function completeHelixStep(
  projectId: string,
  stepKey: string,
  evidence: any,
  artifactTitle: string
) {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Update step as complete
  const { data: step, error: stepError } = await supabase
    .from('helix_steps')
    .update({
      status: 'complete',
      evidence_data: evidence,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq('project_id', projectId)
    .eq('step_key', stepKey)
    .select()
    .single();

  if (stepError) {
    throw new Error('Failed to complete step');
  }

  // Create artifact for the evidence
  const { error: artifactError } = await supabase
    .from('artifacts')
    .insert({
      project_id: projectId,
      type: 'helix_evidence',
      title: artifactTitle,
      content: JSON.stringify(evidence),
      metadata: {
        step_key: stepKey,
        evidence_type: 'text',
      },
    });

  if (artifactError) {
    console.error('Failed to create artifact:', artifactError);
    // Don't throw — artifact creation is non-critical
  }

  // Unlock next step
  const [stageNum, stepNum] = stepKey.split('-').map(Number);
  const nextStepKey = `${stageNum}-${stepNum + 1}`;

  const { error: unlockError } = await supabase
    .from('helix_steps')
    .update({ status: 'active' })
    .eq('project_id', projectId)
    .eq('step_key', nextStepKey);

  if (unlockError) {
    console.error('Failed to unlock next step:', unlockError);
  }

  // Revalidate the project pages
  revalidatePath(`/org/*/project/${projectId}/helix`);
  revalidatePath(`/org/*/project/${projectId}/helix/step/*`);
}
```

### 5. Debounce Utility
#### File: `lib/utils/debounce.ts` (NEW)
Debounce utility for auto-save.

```typescript
export function debounce<T extends any[]>(
  func: (...args: T) => void | Promise<void>,
  wait: number
) {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: T) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}
```

---

## File Structure

```
app/
  org/
    [orgSlug]/
      project/
        [projectId]/
          helix/
            step/
              1-1/
                page.tsx (NEW)
  api/
    helix/
      projects/
        [projectId]/
          steps/
            1-1/
              auto-save/
                route.ts (NEW)

components/
  helix/
    steps/
      Step1_1Content.tsx (NEW)
    StepDetailView.tsx (from Phase 009)

lib/
  helix/
    actions.ts (NEW)
  utils/
    debounce.ts (NEW)

types/
  helix.ts (references HelixStep)
```

---

## Dependencies
```json
{
  "@tiptap/react": "^2.1.0",
  "@tiptap/starter-kit": "^2.1.0",
  "@tiptap/extension-placeholder": "^2.1.0",
  "@tiptap/extension-link": "^2.1.0",
  "lucide-react": "^0.263.1",
  "@supabase/supabase-js": "^2.38.0",
  "next": "^16.0.0"
}
```

---

## Tech Stack for This Phase
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Rich Text Editor:** TipTap
- **Styling:** Tailwind CSS v4
- **State Management:** React useState
- **Database:** Supabase
- **Icons:** lucide-react

---

## Acceptance Criteria

1. Step 1.1 page loads and displays all form fields (name, problem, users, vision, idea text)
2. Project name, problem statement, and target users inputs accept text and display character counts
3. TipTap editor loads with bold/italic/list toolbar buttons and accepts formatted text
4. Form data auto-saves to database every 2 seconds after changes (debounce)
5. Auto-save only triggers if required fields are filled and idea text is ≥ 50 characters
6. "Mark as Complete" button is disabled until all required fields are filled and idea is ≥ 50 characters
7. Clicking "Mark as Complete" saves evidence, creates Artifact, marks step complete, and unlocks Step 1.2
8. After completion, page switches to read-only view showing all fields and "Continue to Step 1.2" button
9. Artifact is created with title "Project Idea Definition" and stored in artifacts table
10. Completed step persists on page reload with all evidence displayed correctly

---

## Testing Instructions

1. Navigate to `/org/test-org/project/123/helix/step/1-1` and verify page loads
2. Fill in project name field, wait 2 seconds, refresh page, verify name persists
3. Fill in all required fields, verify character counts display
4. Type fewer than 50 characters in idea text, verify "Mark as Complete" button is disabled
5. Type 50+ characters in idea text, verify button becomes enabled
6. Click "Mark as Complete", verify loading spinner appears and step status changes to complete
7. Verify artifact is created: check artifacts table in database
8. Refresh page and verify step displays as completed with read-only view
9. Verify "Continue to Step 1.2" button appears and navigates correctly
10. Open developer console, fill form multiple times rapidly, verify network tab shows only debounced requests (not every keystroke)

---

## Notes for the AI Agent

- TipTap editor initialization must happen in useEffect after client hydration
- The form data structure (ProjectIdea) must persist in evidence_data as JSON
- Auto-save endpoint does NOT mark step complete; only user action on "Mark as Complete" button does
- The ideaText field stores full HTML from TipTap; this can be rendered with dangerouslySetInnerHTML on read-only view
- Debounce should prevent auto-save on every keystroke; 2000ms (2 seconds) is appropriate to feel responsive without excessive requests
- Once step is marked complete, all inputs should be disabled and set to read-only
- The artifact creation is non-critical (use comment: don't throw if artifact fails, but log the error)
- Vision field is optional; others are required
- Ensure Step 1.1 is always 'active' on first creation (don't let it stay 'locked')
