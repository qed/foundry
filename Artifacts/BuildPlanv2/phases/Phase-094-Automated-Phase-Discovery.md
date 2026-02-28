# Phase 094 — Automated Phase Discovery

## Objective
Build phase discovery engine that parses the BuildPlan roadmap, checks phase dependencies, and automatically identifies the next executable phase. Show dependency tree visualization and guide engineers toward optimal build order.

## Prerequisites
- Phase 093 — Build Session Tracking — provides session state context
- Phase 091 — Build Phase Management Foundation — establishes phase status tracking
- Phase 087 — Build Plan Editor UI — provides BuildPlan file access patterns

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 094 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
With 157 phases, engineers may not know which phase is executable next. Prerequisites prevent certain phases from starting until others complete. The current system lacks visibility into dependency chains and next-best-phase recommendations.

This phase implements PhaseDiscovery: a service that parses roadmap.md, builds a dependency graph, checks prerequisites, and identifies ready phases. The UI shows a visual dependency tree, highlights the critical path, and provides a "Next Phase" button for streamlined navigation.

---

## Detailed Requirements

### 1. Phase Discovery Service
#### File: `lib/helix/phase-discovery.ts` (NEW)
Core logic for parsing phases, building dependency graph, and determining readiness.

```typescript
import fs from 'fs';
import path from 'path';

export interface PhaseInfo {
  number: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  prerequisites: number[];
  epic: number;
  estimatedEffort: string;
}

export interface DependencyGraph {
  phases: Map<number, PhaseInfo>;
  edges: Map<number, number[]>;
}

export const buildDependencyGraph = async (
  phasesDir: string
): Promise<DependencyGraph> => {
  const phases = new Map<number, PhaseInfo>();
  const edges = new Map<number, number[]>();

  const files = fs.readdirSync(phasesDir);
  const phaseFiles = files.filter((f) => f.startsWith('Phase-') && f.endsWith('.md'));

  for (const file of phaseFiles) {
    const content = fs.readFileSync(path.join(phasesDir, file), 'utf-8');
    const phaseData = parsePhaseSpec(content);

    if (phaseData) {
      phases.set(phaseData.number, phaseData);
      const prereqs = extractPrerequisites(content);
      edges.set(phaseData.number, prereqs);
    }
  }

  return { phases, edges };
};

export const parsePhaseSpec = (content: string): PhaseInfo | null => {
  const phaseMatch = content.match(/^# Phase (\d+)/m);
  const titleMatch = content.match(/^# Phase \d+ — (.+)$/m);
  const epicMatch = content.match(/\*\*Epic:\*\*\s+(\d+)/);

  if (!phaseMatch || !titleMatch) return null;

  return {
    number: parseInt(phaseMatch[1]),
    title: titleMatch[1],
    status: 'pending',
    prerequisites: [],
    epic: epicMatch ? parseInt(epicMatch[1]) : 0,
    estimatedEffort: 'Half-day (~3-4 hours)',
  };
};

export const extractPrerequisites = (content: string): number[] => {
  const prereqSection = content.match(/## Prerequisites\n([\s\S]*?)(?=\n## )/);
  if (!prereqSection) return [];

  const prereqLines = prereqSection[1].split('\n');
  const prereqs: number[] = [];

  for (const line of prereqLines) {
    const match = line.match(/Phase (\d+)/);
    if (match) {
      prereqs.push(parseInt(match[1]));
    }
  }

  return prereqs;
};

export const getNextPhase = (
  graph: DependencyGraph,
  completedPhases: Set<number>
): PhaseInfo | null => {
  const readyPhases: PhaseInfo[] = [];

  for (const [phaseNum, phaseInfo] of graph.phases) {
    if (completedPhases.has(phaseNum) || phaseInfo.status === 'blocked') {
      continue;
    }

    const prereqsMet = phaseInfo.prerequisites.every((p) =>
      completedPhases.has(p)
    );

    if (prereqsMet) {
      readyPhases.push(phaseInfo);
    }
  }

  // Sort by phase number (earliest first)
  readyPhases.sort((a, b) => a.number - b.number);
  return readyPhases.length > 0 ? readyPhases[0] : null;
};

export const getCriticalPath = (graph: DependencyGraph): number[] => {
  const longestPath: number[] = [];

  const dfs = (phaseNum: number, path: number[]): number[] => {
    const deps = graph.edges.get(phaseNum) || [];
    if (deps.length === 0) return path;

    let maxPath = path;
    for (const dep of deps) {
      const newPath = dfs(dep, [dep, ...path]);
      if (newPath.length > maxPath.length) {
        maxPath = newPath;
      }
    }
    return maxPath;
  };

  for (const [phaseNum] of graph.phases) {
    const path = dfs(phaseNum, [phaseNum]);
    if (path.length > longestPath.length) {
      longestPath.push(...path);
    }
  }

  return longestPath;
};

export const getPhasesByEpic = (graph: DependencyGraph): Map<number, PhaseInfo[]> => {
  const byEpic = new Map<number, PhaseInfo[]>();

  for (const phaseInfo of graph.phases.values()) {
    if (!byEpic.has(phaseInfo.epic)) {
      byEpic.set(phaseInfo.epic, []);
    }
    byEpic.get(phaseInfo.epic)!.push(phaseInfo);
  }

  return byEpic;
};
```

