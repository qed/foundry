# Phase 025: Step 3.3 — Review Build Plan Quality

## Objective
Implement a comprehensive Build Plan quality review checklist that evaluates phase sizing, logical dependencies, testability of criteria, phase complexity, and overall plan structure. Allow users to mark each review item, add notes, and approve or request revisions.

## Prerequisites
- Phase 023 completed (Build Plan files saved and validated)
- Phase 024 completed (BuildPlanViewer component available)
- Build Plan structure stored in evidence_data

## Epic Context (Epic 4: Build Planning & Repo Setup)
Step 3.3 is the quality gate before the Build Plan is locked in. This review ensures the plan is well-structured, realistic, and detailed enough for the AI agent to build from in Stage 6. Pass/fail on this review controls whether to proceed to Step 4.1 (Repo Setup).

## Context
A well-structured Build Plan is critical to project success. Step 3.3 provides a systematic checklist to verify:
- Phases are appropriately sized (not too large, not too small)
- Phases build logically on each other
- Acceptance criteria are specific and testable
- Phases are neither too vague nor overly detailed
- All prerequisites are documented
- Infrastructure/foundation comes before features

The review produces a formal approval (success criteria for Stage Gate 3) or revision request (triggering revisions to the Build Plan).

## Detailed Requirements

### 1. Build Plan Quality Review Checklist Component
Create interactive checklist with pass/fail toggles and notes fields:

