# Phase 115 — Sync Architecture And Strategy

## Objective
Design and document the bi-directional sync architecture between Helix Mode outputs and Open Mode (v1) module tables. Define mapping rules for which Helix artifacts sync to which v1 tables, establish SyncEvent and SyncResult types, and implement conflict handling strategy.

## Prerequisites
- Phase 114 — AI Deployment and Rollout — All Helix MVP features stable and ready for integration

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 115 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Helix Mode operates as a powerful workflow for generating projects, documentation, and deployment configurations. However, these outputs must flow seamlessly into Open Mode's v1 modules (Hall for ideas, Pattern Shop for features, Assembly Floor for work orders, Control Room for blueprints, Insights Lab for feedback). This phase establishes the architectural foundation: sync service design, type definitions, mapping rules, and conflict resolution strategy. A well-designed sync system prevents data silos and keeps the entire Foundry ecosystem in sync.

---

## Detailed Requirements

### 1. Sync Architecture Design Document
#### File: `src/lib/sync/SYNC_ARCHITECTURE.md` (NEW)
Create a comprehensive design document detailing the bi-directional sync system. Include: overall architecture diagram (text-based ASCII or reference to external diagram), sync flow (Helix → v1 and v1 → Helix), event-driven triggers, database transaction patterns, eventual consistency model, and error recovery.

```markdown
# Helix Mode ↔ v1 Modules Sync Architecture

## Overview
Bi-directional sync keeps Helix Mode artifacts synchronized with v1 module entities in real-time or near-real-time. The system uses an event-driven architecture with Supabase as the event broker.

## Sync Flows

### Helix → v1 (Push Sync)
1. Helix process completes a step
2. helix_steps.status updates
3. Trigger function: on_helix_step_complete() → creates SyncEvent
4. SyncService listener: processes SyncEvent → writes to v1 tables
5. helix_sync_log records outcome

### v1 → Helix (Pull Sync)
1. User edits v1 entity (work_order, feature_node, etc.)
2. Trigger or webhook: on_v1_entity_update() → creates SyncEvent
3. SyncService listener: processes SyncEvent → updates helix_steps
4. helix_sync_log records outcome

## Event-Driven Triggers
- helix_steps.status changes
- helix_steps.evidence_data updates
- work_orders.status changes
- feature_nodes CRUD operations
- feedback_submissions.created

## Conflict Resolution
When the same data is modified in both modes:
1. Detect via timestamp comparison and hash of previous state
2. Flag as SyncConflict
3. Create UI prompt for user to resolve (show both versions)
4. User selects winner or manually merges
5. Log resolution decision

## Database Consistency
- Use Supabase Row-Level Security (RLS) to prevent invalid sync states
- Idempotency: sync operations safe to retry
- All writes through helix_sync_log for auditability
```

### 2. Sync Event Types
#### File: `src/lib/sync/types.ts` (NEW)
Define TypeScript types for SyncEvent, SyncResult, SyncConflict, and related enums.

