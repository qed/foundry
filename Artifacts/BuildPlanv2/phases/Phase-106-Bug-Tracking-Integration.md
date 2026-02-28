# Phase 106 — Bug Tracking Integration

## Objective
Create bug tracking system linked to test failures. Enable creating bugs from failed tests with severity levels, phases linked, and steps to reproduce. Track bug status and auto-update test status when bugs are resolved.

## Prerequisites
- Phase 105 — Test Coverage Tracking Per Phase — provides test failure data
- Phase 103 — Test Results Capture And Storage — provides failure context

## Epic Context
**Epic:** 12 — Testing Intelligence — Steps 7.1-7.2 Enhancement
**Phase:** 106 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Test failures don't automatically create bugs for tracking. Engineers must manually log failures elsewhere, creating duplicate work and broken context links. When a bug is fixed, the test status isn't automatically updated, leading to stale test results.

This phase builds BugTracker: create bugs from failed tests, track status (open → in-progress → resolved → verified), link bugs to phases, and auto-update test status when bugs are resolved.

---

## Detailed Requirements

### 1. Bug Tracker Component
#### File: `components/helix/testing/BugTracker.tsx` (NEW)
Bug creation, management, and status tracking.

```typescript
import React, { useState, useEffect } from 'react';
import { AlertCircle, Bug, CheckCircle } from 'lucide-react';

interface Bug {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'verified';
  phaseNumber: number;
  stepsToReproduce: string;
  relatedTestId?: string;
  createdAt: string;
  createdBy: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface BugTrackerProps {
  projectId: string;
  phaseNumber?: number;
}

export const BugTracker: React.FC<BugTrackerProps> = ({
  projectId,
  phaseNumber,
}) => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'verified'>('open');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    const fetchBugs = async () => {
      try {
        const url = phaseNumber
          ? `/api/helix/projects/${projectId}/phases/${phaseNumber}/bugs`
          : `/api/helix/projects/${projectId}/bugs`;
        const res = await fetch(url);
        const data = await res.json();
        setBugs(data.bugs || []);
      } catch (error) {
        console.error('Failed to fetch bugs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBugs();
  }, [projectId, phaseNumber]);

  const handleCreateBug = async (bugData: Omit<Bug, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch(
        `/api/helix/projects/${projectId}/bugs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...bugData,
            phaseNumber: phaseNumber || bugData.phaseNumber,
          }),
        }
      );
      const data = await res.json();
      setBugs([data.bug, ...bugs]);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create bug:', error);
    }
  };

  const handleUpdateBugStatus = async (
    bugId: string,
    status: Bug['status']
  ) => {
    try {
      const res = await fetch(
        `/api/helix/projects/${projectId}/bugs/${bugId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      setBugs((prev) =>
        prev.map((b) => (b.id === bugId ? data.bug : b))
      );
    } catch (error) {
      console.error('Failed to update bug:', error);
    }
  };

  const filteredBugs = bugs.filter((bug) => {
    if (filterStatus !== 'all' && bug.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && bug.severity !== filterSeverity) return false;
    return true;
  });

  const severityColors = {
    critical: 'bg-red-900 text-red-100 border-red-700',
    high: 'bg-orange-900 text-orange-100 border-orange-700',
    medium: 'bg-yellow-900 text-yellow-100 border-yellow-700',
    low: 'bg-blue-900 text-blue-100 border-blue-700',
  };

  const statusColors = {
    open: 'text-red-400',
    in_progress: 'text-yellow-400',
    resolved: 'text-blue-400',
    verified: 'text-green-400',
  };

  if (loading) {
    return <div className="text-slate-400">Loading bugs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bug size={24} />
          Bugs
        </h2>
        {bugs.length > 0 && (
          <span className="bg-red-600 text-white text-sm px-3 py-1 rounded font-semibold">
            {bugs.filter((b) => b.status === 'open').length} Open
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 px-4 rounded transition-colors"
        >
          Create Bug
        </button>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="verified">Verified</option>
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as any)}
          className="bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {showForm && (
        <BugForm
          projectId={projectId}
          phaseNumber={phaseNumber}
          onSubmit={handleCreateBug}
          onCancel={() => setShowForm(false)}
        />
      )}

      {filteredBugs.length === 0 ? (
        <div className="bg-slate-800 p-8 rounded-lg text-center">
          <p className="text-slate-400">No bugs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBugs.map((bug) => (
            <div
              key={bug.id}
              className={`p-4 rounded-lg border-l-4 ${severityColors[bug.severity]} bg-slate-800`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{bug.title}</h3>
                  <p className="text-sm text-slate-300 mt-1">Phase {bug.phaseNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold uppercase ${statusColors[bug.status]}`}>
                    {bug.status.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${severityColors[bug.severity]}`}
                  >
                    {bug.severity}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-3">{bug.description}</p>

              {bug.stepsToReproduce && (
                <p className="text-xs text-slate-400 mb-3">
                  <span className="font-semibold">Steps:</span> {bug.stepsToReproduce}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {['open', 'in_progress', 'resolved', 'verified'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleUpdateBugStatus(bug.id, status as Bug['status'])}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      bug.status === status
                        ? 'bg-cyan-500 text-slate-900 font-semibold'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BugForm = ({
  projectId,
  phaseNumber,
  onSubmit,
  onCancel,
}: {
  projectId: string;
  phaseNumber?: number;
  onSubmit: (bug: Omit<Bug, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) => {
  const [data, setData] = useState({
    title: '',
    description: '',
    severity: 'medium' as const,
    phaseNumber: phaseNumber || 0,
    stepsToReproduce: '',
    createdBy: 'User',
  });

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Title</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Bug title"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-white mb-1">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          rows={4}
          placeholder="Detailed description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-1">Severity</label>
          <select
            value={data.severity}
            onChange={(e) => setData({ ...data, severity: e.target.value as any })}
            className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {!phaseNumber && (
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Phase</label>
            <input
              type="number"
              value={data.phaseNumber}
              onChange={(e) => setData({ ...data, phaseNumber: parseInt(e.target.value) })}
              className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Phase number"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-white mb-1">Steps to Reproduce</label>
        <textarea
          value={data.stepsToReproduce}
          onChange={(e) => setData({ ...data, stepsToReproduce: e.target.value })}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          rows={3}
          placeholder="1. Do this&#10;2. Then do that&#10;3. Observe bug"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(data as any)}
          className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 rounded transition-colors"
        >
          Create Bug
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded transition-colors"
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
├── BugTracker.tsx (NEW)

lib/helix/testing/
├── bugs.ts (NEW)

app/api/helix/projects/[projectId]/
├── bugs/
│   ├── route.ts (NEW)
│   └── [bugId]/route.ts (NEW)
├── phases/[phaseNumber]/
│   └── bugs/route.ts (NEW)
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
1. BugTracker displays list of bugs
2. Create Bug button opens form
3. Form captures title, description, severity, steps to reproduce
4. Bug status can toggle between open, in_progress, resolved, verified
5. Filter by status shows/hides bugs
6. Filter by severity shows/hides bugs
7. Severity colors match (critical=red, high=orange, medium=yellow, low=blue)
8. Open bug count badge displays
9. Bugs can be created from failed tests
10. Resolved bugs auto-update linked test results

---

## Testing Instructions
1. Click Create Bug and verify form appears
2. Fill form and submit, verify bug appears in list
3. Change bug status and verify update
4. Test filter by status (show only open)
5. Test filter by severity (show only critical)
6. Create 10+ bugs and verify performance
7. Test bug linked to test failure
8. Verify test status updates when bug resolved
9. Test with multiple phases
10. Verify bug data persists

---

## Notes for the AI Agent
- Link bugs to test results bidirectionally
- Auto-create bug when test marked as failed
- Notify when related bug is resolved
- Add priority field for triage
