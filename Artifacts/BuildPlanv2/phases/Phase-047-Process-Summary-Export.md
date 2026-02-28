# PHASE 047 — Process Summary Export

## Objective
Generate comprehensive process summary documents that capture the complete Helix project journey, including all stages, steps, evidence summaries, metrics, and artifact inventory. Export as markdown and optionally store as a project artifact.

## Prerequisites
- Phase 001-044 completed (all Helix MVP stages, steps, evidence, artifacts, completion tracking)
- Phase 046 completed (evidence export infrastructure)
- Process Complete state UI exists
- Artifact storage system in place

## Epic Context
**Epic 6 — MVP Polish & Cross-Cutting**
Phase 047 creates high-level documentation of completed processes. This cross-cutting concern provides executive-level visibility, compliance documentation, and knowledge preservation for the entire Helix journey.

## Context
Helix Mode tracks detailed information across 22 steps and 8 stages, but lacks a high-level summary document. Project leads need:
- Single comprehensive document capturing entire process
- Summary of all stages with completion status and dates
- Evidence inventory (count by type, key artifacts)
- Key metrics (total duration, phase breakdown, evidence statistics)
- Artifact references linking to stored artifacts
- Professional markdown format suitable for stakeholder review

This phase delivers a powerful summary export accessible from both the Process Complete view and a dashboard menu.

## Detailed Requirements

