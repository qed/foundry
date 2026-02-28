# Phase 120 — Feedback Integration To Insights Lab

## Objective
Route external feedback to Insights Lab and link it to Helix project context. When feedback references a Helix project, create feedback_submissions entries with Helix metadata. Enable stakeholders to provide insights that influence Helix project direction.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Sync infrastructure and metadata linking established
- Phase 116 — Project Brief To Hall Idea — Project linking pattern understood

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 120 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Insights Lab collects feedback from users and stakeholders about products and features. Helix Mode needs to capture feedback that relates to ongoing Helix projects—whether it's user feedback on deployed features, team observations, or stakeholder comments. This phase creates a feedback ingestion channel that links Insights Lab submissions back to Helix projects, enabling product teams to feed real-world insights into future project iterations.

---

## Detailed Requirements

### 1. Feedback Linking Service
#### File: `src/lib/feedback/feedback-linker.ts` (NEW)
Match incoming feedback to Helix projects and create linked feedback submissions.

```typescript
// src/lib/feedback/feedback-linker.ts

import { createClient } from '@/lib/supabase';

export interface FeedbackLinkingResult {
  feedback_submission_id: string;
  helix_project_id: string;
  link_confidence: 'high' | 'medium' | 'low';
  matched_keywords: string[];
}

/**
 * Detect if feedback references a Helix project by keyword matching
 */
export function detectProjectReference(
  feedbackContent: string,
  projectBrief: { title: string; keywords?: string[] }
): { confidence: 'high' | 'medium' | 'low'; matched: string[] } {
  const content = feedbackContent.toLowerCase();
  const briefTitle = projectBrief.title.toLowerCase();
  const keywordList = projectBrief.keywords || [];

  const matched: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Check for exact project name
  if (content.includes(briefTitle)) {
    matched.push(briefTitle);
    confidence = 'high';
  }

  // Check for keywords
  for (const keyword of keywordList) {
    if (content.includes(keyword.toLowerCase())) {
      matched.push(keyword);
      if (confidence === 'low') {
        confidence = 'medium';
      }
    }
  }

  // Check for common project reference patterns
  const projectPatterns = [
    /project:\s*([^,\n]+)/gi,
    /regarding\s+([^,\n]+)/gi,
    /about\s+([^,\n]+)/gi,
  ];

  for (const pattern of projectPatterns) {
    const patternMatches = feedbackContent.match(pattern);
    if (patternMatches) {
      matched.push(...patternMatches);
    }
  }

  return { confidence, matched };
}

/**
 * Create feedback submission linked to Helix project
 */
export async function createLinkedFeedbackSubmission(
  feedbackContent: string,
  feedbackType: 'bug' | 'feature-request' | 'observation' | 'improvement' | 'other',
  projectId: string,
  userId: string,
  confidence: 'high' | 'medium' | 'low',
  matchedKeywords: string[]
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('feedback_submissions')
    .insert({
      content: feedbackContent,
      type: feedbackType,
      helix_project_id: projectId,
      created_by: userId,
      created_at: new Date().toISOString(),
      metadata: {
        auto_linked: true,
        link_confidence: confidence,
        matched_keywords: matchedKeywords,
        source: 'insights_lab',
      },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create feedback submission: ${error.message}`);
  }

  return data.id;
}

/**
 * Auto-detect and link feedback to projects
 */
