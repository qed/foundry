# PHASE 046 — Step Evidence Export

## Objective
Implement evidence export functionality allowing users to download all evidence for a single step or entire stage as a structured package. Export format is ZIP containing markdown summaries and original files with metadata.

## Prerequisites
- Phase 001-044 completed (all Helix MVP stages, steps, evidence collection)
- Evidence data model with multiple types (text, file, checklist)
- StepDetailView and StageGateCheck components exist
- Database schema stores evidence with timestamps and file references

## Epic Context
**Epic 6 — MVP Polish & Cross-Cutting**
Phase 046 adds data export capability—enabling users to preserve, share, and backup evidence from completed phases. This cross-cutting concern supports compliance, documentation, and knowledge preservation across the Helix process.

## Context
The Helix MVP collects evidence throughout the 22-step process but lacks export capability. Users need to:
- Export evidence from individual steps as downloadable packages
- Export all evidence from entire stages
- Maintain evidence integrity with metadata (completion date, who completed, step details)
- Support multiple evidence types (text/markdown, files, checklists)
- Create portable archives suitable for archival or sharing

This phase delivers a robust export system integrated into step detail and gate check views.

## Detailed Requirements

### 1. Evidence Export Library
```typescript
// lib/helix/export.ts
import JSZip from 'jszip';
import { Evidence, EvidenceType, Step, Stage } from '@/types/helix';

interface ExportMetadata {
  stepName: string;
  stepKey: string;
  stageName: string;
  stageKey: string;
  completedAt: string;
  completedBy: string;
  evidenceCount: number;
  exportedAt: string;
}

interface StageExportMetadata {
  stageName: string;
  stageKey: string;
  completedAt?: string;
  stepCount: number;
  totalEvidenceCount: number;
  exportedAt: string;
}

/**
 * Generate markdown summary for text evidence
 */
export function generateTextEvidenceMd(evidence: Evidence): string {
  const date = new Date(evidence.createdAt).toLocaleString();
  const createdBy = evidence.createdBy || 'Unknown';

  return `# Text Evidence: ${evidence.title}

**Created:** ${date}
**Created By:** ${createdBy}

---

${evidence.content}
`;
}

/**
 * Generate markdown summary for checklist evidence
 */
export function generateChecklistEvidenceMd(evidence: Evidence): string {
  const date = new Date(evidence.createdAt).toLocaleString();
  const items = evidence.checklistItems || [];
  const completedCount = items.filter(i => i.completed).length;

  const itemsMd = items
    .map(item => `- [${item.completed ? 'x' : ' '}] ${item.label}`)
    .join('\n');

  return `# Checklist Evidence: ${evidence.title}

**Created:** ${date}
**Completion:** ${completedCount} / ${items.length} items

---

${itemsMd}
`;
}

/**
 * Generate markdown summary for file evidence
 */
export function generateFileEvidenceMd(evidence: Evidence, originalFileName: string): string {
  const date = new Date(evidence.createdAt).toLocaleString();

  return `# File Evidence: ${evidence.title}

**Created:** ${date}
**Original File:** ${originalFileName}
**File Type:** ${evidence.fileType || 'unknown'}
**Size:** ${evidence.fileSize ? formatBytes(evidence.fileSize) : 'unknown'}

---

This evidence references the file: \`${originalFileName}\`

File included in this archive.
`;
}

/**
 * Export single step evidence as ZIP
 */
