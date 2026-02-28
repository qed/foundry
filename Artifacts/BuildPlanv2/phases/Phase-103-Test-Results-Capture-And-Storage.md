# Phase 103 — Test Results Capture and Storage

## Objective
Build structured test result entry UI allowing per-phase, per-acceptance-criterion test documentation. Enable pass/fail/skip toggles, screenshot uploads, and historical tracking of re-tests. Store results in helix_test_results table.

## Prerequisites
- Phase 102 — Three-Tier Testing Matrix UI — provides testing dashboard context
- Phase 093 — Build Session Tracking — provides session linkage

## Epic Context
**Epic:** 12 — Testing Intelligence — Steps 7.1-7.2 Enhancement
**Phase:** 103 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Testing currently lacks granular documentation. Individual acceptance criteria lack evidence of testing: did we test it? Did it pass? What was the failure? This makes it impossible to verify coverage or debug test failures.

This phase builds TestResultsCapture: for each of 10 acceptance criteria per phase, allow documenting pass/fail/skip, attaching screenshots, and adding notes. Calculate phase test coverage (X of 10 criteria tested). Store history to track re-testing.

---

## Detailed Requirements

### 1. Test Results Entry Component
#### File: `components/helix/testing/TestResultsCapture.tsx` (NEW)
Per-acceptance-criterion test documentation.