export async function autoLinkFeedbackToProjects(
  feedbackContent: string,
  feedbackType: string,
  userId: string
): Promise<FeedbackLinkingResult[]> {
  const supabase = createClient();
  const results: FeedbackLinkingResult[] = [];

  try {
    // Get all active Helix projects with briefs
    const { data: projects } = await supabase
      .from('helix_projects')
      .select('id, project_brief')
      .eq('status', 'active');

    if (!projects) return results;

    for (const project of projects) {
      const { confidence, matched } = detectProjectReference(
        feedbackContent,
        {
          title: project.project_brief?.project_name || '',
          keywords: project.project_brief?.keywords || [],
        }
      );

      // Only create feedback submission if confidence is medium or high
      if (confidence !== 'low') {
        try {
          const submissionId = await createLinkedFeedbackSubmission(
            feedbackContent,
            feedbackType as any,
            project.id,
            userId,
            confidence,
            matched
          );

          results.push({
            feedback_submission_id: submissionId,
            helix_project_id: project.id,
            link_confidence: confidence,
            matched_keywords: matched,
          });

          console.log(
            `[Sync] Feedback auto-linked to project ${project.id} with ${confidence} confidence`
          );
        } catch (error) {
          console.error(`Error linking feedback to project ${project.id}:`, error);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('[Sync Error] Auto-link feedback to projects failed:', error);
    throw error;
  }
}
```

### 2. Feedback Submission Model Extension
#### File: `src/lib/models/feedback-submission.ts` (UPDATED)
Add Helix project linking fields.

```typescript
// src/lib/models/feedback-submission.ts (UPDATED)

export interface FeedbackSubmission {
  id: string;
  project_id?: string;
  content: string;
  type: 'bug' | 'feature-request' | 'observation' | 'improvement' | 'other';
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';

  // Helix integration fields
  helix_project_id?: string; // Links to Helix project
  helix_stage_id?: string; // Optional: links to specific Helix stage
  auto_linked?: boolean; // Was this automatically linked?

  // Standard fields
  created_by: string;
  created_at: string;
  updated_at: string;
  upvotes?: number;
  metadata?: {
    auto_linked?: boolean;
    link_confidence?: 'high' | 'medium' | 'low';
    matched_keywords?: string[];
    source?: string;
    [key: string]: any;
  };
}

/**
 * Get feedback submissions for Helix project
 */
export async function getFeedbackForProject(
  projectId: string,
  limit: number = 50
): Promise<FeedbackSubmission[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('feedback_submissions')
    .select('*')
    .eq('helix_project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get high-confidence feedback (likely relevant)
 */
export async function getHighConfidenceFeedback(
  projectId: string
): Promise<FeedbackSubmission[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('feedback_submissions')
    .select('*')
    .eq('helix_project_id', projectId)
    .eq('metadata->link_confidence', '"high"')
    .order('created_at', { ascending: false });

  return data || [];
}
```

### 3. Feedback Ingestion Endpoint
#### File: `src/app/api/sync/ingest-feedback/route.ts` (NEW)
API endpoint for creating feedback and auto-linking to Helix projects.

```typescript
// src/app/api/sync/ingest-feedback/route.ts

import { createClient } from '@/lib/supabase';
import { autoLinkFeedbackToProjects } from '@/lib/feedback/feedback-linker';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, type, userId, autoLink } = body;

  if (!content || !userId) {
    return NextResponse.json(
      { error: 'Missing content or userId' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  try {
    // Create feedback submission in Insights Lab
    const { data: feedback, error } = await supabase
      .from('feedback_submissions')
      .insert({
        content,
        type: type || 'observation',
        created_by: userId,
        created_at: new Date().toISOString(),
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    let linkedProjects = [];
    if (autoLink) {
      // Auto-link to Helix projects
      linkedProjects = await autoLinkFeedbackToProjects(content, type, userId);
    }

    return NextResponse.json({
      success: true,
      feedback_id: feedback.id,
      linked_to_projects: linkedProjects.length,
      projects: linkedProjects,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### 4. Feedback Panel in Helix Dashboard
#### File: `src/app/helix/projects/[projectId]/feedback-panel.tsx` (NEW)
Display linked feedback submissions on Helix project dashboard.

```typescript
// src/app/helix/projects/[projectId]/feedback-panel.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { FeedbackSubmission } from '@/lib/models/feedback-submission';

interface FeedbackPanelProps {
  projectId: string;
}

export function FeedbackPanel({ projectId }: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    highConfidence: 0,
  });

  useEffect(() => {
    async function loadFeedback() {
      const supabase = createClient();

      const { data: submissions } = await supabase
        .from('feedback_submissions')
        .select('*')
        .eq('helix_project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (submissions) {
        setFeedback(submissions);

        // Calculate stats
        const byType: Record<string, number> = {};
        let highConfidenceCount = 0;

        for (const sub of submissions) {
          byType[sub.type] = (byType[sub.type] || 0) + 1;
          if (sub.metadata?.link_confidence === 'high') {
            highConfidenceCount++;
          }
        }

        setStats({
          total: submissions.length,
          byType,
          highConfidence: highConfidenceCount,
        });
      }

      setLoading(false);
    }

    loadFeedback();
  }, [projectId]);

  if (loading) return <div className="p-4">Loading feedback...</div>;

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold mb-4">Linked Feedback</h3>

      {stats.total === 0 ? (
        <p className="text-sm text-gray-600">
          No feedback linked to this project yet. Users can submit feedback in Insights Lab
          that will be auto-linked if it references this project.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Feedback</p>
              <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-gray-600">High Confidence</p>
              <p className="text-2xl font-bold text-green-800">{stats.highConfidence}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <p className="text-sm text-gray-600">Feedback Types</p>
              <p className="text-2xl font-bold text-yellow-800">{Object.keys(stats.byType).length}</p>
            </div>
          </div>

          <div className="space-y-3">
            {feedback.map(sub => (
              <div
                key={sub.id}
                className="border rounded p-4 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded font-semibold ${
                        sub.type === 'bug'
                          ? 'bg-red-200 text-red-800'
                          : sub.type === 'feature-request'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {sub.type}
                    </span>
                    {sub.metadata?.link_confidence && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          sub.metadata.link_confidence === 'high'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {sub.metadata.link_confidence} match
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm text-gray-800 line-clamp-2">{sub.content}</p>

                {sub.metadata?.matched_keywords && sub.metadata.matched_keywords.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {sub.metadata.matched_keywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <a
            href={`/open/insights-lab?project=${projectId}`}
            className="text-sm text-blue-600 hover:underline block mt-4"
          >
            View all feedback in Insights Lab →
          </a>
        </>
      )}
    </div>
  );
}
```

### 5. Database Migrations
#### File: `supabase/migrations/feedback_submissions_helix_sync.sql` (NEW)
Add Helix-related fields to feedback_submissions table.

```sql
-- supabase/migrations/feedback_submissions_helix_sync.sql

-- Add Helix linking columns
ALTER TABLE feedback_submissions
ADD COLUMN IF NOT EXISTS helix_project_id UUID REFERENCES helix_projects(id),
ADD COLUMN IF NOT EXISTS helix_stage_id UUID,
ADD COLUMN IF NOT EXISTS auto_linked BOOLEAN DEFAULT FALSE;

-- Create index for querying feedback by project
CREATE INDEX IF NOT EXISTS idx_feedback_helix_project
ON feedback_submissions(helix_project_id);

-- Create index for high-confidence feedback
CREATE INDEX IF NOT EXISTS idx_feedback_high_confidence
ON feedback_submissions USING gin(metadata)
WHERE metadata->>'link_confidence' = 'high';
```

---

## File Structure
```
src/lib/feedback/
├── feedback-linker.ts (NEW)

src/lib/models/
├── feedback-submission.ts (UPDATED)

src/app/api/sync/
├── ingest-feedback/ (NEW)
│   └── route.ts (NEW)

src/app/helix/projects/[projectId]/
├── feedback-panel.tsx (NEW)

supabase/migrations/
└── feedback_submissions_helix_sync.sql (NEW)
```

---

## Dependencies
- Phase 115 sync infrastructure
- helix_projects table with project_brief metadata
- feedback_submissions table extended with Helix fields
- Insights Lab feedback submission system

---

## Tech Stack for This Phase
- TypeScript for feedback linking logic
- Keyword/pattern matching for project detection
- Supabase for data persistence
- React components for dashboard display

---

## Acceptance Criteria
1. detectProjectReference matches project name in feedback content
2. detectProjectReference extracts keywords from project brief
3. Confidence levels are assigned: high (exact match), medium (keywords), low (no match)
4. createLinkedFeedbackSubmission creates feedback_submissions entry with helix_project_id
5. Metadata includes auto_linked, link_confidence, and matched_keywords
6. autoLinkFeedbackToProjects iterates active Helix projects and links applicable feedback
7. Only medium/high confidence feedback is linked automatically
8. FeedbackPanel displays total feedback count and high-confidence count
9. Feedback items show type badge, confidence badge, and matched keywords
10. API endpoint POST /api/sync/ingest-feedback accepts content, type, userId, autoLink

---

## Testing Instructions
1. Create a Helix project with brief containing project name and keywords
2. Call detectProjectReference with feedback mentioning project name
3. Verify confidence='high' is returned
4. Call detectProjectReference with keyword mentions only
5. Verify confidence='medium' is returned
6. Create feedback submission via API with autoLink=true
7. Check feedback_submissions table for helix_project_id
8. Verify metadata includes link_confidence and matched_keywords
9. Load FeedbackPanel for Helix project
10. Verify all linked feedback is displayed with correct badges

---

## Notes for the AI Agent
- Keyword detection should be case-insensitive and flexible
- Don't be too aggressive with auto-linking; prefer high/medium confidence
- Allow manual linking if auto-link confidence is low
- Preserve all matched_keywords for traceability
- Consider privacy: filter feedback visibility based on project permissions
- This is a feedback ingestion channel; don't create duplicate feedback
