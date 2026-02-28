# Phase 102 — Three-Tier Testing Matrix UI

## Objective
Build enhanced testing dashboard showing full three-tier testing matrix: AI-tested, human-tested, user-tested for each phase. Enable status toggling, notes entry, tester tracking, and filter/sort by tier, status, and phase range.

## Prerequisites
- Phase 095 — Build Progress Real-Time Updates — provides live status updates
- Phase 037 — Testing Matrix (v1) — provides foundation for testing UI patterns

## Epic Context
**Epic:** 12 — Testing Intelligence — Steps 7.1-7.2 Enhancement
**Phase:** 102 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Testing is tracked at three tiers: AI agents test during build, humans perform QA, users test in staging/production. Currently, all tiers are conflated into a single matrix. A proper three-tier view shows which phases have complete testing coverage and which tiers are lacking.

This phase upgrades the testing dashboard to show a full table: rows = phases, columns = AI-tested | human-tested | user-tested. Each cell has status toggle (untested/pass/fail), notes, tester name, and timestamp. Row colors indicate overall coverage (all green, partial yellow, untested gray).

---

## Detailed Requirements

### 1. Three-Tier Testing Matrix Component
#### File: `components/helix/testing/TestingMatrix.tsx` (UPDATED/NEW)
Enhanced matrix dashboard.

