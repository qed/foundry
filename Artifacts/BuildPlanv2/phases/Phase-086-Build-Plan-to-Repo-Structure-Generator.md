# Phase 086 — Build Plan to Repo Structure Generator
## Objective
Transform the Build Plan generated in Steps 3.1-3.2 into a complete repository folder structure, including all required documentation files, phase files, and tracking structure.

## Prerequisites
- Phase 003 — Build Plan Generation (Steps 3.1-3.2) — Complete build plan available
- Phase 080 — Documentation Completeness Scoring — Documentation assessment data

## Epic Context
**Epic:** 10 — Repo Setup Automation — Steps 4.1-4.4
**Phase:** 86 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The Build Plan is a critical artifact, but it needs to be properly organized in the repository. This phase generates the complete BuildPlan/ folder structure including the summary document, roadmap, alignment document, phase specifications, and phase history tracking.

The generated structure follows the Helix convention: all phases get markdown files in Phases/, historical phases get tracked in PhaseHistory/, and master documents (roadmap, summary, alignment) sit at the BuildPlan root.

---
## Detailed Requirements

### 1. Build Plan Structure Generator
#### File: `lib/helix/repo-setup/build-plan-generator.ts` (NEW)
Generate complete BuildPlan directory structure:

```typescript
export interface GeneratedBuildPlanStructure {
  rootFiles: {
    "00-Building-Brief-Summary.md": string;
    "roadmap.md": string;
    "alignment.md": string;
    "nextsteps.md": string;
    "summary.md": string;
  };
  phasesFolder: {
    "Phase-NNN-Title.md": string;
  }[];
  phaseHistoryFolder: {
    completed: Array<{
      phaseNumber: number;
      fileName: string;
      completedDate: string;
    }>;
  };
  structure: FileTree;
}

export interface FileTree {
  path: string;
  type: "file" | "folder";
  children?: FileTree[];
}

export async function generateBuildPlanStructure(
  briefContent: string,
  buildPlanData: {
    epics: Array<{
      number: number;
      name: string;
      description: string;
      phases: Array<{
        number: number;
        title: string;
        objective: string;
        effort: string;
      }>;
    }>;
    totalPhases: number;
    estimatedDuration: string;
    techStack: string[];
  },
  projectName: string
): Promise<GeneratedBuildPlanStructure> {
  // Generate root files
  const buildPlanSummary = generateBriefSummary(projectName, briefContent);
  const roadmap = generateRoadmap(buildPlanData);
  const alignment = generateAlignment(buildPlanData, briefContent);
  const nextSteps = generateNextSteps(buildPlanData);
  const summary = generateSummary(buildPlanData);

  // Generate phase files (organized by epic)
  const phaseFiles: Array<{
    phaseNumber: number;
    fileName: string;
    content: string;
  }> = [];

  buildPlanData.epics.forEach((epic) => {
    epic.phases.forEach((phase) => {
      const fileName = `Phase-${String(phase.number).padStart(3, "0")}-${phase.title.replace(/\s+/g, "-")}.md`;
      phaseFiles.push({
        phaseNumber: phase.number,
        fileName,
        content: generatePhaseTemplate(phase, epic),
      });
    });
  });

  // Build file tree
  const fileTree: FileTree = {
    path: "BuildPlan/",
    type: "folder",
    children: [
      {
        path: "BuildPlan/00-Building-Brief-Summary.md",
        type: "file",
      },
      {
        path: "BuildPlan/roadmap.md",
        type: "file",
      },
      {
        path: "BuildPlan/alignment.md",
        type: "file",
      },
      {
        path: "BuildPlan/nextsteps.md",
        type: "file",
      },
      {
        path: "BuildPlan/summary.md",
        type: "file",
      },
      {
        path: "BuildPlan/Phases/",
        type: "folder",
        children: phaseFiles.map((pf) => ({
          path: `BuildPlan/Phases/${pf.fileName}`,
          type: "file" as const,
        })),
      },
      {
        path: "BuildPlan/PhaseHistory/",
        type: "folder",
        children: [],
      },
    ],
  };

  return {
    rootFiles: {
      "00-Building-Brief-Summary.md": buildPlanSummary,
      "roadmap.md": roadmap,
      "alignment.md": alignment,
      "nextsteps.md": nextSteps,
      "summary.md": summary,
    },
    phasesFolder: phaseFiles.map((pf) => ({
      "Phase-NNN-Title.md": pf.content,
    })),
    phaseHistoryFolder: {
      completed: [],
    },
    structure: fileTree,
  };
}

function generateBriefSummary(projectName: string, briefContent: string): string {
  return `# Building Brief Summary — ${projectName}

