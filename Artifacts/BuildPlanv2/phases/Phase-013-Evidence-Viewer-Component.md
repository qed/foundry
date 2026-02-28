# Phase 013 — Evidence Viewer Component

## Objective
Build a reusable Evidence Viewer component that displays completed evidence for any Helix step. The component handles all five evidence types (text rendered as markdown, file with download/preview, URL clickable link, checklist with checked items, manual placeholder), and displays submission timestamp and submitter information. It operates in read-only mode for completed steps and prepares for future edit capabilities.

## Prerequisites
- Phase 009 — Step Detail View Component — required to integrate viewer in step detail pages
- Phase 005 — Step Configuration Schema — required to determine evidence types
- Phase 012 — Step 1.3 Completion — testing should leverage completed steps with evidence
- Phase 004 — Artifact System Enhancement — referenced for artifact metadata structure

## Epic Context
**Epic:** 2 — Planning Stage (Steps 1.1–1.3)
**Phase:** 013 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Once a Helix step is marked complete with evidence, users and administrators need to view, audit, and reference that evidence. Rather than building separate viewers for each evidence type, this reusable component provides a single interface that adapts to the evidence type stored in the helix_steps table.

The Evidence Viewer is displayed on completed steps and also used in audit/review views where managers might need to verify that evidence was properly submitted. The component shows who submitted the evidence, when, and in what format, providing a complete audit trail for governance.

---

## Detailed Requirements

### 1. Evidence Viewer Component
#### File: `components/helix/EvidenceViewer.tsx` (NEW)
Reusable component for displaying evidence from completed Helix steps.

```typescript
'use client';

import React, { useState } from 'react';
import { Download, Copy, CheckCircle2, AlertCircle, Eye, Pencil } from 'lucide-react';
import { HelixStep } from '@/types/helix';
import MarkdownRenderer from './MarkdownRenderer';

interface EvidenceViewerProps {
  step: HelixStep;
  stepKey: string;
  evidenceType: 'text' | 'file' | 'url' | 'checklist' | 'manual';
  completedBy?: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
  onEdit?: () => void;
  allowEdit?: boolean;
}

export default function EvidenceViewer({
  step,
  stepKey,
  evidenceType,
  completedBy,
  onEdit,
  allowEdit = false,
}: EvidenceViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!step.evidence_data || step.status !== 'complete') {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
        <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
        <p className="text-sm text-yellow-800">
          No evidence available for this step
        </p>
      </div>
    );
  }

  const evidence = step.evidence_data as any;
  const completedDate = step.completed_at
    ? new Date(step.completed_at)
    : null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Submission Info */}
      <div className="border-b border-bg-tertiary pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Evidence
            </h3>
            <div className="space-y-1">
              <p className="text-sm text-text-secondary">
                Submitted on{' '}
                {completedDate?.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {completedBy && (
                <div className="flex items-center gap-2 mt-2">
                  {completedBy.avatarUrl && (
                    <img
                      src={completedBy.avatarUrl}
                      alt={completedBy.displayName}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-text-primary">
                      {completedBy.displayName}
                    </p>
                    <p className="text-text-secondary text-xs">
                      {completedBy.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {allowEdit && onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <Pencil size={16} />
              Edit Evidence
            </button>
          )}
        </div>
      </div>

      {/* Evidence Type Renderers */}
      <div>
        {evidenceType === 'text' && (
          <TextEvidenceViewer evidence={evidence} stepKey={stepKey} />
        )}

        {evidenceType === 'file' && (
          <FileEvidenceViewer
            evidence={evidence}
            stepKey={stepKey}
            showPreview={showPreview}
            onPreviewToggle={setShowPreview}
          />
        )}

        {evidenceType === 'url' && (
          <URLEvidenceViewer evidence={evidence} />
        )}

        {evidenceType === 'checklist' && (
          <ChecklistEvidenceViewer evidence={evidence} />
        )}

        {evidenceType === 'manual' && (
          <ManualEvidenceViewer />
        )}
      </div>

      {/* Audit Footer */}
      <div className="pt-6 border-t border-bg-tertiary">
        <p className="text-xs text-text-secondary">
          Step Key: <code className="bg-bg-tertiary px-2 py-1 rounded">{stepKey}</code>
        </p>
        <p className="text-xs text-text-secondary mt-1">
          Evidence Type: <code className="bg-bg-tertiary px-2 py-1 rounded">{evidenceType}</code>
        </p>
      </div>
    </div>
  );
}

// Evidence Type Renderers

interface TextEvidenceViewerProps {
  evidence: any;
  stepKey: string;
}

function TextEvidenceViewer({ evidence, stepKey }: TextEvidenceViewerProps) {
  const [copied, setCopied] = useState(false);
  const content = typeof evidence === 'string' ? evidence : evidence?.ideaText || evidence?.content || '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-primary">
          Text Content
        </p>
        <button
          onClick={copyToClipboard}
          className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-bg-tertiary text-text-secondary hover:bg-opacity-70'
          }`}
        >
          <Copy size={14} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6">
        <div className="prose prose-sm max-w-none">
          {/* If content is HTML (from TipTap), render it directly */}
          {content.includes('<') ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            /* Otherwise, treat as markdown */
            <MarkdownRenderer content={content} />
          )}
        </div>
      </div>
    </div>
  );
}

