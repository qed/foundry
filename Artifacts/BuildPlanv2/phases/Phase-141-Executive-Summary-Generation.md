# Phase 141 — Executive Summary Generation

## Objective
Generate AI-powered executive summaries of project status using Claude, synthesizing metrics, test results, and deployment data into concise stakeholder-friendly summaries with key highlights, risks, recommendations, and next steps.

## Prerequisites
- Phase 140 — Comprehensive Project Report Export — Data aggregation foundation
- Phase 136 — Process Metrics Dashboard — Metrics source

## Epic Context
**Epic:** 17 — Process Analytics & Reporting
**Phase:** 141 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Executives need concise project status summaries, not detailed metrics dashboards. A one-page executive summary highlighting key achievements, current risks, and recommended actions is far more valuable for stakeholder communication. By leveraging Claude's language capabilities, Foundry can automatically generate context-aware summaries tailored to the project's metrics and recent activity.

This phase uses the Anthropic API to generate summaries, integrating seamlessly with Foundry's existing infrastructure. Summaries are stored as artifacts and can be regenerated or customized per audience.

---

## Detailed Requirements

### 1. Executive Summary Service
#### File: `lib/reports/executiveSummary.ts` (NEW)
```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export interface ExecutiveSummary {
  projectId: string;
  projectName: string;
  summary: string;
  highlights: string[];
  risks: string[];
  recommendations: string[];
  nextSteps: string[];
  generatedAt: Date;
}

export async function generateExecutiveSummary(
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<ExecutiveSummary> {
  // Gather all metrics data
  const { data: project } = await supabaseClient
    .from('projects')
    .select('name, description, tech_stack, created_at')
    .eq('id', projectId)
    .single();

  const { data: phases } = await supabaseClient
    .from('helix_build_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_number', { ascending: true });

  const { data: testResults } = await supabaseClient
    .from('helix_test_results')
    .select('passed, total, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: deployments } = await supabaseClient
    .from('helix_deployments')
    .select('environment, status, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: issues } = await supabaseClient
    .from('helix_issues')
    .select('severity, status, title')
    .eq('project_id', projectId)
    .limit(10);

  // Calculate metrics
  const totalDuration = phases?.reduce((sum, p) => sum + (p.duration_minutes || 0), 0) || 0;
  const completedPhases = phases?.filter(p => p.status === 'completed').length || 0;
  const totalPhases = phases?.length || 0;
  const avgTestCoverage = testResults?.length > 0
    ? testResults.reduce((sum, t) => sum + (t.passed / t.total), 0) / testResults.length
    : 0;

  const successfulDeployments = deployments?.filter(d => d.status === 'success').length || 0;
  const criticalIssues = issues?.filter(i => i.severity === 'critical').length || 0;
  const openIssues = issues?.filter(i => i.status === 'open').length || 0;

  // Build context for Claude
  const metricsContext = `
Project: ${project.name}
Description: ${project.description || 'N/A'}
Tech Stack: ${project.tech_stack || 'Not specified'}
Started: ${new Date(project.created_at).toLocaleDateString()}

Metrics:
- Phases: ${completedPhases}/${totalPhases} completed
- Total Duration: ${Math.round(totalDuration)} minutes
- Average Phase Time: ${completedPhases > 0 ? Math.round(totalDuration / completedPhases) : 0} minutes
- Test Coverage: ${(avgTestCoverage * 100).toFixed(1)}%
- Successful Deployments: ${successfulDeployments}
- Critical Issues: ${criticalIssues}
- Open Issues: ${openIssues}

Recent Test Results:
${testResults?.map(t => `- ${new Date(t.created_at).toLocaleDateString()}: ${t.passed}/${t.total} passed (${((t.passed/t.total)*100).toFixed(1)}%)`).join('\n')}

Recent Deployments:
${deployments?.map(d => `- ${new Date(d.created_at).toLocaleDateString()} to ${d.environment}: ${d.status}`).join('\n')}

