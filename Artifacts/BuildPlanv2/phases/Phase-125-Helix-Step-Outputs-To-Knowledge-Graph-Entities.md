# Phase 125 — Helix Step Outputs To Knowledge Graph Entities

## Objective
Register Helix artifacts (step outputs) as entities in the v1 knowledge graph. Create nodes for each artifact type (project_brief, documentation_set, build_plan, phase_spec, deployment_record) and establish connections back to the originating Helix project and steps.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Entity type definitions established
- Phase 117 — Feature Tree From Build Plan To Pattern Shop — Feature nodes created (reference for entity_connections)

## Epic Context
**Epic:** 15 — Knowledge Graph Integration
**Phase:** 125 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The v1 knowledge graph (entity_connections table) connects ideas, features, blueprints, and other entities to show relationships. Helix artifacts are major information assets (project briefs, documentation, build plans) that should be discoverable and linkable within the knowledge graph. This phase registers each Helix artifact as a knowledge graph node, enabling traceability from initial idea through to final deployment.

---

## Detailed Requirements

### 1. Knowledge Graph Entity Registration
#### File: `src/lib/knowledge-graph/entity-registry.ts` (NEW)
Register Helix artifacts as knowledge graph entities.

```typescript
// src/lib/knowledge-graph/entity-registry.ts

import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

export type KnowledgeGraphEntityType =
  | 'project_brief'
  | 'documentation_set'
  | 'build_plan'
  | 'phase_spec'
  | 'deployment_record'
  | 'feature'
  | 'blueprint'
  | 'work_order'
  | 'idea';

export interface KnowledgeGraphEntity {
  id: string;
  type: KnowledgeGraphEntityType;
  title: string;
  description?: string;
  source_entity_id: string; // artifact or helix_step id
  source_entity_type: string;
  helix_project_id: string;
  metadata?: {
    phase_number?: number;
    epic_number?: number;
    artifact_type?: string;
    created_in_step?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Register a Helix artifact as a knowledge graph entity
 */
export async function registerArtifactAsEntity(
  artifactId: string,
  artifactType: string,
  title: string,
  description: string,
  projectId: string,
  metadata?: Record<string, any>
): Promise<string> {
  const supabase = createClient();

  // Determine entity type based on artifact type
  const entityType: KnowledgeGraphEntityType = mapArtifactToEntityType(artifactType);

  const entityId = uuid();

  const { error } = await supabase
    .from('knowledge_graph_entities')
    .insert({
      id: entityId,
      type: entityType,
      title,
      description,
      source_entity_id: artifactId,
      source_entity_type: 'artifact',
      helix_project_id: projectId,
      metadata: {
        artifact_type: artifactType,
        ...metadata,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to register artifact as entity: ${error.message}`);
  }

  console.log(`[Knowledge Graph] Registered ${artifactType} artifact as entity ${entityId}`);

  return entityId;
}

/**
 * Register a Helix step output as a knowledge graph entity
 */
