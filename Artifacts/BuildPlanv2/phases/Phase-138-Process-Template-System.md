# Phase 138 — Process Template System

## Objective
Build a system for saving, organizing, and reusing complete Helix process configurations as templates at the organization level, enabling rapid project setup with proven, customized workflows.

## Prerequisites
- Phase 135 — Core Helix Process Engine — Foundation for process definitions

## Epic Context
**Epic:** 17 — Process Analytics & Reporting
**Phase:** 138 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Organizations develop proven Helix workflows optimized for their tech stack, team, and project types. Currently, each new project starts from the standard template. By enabling template creation, organizations can save their customized stage definitions, evidence requirements, gate check rules, and AI prompt customizations, then reuse them for new projects.

This accelerates project setup, ensures process consistency, and captures institutional knowledge. A mobile development team can save a mobile-optimized template; a web team saves their web template. New projects launch faster with proven processes.

---

## Detailed Requirements

### 1. Database Schema
#### File: `migrations/add_helix_process_templates.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS helix_process_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  custom_stages JSONB NOT NULL, -- Array of stage definitions
  evidence_config JSONB NOT NULL, -- Evidence requirements per step
  gate_rules JSONB NOT NULL, -- Gate check rules per stage
  prompt_customizations JSONB, -- Custom prompts for automation
  is_default BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(org_id, name)
);

CREATE INDEX idx_templates_org ON helix_process_templates(org_id);
CREATE INDEX idx_templates_default ON helix_process_templates(org_id, is_default);

-- Template usage tracking
CREATE TABLE IF NOT EXISTS helix_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES helix_process_templates(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  applied_at TIMESTAMP DEFAULT now(),
  UNIQUE(template_id, project_id)
);

CREATE INDEX idx_template_usage_template ON helix_template_usage(template_id);
CREATE INDEX idx_template_usage_project ON helix_template_usage(project_id);

-- Enable RLS
ALTER TABLE helix_process_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_template_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can read org templates"
  ON helix_process_templates FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Org admins can create templates"
  ON helix_process_templates FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Org admins can update templates"
  ON helix_process_templates FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view template usage"
  ON helix_template_usage FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );
```

### 2. Template Service
#### File: `lib/helix/processTemplates.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export interface ProcessTemplate {
  id?: string;
  name: string;
  description?: string;
  customStages: StageDefinition[];
  evidenceConfig: EvidenceRequirement[];
  gateRules: GateRule[];
  promptCustomizations?: PromptCustomization[];
  isDefault?: boolean;
  version?: number;
  createdBy?: string;
  createdAt?: Date;
}

export interface StageDefinition {
  name: string;
  order: number;
  steps: StepDefinition[];
  gateCheck?: string;
}

export interface StepDefinition {
  name: string;
  order: number;
  description: string;
  instructions: string;
  evidenceType: 'text' | 'file' | 'url' | 'checklist';
  required: boolean;
}

export interface EvidenceRequirement {
  stepName: string;
  type: 'text' | 'file' | 'url' | 'checklist';
  minTextLength?: number;
  allowedFileTypes?: string[];
  minFileCount?: number;
  urlPattern?: string;
  checklistItems?: string[];
}

export interface GateRule {
  stageName: string;
  condition: string; // e.g., "all tests pass", "manual approval"
  strictness: 'strict' | 'warning' | 'info';
}

export interface PromptCustomization {
  stepName: string;
  systemPrompt?: string;
  additionalInstructions?: string;
}

