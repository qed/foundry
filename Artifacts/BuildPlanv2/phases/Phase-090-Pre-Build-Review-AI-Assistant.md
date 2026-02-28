# Phase 090 — Pre-Build Review AI Assistant
## Objective
Implement AI-powered review of the complete repository setup to verify consistency, detect stale placeholders, ensure BuildPlan references correct paths, and confirm phase specifications are complete.

## Prerequisites
- Phase 087 — Downloadable Ready-Made Project Folder — Complete project structure
- Phase 088 — Git Initialization Guide Generator — Git setup ready

## Epic Context
**Epic:** 10 — Repo Setup Automation — Steps 4.1-4.4
**Phase:** 90 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Before teams start development, the repository setup should be validated. This phase uses Claude to review the generated repository files for consistency, detect unreplaced placeholders, verify BuildPlan structure, and ensure all phase specifications have required sections.

The AI review catches common issues automatically (like forgotten placeholders in nested files) and provides clear warnings before development begins.

---
## Detailed Requirements

### 1. Pre-Build Review Service
#### File: `lib/helix/repo-setup/pre-build-review.ts` (NEW)
AI-powered repository validation:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export interface PreBuildReviewIssue {
  severity: "critical" | "warning" | "info";
  category:
    | "placeholder"
    | "structure"
    | "consistency"
    | "specification"
    | "reference";
  file: string;
  title: string;
  description: string;
  suggestion: string;
  lineNumbers?: number[];
}

export interface PreBuildReviewResult {
  projectName: string;
  reviewedAt: string;
  totalFilesChecked: number;
  issues: PreBuildReviewIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  readyToBuild: boolean;
  summary: string;
  recommendations: string[];
}

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function performPreBuildReview(
  projectName: string,
  files: Array<{
    path: string;
    content: string;
  }>,
  projectConfig: {
    briefDescription: string;
    techStack: string[];
    authorName: string;
  }
): Promise<PreBuildReviewResult> {
  // Prepare file summaries for analysis
  const fileSummaries = files
    .map(
      (f) =>
        `**${f.path}** (${f.content.length} bytes)\n${f.content.substring(0, 300)}...`
    )
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Review this project repository setup for issues before development starts.

Project: ${projectName}
Description: ${projectConfig.briefDescription}
Tech Stack: ${projectConfig.techStack.join(", ")}
Author: ${projectConfig.authorName}

Files in repository:
${fileSummaries}

Check for:
1. Unreplaced placeholders (like [PROJECT_NAME], {{PLACEHOLDER}})
2. Missing critical files
3. Consistency issues (e.g., different project names in different files)
4. BuildPlan structure problems
5. Path references that don't match actual file structure
6. Incomplete sections in phase specifications
7. Configuration errors

For each issue, provide:
- Severity (critical/warning/info)
- Category
- File path
- Title and description
- Specific suggestion for fix

Respond in JSON:
{
  "issues": [
    {
      "severity": "critical",
      "category": "placeholder",
      "file": "CLAUDE.md",
      "title": "Unreplaced placeholder",
      "description": "PROJECT_NAME appears unreplaced in line 15",
      "suggestion": "Replace [PROJECT_NAME] with project name"
    }
  ],
  "hasConsistencyIssues": false,
  "hasMissingFiles": false,
  "hasStalePlaceholders": true,
  "readyToBuild": false,
  "summary": "Repository has unreplaced placeholders that should be fixed before development.",
  "topRecommendations": ["Fix placeholders before development starts", "..."]
}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const reviewData = jsonMatch ? JSON.parse(jsonMatch[0]) : { issues: [] };

  const issues: PreBuildReviewIssue[] = (reviewData.issues || []).map(
    (issue: any) => ({
      severity: issue.severity || "info",
      category: issue.category || "general",
      file: issue.file || "unknown",
      title: issue.title || "Issue",
      description: issue.description || "",
      suggestion: issue.suggestion || "",
    })
  );

  const criticalCount = issues.filter(
    (i) => i.severity === "critical"
  ).length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return {
    projectName,
    reviewedAt: new Date().toISOString(),
    totalFilesChecked: files.length,
    issues,
    criticalCount,
    warningCount,
    infoCount,
    readyToBuild: criticalCount === 0,
    summary:
      reviewData.summary ||
      `Reviewed ${files.length} files. Found ${issues.length} potential issues.`,
    recommendations: reviewData.topRecommendations || [],
  };
}

