# Phase 126 — Cross-Step Relationship Mapping

## Objective
Auto-detect relationships between Helix artifacts and create entity_connections with appropriate types and confidence scores. Map: Brief → BuildPlan (derived_from), BuildPlan → PhaseSpecs (implements), PhaseSpecs → WorkOrders (implements), Documentation → Brief (references).

## Prerequisites
- Phase 125 — Helix Step Outputs To Knowledge Graph Entities — Artifacts registered as entities

## Epic Context
**Epic:** 15 — Knowledge Graph Integration
**Phase:** 126 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Helix artifacts follow a natural progression: project brief → build plan → phase specs → work orders → deployment. These relationships should be automatically detected and encoded in the knowledge graph so the system understands the dependency chain. This phase detects these patterns and creates connections with confidence scores, distinguishing high-confidence automatic detections from manual links.

---

## Detailed Requirements

### 1. Relationship Pattern Detector
#### File: `src/lib/knowledge-graph/relationship-detector.ts` (NEW)
Analyze Helix artifacts and detect relationships between them.

```typescript
// src/lib/knowledge-graph/relationship-detector.ts

import { createClient } from '@/lib/supabase';

export interface DetectedRelationship {
  source_id: string;
  source_type: string;
  target_id: string;
  target_type: string;
  connection_type: 'derived_from' | 'implements' | 'references' | 'depends_on';
  confidence: number; // 0-1
  reason: string;
}

/**
 * Detect relationships between artifacts in a project
 */
export async function detectProjectRelationships(projectId: string): Promise<DetectedRelationship[]> {
  const supabase = createClient();
  const relationships: DetectedRelationship[] = [];

  // Get all artifacts for project
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('id, type, title, content, metadata, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (!artifacts || artifacts.length === 0) return relationships;

  // Group artifacts by type
  const byType = new Map<string, any[]>();
  for (const artifact of artifacts) {
    if (!byType.has(artifact.type)) {
      byType.set(artifact.type, []);
    }
    byType.get(artifact.type)!.push(artifact);
  }

  // Pattern 1: Brief → BuildPlan
  const briefs = byType.get('project_brief') || [];
  const buildPlans = byType.get('build_plan') || [];

  for (const brief of briefs) {
    for (const plan of buildPlans) {
      if (plan.created_at > brief.created_at) {
        // Build plan created after brief - likely derives from it
        relationships.push({
          source_id: brief.id,
          source_type: 'project_brief',
          target_id: plan.id,
          target_type: 'build_plan',
          connection_type: 'derived_from',
          confidence: 0.95,
          reason: 'Build plan created after project brief',
        });
      }
    }
  }

  // Pattern 2: BuildPlan → PhaseSpecs
  const phaseSpecs = byType.get('phase_spec') || [];

  for (const plan of buildPlans) {
    const planContent = plan.content.toLowerCase();

    for (const spec of phaseSpecs) {
      // Check if spec is mentioned in build plan or spec created after plan
      if (
        spec.created_at > plan.created_at ||
        planContent.includes(spec.title.toLowerCase())
      ) {
        relationships.push({
          source_id: plan.id,
          source_type: 'build_plan',
          target_id: spec.id,
          target_type: 'phase_spec',
          connection_type: 'implements',
          confidence: 0.85,
          reason: 'Phase spec implements build plan',
        });
      }
    }
  }

  // Pattern 3: Documentation → Brief (references)
  const docs = byType.get('documentation_set') || [];

  for (const doc of docs) {
    const docContent = doc.content.toLowerCase();

    for (const brief of briefs) {
      if (docContent.includes(brief.title.toLowerCase())) {
        relationships.push({
          source_id: doc.id,
          source_type: 'documentation_set',
          target_id: brief.id,
          target_type: 'project_brief',
          connection_type: 'references',
          confidence: 0.8,
          reason: 'Documentation references project brief',
        });
      }
    }
  }

  return relationships;
}

/**
 * Detect cross-artifact content references
 */
export function detectContentReferences(
  sourceContent: string,
  sourceTitle: string,
  targetTitle: string
): number {
  // Confidence score for how strongly content references target
  const content = sourceContent.toLowerCase();
  const sourceWords = sourceTitle.toLowerCase().split(/\s+/);
  const targetWords = targetTitle.toLowerCase().split(/\s+/);

  let matches = 0;
  for (const word of targetWords) {
    if (content.includes(word)) {
      matches++;
    }
  }

  return Math.min(matches / Math.max(targetWords.length, 1), 1.0);
}

/**
 * Detect artifact sequence relationships (temporal ordering)
 */
export function detectSequenceRelationships(
  artifacts: any[]
): { type: string; reason: string; confidence: number }[] {
  // Typical Helix sequence: brief → brainstorm/docs → build plan → phase specs → (features/blueprints/work orders)
  const sequence = ['project_brief', 'documentation_set', 'build_plan', 'phase_spec', 'feature_blueprint'];

  const relationships: { type: string; reason: string; confidence: number }[] = [];

  for (let i = 0; i < artifacts.length - 1; i++) {
    const current = artifacts[i];
    const next = artifacts[i + 1];

    const currentIdx = sequence.indexOf(current.type);
    const nextIdx = sequence.indexOf(next.type);

    if (currentIdx >= 0 && nextIdx >= 0 && nextIdx > currentIdx) {
      relationships.push({
        type: nextIdx === currentIdx + 1 ? 'derived_from' : 'depends_on',
        reason: `${next.type} follows ${current.type} in typical workflow`,
        confidence: nextIdx === currentIdx + 1 ? 0.9 : 0.7,
      });
    }
  }

  return relationships;
}
```

