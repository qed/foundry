# Phase 058 — Review Phase: AI Self-Reviews

## Objective
Implement the review phase where Claude critically evaluates its own proposal against alignment, feasibility, risks, and completeness criteria, presenting findings for user validation.

## Prerequisites
- Phase 057 — Proposal Phase: AI Proposes Approach — proposal accepted

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 058 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The review phase adds a quality gate where Claude applies critical thinking to its own proposal. Rather than asking the user to critique, Claude does the critique itself, checking for alignment with stated goals, feasibility given constraints, completeness of scope, identified risks, and clarity of explanation. The review findings are presented in a structured format that users can validate or request revisions against.

This phase demonstrates AI's ability to self-correct and provides users confidence that the approach has been thoroughly considered.

---

## Detailed Requirements

### 1. Review Phase Component
#### File: `components/helix/brainstorming/ReviewPhase.tsx` (NEW)
Component managing the self-review process.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { getBrainstormingSystemPrompt } from '@/lib/helix/prompts/brainstorming';
import { BrainstormingStateManager } from '@/lib/helix/brainstorming-state';
import { ReviewFindings } from './ReviewFindings';

interface ReviewPhaseProps {
  projectId: string;
  projectName: string;
  proposalState: any;
  sessionId: string;
  onPhaseComplete?: (state: any) => void;
}

export function ReviewPhase({
  projectId,
  projectName,
  proposalState,
  sessionId,
  onPhaseComplete,
}: ReviewPhaseProps) {
  const [stateManager] = useState(() => {
    const manager = new BrainstormingStateManager('review');
    return manager;
  });
  const [reviewGenerated, setReviewGenerated] = useState(false);
  const [showAcceptButton, setShowAcceptButton] = useState(false);

  const systemPrompt = getBrainstormingSystemPrompt({
    projectName,
    currentPhase: 'review',
    previousAnswers: proposalState.discoveryAnswers,
  });

  const { messages, isLoading, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-haiku-4-5-20251001',
  });

  // Auto-generate review on mount
  useEffect(() => {
    if (messages.length === 0) {
      const reviewPrompt =
        "Now please review your own proposal against these criteria:\n1. Alignment: Does it address all stated goals and constraints?\n2. Feasibility: Is it realistic given timeframe and resources?\n3. Completeness: Are there gaps or missing considerations?\n4. Risks: What could go wrong?\n5. Clarity: Is everything clearly explained?\n\nProvide a structured review.";
      sendMessage(reviewPrompt);
    }
  }, []);

  // Detect review completion
  useEffect(() => {
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.role === 'assistant' &&
        lastMessage.streamingComplete &&
        !reviewGenerated
      ) {
        setReviewGenerated(true);
        stateManager.recordReview(lastMessage.content);
        setTimeout(() => setShowAcceptButton(true), 500);
      }
    }
  }, [messages, reviewGenerated, stateManager]);

  const handleAcceptReview = () => {
    if (onPhaseComplete) {
      onPhaseComplete(stateManager.getState());
    }
  };

  const reviewMessage = messages.find(
    (m) => m.role === 'assistant' && m.content.includes('Alignment')
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Phase Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-amber-900 mb-2">
          Review Phase
        </h2>
        <p className="text-sm text-amber-700">
          I'm critically reviewing the proposal to ensure it's aligned, feasible,
          and complete. Here are my findings:
        </p>
      </div>

      {/* Review Findings */}
      {reviewMessage && (
        <ReviewFindings content={reviewMessage.content} />
      )}

      {/* Feedback Chat */}
      <div className="flex-1 min-h-0">
        <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm text-slate-600">
          Any concerns about the review findings? Let me know and I can adjust.
        </div>
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          placeholder="Ask about review findings or request revisions..."
          maxHeight="h-[250px]"
        />
      </div>

      {/* Accept Button */}
      {showAcceptButton && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 mb-3">
            Satisfied with the review? Ready to generate the final project brief?
          </p>
          <button
            onClick={handleAcceptReview}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Finalize & Generate Brief →
          </button>
        </div>
      )}
    </div>
  );
}
```

### 2. Review Findings Component
#### File: `components/helix/brainstorming/ReviewFindings.tsx` (NEW)
Renders structured review findings in organized format.

```typescript
'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReviewFinding {
  category: 'Alignment' | 'Feasibility' | 'Completeness' | 'Risks' | 'Clarity';
  findings: string[];
  status: 'strong' | 'concern' | 'warning';
}

interface ReviewFindingsProps {
  content: string;
  className?: string;
}