### 1. Process Summary Generator Library
```typescript
// lib/helix/process-summary.ts
import { Stage, Step, Evidence, Artifact, HelixProcess } from '@/types/helix';

interface ProcessMetrics {
  totalDuration: number; // in days
  startDate: string;
  endDate: string;
  stageCount: number;
  stepCount: number;
  completedStepCount: number;
  evidenceCount: number;
  evidenceByType: {
    text: number;
    checklist: number;
    file: number;
    link: number;
  };
  artifactCount: number;
  gateCheckCount: number;
  passedGateCount: number;
  failedGateCount: number;
}

interface SummaryData {
  projectName: string;
  projectKey: string;
  processId: string;
  startedAt: string;
  completedAt?: string;
  metrics: ProcessMetrics;
  stages: Array<{
    key: string;
    name: string;
    description?: string;
    status: 'completed' | 'in-progress' | 'not-started';
    startedAt?: string;
    completedAt?: string;
    duration?: number; // in hours
    steps: Array<{
      key: string;
      name: string;
      description?: string;
      status: 'completed' | 'in-progress' | 'not-started';
      completedAt?: string;
      duration?: number; // in minutes
      evidenceSummary: {
        total: number;
        types: Record<string, number>;
      };
    }>;
    gateCheck?: {
      name: string;
      status: 'passed' | 'failed';
      completedAt?: string;
      notes?: string;
    };
  }>;
  artifacts: Array<{
    name: string;
    key: string;
    type: string;
    createdAt: string;
    status: string;
  }>;
  notes?: string;
}

/**
 * Calculate process metrics
 */
export function calculateMetrics(
  process: HelixProcess,
  stages: Stage[]
): ProcessMetrics {
  const allSteps = stages.flatMap(s => s.steps || []);
  const completedSteps = allSteps.filter(s => s.completedAt);

  const allEvidence = allSteps.flatMap(s => s.evidence || []);
  const evidenceByType: Record<string, number> = {};
  allEvidence.forEach(ev => {
    evidenceByType[ev.type] = (evidenceByType[ev.type] || 0) + 1;
  });

  const startDate = new Date(process.createdAt);
  const endDate = process.completedAt ? new Date(process.completedAt) : new Date();
  const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const gateChecks = stages.flatMap(s => s.gateCheck ? [s.gateCheck] : []);
  const passedGates = gateChecks.filter(g => g.status === 'passed').length;
  const failedGates = gateChecks.filter(g => g.status === 'failed').length;

  return {
    totalDuration,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    stageCount: stages.length,
    stepCount: allSteps.length,
    completedStepCount: completedSteps.length,
    evidenceCount: allEvidence.length,
    evidenceByType: {
      text: evidenceByType['text'] || 0,
      checklist: evidenceByType['checklist'] || 0,
      file: evidenceByType['file'] || 0,
      link: evidenceByType['link'] || 0,
    },
    artifactCount: process.artifacts?.length || 0,
    gateCheckCount: gateChecks.length,
    passedGateCount: passedGates,
    failedGateCount: failedGates,
  };
}

/**
 * Build summary data from process and stages
 */
export function buildSummaryData(
  process: HelixProcess,
  stages: Stage[],
  artifacts?: Artifact[]
): SummaryData {
  const metrics = calculateMetrics(process, stages);

  const stageSummaries = stages.map(stage => {
    const steps = stage.steps || [];
    const gateCheck = stage.gateCheck ? {
      name: stage.gateCheck.name || `${stage.name} Gate Check`,
      status: stage.gateCheck.status,
      completedAt: stage.gateCheck.completedAt,
      notes: stage.gateCheck.notes,
    } : undefined;

    return {
      key: stage.key,
      name: stage.name,
      description: stage.description,
      status: stage.completedAt ? 'completed' : stage.steps?.some(s => s.startedAt) ? 'in-progress' : 'not-started',
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
      duration: stage.completedAt ?
        Math.round((new Date(stage.completedAt).getTime() - new Date(stage.startedAt || stage.createdAt).getTime()) / (1000 * 60 * 60)) :
        undefined,
      steps: steps.map(step => {
        const stepEvidence = step.evidence || [];
        const evidenceCount: Record<string, number> = {};
        stepEvidence.forEach(ev => {
          evidenceCount[ev.type] = (evidenceCount[ev.type] || 0) + 1;
        });

        return {
          key: step.key,
          name: step.name,
          description: step.description,
          status: step.completedAt ? 'completed' : step.startedAt ? 'in-progress' : 'not-started',
          completedAt: step.completedAt,
          duration: step.completedAt ?
            Math.round((new Date(step.completedAt).getTime() - new Date(step.startedAt || step.createdAt).getTime()) / (1000 * 60)) :
            undefined,
          evidenceSummary: {
            total: stepEvidence.length,
            types: evidenceCount,
          },
        };
      }),
      gateCheck,
    };
  });

  const artifactSummaries = (artifacts || []).map(art => ({
    name: art.name,
    key: art.key,
    type: art.type,
    createdAt: art.createdAt,
    status: art.status,
  }));

  return {
    projectName: process.projectName,
    projectKey: process.projectKey,
    processId: process.id,
    startedAt: process.createdAt,
    completedAt: process.completedAt,
    metrics,
    stages: stageSummaries,
    artifacts: artifactSummaries,
    notes: process.notes,
  };
}

/**
 * Format metrics for display
 */
function formatMetricsSection(metrics: ProcessMetrics): string {
  return `## Process Metrics

| Metric | Value |
|--------|-------|
| **Duration** | ${metrics.totalDuration} days |
| **Start Date** | ${metrics.startDate} |
| **End Date** | ${metrics.endDate} |
| **Stages** | ${metrics.stageCount} |
| **Steps** | ${metrics.stepCount} (${metrics.completedStepCount} completed) |
| **Completion Rate** | ${Math.round((metrics.completedStepCount / metrics.stepCount) * 100)}% |
| **Total Evidence** | ${metrics.evidenceCount} items |
| **Gate Checks** | ${metrics.gateCheckCount} (${metrics.passedGateCount} passed, ${metrics.failedGateCount} failed) |
| **Artifacts** | ${metrics.artifactCount} |

### Evidence Breakdown