### 2. Relationship Creator Service
#### File: `src/lib/knowledge-graph/relationship-creator.ts` (NEW)
Create detected relationships in knowledge graph.

```typescript
// src/lib/knowledge-graph/relationship-creator.ts

import { createClient } from '@/lib/supabase';
import { detectProjectRelationships } from './relationship-detector';
import { createEntityConnection } from './connection-creator';
import type { DetectedRelationship } from './relationship-detector';

/**
 * Create relationships detected in project
 */
export async function createDetectedRelationships(projectId: string): Promise<number> {
  const supabase = createClient();

  try {
    // Detect relationships
    const relationships = await detectProjectRelationships(projectId);

    if (relationships.length === 0) {
      console.log(`[Knowledge Graph] No relationships detected for project ${projectId}`);
      return 0;
    }

    // Get knowledge graph entities for project
    const { data: entities } = await supabase
      .from('knowledge_graph_entities')
      .select('id, source_entity_id')
      .eq('helix_project_id', projectId);

    if (!entities) return 0;

    // Map artifact IDs to entity IDs
    const artifactToEntity = new Map<string, string>();
    for (const entity of entities) {
      artifactToEntity.set(entity.source_entity_id, entity.id);
    }

    // Create connections for detected relationships
    let created = 0;
    for (const rel of relationships) {
      const sourceEntityId = artifactToEntity.get(rel.source_id);
      const targetEntityId = artifactToEntity.get(rel.target_id);

      if (sourceEntityId && targetEntityId) {
        try {
          await createEntityConnection(
            sourceEntityId,
            targetEntityId,
            rel.connection_type,
            rel.confidence,
            rel.reason
          );

          created++;
        } catch (error) {
          console.error(`Error creating relationship ${rel.source_id} → ${rel.target_id}:`, error);
        }
      }
    }

    console.log(`[Knowledge Graph] Created ${created} relationships for project ${projectId}`);

    return created;
  } catch (error) {
    console.error('[Knowledge Graph] Failed to create relationships:', error);
    throw error;
  }
}

/**
 * Update relationships for a project (refresh detected relationships)
 */
export async function updateProjectRelationships(projectId: string): Promise<void> {
  const supabase = createClient();

  try {
    // Delete existing auto-detected relationships (keep manual ones)
    const { data: entities } = await supabase
      .from('knowledge_graph_entities')
      .select('id')
      .eq('helix_project_id', projectId);

    if (entities) {
      const entityIds = entities.map(e => e.id);

      // Remove auto-detected connections (confidence < 1.0)
      for (const entityId of entityIds) {
        await supabase
          .from('entity_connections')
          .delete()
          .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
          .lt('confidence', 1.0); // Only delete low-confidence (auto-detected)
      }
    }

    // Recreate detected relationships
    await createDetectedRelationships(projectId);
  } catch (error) {
    console.error('[Knowledge Graph] Failed to update relationships:', error);
    throw error;
  }
}
```

### 3. Trigger for Auto-Detection
#### File: `src/lib/sync/triggers/on-build-plan-complete.ts` (NEW)
Trigger relationship detection when build plan is completed.

```typescript
// src/lib/sync/triggers/on-build-plan-complete.ts

import { createDetectedRelationships } from '@/lib/knowledge-graph/relationship-creator';

export async function onBuildPlanComplete(projectId: string): Promise<number> {
  try {
    // Detect and create relationships now that build plan is available
    const created = await createDetectedRelationships(projectId);
    console.log(`[Knowledge Graph] Auto-detected ${created} relationships for project ${projectId}`);
    return created;
  } catch (error) {
    console.error('[Knowledge Graph] Failed to auto-detect relationships:', error);
    throw error;
  }
}
```

### 4. Relationship Visualization Component
#### File: `src/app/components/artifact-relationship-map.tsx` (NEW)
Display artifact relationships in project timeline view.

