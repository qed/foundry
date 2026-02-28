# Phase 057 — Proposal Phase: AI Proposes Approach

## Objective
Implement the proposal phase where Claude synthesizes discovery answers into a recommended approach with optional alternatives, allowing user questions and feedback before acceptance.

## Prerequisites
- Phase 056 — Discovery Phase: AI Asks Questions — discovery flow complete

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 057 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
After discovery, the user advances to the proposal phase where Claude synthesizes all answers into a coherent recommended approach. The proposal includes understanding restatement, core strategy, key components, rationale, optional alternatives, and next steps. The UI emphasizes this is a proposal open to feedback—users can ask follow-up questions or request changes before accepting.

This phase maintains the chat interface for user feedback but adds a structured proposal view that renders the AI's response as formatted markdown, making it easy to review the approach before committing.

---

## Detailed Requirements

### 1. Proposal Phase Component
#### File: `components/helix/brainstorming/ProposalPhase.tsx` (NEW)
Component managing proposal generation and user feedback.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { getBrainstormingSystemPrompt } from '@/lib/helix/prompts/brainstorming';
import { BrainstormingStateManager } from '@/lib/helix/brainstorming-state';
import { ProposalView } from './ProposalView';

interface ProposalPhaseProps {
  projectId: string;
  projectName: string;
  discoveryState: any;
  sessionId: string;
  onPhaseComplete?: (state: any) => void;
}

export function ProposalPhase({
  projectId,
  projectName,
  discoveryState,
  sessionId,
  onPhaseComplete,
}: ProposalPhaseProps) {
  const [stateManager] = useState(() => {
    const manager = new BrainstormingStateManager('proposal');
    manager.recordDiscoveryAnswer('previous', JSON.stringify(discoveryState));
    return manager;
  });
  const [proposalGenerated, setProposalGenerated] = useState(false);
  const [showAcceptButton, setShowAcceptButton] = useState(false);

  const systemPrompt = getBrainstormingSystemPrompt({
    projectName,
    currentPhase: 'proposal',
    previousAnswers: discoveryState.discoveryAnswers,
  });

  const { messages, isLoading, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-haiku-4-5-20251001',
  });

  // Auto-generate proposal on mount if not started
  useEffect(() => {
    if (messages.length === 0) {
      const initialPrompt =
        'Based on our discovery discussion, please propose an approach for this project.';
      sendMessage(initialPrompt);
    }
  }, []);

  // Detect proposal completion and show accept button
  useEffect(() => {
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.role === 'assistant' &&
        lastMessage.streamingComplete &&
        !proposalGenerated
      ) {
        setProposalGenerated(true);
        stateManager.recordProposal(lastMessage.content);

        // Wait a moment before showing accept button
        setTimeout(() => setShowAcceptButton(true), 500);
      }
    }
  }, [messages, proposalGenerated, stateManager]);

  const handleAcceptProposal = () => {
    if (onPhaseComplete) {
      onPhaseComplete(stateManager.getState());
    }
  };

  const proposalMessage = messages.find(
    (m) => m.role === 'assistant' && m.content.length > 500
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Phase Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-purple-900 mb-2">
          Proposal Phase
        </h2>
        <p className="text-sm text-purple-700">
          Here's my recommended approach based on our discovery. Review it
          carefully—ask questions or request changes if needed.
        </p>
      </div>

      {/* Proposal Preview */}
      {proposalMessage && (
        <ProposalView content={proposalMessage.content} />
      )}

      {/* Chat for Feedback */}
      <div className="flex-1 min-h-0">
        <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm text-slate-600">
          Questions or feedback? Type below and I'll adjust the proposal.
        </div>
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          placeholder="Ask follow-up questions or request changes..."
          maxHeight="h-[250px]"
        />
      </div>

      {/* Accept Button */}
      {showAcceptButton && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 mb-3">
            Does this approach work for you?
          </p>
          <button
            onClick={handleAcceptProposal}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Accept Proposal & Move to Review →
          </button>
        </div>
      )}
    </div>
  );
}
```

### 2. Proposal View Component
#### File: `components/helix/brainstorming/ProposalView.tsx` (NEW)
Renders proposal markdown with nice formatting.

```typescript
'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProposalViewProps {
  content: string;
  className?: string;
}

