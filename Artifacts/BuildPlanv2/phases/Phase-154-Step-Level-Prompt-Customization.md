# Phase 154 — Step-Level Prompt Customization

## Objective
Customize AI prompts used in automated steps (Brainstorming system prompt, Build Planning Q&A flow, Documentation Review criteria weighting). Store customizations per org or project, enable override capability.

## Prerequisites
- Phase 149 — Custom Stage and Step Definitions — Step definitions
- Phase 141 — Executive Summary Generation — AI integration patterns

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 154 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Each automated step uses AI prompts. Organizations want to customize these prompts to match their style, requirements, and domain. Let them edit the system prompt, add custom instructions, adjust criteria weighting. Prompts stored per org (apply to all projects) or per project (override org).

---

## Detailed Requirements

### 1. Prompt Customization Service
#### File: `lib/helix/promptCustomization.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface PromptCustomization {
  stepName: string;
  systemPrompt?: string; // Override for system prompt
  userPromptInstructions?: string; // Additional instructions
  criteriaWeights?: Record<string, number>; // For scoring steps
  examples?: Array<{ input: string; output: string }>;
}

export async function getStepPromptCustomizations(
  stepName: string,
  projectId?: string,
  orgId?: string,
  supabaseClient?: ReturnType<typeof createClient>
) {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // Check project-level first
  if (projectId) {
    const { data: projectCustom } = await supabaseClient
      .from('helix_prompt_customizations')
      .select('*')
      .eq('project_id', projectId)
      .eq('step_name', stepName)
      .single();

    if (projectCustom) {
      return projectCustom;
    }
  }

  // Fall back to org-level
  if (orgId) {
    const { data: orgCustom } = await supabaseClient
      .from('helix_prompt_customizations')
      .select('*')
      .eq('org_id', orgId)
      .eq('step_name', stepName)
      .is('project_id', null)
      .single();

    if (orgCustom) {
      return orgCustom;
    }
  }

  // Return defaults
  return getDefaultPromptForStep(stepName);
}

function getDefaultPromptForStep(stepName: string): PromptCustomization {
  const defaults: Record<string, PromptCustomization> = {
    'Brainstorming': {
      stepName: 'Brainstorming',
      systemPrompt: 'You are a product ideation expert. Generate creative, feasible ideas.',
      criteriaWeights: {
        feasibility: 0.4,
        innovation: 0.3,
        impact: 0.3,
      },
    },
    'Build Planning': {
      stepName: 'Build Planning',
      systemPrompt: 'Create detailed technical build plans with clear requirements.',
      criteriaWeights: {
        clarity: 0.4,
        completeness: 0.35,
        feasibility: 0.25,
      },
    },
    'Documentation Review': {
      stepName: 'Documentation Review',
      systemPrompt: 'Review documentation for completeness, accuracy, and clarity.',
      criteriaWeights: {
        completeness: 0.4,
        accuracy: 0.35,
        clarity: 0.25,
      },
    },
  };

  return defaults[stepName] || { stepName };
}

export async function setPromptCustomization(
  customization: PromptCustomization,
  projectId?: string,
  orgId?: string,
  supabaseClient?: ReturnType<typeof createClient>
): Promise<void> {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  const { error } = await supabaseClient
    .from('helix_prompt_customizations')
    .upsert({
      step_name: customization.stepName,
      project_id: projectId,
      org_id: orgId,
      system_prompt: customization.systemPrompt,
      user_prompt_instructions: customization.userPromptInstructions,
      criteria_weights: customization.criteriaWeights,
      examples: customization.examples,
    });

  if (error) throw error;
}

