# Phase 128 — Impact Analysis Engine

## Objective
Implement impact analysis that traverses the knowledge graph to identify downstream entities affected when a Helix artifact changes. Generate impact reports showing what might need updating, and alert users of potentially stale downstream data.

## Prerequisites
- Phase 126 — Cross-Step Relationship Mapping — Relationships defined in knowledge graph
- Phase 127 — Dependency Chain Visualization — Graph navigation logic

## Epic Context
**Epic:** 15 — Knowledge Graph Integration
**Phase:** 128 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
When a Helix artifact changes (e.g., project brief is updated), downstream entities might be affected (build plan, phase specs, features, blueprints, work orders). Teams need to know what changed and what might be stale. Impact analysis traverses the knowledge graph to identify all downstream dependencies and alerts teams to review affected work.

---

## Detailed Requirements

### 1. Impact Analysis Engine
#### File: `src/lib/knowledge-graph/impact-analyzer.ts` (NEW)
Traverse graph and identify impacted entities.

```typescript
// src/lib/knowledge-graph/impact-analyzer.ts

import { createClient } from '@/lib/supabase';

export interface ImpactedEntity {
  id: string;
  type: string;
  title: string;
  distance: number; // hops from source
  path: string[]; // path through graph
  connections: { type: string; confidence: number }[];
  potentially_stale: boolean;
}

export interface ImpactAnalysisResult {
  source_entity_id: string;
  total_impacted: number;
  by_distance: Record<number, number>;
  impacted_entities: ImpactedEntity[];
  risk_level: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Analyze impact of change to an artifact
 */
export async function analyzeImpact(
  sourceEntityId: string,
  maxDepth: number = 5
): Promise<ImpactAnalysisResult> {
  const supabase = createClient();

  // BFS traversal of knowledge graph
  const visited = new Set<string>();
  const queue: Array<{ id: string; distance: number; path: string[] }> = [
    { id: sourceEntityId, distance: 0, path: [sourceEntityId] },
  ];

  const impacted: ImpactedEntity[] = [];
  const byDistance: Record<number, number> = {};

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.distance > maxDepth) continue;
    if (current.distance === 0) continue; // Skip source itself

    // Get entity details
    const { data: entity } = await supabase
      .from('knowledge_graph_entities')
      .select('*')
      .eq('id', current.id)
      .single();

    if (!entity) continue;

    byDistance[current.distance] = (byDistance[current.distance] || 0) + 1;

    // Get connections for this entity
    const { data: connections } = await supabase
      .from('entity_connections')
      .select('*')
      .or(`source_entity_id.eq.${current.id},target_entity_id.eq.${current.id}`);

    const conns = connections || [];

    impacted.push({
      id: current.id,
      type: entity.type,
      title: entity.title,
      distance: current.distance,
      path: current.path,
      connections: conns.map(c => ({
        type: c.type,
        confidence: c.confidence || 0.5,
      })),
      potentially_stale: current.distance > 0, // Downstream entities might be stale
    });

    // Add downstream entities to queue
    for (const conn of conns) {
      const nextId = conn.source_entity_id === current.id ? conn.target_entity_id : conn.source_entity_id;

      if (!visited.has(nextId)) {
        queue.push({
          id: nextId,
          distance: current.distance + 1,
          path: [...current.path, nextId],
        });
      }
    }
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (impacted.length > 20) riskLevel = 'high';
  else if (impacted.length > 10) riskLevel = 'medium';

  // Generate recommendations
  const recommendations: string[] = [];
  if (impacted.length > 0) {
    recommendations.push(
      `Review ${impacted.filter(e => e.distance === 1).length} direct dependencies`
    );
  }
  if (impacted.filter(e => e.distance > 2).length > 0) {
    recommendations.push('Check indirect dependencies for cascading impacts');
  }
  if (impacted.length > 10) {
    recommendations.push('Consider phased rollout to manage impact');
  }

  return {
    source_entity_id: sourceEntityId,
    total_impacted: impacted.length,
    by_distance: byDistance,
    impacted_entities: impacted,
    risk_level: riskLevel,
    recommendations,
  };
}

/**
 * Get stale entity alerts
 */
export async function getStaleEntityAlerts(
  projectId: string,
  staleDaysThreshold: number = 7
): Promise<any[]> {
  const supabase = createClient();

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - staleDaysThreshold);

  // Get entities not updated in threshold days
  const { data: staleEntities } = await supabase
    .from('knowledge_graph_entities')
    .select('*')
    .eq('helix_project_id', projectId)
    .lt('updated_at', thresholdDate.toISOString());

  // Get dependencies for each stale entity
  const alerts = [];
  for (const entity of staleEntities || []) {
    const impact = await analyzeImpact(entity.id, 2);

    if (impact.total_impacted > 0) {
      alerts.push({
        entity,
        impact,
        lastUpdated: new Date(entity.updated_at),
        daysSinceUpdate: Math.floor(
          (Date.now() - new Date(entity.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
      });
    }
  }

  return alerts.sort((a, b) => b.impact.total_impacted - a.impact.total_impacted);
}
```