```typescript
import React, { useState, useEffect } from 'react';
import { Check, X, Upload, History } from 'lucide-react';

interface TestResult {
  id: string;
  phaseNumber: number;
  criterionIndex: number;
  status: 'pass' | 'fail' | 'skip';
  notes: string;
  screenshotUrl?: string;
  testedAt: string;
  testedBy: string;
}

interface TestResultsCaptureProps {
  projectId: string;
  phaseNumber: number;
  acceptanceCriteria: string[];
}

export const TestResultsCapture: React.FC<TestResultsCaptureProps> = ({
  projectId,
  phaseNumber,
  acceptanceCriteria,
}) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/phases/${phaseNumber}/test-results`
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Failed to fetch test results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [projectId, phaseNumber]);

  const handleSaveResult = async (result: TestResult) => {
    try {
      const res = await fetch(
        `/api/helix/projects/${projectId}/phases/${phaseNumber}/test-results`,
        {
          method: result.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        }
      );
      const data = await res.json();
      setResults((prev) =>
        result.id
          ? prev.map((r) => (r.id === result.id ? data.result : r))
          : [data.result, ...prev]
      );
      setEditingId(null);
    } catch (error) {
      console.error('Failed to save result:', error);
    }
  };

  const getLatestResult = (criterionIndex: number) => {
    return results.find((r) => r.criterionIndex === criterionIndex);
  };

  const coverage = (results.length / acceptanceCriteria.length) * 100;

  if (loading) {
    return <div className="text-slate-400">Loading test results...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Coverage Summary */}
      <div className="bg-slate-800 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Test Coverage</h3>
          <span className="text-3xl font-bold text-cyan-400">{coverage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className="bg-cyan-500 h-3 rounded-full"
            style={{ width: `${coverage}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {results.length} of {acceptanceCriteria.length} criteria tested
        </p>
      </div>

      {/* Acceptance Criteria Tests */}
      <div className="space-y-4">
        {acceptanceCriteria.map((criterion, idx) => {
          const latest = getLatestResult(idx);
          const isEditing = editingId === `crit-${idx}`;

          return (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                latest?.status === 'pass'
                  ? 'bg-green-900 border-green-700'
                  : latest?.status === 'fail'
                    ? 'bg-red-900 border-red-700'
                    : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-white">
                    Criterion {idx + 1}
                  </h4>
                  <p className="text-sm text-slate-300 mt-1">{criterion}</p>
                </div>
                {latest && (
                  <div className="flex items-center gap-2">
                    {latest.status === 'pass' && (
                      <Check className="text-green-400" size={20} />
                    )}
                    {latest.status === 'fail' && (
                      <X className="text-red-400" size={20} />
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(latest.testedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {isEditing ? (
                <TestResultForm
                  criterion={latest || {
                    id: `crit-${idx}`,
                    phaseNumber,
                    criterionIndex: idx,
                    status: 'pass',
                    notes: '',
                    testedAt: new Date().toISOString(),
                    testedBy: 'User',
                  }}
                  onSave={(result) => handleSaveResult(result)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div>
                  {latest && (
                    <>
                      {latest.notes && (
                        <p className="text-sm text-slate-300 mb-2">{latest.notes}</p>
                      )}
                      {latest.screenshotUrl && (
                        <a
                          href={latest.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mb-2"
                        >
                          View Screenshot
                        </a>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setEditingId(`crit-${idx}`)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 px-4 rounded transition-colors text-sm"
                  >
                    {latest ? 'Edit' : 'Add'} Test Result
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TestResultForm = ({
  criterion,
  onSave,
  onCancel,
}: {
  criterion: any;
  onSave: (result: any) => void;
  onCancel: () => void;
}) => {
  const [status, setStatus] = useState<'pass' | 'fail' | 'skip'>(criterion.status);
  const [notes, setNotes] = useState(criterion.notes);
  const [testedBy, setTestedBy] = useState(criterion.testedBy);

  return (
    <div className="space-y-3 bg-slate-700 p-3 rounded">
      <div>
        <label className="text-sm text-white mb-1 block">Status</label>
        <div className="flex gap-2">
          {['pass', 'fail', 'skip'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s as any)}
              className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${
                status === s
                  ? s === 'pass'
                    ? 'bg-green-600'
                    : s === 'fail'
                      ? 'bg-red-600'
                      : 'bg-yellow-600'
                  : 'bg-slate-600 hover:bg-slate-500'
              } text-white`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-white mb-1 block">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          rows={3}
          placeholder="Test results, failures, observations..."
        />
      </div>

      <div>
        <label className="text-sm text-white mb-1 block">Tested By</label>
        <input
          type="text"
          value={testedBy}
          onChange={(e) => setTestedBy(e.target.value)}
          className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Your name"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ ...criterion, status, notes, testedBy, testedAt: new Date().toISOString() })}
          className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 rounded transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
```

---

## File Structure
```
components/helix/testing/
├── TestResultsCapture.tsx (NEW)

app/api/helix/projects/[projectId]/phases/[phaseNumber]/
├── test-results/
│   ├── route.ts (NEW)
│   └── [resultId]/route.ts (NEW)
```

---

## Dependencies
- lucide-react (icons)
- Supabase

---

## Tech Stack for This Phase
- TypeScript
- React
- Next.js
- Supabase

---

## Acceptance Criteria
1. TestResultsCapture renders acceptance criteria from phase spec
2. Coverage percentage calculates correctly (tested / total)
3. Click "Add Test Result" opens edit form
4. Status buttons toggle between pass/fail/skip
5. Notes textarea captures details
6. Tested By field captures tester name
7. Save persists result to database
8. Latest result displays with status icon
9. Criterion row colors by status (green pass, red fail, gray untested)
10. History of previous test results is accessible

---

## Testing Instructions
1. Render TestResultsCapture with 10 sample acceptance criteria
2. Add test result for first criterion (pass status)
3. Verify coverage % updates to 10%
4. Edit test result and change status to fail
5. Verify row color changes
6. Skip a criterion and verify status
7. Add results for all 10 criteria (coverage = 100%)
8. Test screenshot upload
9. Verify results persist across page refresh
10. Check database entries are stored correctly

---

## Notes for the AI Agent
- Store in helix_test_results table with phase_id, criterion_index
- Link to acceptance criteria text from phase spec
- Add screenshot upload to cloud storage
- Integrate with bug tracker (failed criterion = bug)
- Historical results show re-testing