export function ProposalView({ content, className = '' }: ProposalViewProps) {
  const truncatedContent = useMemo(() => {
    // Show first 1500 chars or full content if shorter
    if (content.length > 1500) {
      return content.substring(0, 1500) + '\n\n*[Scroll down for full proposal]*';
    }
    return content;
  }, [content]);

  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg p-6 overflow-y-auto max-h-[300px] ${className}`}
    >
      <article className="prose prose-sm prose-slate max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mb-4 text-slate-900">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mb-3 mt-4 text-slate-800">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold mb-2 text-slate-700">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-3 text-slate-700">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-3 text-slate-700">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-3 text-slate-700">
                {children}
              </ol>
            ),
          }}
        >
          {truncatedContent}
        </ReactMarkdown>
      </article>
    </div>
  );
}
```

### 3. Phase Transition Handler
#### File: `lib/helix/brainstorming-flow.ts` (NEW)
Manages transitions between all brainstorming phases.

```typescript
import { BrainstormingStateManager } from './brainstorming-state';

export interface BrainstormingFlowState {
  currentPhase: 'discovery' | 'proposal' | 'review' | 'final-brief';
  discoveryState?: any;
  proposalState?: any;
  reviewState?: any;
  briefState?: any;
}

export class BrainstormingFlow {
  private state: BrainstormingFlowState;

  constructor() {
    this.state = {
      currentPhase: 'discovery',
    };
  }

  getCurrentPhase(): string {
    return this.state.currentPhase;
  }

  transitionToProposal(discoveryState: any): void {
    this.state.currentPhase = 'proposal';
    this.state.discoveryState = discoveryState;
  }

  transitionToReview(proposalState: any): void {
    this.state.currentPhase = 'review';
    this.state.proposalState = proposalState;
  }

  transitionToFinalBrief(reviewState: any): void {
    this.state.currentPhase = 'final-brief';
    this.state.reviewState = reviewState;
  }

  getFullContext(): BrainstormingFlowState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      currentPhase: 'discovery',
    };
  }
}
```

---

## File Structure
```
components/helix/brainstorming/
├── ProposalPhase.tsx (NEW)
├── ProposalView.tsx (NEW)
└── DiscoveryPhase.tsx (from Phase 056)

lib/helix/
├── brainstorming-flow.ts (NEW)
└── brainstorming-state.ts (from Phase 055)
```

---

## Dependencies
- React 19+ (hooks, state)
- react-markdown with remark-gfm for markdown rendering
- Components from Phase 053-054
- Utilities from Phase 055-056

---

## Tech Stack for This Phase
- TypeScript
- React Hooks (useState, useEffect, useMemo)
- Markdown rendering (react-markdown)
- Tailwind CSS

---

## Acceptance Criteria
1. ProposalPhase auto-generates proposal on mount with initial prompt
2. Proposal content is extracted from first substantive assistant message
3. ProposalView renders proposal markdown with proper formatting
4. ProposalView truncates at 1500 chars and shows scroll indicator
5. Chat interface allows users to provide feedback after proposal
6. "Accept Proposal" button appears after proposal is complete and streamed
7. Button is disabled while AI is processing feedback
8. stateManager records proposal content when accepted
9. onPhaseComplete callback includes full proposal in state
10. BrainstormingFlow transitions between phases and maintains full context

---

## Testing Instructions
1. Mount ProposalPhase, verify auto-sends initial proposal request
2. Verify ProposalView renders markdown with H1/H2/H3 formatting
3. Feed proposal with 2000 chars, verify truncation at 1500
4. User feedback prompt, send follow-up question, verify chat accumulates
5. Verify "Accept Proposal" button disabled during streaming
6. Click accept, verify onPhaseComplete fires with state
7. Test BrainstormingFlow.transitionToProposal with discovery state
8. Verify BrainstormingFlow.getFullContext returns all phase data
9. Test markdown with lists and emphasis, verify rendering
10. Mobile test: verify proposal view scrolls in constrained height

---

## Notes for the AI Agent
- The proposal auto-generation can be triggered manually if needed; consider adding a "Regenerate" button.
- Markdown rendering uses remark-gfm for tables and strikethrough support.
- ProposalView uses prose styling classes for clean typography.
- Consider adding a "Copy Proposal" button for users who want to save it elsewhere.