## Project Overview
${briefContent.substring(0, 500)}

## Document Purpose
This document is generated from the Building Brief and serves as a quick reference for the project scope and goals. Refer to the full Building Brief for complete details.

## Key Sections
- **Roadmap** — Phase-based timeline and milestones
- **Phases** — Detailed specifications for each phase
- **Alignment** — How the plan aligns with requirements
- **Next Steps** — What to do next

Generated: ${new Date().toISOString()}`;
}

function generateRoadmap(buildPlanData: any): string {
  let content = `# Roadmap

## Phase-Based Build Plan

`;

  buildPlanData.epics.forEach((epic) => {
    content += `### Epic ${epic.number} — ${epic.name}

${epic.description}

| Phase | Title | Effort |
|-------|-------|--------|
`;

    epic.phases.forEach((phase) => {
      content += `| ${String(phase.number).padStart(3, "0")} | ${phase.title} | ${phase.effort} |\n`;
    });

    content += "\n";
  });

  content += `
## Summary
- **Total Phases:** ${buildPlanData.totalPhases}
- **Estimated Duration:** ${buildPlanData.estimatedDuration}
- **Tech Stack:** ${buildPlanData.techStack.join(", ")}`;

  return content;
}

function generateAlignment(buildPlanData: any, briefContent: string): string {
  return `# Alignment with Requirements

## How This Build Plan Addresses the Brief

### Coverage by Requirement
${briefContent
  .split("\n")
  .slice(0, 10)
  .map((line) => `- ${line}`)
  .join("\n")}

## Epic Coverage
${buildPlanData.epics.map((e) => `- **Epic ${e.number}** — ${e.name}: ${e.description.substring(0, 100)}`).join("\n")}

## Gap Analysis
All identified requirements are covered by the build plan phases. Phase sequencing follows dependencies and optimizes for continuous value delivery.`;
}

function generateNextSteps(buildPlanData: any): string {
  return `# Next Steps

## Immediate Actions
1. **Review this Build Plan** — Ensure phases align with project vision
2. **Assign Phase Owners** — Designate who will lead each phase
3. **Refine Estimates** — Validate effort estimates based on team capacity
4. **Set Schedule** — Map phases to calendar dates
5. **Configure CI/CD** — Set up build and deployment pipelines

## Phase Kickoff
- Review Phase 001 specification
- Set up development environment
- Prepare initial artifacts
- Schedule team alignment meeting

## Tools & Setup
- Configure repository structure (Phase 004)
- Set up Claude development environment
- Initialize build tracking
- Configure testing framework`;
}

function generateSummary(buildPlanData: any): string {
  const epicsText = buildPlanData.epics
    .map((e) => `- **Epic ${e.number}:** ${e.name}`)
    .join("\n");

  return `# Build Plan Summary

## Overview
This is the phase-based build plan for ${buildPlanData.totalPhases} phases organized across ${buildPlanData.epics.length} epics.

## Epics
${epicsText}

## Timeline
Estimated Duration: ${buildPlanData.estimatedDuration}

## Usage
- Each phase has a detailed specification in the Phases/ folder
- Phase History tracks completion and learnings
- Refer to phase specs during development
- Update PhaseHistory as phases complete`;
}

function generatePhaseTemplate(
  phase: any,
  epic: any
): string {
  return `# Phase ${String(phase.number).padStart(3, "0")} — ${phase.title}

## Objective
${phase.objective}

## Prerequisites
- Previous phase (if applicable)

## Epic Context
**Epic:** ${epic.number} — ${epic.name}
**Phase:** ${phase.number} of 157
**Estimated Effort:** ${phase.effort}

## Context
[Phase context — Why this phase exists and what problem it solves]

---
## Detailed Requirements

### 1. [Feature Group]
#### File: [path] (NEW/UPDATED)
[Detailed requirements and code example]

---
## File Structure
\`\`\`
[File tree showing changes]
\`\`\`

---
## Dependencies
[List of prerequisite phases or external dependencies]

---
## Tech Stack for This Phase
[Technologies used in this phase]

---
## Acceptance Criteria
[Numbered list of 10 acceptance criteria]

---
## Testing Instructions
[Numbered list of 10 testing steps]

---
## Notes for the AI Agent
[Guidance for implementing this phase]`;
}
