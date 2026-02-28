# Phase 059 — Final Brief Phase: AI Writes Brief

## Objective
Implement the final phase where Claude generates a comprehensive project brief in structured markdown format, displayed alongside chat for real-time editing feedback.

## Prerequisites
- Phase 058 — Review Phase: AI Self-Reviews — review accepted

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 059 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The final brief phase synthesizes all discovery, proposal, and review into a comprehensive document that serves as the project specification. The brief includes sections for What, Who, Features, Build Plan, Tech Stack, Open Questions, and Success Criteria. The UI shows the brief in a rendered markdown panel alongside the chat, allowing users to request edits without leaving the interface ("make the features section more detailed", "add timeline to build plan", etc.).

This phase creates the artifact that moves into Stage 3 (Build Planning), ensuring continuity from brainstorming to implementation.

---

## Detailed Requirements

### 1. Final Brief Phase Component
#### File: `components/helix/brainstorming/FinalBriefPhase.tsx` (NEW)
Component managing brief generation and real-time editing.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { getBrainstormingSystemPrompt } from '@/lib/helix/prompts/brainstorming';
import { BrainstormingStateManager } from '@/lib/helix/brainstorming-state';
import { BriefPreview } from './BriefPreview';

interface FinalBriefPhaseProps {
  projectId: string;
  projectName: string;
  fullContext: any;
  sessionId: string;
  onBriefComplete?: (briefContent: string, state: any) => void;
}

