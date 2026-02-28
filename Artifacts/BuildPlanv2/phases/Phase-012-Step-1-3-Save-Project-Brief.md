# Phase 012 — Step 1.3: Save Project Brief

## Objective
Implement Step 1.3 where users upload or paste the final Project Brief document (markdown, PDF, DOCX, or text). The step provides a markdown preview renderer, enforces non-empty content validation, and stores the brief as an Artifact. Once saved, the Planning Stage (Stage 1) is complete and Stage 2 (Documentation) is unlocked.

## Prerequisites
- Phase 009 — Step Detail View Component — required as parent framework
- Phase 005 — Step Configuration Schema — required for step 1.3 metadata
- Phase 010 — Step 1.1 Completion — required to ensure prior steps are complete
- Phase 011 — Step 1.2 Completion — Step 1.3 is unlocked only after Step 1.2 is complete
- Phase 008 — Gate Check Engine — required to enforce completion ordering

## Epic Context
**Epic:** 2 — Planning Stage (Steps 1.1–1.3)
**Phase:** 012 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Step 1.3 is the final step of the Planning stage and synthesizes Steps 1.1 and 1.2 into a formal Project Brief document. Users can upload a document (PDF, DOCX) or paste markdown/text. The step renders a markdown preview so users can see how their brief will be displayed, and then stores it as an Artifact for future reference during documentation phases.

The Project Brief becomes the "source of truth" for the rest of the Helix process. It captures the full project scope, goals, and requirements, derived from the brainstorming work. This ensures that downstream phases (documentation, architecture, implementation) are all aligned with a single agreed-upon brief.

---

## Detailed Requirements

### 1. Step 1.3 Page Component
#### File: `app/org/[orgSlug]/project/[projectId]/helix/step/1-3/page.tsx` (NEW)
Page component for Step 1.3 final brief submission.

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Step1_3Content from '@/components/helix/steps/Step1_3Content';
import { HelixStep } from '@/types/helix';

interface Step1_3PageProps {
  params: {
    orgSlug: string;
    projectId: string;
  };
}

export default async function Step1_3Page({
  params: { orgSlug, projectId },
}: Step1_3PageProps) {
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

  // Verify Step 1.2 is complete (gate check)
  const { data: step1_2 } = await supabase
    .from('helix_steps')
    .select('status')
    .eq('project_id', projectId)
    .eq('step_key', '1-2')
    .single();

  if (!step1_2 || step1_2.status !== 'complete') {
    redirect(`/org/${orgSlug}/project/${projectId}/helix/step/1-2`);
  }

  // Get or create Step 1.3
  let { data: step, error: stepError } = await supabase
    .from('helix_steps')
    .select('*')
    .eq('project_id', projectId)
    .eq('step_key', '1-3')
    .single();

  if (stepError || !step) {
    const { data: newStep } = await supabase
      .from('helix_steps')
      .insert({
        project_id: projectId,
        stage_number: 1,
        step_number: 3,
        step_key: '1-3',
        status: 'active',
        evidence_type: 'text',
        evidence_data: null,
      })
      .select()
      .single();

    step = newStep as HelixStep;
  }

  return (
    <Step1_3Content
      step={step as HelixStep}
      projectId={projectId}
      orgSlug={orgSlug}
    />
  );
}
```

### 2. Step 1.3 Content Component
#### File: `components/helix/steps/Step1_3Content.tsx` (NEW)
Component for uploading/pasting project brief with markdown preview.

```typescript
'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, FileUp, Eye, Code } from 'lucide-react';
import { HelixStep } from '@/types/helix';
import { completeHelixStep } from '@/lib/helix/actions';
import MarkdownRenderer from '@/components/helix/MarkdownRenderer';

interface Step1_3ContentProps {
  step: HelixStep;
  projectId: string;
  orgSlug: string;
}

interface ProjectBrief {
  source: 'paste' | 'file';
  content: string;
  fileName?: string;
  fileType?: string;
  uploadedAt: string;
}