Open Issues:
${issues?.filter(i => i.status === 'open').slice(0, 5).map(i => `- [${i.severity}] ${i.title}`).join('\n')}
  `;

  // Generate summary with Claude
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Generate a concise executive summary for the following software project.

The summary should be suitable for non-technical stakeholders and include:
1. A 2-3 sentence overall status
2. 3-4 key highlights (achievements, progress)
3. 2-3 key risks or concerns
4. 2-3 actionable recommendations
5. 2-3 next steps

Format the response as JSON with keys: status, highlights, risks, recommendations, nextSteps (each an array of strings).

Project Metrics:
${metricsContext}

Response format:
{
  "status": "...",
  "highlights": ["...", "..."],
  "risks": ["...", "..."],
  "recommendations": ["...", "..."],
  "nextSteps": ["...", "..."]
}`,
      },
    ],
  });

  // Parse Claude response
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let parsedResponse;
  try {
    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsedResponse = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    throw new Error('Failed to generate executive summary');
  }

  const summary = `# Executive Summary — ${project.name}

**Status:** ${parsedResponse.status}

## Highlights
${parsedResponse.highlights.map((h: string) => `- ${h}`).join('\n')}

## Risks & Concerns
${parsedResponse.risks.map((r: string) => `- ${r}`).join('\n')}

## Recommendations
${parsedResponse.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## Next Steps
${parsedResponse.nextSteps.map((step: string) => `1. ${step}`).join('\n')}

---
*Generated: ${new Date().toLocaleDateString()} | Test Coverage: ${(avgTestCoverage * 100).toFixed(1)}% | Phases: ${completedPhases}/${totalPhases}*`;

  return {
    projectId,
    projectName: project.name,
    summary,
    highlights: parsedResponse.highlights,
    risks: parsedResponse.risks,
    recommendations: parsedResponse.recommendations,
    nextSteps: parsedResponse.nextSteps,
    generatedAt: new Date(),
  };
}