- Text: ${metrics.evidenceByType.text} items
- Checklists: ${metrics.evidenceByType.checklist} items
- Files: ${metrics.evidenceByType.file} items
- Links: ${metrics.evidenceByType.link} items
`;
}

/**
 * Format stages and steps
 */
function formatStagesSection(data: SummaryData): string {
  let markdown = '## Stages & Steps\n\n';

  data.stages.forEach((stage, stageIndex) => {
    const statusEmoji = {
      completed: '✓',
      'in-progress': '⏳',
      'not-started': '◯',
    }[stage.status];

    markdown += `### Stage ${stageIndex + 1}: ${stage.name} ${statusEmoji}\n\n`;

    if (stage.description) {
      markdown += `${stage.description}\n\n`;
    }

    markdown += `**Status:** ${stage.status}\n`;
    if (stage.completedAt) {
      markdown += `**Completed:** ${new Date(stage.completedAt).toLocaleString()}\n`;
      if (stage.duration) {
        markdown += `**Duration:** ${stage.duration} hours\n`;
      }
    }
    markdown += '\n';

    if (stage.gateCheck) {
      const gateStatus = stage.gateCheck.status === 'passed' ? '✓ PASSED' : '✗ FAILED';
      markdown += `**Gate Check:** ${gateStatus}\n`;
      if (stage.gateCheck.completedAt) {
        markdown += `**Gate Completed:** ${new Date(stage.gateCheck.completedAt).toLocaleString()}\n`;
      }
      if (stage.gateCheck.notes) {
        markdown += `**Gate Notes:** ${stage.gateCheck.notes}\n`;
      }
      markdown += '\n';
    }

    // Steps
    markdown += `#### Steps (${stage.steps.length})\n\n`;
    stage.steps.forEach((step, stepIndex) => {
      const stepStatusEmoji = {
        completed: '✓',
        'in-progress': '⏳',
        'not-started': '◯',
      }[step.status];

      markdown += `**${stepIndex + 1}. ${step.name}** ${stepStatusEmoji}\n`;

      if (step.description) {
        markdown += `${step.description}\n`;
      }

      markdown += `- Status: ${step.status}\n`;
      if (step.completedAt) {
        markdown += `- Completed: ${new Date(step.completedAt).toLocaleString()}\n`;
      }
      if (step.duration) {
        markdown += `- Duration: ${step.duration} minutes\n`;
      }

      if (step.evidenceSummary.total > 0) {
        markdown += `- Evidence: ${step.evidenceSummary.total} items (`;
        const typeLabels = Object.entries(step.evidenceSummary.types)
          .map(([type, count]) => `${count} ${type}`)
          .join(', ');
        markdown += `${typeLabels})\n`;
      }

      markdown += '\n';
    });

    markdown += '\n';
  });

  return markdown;
}

/**
 * Format artifacts section
 */
function formatArtifactsSection(artifacts: SummaryData['artifacts']): string {
  if (artifacts.length === 0) {
    return '## Artifacts\n\nNo artifacts created during this process.\n\n';
  }

  let markdown = `## Artifacts (${artifacts.length})\n\n`;

  artifacts.forEach((art, index) => {
    markdown += `${index + 1}. **${art.name}**\n`;
    markdown += `   - Type: ${art.type}\n`;
    markdown += `   - Status: ${art.status}\n`;
    markdown += `   - Created: ${new Date(art.createdAt).toLocaleString()}\n`;
    markdown += `   - Key: \`${art.key}\`\n\n`;
  });

  return markdown;
}

/**
 * Generate complete markdown summary
 */
export function generateProcessSummaryMarkdown(data: SummaryData): string {
  const completionDate = data.completedAt
    ? `\n\n*Completed on ${new Date(data.completedAt).toLocaleString()}*`
    : '\n\n*Still in progress*';

  let markdown = `# Helix Process Summary

**Project:** ${data.projectName} (\`${data.projectKey}\`)
**Process ID:** \`${data.processId}\`
**Started:** ${new Date(data.startedAt).toLocaleString()}${completionDate}

---

`;

  markdown += formatMetricsSection(data.metrics);
  markdown += '\n';
  markdown += formatStagesSection(data);
  markdown += '\n';
  markdown += formatArtifactsSection(data.artifacts);

  if (data.notes) {
    markdown += `## Notes\n\n${data.notes}\n\n`;
  }

  markdown += `---\n\n*Generated by Foundry v2 Helix Mode on ${new Date().toLocaleString()}*\n`;

  return markdown;
}

/**
 * Export process summary as Markdown blob
 */
