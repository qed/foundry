# Phase 085 — Auto Find-and-Replace Placeholders
## Objective
Implement automatic placeholder detection and auto-filling from project context. Show users before/after preview for each replacement and allow selective acceptance or manual adjustment.

## Prerequisites
- Phase 084 — Repo Template Customization Engine — Template file loading
- Phase 001 — Project Brief Capture — Project name and context
- Phase 003 — Tech Stack Selection — Technology selections

## Epic Context
**Epic:** 10 — Repo Setup Automation — Steps 4.1-4.4
**Phase:** 85 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Placeholders are the tedious part of template customization. This phase automates finding all placeholders and pre-fills them from data the user has already provided (project name from Step 1.1, tech stack from Step 0.3, etc.). It shows before/after for each replacement so users can verify accuracy before applying.

---
## Detailed Requirements

### 1. Placeholder Detection and Auto-Fill Service
#### File: `lib/helix/repo-setup/placeholder-handler.ts` (NEW)
Intelligent placeholder detection and substitution:

```typescript
export interface PlaceholderReplacement {
  placeholder: string;
  foundIn: string[]; // file paths
  occurrences: number;
  suggestedValue: string;
  sourceData: string; // where the suggestion comes from
  preview: {
    before: string;
    after: string;
  };
  isApproved: boolean;
}

export interface PlaceholderAnalysis {
  totalPlaceholdersFound: number;
  filesTouched: number;
  replacements: PlaceholderReplacement[];
  missingValues: string[]; // placeholders without suggestions
  readyToApply: boolean;
}

export async function analyzeAllPlaceholders(
  files: Array<{
    path: string;
    content: string;
  }>,
  projectContext: {
    name: string;
    description: string;
    brief: string;
    techStack: string[];
    author?: {
      name: string;
      email: string;
    };
  }
): Promise<PlaceholderAnalysis> {
  const allPlaceholders = new Map<string, Set<string>>();
  const placeholderRegex = /\[([A-Z_]+)\]|\{\{([A-Z_]+)\}\}/g;

  // Find all placeholders and track which files use them
  files.forEach((file) => {
    let match;
    while ((match = placeholderRegex.exec(file.content)) !== null) {
      const placeholder = match[1] || match[2];
      if (!allPlaceholders.has(placeholder)) {
        allPlaceholders.set(placeholder, new Set());
      }
      allPlaceholders.get(placeholder)!.add(file.path);
    }
  });

  // Generate suggestions based on project context
  const suggestions = generateSuggestions(projectContext);

  // Build replacements
  const replacements: PlaceholderReplacement[] = Array.from(
    allPlaceholders.entries()
  ).map(([placeholder, filePaths]) => {
    const suggestedValue = suggestions[placeholder] || "";
    const sourceFile = files.find((f) => f.path === Array.from(filePaths)[0]);

    return {
      placeholder,
      foundIn: Array.from(filePaths),
      occurrences: Array.from(filePaths).reduce(
        (sum, path) => {
          const file = files.find((f) => f.path === path);
          return sum + (file ? countOccurrences(file.content, placeholder) : 0);
        },
        0
      ),
      suggestedValue,
      sourceData: getSourceDescription(placeholder, projectContext),
      preview: {
        before: sourceFile
          ? sourceFile.content.substring(0, 200)
          : "...",
        after: sourceFile
          ? sourceFile.content
              .replace(
                new RegExp(`\\[${placeholder}\\]|\\{\\{${placeholder}\\}\\}`, "g"),
                suggestedValue
              )
              .substring(0, 200)
          : "...",
      },
      isApproved: !!suggestedValue, // Auto-approve if we have a suggestion
    };
  });

  const missingValues = replacements
    .filter((r) => !r.suggestedValue)
    .map((r) => r.placeholder);

  return {
    totalPlaceholdersFound: replacements.length,
    filesTouched: new Set(
      replacements.flatMap((r) => r.foundIn)
    ).size,
    replacements: replacements.sort((a, b) =>
      b.occurrences - a.occurrences
    ),
    missingValues,
    readyToApply: missingValues.length === 0,
  };
}

function generateSuggestions(projectContext: {
  name: string;
  description: string;
  brief: string;
  techStack: string[];
  author?: { name: string; email: string };
}): Record<string, string> {
  const year = new Date().getFullYear();

  return {
    PROJECT_NAME: projectContext.name,
    PROJECT_DESCRIPTION: projectContext.description,
    PROJECT_BRIEF: projectContext.brief.substring(0, 500),
    AUTHOR_NAME: projectContext.author?.name || "Team",
    AUTHOR_EMAIL: projectContext.author?.email || "team@example.com",
    TECH_STACK: projectContext.techStack.join(", "),
    YEAR: year.toString(),
    DATE: new Date().toISOString().split("T")[0],
  };
}

function getSourceDescription(
  placeholder: string,
  projectContext: any
): string {
  const sources: Record<string, string> = {
    PROJECT_NAME: "Step 1.1 — Project Brief",
    PROJECT_DESCRIPTION: "Step 1.1 — Project Brief",
    AUTHOR_NAME: "User Profile",
    AUTHOR_EMAIL: "User Profile",
    TECH_STACK: "Step 0.3 — Tech Stack Selection",
    YEAR: "System Date",
    DATE: "System Date",
  };

  return sources[placeholder] || "Project Context";
}

function countOccurrences(content: string, placeholder: string): number {
  const regex = new RegExp(
    `\\[${placeholder}\\]|\\{\\{${placeholder}\\}\\}`,
    "g"
  );
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

export function applySuggestedReplacements(
  files: Array<{
    path: string;
    content: string;
  }>,
  replacements: PlaceholderReplacement[],
  approvedReplacements: Record<string, string>
): Array<{
  path: string;
  originalContent: string;
  updatedContent: string;
  changes: number;
}> {
  return files.map((file) => {
    let updatedContent = file.content;
    let changeCount = 0;

    Object.entries(approvedReplacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(
        `\\[${placeholder}\\]|\\{\\{${placeholder}\\}\\}`,
        "g"
      );
      const oldContent = updatedContent;
      updatedContent = updatedContent.replace(regex, value);
      if (updatedContent !== oldContent) {
        changeCount += (oldContent.match(regex) || []).length;
      }
    });

    return {
      path: file.path,
      originalContent: file.content,
      updatedContent,
      changes: changeCount,
    };
  });
}
