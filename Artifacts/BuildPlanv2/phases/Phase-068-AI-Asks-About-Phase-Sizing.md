# Phase 068 — AI Asks About Phase Sizing

## Objective
Implement phase sizing component where Claude proposes phase breakdown for each epic, flags sizes outside 3-4 hour target, and collects user feedback before summary generation.

## Prerequisites
- Phase 067 — AI Asks About Epics & Scope — epics validated

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 068 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Once epics are defined, they must be broken into phases (each ~3-4 hours of work). Claude analyzes each epic and proposes phase breakdown with effort estimates. The UI highlights phases that seem too large (suggest splitting) or too small (suggest combining). Users can request adjustments before finalizing phase structure.

---

## Detailed Requirements

### 1. Phase Sizing Component
#### File: `components/helix/build-planning/PhaseSizing.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { getBuildPlanningSystemPrompt } from '@/lib/helix/prompts/build-planning';
import { BuildPlanningStateManager, Phase } from '@/lib/helix/build-planning-state';
import { PhaseBreakdownView } from './PhaseBreakdownView';
import { parsePhasesFromProposal } from '@/lib/helix/phase-parser';

interface PhaseSizingProps {
  projectId: string;
  projectName: string;
  projectBrief: string;
  epics: any[];
  sessionId: string;
  onPhasesValidated: (phases: Phase[], state: any) => void;
}

