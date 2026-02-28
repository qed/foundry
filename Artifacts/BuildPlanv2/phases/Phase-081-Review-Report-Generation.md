# Phase 081 — Review Report Generation
## Objective
Generate comprehensive documentation review reports in markdown format with action items, priorities, strengths, and top recommendations. Reports should be exportable and formatted similarly to the v2 Sample review spreadsheet but in markdown.

## Prerequisites
- Phase 077 — Documentation Review AI — Structured review data with action items
- Phase 080 — Documentation Completeness Scoring — Score data for context

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 81 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Review findings from Phase 077 need to be communicated clearly to the team. This phase generates professional, exportable reports that summarize the documentation review in a format teams can share, reference, and work from. The report includes what's working well, what needs improvement, prioritized action items, and clear next steps.

The markdown format makes reports easy to version control, embed in project repositories, and integrate with documentation. Teams can export reports, add them to their BuildPlan, and track completion of action items over time.

---
## Detailed Requirements

### 1. Report Generation Service
#### File: `lib/helix/documentation/report-generator.ts` (NEW)
Implement report generation logic:

```typescript
import { DocumentationReview } from "./review";
import { CompletenessScore } from "./completeness-score";
import { GapDetectionReport } from "./gap-detection";

export interface ReviewReport {
  title: string;
  projectName: string;
  generatedAt: string;
  markdown: string;
  sections: ReportSection[];
}

export interface ReportSection {
  heading: string;
  content: string;
  order: number;
}

export function generateReviewMarkdown(
  projectName: string,
  review: DocumentationReview,
  completenessScore: CompletenessScore,
  gapReport: GapDetectionReport
): ReviewReport {
  const generatedAt = new Date().toISOString().split("T")[0];
  const sections: ReportSection[] = [];

  // Executive Summary
  sections.push({
    heading: "Executive Summary",
    content: `**Project:** ${projectName}
**Review Date:** ${generatedAt}
**Overall Quality Score:** ${review.overallQualityScore}/100
**Overall Completeness Score:** ${completenessScore.overallScore}/100
**Total Documents Reviewed:** ${review.totalDocumentsReviewed}

${review.summary}`,
    order: 1,
  });

  // What's Working Well
  sections.push({
    heading: "What's Working Well",
    content:
      review.whatIsWorking.length > 0
        ? review.whatIsWorking.map((item) => `- ${item}`).join("\n")
        : "- Documentation structure is organized\n- Basic documentation exists\n- Project team has documented key decisions",
    order: 2,
  });

  // Critical Gaps
  sections.push({
    heading: "Critical Gaps & Blockers",
    content: formatGapsTable(gapReport.blockingProgress),
    order: 3,
  });

  // High Priority Action Items
  const criticalAndHighItems = review.actionItems.filter(
    (item) => item.priority === "critical" || item.priority === "high"
  );

  sections.push({
    heading: "High Priority Action Items",
    content: formatActionItemsTable(criticalAndHighItems),
    order: 4,
  });

  // Medium Priority Items
  const mediumItems = review.actionItems.filter(
    (item) => item.priority === "medium"
  );

  if (mediumItems.length > 0) {
    sections.push({
      heading: "Medium Priority Items",
      content: formatActionItemsTable(mediumItems),
      order: 5,
    });
  }

  // Category Breakdown
  sections.push({
    heading: "Review Breakdown by Category",
    content: formatCategoryBreakdown(review.categoryBreakdown),
    order: 6,
  });

  // Completeness by Category
  sections.push({
    heading: "Completeness Score by Category",
    content: formatCompletenessBreakdown(completenessScore.categoryScores),
    order: 7,
  });

  // Top Priorities
  sections.push({
    heading: "Top 3 Priorities",
    content: formatTopPriorities(review.topPriorities),
    order: 8,
  });

  // Recommendations
  sections.push({
    heading: "Recommendations",
    content: review.recommendations
      .slice(0, 5)
      .map((rec, i) => `${i + 1}. ${rec}`)
      .join("\n"),
    order: 9,
  });

  // Next Steps
  sections.push({
    heading: "Next Steps",
    content: `1. Review high priority items above with team
2. Create tracking issue(s) for critical gaps
3. Assign owners to action items
4. Schedule follow-up review in 1-2 weeks
5. Track progress on completeness score`,
    order: 10,
  });

  const markdown = sections
    .sort((a, b) => a.order - b.order)
    .map((s) => `## ${s.heading}\n\n${s.content}`)
    .join("\n\n---\n\n");

  return {
    title: `${projectName} - Documentation Review Report`,
    projectName,
    generatedAt,
    markdown: `# Documentation Review Report\n\n${markdown}`,
    sections,
  };
}

function formatActionItemsTable(items: any[]): string {
  if (items.length === 0) return "No items in this category.";

  const tableRows = items.map((item) => {
    const priority =
      item.priority.charAt(0).toUpperCase() + item.priority.slice(1);
    const estimatedEffort = item.estimatedEffortHours || "TBD";
    return `| ${item.title} | ${item.category || "General"} | ${priority} | ${estimatedEffort}h | ${item.suggestedResolution} |`;
  });

  return `| Title | Category | Priority | Effort | Resolution |
|-------|----------|----------|--------|-----------|
${tableRows.join("\n")}`;
}

function formatGapsTable(gaps: any[]): string {
  if (gaps.length === 0) return "No critical gaps identified.";

  const tableRows = gaps.map((gap) => {
    return `| ${gap.requirement} | ${gap.impact} | ${gap.suggestedDocType} |`;
  });

  return `| Requirement | Impact | Suggested Doc Type |
|------------|--------|-------------------|
${tableRows.join("\n")}`;
}

function formatCategoryBreakdown(breakdown: Record<string, number>): string {
  const entries = Object.entries(breakdown)
    .map(([category, count]) => {
      const categoryName = category
        .replace(/_/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return `- **${categoryName}:** ${count} items`;
    });

  return entries.join("\n");
}

function formatCompletenessBreakdown(scores: any[]): string {
  const statusMap = {
    critical: "🔴 Critical",
    warning: "🟡 Warning",
    healthy: "🟢 Healthy",
    excellent: "✅ Excellent",
  };

  return scores
    .map((score) => {
      const status = statusMap[score.status] || score.status;
      return `- **${score.category.replace(/_/g, " ")}:** ${score.score}/100 ${status}`;
    })
    .join("\n");
}

function formatTopPriorities(items: any[]): string {
  return items
    .slice(0, 3)
    .map((item, i) => {
      return `### ${i + 1}. ${item.title}
${item.description}

**Affected Documents:** ${item.affectedDocuments?.join(", ") || "Multiple"}
**Suggested Resolution:** ${item.suggestedResolution}`;
    })
    .join("\n\n");
}

export async function exportReportAsMarkdown(
  report: ReviewReport
): Promise<string> {
  return report.markdown;
}

export async function exportReportAsJson(report: ReviewReport): Promise<string> {
  return JSON.stringify(report, null, 2);
}
