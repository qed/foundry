# Phase 117 — Feature Tree From Build Plan To Pattern Shop

## Objective
Parse Helix Build Plan epics and phases to automatically create hierarchical feature_nodes in Pattern Shop. Map epic names to epic-level nodes and phase titles to feature-level nodes, preserving parent-child relationships.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Sync infrastructure and mapping rules defined
- Phase 116 — Project Brief To Hall Idea — Bi-directional sync pattern established

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 117 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Helix Mode produces a detailed Build Plan organized by epics and phases. Each epic is a functional slice of the product, and each phase within an epic is a specific deliverable. Pattern Shop in v1 organizes features hierarchically: epics map to parent nodes (level: 'epic') and phases map to feature nodes (level: 'feature') under their parent epic. This phase automatically converts Helix's Build Plan into a navigable feature tree in Pattern Shop, enabling stakeholders to explore, refine, and discuss the architecture without re-entering data.

---

## Detailed Requirements

### 1. Build Plan Parser
#### File: `src/lib/build-plan/parser.ts` (NEW)
Parse Build Plan document to extract epic and phase structure.

```typescript
// src/lib/build-plan/parser.ts

/**
 * Build Plan structure extracted from document
 */
export interface BuildPlanStructure {
  epics: EpicItem[];
}

export interface EpicItem {
  epic_number: number;
  epic_name: string;
  description?: string;
  phases: PhaseItem[];
}

export interface PhaseItem {
  phase_number: number;
  phase_title: string;
  phase_description?: string;
  objective?: string;
  acceptance_criteria?: string[];
}

/**
 * Parse Build Plan artifact to extract epics and phases
 */
export async function parseBuildPlan(buildPlanContent: string): Promise<BuildPlanStructure> {
  const epics: EpicItem[] = [];

  // Split by EPIC headers
  const epicSections = buildPlanContent.split(/^#{1,2}\s+EPIC\s+(\d+)[:\s—](.+?)$/gm);

  for (let i = 1; i < epicSections.length; i += 3) {
    const epicNumber = parseInt(epicSections[i]);
    const epicName = epicSections[i + 1].trim();
    const epicContent = epicSections[i + 2] || '';

    const phases: PhaseItem[] = [];

    // Extract phases within epic
    const phaseMatches = epicContent.matchAll(
      /^#{3}\s+Phase\s+(\d+)[:\s—](.+?)$/gm
    );

    for (const match of phaseMatches) {
      phases.push({
        phase_number: parseInt(match[1]),
        phase_title: match[2].trim(),
      });
    }

    epics.push({
      epic_number: epicNumber,
      epic_name: epicName,
      phases,
    });
  }

  return { epics };
}

/**
 * Extract objective from Phase spec file
 */
export function extractObjectiveFromPhaseSpec(
  phaseContent: string
): string | undefined {
  const match = phaseContent.match(/##\s+Objective\s*\n(.+?)(?:\n##|$)/s);
  return match?.[1]?.trim();
}

/**
 * Extract acceptance criteria from Phase spec
 */
export function extractAcceptanceCriteriaFromPhaseSpec(
  phaseContent: string
): string[] {
  const match = phaseContent.match(/##\s+Acceptance Criteria\s*\n([\s\S]+?)(?:\n##|$)/);
  if (!match) return [];

  return match[1]
    .split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
    .map(line => line.replace(/^[-*]\s+|\d+\.\s+/, '').trim())
    .filter(Boolean);
}
```

### 2. Feature Node Creator
#### File: `src/lib/sync/features/create-feature-tree.ts` (NEW)
Create feature_nodes in Pattern Shop from parsed Build Plan.