### 2. Impact Report Component
#### File: `src/app/components/impact-report.tsx` (NEW)
Display impact analysis results.

```typescript
// src/app/components/impact-report.tsx

'use client';

interface ImpactReportProps {
  analysis: {
    source_entity_id: string;
    total_impacted: number;
    by_distance: Record<number, number>;
    impacted_entities: any[];
    risk_level: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  onEntityClick?: (entityId: string) => void;
}

export function ImpactReport({ analysis, onEntityClick }: ImpactReportProps) {
  const riskColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6 border rounded-lg p-6 bg-white">
      <div>
        <h3 className="text-lg font-bold mb-4">Impact Analysis</h3>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-600">Total Impacted</p>
            <p className="text-3xl font-bold text-blue-600">{analysis.total_impacted}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-sm text-gray-600">Risk Level</p>
            <span className={`inline-block px-3 py-1 rounded font-semibold text-sm ${riskColors[analysis.risk_level]}`}>
              {analysis.risk_level.toUpperCase()}
            </span>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-600">Max Depth</p>
            <p className="text-3xl font-bold text-gray-600">{Object.keys(analysis.by_distance).length}</p>
          </div>
        </div>

        {/* Breakdown by distance */}
        <div className="mb-6">
          <h4 className="font-semibold text-sm mb-2">Impacted by Distance</h4>
          <div className="space-y-1">
            {Object.entries(analysis.by_distance).map(([distance, count]) => (
              <div key={distance} className="flex items-center gap-2">
                <span className="text-sm font-medium w-12">{distance} hop{Number(distance) !== 1 ? 's' : ''}</span>
                <div className="flex-1 bg-gray-200 rounded h-6">
                  <div
                    className="bg-blue-500 h-full rounded transition-all"
                    style={{ width: `${(count / analysis.total_impacted) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-700 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 rounded border border-yellow-200">
            <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
            <ul className="space-y-1 text-sm">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2">
                  <span>→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Impacted entities table */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Impacted Entities</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Entity</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-center">Distance</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {analysis.impacted_entities.map(entity => (
                  <tr key={entity.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onEntityClick?.(entity.id)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {entity.title}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-sm capitalize">{entity.type}</td>
                    <td className="px-3 py-2 text-center font-semibold">{entity.distance}</td>
                    <td className="px-3 py-2">
                      {entity.potentially_stale && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          May be stale
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File Structure
```
src/lib/knowledge-graph/
├── impact-analyzer.ts (NEW)

src/app/components/
├── impact-report.tsx (NEW)
```

---

## Dependencies
- Phase 126 relationships in knowledge graph
- entity_connections table with strength/confidence

---

## Tech Stack for This Phase
- TypeScript for BFS graph traversal
- Supabase for entity and connection queries
- React for impact report UI

---

## Acceptance Criteria
1. analyzeImpact performs BFS traversal of knowledge graph
2. BFS respects maxDepth parameter (default 5)
3. Returns impacted entities sorted by distance
4. Each impacted entity includes full path through graph
5. Risk level is 'high' for >20 impacted, 'medium' for >10, 'low' otherwise
6. Recommendations are generated based on impact count and depth
7. getStaleEntityAlerts returns entities not updated in threshold days
8. ImpactReport displays total impacted and risk level
9. ImpactReport shows breakdown by distance with progress bars
10. ImpactReport lists all impacted entities with distance and status

---

## Testing Instructions
1. Create project with linked entities (brief → build plan → specs)
2. Call analyzeImpact on brief entity
3. Verify build plan and specs appear in impacted list
4. Verify distances are correct (1, 2)
5. Create >10 impacted entities
6. Call analyzeImpact and verify risk_level='medium'
7. Create stale entity (>7 days old)
8. Call getStaleEntityAlerts
9. Verify stale entity with dependencies is returned
10. Render ImpactReport component and verify all sections display

---

## Notes for the AI Agent
- BFS ensures we find all reachable entities
- Distance indicates how far downstream an entity is
- Confidence scores could weight importance in future enhancements
- Stale alerts help teams stay on top of downstream changes
- Consider adding refresh recommendations (e.g., "Review and update phase specs")
