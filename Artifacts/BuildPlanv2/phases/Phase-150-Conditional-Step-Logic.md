# Phase 150 — Conditional Step Logic

## Objective
Implement skip logic for steps based on project type or user choice. Examples: "if tech_stack includes 'mobile' then show Step X", "Skip Repo Setup stage if project is non-code". Build condition editor UI and runtime evaluation engine.

## Prerequisites
- Phase 149 — Custom Stage and Step Definitions — Step structure

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 150 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Not all steps apply to all projects. A mobile-only step shouldn't appear in web projects. A documentation step might be skipped for internal tools. Conditional logic lets organizations define when steps are relevant, keeping the process clean and focused.

---

## Detailed Requirements

### 1. Conditional Logic Engine
#### File: `lib/helix/conditionalLogic.ts` (NEW)
```typescript
export interface StepCondition {
  type: 'tech_stack' | 'project_type' | 'manual' | 'field_match';
  operator: 'includes' | 'excludes' | 'equals' | 'not_equals' | 'and' | 'or';
  value?: string | string[];
  conditions?: StepCondition[];
}

export interface ConditionalStep {
  stepId: string;
  stepName: string;
  conditions: StepCondition[];
}

export interface ProjectContext {
  techStack?: string[];
  projectType?: string;
  customFields?: Record<string, any>;
}

export function evaluateCondition(
  condition: StepCondition,
  context: ProjectContext
): boolean {
  switch (condition.type) {
    case 'tech_stack':
      if (!context.techStack) return false;
      if (condition.operator === 'includes') {
        return context.techStack.includes(condition.value as string);
      } else if (condition.operator === 'excludes') {
        return !context.techStack.includes(condition.value as string);
      }
      break;

    case 'project_type':
      if (condition.operator === 'equals') {
        return context.projectType === condition.value;
      } else if (condition.operator === 'not_equals') {
        return context.projectType !== condition.value;
      }
      break;

    case 'field_match':
      if (!condition.value) return false;
      const fieldValue = context.customFields?.[condition.value as string];
      if (!fieldValue) return false;
      if (condition.operator === 'equals') {
        return fieldValue === condition.value;
      }
      break;

    case 'and':
      if (!condition.conditions) return true;
      return condition.conditions.every(c => evaluateCondition(c, context));

    case 'or':
      if (!condition.conditions) return false;
      return condition.conditions.some(c => evaluateCondition(c, context));
  }

  return false;
}

export function evaluateStepVisibility(
  step: ConditionalStep,
  context: ProjectContext
): boolean {
  if (!step.conditions || step.conditions.length === 0) {
    return true; // No conditions = always show
  }

  // All conditions must be true (AND logic)
  return step.conditions.every(c => evaluateCondition(c, context));
}

export function filterStepsForProject(
  steps: ConditionalStep[],
  context: ProjectContext
): ConditionalStep[] {
  return steps.filter(step => evaluateStepVisibility(step, context));
}
```

### 2. Condition Editor UI Component
#### File: `components/helix/admin/ConditionEditor.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';

interface ConditionEditorProps {
  step: any;
  onSave: (conditions: any[]) => void;
}

