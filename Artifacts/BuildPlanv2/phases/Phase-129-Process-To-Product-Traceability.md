# Phase 129 — Process-To-Product Traceability

## Objective
Implement full traceability matrix from initial idea through Helix steps to deployed code. Show requirement → feature → blueprint → work order → deployment record. Provide visual trace UI and exportable traceability report.

## Prerequisites
- Phase 128 — Impact Analysis Engine — Full knowledge graph traversal capability

## Epic Context
**Epic:** 15 — Knowledge Graph Integration
**Phase:** 129 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Traceability is critical for compliance and quality assurance. Teams need to prove that every requirement in the project brief was implemented in the final product, and be able to trace any feature back to its original requirement. This phase provides a traceability matrix and visual trace showing the full journey from idea to deployment.

---

## Detailed Requirements

### 1. Traceability Matrix Generator
#### File: `src/lib/traceability/traceability-matrix.ts` (NEW)
Generate traceability matrix from knowledge graph.

```typescript
// src/lib/traceability/traceability-matrix.ts

import { createClient } from '@/lib/supabase';

export interface TraceabilityItem {
  id: string;
  requirement: string;
  feature?: string;
  blueprint?: string;
  work_order?: string;
  deployment?: string;
  status: 'complete' | 'partial' | 'missing' | 'verified';
  path: string[];
}

/**
 * Generate traceability matrix for project
 */
export async function generateTraceabilityMatrix(projectId: string): Promise<TraceabilityItem[]> {
  const supabase = createClient();

  // Get all requirements (ideas from Hall)
  const { data: ideas } = await supabase
    .from('ideas')
    .select('id, title, helix_project_id')
    .eq('helix_project_id', projectId);

  if (!ideas) return [];

  const matrix: TraceabilityItem[] = [];

  for (const idea of ideas) {
    // Trace requirement through system
    const { data: features } = await supabase
      .from('feature_nodes')
      .select('id, name')
      .eq('project_id', projectId);

    const { data: blueprints } = await supabase
      .from('feature_blueprints')
      .select('id, title')
      .eq('project_id', projectId);

    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('id, title')
      .eq('project_id', projectId);

    const { data: deployments } = await supabase
      .from('artifacts')
      .select('id, title')
      .eq('type', 'deployment_record')
      .eq('project_id', projectId);

    let status: 'complete' | 'partial' | 'missing' | 'verified' = 'missing';
    const path: string[] = [idea.id];

    if (features && features.length > 0) {
      path.push(features[0].id);
      status = 'partial';

      if (blueprints && blueprints.length > 0) {
        path.push(blueprints[0].id);

        if (workOrders && workOrders.length > 0) {
          path.push(workOrders[0].id);

          if (deployments && deployments.length > 0) {
            path.push(deployments[0].id);
            status = 'complete';
          }
        }
      }
    }

    matrix.push({
      id: idea.id,
      requirement: idea.title,
      feature: features?.[0]?.name,
      blueprint: blueprints?.[0]?.title,
      work_order: workOrders?.[0]?.title,
      deployment: deployments?.[0]?.title,
      status,
      path,
    });
  }

  return matrix;
}

/**
 * Export traceability matrix as CSV
 */
export function exportTraceabilityMatrixCSV(matrix: TraceabilityItem[]): string {
  const headers = ['Requirement', 'Feature', 'Blueprint', 'Work Order', 'Deployment', 'Status'];
  const rows = matrix.map(item => [
    item.requirement,
    item.feature || '-',
    item.blueprint || '-',
    item.work_order || '-',
    item.deployment || '-',
    item.status,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csv;
}
```

### 2. Traceability UI Component
#### File: `src/app/components/traceability-matrix.tsx` (NEW)
Display traceability matrix with visual indicators.