export async function exportProcessSummary(
  process: HelixProcess,
  stages: Stage[],
  artifacts?: Artifact[]
): Promise<Blob> {
  const summaryData = buildSummaryData(process, stages, artifacts);
  const markdown = generateProcessSummaryMarkdown(summaryData);
  return new Blob([markdown], { type: 'text/markdown' });
}

/**
 * Generate filename for process summary
 */
export function generateProcessSummaryFilename(projectKey: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${projectKey}_process_summary_${date}.md`;
}
```

### 2. Process Summary Export Component
```typescript
// components/helix/ProcessSummaryExport.tsx
import React, { useState } from 'react';
import { HelixProcess, Stage, Artifact } from '@/types/helix';
import {
  exportProcessSummary,
  generateProcessSummaryFilename,
  downloadBlob,
} from '@/lib/helix/process-summary';

interface ProcessSummaryExportProps {
  process: HelixProcess;
  stages: Stage[];
  artifacts?: Artifact[];
  includeArtifactLink?: boolean;
  onExportComplete?: () => void;
  className?: string;
}

export const ProcessSummaryExport: React.FC<ProcessSummaryExportProps> = ({
  process,
  stages,
  artifacts,
  includeArtifactLink = false,
  onExportComplete,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToArtifact, setSavedToArtifact] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const blob = await exportProcessSummary(process, stages, artifacts);
      const filename = generateProcessSummaryFilename(process.projectKey);

      downloadBlob(blob, filename);

      if (onExportComplete) {
        onExportComplete();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      console.error('Export error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsArtifact = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const blob = await exportProcessSummary(process, stages, artifacts);
      const filename = generateProcessSummaryFilename(process.projectKey);

      // Save as artifact (requires API call)
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('name', `Process Summary - ${new Date().toLocaleDateString()}`);
      formData.append('type', 'process-summary');
      formData.append('processId', process.id);

      const response = await fetch('/api/helix/artifacts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save artifact');
      }

      setSavedToArtifact(true);
      if (onExportComplete) {
        onExportComplete();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      console.error('Save error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <button
          onClick={handleDownload}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-semibold transition-colors ${
            isLoading
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-[#00d4ff] hover:bg-[#00a8cc] text-[#0f1117]'
          }`}
        >
          <span>📄</span>
          <span>{isLoading ? 'Generating...' : 'Download Summary'}</span>
        </button>

        {includeArtifactLink && (
          <button
            onClick={handleSaveAsArtifact}
            disabled={isLoading || savedToArtifact}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-semibold transition-colors ${
              savedToArtifact
                ? 'bg-green-700 text-white'
                : isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
            }`}
          >
            <span>💾</span>
            <span>
              {isLoading ? 'Saving...' : savedToArtifact ? 'Saved to Artifacts' : 'Save to Artifacts'}
            </span>
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900 bg-opacity-20 p-3 rounded">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 border-t border-gray-800 pt-3">
        <p>Summary includes:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>All {stages.length} stages and their {stages.reduce((sum, s) => sum + (s.steps?.length || 0), 0)} steps</li>
          <li>{stages.reduce((sum, s) => sum + (s.steps?.reduce((ssum, st) => ssum + (st.evidence?.length || 0), 0) || 0), 0)} evidence items</li>
          <li>{artifacts?.length || 0} artifacts</li>
          <li>Process metrics and timelines</li>
        </ul>
      </div>
    </div>
  );
};

export default ProcessSummaryExport;
```

### 3. Integration in Process Complete View
```typescript
// In app/[workspaceSlug]/projects/[projectKey]/helix/complete/page.tsx

import ProcessSummaryExport from '@/components/helix/ProcessSummaryExport';

export default function ProcessCompletePage() {
  const { process, stages, artifacts } = useHelix();

  return (
    <div className="bg-[#0f1117] min-h-screen p-6">
      {/* Process completion celebration section */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-lg p-8 text-white mb-8">
          <h1 className="text-4xl font-bold mb-2">Process Complete! 🎉</h1>
          <p className="text-lg opacity-90">
            Your Helix mode journey has been completed successfully.
          </p>
        </div>

        {/* Summary export card */}
        <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Export Process Summary</h2>
          <p className="text-gray-400 mb-6">
            Download a comprehensive markdown document summarizing your entire process,
            including all stages, steps, metrics, and artifacts.
          </p>
          <ProcessSummaryExport
            process={process}
            stages={stages}
            artifacts={artifacts}
            includeArtifactLink={true}
            onExportComplete={() => {
              // Optional: show success notification
            }}
          />
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/projects/${projectKey}/helix/dashboard`)}
            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded font-semibold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4. Dashboard Menu Integration
