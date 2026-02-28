# Phase 107 — Regression Detection Alerts

## Objective
Detect potential regressions when phases complete by analyzing phase dependencies and shared file modifications. Alert when a newly completed phase may affect previously-tested phases. Display regression risk per phase and recommend re-testing.

## Prerequisites
- Phase 106 — Bug Tracking Integration — provides test failure context
- Phase 096 — Commit Tracking Integration — provides file modification data
- Phase 098 — Phase Dependency Visualization — provides dependency graph

## Epic Context
**Epic:** 12 — Testing Intelligence — Steps 7.1-7.2 Enhancement
**Phase:** 107 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
When phase 046 completes and modifies a shared component, phase 045 (which depends on it) may now be broken. Without regression detection, phases already marked as "tested" and "complete" can fail silently. A regression alert system warns engineers to re-test affected phases.

This phase builds RegressionAlerts: when a phase completes, check which previously-completed phases share dependencies or modified files. Alert if regression risk exists and recommend re-testing.

---

## Detailed Requirements

### 1. Regression Detection Service
#### File: `lib/helix/testing/regression.ts` (NEW)
Detect and analyze potential regressions.

```typescript
export interface RegressionRisk {
  affectedPhaseNumber: number;
  affectedPhaseTitle: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  sharedFiles?: string[];
  sharedDependencies?: number[];
  recommendation: string;
}

export const detectRegressions = async (
  completedPhaseNumber: number,
  completedPhaseModifiedFiles: string[],
  allPhases: any[],
  dependencies: Map<number, number[]>,
  testResults: any[]
): Promise<RegressionRisk[]> => {
  const risks: RegressionRisk[] = [];

  // Get phases that this completed phase may affect
  const reverseDependencies = new Map<number, number[]>();
  dependencies.forEach((deps, phase) => {
    deps.forEach((dep) => {
      if (!reverseDependencies.has(dep)) {
        reverseDependencies.set(dep, []);
      }
      reverseDependencies.get(dep)!.push(phase);
    });
  });

  const affectedPhases = reverseDependencies.get(completedPhaseNumber) || [];

  for (const affectedPhaseNum of affectedPhases) {
    // Only flag phases that have already been tested
    const testResult = testResults.find((t) => t.phaseNumber === affectedPhaseNum);
    if (!testResult || testResult.status !== 'pass') continue;

    const affectedPhase = allPhases.find((p) => p.number === affectedPhaseNum);
    if (!affectedPhase) continue;

    let risk: RegressionRisk['risk'] = 'low';
    const reasons: string[] = [];
    const sharedFiles: string[] = [];

    // Check for shared file modifications
    if (affectedPhase.modifiedFiles && completedPhaseModifiedFiles.length > 0) {
      const overlap = affectedPhase.modifiedFiles.filter((f: string) =>
        completedPhaseModifiedFiles.some((cf) => {
          // Simple heuristic: same directory or shared component
          const dir1 = f.split('/').slice(0, -1).join('/');
          const dir2 = cf.split('/').slice(0, -1).join('/');
          return dir1 === dir2 || f.includes('components') || cf.includes('components');
        })
      );

      if (overlap.length > 0) {
        risk = 'high';
        reasons.push(`Shares modified files: ${overlap.join(', ')}`);
        sharedFiles.push(...overlap);
      }
    }

    // Check for dependency chain
    const dependsOnCompleted = dependencies.get(affectedPhaseNum)?.includes(completedPhaseNumber);
    if (dependsOnCompleted) {
      if (risk === 'low') risk = 'medium';
      reasons.push(`Directly depends on Phase ${completedPhaseNumber}`);
    }

    if (reasons.length > 0) {
      risks.push({
        affectedPhaseNumber: affectedPhaseNum,
        affectedPhaseTitle: affectedPhase.title,
        risk,
        reason: reasons.join('; '),
        sharedFiles: sharedFiles.length > 0 ? sharedFiles : undefined,
        sharedDependencies: dependsOnCompleted ? [completedPhaseNumber] : undefined,
        recommendation: `Re-test Phase ${affectedPhaseNum} to verify no regressions from Phase ${completedPhaseNumber} changes.`,
      });
    }
  }

  return risks.sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return riskOrder[a.risk] - riskOrder[b.risk];
  });
};
```

### 2. Regression Alerts Component
#### File: `components/helix/testing/RegressionAlerts.tsx` (NEW)
Display regression risks and re-test recommendations.

