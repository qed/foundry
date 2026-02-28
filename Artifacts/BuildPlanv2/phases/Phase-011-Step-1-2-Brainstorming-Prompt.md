# Phase 011 — Step 1.2: Brainstorming Prompt (Manual MVP)

## Objective
Implement Step 1.2 where users copy a pre-built Helix Brainstorming Prompt, run a 4-phase AI process with Claude Chat, and then paste or upload the resulting Project Brief back into Foundry. This step is manual (users execute the prompt externally) but Foundry guides the workflow and captures the output.

## Prerequisites
- Phase 009 — Step Detail View Component — required as parent framework
- Phase 005 — Step Configuration Schema — required for step 1.2 metadata and prompt template
- Phase 010 — Step 1.1 Completion — Step 1.2 is unlocked only after Step 1.1 is complete
- Phase 008 — Gate Check Engine — required to enforce 1.1 must be complete before accessing 1.2

## Epic Context
**Epic:** 2 — Planning Stage (Steps 1.1–1.3)
**Phase:** 011 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Step 1.2 is the brainstorming phase where users leverage Claude AI to expand on their project idea. Rather than building custom AI integration, this MVP guides users to copy a prompt, run it in Claude Chat externally, and then paste back the results. This approach is simpler, allows users to iterate interactively with Claude, and avoids dependency on the v1 API infrastructure.

The step displays the Brainstorming Prompt template (populated with the project idea from Step 1.1), provides a one-click copy button, and then accepts the resulting output via paste or file upload. This creates a clear handoff pattern that users find intuitive and maintainable.

---

## Detailed Requirements

### 1. Step 1.2 Page Component
#### File: `app/org/[orgSlug]/project/[projectId]/helix/step/1-2/page.tsx` (NEW)
Page component for Step 1.2 brainstorming prompt.

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Step1_2Content from '@/components/helix/steps/Step1_2Content';
import { HelixStep } from '@/types/helix';

interface Step1_2PageProps {
  params: {
    orgSlug: string;
    projectId: string;
  };
}

export default async function Step1_2Page({
  params: { orgSlug, projectId },
}: Step1_2PageProps) {
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

  // Verify Step 1.1 is complete (gate check)
  const { data: step1_1 } = await supabase
    .from('helix_steps')
    .select('status, evidence_data')
    .eq('project_id', projectId)
    .eq('step_key', '1-1')
    .single();

  if (!step1_1 || step1_1.status !== 'complete') {
    // Redirect back to Step 1.1 if not completed
    redirect(`/org/${orgSlug}/project/${projectId}/helix/step/1-1`);
  }

  // Get or create Step 1.2
  let { data: step, error: stepError } = await supabase
    .from('helix_steps')
    .select('*')
    .eq('project_id', projectId)
    .eq('step_key', '1-2')
    .single();

  if (stepError || !step) {
    const { data: newStep } = await supabase
      .from('helix_steps')
      .insert({
        project_id: projectId,
        stage_number: 1,
        step_number: 2,
        step_key: '1-2',
        status: 'active',
        evidence_type: 'text',
        evidence_data: null,
      })
      .select()
      .single();

    step = newStep as HelixStep;
  }

  // Extract project idea from Step 1.1 evidence
  const projectIdea = step1_1?.evidence_data
    ? (step1_1.evidence_data as any).projectName || ''
    : '';

  return (
    <Step1_2Content
      step={step as HelixStep}
      projectId={projectId}
      orgSlug={orgSlug}
      projectIdea={projectIdea}
    />
  );
}
```

### 2. Step 1.2 Content Component
#### File: `components/helix/steps/Step1_2Content.tsx` (NEW)
Component for copying prompt and pasting/uploading brainstorming output.

```typescript
'use client';

import React, { useState } from 'react';
import { Copy, CheckCircle2, AlertCircle, Loader2, FileUp, Clipboard } from 'lucide-react';
import { HelixStep } from '@/types/helix';
import { completeHelixStep } from '@/lib/helix/actions';

