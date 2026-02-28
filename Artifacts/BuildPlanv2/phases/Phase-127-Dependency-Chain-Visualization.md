# Phase 127 — Dependency Chain Visualization

## Objective
Create an interactive visual graph showing how Helix artifacts connect to v1 module entities. Nodes include both Helix artifacts and v1 entities, edges show connection types with labels. Implement using d3 force-directed graph with click-to-navigate and type-based filtering.

## Prerequisites
- Phase 125 — Helix Step Outputs To Knowledge Graph Entities — Entities and connections created
- Phase 126 — Cross-Step Relationship Mapping — Relationships detected and stored

## Epic Context
**Epic:** 15 — Knowledge Graph Integration
**Phase:** 127 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
While the knowledge graph exists in the database, it's difficult to understand visually in a table view. A force-directed graph provides intuitive visualization showing dependencies and relationships. Stakeholders can click nodes to drill down, filter by entity type, and see connection strengths through visual weight. This builds understanding of the project architecture.

---

## Detailed Requirements

### 1. Graph Data Loader
#### File: `src/lib/knowledge-graph/graph-loader.ts` (NEW)
Load graph data (nodes and edges) from knowledge graph.

```typescript
// src/lib/knowledge-graph/graph-loader.ts

import { createClient } from '@/lib/supabase';

export interface GraphNode {
  id: string;
  label: string;
  type: 'artifact' | 'feature' | 'blueprint' | 'work_order' | 'idea';
  group: string; // For coloring
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  strength: number; // confidence 0-1, used for visual weight
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Load graph for a Helix project
 */
export async function loadProjectGraph(projectId: string): Promise<GraphData> {
  const supabase = createClient();

  // Get knowledge graph entities
  const { data: entities } = await supabase
    .from('knowledge_graph_entities')
    .select('id, type, title, source_entity_id, source_entity_type, metadata')
    .eq('helix_project_id', projectId);

  // Get v1 entities (features, blueprints, work orders, ideas)
  const { data: features } = await supabase
    .from('feature_nodes')
    .select('id, name, level')
    .eq('project_id', projectId);

  const { data: blueprints } = await supabase
    .from('feature_blueprints')
    .select('id, title')
    .eq('project_id', projectId);

  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('id, title')
    .eq('project_id', projectId);

  // Get all entity connections
  const { data: connections } = await supabase
    .from('entity_connections')
    .select('*');

  // Build nodes
  const nodes: GraphNode[] = [];
  const nodeMap = new Map<string, string>(); // entity_id -> node_id

  // Add Helix artifact nodes
  if (entities) {
    for (const entity of entities) {
      const nodeId = `artifact-${entity.id}`;
      nodes.push({
        id: nodeId,
        label: entity.title,
        type: 'artifact',
        group: entity.type,
        metadata: {
          entityId: entity.id,
          entityType: entity.type,
          ...entity.metadata,
        },
      });
      nodeMap.set(entity.id, nodeId);
    }
  }

  // Add v1 feature nodes
  if (features) {
    for (const feature of features) {
      const nodeId = `feature-${feature.id}`;
      nodes.push({
        id: nodeId,
        label: feature.name,
        type: 'feature',
        group: `feature-${feature.level}`,
      });
      nodeMap.set(feature.id, nodeId);
    }
  }

  // Add blueprint nodes
  if (blueprints) {
    for (const blueprint of blueprints) {
      const nodeId = `blueprint-${blueprint.id}`;
      nodes.push({
        id: nodeId,
        label: blueprint.title,
        type: 'blueprint',
        group: 'blueprint',
      });
      nodeMap.set(blueprint.id, nodeId);
    }
  }

  // Add work order nodes
  if (workOrders) {
    for (const order of workOrders) {
      const nodeId = `workorder-${order.id}`;
      nodes.push({
        id: nodeId,
        label: order.title,
        type: 'work_order',
        group: 'work_order',
      });
      nodeMap.set(order.id, nodeId);
    }
  }

  // Build edges from entity connections
  const edges: GraphEdge[] = [];
  if (connections) {
    for (const conn of connections) {
      const sourceId = nodeMap.get(conn.source_entity_id);
      const targetId = nodeMap.get(conn.target_entity_id);

      if (sourceId && targetId) {
        edges.push({
          source: sourceId,
          target: targetId,
          type: conn.type,
          strength: conn.confidence || 0.5,
          label: conn.type.replace(/_/g, ' '),
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Get filtered graph by entity types
 */
export function filterGraphByTypes(
  graph: GraphData,
  types: string[]
): GraphData {
  if (types.length === 0) return graph; // No filter

  const filteredNodes = graph.nodes.filter(n => types.includes(n.type));
  const nodeIds = new Set(filteredNodes.map(n => n.id));

  const filteredEdges = graph.edges.filter(
    e => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}
```

### 2. D3 Force Graph Component
#### File: `src/app/components/force-graph.tsx` (NEW)
Interactive force-directed graph using d3.