export async function saveExecutiveSummaryAsArtifact(
  projectId: string,
  summary: ExecutiveSummary,
  supabaseClient: ReturnType<typeof createClient>
): Promise<string> {
  const { data, error } = await supabaseClient
    .from('helix_artifacts')
    .insert([
      {
        project_id: projectId,
        name: `Executive Summary — ${summary.projectName}`,
        type: 'executive_summary',
        description: 'AI-generated executive summary for stakeholders',
        content: summary.summary,
        size_bytes: Buffer.byteLength(summary.summary, 'utf-8'),
      },
    ])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
```

### 2. Executive Summary API Endpoint
#### File: `app/api/v1/projects/[id]/executive-summary/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateExecutiveSummary,
  saveExecutiveSummaryAsArtifact,
} from '@/lib/reports/executiveSummary';
import { verifyApiKey } from '@/lib/auth/apiKeys';

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
    const summary = await generateExecutiveSummary(params.id, supabase);
    const artifactId = await saveExecutiveSummaryAsArtifact(params.id, summary, supabase);

    return NextResponse.json({
      projectId: summary.projectId,
      projectName: summary.projectName,
      summary: summary.summary,
      highlights: summary.highlights,
      risks: summary.risks,
      recommendations: summary.recommendations,
      nextSteps: summary.nextSteps,
      generatedAt: summary.generatedAt,
      artifactId,
    });
  } catch (error) {
    console.error('Executive summary error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

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

    // POST triggers regeneration
    const supabase = createClient();
    const summary = await generateExecutiveSummary(params.id, supabase);
    const artifactId = await saveExecutiveSummaryAsArtifact(params.id, summary, supabase);

    return NextResponse.json(
      {
        projectId: summary.projectId,
        projectName: summary.projectName,
        generatedAt: summary.generatedAt,
        artifactId,
        message: 'Executive summary regenerated',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Executive summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
```

### 3. Executive Summary UI Component
#### File: `components/helix/reports/ExecutiveSummaryViewer.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { createClient } from '@/lib/supabase/client';

interface ExecutiveSummaryViewerProps {
  projectId: string;
}

export function ExecutiveSummaryViewer({ projectId }: ExecutiveSummaryViewerProps) {
  const supabase = createClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: summary, refetch, isLoading } = useQuery({
    queryKey: ['executive-summary', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/executive-summary`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch summary');
      return response.json();
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/executive-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Regeneration failed');
      return response.json();
    },
    onSuccess: () => {
      setIsRefreshing(false);
      refetch();
    },
  });

  const handleRegenerate = () => {
    setIsRefreshing(true);
    regenerateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600">No executive summary available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Regenerate Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Executive Summary</h1>
        <button
          onClick={handleRegenerate}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
        >
          {isRefreshing ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* Summary Content */}
      <div className="bg-white rounded-lg shadow p-8">
        <ReactMarkdown className="prose prose-sm max-w-none">
          {summary.summary}
        </ReactMarkdown>
      </div>

      {/* Key Points Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Highlights */}
        <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-600">
          <h3 className="font-semibold text-lg mb-3 text-green-900">Highlights</h3>
          <ul className="space-y-2">
            {summary.highlights.map((highlight: string, idx: number) => (
              <li key={idx} className="text-sm text-green-800 flex items-start">
                <span className="mr-2">✓</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-600">
          <h3 className="font-semibold text-lg mb-3 text-red-900">Risks & Concerns</h3>
          <ul className="space-y-2">
            {summary.risks.map((risk: string, idx: number) => (
              <li key={idx} className="text-sm text-red-800 flex items-start">
                <span className="mr-2">!</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations and Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recommendations */}
        <div className="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h3 className="font-semibold text-lg mb-3 text-blue-900">Recommendations</h3>
          <ol className="space-y-2 list-decimal list-inside">
            {summary.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="text-sm text-blue-800">
                {rec}
              </li>
            ))}
          </ol>
        </div>

        {/* Next Steps */}
        <div className="bg-amber-50 rounded-lg shadow p-6 border-l-4 border-amber-600">
          <h3 className="font-semibold text-lg mb-3 text-amber-900">Next Steps</h3>
          <ol className="space-y-2 list-decimal list-inside">
            {summary.nextSteps.map((step: string, idx: number) => (
              <li key={idx} className="text-sm text-amber-800">
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Meta Information */}
      <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
        <p>Generated: {new Date(summary.generatedAt).toLocaleString()}</p>
        <p className="mt-1">
          This summary is AI-generated and based on current project metrics.
        </p>
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
    └── executiveSummary.ts (NEW)
components/
└── helix/
    └── reports/
        └── ExecutiveSummaryViewer.tsx (NEW)
app/
└── api/
    └── v1/
        └── projects/
            └── [id]/
                └── executive-summary/
                    └── route.ts (NEW)
```

---

## Dependencies
- @anthropic-ai/sdk: ^0.20.0
- react-markdown: ^9.0.0
- @tanstack/react-query: ^5.28.0
- Supabase client: existing

---

## Tech Stack for This Phase
- Next.js 16+ (API routes, Server Components)
- TypeScript
- Anthropic Claude API (summary generation)
- Supabase (data aggregation and storage)
- React Markdown (rendering)
- TailwindCSS v4 (styling)

---

## Acceptance Criteria
1. Claude generates summary synthesizing project metrics and status
2. Summary includes overall status (2-3 sentences)
3. Highlights array contains 3-4 key achievements
4. Risks array contains 2-3 identified concerns
5. Recommendations array contains 2-3 actionable items
6. Next steps array contains 2-3 clear next actions
7. Summary saved as artifact with type 'executive_summary'
8. API endpoint accessible at GET /api/v1/projects/:id/executive-summary
9. POST endpoint regenerates summary on demand
10. UI displays summary with organized highlight/risk/recommendation cards

---

## Testing Instructions
1. Create project with completed phases, test results, and deployments
2. Call GET endpoint, verify summary generated
3. Verify summary contains all expected sections
4. Verify highlights array has 3-4 items
5. Verify risks array has 2-3 items
6. Verify recommendations array has 2-3 items
7. Verify next steps array has 2-3 items
8. Verify summary saved as artifact
9. Call POST endpoint, verify summary regenerated
10. Verify UI displays summary with color-coded sections

---

## Notes for the AI Agent
- CRITICAL: Set ANTHROPIC_API_KEY environment variable in deployment
- Consider caching summaries for 1 hour to avoid excessive API calls
- Future enhancement: customizable summary audience (exec, technical, board)
- Consider adding email notification when summary is regenerated
- Add word count limit to Claude prompts for cost control
