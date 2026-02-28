# Phase 060 — Save & Edit Generated Brief

## Objective
Implement rich text editor allowing users to manually edit AI-generated brief before finalizing, with side-by-side comparison to AI version and version history tracking.

## Prerequisites
- Phase 059 — Final Brief Phase: AI Writes Brief — brief generated

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 060 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The AI-generated brief is a strong starting point but users often need to make refinements—correcting assumptions, adding specific details, or adjusting tone. This phase provides a rich text editor for inline editing while maintaining a read-only view of the AI's original. Users can see diffs of their changes and revert to the AI version at any point. Version history allows users to track edits over multiple iterations.

---

## Detailed Requirements

### 1. Brief Editor Component
#### File: `components/helix/brainstorming/BriefEditor.tsx` (NEW)
Rich text editor with side-by-side AI version comparison.

```typescript
'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Copy, RotateCcw, Save } from 'lucide-react';

interface BriefEditorProps {
  aiGeneratedBrief: string;
  onSave: (editedBrief: string) => void;
  onCancel?: () => void;
  projectName: string;
}

export function BriefEditor({
  aiGeneratedBrief,
  onSave,
  onCancel,
  projectName,
}: BriefEditorProps) {
  const [editedBrief, setEditedBrief] = useState(aiGeneratedBrief);
  const [showDiff, setShowDiff] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editHistory, setEditHistory] = useState<string[]>([aiGeneratedBrief]);

  const hasChanges = editedBrief !== aiGeneratedBrief;
  const changeCount = editHistory.length - 1;

  const handleRevert = useCallback(() => {
    setEditedBrief(aiGeneratedBrief);
    setEditHistory([aiGeneratedBrief]);
  }, [aiGeneratedBrief]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate save
      onSave(editedBrief);
    } finally {
      setIsSaving(false);
    }
  }, [editedBrief, onSave]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBrief = e.target.value;
    setEditedBrief(newBrief);

    // Track history (max 10 versions)
    if (editHistory[editHistory.length - 1] !== newBrief) {
      setEditHistory((prev) => [...prev.slice(-9), newBrief]);
    }
  };

  const handleUndo = () => {
    if (editHistory.length > 1) {
      const newHistory = editHistory.slice(0, -1);
      setEditHistory(newHistory);
      setEditedBrief(newHistory[newHistory.length - 1]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-100 rounded-lg"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Brief
              </h2>
              <p className="text-xs text-slate-500">
                {projectName} — {changeCount} change{changeCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                showDiff
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {showDiff ? 'Hide Diff' : 'Show Diff'}
            </button>

            {hasChanges && (
              <button
                onClick={handleUndo}
                disabled={editHistory.length <= 1}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 text-xs text-slate-600">
          <span>{editedBrief.length} characters</span>
          <span>{editedBrief.split('\n').length} lines</span>
          <span>{editedBrief.split(' ').length} words</span>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {showDiff ? (
          // Diff View: Side-by-side
          <div className="grid grid-cols-2 gap-4 p-4 h-full overflow-auto">
            {/* AI Version (Left) */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-2 text-sm">
                AI Version (Original)
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 h-full overflow-auto">
                <article className="prose prose-sm prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiGeneratedBrief}
                  </ReactMarkdown>
                </article>
              </div>
            </div>

            {/* Edited Version (Right) */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-2 text-sm">
                Your Version (Current Edits)
              </h3>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 h-full overflow-auto">
                <article className="prose prose-sm prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editedBrief}
                  </ReactMarkdown>
                </article>
              </div>
            </div>
          </div>
        ) : (
          // Edit View: Full width textarea
          <textarea
            value={editedBrief}
            onChange={handleTextChange}
            className="w-full h-full p-4 font-mono text-sm resize-none border-0 focus:outline-none focus:ring-0"
            placeholder="Edit your brief here..."
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4 bg-slate-50 flex gap-2 justify-end">
        {hasChanges && (
          <button
            onClick={handleRevert}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg font-medium hover:bg-slate-100"
          >
            Revert to AI Version
          </button>
        )}

        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg font-medium hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
```

### 2. Brief Version Manager
#### File: `lib/helix/brief-versioning.ts` (NEW)
Manages brief versions and change tracking.

