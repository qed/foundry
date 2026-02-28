# Phase 140 — Comprehensive Project Report Export

## Objective
Enable export of complete project reports including process summary, artifact inventory, metrics, timeline, test results, and deployment history in markdown with optional DOCX/PDF formats, stored as project artifacts.

## Prerequisites
- Phase 136 — Process Metrics Dashboard — Metrics data source
- Phase 135 — Core Helix Process Engine — Process data source

## Epic Context
**Epic:** 17 — Process Analytics & Reporting
**Phase:** 140 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Project stakeholders need comprehensive reports summarizing the entire Helix journey: what was built, how long it took, test results, deployment history, and metrics. Currently, this information is scattered across the system. A comprehensive export aggregates everything into a single, sharable, formatted document.

This report serves multiple purposes: stakeholder communication, project handoff documentation, process improvement analysis, and compliance documentation. Markdown format ensures compatibility, with DOCX/PDF options for formal distribution.

---

## Detailed Requirements

### 1. Report Generation Service
#### File: `lib/reports/projectReportGenerator.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface ProjectReport {
  projectId: string;
  projectName: string;
  orgName: string;
  generatedAt: Date;
  markdown: string;
  metrics: any;
  artifacts: any[];
}

export async function generateProjectReport(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<ProjectReport> {
  // Get project info
  const { data: project } = await supabaseClient
    .from('projects')
    .select(`
      id,
      name,
      description,
      tech_stack,
      created_at,
      org_id,
      orgs(name)
    `)
    .eq('id', projectId)
    .single();

  if (!project) throw new Error('Project not found');

  // Get process data
  const { data: phases } = await supabaseClient
    .from('helix_build_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_number', { ascending: true });

  const { data: stageHistory } = await supabaseClient
    .from('helix_process_stage_history')
    .select('*')
    .eq('project_id', projectId)
    .order('completed_at', { ascending: true });

  // Get test results
  const { data: testResults } = await supabaseClient
    .from('helix_test_results')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get deployments
  const { data: deployments } = await supabaseClient
    .from('helix_deployments')
    .select(`
      id,
      environment,
      version,
      status,
      created_at,
      deployed_at
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  // Get artifacts
  const { data: artifacts } = await supabaseClient
    .from('helix_artifacts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  // Calculate metrics
  const totalDuration = phases?.reduce((sum, p) => sum + (p.duration_minutes || 0), 0) || 0;
  const completedPhases = phases?.filter(p => p.status === 'completed').length || 0;
  const totalPhases = phases?.length || 0;
  const avgTestCoverage = testResults?.length > 0
    ? testResults.reduce((sum, t) => sum + (t.passed / t.total), 0) / testResults.length
    : 0;

  const markdown = generateMarkdown({
    project,
    phases,
    stageHistory,
    testResults,
    deployments,
    artifacts,
    totalDuration,
    completedPhases,
    totalPhases,
    avgTestCoverage,
  });

  return {
    projectId,
    projectName: project.name,
    orgName: project.orgs?.name || 'Unknown',
    generatedAt: new Date(),
    markdown,
    metrics: {
      totalDuration,
      completedPhases,
      totalPhases,
      avgTestCoverage,
      deploymentCount: deployments?.length || 0,
      artifactCount: artifacts?.length || 0,
    },
    artifacts: artifacts || [],
  };
}

function generateMarkdown(data: any): string {
  const {
    project,
    phases,
    stageHistory,
    testResults,
    deployments,
    artifacts,
    totalDuration,
    completedPhases,
    totalPhases,
    avgTestCoverage,
  } = data;

  let markdown = `# ${project.name} — Project Report\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleDateString()}\n`;
  markdown += `**Organization:** ${data.orgName}\n\n`;

  // Executive Summary
  markdown += `## Executive Summary\n\n`;
  markdown += `${project.description || 'No description provided'}\n\n`;
  markdown += `**Tech Stack:** ${project.tech_stack || 'Not specified'}\n`;
  markdown += `**Status:** ${completedPhases === totalPhases ? 'Complete' : 'In Progress'}\n\n`;

  // Key Metrics
  markdown += `## Key Metrics\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Duration | ${Math.round(totalDuration)} minutes |\n`;
  markdown += `| Phases Completed | ${completedPhases}/${totalPhases} |\n`;
  markdown += `| Average Phase Time | ${completedPhases > 0 ? Math.round(totalDuration / completedPhases) : 0} min |\n`;
  markdown += `| Test Coverage | ${(avgTestCoverage * 100).toFixed(1)}% |\n`;
  markdown += `| Total Deployments | ${deployments?.length || 0} |\n`;
  markdown += `| Artifacts Generated | ${artifacts?.length || 0} |\n\n`;

  // Process Timeline
  markdown += `## Process Timeline\n\n`;
  if (phases && phases.length > 0) {
    phases.forEach((phase: any, idx: number) => {
      const duration = phase.duration_minutes ? Math.round(phase.duration_minutes) : 'N/A';
      markdown += `### Phase ${phase.phase_number} — ${phase.title || 'Untitled'}\n`;
      markdown += `- **Status:** ${phase.status}\n`;
      markdown += `- **Duration:** ${duration} min\n`;
      markdown += `- **Started:** ${new Date(phase.started_at).toLocaleDateString()}\n`;
      if (phase.completed_at) {
        markdown += `- **Completed:** ${new Date(phase.completed_at).toLocaleDateString()}\n`;
      }
      markdown += `\n`;
    });
  }

  // Stage Breakdown
  markdown += `## Stage Breakdown\n\n`;
  if (stageHistory && stageHistory.length > 0) {
    const stageGroups = new Map<string, any[]>();
    stageHistory.forEach((record: any) => {
      if (!stageGroups.has(record.stage_name)) {
        stageGroups.set(record.stage_name, []);
      }
      stageGroups.get(record.stage_name)!.push(record);
    });

    stageGroups.forEach((records, stage) => {
      const durations = records
        .filter(r => r.completed_at)
        .map((r: any) => (new Date(r.completed_at).getTime() -
                         new Date(r.started_at).getTime()) / (1000 * 60));
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

      markdown += `### ${stage}\n`;
      markdown += `- **Average Duration:** ${Math.round(avg)} min\n`;
      markdown += `- **Completions:** ${durations.length}\n`;
      markdown += `\n`;
    });
  }

  // Test Results
  markdown += `## Test Results\n\n`;
  if (testResults && testResults.length > 0) {
    markdown += `| Date | Passed | Total | Coverage |\n`;
    markdown += `|------|--------|-------|----------|\n`;
    testResults.forEach((test: any) => {
      const coverage = ((test.passed / test.total) * 100).toFixed(1);
      markdown += `| ${new Date(test.created_at).toLocaleDateString()} | ${test.passed} | ${test.total} | ${coverage}% |\n`;
    });
    markdown += `\n`;
  } else {
    markdown += `No test results recorded.\n\n`;
  }

  // Deployments
  markdown += `## Deployment History\n\n`;
  if (deployments && deployments.length > 0) {
    markdown += `| Date | Environment | Version | Status |\n`;
    markdown += `|------|-------------|---------|--------|\n`;
    deployments.forEach((deployment: any) => {
      markdown += `| ${new Date(deployment.created_at).toLocaleDateString()} | ${deployment.environment} | ${deployment.version} | ${deployment.status} |\n`;
    });
    markdown += `\n`;
  } else {
    markdown += `No deployments recorded.\n\n`;
  }

  // Artifacts Inventory
  markdown += `## Artifacts Inventory\n\n`;
  if (artifacts && artifacts.length > 0) {
    artifacts.forEach((artifact: any) => {
      markdown += `### ${artifact.name}\n`;
      markdown += `- **Type:** ${artifact.type}\n`;
      markdown += `- **Size:** ${artifact.size_bytes ? Math.round(artifact.size_bytes / 1024) + ' KB' : 'Unknown'}\n`;
      markdown += `- **Created:** ${new Date(artifact.created_at).toLocaleDateString()}\n`;
      if (artifact.description) {
        markdown += `- **Description:** ${artifact.description}\n`;
      }
      markdown += `\n`;
    });
  } else {
    markdown += `No artifacts recorded.\n\n`;
  }

  // Process Notes
  markdown += `## Process Notes\n\n`;
  markdown += `This report was generated by the Foundry v2 Helix Mode reporting system.\n`;
  markdown += `For more information and real-time metrics, visit the Foundry dashboard.\n\n`;

  return markdown;
}

export async function exportReportAsMarkdown(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<string> {
  const report = await generateProjectReport(projectId, supabaseClient);
  return report.markdown;
}

export async function saveReportAsArtifact(
  projectId: string,
  report: ProjectReport,
  supabaseClient: ReturnType<typeof createClient>
): Promise<string> {
  const { data, error } = await supabaseClient
    .from('helix_artifacts')
    .insert([
      {
        project_id: projectId,
        name: `Project Report - ${new Date().toLocaleDateString()}`,
        type: 'report',
        description: 'Comprehensive project report',
        content: report.markdown,
        size_bytes: Buffer.byteLength(report.markdown, 'utf-8'),
      },
    ])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
```

### 2. Report Export API
#### File: `app/api/v1/projects/[id]/reports/export/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProjectReport, saveReportAsArtifact } from '@/lib/reports/projectReportGenerator';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { format = 'markdown' } = await request.json();
    const supabase = createClient();

    const report = await generateProjectReport(params.id, supabase);

    // Save to artifacts
    const artifactId = await saveReportAsArtifact(params.id, report, supabase);

    if (format === 'markdown') {
      return new Response(report.markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${report.projectName}-report.md"`,
        },
      });
    } else if (format === 'json') {
      return NextResponse.json({
        projectId: report.projectId,
        projectName: report.projectName,
        orgName: report.orgName,
        generatedAt: report.generatedAt,
        metrics: report.metrics,
        artifactId,
        markdownUrl: `/api/v1/projects/${params.id}/reports/artifact/${artifactId}`,
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    console.error('Report export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const supabase = createClient();
    const report = await generateProjectReport(params.id, supabase);

    return NextResponse.json({
      projectId: report.projectId,
      projectName: report.projectName,
      orgName: report.orgName,
      generatedAt: report.generatedAt,
      metrics: report.metrics,
      artifactCount: report.artifacts.length,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3. Report UI Component
#### File: `components/helix/reports/ProjectReportExporter.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface ProjectReportExporterProps {
  projectId: string;
  projectName: string;
}

export function ProjectReportExporter({
  projectId,
  projectName,
}: ProjectReportExporterProps) {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [isDownloading, setIsDownloading] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async (exportFormat: string) => {
      const response = await fetch(
        `/api/v1/projects/${projectId}/reports/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await createClient().auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ format: exportFormat }),
        }
      );

      if (!response.ok) throw new Error('Export failed');
      return response;
    },
    onSuccess: async (response) => {
      if (format === 'markdown') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}-report.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        console.log('Report metadata:', data);
      }
      setIsDownloading(false);
    },
    onError: () => {
      setIsDownloading(false);
    },
  });

  const handleExport = async () => {
    setIsDownloading(true);
    exportMutation.mutate(format);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Export Project Report</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'markdown' | 'json')}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="markdown">Markdown (.md)</option>
            <option value="json">JSON (Metadata)</option>
          </select>
          <p className="text-xs text-gray-600 mt-1">
            {format === 'markdown'
              ? 'Download complete report with all metrics, timelines, and artifacts'
              : 'Get JSON metadata about the report'}
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isDownloading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isDownloading ? 'Exporting...' : 'Export Report'}
        </button>

        <div className="bg-blue-50 p-4 rounded text-sm text-gray-700">
          <p className="font-semibold mb-2">What's included:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Executive summary</li>
            <li>Key metrics and health scores</li>
            <li>Complete process timeline</li>
            <li>Stage breakdown and analysis</li>
            <li>Test results summary</li>
            <li>Deployment history</li>
            <li>Artifacts inventory</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## File Structure
```
lib/
└── reports/
    └── projectReportGenerator.ts (NEW)
components/
└── helix/
    └── reports/
        └── ProjectReportExporter.tsx (NEW)
app/
└── api/
    └── v1/
        └── projects/
            └── [id]/
                └── reports/
                    └── export/
                        └── route.ts (NEW)
```

---

## Dependencies
- Supabase client: existing
- @tanstack/react-query: ^5.28.0

---

## Tech Stack for This Phase
- Next.js 16+ (API routes, Server Components)
- TypeScript
- Supabase (data aggregation)
- React (UI components)
- TailwindCSS v4 (styling)

---

## Acceptance Criteria
1. Markdown report generated with all project sections
2. Report includes executive summary, metrics, timeline, stages, tests, deployments
3. Markdown formatted correctly with headers, tables, bullet lists
4. Report saved as artifact in helix_artifacts table
5. Export API endpoint accessible at POST /api/v1/projects/:id/reports/export
6. Download format selector allows markdown or JSON
7. Markdown file downloads with correct filename
8. JSON response includes metrics summary and artifact ID
9. Report includes all completed phases with durations
10. UI component displays export options and preview of contents

---

## Testing Instructions
1. Create project with 10+ phases, test results, and deployments
2. Generate report from UI component
3. Verify markdown contains all sections (summary, metrics, timeline, etc.)
4. Verify tables formatted correctly with proper markdown syntax
5. Download markdown file and verify content
6. Verify report saved as artifact
7. Call API GET endpoint, verify metrics returned
8. Call API POST with format=json, verify JSON response
9. Verify all phase numbers and durations accurate
10. Verify deployment count and test coverage percentages accurate

---

## Notes for the AI Agent
- Future enhancement: DOCX/PDF export using libraries like docx or puppeteer
- Consider adding charts/visualizations to markdown via image embedding
- Performance optimization: cache report generation for 1 hour
- Consider batch report generation for multiple projects
- Future enhancement: email report distribution
