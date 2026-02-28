# Phase 077 — Documentation Review AI
## Objective
Implement an AI-powered documentation review system that analyzes uploaded documents for quality, completeness, and clarity. Produce a structured review report with categorized action items, priority scores, and recommendations similar to the v2 Sample review format.

## Prerequisites
- Phase 075 — Documentation Inventory AI — Classification of uploaded documents
- Phase 076 — Gap Detection Engine — Gap analysis to inform quality review

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 77 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Documentation inventory identifies what exists, gap detection shows what's missing, but quality review assesses how good the existing documentation is. This phase implements a structured review process that examines documentation for content gaps, quality issues, open questions, branding compliance, and organization problems.

The review AI produces actionable feedback organized by category with priority scoring, similar to the v2 Sample review spreadsheet. This gives teams clear guidance on documentation improvements and helps them distinguish between critical quality issues and minor enhancements.

---
## Detailed Requirements

### 1. Documentation Review Service
#### File: `lib/helix/documentation/review.ts` (NEW)
Implement AI-powered documentation quality review:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export type ReviewCategory =
  | "content_gaps"
  | "content_quality"
  | "open_questions"
  | "brand_assets"
  | "organization";

export interface ReviewActionItem {
  id: string;
  category: ReviewCategory;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  affectedDocuments: string[];
  suggestedResolution: string;
  estimatedEffortHours: number;
}

export interface DocumentationReview {
  projectId: string;
  reviewedAt: string;
  totalDocumentsReviewed: number;
  overallQualityScore: number; // 0-100
  actionItems: ReviewActionItem[];
  categoryBreakdown: Record<ReviewCategory, number>;
  whatIsWorking: string[];
  topPriorities: ReviewActionItem[];
  summary: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function reviewDocumentation(
  documents: Array<{
    fileName: string;
    type: string;
    content: string;
  }>,
  projectContext: {
    name: string;
    description: string;
    brandGuidelines?: string;
    targetAudience?: string;
  }
): Promise<DocumentationReview> {
  const docSummaries = documents
    .map(
      (doc) =>
        `**${doc.fileName}** (${doc.type}):\n${doc.content.substring(0, 300)}...`
    )
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Review this project documentation for quality and completeness. Provide structured feedback.

Project: ${projectContext.name}
Description: ${projectContext.description}
Target Audience: ${projectContext.targetAudience || "Technical team"}
Brand Guidelines: ${projectContext.brandGuidelines || "Not provided"}

Documents to Review:
${docSummaries}

Analyze and respond in JSON format with:
1. Overall quality score (0-100)
2. Action items categorized by:
   - content_gaps: Missing information or incomplete sections
   - content_quality: Clarity, accuracy, or writing issues
   - open_questions: Unclear points or areas needing clarification
   - brand_assets: Missing logos, colors, visual standards
   - organization: Structure, navigation, or information architecture issues
3. What's working well (list 3-5 positives)
4. Top 3 priorities to fix

For each action item include:
- category, title, description
- priority (critical/high/medium/low)
- affected document(s)
- suggested resolution
- estimated effort in hours

Respond in JSON:
{
  "overallQualityScore": 72,
  "actionItems": [
    {
      "category": "content_gaps",
      "title": "API endpoint documentation incomplete",
      "description": "...",
      "priority": "high",
      "affectedDocuments": ["API_Spec.md"],
      "suggestedResolution": "...",
      "estimatedEffortHours": 3
    }
  ],
  "whatIsWorking": ["Clear architecture overview", "..."],
  "topPriorities": ["critical_item_title", "..."],
  "summary": "Overall assessment..."
}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const reviewData = jsonMatch ? JSON.parse(jsonMatch[0]) : { actionItems: [] };

  const actionItems: ReviewActionItem[] = (reviewData.actionItems || []).map(
    (item: any, index: number) => ({
      id: `ai-${index}`,
      category: (item.category as ReviewCategory) || "content_quality",
      title: item.title || "Review item",
      description: item.description || "",
      priority: item.priority || "medium",
      affectedDocuments: item.affectedDocuments || [],
      suggestedResolution: item.suggestedResolution || "",
      estimatedEffortHours: item.estimatedEffortHours || 1,
    })
  );

  const categoryBreakdown: Record<ReviewCategory, number> = {
    content_gaps: 0,
    content_quality: 0,
    open_questions: 0,
    brand_assets: 0,
    organization: 0,
  };

  actionItems.forEach((item) => {
    categoryBreakdown[item.category]++;
  });

  const topPriorities = actionItems
    .filter((item) => item.priority === "critical" || item.priority === "high")
    .slice(0, 3);

  return {
    projectId: projectContext.name,
    reviewedAt: new Date().toISOString(),
    totalDocumentsReviewed: documents.length,
    overallQualityScore: reviewData.overallQualityScore || 65,
    actionItems,
    categoryBreakdown,
    whatIsWorking: reviewData.whatIsWorking || [],
    topPriorities,
    summary:
      reviewData.summary ||
      `Reviewed ${documents.length} documents. Found ${actionItems.length} action items.`,
  };
}

export function getActionItemColor(
  priority: ReviewActionItem["priority"]
): string {
  const colorMap = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#f59e0b",
    low: "#10b981",
  };
  return colorMap[priority];
}