export function FinalBriefPhase({
  projectId,
  projectName,
  fullContext,
  sessionId,
  onBriefComplete,
}: FinalBriefPhaseProps) {
  const [stateManager] = useState(() => {
    const manager = new BrainstormingStateManager('final-brief');
    return manager;
  });
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefGenerated, setBriefGenerated] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);

  const systemPrompt = getBrainstormingSystemPrompt({
    projectName,
    currentPhase: 'final-brief',
    previousAnswers: fullContext.discoveryAnswers,
  });

  const { messages, isLoading, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-sonnet-4-5-20250929', // Use Sonnet for better quality brief
  });

  // Auto-generate brief on mount
  useEffect(() => {
    if (messages.length === 0) {
      const briefPrompt = `Based on our complete brainstorming conversation, please generate a comprehensive project brief in markdown format. Include:

# [Project Name] — Project Brief

## What
(2-3 sentence overview)

## Who
(Description of primary users and stakeholders)

## Features & Scope
(Bulleted list of major features/capabilities)

## Build Plan Overview
(High-level phases/timeline)

## Tech Stack Assumptions
(Technology recommendations)

## Success Criteria
(Measurable goals)

## Open Questions
(Unresolved decisions)

## Next Steps
(Action items)`;

      sendMessage(briefPrompt);
    }
  }, []);

  // Extract brief from assistant message
  useEffect(() => {
    const lastAssistant = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'assistant' && m.content.includes('Project Brief'));

    if (lastAssistant && !briefGenerated) {
      setBriefContent(lastAssistant.content);
      setBriefGenerated(true);
      stateManager.recordBrief(lastAssistant.content);
    }
  }, [messages, briefGenerated, stateManager]);

  const handleFinalizeBrief = () => {
    if (briefContent && onBriefComplete) {
      onBriefComplete(briefContent, stateManager.getState());
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Phase Header */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">
          Final Brief Phase
        </h2>
        <p className="text-sm text-indigo-700">
          Here's your comprehensive project brief. Review it carefully and ask
          for changes if needed.
        </p>
      </div>

      {/* Brief Preview and Chat in 2-Column Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Brief Preview (Left) */}
        {briefContent && (
          <BriefPreview content={briefContent} isEditable={true} />
        )}

        {/* Chat for Edits (Right) */}
        <div className="flex flex-col gap-2">
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            Need changes? Describe them and I'll update the brief.
          </div>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            placeholder="Request edits or additional details..."
            maxHeight="h-[400px]"
          />
        </div>
      </div>

      {/* Finalize Button */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-700 mb-3">
          Satisfied with the brief? You can make final edits in the next step.
        </p>
        <button
          onClick={handleFinalizeBrief}
          disabled={!briefContent || isLoading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Finalize Brief & Save →
        </button>
      </div>
    </div>
  );
}
```

### 2. Brief Preview Component
#### File: `components/helix/brainstorming/BriefPreview.tsx` (NEW)
Renders the generated brief in markdown with highlight annotations.

```typescript
'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface BriefPreviewProps {
  content: string;
  isEditable?: boolean;
}

export function BriefPreview({ content, isEditable = false }: BriefPreviewProps) {
  const sections = useMemo(() => {
    const sectionPattern = /^## (.+)$/gm;
    const matches = [...content.matchAll(sectionPattern)];
    return matches.map((m) => m[1]);
  }, [content]);

  const completionPercent = useMemo(() => {
    const expectedSections = [
      'What',
      'Who',
      'Features & Scope',
      'Build Plan',
      'Tech Stack',
      'Success Criteria',
      'Open Questions',
      'Next Steps',
    ];
    const completed = sections.filter((s) =>
      expectedSections.some((e) => s.includes(e))
    ).length;
    return Math.round((completed / expectedSections.length) * 100);
  }, [sections]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Completion Indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Brief Completeness
          </span>
          <span className="text-sm font-bold text-blue-700">{completionPercent}%</span>
        </div>
        <div className="bg-blue-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Brief Content */}
      <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-lg p-6">
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
                <h2 className="text-xl font-bold mb-3 mt-6 text-slate-800 border-b-2 border-blue-300 pb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold mb-2 text-slate-700">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-3 text-slate-700 leading-relaxed">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-3 ml-2 text-slate-700">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-3 ml-2 text-slate-700">
                  {children}
                </ol>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>

      {isEditable && (
        <div className="text-xs text-slate-500 text-center py-2">
          💡 Editing this brief? Changes will be applied in the next step.
        </div>
      )}
    </div>
  );
}
```

### 3. Brief Content Extraction Utility
#### File: `lib/helix/brief-extraction.ts` (NEW)
Extracts and validates brief sections.

```typescript
export interface BriefSection {
  title: string;
  content: string;
  isComplete: boolean;
}

export interface ExtractedBrief {
  title: string;
  sections: BriefSection[];
  isValid: boolean;
  validationErrors: string[];
}

export function extractBriefSections(content: string): ExtractedBrief {
  const sections: BriefSection[] = [];
  const validationErrors: string[] = [];

  // Extract title
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Untitled Brief';

  // Expected sections
  const expectedSections = ['What', 'Who', 'Features', 'Build Plan', 'Tech Stack', 'Success Criteria', 'Open Questions', 'Next Steps'];

  // Extract each section
  for (const section of expectedSections) {
    const pattern = new RegExp(`^## ${section}.*?$([\\s\\S]*?)(?=^##|$)`, 'm');
    const match = content.match(pattern);

    if (match && match[1].trim()) {
      sections.push({
        title: section,
        content: match[1].trim(),
        isComplete: match[1].trim().length > 20,
      });
    } else {
      validationErrors.push(`Missing or incomplete section: ${section}`);
    }
  }

  return {
    title,
    sections,
    isValid: validationErrors.length === 0,
    validationErrors,
  };
}

export function briefToMarkdown(brief: ExtractedBrief): string {
  let markdown = `# ${brief.title}\n\n`;

  for (const section of brief.sections) {
    markdown += `## ${section.title}\n${section.content}\n\n`;
  }

  return markdown;
}
```

---

## File Structure
```
components/helix/brainstorming/
├── FinalBriefPhase.tsx (NEW)
├── BriefPreview.tsx (NEW)
└── [previous phase components]

lib/helix/
├── brief-extraction.ts (NEW)
└── [previous utilities]
```

---

## Dependencies
- React 19+ (hooks, state)
- react-markdown with remark-gfm
- Anthropic SDK (Sonnet model for high-quality generation)
- Components from Phase 053-054

---

## Tech Stack for This Phase
- TypeScript
- React Hooks (useState, useEffect, useMemo)
- Markdown parsing and rendering
- String pattern matching

---

## Acceptance Criteria
1. FinalBriefPhase auto-generates brief on mount with Sonnet model
2. BriefPreview renders markdown with proper section formatting (H1, H2)
3. Completion percentage calculates based on presence of expected sections
4. Progress bar updates dynamically (0-100%)
5. Chat allows users to request edits to specific sections
6. "Finalize Brief & Save" button disabled until brief is generated
7. extractBriefSections parses all 8 standard sections
8. extractBriefSections marks section complete only if content > 20 chars
9. briefToMarkdown reconstructs valid markdown from extracted sections
10. onBriefComplete callback includes final brief content and state

---

## Testing Instructions
1. Mount FinalBriefPhase, verify auto-sends brief generation request
2. Verify BriefPreview renders with H1 title and H2 section headers
3. Verify completion bar shows 0% initially, updates to 100% when all sections present
4. Feed brief with all 8 sections, verify completionPercent = 100%
5. Feed brief with 5 sections, verify completionPercent = ~62%
6. Request edit ("make features more detailed"), verify chat accumulates message
7. Test extractBriefSections with valid brief, verify sections extracted
8. Test with brief missing "Success Criteria", verify validationErrors contains error
9. Test briefToMarkdown roundtrip, verify output matches input
10. Click finalize, verify onBriefComplete fires with content and state

---

## Notes for the AI Agent
- BriefPreview uses Sonnet model for generation instead of Haiku for higher quality output.
- The 2-column layout works on desktop; mobile collapses to 1 column (grid-cols-1 lg:grid-cols-2).
- Completion percentage can be enhanced with ML-based content quality scoring in v2.
- Consider adding a "Download PDF" option to export the brief.
- The brief sections are validated but not strictly required—allow flexibility in brief structure.
