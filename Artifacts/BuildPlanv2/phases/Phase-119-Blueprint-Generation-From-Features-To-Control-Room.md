# Phase 119 — Blueprint Generation From Features To Control Room

## Objective
Auto-generate blueprint stubs in Control Room from Pattern Shop feature_nodes. Map each feature node to a feature blueprint, populate blueprint content from phase spec detailed requirements, and set initial status to 'draft'.

## Prerequisites
- Phase 115 — Sync Architecture And Strategy — Sync service established
- Phase 117 — Feature Tree From Build Plan To Pattern Shop — Feature nodes created

## Epic Context
**Epic:** 14 — Deep v1 Module Data Sync
**Phase:** 119 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
After features are created in Pattern Shop, the Control Room needs blueprints—detailed technical specifications for each feature. Rather than manually creating empty blueprints, we auto-generate them from the feature nodes, pre-populating them with content from phase specs. This creates a bridge from high-level features to technical specifications, and gives architects a starting point for design work.

---

## Detailed Requirements

### 1. Blueprint Stub Generator
#### File: `src/lib/sync/blueprints/generate-blueprints.ts` (NEW)
Create blueprint stubs from feature nodes and phase spec data.

```typescript
// src/lib/sync/blueprints/generate-blueprints.ts

import { createClient } from '@/lib/supabase';
import type { FeatureNode } from '@/lib/models/feature-node';
import type { PhaseSpecData } from '../phase-spec/parser';

export interface BlueprintInput {
  title: string;
  feature_id: string;
  specification: string;
  status: 'draft' | 'in-progress' | 'review' | 'finalized';
  metadata: {
    phase_number?: number;
    epic_number?: number;
    feature_node_id: string;
    generated_from_phase_spec?: boolean;
    acceptance_criteria?: string[];
    [key: string]: any;
  };
}

/**
 * Generate blueprint from feature node and optional phase spec
 */
export async function generateBlueprintFromFeature(
  feature: FeatureNode,
  projectId: string,
  userId: string,
  phaseSpec?: PhaseSpecData
): Promise<string> {
  const supabase = createClient();

  // Build specification from feature description and phase spec
  let specification = feature.description || '';

  if (phaseSpec?.detailed_requirements) {
    specification += `\n\n## Detailed Requirements\n${phaseSpec.detailed_requirements}`;
  }

  if (phaseSpec?.file_structure) {
    specification += `\n\n## File Structure\n${phaseSpec.file_structure}`;
  }

  const blueprintInput: BlueprintInput = {
    title: `Blueprint: ${feature.name}`,
    feature_id: feature.id,
    specification,
    status: 'draft',
    metadata: {
      phase_number: feature.metadata?.phase_number,
      epic_number: feature.metadata?.epic_number,
      feature_node_id: feature.id,
      generated_from_phase_spec: !!phaseSpec,
      acceptance_criteria: phaseSpec?.acceptance_criteria || feature.metadata?.acceptance_criteria,
    },
  };

  const { data, error } = await supabase
    .from('feature_blueprints')
    .insert({
      ...blueprintInput,
      project_id: projectId,
      created_by: userId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to generate blueprint for feature ${feature.id}: ${error.message}`);
  }

  // Link feature node to blueprint
  await supabase
    .from('feature_nodes')
    .update({
      metadata: {
        ...feature.metadata,
        linked_blueprint_id: data.id,
      },
    })
    .eq('id', feature.id);

  return data.id;
}

/**
 * Generate blueprints for all features in project
 */
export async function generateBlueprintsForProject(
  projectId: string,
  userId: string
): Promise<{ epicBlueprintCounts: Record<number, number>; totalCount: number }> {
  const supabase = createClient();

  const epicBlueprintCounts: Record<number, number> = {};
  let totalCount = 0;

  try {
    // Get all feature nodes
    const { data: features } = await supabase
      .from('feature_nodes')
      .select('*')
      .eq('project_id', projectId)
      .eq('level', 'feature');

    if (!features) return { epicBlueprintCounts, totalCount: 0 };

    for (const feature of features) {
      // Check if blueprint already exists
      const { data: existingBlueprint } = await supabase
        .from('feature_blueprints')
        .select('id')
        .eq('feature_id', feature.id)
        .single();

      if (existingBlueprint) {
        continue; // Blueprint already exists
      }

      try {
        const blueprintId = await generateBlueprintFromFeature(feature, projectId, userId);

        const epicNum = feature.metadata?.epic_number || 0;
        epicBlueprintCounts[epicNum] = (epicBlueprintCounts[epicNum] || 0) + 1;
        totalCount++;

        console.log(
          `[Sync] Feature ${feature.id} → Blueprint ${blueprintId}`
        );
      } catch (error) {
        console.error(`Error generating blueprint for feature ${feature.id}:`, error);
      }
    }

    return { epicBlueprintCounts, totalCount };
  } catch (error) {
    console.error('[Sync Error] Failed to generate blueprints:', error);
    throw error;
  }
}

/**
 * Generate blueprint with full phase spec content
 */
export async function generateBlueprintWithPhaseSpec(
  feature: FeatureNode,
  phaseSpec: PhaseSpecData,
  projectId: string,
  userId: string
): Promise<string> {
  const supabase = createClient();

  // Build comprehensive specification
  let specification = `# ${feature.name}\n\n`;

  if (feature.description) {
    specification += `## Overview\n${feature.description}\n\n`;
  }

  specification += `## Objective\n${phaseSpec.objective}\n\n`;

  if (phaseSpec.detailed_requirements) {
    specification += `## Detailed Requirements\n${phaseSpec.detailed_requirements}\n\n`;
  }

  if (phaseSpec.acceptance_criteria?.length > 0) {
    specification += `## Acceptance Criteria\n`;
    phaseSpec.acceptance_criteria.forEach((criterion, i) => {
      specification += `${i + 1}. ${criterion}\n`;
    });
    specification += '\n';
  }

  if (phaseSpec.file_structure) {
    specification += `## File Structure\n${phaseSpec.file_structure}\n\n`;
  }

  if (phaseSpec.dependencies?.length > 0) {
    specification += `## Dependencies\n`;
    phaseSpec.dependencies.forEach(dep => {
      specification += `- ${dep}\n`;
    });
    specification += '\n';
  }

  if (phaseSpec.tech_stack?.length > 0) {
    specification += `## Tech Stack\n`;
    phaseSpec.tech_stack.forEach(tech => {
      specification += `- ${tech}\n`;
    });
  }

  const blueprintInput: BlueprintInput = {
    title: `Blueprint: ${feature.name}`,
    feature_id: feature.id,
    specification,
    status: 'draft',
    metadata: {
      phase_number: phaseSpec.phase_number,
      epic_number: feature.metadata?.epic_number,
      feature_node_id: feature.id,
      generated_from_phase_spec: true,
      acceptance_criteria: phaseSpec.acceptance_criteria,
    },
  };

  const { data, error } = await supabase
    .from('feature_blueprints')
    .insert({
      ...blueprintInput,
      project_id: projectId,
      created_by: userId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to generate blueprint: ${error.message}`);
  }

  return data.id;
}
```

### 2. Feature Blueprint Model Extension
#### File: `src/lib/models/feature-blueprint.ts` (UPDATED)
Add fields for linking to features and phase specs.

```typescript
// src/lib/models/feature-blueprint.ts (UPDATED)

export interface FeatureBlueprint {
  id: string;
  project_id: string;
  title: string;
  feature_id: string;
  specification: string;
  status: 'draft' | 'in-progress' | 'review' | 'finalized';

  // Build Plan integration
  metadata?: {
    phase_number?: number;
    epic_number?: number;
    feature_node_id: string;
    generated_from_phase_spec?: boolean;
    acceptance_criteria?: string[];
    [key: string]: any;
  };

  // Standard fields
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

/**
 * Get blueprint for feature node
 */
export async function getBlueprintForFeature(featureId: string): Promise<FeatureBlueprint | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('feature_blueprints')
    .select('*')
    .eq('feature_id', featureId)
    .single();

  return error ? null : data;
}

/**
 * Get all blueprints for epic
 */
export async function getBlueprintsForEpic(
  projectId: string,
  epicNumber: number
): Promise<FeatureBlueprint[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('feature_blueprints')
    .select('*')
    .eq('project_id', projectId)
    .eq('metadata->epic_number', epicNumber)
    .order('metadata->phase_number', { ascending: true });

  return data || [];
}
```

### 3. Trigger for Feature Node Creation
#### File: `src/lib/sync/triggers/on-feature-node-created.ts` (NEW)
Auto-generate blueprint when feature node is created.

```typescript
// src/lib/sync/triggers/on-feature-node-created.ts

import { createClient } from '@/lib/supabase';
import { generateBlueprintFromFeature } from '../blueprints/generate-blueprints';
import type { FeatureNode } from '@/lib/models/feature-node';

export async function onFeatureNodeCreated(
  featureNode: FeatureNode,
  projectId: string,
  userId: string
) {
  // Only generate blueprints for feature-level nodes, not epics
  if (featureNode.level !== 'feature') {
    return;
  }

  try {
    const blueprintId = await generateBlueprintFromFeature(featureNode, projectId, userId);
    console.log(`[Sync] Feature Node ${featureNode.id} → Blueprint ${blueprintId}`);
    return blueprintId;
  } catch (error) {
    console.error('[Sync Error] Auto-generate blueprint failed:', error);
    // Don't throw; blueprint generation shouldn't block feature creation
  }
}
```

### 4. Control Room Blueprint Gallery
#### File: `src/app/open/control-room/[projectId]/blueprint-gallery.tsx` (NEW)
Display blueprints organized by epic with sync status.

```typescript
// src/app/open/control-room/[projectId]/blueprint-gallery.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { FeatureBlueprint } from '@/lib/models/feature-blueprint';

interface BlueprintGalleryProps {
  projectId: string;
}

export function BlueprintGallery({ projectId }: BlueprintGalleryProps) {
  const [blueprintsByEpic, setBlueprintsByEpic] = useState<
    Map<number, FeatureBlueprint[]>
  >(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBlueprints() {
      const supabase = createClient();

      const { data: blueprints } = await supabase
        .from('feature_blueprints')
        .select('*')
        .eq('project_id', projectId)
        .order('metadata->epic_number', { ascending: true })
        .order('metadata->phase_number', { ascending: true });

      if (blueprints) {
        const byEpic = new Map<number, FeatureBlueprint[]>();
        for (const bp of blueprints) {
          const epicNum = bp.metadata?.epic_number || 0;
          if (!byEpic.has(epicNum)) {
            byEpic.set(epicNum, []);
          }
          byEpic.get(epicNum)!.push(bp);
        }
        setBlueprintsByEpic(byEpic);
      }

      setLoading(false);
    }

    loadBlueprints();
  }, [projectId]);

  if (loading) return <div className="p-4">Loading blueprints...</div>;

  if (blueprintsByEpic.size === 0) {
    return (
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-sm text-gray-600">
          No blueprints yet. Create features in Pattern Shop to generate blueprints.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(blueprintsByEpic.entries()).map(([epicNum, blueprints]) => (
        <div key={epicNum} className="border rounded-lg overflow-hidden">
          <div className="bg-blue-50 p-4">
            <h3 className="font-semibold text-sm">Epic {epicNum}</h3>
            <p className="text-xs text-gray-600">
              {blueprints.length} blueprint{blueprints.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {blueprints.map(blueprint => (
              <div
                key={blueprint.id}
                className="border rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm flex-1">{blueprint.title}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded font-semibold ${
                      blueprint.status === 'draft'
                        ? 'bg-gray-200 text-gray-800'
                        : blueprint.status === 'finalized'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-yellow-200 text-yellow-800'
                    }`}
                  >
                    {blueprint.status}
                  </span>
                </div>

                {blueprint.specification && (
                  <p className="text-xs text-gray-700 line-clamp-3 mb-2">
                    {blueprint.specification.substring(0, 150)}...
                  </p>
                )}

                {blueprint.metadata?.acceptance_criteria?.length > 0 && (
                  <div className="text-xs text-gray-600 mb-2">
                    {blueprint.metadata.acceptance_criteria.length} criteria
                  </div>
                )}

                {blueprint.metadata?.generated_from_phase_spec && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Auto-generated
                  </span>
                )}

                <a
                  href={`/open/control-room/${blueprint.project_id}/blueprints/${blueprint.id}`}
                  className="text-xs text-blue-600 hover:underline block mt-3"
                >
                  View & Edit →
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 5. API Route for Blueprint Generation
#### File: `src/app/api/sync/generate-blueprints/route.ts` (NEW)
Endpoint to trigger bulk blueprint generation for a project.

```typescript
// src/app/api/sync/generate-blueprints/route.ts

import { createClient } from '@/lib/supabase';
import { generateBlueprintsForProject } from '@/lib/sync/blueprints/generate-blueprints';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, userId } = body;

  if (!projectId || !userId) {
    return NextResponse.json(
      { error: 'Missing projectId or userId' },
      { status: 400 }
    );
  }

  try {
    const result = await generateBlueprintsForProject(projectId, userId);

    return NextResponse.json({
      success: true,
      message: `Generated ${result.totalCount} blueprints`,
      totalCount: result.totalCount,
      epicCounts: result.epicBlueprintCounts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### 6. Database Migrations
#### File: `supabase/migrations/feature_blueprints_sync.sql` (NEW)
Add sync-related fields to feature_blueprints and create trigger.

```sql
-- supabase/migrations/feature_blueprints_sync.sql

-- Add feature_id column if not exists
ALTER TABLE feature_blueprints
ADD COLUMN IF NOT EXISTS feature_id UUID REFERENCES feature_nodes(id),
ADD COLUMN IF NOT EXISTS blueprint_generation_metadata JSONB;

-- Create trigger: auto-generate blueprint when feature node is created
CREATE OR REPLACE FUNCTION auto_generate_blueprint_for_feature()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for feature-level nodes
  IF NEW.level = 'feature' THEN
    INSERT INTO feature_blueprints (
      title,
      feature_id,
      project_id,
      specification,
      status,
      metadata,
      created_by,
      created_at
    ) VALUES (
      'Blueprint: ' || NEW.name,
      NEW.id,
      NEW.project_id,
      NEW.description || COALESCE(E'\n\nPhase: ' || NEW.metadata->>'phase_number', ''),
      'draft',
      jsonb_build_object(
        'feature_node_id', NEW.id,
        'phase_number', NEW.metadata->>'phase_number',
        'epic_number', NEW.metadata->>'epic_number',
        'auto_generated', true
      ),
      NEW.created_by,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_generate_blueprint
AFTER INSERT ON feature_nodes
FOR EACH ROW
EXECUTE FUNCTION auto_generate_blueprint_for_feature();
```

---

## File Structure
```
src/lib/sync/blueprints/
├── generate-blueprints.ts (NEW)

src/lib/sync/triggers/
├── on-feature-node-created.ts (NEW)

src/lib/models/
├── feature-blueprint.ts (UPDATED)

src/app/open/control-room/[projectId]/
├── blueprint-gallery.tsx (NEW)

src/app/api/sync/
├── generate-blueprints/ (NEW)
│   └── route.ts (NEW)

supabase/migrations/
└── feature_blueprints_sync.sql (NEW)
```

---

## Dependencies
- Phase 115 sync infrastructure
- Phase 117 feature nodes created
- feature_nodes table with level and metadata
- feature_blueprints table with feature_id field
- Phase spec parser (Phase 118)

---

## Tech Stack for This Phase
- TypeScript for type safety
- Supabase triggers for automation
- React components for gallery view
- Next.js API routes

---

## Acceptance Criteria
1. generateBlueprintFromFeature creates blueprint with feature name in title
2. Blueprint specification includes feature description from feature_node
3. If phaseSpec provided, detailed_requirements and file_structure are included
4. Metadata includes feature_node_id, phase_number, epic_number
5. generated_from_phase_spec flag is set to true when using phase spec
6. Blueprint status is initialized to 'draft'
7. Feature node is linked to blueprint via metadata.linked_blueprint_id
8. onFeatureNodeCreated trigger auto-generates blueprint for feature-level nodes
9. Blueprint generation skips epic-level nodes
10. BlueprintGallery displays blueprints grouped by epic number

---

## Testing Instructions
1. Create a feature node in Pattern Shop
2. Verify blueprint is auto-generated in feature_blueprints table
3. Check blueprint title matches feature name
4. Confirm metadata includes correct phase and epic numbers
5. Load BlueprintGallery component for project
6. Verify blueprints are grouped by epic
7. Test bulk generation via POST /api/sync/generate-blueprints
8. Check totalCount matches number of feature nodes
9. Verify existing blueprints are not duplicated on re-generation
10. Test with phaseSpec data to confirm full specification is populated

---

## Notes for the AI Agent
- Blueprints are stubs; full design work happens in Control Room
- Keep initial specification concise; users will expand it
- Auto-generation should be idempotent (don't re-create existing blueprints)
- Acceptance criteria should be preserved from phase specs for traceability
- Status starts as 'draft'; architects move it through finalization as they work