export function ReviewFindings({ content, className = '' }: ReviewFindingsProps) {
  const categories = [
    'Alignment',
    'Feasibility',
    'Completeness',
    'Risks',
    'Clarity',
  ];
  const statusColors = {
    strong: 'bg-green-50 border-green-200',
    concern: 'bg-amber-50 border-amber-200',
    warning: 'bg-red-50 border-red-200',
  };

  const parsedFindings = useMemo(() => {
    const findings: ReviewFinding[] = [];

    categories.forEach((category) => {
      const pattern = new RegExp(
        `${category}[^:]*:([^(?:${categories.join('|')})]*)`,
        'i'
      );
      const match = content.match(pattern);

      if (match) {
        const text = match[1]
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => line.trim());

        // Simple heuristic: warnings have "risk", concerns have "gap", strong is positive
        let status: 'strong' | 'concern' | 'warning' = 'strong';
        if (text.some((t) => t.toLowerCase().includes('risk'))) {
          status = 'warning';
        } else if (text.some((t) => t.toLowerCase().includes('gap'))) {
          status = 'concern';
        }

        findings.push({
          category: category as any,
          findings: text,
          status,
        });
      }
    });

    return findings;
  }, [content]);

  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg p-6 overflow-y-auto max-h-[300px] ${className}`}
    >
      {parsedFindings.length > 0 ? (
        <div className="space-y-4">
          {parsedFindings.map((finding) => (
            <div
              key={finding.category}
              className={`border rounded-lg p-4 ${statusColors[finding.status]}`}
            >
              <h3 className="font-semibold text-slate-900 mb-2">
                {finding.category}
              </h3>
              <ul className="text-sm text-slate-700 space-y-1">
                {finding.findings.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-slate-500 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

### 3. Review State Extension
#### File: `lib/helix/review-utils.ts` (NEW)
Utilities for analyzing review findings.

```typescript
export interface ReviewAnalysis {
  strengths: string[];
  concerns: string[];
  risks: string[];
  recommendations: string[];
  overallScore: number; // 0-10
}

export function analyzeReviewContent(content: string): ReviewAnalysis {
  const lines = content.split('\n').filter((l) => l.trim());

  const analysis: ReviewAnalysis = {
    strengths: [],
    concerns: [],
    risks: [],
    recommendations: [],
    overallScore: 7, // Default
  };

  let currentSection = '';

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes('alignment') || lower.includes('strength')) {
      currentSection = 'strengths';
    } else if (lower.includes('concern') || lower.includes('gap')) {
      currentSection = 'concerns';
    } else if (lower.includes('risk')) {
      currentSection = 'risks';
    } else if (lower.includes('recommend')) {
      currentSection = 'recommendations';
    } else if (line.trim() && currentSection) {
      analysis[currentSection as keyof typeof analysis].push(line.trim());
    }
  }

  // Calculate overall score based on risk/concern count
  const negativeCount = analysis.concerns.length + analysis.risks.length;
  analysis.overallScore = Math.max(3, 10 - negativeCount);

  return analysis;
}

export function shouldRevise(analysis: ReviewAnalysis): boolean {
  return analysis.risks.length > 0 || analysis.concerns.length > 2;
}
```

---

## File Structure
```
components/helix/brainstorming/
├── ReviewPhase.tsx (NEW)
├── ReviewFindings.tsx (NEW)
└── [previous phase components]

lib/helix/
├── review-utils.ts (NEW)
└── [previous utilities]
```

---

## Dependencies
- React 19+ (hooks, state)
- react-markdown with remark-gfm
- Components from Phase 053-054
- Utilities from Phase 055-057

---

## Tech Stack for This Phase
- TypeScript
- React Hooks
- String parsing and analysis
- Tailwind CSS for responsive design

---

## Acceptance Criteria
1. ReviewPhase auto-generates review on mount with structured prompt
2. ReviewFindings parses content into Alignment/Feasibility/Completeness/Risks/Clarity sections
3. ReviewFindings color-codes findings: green (strong), amber (concern), red (warning)
4. Chat allows users to discuss findings and request revisions
5. "Finalize & Generate Brief" button appears after review complete
6. stateManager records review findings when accepted
7. analyzeReviewContent extracts strengths, concerns, risks, recommendations
8. analyzeReviewContent calculates overallScore (0-10) based on risk count
9. shouldRevise returns true when risks > 0 or concerns > 2
10. onPhaseComplete callback fired with full review state

---

## Testing Instructions
1. Mount ReviewPhase, verify auto-sends review request
2. Verify ReviewFindings parses "Alignment:" section correctly
3. Verify warning color shows when content includes "risk"
4. Verify concern color shows when content includes "gap"
5. Test with all 5 review categories, verify all sections render
6. Test chat feedback, verify user can request revisions
7. Call analyzeReviewContent with sample review, verify parsing
8. Test overallScore calculation with varying risk counts
9. Verify button disabled during streaming
10. Click finalize, verify onPhaseComplete callback fires

---

## Notes for the AI Agent
- The review section parsing is heuristic-based; consider regex improvements for robustness.
- ReviewFindings color-coding can be enhanced with sentiment analysis in v2.
- Consider adding a "Skip Review" option for users on tight deadlines.
- The overall score (0-10) can be used to automatically suggest revisions if score < 5.