```typescript
// src/app/components/artifact-relationship-map.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface ArtifactRelationshipMapProps {
  projectId: string;
}

export function ArtifactRelationshipMap({ projectId }: ArtifactRelationshipMapProps) {
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    const supabase = createClient();

    // Get artifacts
    const { data: artifactData } = await supabase
      .from('artifacts')
      .select('id, type, title, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    // Get entities and connections
    const { data: entityData } = await supabase
      .from('knowledge_graph_entities')
      .select('*')
      .eq('helix_project_id', projectId);

    const { data: connectionData } = await supabase
      .from('entity_connections')
      .select('*')
      .in(
        'source_entity_id',
        entityData?.map(e => e.id) || []
      );

    setArtifacts(artifactData || []);
    setConnections(connectionData || []);
    setLoading(false);
  }

  if (loading) return <div className="p-4">Loading artifact relationships...</div>;

  const typeColors: Record<string, string> = {
    'project_brief': 'bg-blue-100',
    'documentation_set': 'bg-green-100',
    'build_plan': 'bg-purple-100',
    'phase_spec': 'bg-yellow-100',
    'deployment_record': 'bg-red-100',
  };

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg">Artifact Relationship Map</h3>

      {/* Timeline view */}
      <div className="relative">
        {artifacts.map((artifact, idx) => (
          <div key={artifact.id} className="flex gap-4 mb-6">
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${typeColors[artifact.type] || 'bg-gray-100'} border-2 border-gray-300`} />
              {idx < artifacts.length - 1 && <div className="w-1 bg-gray-300 flex-1 my-4" />}
            </div>

            {/* Artifact card */}
            <div className={`flex-1 p-4 rounded border ${typeColors[artifact.type] || 'bg-gray-50'}`}>
              <h4 className="font-semibold text-sm">{artifact.title}</h4>
              <p className="text-xs text-gray-600 mt-1 capitalize">{artifact.type.replace('_', ' ')}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(artifact.created_at).toLocaleDateString()}
              </p>

              {/* Show outgoing connections */}
              {connections
                .filter(c => c.source_entity_id === artifact.id)
                .map(conn => (
                  <div key={conn.id} className="mt-2 p-2 bg-white rounded text-xs">
                    <p className="font-semibold text-blue-600">→ {conn.type}</p>
                    {conn.confidence < 1.0 && (
                      <p className="text-gray-600">
                        Confidence: {Math.round(conn.confidence * 100)}%
                      </p>
                    )}
                    {conn.reason && <p className="text-gray-600 italic">{conn.reason}</p>}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Connection summary */}
      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <p className="text-sm font-semibold mb-2">Detected Relationships</p>
        <p className="text-sm text-gray-700">
          {connections.filter(c => c.confidence < 1.0).length} auto-detected,{' '}
          {connections.filter(c => c.confidence === 1.0).length} manual
        </p>
      </div>
    </div>
  );
}
```

---

## File Structure
```
src/lib/knowledge-graph/
├── relationship-detector.ts (NEW)
├── relationship-creator.ts (NEW)

src/lib/sync/triggers/
├── on-build-plan-complete.ts (NEW)

src/app/components/
├── artifact-relationship-map.tsx (NEW)
```

---

## Dependencies
- Phase 125 artifacts registered as entities
- knowledge_graph_entities table
- entity_connections table
- artifacts table

---

## Tech Stack for This Phase
- TypeScript for pattern detection
- Content analysis for reference detection
- Temporal ordering for sequence relationships
- React for visualization

---

## Acceptance Criteria
1. detectProjectRelationships identifies brief → build plan relationships
2. Confidence score for sequence-based detection is >= 0.8
3. detectProjectRelationships identifies build plan → phase spec relationships
4. detectContentReferences scores reference strength 0-1 based on keyword matches
5. detectSequenceRelationships maps typical Helix artifact sequence
6. createDetectedRelationships creates entity_connections for all relationships
7. Auto-detected connections have confidence < 1.0
8. Manual connections have confidence = 1.0
9. onBuildPlanComplete triggers relationship auto-detection
10. ArtifactRelationshipMap displays timeline with connections and confidence scores

---

## Testing Instructions
1. Create project with brief, build plan, and phase specs
2. Call detectProjectRelationships
3. Verify brief → build plan relationship detected with high confidence
4. Call createDetectedRelationships
5. Check entity_connections table for created relationships
6. Call detectContentReferences with matching keywords
7. Verify confidence score increases with match count
8. Complete build plan and verify onBuildPlanComplete triggers auto-detection
9. Load ArtifactRelationshipMap component
10. Verify timeline shows all artifacts and connections

---

## Notes for the AI Agent
- Confidence scores help distinguish manual (1.0) from auto-detected (0.7-0.95)
- Temporal ordering (artifact A created before B) is strong signal of dependency
- Content analysis (keywords in artifact) provides additional confidence
- Auto-detection is optional; users can still manually create connections
- Re-running detection should update connections (delete auto-detected, recreate)
