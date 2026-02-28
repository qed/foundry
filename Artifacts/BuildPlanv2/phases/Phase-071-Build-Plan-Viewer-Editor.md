# Phase 071 — Build Plan In-App Viewer & Editor

## Objective
Enhance Build Plan Viewer with inline editing: edit phase titles/descriptions, reorder phases via drag-and-drop, split/merge phases, and save changes.

## Prerequisites
- Phase 070 — Build Plan Generation: Phase Files — phase specs generated

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 071 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The generated build plan is a starting point, not the final word. Users need to refine it: adjust phase names, reorder phases based on dependencies, split large phases, merge small ones, etc. This phase enhances the Build Plan Viewer (from Phase 024) with editing capabilities while maintaining full auditability.

---

## Detailed Requirements

### 1. Build Plan Editor Component
#### File: `components/helix/build-planning/BuildPlanEditor.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Phase } from '@/lib/helix/build-planning-state';
import { Edit2, Plus, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';

interface EditablePhase extends Phase {
  isEditing?: boolean;
  editedName?: string;
  editedDescription?: string;
}

interface BuildPlanEditorProps {
  phases: Phase[];
  onPhasesChanged: (phases: Phase[]) => void;
  onSave: (phases: Phase[]) => void;
  readOnly?: boolean;
}

export function BuildPlanEditor({
  phases: initialPhases,
  onPhasesChanged,
  onSave,
  readOnly = false,
}: BuildPlanEditorProps) {
  const [phases, setPhases] = useState<EditablePhase[]>(
    initialPhases.map((p) => ({ ...p }))
  );
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggleEdit = (phaseId: string) => {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              isEditing: !p.isEditing,
              editedName: p.editedName || p.name,
              editedDescription: p.editedDescription || p.description,
            }
          : p
      )
    );
  };

  const handleUpdatePhase = (
    phaseId: string,
    updates: Partial<EditablePhase>
  ) => {
    setPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, ...updates } : p))
    );
    setHasChanges(true);
    onPhasesChanged(phases);
  };

  const handleMovePhase = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= phases.length) return;

    const newPhases = [...phases];
    [newPhases[index], newPhases[newIndex]] = [
      newPhases[newIndex],
      newPhases[index],
    ];
    setPhases(newPhases);
    setHasChanges(true);
    onPhasesChanged(newPhases);
  };

  const handleDeletePhase = (phaseId: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== phaseId));
    setHasChanges(true);
  };

  const handleSplit = (phaseId: string) => {
    const phaseIndex = phases.findIndex((p) => p.id === phaseId);
    const phase = phases[phaseIndex];

    const newPhase: EditablePhase = {
      ...phase,
      id: `${phase.id}_split`,
      name: `${phase.name} (Part 2)`,
      estimatedHours: phase.estimatedHours / 2,
    };

    const updated = [...phases];
    updated[phaseIndex].estimatedHours = phase.estimatedHours / 2;
    updated.splice(phaseIndex + 1, 0, newPhase);

    setPhases(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(phases);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Save */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Build Plan</h2>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Save Changes
          </button>
        )}
      </div>

      {/* Phases List */}
      <div className="space-y-2">
        {phases.map((phase, index) => (
          <div
            key={phase.id}
            className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
          >
            {phase.isEditing ? (
              // Edit Mode
              <div className="space-y-3">
                <input
                  type="text"
                  value={phase.editedName || ''}
                  onChange={(e) =>
                    handleUpdatePhase(phase.id, { editedName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={phase.editedDescription || ''}
                  onChange={(e) =>
                    handleUpdatePhase(phase.id, { editedDescription: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 text-sm">
                  <label>Estimated Hours:</label>
                  <input
                    type="number"
                    value={phase.estimatedHours}
                    onChange={(e) =>
                      handleUpdatePhase(phase.id, {
                        estimatedHours: parseFloat(e.target.value),
                      })
                    }
                    className="w-20 px-2 py-1 border border-blue-300 rounded"
                  />
                </div>
                <button
                  onClick={() => handleToggleEdit(phase.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            ) : (
              // View Mode
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {phase.name}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {phase.description}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>Epic: {phase.epicId}</span>
                      <span>{phase.estimatedHours}h</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!readOnly && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggleEdit(phase.id)}
                        className="p-2 hover:bg-blue-100 rounded text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMovePhase(index, 'up')}
                        disabled={index === 0}
                        className="p-2 hover:bg-slate-100 rounded disabled:opacity-50"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMovePhase(index, 'down')}
                        disabled={index === phases.length - 1}
                        className="p-2 hover:bg-slate-100 rounded disabled:opacity-50"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSplit(phase.id)}
                        className="p-2 hover:bg-amber-100 rounded text-amber-600"
                        title="Split into two"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePhase(phase.id)}
                        className="p-2 hover:bg-red-100 rounded text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total Hours */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">Total Estimated Effort:</span>{' '}
          {phases.reduce((sum, p) => sum + p.estimatedHours, 0)}h (~
          {Math.ceil(phases.reduce((sum, p) => sum + p.estimatedHours, 0) / 8)} days)
        </p>
      </div>
    </div>
  );
}
```

---

## File Structure
```
components/helix/build-planning/
└── BuildPlanEditor.tsx (NEW)
```

---

## Dependencies
- React 19+, lucide-react
- Phase interface from Phase 064
- Tailwind CSS

---

## Tech Stack for This Phase
- TypeScript, React Hooks
- Drag indicators (lucide icons)
- Form handling

---

## Acceptance Criteria
1. Edit button toggles inline edit mode
2. Edit mode allows changing name, description, hours
3. Up/down buttons reorder phases
4. Split button divides phase into two, halving hours
5. Delete button removes phase with confirmation
6. Total hours calculated at bottom
7. Changes tracked with hasChanges flag
8. Save button disabled when no changes
9. onPhasesChanged fires on each edit
10. readOnly prop disables all edits

---

## Testing Instructions
1. Mount BuildPlanEditor with sample phases
2. Click edit on a phase, verify edit mode activates
3. Change name/description, verify updates
4. Click done, verify view mode returns
5. Click up/down, verify phase order changes
6. Click split, verify phase splits into two with half hours
7. Click delete, verify phase removed
8. Verify total hours recalculates
9. Make changes, click save, verify onPhasesChanged fires
10. Test readOnly mode, verify buttons disabled

---

## Notes for the AI Agent
- Phase reordering could use native drag-and-drop in v2 for better UX.
- Split operation is simple 50/50; consider custom split percentages in future.
- Consider undo/redo functionality for complex edits.
- Merge operation (combine two phases) can be added in v2.