export async function validateNoPlaceholders(
  content: string
): Promise<{
  hasPlaceholders: boolean;
  placeholders: string[];
}> {
  const placeholderPatterns = [
    /\[([A-Z_]+)\]/g,
    /\{\{([A-Z_]+)\}\}/g,
    /\{([A-Z_]+)\}/g,
  ];

  const foundPlaceholders = new Set<string>();

  placeholderPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      foundPlaceholders.add(match[1]);
    }
  });

  return {
    hasPlaceholders: foundPlaceholders.size > 0,
    placeholders: Array.from(foundPlaceholders),
  };
}

export async function validateBuildPlanStructure(
  files: Array<{
    path: string;
    content: string;
  }>
): Promise<{
  isValid: boolean;
  issues: string[];
  missingFiles: string[];
}> {
  const requiredFiles = [
    "BuildPlan/00-Building-Brief-Summary.md",
    "BuildPlan/roadmap.md",
    "BuildPlan/alignment.md",
    "BuildPlan/summary.md",
  ];

  const filePaths = files.map((f) => f.path);
  const missingFiles = requiredFiles.filter((f) => !filePaths.includes(f));

  const issues: string[] = [];

  if (missingFiles.length > 0) {
    issues.push(
      `Missing required BuildPlan files: ${missingFiles.join(", ")}`
    );
  }

  // Check that all phase files are in Phases/ folder
  const phaseFiles = files.filter((f) => f.path.includes("Phase-"));
  const misplacedPhases = phaseFiles.filter(
    (f) => !f.path.includes("BuildPlan/Phases/")
  );

  if (misplacedPhases.length > 0) {
    issues.push(
      `Phase files should be in BuildPlan/Phases/ folder: ${misplacedPhases.map((f) => f.path).join(", ")}`
    );
  }

  return {
    isValid: missingFiles.length === 0 && misplacedPhases.length === 0,
    issues,
    missingFiles,
  };
}

export function generateReviewReport(
  review: PreBuildReviewResult
): string {
  let report = `# Pre-Build Review Report

**Project:** ${review.projectName}
**Reviewed:** ${review.reviewedAt}
**Status:** ${review.readyToBuild ? "✅ READY TO BUILD" : "⚠️ NEEDS FIXES"}

## Summary
${review.summary}

## Issues Found
- 🔴 Critical: ${review.criticalCount}
- 🟡 Warnings: ${review.warningCount}
- 🔵 Info: ${review.infoCount}

## Issues by Category

`;

  const categories = new Map<string, PreBuildReviewIssue[]>();
  review.issues.forEach((issue) => {
    if (!categories.has(issue.category)) {
      categories.set(issue.category, []);
    }
    categories.get(issue.category)!.push(issue);
  });

  categories.forEach((issues, category) => {
    report += `### ${category.replace(/_/g, " ")}\n\n`;
    issues.forEach((issue) => {
      const icon =
        issue.severity === "critical"
          ? "🔴"
          : issue.severity === "warning"
            ? "🟡"
            : "🔵";
      report += `${icon} **${issue.title}** (${issue.file})\n`;
      report += `${issue.description}\n`;
      report += `**Fix:** ${issue.suggestion}\n\n`;
    });
  });

  report += `## Recommendations\n`;
  review.recommendations.forEach((rec, i) => {
    report += `${i + 1}. ${rec}\n`;
  });

  report += `\n## Next Steps\n`;
  if (review.readyToBuild) {
    report += `✅ Repository is ready for development. Proceed to Phase 001.`;
  } else {
    report += `⚠️ Please fix the critical issues above before starting development.`;
  }

  return report;
}
