# Phase 082 — Verification Gate With AI Assessment
## Objective
Implement an AI-assisted verification gate for Step 2.4 that evaluates documentation completeness and highlights critical gaps that should block progress versus nice-to-have improvements. Provide AI assessment alongside user verification.

## Prerequisites
- Phase 080 — Documentation Completeness Scoring — Completeness score calculation
- Phase 076 — Gap Detection Engine — Critical gap identification
- Phase 077 — Documentation Review AI — Quality assessment

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 82 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Step 2.4 is the final verification gate where teams confirm their documentation is sufficient before proceeding to planning. This phase adds AI assistance to that gate, providing automated assessment that helps teams make informed decisions about progress.

The AI assessment distinguishes between blocker gaps (things that truly prevent progress) and nice-to-have documentation (things that improve future experience). It provides confidence levels and clear recommendations so human reviewers can make final decisions quickly.

---
## Detailed Requirements

### 1. Verification Gate Assessment Service
#### File: `lib/helix/documentation/verification-gate.ts` (NEW)
Implement AI-powered verification assessment:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export interface VerificationGateAssessment {
  projectId: string;
  assessedAt: string;
  readyToProceed: boolean;
  recommendedAction: "proceed" | "address_blockers" | "address_all_gaps";
  confidence: number; // 0-1
  criticalBlockers: VerificationIssue[];
  highPriorityGaps: VerificationIssue[];
  niceToHaveImprovements: VerificationIssue[];
  reasoning: string;
  estimatedBlockerResolutionHours: number;
}

export interface VerificationIssue {
  title: string;
  description: string;
  blocksProgress: boolean;
  category: string;
  estimatedHours: number;
  quickFix?: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function assessVerificationGate(
  projectContext: {
    name: string;
    type: string;
    description: string;
    techStack: string[];
  },
  completenessScore: {
    overallScore: number;
    categoryScores: Array<{
      category: string;
      score: number;
      gaps: number;
    }>;
  },
  allGaps: Array<{
    category: string;
    requirement: string;
    severity: string;
    impact: string;
  }>,
  userReadinessSelfAssessment?: {
    teamConfidentInDoc: boolean;
    allCriticalAreasDocumented: boolean;
    teamCanProceedToPlanning: boolean;
  }
): Promise<VerificationGateAssessment> {
  const gapsSummary = allGaps
    .map(
      (g) =>
        `[${g.severity.toUpperCase()}] ${g.category}: ${g.requirement} - Impact: ${g.impact}`
    )
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2500,
    messages: [
      {
        role: "user",
        content: `Assess whether a project is ready to proceed from documentation review to planning.

Project: ${projectContext.name}
Type: ${projectContext.type}
Description: ${projectContext.description}
Tech Stack: ${projectContext.techStack.join(", ")}

Overall Completeness Score: ${completenessScore.overallScore}/100
Category Scores:
${completenessScore.categoryScores.map((c) => `- ${c.category}: ${c.score}/100 (${c.gaps} gaps)`).join("\n")}

Identified Gaps:
${gapsSummary}

Team Self-Assessment:
- Team confident in documentation: ${userReadinessSelfAssessment?.teamConfidentInDoc ? "Yes" : "No"}
- All critical areas documented: ${userReadinessSelfAssessment?.allCriticalAreasDocumented ? "Yes" : "No"}
- Team ready to proceed to planning: ${userReadinessSelfAssessment?.teamCanProceedToPlanning ? "Yes" : "No"}

Determine:
1. Is the project ready to proceed? (true/false)
2. What's the recommended action? (proceed/address_blockers/address_all_gaps)
3. What are TRUE blockers (prevent progress)?
4. What are high-priority items (should do soon)?
5. What are nice-to-haves (can do later)?
6. Overall confidence in assessment (0-1)

Guidelines for blockers:
- Critical gaps in architecture/design that prevent development
- Missing requirements that create uncertainty
- Undefined core business logic or workflows
- Missing security/compliance specs for regulated projects
- Gaps are NOT blockers if: documentation can be created in parallel, team understands the area well, or it's administrative

Respond in JSON:
{
  "readyToProceed": true,
  "recommendedAction": "proceed",
  "confidence": 0.85,
  "criticalBlockers": [
    {
      "title": "Architecture not documented",
      "description": "Team needs to understand system architecture before backend development",
      "blocksProgress": true,
      "category": "architecture",
      "estimatedHours": 4,
      "quickFix": "Create simple architecture diagram showing main components"
    }
  ],
  "highPriorityGaps": [...],
  "niceToHaveImprovements": [...],
  "reasoning": "Completeness score of 72 is adequate. Critical gaps in X are blockers, but other areas can be filled in parallel with planning.",
  "estimatedBlockerResolutionHours": 8
}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const assessmentData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    projectId: projectContext.name,
    assessedAt: new Date().toISOString(),
    readyToProceed: assessmentData.readyToProceed || false,
    recommendedAction: assessmentData.recommendedAction || "address_blockers",
    confidence: assessmentData.confidence || 0.5,
    criticalBlockers: assessmentData.criticalBlockers || [],
    highPriorityGaps: assessmentData.highPriorityGaps || [],
    niceToHaveImprovements: assessmentData.niceToHaveImprovements || [],
    reasoning:
      assessmentData.reasoning ||
      "Unable to assess readiness. Please review gaps manually.",
    estimatedBlockerResolutionHours:
      assessmentData.estimatedBlockerResolutionHours || 0,
  };
}

export function determineGateStatus(
  assessment: VerificationGateAssessment
): "blocked" | "proceed_with_caution" | "ready" {
  if (assessment.criticalBlockers.length > 0) return "blocked";
  if (assessment.recommendedAction === "address_blockers") return "proceed_with_caution";
  return "ready";
}

export function calculateTimeToUnblock(
  assessment: VerificationGateAssessment
): number {
  return assessment.estimatedBlockerResolutionHours;
}
