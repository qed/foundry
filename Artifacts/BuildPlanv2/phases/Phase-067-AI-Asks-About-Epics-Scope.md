# Phase 067 — AI Asks About Epics & Scope

## Objective
Implement interactive component where Claude asks structured questions about epic breakdown and scope, proposes epic structure, and validates user acceptance before phase sizing.

## Prerequisites
- Phase 066 — Ask User Questions Module — question component ready

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 067 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The first step in build planning is understanding the project's major feature areas (epics). Claude analyzes the project brief and asks targeted questions about feature priorities, MVP vs post-launch, and dependencies. Based on answers, it proposes an epic structure with clear descriptions. Users validate or request adjustments before moving to phase sizing.

---

## Detailed Requirements

### 1. Epic Scoping Component
#### File: `components/helix/build-planning/EpicScoping.tsx` (NEW)
Component managing epic discovery and validation.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { AskUserQuestions, Question, QuestionResponse } from '@/components/helix/chat/AskUserQuestions';
import { getBuildPlanningSystemPrompt } from '@/lib/helix/prompts/build-planning';
import { BuildPlanningStateManager } from '@/lib/helix/build-planning-state';
import { EpicProposal } from './EpicProposal';

interface EpicScopingProps {
  projectId: string;
  projectName: string;
  projectBrief: string;
  sessionId: string;
  onEpicsValidated: (epics: any[], state: any) => void;
}

export function EpicScoping({
  projectId,
  projectName,
  projectBrief,
  sessionId,
  onEpicsValidated,
}: EpicScopingProps) {
  const [stateManager] = useState(
    () => new BuildPlanningStateManager()
  );
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [proposedEpics, setProposedEpics] = useState<any[]>([]);
  const [stage, setStage] = useState<'discovery' | 'proposal' | 'validation'>('discovery');

  const systemPrompt = getBuildPlanningSystemPrompt({
    projectName,
    projectBrief,
    currentPhase: 'epic-scoping',
  });

  const { messages, isLoading, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-sonnet-4-5-20250929',
  });

  // Auto-start discovery on mount
  useEffect(() => {
    if (messages.length === 0) {
      const initialPrompt = `Based on this project brief, I'd like to propose an epic structure for the build plan.

Let me ask you a few clarifying questions:

## Question 1: Feature Areas
What are the main feature areas or components of this project? (For example: User Management, Dashboard, API, Mobile App, etc.)

Type: free-text
Required: true

## Question 2: MVP vs Extended
Which features are essential for MVP (Minimum Viable Product) and which are post-launch enhancements?

Type: free-text
Required: true

## Question 3: Priority Order
What's the priority order of these features? What should be built first?

Type: free-text
Required: true`;

      sendMessage(initialPrompt);
      setStage('discovery');
    }
  }, []);

  const handleQuestionsSubmit = async (responses: QuestionResponse[]) => {
    // Format responses and send back to Claude for epic proposal
    const responseText = responses
      .map((r) => `${r.selectedOptions?.join(', ') || r.freeText}`)
      .join('\n\n');

    const proposalPrompt = `Based on my answers, please propose an epic structure for this project.

Structure your proposal as follows:

# Proposed Epic Structure

## Epic 1: [Epic Name]
Description: [2-3 sentence description]
Estimated Phases: [number]
Priority: [1-X]

## Epic 2: [Epic Name]
...

After listing all epics, ask me: "Does this epic breakdown match your vision? Any adjustments needed?"`;

    await sendMessage(proposalPrompt);
    setShowQuestions(false);
    setStage('proposal');
  };

  const handleValidation = async (response: string) => {
    // Parse epic proposal from Claude's last message
    const lastAssistantMsg = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (lastAssistantMsg) {
      const epics = parseEpicsFromProposal(lastAssistantMsg.content);
      setProposedEpics(epics);
      stateManager.updateEpics(epics);
      setStage('validation');

      // Ask for final validation
      const validationPrompt = `Excellent. I have captured the following epics:

${epics.map((e) => `- ${e.name}: ${e.description}`).join('\n')}

Does this structure look correct? Any final adjustments before we move to phase sizing?`;

      await sendMessage(validationPrompt);
    }
  };

  const handleApprove = () => {
    if (onEpicsValidated) {
      onEpicsValidated(proposedEpics, stateManager.getState());
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Phase Header */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">
          Epic Scoping
        </h2>
        <p className="text-sm text-indigo-700">
          Let's identify the major feature areas (epics) for your project.
        </p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0">
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          placeholder="Discuss epic structure and adjustments..."
          maxHeight="h-[400px]"
        />
      </div>

      {/* Questions Component */}
      {showQuestions && questions.length > 0 && (
        <AskUserQuestions
          questions={questions}
          onSubmit={handleQuestionsSubmit}
          isLoading={isLoading}
        />
      )}

      {/* Epic Proposal Validation */}
      {stage === 'validation' && proposedEpics.length > 0 && (
        <EpicProposal
          epics={proposedEpics}
          onApprove={handleApprove}
          onAdjust={handleValidation}
          isLoading={isLoading}
        />
      )}

      {/* Next Phase Button */}
      {stage === 'validation' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <button
            onClick={handleApprove}
            disabled={isLoading || proposedEpics.length === 0}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Approve Epics & Move to Phase Sizing →
          </button>
        </div>
      )}
    </div>
  );
}
```

### 2. Epic Proposal Display Component
#### File: `components/helix/build-planning/EpicProposal.tsx` (NEW)
Displays proposed epics for review and adjustment.

```typescript
'use client';

