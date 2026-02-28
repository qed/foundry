# Phase 064 — Building Brief Summary Prompt Engine

## Objective
Create a templatized system prompt for build planning that guides Claude through multi-phase Q&A about epics, phases, scope, and tech stack, producing a Building Brief Summary.

## Prerequisites
- Phase 055 — Helix Brainstorming Prompt Engine — prompt templating pattern established

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 064 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The build planning prompt is more complex than brainstorming because it must handle questions about project structure (epics, phases), scope management, technical architecture, and timelines. The prompt defines a multi-phase conversation where Claude asks about epic breakdown, then phase sizing, then generates detailed phase specifications. This phase creates that prompt template, injecting project brief and supporting documentation.

---

## Detailed Requirements

### 1. Build Planning System Prompt Template
#### File: `lib/helix/prompts/build-planning.ts` (NEW)
Prompt engine for build planning conversations.

```typescript
export interface BuildPlanningContext {
  projectName: string;
  projectBrief: string;
  existingDocs?: string;
  currentPhase: 'epic-scoping' | 'phase-sizing' | 'summary-generation' | 'spec-generation';
  proposedEpics?: Array<{ name: string; description: string }>;
  phaseEstimates?: Record<string, number>; // epic name -> hours
}

export function getBuildPlanningSystemPrompt(
  context: BuildPlanningContext
): string {
  const phaseInstructions = getPhaseInstructions(context.currentPhase);

  return `You are Claude, a build planning specialist. Your goal is to help structure a software project into epics and phases.

PROJECT CONTEXT
Project: ${context.projectName}

Brief:
${context.projectBrief}

${context.existingDocs ? `Additional Documentation:\n${context.existingDocs}` : ''}

YOUR ROLE
You facilitate build planning through a structured conversation:
1. Epic Scoping: Understand and validate the major feature areas (epics)
2. Phase Sizing: Break each epic into phases with realistic time estimates
3. Summary Generation: Create a Building Brief Summary document
4. Spec Generation: Generate individual phase specification files

BUILDING BRIEF SUMMARY FORMAT
When generating the summary, follow this structure:

# [Project Name] — Building Brief Summary

## Overview
(1-2 paragraphs: project purpose, key success metrics)

## Tech Stack
- Backend: [framework, language, database]
- Frontend: [framework, language, styling]
- Infrastructure: [hosting, CI/CD, monitoring]
- Key Libraries: [list important dependencies]

## Core Modules & Architecture
{Module Name}: {2-3 sentence description}

## Epic Breakdown
| Epic | Description | Estimated Phases |
|------|-------------|------------------|
| Epic 1 | {description} | {X} |

## Phase Breakdown
Epic {N}: {Epic Name}
- Phase {N}.1: {Phase Name} (~{hours}h)
  - Objectives: {bullet points}
  - Acceptance Criteria: {key criteria}
- Phase {N}.2: {Phase Name} (~{hours}h)
  ...

## Technical Decisions & Rationale
{Key architectural decisions and why they were chosen}

## Risk & Mitigation
{Identified risks and mitigation strategies}

## Success Metrics
{How success will be measured}

CURRENT PHASE: ${context.currentPhase.toUpperCase()}

${phaseInstructions}

PHASE TRANSITION
You may transition phases when:
- Epic scoping: User validates proposed epic structure ("looks good", "move on", etc.)
- Phase sizing: User confirms phase estimates and breakdown ("acceptable", "let's generate", etc.)
- Summary generation: You've completed the summary and user approves
- Spec generation: You've generated all phase specs

Always confirm transitions: "Epic structure validated. Ready to move to phase sizing?"
`;
}

function getPhaseInstructions(phase: string): string {
  const instructions = {
    'epic-scoping': `EPIC SCOPING PHASE INSTRUCTIONS
Analyze the project brief to identify major feature areas (epics). Ask clarifying questions about:
1. What are the major functional areas or features?
2. What should be in MVP vs post-launch?
3. Are there dependencies between features?
4. What's the priority order?

Propose epic structure (typically 3-8 epics) with clear names and descriptions. Each epic should be independently valuable.

Ask: "Does this epic breakdown match your vision? Any adjustments needed?"`,

    'phase-sizing': `PHASE SIZING PHASE INSTRUCTIONS
For each epic, break it into phases. Each phase should be ~3-4 hours (one half-day of work). Ask about:
1. What are the key development stages within each epic?
2. What prerequisites exist between phases?
3. Any dependencies across epics?
4. What's the realistic timeline?

Propose phase breakdown with effort estimates:
- Phase {N}.{N}: {Name} (~3-4h)
- Phase {N}.{N}: {Name} (~3-4h)

Flag phases that seem too large (suggest splitting) or too small (suggest combining).

Ask: "Are these phase estimates realistic? Any adjustments?"`,

    'summary-generation': `SUMMARY GENERATION PHASE INSTRUCTIONS
Generate a comprehensive Building Brief Summary in the specified format. Include:
- Project overview and success metrics
- Complete tech stack with rationale
- Core modules and their interactions
- Full epic and phase breakdown with effort estimates
- Technical decisions and risks
- Success criteria

The summary should be detailed enough to give a developer a clear understanding of the entire project scope and structure.`,

    'spec-generation': `SPEC GENERATION PHASE INSTRUCTIONS
Generate individual phase specification files following the Phase Template:

# Phase {NNN} — {Title}

## Objective
{1-3 sentences describing what this phase accomplishes}

## Prerequisites
- Phase {NNN} — {Title} — {reason}

