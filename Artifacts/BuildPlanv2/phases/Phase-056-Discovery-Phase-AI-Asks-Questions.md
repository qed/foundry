# Phase 056 — Discovery Phase: AI Asks Questions

## Objective
Implement the first phase of brainstorming where Claude asks clarifying questions one at a time about the project, adapts follow-ups based on answers, and prevents phase transition until minimum 5 questions are answered.

## Prerequisites
- Phase 053 — Chat Interface Component — chat UI ready
- Phase 054 — Claude API Streaming Integration — streaming API ready
- Phase 055 — Helix Brainstorming Prompt Engine — prompts available

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 056 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The discovery phase is the first part of the brainstorming experience. Claude asks targeted questions to understand the project's purpose, users, constraints, and priorities. Each question builds on previous answers, ensuring the conversation feels natural rather than rote. The UI must clearly show which phase the user is in and provide feedback on progress (e.g., "2 of 5 questions asked").

Users cannot advance to the proposal phase until at least 5 discovery questions have been asked and answered. This ensures sufficient context before synthesizing recommendations.

---

## Detailed Requirements

### 1. Discovery Phase Component
#### File: `components/helix/brainstorming/DiscoveryPhase.tsx` (NEW)
Component managing the discovery question flow.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { getBrainstormingSystemPrompt } from '@/lib/helix/prompts/brainstorming';
import { BrainstormingStateManager } from '@/lib/helix/brainstorming-state';

interface DiscoveryPhaseProps {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  existingIdea?: string;
  sessionId: string;
  onPhaseComplete?: (state: any) => void;
}

export function DiscoveryPhase({
  projectId,
  projectName,
  projectDescription,
  existingIdea,
  sessionId,
  onPhaseComplete,
}: DiscoveryPhaseProps) {
  const [stateManager] = useState(
    () => new BrainstormingStateManager('discovery')
  );
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);
  const [showAdvanceButton, setShowAdvanceButton] = useState(false);

  const systemPrompt = getBrainstormingSystemPrompt({
    projectName,
    projectDescription,
    existingIdea,
    currentPhase: 'discovery',
    discoveryQuestionsAsked: questionsAsked,
    previousAnswers: stateManager.getState().discoveryAnswers,
  });

  const { messages, isLoading, error, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-haiku-4-5-20251001',
  });

  // Track questions asked by counting assistant messages
  useEffect(() => {
    const assistantMessageCount = messages.filter(
      (m) => m.role === 'assistant'
    ).length;
    setQuestionsAsked(assistantMessageCount);
    setCanAdvance(assistantMessageCount >= 5);

    // Show advance button after 5 questions and response is complete
    if (assistantMessageCount >= 5) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage?.streamingComplete) {
        setShowAdvanceButton(true);
      }
    }
  }, [messages]);

  const handleAdvancePhase = () => {
    if (onPhaseComplete) {
      onPhaseComplete(stateManager.getState());
    }
  };

  const handleSendMessage = async (content: string) => {
    // Record answer in state
    const lastAssistantMsg = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (lastAssistantMsg) {
      stateManager.recordDiscoveryAnswer(lastAssistantMsg.content, content);
    }

    await sendMessage(content);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Phase Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-blue-900">
            Discovery Phase
          </h2>
          <div className="text-sm font-medium text-blue-700">
            {questionsAsked}/5 Questions
          </div>
        </div>
        <p className="text-sm text-blue-700">
          Let's explore your project together. I'll ask clarifying questions to
          understand your vision, users, and constraints.
        </p>

        {/* Progress Bar */}
        <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(questionsAsked / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          placeholder="Answer the question above..."
          maxHeight="h-[400px]"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Advance Button */}
      {showAdvanceButton && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 mb-3">
            Great! I've gathered enough context about your project. Ready to
            move to the proposal phase where I'll synthesize a recommended
            approach?
          </p>
          <button
            onClick={handleAdvancePhase}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Move to Proposal Phase →
          </button>
        </div>
      )}

      {/* Minimum Questions Warning */}
      {questionsAsked < 5 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          Answer at least {5 - questionsAsked} more question
          {5 - questionsAsked !== 1 ? 's' : ''} to proceed to the proposal phase.
        </div>
      )}
    </div>
  );
}
```

### 2. Question Counting Utility
#### File: `lib/helix/question-counter.ts` (NEW)
Analyzes messages to count and categorize questions.

```typescript
import { Message } from '@/components/helix/chat/ChatMessage';

export interface QuestionAnalysis {
  totalQuestions: number;
  questionCategories: {
    purpose: number;
    users: number;
    features: number;
    constraints: number;
    priorities: number;
  };
  averageQuestionLength: number;
  conversationTurns: number;
}