```typescript
// src/app/components/force-graph.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphData, GraphNode, GraphEdge } from '@/lib/knowledge-graph/graph-loader';

interface ForceGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  height?: number;
}

export function ForceGraph({ data, onNodeClick, height = 600 }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = svgRef.current.clientWidth;

    // Create simulation
    const simulation = d3
      .forceSimulation<GraphNode>(data.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(data.edges)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Select SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear

    // Create container
    const g = svg.append('g');

    // Add zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom);

    // Create links
    const links = g
      .selectAll('line')
      .data(data.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(d.strength) * 3);

    // Add link labels
    const linkLabels = g
      .selectAll('text.link-label')
      .data(data.edges)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text((d: any) => d.label);

    // Create nodes
    const nodes = g
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('r', 8)
      .attr('fill', (d: any) => {
        const colors: Record<string, string> = {
          artifact: '#3b82f6',
          feature: '#10b981',
          blueprint: '#8b5cf6',
          work_order: '#f59e0b',
          idea: '#ec4899',
        };
        return colors[d.type] || '#6b7280';
      })
      .attr('cursor', 'pointer')
      .on('mouseenter', (_, d: any) => setHoveredNode(d.id))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (_, d: any) => onNodeClick?.(d))
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            (d as any).fx = (d as any).x;
            (d as any).fy = (d as any).y;
          })
          .on('drag', (event, d) => {
            (d as any).fx = event.x;
            (d as any).fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            (d as any).fx = null;
            (d as any).fy = null;
          })
      );

    // Create node labels
    const labels = g
      .selectAll('text.node-label')
      .data(data.nodes)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('font-size', '11px')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('pointer-events', 'none')
      .text((d: any) => d.label.substring(0, 15))
      .attr('opacity', (d: any) => (hoveredNode === d.id ? 1 : 0.7));

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      nodes.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

      labels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [data, hoveredNode, height]);

  return (
    <div className="w-full border rounded-lg bg-white overflow-hidden">
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: `${height}px`,
          border: '1px solid #e5e7eb',
        }}
      />
      <div className="p-4 bg-gray-50 border-t text-xs text-gray-600">
        <p>Drag nodes to reposition • Click node to details • Zoom to navigate</p>
      </div>
    </div>
  );
}
```

### 3. Dependency Chain Viewer
#### File: `src/app/helix/projects/[projectId]/dependency-graph.tsx` (NEW)
Page displaying full dependency graph with filters.

```typescript
// src/app/helix/projects/[projectId]/dependency-graph.tsx

'use client';

import { useEffect, useState } from 'react';
import { loadProjectGraph, filterGraphByTypes } from '@/lib/knowledge-graph/graph-loader';
import { ForceGraph } from '@/app/components/force-graph';
import type { GraphData, GraphNode } from '@/lib/knowledge-graph/graph-loader';

interface DependencyGraphProps {
  projectId: string;
}

export function DependencyGraph({ projectId }: DependencyGraphProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Set<string>>(new Set(['artifact', 'feature', 'blueprint', 'work_order']));

  useEffect(() => {
    async function load() {
      try {
        const data = await loadProjectGraph(projectId);
        setGraphData(data);
      } catch (error) {
        console.error('Failed to load graph:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId]);

  const filteredData = graphData ? filterGraphByTypes(graphData, Array.from(filters)) : null;

  const toggleFilter = (type: string) => {
    const newFilters = new Set(filters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setFilters(newFilters);
  };

  if (loading) return <div className="p-6">Loading dependency graph...</div>;
  if (!graphData) return <div className="p-6">Failed to load graph</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold">Dependency Chain</h2>
        <div className="flex gap-2">
          {['artifact', 'feature', 'blueprint', 'work_order'].map(type => (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                filters.has(type)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Graph */}
      {filteredData && <ForceGraph data={filteredData} onNodeClick={setSelectedNode} height={700} />}

      {/* Details panel */}
      {selectedNode && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg">{selectedNode.label}</h3>
              <p className="text-sm text-gray-700">Type: {selectedNode.type}</p>
              <p className="text-sm text-gray-700">Group: {selectedNode.group}</p>
              {selectedNode.metadata && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold text-sm">Metadata</summary>
                  <pre className="text-xs bg-white p-2 rounded mt-2 overflow-auto">
                    {JSON.stringify(selectedNode.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold text-sm mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: '#3b82f6', label: 'Artifact' },
            { color: '#10b981', label: 'Feature' },
            { color: '#8b5cf6', label: 'Blueprint' },
            { color: '#f59e0b', label: 'Work Order' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
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
├── graph-loader.ts (NEW)

src/app/components/
├── force-graph.tsx (NEW)

src/app/helix/projects/[projectId]/
├── dependency-graph.tsx (NEW)
```

---

## Dependencies
- Phase 125 entities in knowledge graph
- Phase 126 connections created
- d3 library for visualization

---

## Tech Stack for This Phase
- D3.js for force-directed graph
- React for UI
- TypeScript for types
- Supabase for data loading

---

## Acceptance Criteria
1. loadProjectGraph returns nodes for Helix artifacts and v1 entities
2. loadProjectGraph returns edges from entity_connections
3. Node types map to visual colors (artifact=blue, feature=green, etc.)
4. Edge strength reflects connection confidence (weighted lines)
5. ForceGraph renders SVG with nodes and edges
6. Nodes are draggable and update simulation
7. Zoom and pan work on graph
8. Node labels show on hover
9. filterGraphByTypes removes nodes and edges by type
10. DependencyGraph displays filters and legend

---

## Testing Instructions
1. Create project with artifacts and relationships
2. Call loadProjectGraph
3. Verify nodes include artifacts and v1 entities
4. Verify edges represent connections
5. Render ForceGraph component
6. Test dragging nodes
7. Test zoom and pan
8. Click node and verify details panel shows
9. Test type filters
10. Verify legend displays all types

---

## Notes for the AI Agent
- D3 force graph helps visualize complex relationships intuitively
- Confidence scores become visual weight (thicker lines = stronger connection)
- Filters allow focusing on specific entity types
- Click nodes to see full metadata and drill down
- Consider adding legend and keyboard shortcuts for power users
