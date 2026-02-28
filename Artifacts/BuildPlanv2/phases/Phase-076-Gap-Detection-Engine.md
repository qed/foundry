# Phase 076 — Gap Detection Engine
## Objective
Implement an AI-powered gap detection system that compares uploaded documentation against project brief requirements to identify missing, incomplete, or insufficient documentation. Produce a detailed gap report with severity levels for each identified issue.

## Prerequisites
- Phase 075 — Documentation Inventory AI — Understanding of document types and content
- Phase 001 — Project Brief Capture — Project requirements captured in Helix flow

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 76 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
With documentation inventory complete, we now perform a systematic gap analysis. The gap detection engine compares what users have uploaded against what their project brief specifies they need. This identifies areas where documentation is missing, incomplete, or insufficient before proceeding to detailed review.

The engine produces a severity-scored report that helps teams prioritize documentation work. Critical gaps (blocking progress) are distinguished from nice-to-have documentation. This phase feeds into gap resolution and the documentation completeness scoring in subsequent phases.

---
## Detailed Requirements

### 1. Gap Analysis Service
#### File: `lib/helix/documentation/gap-detection.ts` (NEW)
Implement intelligent gap detection against project brief:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export interface DocumentationGap {
  category: string;
  requirement: string;
  severity: "critical" | "high" | "medium" | "low";
  impact: string;
  currentStatus: "missing" | "incomplete" | "insufficient";
  suggestedDocType: string;
  estimatedEffortHours: number;
}

export interface GapDetectionReport {
  projectId: string;
  generatedAt: string;
  briefSummary: string;
  totalGapsIdentified: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  gaps: DocumentationGap[];
  recommendations: string[];
  blockingProgress: DocumentationGap[];
  niceToHave: DocumentationGap[];
}

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function detectDocumentationGaps(
  briefContent: string,
  uploadedDocInventory: {
    fileName: string;
    type: string;
    suggestedCategory: string;
  }[],
  projectContext: {
    name: string;
    description: string;
    techStack: string[];
  }
): Promise<GapDetectionReport> {
  const uploadedDocs = uploadedDocInventory
    .map((doc) => `- ${doc.fileName} (${doc.type}, categorized as: ${doc.suggestedCategory})`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a technical documentation expert. Analyze this project and identify documentation gaps.

Project Name: ${projectContext.name}
Project Description: ${projectContext.description}
Tech Stack: ${projectContext.techStack.join(", ")}

Project Brief Requirements:
${briefContent}

Currently Uploaded Documents:
${uploadedDocs || "(No documents uploaded yet)"}

Identify all critical documentation gaps. For each gap, provide:
1. Documentation category/type needed
2. Specific requirement it addresses
3. Severity (critical = blocks progress, high = important, medium = beneficial, low = nice-to-have)
4. Impact of the gap
5. Current status (missing/incomplete/insufficient)
6. Suggested document type to create
7. Estimated hours to create

Respond in JSON format:
{
  "gaps": [
    {
      "category": "Architecture Documentation",
      "requirement": "System architecture diagram",
      "severity": "critical",
      "impact": "Cannot start backend development without architecture clarity",
      "currentStatus": "missing",
      "suggestedDocType": "Architecture diagram with narrative",
      "estimatedEffortHours": 4
    }
  ],
  "recommendations": ["First create critical architecture doc...", "..."],
  "blockingCount": 3,
  "niceToHaveCount": 5
}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const gapData = jsonMatch ? JSON.parse(jsonMatch[0]) : { gaps: [] };

  const gaps: DocumentationGap[] = (gapData.gaps || []).map((gap: any) => ({
    category: gap.category || "Uncategorized",
    requirement: gap.requirement || "",
    severity: gap.severity || "medium",
    impact: gap.impact || "",
    currentStatus: gap.currentStatus || "missing",
    suggestedDocType: gap.suggestedDocType || "",
    estimatedEffortHours: gap.estimatedEffortHours || 2,
  }));

  const severityBreakdown = {
    critical: gaps.filter((g) => g.severity === "critical").length,
    high: gaps.filter((g) => g.severity === "high").length,
    medium: gaps.filter((g) => g.severity === "medium").length,
    low: gaps.filter((g) => g.severity === "low").length,
  };

  return {
    projectId: projectContext.name,
    generatedAt: new Date().toISOString(),
    briefSummary: briefContent.substring(0, 500),
    totalGapsIdentified: gaps.length,
    severityBreakdown,
    gaps,
    recommendations: gapData.recommendations || [],
    blockingProgress: gaps.filter((g) => g.severity === "critical"),
    niceToHave: gaps.filter((g) => g.severity === "low"),
  };
}

export function calculateGapPriority(gap: DocumentationGap): number {
  const severityScores = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
  };
  return severityScores[gap.severity];
}