export function buildPromptWithCustomizations(
  basePrompt: string,
  customization?: PromptCustomization
): string {
  if (!customization) return basePrompt;

  let prompt = basePrompt;

  if (customization.systemPrompt) {
    // Replace or prepend system context
    prompt = `${customization.systemPrompt}\n\n${basePrompt}`;
  }

  if (customization.userPromptInstructions) {
    prompt += `\n\nAdditional Instructions:\n${customization.userPromptInstructions}`;
  }

  if (customization.criteriaWeights) {
    prompt += `\n\nEvaluation Criteria Weights:\n`;
    Object.entries(customization.criteriaWeights).forEach(([criterion, weight]) => {
      prompt += `- ${criterion}: ${(weight * 100).toFixed(0)}%\n`;
    });
  }

  if (customization.examples && customization.examples.length > 0) {
    prompt += `\n\nExamples:\n`;
    customization.examples.forEach((ex, idx) => {
      prompt += `Example ${idx + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}\n\n`;
    });
  }

  return prompt;
}
```

### 2. Prompt Customization Schema
#### File: `migrations/add_helix_prompt_customizations.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_prompt_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_name TEXT NOT NULL,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  system_prompt TEXT,
  user_prompt_instructions TEXT,
  criteria_weights JSONB,
  examples JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CHECK (
    (org_id IS NOT NULL AND project_id IS NULL) OR
    (org_id IS NOT NULL AND project_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_prompt_org_step ON helix_prompt_customizations(org_id, step_name)
WHERE project_id IS NULL;

CREATE UNIQUE INDEX idx_prompt_project_step ON helix_prompt_customizations(project_id, step_name);

ALTER TABLE helix_prompt_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view prompt customizations"
  ON helix_prompt_customizations FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage customizations"
  ON helix_prompt_customizations FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 3. Prompt Customization UI Component
#### File: `components/helix/admin/PromptCustomizer.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface PromptCustomizerProps {
  stepName: string;
  orgId: string;
  projectId?: string;
}

export function PromptCustomizer({
  stepName,
  orgId,
  projectId,
}: PromptCustomizerProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState<any>({});
  const [showEditor, setShowEditor] = useState(false);

  const { data: customization, refetch } = useQuery({
    queryKey: ['prompt-customization', stepName, projectId, orgId],
    queryFn: async () => {
      const endpoint = projectId
        ? `/api/v1/helix/projects/${projectId}/prompt-customization`
        : `/api/v1/orgs/${orgId}/prompt-customization`;

      const response = await fetch(`${endpoint}?step=${encodeURIComponent(stepName)}`);
      if (!response.ok) throw new Error('Failed to fetch customization');
      return response.json();
    },
    onSuccess: (data) => {
      setFormData(data.customization || {});
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const endpoint = projectId
        ? `/api/v1/helix/projects/${projectId}/prompt-customization`
        : `/api/v1/orgs/${orgId}/prompt-customization`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepName, ...formData }),
      });
      if (!response.ok) throw new Error('Failed to save customization');
      return response.json();
    },
    onSuccess: () => {
      setShowEditor(false);
      refetch();
    },
  });

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{stepName} Prompt</h3>
        <span className="text-sm text-gray-600">
          {projectId ? 'Project Override' : 'Organization Default'}
        </span>
      </div>

      {/* Summary */}
      {!showEditor && (
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          {formData.systemPrompt && (
            <div>
              <p className="text-sm font-semibold text-blue-900">System Prompt</p>
              <p className="text-sm text-blue-800 mt-1 line-clamp-2">{formData.systemPrompt}</p>
            </div>
          )}

          {formData.criteriaWeights && (
            <div>
              <p className="text-sm font-semibold text-blue-900">Criteria Weights</p>
              <div className="text-sm text-blue-800 mt-1 space-y-1">
                {Object.entries(formData.criteriaWeights).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span>{key}</span>
                    <span className="font-mono">{(value * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowEditor(true)}
            className="w-full px-3 py-2 bg-blue-200 text-blue-700 rounded-lg hover:bg-blue-300 text-sm"
          >
            Edit Customization
          </button>
        </div>
      )}

      {/* Editor */}
      {showEditor && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">System Prompt</label>
            <textarea
              value={formData.systemPrompt || ''}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm h-24"
              placeholder="System prompt guiding AI behavior..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Additional Instructions</label>
            <textarea
              value={formData.userPromptInstructions || ''}
              onChange={(e) => handleChange('userPromptInstructions', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm h-20"
              placeholder="Extra instructions for this step..."
            />
          </div>

          {/* Criteria Weights */}
          <div>
            <label className="block text-sm font-medium mb-2">Criteria Weights</label>
            <div className="space-y-2">
              {Object.entries(formData.criteriaWeights || {}).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-sm w-32">{key}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={value}
                    onChange={(e) =>
                      handleChange('criteriaWeights', {
                        ...formData.criteriaWeights,
                        [key]: parseFloat(e.target.value),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="text-sm w-12 font-mono">{(value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Customization'}
            </button>
            <button
              onClick={() => setShowEditor(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## File Structure
```
migrations/
└── add_helix_prompt_customizations.sql (NEW)
lib/
└── helix/
    └── promptCustomization.ts (NEW)
components/
└── helix/
    └── admin/
        └── PromptCustomizer.tsx (NEW)
```

---

## Acceptance Criteria
1. Organization can customize AI prompts per step
2. Projects can override org-level prompts
3. System prompts customizable per step
4. Criteria weights adjustable (0-100%)
5. Examples can be added to guide AI
6. Project-level overrides take precedence
7. Customizations stored in database
8. buildPromptWithCustomizations() merges custom + base
9. UI allows editing system prompt, instructions, weights
10. Defaults provided for standard steps

---

## Testing Instructions
1. Customize org-level "Build Planning" system prompt
2. Save customization, verify persisted
3. Create project-level override for same step
4. Verify project override used (not org)
5. Adjust criteria weights via UI
6. Verify weights sum to 100% or flexible
7. Add examples to prompt
8. Call API to get customization
9. Build prompt with customizations, verify includes all parts
10. Remove customization, verify defaults used

---

## Notes for the AI Agent
- Criteria weights should allow flexibility (don't require sum to 100%)
- Examples are optional guidance for AI
- Customizations should never break prompt structure
- Consider versioning for prompt customizations (Phase 155)
- Project overrides completely replace org defaults (no merging)