```typescript
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react';

interface RegressionRisk {
  affectedPhaseNumber: number;
  affectedPhaseTitle: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  sharedFiles?: string[];
  sharedDependencies?: number[];
  recommendation: string;
}

interface RegressionAlertsProps {
  projectId: string;
}

export const RegressionAlerts: React.FC<RegressionAlertsProps> = ({
  projectId,
}) => {
  const [risks, setRisks] = useState<RegressionRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    const fetchRisks = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/testing/regression-risks`
        );
        const data = await res.json();
        setRisks(data.risks || []);
      } catch (error) {
        console.error('Failed to fetch regression risks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRisks();
    const interval = setInterval(fetchRisks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [projectId]);

  const riskColors = {
    critical: 'bg-red-900 border-red-700 text-red-100',
    high: 'bg-orange-900 border-orange-700 text-orange-100',
    medium: 'bg-yellow-900 border-yellow-700 text-yellow-100',
    low: 'bg-blue-900 border-blue-700 text-blue-100',
  };

  const filteredRisks = risks.filter(
    (risk) => filter === 'all' || risk.risk === filter
  );

  if (loading) {
    return <div className="text-slate-400">Loading regression analysis...</div>;
  }

  if (risks.length === 0) {
    return (
      <div className="bg-green-900 border-l-4 border-green-600 p-6 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-400" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-white">No Regressions Detected</h3>
            <p className="text-sm text-green-200">All tested phases are safe.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle size={24} className="text-yellow-500" />
          Regression Risks
        </h2>
        <span className="text-sm text-slate-400">
          {filteredRisks.length} of {risks.length} risks
        </span>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'critical', 'high', 'medium', 'low'].map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level as any)}
            className={`text-sm px-3 py-1 rounded transition-colors ${
              filter === level
                ? 'bg-cyan-500 text-slate-900 font-semibold'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {/* Risk Cards */}
      <div className="space-y-3">
        {filteredRisks.map((risk) => (
          <div
            key={`${risk.affectedPhaseNumber}`}
            className={`p-4 rounded-lg border-l-4 ${riskColors[risk.risk]}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold">
                  Phase {risk.affectedPhaseNumber} — {risk.affectedPhaseTitle}
                </h3>
                <p className="text-sm opacity-90 mt-1">{risk.reason}</p>
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                  risk.risk === 'critical'
                    ? 'bg-red-700'
                    : risk.risk === 'high'
                      ? 'bg-orange-700'
                      : risk.risk === 'medium'
                        ? 'bg-yellow-700'
                        : 'bg-blue-700'
                } text-white`}
              >
                {risk.risk}
              </span>
            </div>

            {risk.sharedFiles && risk.sharedFiles.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold opacity-75 mb-1">Shared Files:</p>
                <div className="flex flex-wrap gap-2">
                  {risk.sharedFiles.slice(0, 3).map((file) => (
                    <code key={file} className="text-xs bg-slate-700 px-2 py-1 rounded opacity-75">
                      {file}
                    </code>
                  ))}
                  {risk.sharedFiles.length > 3 && (
                    <span className="text-xs opacity-75">+{risk.sharedFiles.length - 3} more</span>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-700 bg-opacity-50 p-3 rounded">
              <p className="text-sm font-semibold opacity-90 flex items-center gap-2">
                <Eye size={16} />
                {risk.recommendation}
              </p>
            </div>

            <button
              onClick={() => window.location.href = `/helix/build/phases/${risk.affectedPhaseNumber}`}
              className="mt-3 bg-slate-700 hover:bg-slate-600 text-white py-1 px-3 rounded text-sm transition-colors"
            >
              Re-test Phase {risk.affectedPhaseNumber}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## File Structure
```
lib/helix/testing/
├── regression.ts (NEW)

components/helix/testing/
├── RegressionAlerts.tsx (NEW)

app/api/helix/projects/[projectId]/
├── testing/
│   └── regression-risks/route.ts (NEW)
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

---

## Acceptance Criteria
1. RegressionAlerts displays all detected regression risks
2. Risks are color-coded by severity (critical/high/medium/low)
3. Regression reasons explain why risk exists
4. Shared files list displays affected files
5. Filter button shows only selected risk level
6. "No Regressions Detected" message when risks empty
7. Risk count badge shows total risks
8. "Re-test Phase" button navigates to phase
9. Regression detection runs when phase completes
10. Alerts persist and update in real-time

---

## Testing Instructions
1. Mark a phase complete with file modifications
2. Check if affected dependent phases show regression risk
3. Verify risk level is appropriate (critical/high/etc.)
4. Test filter by risk level
5. Click "Re-test Phase" and verify navigation
6. Test with shared components (multiple phases modifying same files)
7. Test with independent phases (no regressions)
8. Verify shared files display correctly
9. Test refresh and verify risks persist
10. Test with 50+ phases for performance

---

## Notes for the AI Agent
- Analyze file paths intelligently (shared directory = related)
- Consider component imports for regression detection
- Store regression history for trend analysis
- Auto-trigger re-testing based on severity
- Link to related test results