```typescript
// src/lib/sync/features/create-feature-tree.ts

import { createClient } from '@/lib/supabase';
import type { BuildPlanStructure } from '../build-plan/parser';

export interface FeatureNodeInput {
  name: string;
  description?: string;
  level: 'epic' | 'feature';
  parent_id?: string;
  metadata: {
    epic_number?: number;
    phase_number?: number;
    build_plan_source: boolean;
    acceptance_criteria?: string[];
  };
}

/**
 * Create feature tree from Build Plan structure
 */
export async function createFeatureTreeFromBuildPlan(
  buildPlan: BuildPlanStructure,
  projectId: string,
  userId: string
): Promise<{ epicNodes: any[]; featureNodes: any[] }> {
  const supabase = createClient();
  const epicNodes: any[] = [];
  const featureNodes: any[] = [];

  try {
    // Step 1: Create epic-level nodes
    for (const epic of buildPlan.epics) {
      const epicNode: FeatureNodeInput = {
        name: `Epic ${epic.epic_number}: ${epic.epic_name}`,
        description: epic.description,
        level: 'epic',
        metadata: {
          epic_number: epic.epic_number,
          build_plan_source: true,
        },
      };

      const { data: createdEpicNode, error: epicError } = await supabase
        .from('feature_nodes')
        .insert({
          ...epicNode,
          project_id: projectId,
          created_by: userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (epicError) {
        console.error(`Error creating epic node for Epic ${epic.epic_number}:`, epicError);
        continue;
      }

      epicNodes.push(createdEpicNode);

      // Step 2: Create feature-level nodes under this epic
      for (const phase of epic.phases) {
        const featureNode: FeatureNodeInput = {
          name: `Phase ${phase.phase_number}: ${phase.phase_title}`,
          description: phase.objective || phase.phase_description,
          level: 'feature',
          parent_id: createdEpicNode.id,
          metadata: {
            epic_number: epic.epic_number,
            phase_number: phase.phase_number,
            build_plan_source: true,
            acceptance_criteria: phase.acceptance_criteria,
          },
        };

        const { data: createdFeatureNode, error: featureError } = await supabase
          .from('feature_nodes')
          .insert({
            ...featureNode,
            project_id: projectId,
            created_by: userId,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (featureError) {
          console.error(
            `Error creating feature node for Phase ${phase.phase_number}:`,
            featureError
          );
          continue;
        }

        featureNodes.push(createdFeatureNode);
      }
    }

    console.log(
      `[Sync] Created ${epicNodes.length} epic nodes and ${featureNodes.length} feature nodes from Build Plan`
    );

    return { epicNodes, featureNodes };
  } catch (error) {
    console.error('[Sync Error] Failed to create feature tree:', error);
    throw error;
  }
}

/**
 * Update existing feature tree with new Build Plan data
 */
export async function updateFeatureTreeFromBuildPlan(
  buildPlan: BuildPlanStructure,
  projectId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  try {
    // Get existing feature nodes
    const { data: existingNodes } = await supabase
      .from('feature_nodes')
      .select('*')
      .eq('project_id', projectId)
      .eq('metadata->build_plan_source', true);

    // Find new phases not yet in feature nodes
    const existingPhaseNumbers = existingNodes
      ?.filter(n => n.metadata?.phase_number)
      .map(n => n.metadata.phase_number) || [];

    for (const epic of buildPlan.epics) {
      for (const phase of epic.phases) {
        if (!existingPhaseNumbers.includes(phase.phase_number)) {
          // Create new feature node
          const epicNode = existingNodes?.find(
            n => n.metadata?.epic_number === epic.epic_number && n.level === 'epic'
          );

          if (epicNode) {
            await supabase
              .from('feature_nodes')
              .insert({
                name: `Phase ${phase.phase_number}: ${phase.phase_title}`,
                description: phase.objective,
                level: 'feature',
                parent_id: epicNode.id,
                project_id: projectId,
                created_by: userId,
                metadata: {
                  epic_number: epic.epic_number,
                  phase_number: phase.phase_number,
                  build_plan_source: true,
                },
                created_at: new Date().toISOString(),
              });
          }
        }
      }
    }
  } catch (error) {
    console.error('[Sync Error] Failed to update feature tree:', error);
    throw error;
  }
}
```

### 3. Feature Node Extension in Database
#### File: `src/lib/models/feature-node.ts` (UPDATED)
Update feature_node type to include Build Plan metadata.