export async function exportStepEvidence(
  step: Step,
  stage: Stage,
  evidence: Evidence[],
  completedBy: string
): Promise<Blob> {
  const zip = new JSZip();

  // Create metadata file
  const metadata: ExportMetadata = {
    stepName: step.name,
    stepKey: step.key,
    stageName: stage.name,
    stageKey: stage.key,
    completedAt: step.completedAt || new Date().toISOString(),
    completedBy,
    evidenceCount: evidence.length,
    exportedAt: new Date().toISOString(),
  };

  zip.file('METADATA.json', JSON.stringify(metadata, null, 2));

  // Create evidence folder
  const evidenceFolder = zip.folder('evidence')!;

  // Process each evidence item
  for (let i = 0; i < evidence.length; i++) {
    const ev = evidence[i];
    const index = String(i + 1).padStart(2, '0');

    switch (ev.type) {
      case 'text': {
        const md = generateTextEvidenceMd(ev);
        evidenceFolder.file(
          `${index}_${sanitizeFileName(ev.title)}.md`,
          md
        );
        break;
      }

      case 'checklist': {
        const md = generateChecklistEvidenceMd(ev);
        evidenceFolder.file(
          `${index}_${sanitizeFileName(ev.title)}.md`,
          md
        );
        break;
      }

      case 'file': {
        // Add original file if available
        if (ev.fileUrl && ev.fileName) {
          try {
            const fileBlob = await fetch(ev.fileUrl).then(r => r.blob());
            const fileFolder = evidenceFolder.folder(
              `${index}_${sanitizeFileName(ev.title)}`
            )!;
            fileFolder.file(ev.fileName, fileBlob);

            // Add metadata about the file
            const fileMd = generateFileEvidenceMd(ev, ev.fileName);
            fileFolder.file('README.md', fileMd);
          } catch (error) {
            console.error(`Failed to fetch file evidence: ${ev.fileName}`);
            // Add metadata even if file fetch fails
            const fileMd = generateFileEvidenceMd(ev, ev.fileName || 'unknown');
            evidenceFolder.file(
              `${index}_${sanitizeFileName(ev.title)}_README.md`,
              fileMd
            );
          }
        }
        break;
      }

      case 'link': {
        const md = `# Link Evidence: ${ev.title}

**Created:** ${new Date(ev.createdAt).toLocaleString()}
**URL:** [${ev.linkUrl}](${ev.linkUrl})

---

Referenced link: ${ev.linkUrl}
`;
        evidenceFolder.file(
          `${index}_${sanitizeFileName(ev.title)}.md`,
          md
        );
        break;
      }
    }
  }

  // Create summary document
  const summaryMd = `# Step Evidence Export

## Summary
- **Step:** ${step.name}
- **Stage:** ${stage.name}
- **Completed At:** ${step.completedAt || 'Not completed'}
- **Completed By:** ${completedBy}
- **Total Evidence Items:** ${evidence.length}
- **Exported:** ${new Date().toLocaleString()}

## Evidence Inventory

${evidence.map((ev, i) => `${i + 1}. **${ev.type}** - ${ev.title}`).join('\n')}

---

Export created from Foundry v2 Helix Mode.
`;

  zip.file('SUMMARY.md', summaryMd);

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Export entire stage evidence as ZIP
 */
export async function exportStageEvidence(
  stage: Stage,
  steps: Step[],
  stepsEvidence: Map<string, Evidence[]>,
  completedBy: string
): Promise<Blob> {
  const zip = new JSZip();

  // Create metadata file
  const totalEvidenceCount = Array.from(stepsEvidence.values()).reduce(
    (sum, evs) => sum + evs.length,
    0
  );

  const metadata: StageExportMetadata = {
    stageName: stage.name,
    stageKey: stage.key,
    completedAt: stage.completedAt,
    stepCount: steps.length,
    totalEvidenceCount,
    exportedAt: new Date().toISOString(),
  };

  zip.file('METADATA.json', JSON.stringify(metadata, null, 2));

  // Create a folder for each step
  for (const step of steps) {
    const stepEvidence = stepsEvidence.get(step.key) || [];
    const stepFolder = zip.folder(`${sanitizeFileName(step.name)}`)!;

    // Add step metadata
    const stepMetadata = {
      stepName: step.name,
      stepKey: step.key,
      completedAt: step.completedAt || 'Not completed',
      evidenceCount: stepEvidence.length,
    };

    stepFolder.file('step-metadata.json', JSON.stringify(stepMetadata, null, 2));

    // Add evidence
    const evidenceFolder = stepFolder.folder('evidence')!;

    for (let i = 0; i < stepEvidence.length; i++) {
      const ev = stepEvidence[i];
      const index = String(i + 1).padStart(2, '0');

      switch (ev.type) {
        case 'text': {
          const md = generateTextEvidenceMd(ev);
          evidenceFolder.file(
            `${index}_${sanitizeFileName(ev.title)}.md`,
            md
          );
          break;
        }

        case 'checklist': {
          const md = generateChecklistEvidenceMd(ev);
          evidenceFolder.file(
            `${index}_${sanitizeFileName(ev.title)}.md`,
            md
          );
          break;
        }

        case 'file': {
          if (ev.fileUrl && ev.fileName) {
            try {
              const fileBlob = await fetch(ev.fileUrl).then(r => r.blob());
              const fileSubFolder = evidenceFolder.folder(
                `${index}_${sanitizeFileName(ev.title)}`
              )!;
              fileSubFolder.file(ev.fileName, fileBlob);

              const fileMd = generateFileEvidenceMd(ev, ev.fileName);
              fileSubFolder.file('README.md', fileMd);
            } catch (error) {
              console.error(`Failed to fetch file evidence: ${ev.fileName}`);
              const fileMd = generateFileEvidenceMd(ev, ev.fileName || 'unknown');
              evidenceFolder.file(
                `${index}_${sanitizeFileName(ev.title)}_README.md`,
                fileMd
              );
            }
          }
          break;
        }
      }
    }
  }

  // Create stage summary
  const summaryMd = `# Stage Evidence Export

## Summary
- **Stage:** ${stage.name}
- **Steps:** ${steps.length}
- **Total Evidence Items:** ${totalEvidenceCount}
- **Completed At:** ${stage.completedAt || 'Not completed'}
- **Exported:** ${new Date().toLocaleString()}

## Steps Included

${steps.map((s, i) => {
  const evCount = stepsEvidence.get(s.key)?.length || 0;
  return `${i + 1}. ${s.name} (${evCount} evidence items)`;
}).join('\n')}

---

Export created from Foundry v2 Helix Mode.
`;

  zip.file('SUMMARY.md', summaryMd);

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Sanitize filename to remove invalid characters
 */
export function sanitizeFileName(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Trigger browser download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### 2. Export Button Component
```typescript
// components/helix/ExportButton.tsx
import React, { useState } from 'react';
import { Evidence, Step, Stage } from '@/types/helix';
import {
  exportStepEvidence,
  exportStageEvidence,
  downloadBlob,
  sanitizeFileName,
} from '@/lib/helix/export';

interface ExportButtonProps {
  type: 'step' | 'stage';
  step?: Step;
  stage: Stage;
  evidence: Evidence[];
  stepsForStage?: Step[];
  stepsEvidenceMap?: Map<string, Evidence[]>;
  completedBy: string;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  type,
  step,
  stage,
  evidence,
  stepsForStage,
  stepsEvidenceMap,
  completedBy,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let blob: Blob;
      let filename: string;

      if (type === 'step' && step) {
        blob = await exportStepEvidence(step, stage, evidence, completedBy);
        filename = `${sanitizeFileName(stage.name)}_${sanitizeFileName(
          step.name
        )}_evidence.zip`;
      } else if (type === 'stage' && stepsForStage && stepsEvidenceMap) {
        blob = await exportStageEvidence(
          stage,
          stepsForStage,
          stepsEvidenceMap,
          completedBy
        );
        filename = `${sanitizeFileName(stage.name)}_evidence.zip`;
      } else {
        throw new Error('Invalid export configuration');
      }

      downloadBlob(blob, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      console.error('Export error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isLoading || evidence.length === 0}
        className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
          isLoading || evidence.length === 0
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-[#00d4ff] hover:bg-[#00a8cc] text-[#0f1117] font-semibold'
        } ${className}`}
      >
        <span>📥</span>
        <span>
          {isLoading ? 'Exporting...' : `Export ${type === 'step' ? 'Step' : 'Stage'} Evidence`}
        </span>
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-400 bg-red-900 bg-opacity-20 p-2 rounded">
          {error}
        </div>
      )}

      {evidence.length === 0 && (
        <div className="mt-2 text-sm text-gray-500">
          No evidence to export
        </div>
      )}
    </div>
  );
};