export function analyzeDiscoveryQuestions(
  messages: Message[]
): QuestionAnalysis {
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  const categories = {
    purpose: 0,
    users: 0,
    features: 0,
    constraints: 0,
    priorities: 0,
  };

  const purposeKeywords = [
    'purpose',
    'goal',
    'outcome',
    'achieve',
    'what is',
    'why',
  ];
  const userKeywords = ['user', 'audience', 'who', 'stakeholder', 'customer'];
  const featureKeywords = [
    'feature',
    'capability',
    'functionality',
    'what should',
    'build',
  ];
  const constraintKeywords = [
    'constraint',
    'limitation',
    'budget',
    'timeline',
    'technology',
    'resource',
  ];
  const priorityKeywords = [
    'priority',
    'important',
    'critical',
    'must-have',
    'nice-to-have',
    'first',
  ];

  let totalLength = 0;

  assistantMessages.forEach((msg) => {
    const content = msg.content.toLowerCase();
    totalLength += msg.content.length;

    if (purposeKeywords.some((kw) => content.includes(kw)))
      categories.purpose++;
    if (userKeywords.some((kw) => content.includes(kw))) categories.users++;
    if (featureKeywords.some((kw) => content.includes(kw)))
      categories.features++;
    if (constraintKeywords.some((kw) => content.includes(kw)))
      categories.constraints++;
    if (priorityKeywords.some((kw) => content.includes(kw)))
      categories.priorities++;
  });

  return {
    totalQuestions: assistantMessages.length,
    questionCategories: categories,
    averageQuestionLength:
      assistantMessages.length > 0 ? totalLength / assistantMessages.length : 0,
    conversationTurns: Math.ceil(messages.length / 2),
  };
}

export function hasBalancedDiscovery(analysis: QuestionAnalysis): boolean {
  const minPerCategory = 1;
  const { purpose, users, features, constraints, priorities } =
    analysis.questionCategories;

  return (
    purpose >= minPerCategory &&
    users >= minPerCategory &&
    features >= minPerCategory &&
    constraints >= minPerCategory &&
    priorities >= minPerCategory
  );
}
```

### 3. Discovery State Hook
#### File: `hooks/useDiscoveryPhase.ts` (NEW)
React hook for managing discovery phase state and transitions.

```typescript
import { useState, useCallback } from 'react';
import { BrainstormingStateManager } from '@/lib/helix/brainstorming-state';
import { analyzeDiscoveryQuestions } from '@/lib/helix/question-counter';

export interface UseDiscoveryPhaseOptions {
  projectId: string;
  sessionId: string;
}

export function useDiscoveryPhase({
  projectId,
  sessionId,
}: UseDiscoveryPhaseOptions) {
  const [stateManager] = useState(
    () => new BrainstormingStateManager('discovery')
  );
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [discoveryMetrics, setDiscoveryMetrics] = useState<any>(null);

  const updateQuestionsAsked = useCallback((count: number) => {
    setQuestionsAsked(count);
    stateManager.recordDiscoveryQuestion();
  }, [stateManager]);

  const recordAnswer = useCallback(
    (question: string, answer: string) => {
      stateManager.recordDiscoveryAnswer(question, answer);
    },
    [stateManager]
  );

  const completeDiscovery = useCallback(
    (messages: any[]) => {
      const analysis = analyzeDiscoveryQuestions(messages);
      setDiscoveryMetrics(analysis);
      return stateManager.getState();
    },
    [stateManager]
  );

  return {
    questionsAsked,
    updateQuestionsAsked,
    recordAnswer,
    completeDiscovery,
    state: stateManager.getState(),
    metrics: discoveryMetrics,
  };
}
```

---

## File Structure
```
components/helix/brainstorming/
└── DiscoveryPhase.tsx (NEW)

lib/helix/
├── question-counter.ts (NEW)
└── brainstorming-state.ts (from Phase 055)

hooks/
└── useDiscoveryPhase.ts (NEW)
```

---

## Dependencies
- React 19+ (hooks, state management)
- Components from Phase 053 (ChatInterface, ChatMessage)
- Hooks from Phase 054 (useStreamingChat)
- Utilities from Phase 055 (getBrainstormingSystemPrompt, BrainstormingStateManager)

---

## Tech Stack for This Phase
- TypeScript (interfaces, type safety)
- React Hooks (useState, useEffect, useCallback)
- Tailwind CSS (styling, progress bar)
- String analysis (keyword matching for question categorization)

---

## Acceptance Criteria
1. DiscoveryPhase displays progress bar showing current questions/5 minimum
2. Phase header shows "Discovery Phase" with question counter
3. Chat interface is embedded with placeholder text "Answer the question above..."
4. Assistant message count is accurately reflected in questions asked counter
5. "Move to Proposal Phase" button only appears after 5+ questions and last response is complete
6. Clicking advance button calls onPhaseComplete with state manager state
7. analyzeDiscoveryQuestions correctly counts assistant messages as questions
8. analyzeDiscoveryQuestions categorizes questions by purpose/users/features/constraints/priorities
9. hasBalancedDiscovery returns true when all categories have >= 1 question
10. useDiscoveryPhase hook provides questionsAsked, recordAnswer, and completeDiscovery methods

---

## Testing Instructions
1. Render DiscoveryPhase component with sample project, verify phase header displays
2. Send initial message, verify assistant responds with first question
3. Verify progress bar width increases from 0% (0/5) to 20% (1/5) after first question
4. Send 5 user messages, verify "Move to Proposal Phase" button appears after 5th response
5. Send 4 messages, verify advance button does not appear
6. Call analyzeDiscoveryQuestions with 5 assistant messages, verify totalQuestions = 5
7. Include purpose keywords in assistant messages, verify purpose count > 0
8. Click advance button, verify onPhaseComplete callback fires with state
9. Test with network error during streaming, verify error message displays
10. Resume discovery from existing messages array, verify progress updates correctly

---

## Notes for the AI Agent
- The 5-question minimum is configurable via state manager; consider making it a prop.
- Question categorization uses simple keyword matching; consider ML-based classification in v2.
- The system prompt should naturally lead Claude to ask diverse questions; test with various project types.
- Consider adding a "Skip to Proposal" override option for power users in later iterations.
- Metrics about question balance can inform UX improvements to the brainstorming flow.
