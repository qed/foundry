# Phase 069 — Build Plan Generation: Summary

## Objective
Implement component where Claude generates the Building Brief Summary document in structured markdown format, displayed with edit capability before finalization.

## Prerequisites
- Phase 068 — AI Asks About Phase Sizing — phases validated

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 069 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
With epics and phases defined, Claude generates a comprehensive Building Brief Summary that includes project overview, tech stack, core modules, phase breakdown table, technical decisions, risks, and success metrics. This document serves as the blueprint for the entire build. The UI displays it in rendered markdown form and allows users to request revisions via chat.

---

## Detailed Requirements

### 1. Summary Generation Component
#### File: `components/helix/build-planning/SummaryGeneration.tsx` (NEW)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { getBuildPlanningSystemPrompt } from '@/lib/helix/prompts/build-planning';
import { BuildPlanningStateManager, Phase } from '@/lib/helix/build-planning-state';
import { SummaryPreview } from './SummaryPreview';

interface SummaryGenerationProps {
  projectId: string;
  projectName: string;
  projectBrief: string;
  epics: any[];
  phases: Phase[];
  sessionId: string;
  onSummaryComplete: (summary: string, state: any) => void;
}

export function SummaryGeneration({
  projectId,
  projectName,
  projectBrief,
  epics,
  phases,
  sessionId,
  onSummaryComplete,
}: SummaryGenerationProps) {
  const [stateManager] = useState(() => {
    const manager = new BuildPlanningStateManager();
    manager.updateEpics(epics);
    manager.updatePhases(phases);
    return manager;
  });
  const [summary, setSummary] = useState<string | null>(null);
  const [stage, setStage] = useState<'generation' | 'review'>('generation');

  const systemPrompt = getBuildPlanningSystemPrompt({
    projectName,
    projectBrief,
    currentPhase: 'summary-generation',
    proposedEpics: epics,
    phaseEstimates: phases.reduce((acc, p) => {
      acc[p.epicId] = (acc[p.epicId] || 0) + p.estimatedHours;
      return acc;
    }, {} as Record<string, number>),
  });

  const { messages, isLoading, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-sonnet-4-5-20250929',
  });

  // Auto-generate summary on mount
  useEffect(() => {
    if (messages.length === 0) {
      const summaryPrompt = `Now that we have finalized the epic and phase breakdown, please generate a comprehensive Building Brief Summary.

Follow the format specified in your instructions, including:
- Project overview and success metrics
- Complete tech stack with rationale
- Core modules and architecture
- Full epic and phase breakdown table
- Technical decisions and risks
- Success criteria

Make it detailed enough to give a developer clear understanding of the entire project scope.`;

      sendMessage(summaryPrompt);
      setStage('generation');
    }
  }, []);

  // Extract summary when generated
  useEffect(() => {
    if (stage === 'generation') {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.content.includes('Summary'));

      if (lastAssistant && lastAssistant.streamingComplete) {
        setSummary(lastAssistant.content);
        stateManager.setSummary(lastAssistant.content);
        setStage('review');
      }
    }
  }, [messages, stage, stateManager]);

  const handleFinalize = () => {
    if (summary && onSummaryComplete) {
      onSummaryComplete(summary, stateManager.getState());
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Phase Header */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-emerald-900 mb-2">
          Build Plan Summary
        </h2>
        <p className="text-sm text-emerald-700">
          Claude is generating your comprehensive build plan summary.
        </p>
      </div>

      {/* 2-Column Layout: Summary + Chat */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary Preview (Left) */}
        {summary && (
          <SummaryPreview content={summary} />
        )}

        {/* Chat for Revisions (Right) */}
        <div className="flex flex-col gap-2">
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            Need changes? Describe them and I'll update the summary.
          </div>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            placeholder="Request revisions or clarifications..."
            maxHeight="h-[500px]"
          />
        </div>
      </div>

      {/* Finalize Button */}
      {summary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <button
            onClick={handleFinalize}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Finalize Summary & Generate Phase Specs →
          </button>
        </div>
      )}
    </div>
  );
}
```

### 2. Summary Preview Component
#### File: `components/helix/build-planning/SummaryPreview.tsx` (NEW)

```typescript
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummaryPreviewProps {
  content: string;
}

export function SummaryPreview({ content }: SummaryPreviewProps) {
  const sections = content.split(/^##\s+/m).length - 1;
  const wordCount = content.split(/\s+/).length;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">{sections}</span> major sections
        </p>
        <p className="text-xs text-blue-700">
          <span className="font-semibold">{wordCount}</span> words
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-lg p-6">
        <article className="prose prose-sm prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
```

---

## File Structure
```
components/helix/build-planning/
├── SummaryGeneration.tsx (NEW)
├── SummaryPreview.tsx (NEW)
└── [previous components]
```

---

## Dependencies
- React 19+, react-markdown
- Components from previous phases

---

## Tech Stack for This Phase
- TypeScript, React Hooks
- Markdown rendering
- Tailwind CSS

---

## Acceptance Criteria
1. SummaryGeneration auto-generates summary on mount
2. SummaryPreview displays in rendered markdown format
3. Shows section count and word count
4. Chat allows users to request revisions
5. onSummaryComplete includes finalized summary and state
6. Responsive 2-column layout on desktop, stack on mobile
7. Finalize button disabled during streaming

---

## Testing Instructions
1. Mount SummaryGeneration, verify auto-sends request
2. Verify markdown sections counted correctly
3. Verify word count calculated
4. Request revisions via chat, verify summary updates
5. Click finalize, verify onSummaryComplete callback fires
6. Test with large summary (5000+ words), verify scrolling
7. Verify 2-column layout on 1024px+ width
8. Verify stack layout on mobile

---

## Notes for the AI Agent
- Summary rendering uses prose styling for professional appearance.
- Section counting is approximate based on "##" markers.
- Consider adding PDF export in future iterations.