## Context
{1-2 paragraphs of background}

## Detailed Requirements
### {Section Name}
#### File: {path} (NEW/UPDATED)
{Description + code samples where relevant}

## Acceptance Criteria
{Exactly 10 acceptance criteria}

## Testing Instructions
{Exactly 10 testing scenarios}

Generate specs for all proposed phases in order.`,
  };

  return instructions[phase as keyof typeof instructions] || '';
}

export function updatePhase(
  currentPhase: string,
  userInput: string
): 'epic-scoping' | 'phase-sizing' | 'summary-generation' | 'spec-generation' {
  const input = userInput.toLowerCase();

  if (currentPhase === 'epic-scoping') {
    if (['phase sizing', 'move on', 'next phase', 'proceed', 'epics look good'].some(
      (kw) => input.includes(kw)
    )) {
      return 'phase-sizing';
    }
  } else if (currentPhase === 'phase-sizing') {
    if (['sizing looks good', 'summary', 'generate', 'move on'].some((kw) =>
      input.includes(kw)
    )) {
      return 'summary-generation';
    }
  } else if (currentPhase === 'summary-generation') {
    if (['phase files', 'specs', 'generate specs', 'proceed'].some((kw) =>
      input.includes(kw)
    )) {
      return 'spec-generation';
    }
  }

  return (currentPhase as any) || 'epic-scoping';
}
```

### 2. Build Planning State Manager
#### File: `lib/helix/build-planning-state.ts` (NEW)
State management for build planning conversation.

```typescript
export interface Epic {
  id: string;
  name: string;
  description: string;
  estimatedPhases: number;
  priority: number;
}

export interface Phase {
  id: string;
  epicId: string;
  name: string;
  description: string;
  estimatedHours: number;
  objectives: string[];
  acceptanceCriteria: string[];
}

export interface BuildPlanningState {
  phase: 'epic-scoping' | 'phase-sizing' | 'summary-generation' | 'spec-generation';
  epics: Epic[];
  phases: Phase[];
  summary?: string;
  specs?: string[];
}

export class BuildPlanningStateManager {
  private state: BuildPlanningState;

  constructor() {
    this.state = {
      phase: 'epic-scoping',
      epics: [],
      phases: [],
    };
  }

  getState(): BuildPlanningState {
    return { ...this.state };
  }

  setPhase(newPhase: BuildPlanningState['phase']): void {
    this.state.phase = newPhase;
  }

  addEpic(epic: Epic): void {
    this.state.epics.push(epic);
  }

  updateEpics(epics: Epic[]): void {
    this.state.epics = epics;
  }

  addPhase(phase: Phase): void {
    this.state.phases.push(phase);
  }

  updatePhases(phases: Phase[]): void {
    this.state.phases = phases;
  }

  setSummary(summary: string): void {
    this.state.summary = summary;
  }

  setSpecs(specs: string[]): void {
    this.state.specs = specs;
  }

  getEpicCount(): number {
    return this.state.epics.length;
  }

  getPhaseCount(): number {
    return this.state.phases.length;
  }

  getTotalEstimatedHours(): number {
    return this.state.phases.reduce((sum, p) => sum + p.estimatedHours, 0);
  }

  toJSON(): BuildPlanningState {
    return this.state;
  }

  static fromJSON(data: BuildPlanningState): BuildPlanningStateManager {
    const manager = new BuildPlanningStateManager();
    manager.state = { ...data };
    return manager;
  }
}
```

---

## File Structure
```
lib/helix/prompts/
├── build-planning.ts (NEW)
└── [previous prompts]

lib/helix/
└── build-planning-state.ts (NEW)
```

---

## Dependencies
- TypeScript (interfaces, enums)
- No external dependencies

---

## Tech Stack for This Phase
- TypeScript (strict mode)
- Functional prompt composition
- String templates for dynamic injection

---

## Acceptance Criteria
1. getBuildPlanningSystemPrompt generates valid prompt for epic-scoping phase
2. Prompt includes project brief and documentation context
3. Prompt defines Building Brief Summary format with all required sections
4. getPhaseInstructions returns distinct instructions for all 4 phases
5. updatePhase detects phase transitions via keyword matching
6. BuildPlanningStateManager tracks epics, phases, summary, and specs
7. getTotalEstimatedHours sums hours from all phases
8. State manager serializes/deserializes to/from JSON
9. All prompts are human-readable and actionable
10. Phase template in prompt matches actual Phase files from previous epics

---

## Testing Instructions
1. Call getBuildPlanningSystemPrompt with epic-scoping phase, verify prompt includes phase instructions
2. Verify prompt includes projectBrief and existingDocs when provided
3. Test updatePhase('epic-scoping', 'let me size the phases') returns 'phase-sizing'
4. Test updatePhase with non-matching input, returns same phase
5. Create BuildPlanningStateManager, add 3 epics, verify getEpicCount returns 3
6. Add phases with varying hours (4h, 3h, 5h), verify getTotalEstimatedHours = 12
7. Call setSummary, verify state.summary updated
8. Serialize state to JSON and deserialize, verify identical
9. Verify all phase instructions are distinct and specific
10. Test with empty project brief, verify prompt still valid

---

## Notes for the AI Agent
- The phase transition keywords can be expanded based on user testing feedback.
- Tech stack section in summary should reflect the actual project tech (from brief).
- The phase template format should match the actual Phase-NNN files created in Phases 053-062.
- Consider adding prompt variants for different project types (web, mobile, API, etc.) in v2.