export default function Step1_3Content({
  step,
  projectId,
  orgSlug,
}: Step1_3ContentProps) {
  const [briefContent, setBriefContent] = useState<ProjectBrief | null>(
    step.evidence_data as ProjectBrief || null
  );
  const [pastedContent, setPastedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const validateContent = (content: string): boolean => {
    setValidationError(null);

    if (!content || content.trim().length === 0) {
      setValidationError('Project Brief cannot be empty');
      return false;
    }

    if (content.length < 100) {
      setValidationError('Project Brief must be at least 100 characters');
      return false;
    }

    return true;
  };

  const handlePasteContent = async () => {
    if (!validateContent(pastedContent)) {
      return;
    }

    const brief: ProjectBrief = {
      source: 'paste',
      content: pastedContent,
      uploadedAt: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      setError(null);
      await completeHelixStep(
        projectId,
        '1-3',
        brief,
        'Project Brief'
      );
      setBriefContent(brief);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save project brief'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setError(null);
      let text: string;

      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        text = await file.text();
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX support would require a library like mammoth.js
        throw new Error('DOCX support requires additional setup. Please save as PDF or plain text.');
      } else if (file.type === 'application/pdf') {
        throw new Error('PDF support requires additional setup. Please save as plain text or markdown.');
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

      if (!validateContent(text)) {
        return;
      }

      const brief: ProjectBrief = {
        source: 'file',
        content: text,
        fileName: file.name,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      setIsSaving(true);
      await completeHelixStep(
        projectId,
        '1-3',
        brief,
        'Project Brief'
      );
      setBriefContent(brief);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process uploaded file'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (step.status === 'complete' && briefContent) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="border-b border-bg-tertiary bg-bg-secondary sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-text-primary">
              1.3 — Save Project Brief
            </h1>
            <p className="text-text-secondary mt-1">Step 3 of 3 — Planning Stage</p>
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
                  Project Brief saved on{' '}
                  {new Date(briefContent.uploadedAt).toLocaleDateString()}
                </p>

                {briefContent.source === 'file' && (
                  <p className="text-sm text-text-secondary mb-6 flex items-center gap-2">
                    <FileUp size={16} />
                    Uploaded file: {briefContent.fileName}
                  </p>
                )}

                <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6">
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={briefContent.content} />
                  </div>
                </div>

                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-900">
                    Your Project Brief has been saved and locked. The Planning Stage is now complete.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Planning Complete
                </h3>
                <p className="text-sm text-text-secondary mb-6">
                  Stage 1 — Planning is now complete. Your project is ready for the Documentation phase.
                </p>
                <a
                  href={`/org/${orgSlug}/project/${projectId}/helix`}
                  className="w-full block px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 transition-all text-center"
                >
                  Back to Helix Dashboard
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
            1.3 — Save Project Brief
          </h1>
          <p className="text-text-secondary mt-1">Step 3 of 3 — Planning Stage</p>
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
                      Upload your Project Brief document or paste the content below
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      2
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Preview the brief in markdown format
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-cyan bg-opacity-10 flex items-center justify-center text-sm font-semibold text-accent-cyan">
                      3
                    </span>
                    <span className="text-text-secondary pt-0.5">
                      Click "Save Project Brief" to complete the Planning Stage
                    </span>
                  </li>
                </ol>
              </div>

              {/* Paste Area */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Paste Project Brief
                </h2>
                <p className="text-sm text-text-secondary mb-3">
                  Paste your Project Brief text (markdown or plain text). Minimum 100 characters.
                </p>
                <div className="mb-3 flex gap-2">
                  <button
                    onClick={() => setPreviewMode(true)}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                      previewMode
                        ? 'bg-accent-cyan text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                    }`}
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                  <button
                    onClick={() => setPreviewMode(false)}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                      !previewMode
                        ? 'bg-accent-cyan text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
                    }`}
                  >
                    <Code size={16} />
                    Source
                  </button>
                </div>

                {previewMode ? (
                  <div className="border border-bg-tertiary rounded-lg p-6 bg-bg-primary min-h-64">
                    {pastedContent.length > 0 ? (
                      <div className="prose prose-sm max-w-none">
                        <MarkdownRenderer content={pastedContent} />
                      </div>
                    ) : (
                      <p className="text-text-secondary text-center py-12">
                        Paste your Project Brief to see a preview here
                      </p>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={pastedContent}
                    onChange={(e) => {
                      setPastedContent(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Paste your Project Brief here (markdown or plain text)..."
                    className="w-full h-64 px-4 py-3 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none font-mono text-sm"
                  />
                )}

                <p className={`text-xs mt-2 ${
                  pastedContent.length >= 100
                    ? 'text-green-600'
                    : 'text-text-secondary'
                }`}>
                  {pastedContent.length} / 100 characters (minimum)
                </p>
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-4 py-4">
                <div className="flex-1 h-px bg-bg-tertiary" />
                <span className="text-sm text-text-secondary">OR</span>
                <div className="flex-1 h-px bg-bg-tertiary" />
              </div>

              {/* File Upload */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Upload Project Brief
                </h2>
                <p className="text-sm text-text-secondary mb-3">
                  Upload a markdown (.md) or text (.txt) file with your Project Brief.
                </p>
                <div className="border-2 border-dashed border-bg-tertiary rounded-lg p-6 text-center hover:border-accent-cyan transition-colors">
                  <input
                    type="file"
                    accept=".md,.txt,.markdown,.text"
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
                      Markdown (.md) or Text (.txt) files
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
                Save Project Brief
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
                Upload your Project Brief file or paste the content, then click the button below to
                complete the Planning Stage and unlock the Documentation Phase.
              </p>

              <button
                onClick={handlePasteContent}
                disabled={
                  isSaving ||
                  pastedContent.trim().length === 0 ||
                  pastedContent.length < 100
                }
                className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mb-3"
              >
                {isSaving && <Loader2 size={20} className="animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Project Brief'}
              </button>

              {uploadedFileName && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                  <p className="text-sm text-green-800 font-medium">
                    File "{uploadedFileName}" submitted
                  </p>
                </div>
              )}

              <p className="text-xs text-text-secondary text-center">
                Minimum 100 characters required
              </p>

              <div className="mt-6 pt-6 border-t border-bg-tertiary">
                <p className="text-xs text-text-secondary mb-3">
                  The Project Brief will be stored as an Artifact and referenced throughout the project.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Markdown Renderer Component
#### File: `components/helix/MarkdownRenderer.tsx` (NEW)
Simple markdown renderer for displaying project briefs.

```typescript
'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node, ...props }) => (
          <h1 className="text-3xl font-bold mt-6 mb-4 text-text-primary" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-2xl font-bold mt-5 mb-3 text-text-primary" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-xl font-semibold mt-4 mb-2 text-text-primary" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="text-lg font-semibold mt-3 mb-2 text-text-primary" {...props} />
        ),
        p: ({ node, ...props }) => (
          <p className="text-text-secondary leading-relaxed mb-4" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside text-text-secondary mb-4 space-y-1" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside text-text-secondary mb-4 space-y-1" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="text-text-secondary" {...props} />
        ),
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-accent-cyan pl-4 italic text-text-secondary mb-4"
            {...props}
          />
        ),
        code: ({ node, inline, ...props }: any) =>
          inline ? (
            <code className="bg-bg-tertiary px-2 py-1 rounded text-sm text-accent-cyan" {...props} />
          ) : (
            <code className="block bg-bg-primary border border-bg-tertiary rounded p-4 text-sm text-text-secondary mb-4 overflow-x-auto" {...props} />
          ),
        table: ({ node, ...props }) => (
          <table className="w-full border-collapse mb-4" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th className="border border-bg-tertiary bg-bg-tertiary p-2 text-text-primary font-semibold text-left" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="border border-bg-tertiary p-2 text-text-secondary" {...props} />
        ),
        a: ({ node, ...props }) => (
          <a className="text-accent-cyan hover:underline" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
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
              1-3/
                page.tsx (NEW)

components/
  helix/
    steps/
      Step1_3Content.tsx (NEW)
    MarkdownRenderer.tsx (NEW)

lib/
  helix/
    actions.ts (from Phase 010)
```

---

## Dependencies
```json
{
  "lucide-react": "^0.263.1",
  "@supabase/supabase-js": "^2.38.0",
  "next": "^16.0.0",
  "react-markdown": "^8.0.0",
  "remark-gfm": "^3.0.0"
}
```

---

## Tech Stack for This Phase
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Markdown Rendering:** react-markdown + remark-gfm
- **Icons:** lucide-react
- **Database:** Supabase

---

## Acceptance Criteria

1. Step 1.3 page loads and enforces that Step 1.2 is complete (gate check redirects if not)
2. Text paste area accepts markdown/plain text and displays character count
3. Preview mode renders markdown with proper headings, lists, code blocks, and links
4. Source mode shows raw markdown/text with monospace font
5. Preview/Source toggle switches between the two views seamlessly
6. File upload zone accepts .md and .txt files and processes text
7. Validation prevents submission if content < 100 characters
8. Error messages display for unsupported file types (PDF, DOCX)
9. Clicking "Save Project Brief" saves content, marks step complete, and unlocks Stage 2
10. After completion, page displays read-only view with rendered brief and "Back to Helix Dashboard" button

---

## Testing Instructions

1. Complete Steps 1.1 and 1.2, navigate to Step 1.3 page
2. Verify page loads and gate check prevents access if Step 1.2 incomplete
3. Type markdown content with headers and lists, click Preview, verify rendering
4. Click Source toggle, verify raw text displays
5. Type fewer than 100 characters, verify button is disabled
6. Type 100+ characters, verify button becomes enabled
7. Click "Save Project Brief", verify loading spinner and success
8. Refresh page and verify step displays as completed with read-only preview
9. Upload a .txt file with valid brief content, verify it processes
10. Try to upload a .pdf file, verify error message about unsupported format

---

## Notes for the AI Agent

- The markdown renderer uses react-markdown with remark-gfm for GitHub-flavored markdown support
- All markdown elements (headings, lists, code, tables) are styled with CSS variables for consistency
- The preview/source toggle should be snappy (no network requests, just state change)
- File uploads only support .md and .txt in MVP; PDF/DOCX support can be added later with mammoth.js and pdfjs
- Once Step 1.3 is complete, the entire Planning Stage (Stage 1) is done
- The stored brief becomes a reference artifact for all downstream stages
- Artifact creation in this phase should use type: 'project_brief' for easy filtering
- Ensure the brief content is validated before marking step complete
- The "Back to Helix Dashboard" link should navigate to the main helix overview page