```typescript
// src/lib/models/feature-node.ts (UPDATED)

export interface FeatureNode {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  level: 'epic' | 'feature';
  parent_id?: string;
  status?: 'draft' | 'active' | 'archived';

  // Build Plan integration
  metadata?: {
    epic_number?: number;
    phase_number?: number;
    build_plan_source?: boolean;
    acceptance_criteria?: string[];
    [key: string]: any;
  };

  // Standard fields
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all feature nodes for epic
 */
export async function getFeatureNodesByEpic(
  projectId: string,
  epicNumber: number
): Promise<FeatureNode[]> {
  const supabase = createClient();

  const { data: epicNode } = await supabase
    .from('feature_nodes')
    .select('id')
    .eq('project_id', projectId)
    .eq('metadata->epic_number', epicNumber)
    .eq('level', 'epic')
    .single();

  if (!epicNode) return [];

  const { data: featureNodes } = await supabase
    .from('feature_nodes')
    .select('*')
    .eq('parent_id', epicNode.id)
    .eq('level', 'feature');

  return featureNodes || [];
}

/**
 * Get feature tree (epics with nested features)
 */
export async function getFeatureTree(projectId: string): Promise<FeatureNode[]> {
  const supabase = createClient();

  const { data: epics } = await supabase
    .from('feature_nodes')
    .select('*, feature_nodes(*)') // Get nested features
    .eq('project_id', projectId)
    .eq('level', 'epic')
    .order('created_at', { ascending: true });

  return epics || [];
}
```

### 4. Sync Trigger for Build Plan Upload
#### File: `src/lib/sync/triggers/on-build-plan-created.ts` (NEW)
Trigger when Build Plan artifact is created, parse and sync to Pattern Shop.

```typescript
// src/lib/sync/triggers/on-build-plan-created.ts

import { createClient } from '@/lib/supabase';
import { parseBuildPlan } from '../build-plan/parser';
import { createFeatureTreeFromBuildPlan } from './features/create-feature-tree';

export async function onBuildPlanCreated(
  artifactId: string,
  projectId: string,
  userId: string,
  buildPlanContent: string
) {
  const supabase = createClient();

  try {
    // Parse Build Plan
    const buildPlanStructure = parseBuildPlan(buildPlanContent);

    // Create feature tree
    const { epicNodes, featureNodes } = await createFeatureTreeFromBuildPlan(
      buildPlanStructure,
      projectId,
      userId
    );

    // Link Build Plan artifact to created feature nodes
    await supabase
      .from('artifacts')
      .update({
        metadata: {
          created_feature_nodes: {
            epic_count: epicNodes.length,
            feature_count: featureNodes.length,
          },
        },
      })
      .eq('id', artifactId);

    console.log(
      `[Sync] Build Plan → Pattern Shop: ${epicNodes.length} epics, ${featureNodes.length} features`
    );

    return { epicNodes, featureNodes };
  } catch (error) {
    console.error('[Sync Error] Build Plan → Pattern Shop failed:', error);
    throw error;
  }
}
```

### 5. Feature Tree View Component
#### File: `src/app/open/pattern-shop/[projectId]/build-plan-tree.tsx` (NEW)
Display feature tree organized by Build Plan epics.