```typescript
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, XCircle, Plus } from 'lucide-react';

interface TestResult {
  tier: 'ai' | 'human' | 'user';
  status: 'untested' | 'pass' | 'fail';
  notes: string;
  testerName: string;
  timestamp: string;
}

interface PhaseTestingRow {
  phaseNumber: number;
  phaseTitle: string;
  results: {
    ai?: TestResult;
    human?: TestResult;
    user?: TestResult;
  };
}

interface TestingMatrixProps {
  projectId: string;
  startPhase?: number;
  endPhase?: number;
}

export const TestingMatrix: React.FC<TestingMatrixProps> = ({
  projectId,
  startPhase = 1,
  endPhase = 157,
}) => {
  const [phases, setPhases] = useState<PhaseTestingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState<'all' | 'ai' | 'human' | 'user'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'untested' | 'pass' | 'fail'>('all');
  const [editingCell, setEditingCell] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestingData = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/testing/matrix?start=${startPhase}&end=${endPhase}`
        );
        const data = await res.json();
        setPhases(data.phases || []);
      } catch (error) {
        console.error('Failed to fetch testing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestingData();
  }, [projectId, startPhase, endPhase]);

  const getRowStatus = (row: PhaseTestingRow) => {
    const results = Object.values(row.results);
    if (results.every((r) => r.status === 'pass')) return 'all-pass';
    if (results.some((r) => r.status === 'pass')) return 'partial';
    if (results.every((r) => r.status === 'untested')) return 'untested';
    if (results.some((r) => r.status === 'fail')) return 'partial-fail';
    return 'unknown';
  };

  const rowStatusColors = {
    'all-pass': 'bg-green-900 border-l-4 border-green-500',
    'partial': 'bg-yellow-900 border-l-4 border-yellow-500',
    'partial-fail': 'bg-orange-900 border-l-4 border-orange-500',
    'untested': 'bg-slate-900 border-l-4 border-slate-600',
    'unknown': 'bg-slate-800',
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="text-green-400" size={18} />;
      case 'fail':
        return <XCircle className="text-red-400" size={18} />;
      case 'untested':
      default:
        return <Circle className="text-slate-500" size={18} />;
    }
  };

  const TestCell = ({
    row,
    tier,
  }: {
    row: PhaseTestingRow;
    tier: 'ai' | 'human' | 'user';
  }) => {
    const result = row.results[tier];
    const cellId = `${row.phaseNumber}-${tier}`;
    const isEditing = editingCell === cellId;

    if (isEditing) {
      return (
        <div className="p-3 bg-slate-700 rounded border border-cyan-500">
          <select
            value={result?.status || 'untested'}
            onChange={(e) => {
              // Handle status update
            }}
            className="w-full bg-slate-600 text-white rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="untested">Untested</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
          <textarea
            value={result?.notes || ''}
            placeholder="Notes..."
            className="w-full bg-slate-600 text-white rounded px-2 py-1 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            rows={2}
          />
          <input
            type="text"
            value={result?.testerName || ''}
            placeholder="Tester name"
            className="w-full bg-slate-600 text-white rounded px-2 py-1 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={() => setEditingCell(null)}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-1 rounded text-xs transition-colors"
          >
            Save
          </button>
        </div>
      );
    }

    return (
      <div
        className="p-2 cursor-pointer hover:bg-slate-700 rounded transition-colors"
        onClick={() => setEditingCell(cellId)}
      >
        <div className="flex items-center gap-1 mb-1">
          <StatusIcon status={result?.status || 'untested'} />
          <span className="text-xs font-semibold text-white">
            {result?.status || 'UNTESTED'}
          </span>
        </div>
        {result?.testerName && (
          <p className="text-xs text-slate-400">{result.testerName}</p>
        )}
        {result?.notes && (
          <p className="text-xs text-slate-300 mt-1 line-clamp-2">{result.notes}</p>
        )}
        {result?.timestamp && (
          <p className="text-xs text-slate-500 mt-1">
            {new Date(result.timestamp).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  };

  const filteredPhases = phases.filter((phase) => {
    if (filterTier !== 'all') {
      const tierResult = phase.results[filterTier];
      if (!tierResult) return false;
    }
    if (filterStatus !== 'all') {
      const hasStatus = Object.values(phase.results).some(
        (r) => r?.status === filterStatus
      );
      if (!hasStatus) return false;
    }
    return true;
  });

  const stats = {
    totalPhases: phases.length,
    allPassed: phases.filter((p) => getRowStatus(p) === 'all-pass').length,
    partial: phases.filter((p) => getRowStatus(p) === 'partial').length,
    untested: phases.filter((p) => getRowStatus(p) === 'untested').length,
  };

  const coverage = stats.totalPhases > 0 
    ? ((stats.allPassed / stats.totalPhases) * 100).toFixed(1)
    : '0';

  if (loading) {
    return <div className="text-slate-400">Loading testing data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-sm text-slate-400 mb-1">Total Phases</p>
          <p className="text-2xl font-bold text-white">{stats.totalPhases}</p>
        </div>
        <div className="bg-green-900 p-4 rounded">
          <p className="text-sm text-green-200 mb-1">All Passed</p>
          <p className="text-2xl font-bold text-green-400">{stats.allPassed}</p>
        </div>
        <div className="bg-yellow-900 p-4 rounded">
          <p className="text-sm text-yellow-200 mb-1">Partial</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.partial}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded">
          <p className="text-sm text-slate-300 mb-1">Coverage</p>
          <p className="text-2xl font-bold text-cyan-400">{coverage}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Filter by Tier</label>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as any)}
            className="bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Tiers</option>
            <option value="ai">AI-Tested</option>
            <option value="human">Human-Tested</option>
            <option value="user">User-Tested</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="untested">Untested</option>
          </select>
        </div>
      </div>

      {/* Testing Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900">
              <th className="border border-slate-700 px-4 py-3 text-left text-sm font-semibold text-white">
                Phase
              </th>
              <th className="border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white">
                AI-Tested
              </th>
              <th className="border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white">
                Human-Tested
              </th>
              <th className="border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white">
                User-Tested
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPhases.map((phase) => (
              <tr key={phase.phaseNumber} className={rowStatusColors[getRowStatus(phase) as keyof typeof rowStatusColors]}>
                <td className="border border-slate-700 px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">Phase {phase.phaseNumber}</p>
                    <p className="text-xs text-slate-300">{phase.phaseTitle}</p>
                  </div>
                </td>
                <td className="border border-slate-700 px-4 py-3">
                  <TestCell row={phase} tier="ai" />
                </td>
                <td className="border border-slate-700 px-4 py-3">
                  <TestCell row={phase} tier="human" />
                </td>
                <td className="border border-slate-700 px-4 py-3">
                  <TestCell row={phase} tier="user" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

## File Structure
```
components/helix/testing/
├── TestingMatrix.tsx (UPDATED)

app/api/helix/projects/[projectId]/
├── testing/
│   └── matrix/route.ts (NEW)
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
1. Testing matrix displays all phases in table rows
2. Three columns: AI-tested, human-tested, user-tested
3. Status icon and text display in each cell
4. Click cell to edit status, notes, tester name
5. Row background changes: green (all pass), yellow (partial), gray (untested)
6. Filter by tier shows/hides columns
7. Filter by status shows only matching rows
8. Summary stats show total, all-passed, partial, coverage %
9. Tester name and timestamp display in cell
10. Changes persist across page refresh

---

## Testing Instructions
1. Render TestingMatrix with sample phase data
2. Click cell and verify edit form appears
3. Change status and verify icon updates
4. Add notes and tester name
5. Save and verify data persists
6. Test filter by tier (hide human/user columns)
7. Test filter by status (show only pass)
8. Verify row colors match coverage (all green, partial yellow, etc.)
9. Test with 50+ phases for performance
10. Verify summary stats calculate correctly

---

## Notes for the AI Agent
- Store test results in helix_test_results table
- Link to acceptance criteria per phase
- Auto-mark "pass" when all acceptance criteria tested
- Integrate with bug tracking (failed test = potential bug)