export default ExportButton;
```

### 3. Integration in StepDetailView
```typescript
// In components/helix/StepDetailView.tsx

import ExportButton from './ExportButton';

// Inside component render:
<div className="flex gap-4 mb-6">
  <button
    onClick={() => saveEvidence()}
    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
  >
    Save Evidence
  </button>

  <ExportButton
    type="step"
    step={currentStep}
    stage={currentStage}
    evidence={evidence}
    completedBy={currentUser.name}
    className="ml-auto"
  />
</div>
```

### 4. Integration in StageGateCheck
```typescript
// In components/helix/StageGateCheck.tsx

import ExportButton from './ExportButton';

// Inside gate check completion section:
<div className="flex gap-4">
  <button
    onClick={() => completeGate()}
    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
  >
    Complete Gate
  </button>

  <ExportButton
    type="stage"
    stage={currentStage}
    evidence={allStageEvidence}
    stepsForStage={stepsInStage}
    stepsEvidenceMap={evidenceByStep}
    completedBy={currentUser.name}
    className="ml-auto"
  />
</div>
```

## File Structure
```
lib/helix/
├── export.ts                    (Export functions and utilities)
components/helix/
├── ExportButton.tsx             (Export button component)
└── StepDetailView.tsx           (UPDATED with export integration)
└── StageGateCheck.tsx           (UPDATED with export integration)
```

## Dependencies
- jszip (for ZIP file creation)
- @/types/helix (Evidence, Step, Stage types)
- @/lib/helix/export (export functions)

## Tech Stack
- Next.js 16+ (client component)
- TypeScript
- jszip library
- Tailwind CSS v4

## Acceptance Criteria
1. Step evidence export creates ZIP file containing METADATA.json, SUMMARY.md, and evidence/ folder
2. Text evidence exports as markdown files with timestamps and creator info
3. Checklist evidence exports as markdown with checkbox format and completion percentage
4. File evidence exports with original file included and README.md metadata
5. Link evidence exports as markdown with URL reference
6. Stage export creates ZIP with separate folders for each step, maintaining hierarchy
7. Export ZIP files are automatically named based on stage/step names (sanitized)
8. Export button appears on both StepDetailView and StageGateCheck components
9. Export button is disabled when no evidence exists, shows appropriate disabled state
10. Downloaded files are valid ZIPs that can be extracted and all content is readable

## Testing Instructions
1. **Single step export**: Complete a step with multiple evidence types, click export, verify ZIP contains correct metadata and all evidence
2. **Stage export**: Complete entire stage, click stage export button, verify ZIP contains folder per step with all evidence
3. **Text evidence export**: Add text evidence with markdown, export step, verify markdown renders correctly in extracted file
4. **File evidence export**: Upload file evidence, export step, verify original file is included in ZIP
5. **Checklist evidence export**: Create checklist with mixed completed/incomplete items, export, verify checkbox format shows correct state
6. **Filename sanitization**: Create step with special characters/spaces in name, export, verify filename is valid and readable
7. **Large export**: Create stage with 10+ steps with file evidence, trigger export, verify ZIP completes and file is valid
8. **Export button states**: Verify button shows loading state during export, disabled when no evidence, error message on failure
9. **Multiple exports**: Export same step twice with delay, verify both files download correctly and are independent
10. **Metadata completeness**: Extract exported ZIP, verify METADATA.json and SUMMARY.md contain all required fields and accurate data

## Notes for AI Agent
- Use jszip library for ZIP creation—install via npm if not present
- Export happens client-side to protect user data and avoid server load
- File evidence may require CORS setup if stored on external CDN
- ZIP compression uses DEFLATE for good balance of size and speed
- Sanitized filenames prevent filesystem errors across platforms
- Export button should have clear loading state—users expect it to take a few seconds for large exports
- Consider adding "View in explorer" button after successful export (future enhancement)
- Evidence data should maintain integrity—no truncation or loss during markdown generation
- Test with very long evidence content (>10MB total) to ensure export completes
- Future enhancement: batch export multiple steps at once
