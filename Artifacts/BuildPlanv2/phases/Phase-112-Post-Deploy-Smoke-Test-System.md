# Phase 112 — Post-Deploy Smoke Test System

## Objective
Define and execute smoke tests after deployment to production. Manual test cases: name, URL to test, expected behavior, actual result. Record results per deployment for tracking.

## Prerequisites
- Phase 111 — Deployment Readiness Gate — provides pre-deployment readiness
- Phase 095 — Build Progress Real-Time Updates — provides real-time status

## Epic Context
**Epic:** 13 — Deployment Pipeline — Steps 8.1-8.3 Enhancement
**Phase:** 112 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
After deploying to production, basic sanity checks are needed to ensure critical functionality works. Smoke tests verify: homepage loads, login works, data fetches. Without structured smoke tests, broken deploys aren't caught until users report issues.

This phase builds SmokeTestRunner: define test cases (URL, expected behavior), execute manually after deploy, record results, track across deployments.

---

## Detailed Requirements

### 1. Smoke Test Runner Component
#### File: `components/helix/deployment/SmokeTestRunner.tsx` (NEW)
Define and execute smoke tests.

```typescript
import React, { useState, useEffect } from 'react';
import { Check, X, PlayCircle, AlertCircle } from 'lucide-react';

interface SmokeTest {
  id: string;
  name: string;
  url: string;
  expectedBehavior: string;
  actualResult?: string;
  passed?: boolean;
  timestamp?: string;
}

interface SmokeTestRunnerProps {
  projectId: string;
  deploymentId?: string;
}

export const SmokeTestRunner: React.FC<SmokeTestRunnerProps> = ({
  projectId,
  deploymentId,
}) => {
  const [tests, setTests] = useState<SmokeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [newTest, setNewTest] = useState<Partial<SmokeTest>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/deployment/smoke-tests`
        );
        const data = await res.json();
        setTests(data.tests || []);
      } catch (error) {
        console.error('Failed to fetch smoke tests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [projectId]);

  const handleAddTest = async () => {
    if (!newTest.name || !newTest.url) return;

    try {
      const res = await fetch(
        `/api/helix/projects/${projectId}/deployment/smoke-tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTest),
        }
      );
      const data = await res.json();
      setTests([...tests, data.test]);
      setNewTest({});
    } catch (error) {
      console.error('Failed to add test:', error);
    }
  };

  const handleRunTest = async (testId: string) => {
    const test = tests.find((t) => t.id === testId);
    if (!test) return;

    setRunning(true);
    try {
      // In a real scenario, this would make a request to the deployed URL
      // For now, we'll just record manual results
      const actualResult = prompt(
        `Test: ${test.name}\nExpected: ${test.expectedBehavior}\n\nEnter actual result:`
      );

      if (actualResult !== null) {
        const passed = actualResult.toLowerCase().includes('pass') ||
          actualResult.toLowerCase().includes('success');

        const updated = {
          ...test,
          actualResult,
          passed,
          timestamp: new Date().toISOString(),
        };

        await fetch(
          `/api/helix/projects/${projectId}/deployment/smoke-tests/${testId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actualResult, passed }),
          }
        );

        setTests((prev) =>
          prev.map((t) => (t.id === testId ? updated : t))
        );
      }
    } catch (error) {
      console.error('Failed to run test:', error);
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await fetch(
        `/api/helix/projects/${projectId}/deployment/smoke-tests/${testId}`,
        { method: 'DELETE' }
      );
      setTests((prev) => prev.filter((t) => t.id !== testId));
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  };

  const passedCount = tests.filter((t) => t.passed).length;
  const testedCount = tests.filter((t) => t.passed !== undefined).length;

  if (loading) {
    return <div className="text-slate-400">Loading smoke tests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Smoke Tests</h2>
        {testedCount > 0 && (
          <span className="text-sm text-slate-400">
            {passedCount}/{testedCount} passed
          </span>
        )}
      </div>

      {/* Add Test Form */}
      <div className="bg-slate-800 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-white">Add Smoke Test</h3>

        <input
          type="text"
          placeholder="Test name"
          value={newTest.name || ''}
          onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />

        <input
          type="url"
          placeholder="URL to test"
          value={newTest.url || ''}
          onChange={(e) => setNewTest({ ...newTest, url: e.target.value })}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />

        <textarea
          placeholder="Expected behavior"
          value={newTest.expectedBehavior || ''}
          onChange={(e) => setNewTest({ ...newTest, expectedBehavior: e.target.value })}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          rows={2}
        />

        <button
          onClick={handleAddTest}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 rounded transition-colors"
        >
          Add Test
        </button>
      </div>

      {/* Tests List */}
      <div className="space-y-3">
        {tests.length === 0 ? (
          <div className="bg-slate-800 p-6 rounded-lg text-center text-slate-400">
            No smoke tests defined
          </div>
        ) : (
          tests.map((test) => (
            <div
              key={test.id}
              className={`p-4 rounded-lg border-l-4 ${
                test.passed === true
                  ? 'bg-green-900 border-green-700'
                  : test.passed === false
                    ? 'bg-red-900 border-red-700'
                    : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{test.name}</h3>
                    {test.passed !== undefined && (
                      test.passed ? (
                        <Check className="text-green-400" size={20} />
                      ) : (
                        <X className="text-red-400" size={20} />
                      )
                    )}
                  </div>
                  <p className="text-sm text-slate-300 font-mono mb-2">{test.url}</p>
                  <p className="text-sm text-slate-300 mb-2">
                    <span className="font-semibold">Expected:</span> {test.expectedBehavior}
                  </p>
                  {test.actualResult && (
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold">Actual:</span> {test.actualResult}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRunTest(test.id)}
                  disabled={running}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <PlayCircle size={16} />
                  Run
                </button>
              </div>

              {test.timestamp && (
                <p className="text-xs text-slate-500">
                  Tested: {new Date(test.timestamp).toLocaleString()}
                </p>
              )}

              <button
                onClick={() => handleDeleteTest(test.id)}
                className="mt-2 text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

---

## File Structure
```
components/helix/deployment/
├── SmokeTestRunner.tsx (NEW)

app/api/helix/projects/[projectId]/
├── deployment/
│   └── smoke-tests/
│       ├── route.ts (NEW)
│       └── [testId]/route.ts (NEW)
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
1. SmokeTestRunner displays list of defined tests
2. Add Test form allows entering name, URL, expected behavior
3. Run button triggers test execution
4. Test results show pass/fail with visual indicator
5. Actual result captured and stored
6. Timestamp records when test was run
7. Test history persists across sessions
8. Delete button removes test
9. Pass/fail count displays in header
10. Test results linked to deployment

---

## Testing Instructions
1. Add new smoke test and verify appears in list
2. Run test and record result
3. Verify result displays with pass/fail icon
4. Check timestamp is accurate
5. Delete test and verify removal
6. Add 10+ tests for performance
7. Run all tests and verify results
8. Reload page and verify results persist
9. Link tests to deployment ID
10. Generate report from test results

---

## Notes for the AI Agent
- Consider automated browser-based smoke testing
- Link to deployment history
- Auto-run smoke tests after deploy
- Alert on smoke test failures
