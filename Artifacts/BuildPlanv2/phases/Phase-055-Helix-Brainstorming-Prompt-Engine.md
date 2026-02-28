# Phase 055 — Helix Brainstorming Prompt Engine

## Objective
Create a templatized system prompt for the 4-phase brainstorming workflow (Discovery → Proposal → Review → Final Brief) that can be dynamically injected with project context and adapted based on conversation flow.

## Prerequisites
- Phase 054 — Claude API Streaming Integration — streaming API ready

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 055 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The brainstorming workflow requires a carefully orchestrated conversation where Claude guides the user through four distinct phases, each with different objectives. Rather than hardcoding prompts in components, we templatize the system prompt to be reusable, injectable with project-specific context, and capable of auto-detecting phase transitions. This phase builds the prompt engine that powers the brainstorming experience.

The prompt must teach Claude how to conduct discovery interviews, synthesize proposals, self-review decisions, and write comprehensive briefs. It also handles phase transitions, allowing both explicit user requests ("move to proposal") and implicit signals ("your questions sound complete to me").

---

## Detailed Requirements

### 1. Core Brainstorming System Prompt Template
#### File: `lib/helix/prompts/brainstorming.ts` (NEW)
Template engine for generating dynamic brainstorming prompts.

```typescript
interface BrainstormingContext {
  projectName: string;
  projectDescription?: string;
  existingIdea?: string;
  currentPhase: 'discovery' | 'proposal' | 'review' | 'final-brief';
  discoveryQuestionsAsked?: number;
  previousAnswers?: Record<string, string>;
}

export function getBrainstormingSystemPrompt(
  context: BrainstormingContext
): string {
  const phaseInstructions = getPhaseInstructions(context.currentPhase);
  const contextBlock = buildContextBlock(context);

  return `You are Claude, an AI brainstorming specialist. Your goal is to help clarify and develop project ideas through a structured 4-phase process.

PROJECT CONTEXT
${contextBlock}

YOUR ROLE
You facilitate the brainstorming process by asking insightful questions, synthesizing ideas, and producing a detailed project brief. You maintain professional tone, acknowledge the user's input, and guide them toward clarity and feasibility.

BRAINSTORMING PHASES
1. DISCOVERY (5-8 questions): Ask clarifying questions about the project's purpose, users, constraints, and priorities.
2. PROPOSAL (synthesis): Synthesize discovery answers into a recommended approach with reasoning and alternatives if applicable.
3. REVIEW (critical analysis): Review your own proposal for alignment, feasibility, risks, and missing considerations.
4. FINAL BRIEF (comprehensive document): Generate a detailed project brief in markdown format.

CURRENT PHASE: ${context.currentPhase.toUpperCase()}

${phaseInstructions}

PHASE TRANSITION
You may transition phases when:
- User explicitly requests: "Move to proposal", "Let's write the brief", etc.
- Discovery is naturally complete: You've asked ≥5 questions and the user indicates readiness.
- After review, if user says "looks good" or "let's finalize", move to final brief.

Always confirm phase transition: "I've gathered enough context. Ready to move to the proposal phase?"

OUTPUT FORMAT
Keep responses concise and conversational. For questions, ask one at a time. For proposals, use markdown with clear sections.`;
}

function getPhaseInstructions(phase: string): string {
  const instructions = {
    discovery: `DISCOVERY PHASE INSTRUCTIONS
Ask clarifying questions one at a time. Cover these areas:
- What is the project's core purpose and desired outcomes?
- Who are the primary users and what are their pain points?
- What are the key features or capabilities needed?
- What technical or business constraints exist?
- What is the success criteria and timeline?

Ask follow-up questions based on previous answers. Adapt questions to the domain (e.g., technical for software, marketing for campaigns).
After 5+ questions, offer to move to the proposal phase: "Does that cover your project well? Ready for me to propose an approach?"`,

    proposal: `PROPOSAL PHASE INSTRUCTIONS
Synthesize all discovery answers into a clear approach. Structure your proposal with:
1. Understanding: Restate your understanding of the project in 2-3 sentences
2. Recommended Approach: Explain the core strategy/path forward
3. Key Components: List major features/modules/steps
4. Rationale: Why this approach aligns with their stated goals
5. Alternatives (optional): If applicable, mention 1-2 alternative approaches and why the main approach is better
6. Next Steps: What happens after brief approval