interface FileEvidenceViewerProps {
  evidence: any;
  stepKey: string;
  showPreview: boolean;
  onPreviewToggle: (show: boolean) => void;
}

function FileEvidenceViewer({
  evidence,
  stepKey,
  showPreview,
  onPreviewToggle,
}: FileEvidenceViewerProps) {
  const fileName = evidence?.fileName || 'unknown';
  const fileSize = evidence?.fileSize || 0;
  const fileType = evidence?.fileType || 'application/octet-stream';
  const fileUrl = evidence?.fileUrl || '';

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-primary">
          File
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPreviewToggle(!showPreview)}
            className="flex items-center gap-2 px-3 py-1 text-xs rounded bg-bg-tertiary text-text-secondary hover:bg-opacity-70 transition-colors"
          >
            <Eye size={14} />
            {showPreview ? 'Hide' : 'Preview'}
          </button>
          {fileUrl && (
            <a
              href={fileUrl}
              download={fileName}
              className="flex items-center gap-2 px-3 py-1 text-xs rounded bg-accent-cyan text-white hover:bg-opacity-90 transition-colors"
            >
              <Download size={14} />
              Download
            </a>
          )}
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        <p className="text-sm font-medium text-blue-900">{fileName}</p>
        <p className="text-xs text-blue-800 mt-1">
          {formatFileSize(fileSize)} • {fileType}
        </p>
      </div>

      {showPreview && fileUrl && (
        <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6 max-h-96 overflow-y-auto">
          {fileType === 'text/plain' || fileType === 'text/markdown' ? (
            <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
              {/* Note: In full implementation, fetch and display file content */}
              Preview not available for this file type
            </pre>
          ) : (
            <p className="text-text-secondary text-sm">
              Preview not available for {fileType}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface URLEvidenceViewerProps {
  evidence: any;
}

function URLEvidenceViewer({ evidence }: URLEvidenceViewerProps) {
  const url = typeof evidence === 'string' ? evidence : evidence?.url || '';

  return (
    <div>
      <p className="text-sm font-medium text-text-primary mb-4">
        URL Reference
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 break-all">
            {url}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-blue-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}

interface ChecklistEvidenceViewerProps {
  evidence: any;
}

function ChecklistEvidenceViewer({ evidence }: ChecklistEvidenceViewerProps) {
  const items = Array.isArray(evidence) ? evidence : evidence?.items || [];
  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-primary">
          Checklist
        </p>
        <p className="text-sm text-text-secondary">
          {checkedCount} of {items.length} completed
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-bg-primary border border-bg-tertiary rounded-lg">
            <input
              type="checkbox"
              checked={item.checked}
              disabled
              className="w-5 h-5 rounded cursor-default"
            />
            <span
              className={`text-sm ${
                item.checked
                  ? 'text-text-primary font-medium line-through'
                  : 'text-text-secondary'
              }`}
            >
              {item.label}
            </span>
            {item.checked && (
              <CheckCircle2 size={16} className="text-green-600 ml-auto flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-text-secondary italic">
          No checklist items recorded
        </p>
      )}
    </div>
  );
}

function ManualEvidenceViewer() {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm text-blue-900">
        This step was marked as complete and is pending manual review by a project manager.
      </p>
    </div>
  );
}
```

### 2. Integration in StepDetailView (Update from Phase 009)
#### File: `components/helix/StepDetailView.tsx` (UPDATED)
Add EvidenceViewer to the read-only state for completed steps.

```typescript
// Add import at top
import EvidenceViewer from './EvidenceViewer';

// In the StepDetailView component, replace the completed step display with:

if (isComplete) {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* ... header stays same ... */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-8">
              {/* Instructions */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Overview
                </h2>
                <p className="text-text-secondary leading-relaxed">
                  {stepConfig.description}
                </p>
              </div>

              {/* Evidence Viewer */}
              <EvidenceViewer
                step={step}
                stepKey={stepKey}
                evidenceType={stepConfig.evidenceType}
                allowEdit={false}
              />
            </div>
          </div>

          {/* Right panel with navigation */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 size={24} className="text-green-600" />
                <h3 className="text-lg font-semibold text-text-primary">
                  Complete
                </h3>
              </div>

              <p className="text-sm text-text-secondary mb-6">
                This step has been completed and evidence is locked.
              </p>

              {/* Navigation buttons */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Evidence Viewer Types Definition
#### File: `types/helix.ts` (UPDATED - add types)
Add TypeScript types for evidence types.

```typescript
export interface TextEvidence {
  content: string;
  ideaText?: string; // for TipTap HTML
  projectName?: string;
  problemStatement?: string;
  targetUsers?: string;
  vision?: string;
}

export interface FileEvidence {
  source: 'file';
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface URLEvidence {
  url: string;
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface ChecklistEvidence {
  items: ChecklistItem[];
}

export type EvidenceData =
  | TextEvidence
  | FileEvidence
  | URLEvidence
  | ChecklistEvidence
  | null;
```

---

## File Structure

```
components/
  helix/
    EvidenceViewer.tsx (NEW)
    StepDetailView.tsx (UPDATED - integrate viewer)
    MarkdownRenderer.tsx (from Phase 012)

types/
  helix.ts (UPDATED - add evidence types)
```

---

## Dependencies
```json
{
  "lucide-react": "^0.263.1",
  "react-markdown": "^8.0.0",
  "remark-gfm": "^3.0.0"
}
```

---

## Tech Stack for This Phase
- **Framework:** React (Client Components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Markdown Rendering:** react-markdown
- **Icons:** lucide-react

---

## Acceptance Criteria

1. EvidenceViewer component renders with submission metadata (date, submitter)
2. Text evidence displays as markdown or HTML (TipTap) depending on source
3. File evidence shows file name, size, type, with download link and optional preview
4. URL evidence displays as clickable link with external icon
5. Checklist evidence shows items with checked status and completion count
6. Manual evidence displays placeholder indicating pending review
7. Copy button works for text evidence and shows confirmation
8. Timestamp displays in human-readable format (e.g., "January 15, 2026 at 3:30 PM")
9. Submitter info displays with avatar (if available), name, and email
10. Component renders in read-only mode; edit button hidden when allowEdit=false

---

## Testing Instructions

1. Complete Step 1.1 (text evidence), navigate to step detail view, verify EvidenceViewer renders
2. Verify text content displays with markdown formatting (headings, emphasis, etc.)
3. Click copy button, verify clipboard contains text and confirmation appears
4. Check submission timestamp formatting (should be human-readable)
5. Complete Step 1.2 (paste/file evidence), verify file name and size display
6. Click download button, verify link works (check in network tab)
7. Complete Step 1.3 (file upload), verify file preview toggle works
8. Test with checklist evidence: verify checked items show checkmark and count updates
9. Test with URL evidence: verify link is clickable and opens in new tab
10. Verify audit footer displays step key and evidence type in monospace code blocks

---

## Notes for the AI Agent

- The EvidenceViewer is designed to be reused across all 50+ steps; keep it generic
- Text evidence may come from two sources: plain text (paste) or HTML (TipTap). Handle both gracefully
- File preview should only show for text files in MVP; binary files show a "not available" message
- The submitter info (completedBy) may be optional for older steps; handle null gracefully
- Copy button should have a 2-second confirmation delay before resetting
- The "Edit Evidence" button is prepared for future phases where step re-opening is allowed
- Audit footer is intentionally verbose to support governance and compliance scenarios
- All timestamps must be in local timezone (use Date.toLocaleDateString())
- File size formatting should use human-readable units (Bytes, KB, MB, GB)
