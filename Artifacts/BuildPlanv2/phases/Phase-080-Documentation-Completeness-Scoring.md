# Phase 080 — Documentation Completeness Scoring
## Objective
Implement a numeric scoring system (0-100) that evaluates overall documentation completeness with category-level breakdowns and visual indicators (red/yellow/green). Provide actionable recommendations for improving scores.

## Prerequisites
- Phase 075 — Documentation Inventory AI — Understanding of documentation inventory
- Phase 076 — Gap Detection Engine — Gap analysis data
- Phase 077 — Documentation Review AI — Quality assessment

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 80 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Teams need a clear, quantifiable view of their documentation health. This phase synthesizes inventory, gap detection, and quality review data into a single completeness score with category breakdowns. The score is a metric that teams can track over time and use to make prioritization decisions.

The scoring algorithm weights critical gaps more heavily than nice-to-haves, considers documentation quality, and evaluates coverage across key categories (specs, design, architecture, API docs, etc.). Visual indicators (red/yellow/green) make it easy to understand at a glance whether documentation needs urgent attention or is in good shape.

---
## Detailed Requirements

### 1. Completeness Scoring Engine
#### File: `lib/helix/documentation/completeness-score.ts` (NEW)
Implement scoring algorithm and calculations:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export type ScoreCategory =
  | "specifications"
  | "architecture"
  | "api_documentation"
  | "design_assets"
  | "user_guides"
  | "developer_setup"
  | "deployment_procedures";

export interface CategoryScore {
  category: ScoreCategory;
  score: number; // 0-100
  weight: number; // for weighted total
  gaps: number;
  qualityIssues: number;
  recommendations: string[];
  status: "critical" | "warning" | "healthy" | "excellent";
}

export interface CompletenessScore {
  projectId: string;
  calculatedAt: string;
  overallScore: number; // 0-100
  scoreStatus: "critical" | "warning" | "healthy" | "excellent";
  categoryScores: CategoryScore[];
  weightedBreakdown: Record<string, number>;
  topRecommendations: string[];
  scoreHistory?: Array<{
    date: string;
    score: number;
  }>;
}

