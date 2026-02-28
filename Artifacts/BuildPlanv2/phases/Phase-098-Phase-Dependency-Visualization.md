# Phase 098 — Phase Dependency Visualization

## Objective
Create an interactive graph visualization showing phase dependencies as nodes and edges. Highlight the critical path, color phases by status, and enable navigation through the graph to explore dependencies and phase details.

## Prerequisites
- Phase 094 — Automated Phase Discovery — provides dependency data structures
- Phase 095 — Build Progress Real-Time Updates — provides live status updates

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 098 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
With 157 phases and complex dependency chains, a textual list doesn't convey relationships visually. Engineers can't easily see which phases block others, identify critical bottlenecks, or understand the overall build structure.

This phase builds DependencyGraph: an interactive force-directed graph showing all phase dependencies. Nodes are colored by status, edges show prerequisites, and the critical path is highlighted. Users can zoom, pan, and click nodes to navigate to phase details.

---

## Detailed Requirements

### 1. Dependency Graph Visualization Component
#### File: `components/helix/build/DependencyGraph.tsx` (NEW)
Interactive force-directed graph using d3 or recharts.

```typescript
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface PhaseNode {
  id: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  isCritical: boolean;
}

interface PhaseLink {
  source: number;
  target: number;
}

interface DependencyGraphProps {
  nodes: PhaseNode[];
  links: PhaseLink[];
  onPhaseClick: (phaseNumber: number) => void;
  height?: number;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes,
  links,
  onPhaseClick,
  height = 600,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const statusColors = {
    completed: '#22c55e',
    in_progress: '#06b6d4',
    pending: '#f5f5f5',
    blocked: '#ef4444',
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = svgRef.current.clientWidth;

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Add zoom behavior
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Add links
    const link = g
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => {
        const sourceNode = nodes.find((n) => n.id === d.source.id || n.id === d.source);
        return sourceNode?.isCritical ? '#fbbf24' : '#64748b';
      })
      .attr('stroke-width', (d: any) => {
        const sourceNode = nodes.find((n) => n.id === d.source.id || n.id === d.source);
        return sourceNode?.isCritical ? 3 : 1;
      })
      .attr('opacity', 0.6);

    // Add nodes
    const node = g
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d: any) => (d.isCritical ? 12 : 8))
      .attr('fill', (d: any) => statusColors[d.status])
      .attr('stroke', (d: any) => (d.isCritical ? '#fbbf24' : 'none'))
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (_, d: any) => onPhaseClick(d.id))
      .call(
        d3
          .drag<SVGCircleElement, PhaseNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Add labels
    const labels = g
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d: any) => `P${d.id}`)
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', '#1e293b')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

      labels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, onPhaseClick, height]);

  const handleZoom = (direction: 'in' | 'out') => {
    const svg = d3.select(svgRef.current);
    const newZoom = direction === 'in' ? zoomLevel * 1.2 : zoomLevel / 1.2;
    svg.transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleTo, newZoom);
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(750)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity
          .translate(svgRef.current?.clientWidth! / 2, height / 2)
          .scale(1)
      );
  };

  return (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden">
      <svg ref={svgRef} style={{ width: '100%', height: `${height}px` }} />

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => handleZoom('in')}
          className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleReset}
          className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded transition-colors"
          title="Reset view"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-slate-800 p-4 rounded text-xs space-y-2">
        <div className="font-semibold text-white mb-2">Status Legend</div>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div style={{ backgroundColor: color }} className="w-3 h-3 rounded-full" />
            <span className="text-slate-300">{status}</span>
          </div>
        ))}
        <div className="border-t border-slate-700 mt-2 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-400 rounded-full" />
            <span className="text-slate-300">Critical path</span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 2. Graph Data Provider Hook
#### File: `hooks/useDependencyGraphData.ts` (NEW)
Load and prepare graph data from phase discovery.

```typescript
import { useState, useEffect } from 'react';

export const useDependencyGraphData = (projectId: string, completedPhases: number[]) => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/graph-data?completed=${completedPhases.join(',')}`
        );
        const data = await res.json();
        setNodes(data.nodes);
        setLinks(data.links);
      } catch (error) {
        console.error('Failed to fetch graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [projectId, completedPhases]);

  return { nodes, links, loading };
};
```

---

## File Structure
```
components/helix/build/
├── DependencyGraph.tsx (NEW)

hooks/
├── useDependencyGraphData.ts (NEW)

app/api/helix/projects/[projectId]/
├── graph-data/route.ts (NEW)
```

---

## Dependencies
- d3 (force-directed graph)
- lucide-react (icons)
- TypeScript

---

## Tech Stack for This Phase
- TypeScript
- React
- D3.js
- Next.js

---

## Acceptance Criteria
1. DependencyGraph renders circular nodes for each phase
2. Edges connect phases with dependencies
3. Nodes are colored: green (completed), cyan (in-progress), white (pending), red (blocked)
4. Critical path nodes have yellow stroke
5. Critical path links are yellow and thicker
6. Drag node to move it around graph
7. Zoom in/out buttons work correctly
8. Reset button returns to default view
9. Click node navigates to phase details
10. Labels show phase number (P092, P093, etc.)

---

## Testing Instructions
1. Load DependencyGraph with sample phase data
2. Verify all nodes render
3. Verify all links render between dependent phases
4. Test drag-and-drop node movement
5. Test zoom in/out buttons
6. Test reset button returns to center
7. Click node and verify navigation
8. Test with 50, 100, 157 phases for performance
9. Verify critical path highlighting is correct
10. Test on mobile (should remain usable)

---

## Notes for the AI Agent
- Use D3 force simulation for automatic layout
- Consider WebGL rendering for 150+ phases for better performance
- Add ability to filter by epic or status
- Add phase search/highlight feature
- Consider exporting graph as SVG/PNG