import { Building2, ChevronRight } from 'lucide-react';

export interface Epic {
  name: string;
  description: string;
  estimatedPhases: number;
  priority: number;
}

interface EpicProposalProps {
  epics: Epic[];
  onApprove: () => void;
  onAdjust: (feedback: string) => void;
  isLoading?: boolean;
}

export function EpicProposal({
  epics,
  onApprove,
  onAdjust,
  isLoading = false,
}: EpicProposalProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">
          Proposed Epics ({epics.length})
        </h3>
      </div>

      <div className="space-y-3">
        {epics.map((epic, idx) => (
          <div
            key={idx}
            className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">{epic.name}</h4>
                <p className="text-sm text-slate-600 mt-1">{epic.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>Priority: #{epic.priority}</span>
                  <span>~{epic.estimatedPhases} phases</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        👇 Does this epic structure match your vision? Reply below if you'd like adjustments.
      </div>

      <div className="flex gap-2">
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Looks Good! →
        </button>
      </div>
    </div>
  );
}
```

### 3. Epic Parsing Utility
#### File: `lib/helix/epic-parser.ts` (NEW)
Extracts epic proposals from Claude responses.

```typescript
export interface Epic {
  id: string;
  name: string;
  description: string;
  estimatedPhases: number;
  priority: number;
}

export function parseEpicsFromProposal(text: string): Epic[] {
  const epics: Epic[] = [];
  const epicPattern = /##\s+Epic\s+(\d+):\s*(.+?)(?=##|$)/gs;
  let match;
  let priority = 1;

  while ((match = epicPattern.exec(text)) !== null) {
    const epicBlock = match[2];
    const nameMatch = epicBlock.match(/^(.+?)(?:\n|$)/);
    const descMatch = epicBlock.match(/Description:\s*(.+?)(?:\nEstimated|$)/is);
    const phasesMatch = epicBlock.match(/Estimated\s+Phases:\s*(\d+)/i);

    const name = nameMatch ? nameMatch[1].trim() : `Epic ${priority}`;
    const description = descMatch ? descMatch[1].trim() : '';
    const estimatedPhases = phasesMatch ? parseInt(phasesMatch[1]) : 3;

    epics.push({
      id: `epic_${priority}`,
      name,
      description,
      estimatedPhases,
      priority,
    });

    priority++;
  }

  return epics;
}
```

---

## File Structure
```
components/helix/build-planning/
├── EpicScoping.tsx (NEW)
├── EpicProposal.tsx (NEW)
└── [previous components]

lib/helix/
└── epic-parser.ts (NEW)
```

---

## Dependencies
- React 19+ (hooks, state)
- Components from Phase 053, 054, 066
- Utilities from Phase 064
- lucide-react for icons

---

## Tech Stack for This Phase
- TypeScript
- React Hooks
- String pattern matching for epic extraction
- Tailwind CSS

---

## Acceptance Criteria
1. EpicScoping auto-sends initial discovery prompt on mount
2. Claude's structured questions are rendered in chat
3. User answers flow back to Claude for proposal generation
4. parseEpicsFromProposal extracts epic name, description, phase count
5. EpicProposal displays all epics with priority and estimated phases
6. "Looks Good!" button calls onApprove callback
7. User can request adjustments via chat and re-iterate
8. stateManager.updateEpics stores final epics
9. onEpicsValidated callback includes all epics and state
10. Responsive design works on mobile and desktop

---

## Testing Instructions
1. Mount EpicScoping, verify auto-sends discovery prompt
2. Verify Claude response includes structured questions
3. Submit question responses, verify proposal generation starts
4. Verify EpicProposal displays all proposed epics
5. Click "Looks Good!", verify onApprove callback fires
6. Type adjustment request in chat, verify Claude revises proposal
7. Call parseEpicsFromProposal with sample text, verify epics parsed
8. Verify each epic has name, description, estimatedPhases, priority
9. Test with 3, 5, and 8 epics, verify layout handles all
10. Verify priority numbers increment 1, 2, 3, etc.

---

## Notes for the AI Agent
- Epic parsing uses regex to extract structured format; error handling for malformed input needed.
- Priority numbers are auto-assigned based on parse order; could be extracted from text if Claude provides explicitly.
- EpicScoping state resets if user navigates away; consider persistent storage in later phases.