export async function registerStepOutputAsEntity(
  stepId: string,
  stepName: string,
  stepOutput: string,
  projectId: string,
  metadata?: Record<string, any>
): Promise<string> {
  const supabase = createClient();

  const entityId = uuid();

  // Generic step output entity type
  const entityType: KnowledgeGraphEntityType = 'project_brief'; // Default; adjust based on step

  const { error } = await supabase
    .from('knowledge_graph_entities')
    .insert({
      id: entityId,
      type: entityType,
      title: stepName,
      description: stepOutput,
      source_entity_id: stepId,
      source_entity_type: 'helix_step',
      helix_project_id: projectId,
      metadata: {
        created_in_step: stepId,
        ...metadata,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to register step output as entity: ${error.message}`);
  }

  console.log(`[Knowledge Graph] Registered step ${stepId} output as entity ${entityId}`);

  return entityId;
}

/**
 * Map Helix artifact types to knowledge graph entity types
 */
function mapArtifactToEntityType(artifactType: string): KnowledgeGraphEntityType {
  const mapping: Record<string, KnowledgeGraphEntityType> = {
    'project_brief': 'project_brief',
    'documentation_set': 'documentation_set',
    'build_plan': 'build_plan',
    'phase_spec': 'phase_spec',
    'deployment_record': 'deployment_record',
  };

  return mapping[artifactType] || 'project_brief';
}

/**
 * Batch register all artifacts for a project
 */
export async function registerProjectArtifactsAsEntities(projectId: string): Promise<string[]> {
  const supabase = createClient();

  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('id, type, title, content, metadata')
    .eq('project_id', projectId);

  if (!artifacts) return [];

  const entityIds: string[] = [];

  for (const artifact of artifacts) {
    try {
      const entityId = await registerArtifactAsEntity(
        artifact.id,
        artifact.type,
        artifact.title,
        artifact.content || '',
        projectId,
        artifact.metadata
      );

      entityIds.push(entityId);
    } catch (error) {
      console.error(`Error registering artifact ${artifact.id}:`, error);
    }
  }

  return entityIds;
}
```

### 2. Knowledge Graph Connection Creator
#### File: `src/lib/knowledge-graph/connection-creator.ts` (NEW)
Create entity_connections linking artifacts to v1 entities.

```typescript
// src/lib/knowledge-graph/connection-creator.ts

import { createClient } from '@/lib/supabase';

export type ConnectionType =
  | 'implements'
  | 'depends_on'
  | 'relates_to'
  | 'references'
  | 'derived_from'
  | 'conflicts_with'
  | 'complements';

export interface EntityConnection {
  source_entity_id: string;
  source_entity_type: string;
  target_entity_id: string;
  target_entity_type: string;
  connection_type: ConnectionType;
  confidence?: number; // 0-1, auto-detected connections should have lower confidence
  reason?: string;
  created_at: string;
}

/**
 * Create a connection between two knowledge graph entities
 */
export async function createEntityConnection(
  sourceEntityId: string,
  targetEntityId: string,
  connectionType: ConnectionType,
  confidence: number = 1.0,
  reason?: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('entity_connections')
    .insert({
      source_entity_id: sourceEntityId,
      target_entity_id: targetEntityId,
      type: connectionType,
      confidence,
      reason,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to create connection: ${error.message}`);
  }

  console.log(`[Knowledge Graph] Connected ${sourceEntityId} → ${targetEntityId}: ${connectionType}`);
}

/**
 * Create connections between project brief and build plan
 */
export async function connectBriefToBuildPlan(
  briefEntityId: string,
  buildPlanEntityId: string
): Promise<void> {
  await createEntityConnection(
    briefEntityId,
    buildPlanEntityId,
    'derives_from',
    1.0,
    'Build plan derived from project brief'
  );
}

/**
 * Create connections between build plan and phase specs
 */
export async function connectBuildPlanToPhaseSpecs(
  buildPlanEntityId: string,
  phaseSpecEntityIds: string[]
): Promise<void> {
  for (const specId of phaseSpecEntityIds) {
    await createEntityConnection(
      buildPlanEntityId,
      specId,
      'implements',
      1.0,
      'Phase spec implements build plan'
    );
  }
}

/**
 * Create connections from Helix artifacts to v1 features/blueprints
 */
export async function connectArtifactToV1Entities(
  artifactEntityId: string,
  v1FeatureId?: string,
  v1BlueprintId?: string,
  v1WorkOrderId?: string
): Promise<void> {
  if (v1FeatureId) {
    await createEntityConnection(
      artifactEntityId,
      v1FeatureId,
      'implements',
      0.9,
      'Artifact implements v1 feature'
    );
  }

  if (v1BlueprintId) {
    await createEntityConnection(
      artifactEntityId,
      v1BlueprintId,
      'relates_to',
      0.8,
      'Artifact relates to v1 blueprint'
    );
  }

  if (v1WorkOrderId) {
    await createEntityConnection(
      artifactEntityId,
      v1WorkOrderId,
      'implements',
      0.9,
      'Artifact implements v1 work order'
    );
  }
}

/**
 * Get all connections for an entity
 */
export async function getEntityConnections(entityId: string): Promise<EntityConnection[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('entity_connections')
    .select('*')
    .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`);

  if (error) {
    console.error('Failed to get entity connections:', error);
    return [];
  }

  return data || [];
}
```

### 3. Database Migrations
#### File: `supabase/migrations/knowledge_graph_entities.sql` (NEW)
Create knowledge graph entities table.

```sql
-- supabase/migrations/knowledge_graph_entities.sql

-- Knowledge graph entities table
CREATE TABLE IF NOT EXISTS knowledge_graph_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_entity_id UUID NOT NULL,
  source_entity_type TEXT NOT NULL,
  helix_project_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_kg_entity_type ON knowledge_graph_entities(type);
CREATE INDEX idx_kg_entity_helix_project ON knowledge_graph_entities(helix_project_id);
CREATE INDEX idx_kg_entity_source ON knowledge_graph_entities(source_entity_id, source_entity_type);

-- Entity connections table (may already exist in v1)
CREATE TABLE IF NOT EXISTS entity_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id UUID NOT NULL,
  target_entity_id UUID NOT NULL,
  type TEXT NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 1.0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_entity_connections_source ON entity_connections(source_entity_id);
CREATE INDEX idx_entity_connections_target ON entity_connections(target_entity_id);
CREATE INDEX idx_entity_connections_type ON entity_connections(type);
```

### 4. Artifact Registration Trigger
#### File: `src/lib/sync/triggers/on-artifact-created.ts` (UPDATED)
Register artifact as knowledge graph entity when created.

```typescript
// src/lib/sync/triggers/on-artifact-created.ts (UPDATED)

import { registerArtifactAsEntity } from '@/lib/knowledge-graph/entity-registry';

export async function onArtifactCreated(
  artifactId: string,
  artifactType: string,
  title: string,
  content: string,
  projectId: string,
  userId: string
): Promise<string> {
  try {
    // Register as knowledge graph entity
    const entityId = await registerArtifactAsEntity(
      artifactId,
      artifactType,
      title,
      content,
      projectId,
      {
        created_by: userId,
      }
    );

    return entityId;
  } catch (error) {
    console.error('[Knowledge Graph] Failed to register artifact:', error);
    throw error;
  }
}
```

### 5. Artifact Card with Knowledge Graph Info
#### File: `src/app/components/artifact-card.tsx` (NEW)
Display artifact with linked knowledge graph entities.

```typescript
// src/app/components/artifact-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { getEntityConnections } from '@/lib/knowledge-graph/connection-creator';

interface ArtifactCardProps {
  artifactId: string;
  title: string;
  type: string;
  description?: string;
  entityId?: string;
}

export function ArtifactCard({ artifactId, title, type, description, entityId }: ArtifactCardProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!entityId);

  useEffect(() => {
    if (!entityId) return;

    async function loadConnections() {
      try {
        const conns = await getEntityConnections(entityId);
        setConnections(conns);
      } catch (error) {
        console.error('Failed to load connections:', error);
      } finally {
        setLoading(false);
      }
    }

    loadConnections();
  }, [entityId]);

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-gray-500 capitalize">{type}</p>
        </div>
        {entityId && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            In Knowledge Graph
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-700 line-clamp-2 mb-3">{description}</p>
      )}

      {loading ? (
        <p className="text-xs text-gray-500">Loading connections...</p>
      ) : connections.length > 0 ? (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Connected to {connections.length} entit{connections.length === 1 ? 'y' : 'ies'}
          </p>
          <div className="space-y-1">
            {connections.slice(0, 3).map((conn, i) => (
              <p key={i} className="text-xs text-gray-600">
                → {conn.type} to {conn.target_entity_id}
              </p>
            ))}
            {connections.length > 3 && (
              <p className="text-xs text-gray-500">+{connections.length - 3} more</p>
            )}
          </div>
        </div>
      ) : null}

      <a
        href={`/helix/artifacts/${artifactId}`}
        className="text-xs text-blue-600 hover:underline block mt-3"
      >
        View artifact →
      </a>
    </div>
  );
}
```

---

## File Structure
```
src/lib/knowledge-graph/
├── entity-registry.ts (NEW)
├── connection-creator.ts (NEW)

src/lib/sync/triggers/
├── on-artifact-created.ts (UPDATED)

src/app/components/
├── artifact-card.tsx (NEW)

supabase/migrations/
└── knowledge_graph_entities.sql (NEW)
```

---

## Dependencies
- Phase 115 sync architecture (entity types)
- v1 knowledge graph (entity_connections table)
- artifacts table with type and metadata

---

## Tech Stack for This Phase
- TypeScript for entity registration
- UUID for entity identifiers
- Supabase for knowledge graph storage
- React components for visualization

---

## Acceptance Criteria
1. registerArtifactAsEntity creates entry in knowledge_graph_entities table
2. Entity ID is UUID and returned to caller
3. Entity type is mapped from artifact type correctly
4. Metadata includes artifact_type and project context
5. registerStepOutputAsEntity registers Helix steps as entities
6. createEntityConnection creates entries in entity_connections with type and confidence
7. connectBriefToBuildPlan creates derived_from connection
8. connectBuildPlanToPhaseSpecs creates implements connections
9. getEntityConnections returns all connections for an entity
10. ArtifactCard displays "In Knowledge Graph" badge and connection count

---

## Testing Instructions
1. Create artifact and call registerArtifactAsEntity
2. Verify entry in knowledge_graph_entities table
3. Create artifact and verify onArtifactCreated auto-registers it
4. Create two entities and call createEntityConnection
5. Verify connection in entity_connections table
6. Call getEntityConnections for an entity
7. Verify returned connections match
8. Load ArtifactCard component with entityId
9. Verify badge appears and connections load
10. Test batch registration for project artifacts

---

## Notes for the AI Agent
- Each Helix artifact becomes a node in the knowledge graph
- Confidence scores help distinguish manual links (1.0) from auto-detected (0.7-0.9)
- Connections show traceability: brief → build plan → phase specs → work orders
- Knowledge graph enables impact analysis in Phase 128
- Consider adding entity types for other Helix outputs as they're created