export function PhaseSizing({
  projectId,
  projectName,
  projectBrief,
  epics,
  sessionId,
  onPhasesValidated,
}: PhaseSizingProps) {
  const [stateManager] = useState(
    () => new BuildPlanningStateManager()
  );
  const [proposedPhases, setProposedPhases] = useState<Phase[]>([]);
  const [stage, setStage] = useState<'sizing' | 'validation'>('sizing');

  const systemPrompt = getBuildPlanningSystemPrompt({
    projectName,
    projectBrief,
    currentPhase: 'phase-sizing',
    proposedEpics: epics,
  });

  const { messages, isLoading, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-sonnet-4-5-20250929',
  });

  // Auto-send phase sizing request on mount
  useEffect(() => {
    if (messages.length === 0) {
      const sizingPrompt = `Great! Now let's break these epics into phases.

For each epic, propose phases with estimated effort (~3-4 hours each). Structure as:

## Epic 1: [Name]
- Phase 1.1: [Name] (~3-4h)
  - [Objective]
- Phase 1.2: [Name] (~3-4h)
  - [Objective]

Flag any phases that seem:
- Too large (>6h) - suggest splitting
- Too small (<2h) - suggest combining

Then ask: "Does this phase breakdown look realistic?"`;

      sendMessage(sizingPrompt);
      setStage('sizing');
    }
  }, []);

  // Extract phases when proposal is complete
  useEffect(() => {
    if (stage === 'sizing') {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.streamingComplete);

      if (lastAssistant && lastAssistant.content.includes('Phase')) {
        const phases = parsePhasesFromProposal(lastAssistant.content);
        if (phases.length > 0) {
          setProposedPhases(phases);
          stateManager.updatePhases(phases);
          setStage('validation');
        }
      }
    }
  }, [messages, stage, stateManager]);

  const handleApprove = () => {
    if (proposedPhases.length > 0 && onPhasesValidated) {
      onPhasesValidated(proposedPhases, stateManager.getState());
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Phase Header */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-orange-900 mb-2">
          Phase Sizing
        </h2>
        <p className="text-sm text-orange-700">
          Let's break epics into phases (~3-4 hours each).
        </p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0">
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          placeholder="Discuss phase sizing and adjustments..."
          maxHeight="h-[400px]"
        />
      </div>

      {/* Phase Breakdown Display */}
      {stage === 'validation' && proposedPhases.length > 0 && (
        <PhaseBreakdownView
          phases={proposedPhases}
          onApprove={handleApprove}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
```

### 2. Phase Breakdown View Component
#### File: `components/helix/build-planning/PhaseBreakdownView.tsx` (NEW)

```typescript
'use client';

import { Phase } from '@/lib/helix/build-planning-state';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PhaseBreakdownViewProps {
  phases: Phase[];
  onApprove: () => void;
  isLoading?: boolean;
}

export function PhaseBreakdownView({
  phases,
  onApprove,
  isLoading = false,
}: PhaseBreakdownViewProps) {
  const groupedByEpic = phases.reduce(
    (acc, phase) => {
      if (!acc[phase.epicId]) acc[phase.epicId] = [];
      acc[phase.epicId].push(phase);
      return acc;
    },
    {} as Record<string, Phase[]>
  );

  const totalHours = phases.reduce((sum, p) => sum + p.estimatedHours, 0);
  const largePhases = phases.filter((p) => p.estimatedHours > 6);
  const smallPhases = phases.filter((p) => p.estimatedHours < 2);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-700">Total Phases</p>
          <p className="text-2xl font-bold text-blue-900">{phases.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-700">Estimated Hours</p>
          <p className="text-2xl font-bold text-green-900">{totalHours}h</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-700">Estimated Days</p>
          <p className="text-2xl font-bold text-amber-900">
            {Math.ceil(totalHours / 8)}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {(largePhases.length > 0 || smallPhases.length > 0) && (
        <div className="space-y-2">
          {largePhases.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-semibold">{largePhases.length} phase(s) > 6 hours</p>
                <p className="text-xs mt-1">
                  Consider splitting these into smaller phases.
                </p>
              </div>
            </div>
          )}
          {smallPhases.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-semibold">{smallPhases.length} phase(s) < 2 hours</p>
                <p className="text-xs mt-1">
                  These might be combinable with adjacent phases.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phases Grouped by Epic */}
      <div className="space-y-4">
        {Object.entries(groupedByEpic).map(([epicId, epicPhases]) => (
          <div key={epicId} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            <h4 className="font-semibold text-slate-900 mb-2">
              {epicId.replace('epic_', 'Epic ')}
            </h4>
            <div className="space-y-2">
              {epicPhases.map((phase) => {
                const isTooLarge = phase.estimatedHours > 6;
                const isTooSmall = phase.estimatedHours < 2;

                return (
                  <div
                    key={phase.id}
                    className={`rounded-lg p-3 border ${
                      isTooLarge
                        ? 'bg-red-50 border-red-200'
                        : isTooSmall
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {phase.name}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {phase.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 flex-shrink-0">
                        <Clock className="w-4 h-4" />
                        {phase.estimatedHours}h
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Approve Button */}
      <button
        onClick={onApprove}
        disabled={isLoading}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-4 h-4" />
        Accept Phase Breakdown →
      </button>
    </div>
  );
}
```

### 3. Phase Parser Utility
#### File: `lib/helix/phase-parser.ts` (NEW)

```typescript
import { Phase } from './build-planning-state';

export function parsePhasesFromProposal(text: string): Phase[] {
  const phases: Phase[] = [];
  const epicPattern = /##\s+Epic\s+(\d+):\s*(.+?)(?=##\s+Epic|$)/gs;

  let epicMatch;
  let phaseCounter = 0;

  while ((epicMatch = epicPattern.exec(text)) !== null) {
    const epicId = `epic_${epicMatch[1]}`;
    const epicBlock = epicMatch[2];

    const phasePattern = /-\s+Phase\s+\d+\.\d+:\s*(.+?)\s*\(~?(\d+)-?(\d+)?h?\)([^-]*?)(?=-\s+Phase|\n##|$)/gs;
    let phaseMatch;

    while ((phaseMatch = phasePattern.exec(epicBlock)) !== null) {
      const name = phaseMatch[1].trim();
      const minHours = parseInt(phaseMatch[2]);
      const maxHours = phaseMatch[3] ? parseInt(phaseMatch[3]) : minHours;
      const estimatedHours = (minHours + maxHours) / 2;
      const description = phaseMatch[4].trim();

      phaseCounter++;
      phases.push({
        id: `phase_${phaseCounter}`,
        epicId,
        name,
        description: description || name,
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        objectives: [],
        acceptanceCriteria: [],
      });
    }
  }

  return phases;
}
```

---

## File Structure
```
components/helix/build-planning/
├── PhaseSizing.tsx (NEW)
├── PhaseBreakdownView.tsx (NEW)
└── [previous components]

lib/helix/
└── phase-parser.ts (NEW)
```

---

## Dependencies
- React 19+, Tailwind CSS
- Components from previous phases
- lucide-react for icons

---

## Tech Stack for This Phase
- TypeScript, React Hooks
- Regex pattern matching
- Tailwind CSS for responsive layout

---

## Acceptance Criteria
1. PhaseSizing auto-sends sizing request on mount
2. parsePhasesFromProposal extracts all phases with name, hours, description
3. PhaseBreakdownView groups phases by epic
4. Shows total phases, hours, and estimated days
5. Flags phases > 6h as "too large" (red)
6. Flags phases < 2h as "too small" (amber)
7. Progress bars update based on actual phase sizes
8. Accept button disabled while isLoading
9. onPhasesValidated includes all phases and state
10. Responsive on mobile and desktop

---

## Testing Instructions
1. Mount PhaseSizing with sample epics, verify auto-sends request
2. Call parsePhasesFromProposal with markdown, verify phases parsed
3. Verify each phase has correct hours extracted
4. Mount PhaseBreakdownView with mixed phase sizes
5. Verify > 6h phases highlighted red
6. Verify < 2h phases highlighted amber
7. Verify normal phases (3-4h) are slate/normal
8. Check total hours calculation
9. Click Accept, verify onPhasesValidated callback fires
10. Test with 10+phases, verify layout handles scrolling

---

## Notes for the AI Agent
- Phase hour estimates are averaged from ranges (e.g., "3-4h" → 3.5h).
- Small/large phase thresholds (2h, 6h) can be made configurable.
- Phase descriptions are extracted from Claude's text format; consider structured output in v2.