```typescript
// In components/helix/HelixDashboard.tsx

<Menu>
  <MenuButton className="p-2 hover:bg-gray-800 rounded">⋮</MenuButton>
  <MenuItems className="absolute right-0 mt-2 bg-[#1a1d27] border border-gray-700 rounded shadow-lg">
    <MenuItem>
      <button
        onClick={openProcessSummaryModal}
        className="block w-full text-left px-4 py-2 hover:bg-gray-800 text-white"
      >
        📄 Export Process Summary
      </button>
    </MenuItem>
  </MenuItems>
</Menu>
```

## File Structure
```
lib/helix/
├── process-summary.ts           (Summary generation and export)
components/helix/
├── ProcessSummaryExport.tsx     (Export component)
└── HelixDashboard.tsx           (UPDATED with menu integration)
app/[workspaceSlug]/projects/[projectKey]/helix/complete/
└── page.tsx                     (UPDATED with summary export)
```

## Dependencies
- @/types/helix (HelixProcess, Stage, Artifact)
- @/lib/helix/export (downloadBlob, sanitization)

## Tech Stack
- Next.js 16+ (client component with API route)
- TypeScript
- Tailwind CSS v4
- Markdown generation

## Acceptance Criteria
1. Process summary markdown includes project name, process ID, start/end dates, and completion status
2. Metrics section displays total duration, stage count, step count, evidence count, artifact count, gate check results
3. Stages section shows all 8 stages with status, completion date, duration, and gate check status
4. Steps section shows all 22 steps with status, completion date, duration, and evidence count breakdown
5. Evidence breakdown shows count of each type (text, checklist, file, link)
6. Artifacts section lists all artifacts with name, type, status, and creation date
7. Markdown formatting is professional and renders correctly in standard markdown viewers
8. Download button generates valid markdown file with correct naming convention
9. Save to Artifacts button stores summary as artifact in project storage
10. Export works from both Process Complete view and Helix dashboard menu

## Testing Instructions
1. **Complete process export**: Finish all stages and steps, go to Process Complete view, download summary, verify all sections present
2. **Markdown rendering**: Download summary, open in markdown viewer, verify formatting and links work
3. **Metrics accuracy**: Check summary metrics against Helix dashboard, verify counts match exactly
4. **Evidence count**: Manually count evidence items, verify summary breakdown matches
5. **Stage completeness**: Verify all 8 stages appear in summary with correct names and descriptions
6. **Step completeness**: Verify all 22 steps appear with correct grouping by stage
7. **Artifact listing**: Verify all artifacts created during process appear in summary section
8. **Save to artifacts**: Click "Save to Artifacts" button, verify file appears in project artifacts
9. **Filename format**: Verify downloaded files follow naming convention `{projectKey}_process_summary_{date}.md`
10. **In-progress process**: Export summary from in-progress process, verify status shows "Still in progress" and incomplete items marked appropriately

## Notes for AI Agent
- Process summary is the "executive summary" of entire Helix journey—make it comprehensive but readable
- Use emoji status indicators (✓, ⏳, ◯) for quick visual scanning
- Metrics should be calculated accurately—verify calculations handle edge cases (0 steps, all steps done, etc.)
- Markdown tables work well for metrics—use them for clarity
- "Save to Artifacts" requires API endpoint `/api/helix/artifacts` to accept form-data with file upload
- Consider future enhancement: ability to customize which sections are included in export
- Summary is perfect for stakeholder communication—keep professional tone
- Include timestamps throughout for audit trail
- Test with processes that have 0 artifacts, no completed stages, long descriptions, etc.
- Consider performance if process has >100 steps or >1000 evidence items
