# Phase 073 — Build Plan Revision Workflow

## Objective
Implement revision workflow where users provide feedback, Claude revises specific phases or overall structure, with diff view and version history tracking.

## Prerequisites
- Phase 072 — Build Plan Quality Validation — quality report generated

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 073 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Build plans rarely need zero revisions. Users discover issues, change priorities, or want refinements after seeing the initial plan. This phase implements a revision workflow where users can request specific changes ("increase testing phase to 2 days", "reorder deployment before docs"), Claude applies revisions intelligently, and users can see diffs and revert to previous versions.

---

## Detailed Requirements

### 1. Revision Workflow Component
#### File: `components/helix/build-planning/RevisionWorkflow.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Phase } from '@/lib/helix/build-planning-state';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { BuildPlanEditor } from './BuildPlanEditor';
import { VersionHistory } from './VersionHistory';
import { DiffViewer } from './DiffViewer';

interface PlanVersion {
  id: string;
  timestamp: Date;
  phases: Phase[];
  description: string;
}

interface RevisionWorkflowProps {
  projectId: string;
  projectName: string;
  initialPhases: Phase[];
  sessionId: string;
  onRevisionComplete: (finalPhases: Phase[]) => void;
}

export function RevisionWorkflow({
  projectId,
  projectName,
  initialPhases,
  sessionId,
  onRevisionComplete,
}: RevisionWorkflowProps) {
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [versions, setVersions] = useState<PlanVersion[]>([
    {
      id: 'v_initial',
      timestamp: new Date(),
      phases: initialPhases,
      description: 'Initial plan',
    },
  ]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([
    'v_initial',
  ]);
  const [showDiff, setShowDiff] = useState(false);

  const systemPrompt = `You are a build plan revision specialist. Help the user refine their build plan by:
1. Understanding their revision request
2. Applying intelligent changes to the phases
3. Maintaining dependencies and consistency
4. Explaining what changed

When revising, respond with the updated phases in this format:
## Revised Phases
- Phase X.Y: [Name] (~Zh)
  - Change: [What changed and why]`;

  const { messages, isLoading, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-sonnet-4-5-20250929',
  });

  const handleRevisionRequest = async (request: string) => {
    await sendMessage(request);

    // After Claude responds, extract updated phases
    // This is simplified; production should parse Claude's response properly
    setTimeout(() => {
      // Simulate phase update
      const newVersion: PlanVersion = {
        id: `v_${Date.now()}`,
        timestamp: new Date(),
        phases: phases,
        description: request.substring(0, 50),
      };
      setVersions((prev) => [...prev, newVersion]);
    }, 1000);
  };

  const handleAcceptRevision = () => {
    onRevisionComplete(phases);
  };

  const handleCompareVersions = () => {
    if (selectedVersions.length !== 2) {
      alert('Select exactly 2 versions to compare');
      return;
    }
    setShowDiff(true);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">
          Build Plan Refinement
        </h2>
        <p className="text-sm text-indigo-700">
          Request revisions and iterate on your build plan. Chat with Claude to
          adjust phases, reorder, or add details.
        </p>
      </div>

      {/* 3-Section Layout: Editor, Chat, History */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan Editor (Left) */}
        <div className="lg:col-span-1 border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-slate-100 border-b border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">Current Plan</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <BuildPlanEditor
              phases={phases}
              onPhasesChanged={setPhases}
              onSave={setPhases}
              readOnly={false}
            />
          </div>
        </div>

        {/* Chat (Middle) */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            Describe changes needed: "increase phase X to 2 days", "reorder", etc.
          </div>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleRevisionRequest}
            placeholder="Request a revision..."
            maxHeight="h-[500px]"
          />
        </div>

        {/* Version History (Right) */}
        <div className="lg:col-span-1 border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-slate-100 border-b border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">History</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <VersionHistory
              versions={versions}
              selectedVersions={selectedVersions}
              onSelectVersion={(versionId) => {
                setSelectedVersions([versionId]);
                const version = versions.find((v) => v.id === versionId);
                if (version) setPhases(version.phases);
              }}
              onCompare={handleCompareVersions}
            />
          </div>
        </div>
      </div>

      {/* Diff View Modal */}
      {showDiff && selectedVersions.length === 2 && (
        <DiffViewer
          version1={versions.find((v) => v.id === selectedVersions[0])!}
          version2={versions.find((v) => v.id === selectedVersions[1])!}
          onClose={() => setShowDiff(false)}
        />
      )}

      {/* Accept Button */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <button
          onClick={handleAcceptRevision}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          Accept Final Plan & Move to Step 3.2 →
        </button>
      </div>
    </div>
  );
}
```

### 2. Version History Component
#### File: `components/helix/build-planning/VersionHistory.tsx` (NEW)

```typescript
'use client';

import { Phase } from '@/lib/helix/build-planning-state';
import { formatDistanceToNow } from 'date-fns';
import { Check, Eye, Compare } from 'lucide-react';

export interface PlanVersion {
  id: string;
  timestamp: Date;
  phases: Phase[];
  description: string;
}

interface VersionHistoryProps {
  versions: PlanVersion[];
  selectedVersions: string[];
  onSelectVersion: (versionId: string) => void;
  onCompare: () => void;
}

export function VersionHistory({
  versions,
  selectedVersions,
  onSelectVersion,
  onCompare,
}: VersionHistoryProps) {
  return (
    <div className="p-4 space-y-3">
      {versions.map((version) => (
        <button
          key={version.id}
          onClick={() => onSelectVersion(version.id)}
          className={`w-full text-left p-3 rounded-lg border transition ${
            selectedVersions.includes(version.id)
              ? 'bg-blue-50 border-blue-300'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {version.description}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatDistanceToNow(version.timestamp, { addSuffix: true })}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {version.phases.length} phases
              </p>
            </div>
            {selectedVersions.includes(version.id) && (
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
          </div>
        </button>
      ))}

      {selectedVersions.length === 2 && (
        <button
          onClick={onCompare}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Compare className="w-4 h-4" />
          Compare Versions
        </button>
      )}
    </div>
  );
}
```

### 3. Diff Viewer Component
#### File: `components/helix/build-planning/DiffViewer.tsx` (NEW)

```typescript
'use client';

import { Phase } from '@/lib/helix/build-planning-state';
import { X } from 'lucide-react';

interface PlanVersion {
  phases: Phase[];
  description: string;
}

interface DiffViewerProps {
  version1: PlanVersion;
  version2: PlanVersion;
  onClose: () => void;
}

export function DiffViewer({ version1, version2, onClose }: DiffViewerProps) {
  const added = version2.phases.filter(
    (p) => !version1.phases.find((v) => v.id === p.id)
  );
  const removed = version1.phases.filter(
    (p) => !version2.phases.find((v) => v.id === p.id)
  );
  const modified = version2.phases.filter((p2) => {
    const p1 = version1.phases.find((v) => v.id === p2.id);
    return p1 && (p1.name !== p2.name || p1.estimatedHours !== p2.estimatedHours);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl max-h-96 overflow-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Compare Versions</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Removed */}
        {removed.length > 0 && (
          <div>
            <h3 className="font-semibold text-red-700 mb-2">Removed</h3>
            <div className="space-y-1">
              {removed.map((p) => (
                <p key={p.id} className="text-sm text-red-600">
                  - {p.name}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Added */}
        {added.length > 0 && (
          <div>
            <h3 className="font-semibold text-green-700 mb-2">Added</h3>
            <div className="space-y-1">
              {added.map((p) => (
                <p key={p.id} className="text-sm text-green-600">
                  + {p.name}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Modified */}
        {modified.length > 0 && (
          <div>
            <h3 className="font-semibold text-blue-700 mb-2">Modified</h3>
            <div className="space-y-2">
              {modified.map((p2) => {
                const p1 = version1.phases.find((v) => v.id === p2.id)!;
                return (
                  <div key={p2.id} className="text-sm text-blue-600">
                    <p className="font-medium">{p2.name}</p>
                    {p1.estimatedHours !== p2.estimatedHours && (
                      <p className="text-xs ml-2">
                        Hours: {p1.estimatedHours}h → {p2.estimatedHours}h
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## File Structure
```
components/helix/build-planning/
├── RevisionWorkflow.tsx (NEW)
├── VersionHistory.tsx (NEW)
└── DiffViewer.tsx (NEW)
```

---

## Dependencies
- React 19+, lucide-react, date-fns
- Phase interface
- Components from previous phases

---

## Tech Stack for This Phase
- TypeScript, React Hooks
- Version management
- Diff calculation

---

## Acceptance Criteria
1. RevisionWorkflow displays 3-column layout with editor, chat, history
2. Users can request revisions via chat
3. Versions are tracked with timestamp and description
4. VersionHistory shows all previous versions
5. Clicking version loads it into editor
6. Selecting 2 versions enables compare
7. DiffViewer shows added/removed/modified phases
8. onRevisionComplete fires when accepting final plan
9. Responsive layout on mobile (stacked columns)

---

## Testing Instructions
1. Mount RevisionWorkflow with initial phases
2. Request revision, verify chat processes it
3. Verify new version created in history
4. Click version, verify phases load into editor
5. Edit in editor, verify changes tracked
6. Select 2 versions, click compare
7. Verify diff shows added/removed/modified
8. Accept final plan, verify callback fires
9. Test with 10+ versions, verify scrolling
10. Test on mobile, verify column stacking

---

## Notes for the AI Agent
- Revision parsing from Claude is simplified; production should parse structured format.
- Diff calculation compares phase IDs; consider better matching for renamed phases.
- Version history can be persisted to DB in phase 061 pattern.