export async function createTemplate(
  orgId: string,
  template: ProcessTemplate,
  userId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { data, error } = await supabaseClient
    .from('helix_process_templates')
    .insert([
      {
        org_id: orgId,
        name: template.name,
        description: template.description,
        custom_stages: template.customStages,
        evidence_config: template.evidenceConfig,
        gate_rules: template.gateRules,
        prompt_customizations: template.promptCustomizations,
        is_default: template.isDefault || false,
        created_by: userId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOrgTemplates(
  orgId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { data, error } = await supabaseClient
    .from('helix_process_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTemplate(
  templateId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { data, error } = await supabaseClient
    .from('helix_process_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTemplate(
  templateId: string,
  template: Partial<ProcessTemplate>,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { data, error } = await supabaseClient
    .from('helix_process_templates')
    .update({
      name: template.name,
      description: template.description,
      custom_stages: template.customStages,
      evidence_config: template.evidenceConfig,
      gate_rules: template.gateRules,
      prompt_customizations: template.promptCustomizations,
      version: (template.version || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTemplate(
  templateId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { error } = await supabaseClient
    .from('helix_process_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

export async function applyTemplateToProject(
  templateId: string,
  projectId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  // Get template
  const template = await getTemplate(templateId, supabaseClient);

  // Apply to project (store in helix_process_definitions)
  const { error: applyError } = await supabaseClient
    .from('helix_process_definitions')
    .update({
      custom_stages: template.custom_stages,
      evidence_config: template.evidence_config,
      gate_rules: template.gate_rules,
      prompt_customizations: template.prompt_customizations,
    })
    .eq('project_id', projectId);

  if (applyError) throw applyError;

  // Track usage
  const { error: trackError } = await supabaseClient
    .from('helix_template_usage')
    .insert([
      {
        template_id: templateId,
        project_id: projectId,
      },
    ]);

  if (trackError) throw trackError;
}

export async function getTemplateUsage(
  templateId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { data, error } = await supabaseClient
    .from('helix_template_usage')
    .select(`
      id,
      project_id,
      projects(name),
      applied_at
    `)
    .eq('template_id', templateId);

  if (error) throw error;
  return data || [];
}

export async function setDefaultTemplate(
  orgId: string,
  templateId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  // Clear current default
  await supabaseClient
    .from('helix_process_templates')
    .update({ is_default: false })
    .eq('org_id', orgId)
    .eq('is_default', true);

  // Set new default
  const { data, error } = await supabaseClient
    .from('helix_process_templates')
    .update({ is_default: true })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 3. Template UI Components
#### File: `components/helix/templates/TemplateLibrary.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getOrgTemplates, applyTemplateToProject } from '@/lib/helix/processTemplates';
import { TemplatePreview } from './TemplatePreview';
import { TemplateForm } from './TemplateForm';

interface TemplateLibraryProps {
  orgId: string;
  projectId?: string;
  onApply?: (templateId: string) => void;
}

export function TemplateLibrary({
  orgId,
  projectId,
  onApply,
}: TemplateLibraryProps) {
  const supabase = createClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['org-templates', orgId],
    queryFn: () => getOrgTemplates(orgId, supabase),
  });

  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!projectId) throw new Error('Project ID required');
      await applyTemplateToProject(templateId, projectId, supabase);
    },
    onSuccess: (_, templateId) => {
      onApply?.(templateId);
      setSelectedTemplate(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Process Template Library</h1>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showNewForm ? 'Cancel' : 'Create Template'}
        </button>
      </div>

      {/* New Template Form */}
      {showNewForm && (
        <TemplateForm
          orgId={orgId}
          onSuccess={() => {
            setShowNewForm(false);
            refetch();
          }}
        />
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-lg shadow p-4 cursor-pointer transition ${
              selectedTemplate === template.id ? 'ring-2 ring-blue-600' : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedTemplate(template.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              </div>
              {template.is_default && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                  Default
                </span>
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between text-sm text-gray-600">
              <span>v{template.version}</span>
              <span>{template.custom_stages?.length || 0} stages</span>
            </div>
          </div>
        ))}
      </div>

      {/* Template Preview & Actions */}
      {selectedTemplate && (
        <TemplatePreview
          templateId={selectedTemplate}
          projectId={projectId}
          onApply={() => applyMutation.mutate(selectedTemplate)}
          isApplying={applyMutation.isPending}
        />
      )}
    </div>
  );
}
```

### 4. API Endpoints
#### File: `app/api/v1/orgs/[id]/templates/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createTemplate,
  getOrgTemplates,
  deleteTemplate,
} from '@/lib/helix/processTemplates';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const templates = await getOrgTemplates(params.id, supabase);

    return NextResponse.json({
      orgId: params.id,
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('Templates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json();
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const template = await createTemplate(
      params.id,
      body,
      user.user.id,
      supabase
    );

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
migrations/
└── add_helix_process_templates.sql (NEW)
lib/
└── helix/
    └── processTemplates.ts (NEW)
components/
├── helix/
│   └── templates/
│       ├── TemplateLibrary.tsx (NEW)
│       ├── TemplatePreview.tsx (NEW)
│       └── TemplateForm.tsx (NEW)
app/
└── api/
    └── v1/
        └── orgs/
            └── [id]/
                └── templates/
                    └── route.ts (NEW)
```

---

## Dependencies
- @tanstack/react-query: ^5.28.0
- Supabase: existing

---

## Tech Stack for This Phase
- Next.js 16+ (API routes, Server Components)
- TypeScript
- Supabase (storage and RLS policies)
- React (components)
- TailwindCSS v4

---

## Acceptance Criteria
1. Template table stores name, stages, evidence config, gate rules, prompts
2. Create template saves custom stages and all customizations
3. Template library displays all org templates with metadata
4. Template preview shows complete configuration details
5. Apply template to project updates project's process definition
6. Default template can be set for org
7. Template versioning increments on updates
8. Template usage tracked with project references
9. Delete template removes from library and future suggestions
10. API endpoints secured with app_key authentication

---

## Testing Instructions
1. Create template with 5 custom stages and evidence config
2. Verify template saved with correct name, stages, and metadata
3. Verify template appears in org template library
4. Create new project and apply template via library
5. Verify project inherits template's stages and configuration
6. Set template as default and create new project
7. Verify new project defaults to that template
8. Update template name and description
9. Verify version increments
10. Verify API /orgs/:id/templates returns all templates

---

## Notes for the AI Agent
- Template marketplace for future phase could share templates between orgs
- Consider template tagging/categories for better discovery
- Template preview should show side-by-side comparison with current project
- Migration tool needed to update existing projects to new template versions