Ask: "Does this approach resonate with you? Any changes or clarifications needed?"`,

    review: `REVIEW PHASE INSTRUCTIONS
Critically review your own proposal against these criteria:
1. Alignment: Does it address all stated goals and constraints?
2. Feasibility: Is it realistic given timeframe and resources?
3. Completeness: Are there gaps or missing considerations?
4. Risks: What could go wrong? Are there known pitfalls?
5. Clarity: Have you clearly explained each aspect?

Present findings as: "After reviewing, I found: [strengths], [potential improvements]."
Ask: "Would you like me to revise anything before finalizing the brief?"`,

    'final-brief': `FINAL BRIEF INSTRUCTIONS
Generate a comprehensive project brief in markdown. Include these sections:
# [Project Name] — Project Brief

## What
2-3 sentence overview of the project's purpose and desired outcomes.

## Who
Description of primary users and stakeholders.

## Features & Scope
Bulleted list of major features/capabilities.

## Build Plan Overview
High-level phases/timeline (e.g., "Phase 1: Setup, Phase 2: Core Features, Phase 3: Polish")

## Tech Stack Assumptions
Any technology recommendations based on the discovery.

## Success Criteria
Measurable goals for project completion.

## Open Questions
List any unresolved questions or decisions needed.

## Next Steps
Action items before detailed build planning.`,
  };

  return instructions[phase as keyof typeof instructions] || '';
}

function buildContextBlock(context: BrainstormingContext): string {
  const lines = [
    `Project Name: ${context.projectName}`,
  ];

  if (context.projectDescription) {
    lines.push(`Description: ${context.projectDescription}`);
  }

  if (context.existingIdea) {
    lines.push(`User's Idea: "${context.existingIdea}"`);
  }

  if (context.previousAnswers && Object.keys(context.previousAnswers).length > 0) {
    lines.push('Previous Answers:');
    Object.entries(context.previousAnswers).forEach(([q, a]) => {
      lines.push(`- Q: ${q}\n  A: ${a}`);
    });
  }

  return lines.join('\n');
}

export function updatePhase(
  currentPhase: 'discovery' | 'proposal' | 'review' | 'final-brief',
  userInput: string
): 'discovery' | 'proposal' | 'review' | 'final-brief' {
  const transitionKeywords = {
    proposal: ['proposal', 'approach', 'recommend', 'suggest', 'next phase', 'move on'],
    review: ['review', 'check', 'critique', 'revise', 'confident', 'sounds good'],
    'final-brief': ['brief', 'finalize', 'write', 'document', 'lock', 'done questions'],
  };

  const input = userInput.toLowerCase();

  // Check for explicit phase requests
  if (currentPhase === 'discovery') {
    if (transitionKeywords.proposal.some((kw) => input.includes(kw))) {
      return 'proposal';
    }
  }
  if (currentPhase === 'proposal') {
    if (transitionKeywords.review.some((kw) => input.includes(kw))) {
      return 'review';
    }
  }
  if (currentPhase === 'review') {
    if (transitionKeywords['final-brief'].some((kw) => input.includes(kw))) {
      return 'final-brief';
    }
  }

  return currentPhase;
}
```

### 2. Prompt Registry & Versioning
#### File: `lib/helix/prompts/index.ts` (NEW)
Central registry for all prompts with versioning support.

```typescript
export enum PromptVersion {
  BRAINSTORMING_V1 = 'brainstorming-v1',
  BRAINSTORMING_V2 = 'brainstorming-v2',
}

export interface PromptRegistry {
  brainstorming: {
    version: PromptVersion;
    getSystemPrompt: (context: any) => string;
    updatePhase: (phase: string, input: string) => string;
  };
}

// Global registry
export const promptRegistry: PromptRegistry = {
  brainstorming: {
    version: PromptVersion.BRAINSTORMING_V1,
    getSystemPrompt: (context) =>
      require('./brainstorming').getBrainstormingSystemPrompt(context),
    updatePhase: (phase, input) =>
      require('./brainstorming').updatePhase(phase, input),
  },
};