### 2. Phase Discovery UI Component
#### File: `components/helix/build/PhaseDiscovery.tsx` (NEW)
Component showing next phase, dependency tree, and critical path.

```typescript
import React, { useState, useEffect } from 'react';
import { ChevronRight, GitBranch, AlertCircle } from 'lucide-react';

interface PhaseDiscoveryProps {
  projectId: string;
  completedPhases: number[];
}

export const PhaseDiscovery: React.FC<PhaseDiscoveryProps> = ({
  projectId,
  completedPhases,
}) => {
  const [nextPhase, setNextPhase] = useState<any>(null);
  const [criticalPath, setCriticalPath] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhaseInfo = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/phase-discovery?completed=${completedPhases.join(',')}`
        );
        const data = await res.json();
        setNextPhase(data.nextPhase);
        setCriticalPath(data.criticalPath);
      } catch (error) {
        console.error('Failed to fetch phase discovery:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhaseInfo();
  }, [projectId, completedPhases]);

  const handleNavigateToPhase = (phaseNum: number) => {
    window.location.href = `/helix/build/phases/${phaseNum}`;
  };

  if (loading) {
    return <div className="text-slate-400">Loading phase information...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Next Phase Card */}
      {nextPhase ? (
        <div className="bg-gradient-to-r from-cyan-900 to-cyan-800 p-6 rounded-lg border border-cyan-700">
          <h3 className="text-sm font-semibold text-cyan-300 mb-2 uppercase">Recommended Next Phase</h3>
          <h2 className="text-2xl font-bold text-white mb-4">
            Phase {nextPhase.number} — {nextPhase.title}
          </h2>
          <p className="text-slate-300 mb-4">{nextPhase.epic ? `Epic ${nextPhase.epic}` : 'Standalone'}</p>
          <button
            onClick={() => handleNavigateToPhase(nextPhase.number)}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 px-6 rounded transition-colors flex items-center gap-2"
          >
            Start Phase <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="bg-slate-800 p-6 rounded-lg border border-yellow-700 flex items-center gap-3">
          <AlertCircle className="text-yellow-500" size={24} />
          <div>
            <p className="font-semibold text-white">All phases completed!</p>
            <p className="text-slate-400 text-sm">Build plan execution is complete.</p>
          </div>
        </div>
      )}

      {/* Critical Path */}
      {criticalPath.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <GitBranch size={16} />
            Critical Path
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {criticalPath.map((phaseNum, idx) => (
              <React.Fragment key={phaseNum}>
                <div className="bg-slate-700 px-3 py-1 rounded text-sm text-white">
                  Phase {phaseNum}
                </div>
                {idx < criticalPath.length - 1 && (
                  <ChevronRight className="text-slate-500" size={18} />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Longest dependency chain: {criticalPath.length} phases
          </p>
        </div>
      )}
    </div>
  );
};
```

---

## File Structure
```
lib/helix/
├── phase-discovery.ts (NEW)

components/helix/build/
├── PhaseDiscovery.tsx (NEW)

app/api/helix/projects/[projectId]/
├── phase-discovery/route.ts (NEW)
```

---

## Dependencies
- fs (Node.js file system)
- path (Node.js path utilities)
- lucide-react (icons)

---

## Tech Stack for This Phase
- TypeScript
- Node.js
- React
- Next.js

---

## Acceptance Criteria
1. parsePhaseSpec correctly extracts phase number, title, epic from markdown
2. extractPrerequisites returns array of prerequisite phase numbers
3. buildDependencyGraph loads all phases from directory
4. getNextPhase returns first phase with all prerequisites met
5. getCriticalPath returns longest dependency chain
6. PhaseDiscovery component displays next recommended phase
7. "Start Phase" button navigates to phase details page
8. Critical path visualization shows dependency chain
9. All phases completed message appears when no ready phases remain
10. API endpoint returns both nextPhase and criticalPath data

---

## Testing Instructions
1. Create sample phase spec files with prerequisites
2. Call buildDependencyGraph and verify all phases loaded
3. Test getNextPhase with various completion states
4. Verify critical path calculation matches manual dependency tracing
5. Render PhaseDiscovery component and confirm next phase displays
6. Test with 0%, 50%, 100% of phases completed
7. Click "Start Phase" button and verify navigation
8. Test with phases having circular dependencies (should handle gracefully)
9. Verify API endpoint returns correct data structure
10. Test performance with all 157 phases loaded

---

## Notes for the AI Agent
- Consider caching dependency graph for performance
- Integrate with helix_build_phases table for status updates
- Add notifications when prerequisites are met
- Consider visualizing full dependency tree in modal