interface Step1_2ContentProps {
  step: HelixStep;
  projectId: string;
  orgSlug: string;
  projectIdea: string;
}

interface BrainstormingOutput {
  source: 'paste' | 'file';
  content: string;
  fileName?: string;
  uploadedAt: string;
}

export default function Step1_2Content({
  step,
  projectId,
  orgSlug,
  projectIdea,
}: Step1_2ContentProps) {
  const [brainstormingOutput, setBrainstormingOutput] = useState<BrainstormingOutput | null>(
    step.evidence_data as BrainstormingOutput || null
  );
  const [pastedText, setPastedText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [outputPreview, setOutputPreview] = useState(false);

  // Generate the brainstorming prompt template
  const generatePrompt = (): string => {
    return `# Helix Brainstorming Prompt

## Project Context
**Project Name:** ${projectIdea}

---

## Instructions
You are facilitating a structured brainstorming session for this project. Follow the 4-phase process below:

### Phase 1: Problem Deep Dive
1. Expand on the core problem statement
2. Identify pain points and user frustrations
3. Explore root causes
4. Define success criteria for solving this problem

### Phase 2: Solution Exploration
1. Brainstorm 5-10 potential solution approaches
2. Evaluate pros/cons of each approach
3. Identify constraints and dependencies
4. Recommend the most promising approach

### Phase 3: User & Market Research
1. Define detailed user personas
2. Describe user workflows and jobs-to-be-done
3. Analyze competitive landscape
4. Identify market opportunities and threats

### Phase 4: Project Brief Synthesis
1. Summarize the findings from Phases 1-3
2. Define the project scope and goals
3. Outline key features and requirements
4. Create a 1-2 paragraph executive summary

---

## Expected Output Format

After completing all 4 phases, provide a comprehensive Project Brief that includes:

**Executive Summary**
(1-2 paragraphs)

**Problem Statement**
(expanded from the original)

**Target Users & Personas**
(detailed descriptions)

**Solution Overview**
(recommended approach with justification)

**Key Features & Requirements**
(prioritized list)

**Success Metrics**
(how we'll measure success)

**Market & Competitive Analysis**
(landscape overview)

**Next Steps**
(recommended actions for project definition stage)

---

## How to Use This Prompt
1. Copy the entire prompt above
2. Go to Claude Chat (https://claude.ai)
3. Create a new conversation
4. Paste the prompt
5. Allow Claude to work through all 4 phases
6. Copy the final Project Brief back to Foundry
`;
  };

  const promptText = generatePrompt();

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      setError('Failed to copy prompt to clipboard');
    }
  };

  const validateOutput = (text: string): boolean => {
    setValidationError(null);

    if (!text || text.trim().length === 0) {
      setValidationError('Output cannot be empty');
      return false;
    }

    if (text.length < 500) {
      setValidationError('Output must be at least 500 characters');
      return false;
    }

    // Basic checks for phase markers to ensure structure
    const hasPhases =
      text.toLowerCase().includes('phase 1') ||
      text.toLowerCase().includes('phase 2') ||
      text.toLowerCase().includes('executive summary') ||
      text.toLowerCase().includes('problem');

    if (!hasPhases) {
      setValidationError(
        'Output does not appear to contain brainstorming results. Make sure you followed all 4 phases.'
      );
      return false;
    }

    return true;
  };

  const handlePasteOutput = async () => {
    if (!validateOutput(pastedText)) {
      return;
    }

    const output: BrainstormingOutput = {
      source: 'paste',
      content: pastedText,
      uploadedAt: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      setError(null);
      await completeHelixStep(
        projectId,
        '1-2',
        output,
        'Brainstorming Output'
      );
      setBrainstormingOutput(output);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save brainstorming output'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setError(null);
      const text = await file.text();

      if (!validateOutput(text)) {
        return;
      }

      const output: BrainstormingOutput = {
        source: 'file',
        content: text,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };

      setIsSaving(true);
      await completeHelixStep(
        projectId,
        '1-2',
        output,
        'Brainstorming Output'
      );
      setBrainstormingOutput(output);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process uploaded file'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (step.status === 'complete' && brainstormingOutput) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-text-primary">
              1.2 — Brainstorming Prompt
            </h1>
            <p className="text-text-secondary mt-1">Step 2 of 3 — Planning Stage</p>
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

                <p className="text-sm text-text-secondary mb-6">
                  Brainstorming output received on{' '}
                  {new Date(brainstormingOutput.uploadedAt).toLocaleDateString()}
                </p>

                {brainstormingOutput.source === 'file' && (
                  <p className="text-sm text-text-secondary mb-6 flex items-center gap-2">
                    <FileUp size={16} />
                    Uploaded file: {brainstormingOutput.fileName}
                  </p>
                )}

                <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6 max-h-96 overflow-y-auto">
                  <div className="prose prose-sm max-w-none text-text-secondary">
                    {brainstormingOutput.content.split('\n').map((line, idx) => (
                      <p key={idx} className="mb-2 leading-relaxed">
                        {line || '\u00A0'}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-900">
                    Your brainstorming output has been saved as an artifact and locked.
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
                  Step 1.2 is complete. Your brainstorming output is saved.
                </p>
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix/step/1-3`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Continue to Step 1.3
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
            1.2 — Brainstorming Prompt
          </h1>
          <p className="text-text-secondary mt-1">Step 2 of 3 — Planning Stage</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                      Click "Copy Prompt" to copy the brainstorming prompt
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      2
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Open Claude Chat (https://claude.ai) in a new tab
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      3
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Paste the prompt and follow Claude's guidance through all 4 phases
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      4
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Copy the final Project Brief and paste it back here
                    </span>
                  </li>
                </ol>
              </div>

              {/* Prompt Display */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Brainstorming Prompt
                </h2>
                <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6 max-h-96 overflow-y-auto mb-4">
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                    {promptText}
                  </pre>
                </div>
                <button
                  onClick={copyPromptToClipboard}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    copiedToClipboard
                      ? 'bg-green-100 text-green-700'
                      : 'bg-accent-cyan text-white hover:bg-opacity-90'
                  }`}
                >
                  {copiedToClipboard ? (
                    <>
                      <CheckCircle2 size={18} />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-4 py-4">
                <div className="flex-1 h-px bg-bg-tertiary" />
                <span className="text-sm text-text-secondary">OR</span>
                <div className="flex-1 h-px bg-bg-tertiary" />
              </div>

              {/* Paste Output */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Paste Brainstorming Output
                </h2>
                <p className="text-sm text-text-secondary mb-3">
                  After completing the brainstorming in Claude Chat, paste the final Project Brief here.
                </p>
                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Paste the Project Brief from Claude Chat here (minimum 500 characters)..."
                  className="w-full h-64 px-4 py-3 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                />
                <p className={`text-xs mt-2 ${
                  pastedText.length >= 500
                    ? 'text-green-600'
                    : 'text-text-secondary'
                }`}>
                  {pastedText.length} / 500 characters (minimum)
                </p>
              </div>

              {/* File Upload */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Or Upload a File
                </h2>
                <p className="text-sm text-text-secondary mb-3">
                  Upload a markdown, text, or PDF file with the brainstorming output.
                </p>
                <div className="border-2 border-dashed border-bg-tertiary rounded-lg p-6 text-center hover:border-accent-cyan transition-colors">
                  <input
                    type="file"
                    accept=".md,.txt,.pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setUploadedFileName(e.target.files[0].name);
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <FileUp size={32} className="text-text-secondary" />
                    <p className="text-sm font-medium text-text-primary">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-text-secondary">
                      Markdown, Text, or PDF files
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Submit Output
              </h3>

              {(validationError || error) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">
                    {validationError || error}
                  </p>
                </div>
              )}

              <p className="text-sm text-text-secondary mb-6">
                Once you've run the brainstorming prompt in Claude Chat and collected the output,
                paste it here or upload as a file.
              </p>

              <button
                onClick={handlePasteOutput}
                disabled={
                  isSaving ||
                  pastedText.trim().length === 0 ||
                  pastedText.length < 500
                }
                className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mb-3"
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                {isSaving ? 'Submitting...' : 'Submit Pasted Output'}
              </button>

              {uploadedFileName && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                  <p className="text-sm text-green-800 font-medium">
                    File "{uploadedFileName}" submitted
                  </p>
                </div>
              )}

              <p className="text-xs text-text-secondary text-center">
                Minimum 500 characters required
              </p>

              {/* Quick Link to Claude Chat */}
              <div className="mt-6 pt-6 border-t border-bg-tertiary">
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-70 transition-all justify-center"
                >
                  <Clipboard size={16} />
                  Open Claude Chat
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. File Upload Handler
#### File: `lib/helix/fileProcessing.ts` (NEW)
Utility to handle file uploads and text extraction.

```typescript
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.type === 'text/markdown') {
    return await file.text();
  }

  if (file.type === 'application/pdf') {
    // Note: In full implementation, use a PDF library like pdfjs
    // For MVP, we'll just reject PDFs and ask users to paste text
    throw new Error('PDF support requires additional setup. Please copy-paste the text instead.');
  }

  throw new Error(`Unsupported file type: ${file.type}`);
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
              1-2/
                page.tsx (NEW)

components/
  helix/
    steps/
      Step1_2Content.tsx (NEW)

lib/
  helix/
    fileProcessing.ts (NEW)
    actions.ts (from Phase 010)
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
- **Styling:** Tailwind CSS v4
- **State Management:** React useState
- **Icons:** lucide-react
- **External Tool:** Claude Chat (https://claude.ai)

---

## Acceptance Criteria

1. Step 1.2 page loads and enforces that Step 1.1 is complete (gate check redirects if not)
2. Prompt template is generated with project name from Step 1.1 evidence
3. "Copy Prompt" button copies full prompt text to clipboard and shows confirmation
4. Prompt display shows in code block format (monospace font) for easy reading
5. Text paste area accepts brainstorming output and enforces 500-character minimum
6. File upload zone accepts .md, .txt files and extracts text for validation
7. Validation prevents submission if content < 500 characters or doesn't contain phase markers
8. Clicking "Submit" saves output, marks step complete, and unlocks Step 1.3
9. After completion, page displays read-only view with saved output and "Continue to Step 1.3" button
10. Artifact is created with title "Brainstorming Output" and source metadata (paste or file)

---

## Testing Instructions

1. Complete Step 1.1 and navigate to Step 1.2 page
2. Verify page loads and displays prompt with project name from Step 1.1
3. Click "Copy Prompt" button, verify clipboard confirmation appears
4. Open new tab, paste prompt in Claude Chat, verify it's readable
5. Type fewer than 500 characters in paste area, verify button is disabled
6. Type 500+ characters, verify button becomes enabled
7. Click "Submit Pasted Output", verify loading spinner and success message
8. Refresh page and verify step displays as completed with read-only view
9. Upload a .txt file with valid brainstorming output, verify it processes
10. Try to upload a .pdf file, verify error message about PDF support

---

## Notes for the AI Agent

- The prompt template is text-based and includes instructions for the 4-phase process
- The MVP does NOT integrate with Claude API; it guides external usage
- File upload in MVP only supports .md and .txt; PDF support can be added later with pdfjs
- Validation checks for minimum 500 characters and presence of keywords (phases, executive summary, problem)
- The prompt text must be clear and easy to copy; monospace rendering helps
- Once Step 1.2 is complete, Step 1.3 is unlocked
- Store the output source (paste vs file) in evidence_data.source for audit trail
- The "Open Claude Chat" button at bottom is a convenience link (target="_blank")
- All evidence from Steps 1.1 and 1.2 form the input to Step 1.3 (Save Project Brief)