```typescript
// src/lib/sync/types.ts

/**
 * Direction of sync flow
 */
export type SyncDirection = 'helix-to-v1' | 'v1-to-helix';

/**
 * Entity types that participate in sync
 */
export type SyncEntityType =
  | 'helix_project'
  | 'helix_step'
  | 'helix_artifact'
  | 'idea'
  | 'feature_node'
  | 'feature_blueprint'
  | 'work_order'
  | 'feedback_submission'
  | 'knowledge_graph_entity'
  | 'entity_connection';

/**
 * Sync action types
 */
export type SyncAction = 'create' | 'update' | 'link' | 'unlink' | 'delete';

/**
 * Sync status
 */
export type SyncStatus = 'pending' | 'in-progress' | 'synced' | 'conflict' | 'failed' | 'rollback';

/**
 * SyncEvent: Trigger event for sync operation
 */
export interface SyncEvent {
  id: string;
  event_id: string; // Unique event identifier for idempotency
  source_mode: 'helix' | 'v1';
  direction: SyncDirection;
  entity_type: SyncEntityType;
  entity_id: string;
  parent_entity_id?: string; // For nested entities
  action: SyncAction;
  trigger_user_id: string;
  timestamp: string; // ISO 8601
  payload: Record<string, any>; // The data being synced
  metadata?: {
    helix_project_id?: string;
    helix_stage_id?: string;
    helix_step_id?: string;
    build_plan_phase?: number;
    [key: string]: any;
  };
}

/**
 * SyncResult: Outcome of sync operation
 */
export interface SyncResult {
  sync_id: string;
  sync_event_id: string;
  status: SyncStatus;
  source_entity_type: SyncEntityType;
  source_entity_id: string;
  target_entity_type: SyncEntityType;
  target_entity_id?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  conflict?: SyncConflict;
  rollback_data?: Record<string, any>;
  duration_ms: number;
}

/**
 * SyncConflict: Represents conflicting changes in both modes
 */
export interface SyncConflict {
  conflict_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  helix_version: {
    data: Record<string, any>;
    timestamp: string;
    user_id: string;
  };
  v1_version: {
    data: Record<string, any>;
    timestamp: string;
    user_id: string;
  };
  detected_at: string;
  resolved_at?: string;
  resolution?: {
    winner: 'helix' | 'v1' | 'merged';
    merged_data?: Record<string, any>;
    resolved_by_user_id: string;
  };
}

/**
 * Entity Mapping: How Helix artifacts map to v1 tables
 */
export interface EntityMapping {
  helix_entity_type: SyncEntityType;
  v1_entity_type: SyncEntityType;
  helix_table: string;
  v1_table: string;
  field_mappings: Record<string, string>; // helix_field → v1_field
  bidirectional: boolean;
  sync_on_change: boolean;
  conflict_resolution: 'helix-wins' | 'v1-wins' | 'prompt-user' | 'merge';
}

/**
 * Sync Configuration per entity type
 */
export interface SyncConfig {
  entity_type: SyncEntityType;
  enabled: boolean;
  direction: SyncDirection;
  batch_size: number;
  retry_attempts: number;
  retry_delay_ms: number;
  timeout_ms: number;
  conflict_resolution_strategy: 'helix-wins' | 'v1-wins' | 'prompt-user' | 'merge';
}
```

### 3. Entity Mapping Rules
#### File: `src/lib/sync/mapping-rules.ts` (NEW)
Define mapping rules for each Helix artifact → v1 table mapping.

```typescript
// src/lib/sync/mapping-rules.ts

import { EntityMapping, SyncEntityType } from './types';

/**
 * Comprehensive mapping rules: Helix artifacts → v1 tables
 */
export const ENTITY_MAPPINGS: Record<string, EntityMapping> = {
  'project-brief-to-idea': {
    helix_entity_type: 'helix_artifact' as SyncEntityType,
    v1_entity_type: 'idea' as SyncEntityType,
    helix_table: 'artifacts',
    v1_table: 'ideas',
    field_mappings: {
      'title': 'title',
      'content': 'body',
      'metadata.project_id': 'helix_project_id',
    },
    bidirectional: true,
    sync_on_change: true,
    conflict_resolution: 'prompt-user',
  },
  'epic-to-feature-node': {
    helix_entity_type: 'helix_artifact' as SyncEntityType,
    v1_entity_type: 'feature_node' as SyncEntityType,
    helix_table: 'artifacts',
    v1_table: 'feature_nodes',
    field_mappings: {
      'title': 'name',
      'content': 'description',
      'metadata.epic_number': 'epic_number',
    },
    bidirectional: false,
    sync_on_change: true,
    conflict_resolution: 'helix-wins',
  },
  'phase-spec-to-work-order': {
    helix_entity_type: 'helix_artifact' as SyncEntityType,
    v1_entity_type: 'work_order' as SyncEntityType,
    helix_table: 'artifacts',
    v1_table: 'work_orders',
    field_mappings: {
      'title': 'title',
      'content': 'description',
      'metadata.acceptance_criteria': 'acceptance_criteria',
      'metadata.phase_number': 'phase_number',
    },
    bidirectional: true,
    sync_on_change: true,
    conflict_resolution: 'prompt-user',
  },
  'blueprint-spec-to-feature-blueprint': {
    helix_entity_type: 'helix_artifact' as SyncEntityType,
    v1_entity_type: 'feature_blueprint' as SyncEntityType,
    helix_table: 'artifacts',
    v1_table: 'feature_blueprints',
    field_mappings: {
      'title': 'title',
      'content': 'specification',
    },
    bidirectional: false,
    sync_on_change: true,
    conflict_resolution: 'helix-wins',
  },
  'step-output-to-feedback': {
    helix_entity_type: 'helix_step' as SyncEntityType,
    v1_entity_type: 'feedback_submission' as SyncEntityType,
    helix_table: 'helix_steps',
    v1_table: 'feedback_submissions',
    field_mappings: {
      'evidence_data.key_findings': 'content',
      'step_name': 'source',
    },
    bidirectional: false,
    sync_on_change: true,
    conflict_resolution: 'helix-wins',
  },
};

/**
 * Get mapping for helix → v1 sync
 */
export function getMappingForHelix(helixEntityType: SyncEntityType): EntityMapping | undefined {
  return Object.values(ENTITY_MAPPINGS).find(
    m => m.helix_entity_type === helixEntityType && m.direction !== 'v1-to-helix'
  );
}

/**
 * Get mapping for v1 → helix sync
 */
export function getMappingForV1(v1EntityType: SyncEntityType): EntityMapping | undefined {
  return Object.values(ENTITY_MAPPINGS).find(
    m => m.v1_entity_type === v1EntityType && m.bidirectional
  );
}

/**
 * Get field mapping from Helix to v1
 */
export function mapField(mappingKey: string, helixField: string): string | undefined {
  const mapping = ENTITY_MAPPINGS[mappingKey];
  return mapping?.field_mappings[helixField];
}
```