export function calculateCategoryScore(
  documentCount: number,
  averageQuality: number, // 0-1
  gapCount: number,
  maxExpectedDocs: number,
  criticalGapCount: number
): number {
  // Base score from document coverage
  const coverageScore = Math.min(
    100,
    (documentCount / maxExpectedDocs) * 100
  );

  // Quality factor (0-100)
  const qualityScore = averageQuality * 100;

  // Gap penalty
  const gapPenalty = gapCount * 5; // Each gap reduces score by 5
  const criticalPenalty = criticalGapCount * 15; // Critical gaps penalize more

  // Weighted calculation
  const score =
    coverageScore * 0.4 +
    qualityScore * 0.4 -
    gapPenalty * 0.1 -
    criticalPenalty * 0.1;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getScoreStatus(
  score: number
): "critical" | "warning" | "healthy" | "excellent" {
  if (score < 40) return "critical";
  if (score < 60) return "warning";
  if (score < 85) return "healthy";
  return "excellent";
}

export function getScoreColor(
  status: "critical" | "warning" | "healthy" | "excellent"
): string {
  const colorMap = {
    critical: "#dc2626",
    warning: "#f59e0b",
    healthy: "#10b981",
    excellent: "#059669",
  };
  return colorMap[status];
}

export async function generateCompletenessScore(
  projectContext: {
    name: string;
    type: string;
    description: string;
  },
  inventoryData: {
    totalFiles: number;
    typeDistribution: Record<string, number>;
  },
  gapReport: {
    gaps: Array<{
      category: string;
      severity: string;
    }>;
  },
  reviewData: {
    overallQualityScore: number;
    actionItems: Array<{
      priority: string;
    }>;
  }
): Promise<CompletenessScore> {
  const criticalGaps = gapReport.gaps.filter(
    (g) => g.severity === "critical"
  ).length;
  const highGaps = gapReport.gaps.filter((g) => g.severity === "high").length;
  const totalGaps = gapReport.gaps.length;

  // Define expected documents by project type
  const expectedDocsByType: Record<string, Record<string, number>> = {
    saas: {
      specifications: 3,
      architecture: 2,
      api_documentation: 2,
      design_assets: 2,
      user_guides: 2,
      developer_setup: 1,
      deployment_procedures: 1,
    },
    "mobile-app": {
      specifications: 3,
      architecture: 2,
      design_assets: 3,
      user_guides: 2,
      developer_setup: 1,
      deployment_procedures: 1,
    },
    "ecommerce": {
      specifications: 3,
      architecture: 2,
      api_documentation: 2,
      design_assets: 2,
      user_guides: 3,
      developer_setup: 1,
      deployment_procedures: 1,
    },
    default: {
      specifications: 2,
      architecture: 1,
      api_documentation: 1,
      design_assets: 1,
      user_guides: 1,
      developer_setup: 1,
      deployment_procedures: 1,
    },
  };

  const expectedDocs =
    expectedDocsByType[projectContext.type] ||
    expectedDocsByType["default"];

  // Calculate category scores
  const categoryScores: CategoryScore[] = Object.entries(expectedDocs).map(
    ([category, expectedCount]) => {
      const hasDocuments = inventoryData.typeDistribution[category] || 0;
      const categoryGaps = gapReport.gaps.filter(
        (g) => g.category === category
      );
      const categoryScore = calculateCategoryScore(
        hasDocuments,
        reviewData.overallQualityScore / 100,
        categoryGaps.length,
        expectedCount,
        categoryGaps.filter((g) => g.severity === "critical").length
      );

      return {
        category: category as ScoreCategory,
        score: categoryScore,
        weight: expectedCount,
        gaps: categoryGaps.length,
        qualityIssues: reviewData.actionItems.filter(
          (item) => item.priority === "high" || item.priority === "critical"
        ).length,
        recommendations: generateCategoryRecommendations(
          category as ScoreCategory,
          categoryScore,
          hasDocuments
        ),
        status: getScoreStatus(categoryScore),
      };
    }
  );

  // Calculate weighted overall score
  const totalWeight = Object.values(expectedDocs).reduce((a, b) => a + b, 0);
  const weightedTotal = categoryScores.reduce((sum, cat) => {
    return sum + (cat.score * cat.weight) / totalWeight;
  }, 0);
  const overallScore = Math.round(weightedTotal);

  return {
    projectId: projectContext.name,
    calculatedAt: new Date().toISOString(),
    overallScore,
    scoreStatus: getScoreStatus(overallScore),
    categoryScores,
    weightedBreakdown: categoryScores.reduce(
      (acc, cat) => {
        acc[cat.category] = cat.score;
        return acc;
      },
      {} as Record<string, number>
    ),
    topRecommendations: categoryScores
      .filter((cat) => cat.score < 70)
      .slice(0, 3)
      .flatMap((cat) => cat.recommendations),
  };
}

function generateCategoryRecommendations(
  category: ScoreCategory,
  score: number,
  documentCount: number
): string[] {
  const recommendations: Record<ScoreCategory, string[]> = {
    specifications:
      score < 70
        ? [
            "Create detailed product specification document",
            "Document all features and user stories",
            "Define acceptance criteria",
          ]
        : [],
    architecture:
      score < 70
        ? [
            "Create architecture diagram and narrative",
            "Document major components and their interactions",
            "Define scalability and performance considerations",
          ]
        : [],
    api_documentation:
      score < 70
        ? [
            "Document all API endpoints with examples",
            "Create authentication and error handling guides",
            "Include code samples in multiple languages",
          ]
        : [],
    design_assets:
      score < 70
        ? [
            "Create design system documentation",
            "Document component library and usage patterns",
            "Include accessibility guidelines",
          ]
        : [],
    user_guides:
      score < 70
        ? [
            "Create end-user documentation",
            "Include tutorials and troubleshooting guides",
            "Create video walkthroughs for key features",
          ]
        : [],
    developer_setup:
      score < 70
        ? [
            "Create development environment setup guide",
            "Document dependencies and versions",
            "Include troubleshooting section",
          ]
        : [],
    deployment_procedures:
      score < 70
        ? [
            "Create deployment runbook",
            "Document rollback procedures",
            "Include monitoring and alerting setup",
          ]
        : [],
  };

  return recommendations[category] || [];
}