```typescript
export interface BriefVersion {
  id: string;
  content: string;
  createdAt: Date;
  source: 'ai-generated' | 'user-edited';
  summary?: string;
}

export class BriefVersionManager {
  private versions: BriefVersion[] = [];
  private currentVersionId: string = '';

  constructor(initialBrief: string) {
    const version: BriefVersion = {
      id: this.generateId(),
      content: initialBrief,
      createdAt: new Date(),
      source: 'ai-generated',
      summary: 'Initial AI generation',
    };
    this.versions = [version];
    this.currentVersionId = version.id;
  }

  saveVersion(content: string, summary?: string): string {
    const version: BriefVersion = {
      id: this.generateId(),
      content,
      createdAt: new Date(),
      source: 'user-edited',
      summary: summary || `Edited at ${new Date().toLocaleTimeString()}`,
    };
    this.versions.push(version);
    this.currentVersionId = version.id;
    return version.id;
  }

  getCurrentVersion(): BriefVersion | undefined {
    return this.versions.find((v) => v.id === this.currentVersionId);
  }

  getVersionHistory(): BriefVersion[] {
    return [...this.versions];
  }

  revertToVersion(versionId: string): boolean {
    const version = this.versions.find((v) => v.id === versionId);
    if (version) {
      this.currentVersionId = versionId;
      return true;
    }
    return false;
  }

  compareVersions(versionId1: string, versionId2: string) {
    const v1 = this.versions.find((v) => v.id === versionId1);
    const v2 = this.versions.find((v) => v.id === versionId2);

    if (!v1 || !v2) return null;

    return {
      added: this.countLineChanges(v1.content, v2.content, 'added'),
      removed: this.countLineChanges(v1.content, v2.content, 'removed'),
      modified: this.countLineChanges(v1.content, v2.content, 'modified'),
    };
  }

  private countLineChanges(
    old: string,
    new_: string,
    type: 'added' | 'removed' | 'modified'
  ): number {
    const oldLines = old.split('\n');
    const newLines = new_.split('\n');

    if (type === 'added') {
      return newLines.filter((line) => !oldLines.includes(line)).length;
    } else if (type === 'removed') {
      return oldLines.filter((line) => !newLines.includes(line)).length;
    } else {
      // modified: lines that exist in both but with differences
      return Math.abs(oldLines.length - newLines.length);
    }
  }

  private generateId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON(): BriefVersion[] {
    return this.versions;
  }

  static fromJSON(versions: BriefVersion[]): BriefVersionManager {
    const manager = new BriefVersionManager('');
    manager.versions = versions;
    if (versions.length > 0) {
      manager.currentVersionId = versions[versions.length - 1].id;
    }
    return manager;
  }
}
```

### 3. Brief Storage Hook
#### File: `hooks/useBriefEditor.ts` (NEW)
React hook for managing brief editing and persistence.

```typescript
import { useState, useCallback } from 'react';
import { BriefVersionManager } from '@/lib/helix/brief-versioning';

export function useBriefEditor(initialBrief: string) {
  const [versionManager] = useState(
    () => new BriefVersionManager(initialBrief)
  );
  const [currentContent, setCurrentContent] = useState(initialBrief);

  const saveVersion = useCallback(
    (content: string, summary?: string) => {
      versionManager.saveVersion(content, summary);
      setCurrentContent(content);
    },
    [versionManager]
  );

  const revertToVersion = useCallback(
    (versionId: string) => {
      if (versionManager.revertToVersion(versionId)) {
        const version = versionManager.getCurrentVersion();
        if (version) {
          setCurrentContent(version.content);
        }
      }
    },
    [versionManager]
  );

  const getHistory = useCallback(() => {
    return versionManager.getVersionHistory();
  }, [versionManager]);

  return {
    currentContent,
    saveVersion,
    revertToVersion,
    getHistory,
    versionManager,
  };
}
```

---

## File Structure
```
components/helix/brainstorming/
├── BriefEditor.tsx (NEW)
└── [previous phase components]

lib/helix/
├── brief-versioning.ts (NEW)
└── [previous utilities]

hooks/
└── useBriefEditor.ts (NEW)
```

---

## Dependencies
- React 19+ (hooks, state)
- react-markdown with remark-gfm
- lucide-react for icons
- Tailwind CSS

---

## Tech Stack for This Phase
- TypeScript
- React Hooks
- Version control (custom implementation)
- Markdown rendering

---

## Acceptance Criteria
1. BriefEditor displays AI version in read-only markdown on left in diff mode
2. BriefEditor displays textarea for editing on right in edit mode
3. "Show Diff" toggle switches between edit view and side-by-side diff view
4. Character/line/word count updates as user types
5. "Revert to AI Version" button appears when hasChanges = true
6. Undo button appears when editHistory.length > 1 and reverts to previous state
7. "Save Changes" button disabled when no changes from AI version
8. BriefVersionManager tracks versions with unique IDs
9. compareVersions counts added/removed/modified lines between versions
10. useBriefEditor provides saveVersion, revertToVersion, getHistory methods

---

## Testing Instructions
1. Mount BriefEditor with sample AI brief, verify textarea contains content
2. Type in editor, verify character count updates
3. Toggle "Show Diff", verify side-by-side view renders with AI and edited versions
4. Make 3 edits, click undo 2 times, verify content reverts
5. Click "Revert to AI Version", verify content matches aiGeneratedBrief
6. Save version, verify onSave callback fires with edited content
7. Create BriefVersionManager with initial brief, verify getCurrentVersion returns it
8. Save 3 versions, verify getVersionHistory returns all 3
9. Call compareVersions on two versions, verify added/removed counts > 0
10. Test revertToVersion with invalid ID, verify returns false

---

## Notes for the AI Agent
- The diff view uses side-by-side layout; mobile may need tabs or vertical stacking.
- Version history is kept in memory; persistence to DB comes in Phase 061.
- The undo stack is limited to 10 versions to prevent memory issues.
- Consider adding collaborative editing (multiple users) in v2.
- The character count and word count can be enhanced with estimated read time in future iterations.