```typescript
// src/app/components/traceability-matrix.tsx

'use client';

import type { TraceabilityItem } from '@/lib/traceability/traceability-matrix';

interface TraceabilityMatrixProps {
  matrix: TraceabilityItem[];
  onClickItem?: (item: TraceabilityItem) => void;
}

export function TraceabilityMatrix({ matrix, onClickItem }: TraceabilityMatrixProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'verified':
        return 'bg-green-200 text-green-900';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'missing':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
      case 'verified':
        return '✓';
      case 'partial':
        return '◐';
      case 'missing':
        return '✗';
      default:
        return '—';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Requirement</th>
            <th className="px-4 py-3 text-left font-semibold">Feature</th>
            <th className="px-4 py-3 text-left font-semibold">Blueprint</th>
            <th className="px-4 py-3 text-left font-semibold">Work Order</th>
            <th className="px-4 py-3 text-left font-semibold">Deployment</th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {matrix.map(item => (
            <tr
              key={item.id}
              onClick={() => onClickItem?.(item)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-4 py-3 font-medium text-gray-900">{item.requirement}</td>
              <td className="px-4 py-3">{item.feature ? '✓' : '-'}</td>
              <td className="px-4 py-3">{item.blueprint ? '✓' : '-'}</td>
              <td className="px-4 py-3">{item.work_order ? '✓' : '-'}</td>
              <td className="px-4 py-3">{item.deployment ? '✓' : '-'}</td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block px-2 py-1 rounded font-semibold text-xs ${getStatusColor(item.status)}`}>
                  {getStatusIcon(item.status)} {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary stats */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Complete', count: matrix.filter(m => m.status === 'complete').length },
            { label: 'Partial', count: matrix.filter(m => m.status === 'partial').length },
            { label: 'Missing', count: matrix.filter(m => m.status === 'missing').length },
            { label: 'Total', count: matrix.length },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 3. API Endpoints
#### File: `src/app/api/traceability/matrix/route.ts` (NEW)
```typescript
import { generateTraceabilityMatrix, exportTraceabilityMatrixCSV } from '@/lib/traceability/traceability-matrix';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  try {
    const matrix = await generateTraceabilityMatrix(projectId);
    const csv = exportTraceabilityMatrixCSV(matrix);

    const format = searchParams.get('format');
    if (format === 'csv') {
      return new NextResponse(csv, {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=traceability-matrix.csv' },
      });
    }

    return NextResponse.json(matrix);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
```

---

## File Structure
```
src/lib/traceability/
├── traceability-matrix.ts (NEW)

src/app/components/
├── traceability-matrix.tsx (NEW)

src/app/api/traceability/
├── matrix/ (NEW)
│   └── route.ts (NEW)
```

---

## Dependencies
- Phase 128 impact analysis
- knowledge_graph_entities and entity_connections
- All v1 module tables

---

## Tech Stack
- TypeScript for matrix generation
- React for UI
- CSV export capability

---

## Acceptance Criteria
1. generateTraceabilityMatrix returns item for each requirement
2. Status is 'complete' when all steps traced
3. Status is 'partial' when some steps missing
4. Status is 'missing' when no downstream entities
5. Path contains IDs of all entities in trace
6. exportTraceabilityMatrixCSV outputs proper CSV format
7. TraceabilityMatrix displays checkmarks for completed stages
8. Summary shows counts by status
9. API endpoint accepts projectId and returns matrix JSON
10. API endpoint supports ?format=csv for export

---

## Testing Instructions
1. Create complete requirement → feature → blueprint → work order → deployment chain
2. Call generateTraceabilityMatrix
3. Verify status='complete' for fully traced requirement
4. Create requirement with only feature
5. Verify status='partial'
6. Create requirement with no features
7. Verify status='missing'
8. Export to CSV and verify format
9. Load TraceabilityMatrix component
10. Verify summary stats are correct

---

## Notes for the AI Agent
- Traceability proves compliance and quality
- Export capability for audit reports
- Status helps identify gaps in implementation
- Consider adding drill-down to see each entity in trace path