### 4. Sync Service Foundation
#### File: `src/lib/sync/sync-service.ts` (NEW)
Core sync service with event listeners and processing logic.

```typescript
// src/lib/sync/sync-service.ts

import { createClient } from '@/lib/supabase';
import { SyncEvent, SyncResult, SyncStatus, SyncConflict } from './types';
import { ENTITY_MAPPINGS } from './mapping-rules';

/**
 * SyncService: Core sync engine
 */
export class SyncService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Process incoming sync event
   */
  async processSyncEvent(event: SyncEvent): Promise<SyncResult> {
    const syncId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Check for idempotency
      const existing = await this.supabase
        .from('helix_sync_log')
        .select('id')
        .eq('event_id', event.event_id)
        .single();

      if (existing.data) {
        return {
          sync_id: existing.data.id,
          sync_event_id: event.id,
          status: 'synced' as SyncStatus,
          source_entity_type: event.entity_type,
          source_entity_id: event.entity_id,
          target_entity_type: event.entity_type,
          duration_ms: 0,
        };
      }

      // Route to appropriate sync handler
      let result: SyncResult;
      if (event.direction === 'helix-to-v1') {
        result = await this.syncHelixToV1(event);
      } else {
        result = await this.syncV1ToHelix(event);
      }

      result.sync_id = syncId;
      result.duration_ms = Date.now() - startTime;

      // Log sync operation
      await this.logSyncOperation(result);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        sync_id: syncId,
        sync_event_id: event.id,
        status: 'failed' as SyncStatus,
        source_entity_type: event.entity_type,
        source_entity_id: event.entity_id,
        target_entity_type: event.entity_type,
        error_message: errorMsg,
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Sync from Helix to v1
   */
  private async syncHelixToV1(event: SyncEvent): Promise<SyncResult> {
    const mapping = Object.values(ENTITY_MAPPINGS).find(
      m => m.helix_entity_type === event.entity_type
    );

    if (!mapping) {
      throw new Error(`No mapping found for Helix entity type: ${event.entity_type}`);
    }

    // Transform data using field mappings
    const transformedData = this.transformData(event.payload, mapping.field_mappings);

    // Check for conflicts
    const conflict = await this.detectConflict(mapping.v1_table, event.entity_id);

    if (conflict) {
      return {
        sync_id: '',
        sync_event_id: event.id,
        status: 'conflict' as SyncStatus,
        source_entity_type: event.entity_type,
        source_entity_id: event.entity_id,
        target_entity_type: mapping.v1_entity_type,
        conflict,
        duration_ms: 0,
      };
    }

    // Write to v1 table
    const { data, error } = await this.supabase
      .from(mapping.v1_table)
      .upsert(transformedData, { onConflict: 'id' });

    if (error) throw error;

    return {
      sync_id: '',
      sync_event_id: event.id,
      status: 'synced' as SyncStatus,
      source_entity_type: event.entity_type,
      source_entity_id: event.entity_id,
      target_entity_type: mapping.v1_entity_type,
      target_entity_id: data?.[0]?.id,
      duration_ms: 0,
    };
  }

  /**
   * Sync from v1 to Helix
   */
  private async syncV1ToHelix(event: SyncEvent): Promise<SyncResult> {
    // Only sync if bidirectional
    const mapping = Object.values(ENTITY_MAPPINGS).find(
      m => m.v1_entity_type === event.entity_type && m.bidirectional
    );

    if (!mapping) {
      throw new Error(`No bidirectional mapping found for v1 entity type: ${event.entity_type}`);
    }

    // Reverse transform: v1 field mappings
    const reverseMapping: Record<string, string> = {};
    Object.entries(mapping.field_mappings).forEach(([helix, v1]) => {
      reverseMapping[v1] = helix;
    });

    const transformedData = this.transformData(event.payload, reverseMapping);

    // Update helix_steps evidence_data
    const { error } = await this.supabase
      .from('helix_steps')
      .update({ evidence_data: transformedData })
      .eq('id', event.entity_id);

    if (error) throw error;

    return {
      sync_id: '',
      sync_event_id: event.id,
      status: 'synced' as SyncStatus,
      source_entity_type: event.entity_type,
      source_entity_id: event.entity_id,
      target_entity_type: 'helix_step' as any,
      target_entity_id: event.entity_id,
      duration_ms: 0,
    };
  }

  /**
   * Transform data using field mappings
   */
  private transformData(source: Record<string, any>, mappings: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(mappings).forEach(([sourceField, targetField]) => {
      const value = source[sourceField];
      if (value !== undefined) {
        result[targetField] = value;
      }
    });
    return result;
  }

  /**
   * Detect conflicts when same entity modified in both modes
   */
  private async detectConflict(table: string, entityId: string): Promise<SyncConflict | null> {
    // Check helix_sync_log for recent conflicting changes
    const { data } = await this.supabase
      .from('helix_sync_log')
      .select('*')
      .eq('target_entity_id', entityId)
      .eq('status', 'conflict')
      .order('created_at', { ascending: false })
      .limit(1);

    return data?.[0] || null;
  }

  /**
   * Log sync operation to audit trail
   */
  private async logSyncOperation(result: SyncResult): Promise<void> {
    await this.supabase.from('helix_sync_log').insert({
      sync_id: result.sync_id,
      sync_event_id: result.sync_event_id,
      status: result.status,
      source_entity_type: result.source_entity_type,
      source_entity_id: result.source_entity_id,
      target_entity_type: result.target_entity_type,
      target_entity_id: result.target_entity_id,
      error_message: result.error_message,
      duration_ms: result.duration_ms,
      created_at: new Date().toISOString(),
    });
  }
}

/**
 * Singleton instance
 */
let syncServiceInstance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}
```