```typescript
// src/app/open/pattern-shop/[projectId]/build-plan-tree.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { FeatureNode } from '@/lib/models/feature-node';

interface BuildPlanTreeProps {
  projectId: string;
}

export function BuildPlanTree({ projectId }: BuildPlanTreeProps) {
  const [epics, setEpics] = useState<FeatureNode[]>([]);
  const [features, setFeatures] = useState<Map<string, FeatureNode[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadFeatureTree() {
      const supabase = createClient();

      // Get epics
      const { data: epicData } = await supabase
        .from('feature_nodes')
        .select('*')
        .eq('project_id', projectId)
        .eq('level', 'epic')
        .order('metadata->epic_number', { ascending: true });

      setEpics(epicData || []);

      // Get features grouped by parent epic
      if (epicData) {
        const featuresByEpic = new Map<string, FeatureNode[]>();
        for (const epic of epicData) {
          const { data: epicFeatures } = await supabase
            .from('feature_nodes')
            .select('*')
            .eq('parent_id', epic.id)
            .eq('level', 'feature')
            .order('metadata->phase_number', { ascending: true });

          featuresByEpic.set(epic.id, epicFeatures || []);
        }
        setFeatures(featuresByEpic);
      }

      setLoading(false);
    }

    loadFeatureTree();
  }, [projectId]);

  const toggleEpic = (epicId: string) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId);
    } else {
      newExpanded.add(epicId);
    }
    setExpandedEpics(newExpanded);
  };

  if (loading) return <div className="p-4">Loading feature tree...</div>;

  return (
    <div className="space-y-2">
      {epics.map(epic => (
        <div key={epic.id} className="border rounded-lg">
          <button
            onClick={() => toggleEpic(epic.id)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 text-left"
          >
            <span className="font-semibold text-sm">{epic.name}</span>
            <span className="text-xs text-gray-500">
              {features.get(epic.id)?.length || 0} phases
            </span>
            <span className={`transform transition ${expandedEpics.has(epic.id) ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {expandedEpics.has(epic.id) && (
            <div className="border-t bg-gray-50 p-4 space-y-2">
              {features.get(epic.id)?.map(feature => (
                <div key={feature.id} className="p-3 bg-white border rounded text-sm">
                  <h4 className="font-medium">{feature.name}</h4>
                  {feature.description && (
                    <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                  )}
                  {feature.metadata?.acceptance_criteria && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-blue-600">
                        Acceptance criteria
                      </summary>
                      <ul className="mt-1 ml-4 list-disc space-y-1">
                        {feature.metadata.acceptance_criteria.map((criterion, i) => (
                          <li key={i} className="text-gray-700">
                            {criterion}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## File Structure
```
src/lib/build-plan/
├── parser.ts (NEW)

src/lib/sync/features/
├── create-feature-tree.ts (NEW)

src/lib/sync/triggers/
├── on-build-plan-created.ts (NEW)

src/lib/models/
├── feature-node.ts (UPDATED)

src/app/open/pattern-shop/[projectId]/
├── build-plan-tree.tsx (NEW)
```

---

## Dependencies
- Phase 115 sync infrastructure
- feature_nodes table with parent_id and level columns
- artifacts table with Build Plan artifact type
- Build Plan document structure and naming conventions

---

## Tech Stack for This Phase
- TypeScript regex for parsing
- Supabase for CRUD operations
- React components for tree visualization
- Hierarchical data modeling

---

## Acceptance Criteria
1. parseBuildPlan function correctly extracts epics and phases from Build Plan markdown
2. EpicItem and PhaseItem types capture all relevant data (number, title, description)
3. createFeatureTreeFromBuildPlan creates epic nodes with level='epic'
4. Feature nodes are created with parent_id pointing to parent epic
5. Feature nodes have metadata containing phase_number and acceptance criteria
6. onBuildPlanCreated trigger fires when Build Plan artifact is created
7. Trigger parses content and creates feature tree in database
8. Build Plan artifact is linked to created feature nodes
9. BuildPlanTree component displays all epics collapsed by default
10. BuildPlanTree component shows phase count and expands/collapses features on click

---

## Testing Instructions
1. Create a Helix project and complete Step 3 (Generate Build Plan)
2. Verify Build Plan artifact is created with properly formatted markdown
3. Call parseBuildPlan on sample Build Plan content
4. Verify extracted epics and phases are correct
5. Call onBuildPlanCreated trigger
6. Check Pattern Shop feature_nodes table for created epic nodes
7. Verify feature nodes exist with parent_id pointing to correct epic
8. Confirm metadata includes phase_number and acceptance_criteria
9. Load BuildPlanTree component in Pattern Shop
10. Test expand/collapse functionality for each epic

---

## Notes for the AI Agent
- Focus on parsing; the markdown structure must be consistent
- Keep feature node names derived directly from Build Plan (phase title)
- Don't create duplicate nodes if Build Plan is re-synced; check existing nodes first
- Acceptance criteria in Build Plan should be preserved in feature node metadata
- This is a one-way sync: Build Plan → Pattern Shop (features, not feedback)