```typescript
// Components: helix/BuildPlanQualityReview.tsx

interface ReviewItem {
  id: string;
  title: string;
  description: string;
  category: "sizing" | "dependencies" | "criteria" | "complexity" | "structure";
  passed?: boolean;
  notes?: string;
  autoCheckable?: boolean;
  checkFunction?: (plan: BuildPlan) => boolean;
}

const REVIEW_CHECKLIST: ReviewItem[] = [
  {
    id: "phase-sizing",
    title: "Phases are sized ~3–4 hours each",
    description:
      "Each phase should represent approximately half a day of focused work. Flag phases with requirements counts that suggest 15+ hours or <1 hour of work.",
    category: "sizing",
    autoCheckable: true,
    checkFunction: (plan) => {
      // Check phase requirement counts
      return plan.phases.every(phase => {
        const reqCount = (phase.content.match(/##\s+.*Requirement/gi) || []).length +
                        (phase.content.match(/^\d+\.\s/gm) || []).length;
        return reqCount >= 8 && reqCount <= 15; // Typical 3–4 hour phase
      });
    }
  },
  {
    id: "phase-dependencies",
    title: "Phases build logically on each other",
    description:
      "No circular dependencies. Phases don't reference capabilities from later phases. Prerequisites are documented.",
    category: "dependencies"
  },
  {
    id: "criteria-specificity",
    title: "Acceptance criteria are specific and testable",
    description:
      "Each criterion should be verifiable (not 'looks good'), with expected vs. actual outcomes.",
    category: "criteria"
  },
  {
    id: "complexity-balance",
    title: "No phase is too large (15+ requirements)",
    description:
      "Phases with 15+ requirements should be split. Single large phase can derail timeline.",
    category: "complexity"
  },
  {
    id: "vagueness-check",
    title: "No phase is too vague (without code examples)",
    description:
      "Each phase should include at least one code example, component snippet, or implementation detail.",
    category: "complexity"
  },
  {
    id: "prerequisites-complete",
    title: "All phases have prerequisites listed",
    description:
      "Prerequisites section should document what must be true before starting.",
    category: "structure"
  },
  {
    id: "foundation-first",
    title: "Foundation/infrastructure phases come first",
    description:
      "Setup, configuration, and foundational components should be in early phases. UI features later.",
    category: "dependencies"
  },
  {
    id: "scope-reasonableness",
    title: "Total phase count is reasonable for project scope",
    description:
      "8–15 phases for typical project. 5–8 for small scope, 15–25 for large scope. Alert if >30 or <5.",
    category: "structure"
  },
  {
    id: "epic-alignment",
    title: "Each phase clearly belongs to an epic",
    description:
      "Phases should be organized by epic. Each phase should reference which epic it belongs to.",
    category: "structure"
  },
  {
    id: "completion-criteria",
    title: "Each phase has clear completion/success criteria",
    description:
      "Phase should define how to know when it's done. Acceptance criteria list should have 10+ items.",
    category: "criteria"
  }
];

interface BuildPlanQualityReviewProps {
  projectId: string;
  onApprove: (checklist: ReviewChecklistResult) => void;
  onRevisionRequest: (checklist: ReviewChecklistResult, notes: string) => void;
}

export function BuildPlanQualityReview({
  projectId,
  onApprove,
  onRevisionRequest
}: BuildPlanQualityReviewProps) {
  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null);
  const [checklist, setChecklist] = useState<ReviewItem[]>(REVIEW_CHECKLIST);
  const [overallNotes, setOverallNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const plan = await fetchBuildPlan(projectId);
        setBuildPlan(plan);

        // Auto-check items with check functions
        const updatedChecklist = checklist.map(item => {
          if (item.autoCheckable && item.checkFunction && plan) {
            return { ...item, passed: item.checkFunction(plan) };
          }
          return item;
        });
        setChecklist(updatedChecklist);
      } catch (err) {
        setError("Failed to load Build Plan for review");
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [projectId]);

  const toggleItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, passed: !item.passed } : item
      )
    );
  };

  const updateItemNotes = (id: string, notes: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, notes } : item
      )
    );
  };

  const allPassed = checklist.every(item => item.passed);
  const passedCount = checklist.filter(item => item.passed).length;

  const handleApprove = () => {
    onApprove({
      timestamp: new Date().toISOString(),
      allPassed: true,
      itemsChecked: checklist,
      passedCount,
      totalCount: checklist.length,
      overallNotes,
      approverName: "User" // Should be populated from auth context
    });
  };

  const handleRevisionRequest = () => {
    onRevisionRequest(
      {
        timestamp: new Date().toISOString(),
        allPassed: false,
        itemsChecked: checklist,
        passedCount,
        totalCount: checklist.length,
        overallNotes
      },
      overallNotes
    );
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-600">Loading Build Plan for review...</div>;
  }

  if (error || !buildPlan) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-blue-900">Build Plan Quality Review</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">{passedCount}/{checklist.length}</div>
            <div className="text-sm text-blue-700">Items Passed</div>
          </div>
        </div>
        <div className="w-full bg-blue-200 rounded h-3">
          <div
            className="bg-blue-900 h-3 rounded transition-all"
            style={{ width: `${(passedCount / checklist.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Plan Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-sm text-slate-600">Total Phases</div>
          <div className="text-2xl font-bold">{buildPlan.phases.length}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-sm text-slate-600">Avg Requirements/Phase</div>
          <div className="text-2xl font-bold">
            {Math.round(
              buildPlan.phases.reduce((sum, p) => {
                const count = (p.content.match(/^\d+\.\s/gm) || []).length;
                return sum + count;
              }, 0) / buildPlan.phases.length
            )}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-sm text-slate-600">Epics</div>
          <div className="text-2xl font-bold">
            {new Set(buildPlan.phases.map(p => p.epic)).size}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-sm text-slate-600">Total Requirements</div>
          <div className="text-2xl font-bold">
            {buildPlan.phases.reduce((sum, p) => {
              return sum + (p.content.match(/^\d+\.\s/gm) || []).length;
            }, 0)}
          </div>
        </div>
      </div>

      {/* Review Items by Category */}
      <div className="space-y-6">
        {["sizing", "dependencies", "criteria", "complexity", "structure"].map(category => (
          <ReviewCategory
            key={category}
            category={category}
            items={checklist.filter(item => item.category === category)}
            onToggle={toggleItem}
            onNotesChange={updateItemNotes}
          />
        ))}
      </div>

      {/* Overall Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold">Overall Review Notes</label>
        <textarea
          placeholder="Any additional observations or context for the review..."
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={handleRevisionRequest}
          className="px-6 py-3 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg font-medium transition"
        >
          Request Revisions
        </button>
        <button
          onClick={handleApprove}
          disabled={!allPassed}
          className={`px-6 py-3 font-medium rounded-lg transition ${
            allPassed
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
          title={allPassed ? "Approve Build Plan" : "Complete all review items to approve"}
        >
          Approve Build Plan
        </button>
      </div>

      {!allPassed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
          <strong>Note:</strong> All review items must pass to approve the Build Plan. Alternatively, you can request revisions.
        </div>
      )}
    </div>
  );
}
```

### 2. Review Category Component
Organize checklist items by category with collapsible sections:

```typescript
// Components: helix/ReviewCategory.tsx

interface ReviewCategoryProps {
  category: "sizing" | "dependencies" | "criteria" | "complexity" | "structure";
  items: ReviewItem[];
  onToggle: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

const CATEGORY_LABELS: Record<string, { title: string; description: string }> = {
  sizing: {
    title: "Phase Sizing",
    description: "Verify phases are appropriately sized"
  },
  dependencies: {
    title: "Dependencies & Order",
    description: "Verify logical progression and no circular dependencies"
  },
  criteria: {
    title: "Acceptance Criteria",
    description: "Verify criteria are specific and testable"
  },
  complexity: {
    title: "Complexity & Clarity",
    description: "Verify phases are neither too large nor too vague"
  },
  structure: {
    title: "Overall Structure",
    description: "Verify plan structure and organization"
  }
};

export function ReviewCategory({
  category,
  items,
  onToggle,
  onNotesChange
}: ReviewCategoryProps) {
  const label = CATEGORY_LABELS[category];
  const categoryPassed = items.every(item => item.passed);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Category Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900">{label.title}</h4>
            <p className="text-sm text-slate-600">{label.description}</p>
          </div>
          <div className="text-right">
            {categoryPassed ? (
              <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded">
                ✓ All Passed
              </span>
            ) : (
              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded">
                {items.filter(i => i.passed).length}/{items.length} Passed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-200">
        {items.map((item) => (
          <ReviewItem
            key={item.id}
            item={item}
            onToggle={onToggle}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>
    </div>
  );
}

interface ReviewItemProps {
  item: ReviewItem;
  onToggle: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

function ReviewItem({ item, onToggle, onNotesChange }: ReviewItemProps) {
  const [expandNotes, setExpandNotes] = useState(false);

  return (
    <div className="px-6 py-4 space-y-3">
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggle(item.id)}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition mt-1 ${
            item.passed
              ? "bg-green-600 border-green-600 text-white"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          {item.passed && "✓"}
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h5 className="font-semibold text-slate-900">{item.title}</h5>
              <p className="text-sm text-slate-600 mt-1">{item.description}</p>
            </div>
            {item.autoCheckable && (
              <span className="text-xs text-slate-500 whitespace-nowrap">Auto-checked</span>
            )}
          </div>

          {/* Notes Section */}
          {item.notes || expandNotes ? (
            <div className="mt-3">
              <textarea
                placeholder="Add notes about this item..."
                value={item.notes || ""}
                onChange={(e) => onNotesChange(item.id, e.target.value)}
                onBlur={() => setExpandNotes(false)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          ) : (
            <button
              onClick={() => setExpandNotes(true)}
              className="text-xs text-slate-500 hover:text-slate-700 mt-2"
            >
              Add notes...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3. Result Storage & Evidence Capture
Store review results in evidence_data:

```typescript
interface ReviewChecklistResult {
  timestamp: string;
  allPassed: boolean;
  itemsChecked: ReviewItem[];
  passedCount: number;
  totalCount: number;
  overallNotes: string;
  approverName?: string;
}

const storeReviewResults = async (
  projectId: string,
  result: ReviewChecklistResult,
  approved: boolean
) => {
  const evidence = {
    step33_quality_review: {
      timestamp: result.timestamp,
      status: approved ? "approved" : "revision-requested",
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      allPassed: result.allPassed,
      overallNotes: result.overallNotes,
      itemsChecked: result.itemsChecked.map(item => ({
        id: item.id,
        title: item.title,
        passed: item.passed,
        notes: item.notes
      })),
      approverName: result.approverName
    }
  };

  await updateHelix(projectId, "step-3.3", evidence);

  // If approved, update stage gate
  if (approved) {
    await updateStageGate(projectId, "stage-3", {
      status: "passed",
      timestamp: new Date().toISOString()
    });
  }
};
```

## File Structure
```
/steps/step-3.3/
├── page.tsx (StepDetailView)
├── BuildPlanQualityReview.tsx (main review component)
├── ReviewCategory.tsx (category grouping)
└── reviewChecklist.ts (checklist definition and utilities)
```

## Dependencies
- Build Plan from Phase 023 (stored in evidence_data)
- BuildPlanViewer component (Phase 024) for reference
- helix_steps table for evidence storage
- Stage gate system for result tracking

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (database)
- React hooks (useState, useEffect)
- Standard form controls

## Acceptance Criteria
1. Review checklist loads with all 10 items visible
2. Auto-checkable items (sizing, complexity) are automatically evaluated based on Build Plan
3. Toggle buttons work; clicking toggles pass/fail state for each item
4. Each item can have notes added/edited via textarea
5. Progress bar updates to show passed/total items
6. Category sections group items logically with category headers
7. Approve Build Plan button is disabled until all items pass
8. Request Revisions button works even if not all items pass
9. Overall notes textarea accepts revision feedback
10. Results are stored in evidence_data with timestamp and checker information

## Testing Instructions
1. **Load Review**: Open step 3.3; verify all 10 checklist items display with descriptions
2. **Auto-Check**: Verify sizing and complexity items are auto-checked based on phase statistics
3. **Manual Toggles**: Click 3–4 unchecked items; verify they toggle to checked; click again; verify unchecked
4. **Add Notes**: Click "Add notes..." on an item; type notes; verify they persist
5. **Progress Bar**: Check 5 items; verify progress bar shows 5/10 and is at 50%
6. **Category View**: Verify items are grouped by category (Sizing, Dependencies, etc.)
7. **Approve Disabled**: Try to click "Approve" with unchecked items; verify it's disabled and shows tooltip
8. **Approve Enabled**: Check all 10 items; verify "Approve" button becomes enabled; click it
9. **Revision Request**: Request revisions with notes; verify form accepts input; verify results stored
10. **Evidence Storage**: Approve review; navigate away and back; verify evidence_data persists review results

## Notes for AI Agent
- The auto-check functions (sizing, vagueness) are heuristic-based; they flag potential issues but don't override user judgment
- Consider adding a "View Phase" link on each item to jump to that phase in the BuildPlanViewer
- Phase sizing heuristic: 8–15 requirements per phase suggests 3–4 hours; adjust threshold if needed
- The review can request revisions without requiring all items to pass; this flows back to Step 3.2
- Consider adding a "Export Review" button to download the checklist as PDF for documentation
- If revision requested, provide a clear message about how to revise and resubmit
- The approver name should come from user context (auth); default to "User" if not available
