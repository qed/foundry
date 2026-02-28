# Phase 084 — Repo Template Customization Engine
## Objective
Implement an in-app template customization interface that displays all template files with editable content. Allow users to input project values and preview generated files before download.

## Prerequisites
- Phase 001 — Project Brief Capture — Project context available
- Phase 003 — Tech Stack Selection — Technology choices captured

## Epic Context
**Epic:** 10 — Repo Setup Automation — Steps 4.1-4.4
**Phase:** 84 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Repository setup traditionally requires downloading a template, manually replacing placeholders, and customizing files. This phase creates an in-app customization engine that shows all template files upfront, allows direct editing, and previews results before download.

Users see the template file structure, can edit any file's content, and receive immediate visual feedback on what will be generated. This eliminates the tedious find-and-replace workflow while keeping full control.

---
## Detailed Requirements

### 1. Template Customization Service
#### File: `lib/helix/repo-setup/template-engine.ts` (NEW)
Core template management and customization:

```typescript
export interface TemplateFile {
  path: string;
  name: string;
  content: string;
  placeholders: string[];
  isEditable: boolean;
  category: "config" | "docs" | "structure" | "commands";
}

export interface TemplateCustomization {
  projectName: string;
  projectDescription: string;
  authorName: string;
  authorEmail: string;
  repoUrl?: string;
  techStack: string[];
  year: number;
  customValues: Record<string, string>;
}

export interface CustomizedTemplate {
  files: Array<{
    path: string;
    originalContent: string;
    customizedContent: string;
    changes: string[];
  }>;
  totalPlaceholdersReplaced: number;
  customizationApplied: CustomizeTemplate;
}

export const DEFAULT_TEMPLATE_FILES = [
  {
    path: "CLAUDE.md",
    name: "Claude Instructions",
    category: "docs" as const,
    isEditable: true,
    placeholders: ["PROJECT_NAME", "PROJECT_DESCRIPTION", "AUTHOR_NAME"],
  },
  {
    path: ".claude/commands/build.sh",
    name: "Build Command",
    category: "commands" as const,
    isEditable: true,
    placeholders: ["PROJECT_NAME"],
  },
  {
    path: ".claude/commands/test.sh",
    name: "Test Command",
    category: "commands" as const,
    isEditable: true,
    placeholders: ["PROJECT_NAME"],
  },
  {
    path: ".gitignore",
    name: "Git Ignore",
    category: "config" as const,
    isEditable: true,
    placeholders: [],
  },
  {
    path: "README.md",
    name: "Project README",
    category: "docs" as const,
    isEditable: true,
    placeholders: ["PROJECT_NAME", "PROJECT_DESCRIPTION", "AUTHOR_NAME"],
  },
  {
    path: "BuildPlan/00-Building-Brief-Summary.md",
    name: "Brief Summary",
    category: "docs" as const,
    isEditable: false,
    placeholders: [],
  },
];

export async function getTemplateFiles(): Promise<TemplateFile[]> {
  // Load template files from storage or embedded templates
  return DEFAULT_TEMPLATE_FILES.map((template) => ({
    ...template,
    content: getTemplateContent(template.path),
    placeholders: extractPlaceholders(
      getTemplateContent(template.path)
    ),
  }));
}

function getTemplateContent(path: string): string {
  const templates: Record<string, string> = {
    "CLAUDE.md": `# PROJECT_NAME — Claude Development Guide

## Overview
PROJECT_DESCRIPTION

## Getting Started
- Author: AUTHOR_NAME
- Tech Stack: [See BuildPlan]
- Repository: [REPO_URL]

## Key Artifacts
- BuildPlan/ — Structured build plan with phases
- .claude/commands/ — Predefined Claude commands
- docs/ — Project documentation

## Commands
\`\`\`bash
./build.sh    # Build the project
./test.sh     # Run tests
\`\`\``,

    ".claude/commands/build.sh": `#!/bin/bash
# PROJECT_NAME build script
echo "Building PROJECT_NAME..."
# Add your build steps here`,

    ".claude/commands/test.sh": `#!/bin/bash
# PROJECT_NAME test script
echo "Testing PROJECT_NAME..."
# Add your test steps here`,

    ".gitignore": `# Dependencies
node_modules/
.env.local
.env.*.local

# Build artifacts
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db`,

    "README.md": `# PROJECT_NAME

PROJECT_DESCRIPTION

## Quick Start
1. Clone the repository
2. Install dependencies
3. Follow instructions in CLAUDE.md

## Architecture
See BuildPlan/ for detailed phase-based build plan.

## Contributing
See CLAUDE.md for development guidelines.`,
  };

  return templates[path] || "File content not found";
}

function extractPlaceholders(content: string): string[] {
  const regex = /\[([A-Z_]+)\]|\{\{([A-Z_]+)\}\}/g;
  const placeholders = new Set<string>();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const placeholder = match[1] || match[2];
    if (placeholder) placeholders.add(placeholder);
  }

  return Array.from(placeholders);
}

export function applyCustomization(
  files: TemplateFile[],
  customization: TemplateCustomization
): CustomizedTemplate {
  const substitutions = buildSubstitutions(customization);
  const customizedFiles = files.map((file) => {
    let customizedContent = file.content;
    const changes: string[] = [];

    Object.entries(substitutions).forEach(([placeholder, value]) => {
      const oldLength = customizedContent.length;
      customizedContent = customizedContent.replace(
        new RegExp(
          `\\[${placeholder}\\]|\\{\\{${placeholder}\\}\\}`,
          "g"
        ),
        value
      );
      if (customizedContent.length !== oldLength) {
        changes.push(`${placeholder} → ${value}`);
      }
    });

    return {
      path: file.path,
      originalContent: file.content,
      customizedContent,
      changes,
    };
  });

  return {
    files: customizedFiles,
    totalPlaceholdersReplaced: customizedFiles.reduce(
      (sum, f) => sum + f.changes.length,
      0
    ),
    customizationApplied: customization,
  };
}

function buildSubstitutions(
  customization: TemplateCustomization
): Record<string, string> {
  return {
    PROJECT_NAME: customization.projectName,
    PROJECT_DESCRIPTION: customization.projectDescription,
    AUTHOR_NAME: customization.authorName,
    AUTHOR_EMAIL: customization.authorEmail,
    REPO_URL: customization.repoUrl || "[repo-url]",
    TECH_STACK: customization.techStack.join(", "),
    YEAR: customization.year.toString(),
    ...customization.customValues,
  };
}