export function getPrompt(
  type: 'brainstorming',
  version?: PromptVersion
): PromptRegistry[typeof type] {
  return promptRegistry[type];
}
```

### 3. Phase State Management
#### File: `lib/helix/brainstorming-state.ts` (NEW)
Manages brainstorming phase state and transitions.

```typescript
export interface BrainstormingState {
  phase: 'discovery' | 'proposal' | 'review' | 'final-brief';
  discoveryQuestionsAsked: number;
  discoveryAnswers: Record<string, string>;
  proposalContent?: string;
  reviewFindings?: string;
  briefContent?: string;
}

export class BrainstormingStateManager {
  private state: BrainstormingState;

  constructor(initialPhase: 'discovery' | 'proposal' | 'review' | 'final-brief' = 'discovery') {
    this.state = {
      phase: initialPhase,
      discoveryQuestionsAsked: 0,
      discoveryAnswers: {},
    };
  }

  getState(): BrainstormingState {
    return { ...this.state };
  }

  recordDiscoveryQuestion(): void {
    this.state.discoveryQuestionsAsked += 1;
  }

  recordDiscoveryAnswer(question: string, answer: string): void {
    this.state.discoveryAnswers[question] = answer;
  }

  recordProposal(content: string): void {
    this.state.proposalContent = content;
  }

  recordReview(findings: string): void {
    this.state.reviewFindings = findings;
  }

  recordBrief(content: string): void {
    this.state.briefContent = content;
  }

  transitionPhase(
    newPhase: 'discovery' | 'proposal' | 'review' | 'final-brief'
  ): void {
    this.state.phase = newPhase;
  }

  canTransitionToProposal(): boolean {
    return this.state.discoveryQuestionsAsked >= 5;
  }

  toJSON(): BrainstormingState {
    return this.state;
  }

  static fromJSON(data: BrainstormingState): BrainstormingStateManager {
    const manager = new BrainstormingStateManager(data.phase);
    manager.state = { ...data };
    return manager;
  }
}
```

---

## File Structure
```
lib/helix/prompts/
├── brainstorming.ts (NEW)
├── index.ts (NEW)
└── build-planning.ts (placeholder for Phase 064)

lib/helix/
└── brainstorming-state.ts (NEW)
```

---

## Dependencies
- TypeScript (type safety for prompt context)
- No external dependencies; pure TypeScript functions

---

## Tech Stack for This Phase
- TypeScript (enums, interfaces, string templates)
- Functional prompt composition
- Pattern matching for phase transitions

---

## Acceptance Criteria
1. getBrainstormingSystemPrompt generates valid prompt text for discovery phase
2. Prompt includes context blocks for projectName, projectDescription, existingIdea
3. getBrainstormingSystemPrompt generates phase-specific instructions for all 4 phases
4. Phase instructions cover discovery (questions), proposal (synthesis), review (critique), and final brief (document)
5. updatePhase detects phase transitions via keyword matching
6. BrainstormingStateManager tracks phase, questionCount, and answer history
7. canTransitionToProposal returns true only when discoveryQuestionsAsked >= 5
8. getPrompt('brainstorming') returns registry entry with versioning support
9. All prompts are human-readable and follow Helix workflow intent
10. State manager serializes/deserializes to/from JSON for persistence

---

## Testing Instructions
1. Call getBrainstormingSystemPrompt with discovery phase, verify "DISCOVERY PHASE INSTRUCTIONS" appears
2. Call getBrainstormingSystemPrompt with final-brief phase, verify "# [Project Name] — Project Brief" template appears
3. Verify context block includes project name and description when provided
4. Call updatePhase('discovery', 'Ready for proposal') and verify returns 'proposal'
5. Call updatePhase('discovery', 'What's next?') and verify returns 'discovery'
6. Create BrainstormingStateManager, record 3 questions, verify canTransitionToProposal returns false
7. Record 5 questions, verify canTransitionToProposal returns true
8. Record discovery answers, verify recordDiscoveryAnswer stores them in state
9. Serialize state to JSON and deserialize, verify state is identical
10. Test with empty context, verify prompt handles missing fields gracefully

---

## Notes for the AI Agent
- The prompt is deliberately conversational and flexible, allowing Claude to adapt to various project types.
- Phase transition keywords can be expanded in future iterations based on user behavior data.
- The BrainstormingStateManager is stateless for this phase; persistence comes in Phase 061.
- Consider adding prompt variants for different project domains (software, design, content, etc.) in Phase 055 v2.
- The 5-question minimum for discovery can be adjusted based on testing feedback.