---

## File Structure
```
src/lib/sync/
├── SYNC_ARCHITECTURE.md (NEW)
├── types.ts (NEW)
├── mapping-rules.ts (NEW)
└── sync-service.ts (NEW)
```

---

## Dependencies
- Supabase client and RLS policies
- helix_sync_log table (created in Phase 124)
- helix_steps table (existing)
- v1 module tables: ideas, feature_nodes, work_orders, feature_blueprints, feedback_submissions

---

## Tech Stack for This Phase
- TypeScript for type safety
- Supabase for event triggers and data access
- Row-Level Security (RLS) for data integrity
- Event-driven architecture pattern

---

## Acceptance Criteria
1. SYNC_ARCHITECTURE.md is comprehensive and covers all sync flows, triggers, and conflict resolution
2. SyncEvent, SyncResult, SyncConflict types are fully defined and exported
3. EntityMapping type supports field-level mapping between Helix and v1 tables
4. ENTITY_MAPPINGS object covers all major sync paths (project brief → idea, epic → feature, phase → work order, etc.)
5. SyncService class implements processSyncEvent with idempotency checking
6. syncHelixToV1 method transforms data using field mappings and handles conflicts
7. syncV1ToHelix method only processes bidirectional mappings
8. transformData utility correctly maps source fields to target fields
9. detectConflict method checks helix_sync_log for recent conflicting changes
10. logSyncOperation persists sync results to audit trail with all required fields

---

## Testing Instructions
1. Create a test SyncEvent for 'helix-artifact' → 'idea' direction
2. Call processSyncEvent and verify SyncResult status is 'synced'
3. Confirm idempotency: call processSyncEvent twice with same event_id, second should return synced status
4. Create a conflicting edit scenario and verify SyncConflict is detected
5. Test field mapping by checking transformed data matches expected v1 schema
6. Verify ENTITY_MAPPINGS covers all major Helix → v1 paths
7. Create a v1 → Helix sync event and confirm only bidirectional mappings are processed
8. Test error handling with invalid entity type
9. Verify helix_sync_log entries are created for each sync operation
10. Check that duration_ms is calculated and recorded in log

---

## Notes for the AI Agent
- This phase establishes the foundational architecture; it's not a full implementation
- Focus on types and mapping rules that will be used by subsequent phases
- The SyncService is skeletal; full retry logic, batching, and conflict UI come in later phases
- Document WHY sync events flow in certain directions (what's the business rationale?)
- Ensure eventual consistency model is clear in SYNC_ARCHITECTURE.md
- Consider performance: batch sync operations and use database triggers, not polling
