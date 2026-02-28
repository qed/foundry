# Phase 113 — Deployment History and Rollback Tracking

## Objective
Track all deployments with version, timestamp, deployer, environment, status. Store rollback instructions per deployment. Provide deployment timeline visualization and version comparison (what changed between versions).

## Prerequisites
- Phase 112 — Post-Deploy Smoke Test System — provides smoke test results per deployment
- Phase 095 — Build Progress Real-Time Updates — provides deployment status

## Epic Context
**Epic:** 13 — Deployment Pipeline — Steps 8.1-8.3 Enhancement
**Phase:** 113 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Without deployment history, it's impossible to know when something broke or which version is in production. If a deployment goes bad, rollback instructions must be available immediately. A deployment history tracks what versions exist, what changed, and how to rollback.

This phase builds DeploymentHistory: displays all deployments on timeline, shows version numbers, timestamps, deployer, environment, status. Includes rollback instructions and version comparison.

---

## Detailed Requirements

### 1. Deployment History Component
#### File: `components/helix/deployment/DeploymentHistory.tsx` (NEW)
Display deployment timeline and version comparison.

```typescript
import React, { useState, useEffect } from 'react';
import { Archive, AlertCircle, CheckCircle, GitBranch } from 'lucide-react';

interface Deployment {
  id: string;
  version: string;
  timestamp: string;
  deployer: string;
  environment: 'dev' | 'staging' | 'production';
  status: 'success' | 'failed' | 'rollback';
  rollbackInstructions: string;
  changesSummary: string;
  smokeTestResults?: {
    total: number;
    passed: number;
  };
}

interface DeploymentHistoryProps {
  projectId: string;
}

export const DeploymentHistory: React.FC<DeploymentHistoryProps> = ({
  projectId,
}) => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'compare'>('timeline');
  const [selectedVersions, setSelectedVersions] = useState<[string, string]>(['', '']);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/deployment/history`
        );
        const data = await res.json();
        setDeployments(data.deployments || []);
      } catch (error) {
        console.error('Failed to fetch deployment history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeployments();
  }, [projectId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-400" size={20} />;
      case 'rollback':
        return <Archive className="text-yellow-400" size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-900 border-green-700';
      case 'failed':
        return 'bg-red-900 border-red-700';
      case 'rollback':
        return 'bg-yellow-900 border-yellow-700';
      default:
        return 'bg-slate-800 border-slate-700';
    }
  };

  if (loading) {
    return <div className="text-slate-400">Loading deployment history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Deployment History</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded transition-colors ${
              viewMode === 'timeline'
                ? 'bg-cyan-500 text-slate-900 font-semibold'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-4 py-2 rounded transition-colors ${
              viewMode === 'compare'
                ? 'bg-cyan-500 text-slate-900 font-semibold'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            Compare
          </button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        /* Timeline View */
        <div className="space-y-4">
          {deployments.length === 0 ? (
            <div className="bg-slate-800 p-6 rounded-lg text-center text-slate-400">
              No deployments yet
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-1 bg-slate-700"></div>

              {/* Deployments */}
              <div className="space-y-6 ml-20">
                {deployments.map((dep, idx) => (
                  <div
                    key={dep.id}
                    className={`p-4 rounded-lg border-l-4 ${getStatusColor(dep.status)}`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 w-14 flex items-center justify-center">
                      {getStatusIcon(dep.status)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                          v{dep.version}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {new Date(dep.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400 text-xs">Deployer</p>
                          <p className="text-white">{dep.deployer}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Environment</p>
                          <p className="text-white uppercase">{dep.environment}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Status</p>
                          <p className="text-white capitalize">{dep.status}</p>
                        </div>
                      </div>

                      {dep.smokeTestResults && (
                        <p className="text-sm text-slate-300">
                          Smoke tests: {dep.smokeTestResults.passed}/
                          {dep.smokeTestResults.total} passed
                        </p>
                      )}

                      {dep.changesSummary && (
                        <p className="text-sm text-slate-400 bg-slate-700 p-2 rounded">
                          {dep.changesSummary}
                        </p>
                      )}

                      {dep.status === 'rollback' && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-yellow-300 font-semibold">
                            Rollback Instructions
                          </summary>
                          <p className="mt-2 text-slate-300 font-mono whitespace-pre-wrap">
                            {dep.rollbackInstructions}
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Compare View */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Version 1
              </label>
              <select
                value={selectedVersions[0]}
                onChange={(e) =>
                  setSelectedVersions([e.target.value, selectedVersions[1]])
                }
                className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select version</option>
                {deployments.map((d) => (
                  <option key={d.id} value={d.version}>
                    v{d.version}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Version 2
              </label>
              <select
                value={selectedVersions[1]}
                onChange={(e) =>
                  setSelectedVersions([selectedVersions[0], e.target.value])
                }
                className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select version</option>
                {deployments.map((d) => (
                  <option key={d.id} value={d.version}>
                    v{d.version}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedVersions[0] && selectedVersions[1] && (
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                Changes between v{selectedVersions[0]} and v{selectedVersions[1]}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {[selectedVersions[0], selectedVersions[1]].map((version) => {
                  const dep = deployments.find((d) => d.version === version);
                  return (
                    <div key={version} className="bg-slate-700 p-4 rounded">
                      <p className="font-semibold text-white mb-2">v{version}</p>
                      <p className="text-sm text-slate-300">
                        {dep?.changesSummary || 'No changes summary'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## File Structure
```
components/helix/deployment/
├── DeploymentHistory.tsx (NEW)

app/api/helix/projects/[projectId]/
├── deployment/
│   └── history/route.ts (NEW)
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
1. DeploymentHistory displays all deployments chronologically
2. Timeline view shows deployment with status icon
3. Status icons: green (success), red (failed), yellow (rollback)
4. Each deployment shows version, timestamp, deployer, environment
5. Smoke test results displayed if available
6. Rollback instructions available for failed deployments
7. Compare view allows selecting two versions
8. Comparison shows changes between versions
9. Deployment status filtered by environment
10. Deployment history persists across sessions

---

## Testing Instructions
1. Create 3+ deployments with different versions
2. View timeline and verify chronological order
3. Test with failed deployment and verify status icon
4. Test with rollback and verify instructions display
5. Compare two versions and verify differences
6. Filter by environment (dev, staging, production)
7. Verify timestamps are accurate
8. Test with 20+ deployments for performance
9. Verify smoke test results display correctly
10. Test rollback link integration

---

## Notes for the AI Agent
- Store deployment logs as artifacts
- Link to git commits/tags for version
- Add deployment diff visualization
- Integrate with rollback execution