export function ConditionEditor({ step, onSave }: ConditionEditorProps) {
  const [conditions, setConditions] = useState(step.conditions || []);
  const [showForm, setShowForm] = useState(false);

  const CONDITION_TYPES = [
    { value: 'tech_stack', label: 'Tech Stack' },
    { value: 'project_type', label: 'Project Type' },
    { value: 'manual', label: 'Manual Skip' },
    { value: 'field_match', label: 'Custom Field Match' },
  ];

  const OPERATORS = [
    { value: 'includes', label: 'Includes' },
    { value: 'excludes', label: 'Excludes' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'and', label: 'AND (all must be true)' },
    { value: 'or', label: 'OR (any can be true)' },
  ];

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { type: 'tech_stack', operator: 'includes', value: '' },
    ]);
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions(conditions.filter((_: any, i: number) => i !== idx));
  };

  const handleConditionChange = (idx: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], [field]: value };
    setConditions(updated);
  };

  const handleSave = () => {
    onSave(conditions);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Current Conditions */}
      {conditions.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">Step Visibility Rules:</p>
          <ul className="space-y-1 text-sm text-blue-800">
            {conditions.map((cond: any, idx: number) => (
              <li key={idx}>
                {cond.type === 'tech_stack' && `Tech stack ${cond.operator} '${cond.value}'`}
                {cond.type === 'project_type' && `Project type ${cond.operator} '${cond.value}'`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Condition Editor */}
      {showForm ? (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          {conditions.map((cond: any, idx: number) => (
            <div key={idx} className="border rounded p-3 space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={cond.type}
                    onChange={(e) => handleConditionChange(idx, 'type', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {CONDITION_TYPES.map(ct => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleRemoveCondition(idx)}
                  className="px-3 py-2 bg-red-200 text-red-700 rounded text-sm hover:bg-red-300"
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Operator</label>
                  <select
                    value={cond.operator}
                    onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <input
                    type="text"
                    value={cond.value || ''}
                    onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                    placeholder="e.g., 'react', 'mobile'"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddCondition}
            className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
          >
            + Add Another Condition
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Save Conditions
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
        >
          {conditions.length === 0 ? '+ Add Visibility Rules' : 'Edit Visibility Rules'}
        </button>
      )}
    </div>
  );
}
```

### 3. Step Visibility API
#### File: `app/api/v1/helix/projects/[projectId]/visible-steps/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProcessDefinition } from '@/lib/helix/processDefinitions';
import { filterStepsForProject } from '@/lib/helix/conditionalLogic';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const supabase = createClient();

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('tech_stack, type, org_id')
      .eq('id', params.projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get process definition
    const definition = await getProcessDefinition(project.org_id, supabase);

    // Filter steps based on conditions
    const context = {
      techStack: project.tech_stack,
      projectType: project.type,
    };

    const visibleStages = definition.map((stage: any) => ({
      ...stage,
      steps: filterStepsForProject(stage.steps || [], context),
    }));

    return NextResponse.json({
      projectId: params.projectId,
      stages: visibleStages,
      context,
    });
  } catch (error) {
    console.error('Visible steps API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
lib/
└── helix/
    └── conditionalLogic.ts (NEW)
components/
└── helix/
    └── admin/
        └── ConditionEditor.tsx (NEW)
app/
└── api/
    └── v1/
        └── helix/
            └── projects/
                └── [projectId]/
                    └── visible-steps/
                        └── route.ts (NEW)
```

---

## Dependencies
- Supabase: existing

---

## Tech Stack for This Phase
- Next.js 16+ (API routes)
- TypeScript
- Supabase (project data)
- React (UI components)

---

## Acceptance Criteria
1. Condition engine evaluates tech_stack conditions
2. Condition engine evaluates project_type conditions
3. Multiple conditions combined with AND/OR logic
4. Steps hidden/shown based on conditions at project creation
5. Condition editor UI allows adding/removing conditions
6. Operators include: includes, excludes, equals, not_equals
7. API returns visible steps for given project context
8. Steps with no conditions always shown
9. Conditions stored with step definitions
10. Condition evaluation is deterministic

---

## Testing Instructions
1. Create conditional step: "show if tech_stack includes 'mobile'"
2. Create project with tech_stack=['web'], verify step hidden
3. Create project with tech_stack=['mobile'], verify step visible
4. Create AND condition: "project_type=startup AND tech_stack includes react"
5. Test various project types and stacks
6. Verify OR conditions work (any must be true)
7. Call API /visible-steps for project, verify correct steps returned
8. Verify conditional step shows in UI for matching project
9. Verify step hidden for non-matching project
10. Test condition changes persist

---

## Notes for the AI Agent
- Condition syntax should be user-friendly, avoid code
- Consider preset condition templates for common scenarios
- Future enhancement: user-facing conditional logic builder
- Condition evaluation happens at project creation (immutable)
- Consider more condition types: user role, custom fields, integrations
