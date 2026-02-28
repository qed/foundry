# Phase 152 — Process Template Library

## Objective
Build an organization-level template library to browse templates, preview configurations, apply templates to new projects, and manage template versions.

## Prerequisites
- Phase 138 — Process Template System — Template infrastructure
- Phase 149 — Custom Stage and Step Definitions — Stage/step definitions

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 152 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Teams develop proven process templates for different project types: startup MVP, enterprise, research, etc. The template library makes these reusable. Teams browse templates, see previews, apply to new projects. Future: template marketplace sharing between organizations.

---

## Detailed Requirements

### 1. Template Library Service
#### File: `lib/helix/templateLibrary.ts` (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';

export async function getOrgTemplateLibrary(
  orgId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { data: templates, error } = await supabaseClient
    .from('helix_process_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (templates || []).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    stageCount: t.custom_stages?.length || 0,
    version: t.version,
    isDefault: t.is_default,
    createdAt: new Date(t.created_at),
    usageCount: 0, // Will be populated separately
  }));
}

export async function getTemplatePreview(
  templateId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  const { data: template, error } = await supabaseClient
    .from('helix_process_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) throw error;

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    stages: template.custom_stages,
    evidenceConfig: template.evidence_config,
    gateRules: template.gate_rules,
    promptCustomizations: template.prompt_customizations,
    version: template.version,
    createdAt: new Date(template.created_at),
  };
}

export async function getTemplateUsageCount(
  templateId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<number> {
  const { data, error } = await supabaseClient
    .from('helix_template_usage')
    .select('id')
    .eq('template_id', templateId);

  if (error) throw error;
  return data?.length || 0;
}

export async function duplicateTemplate(
  sourceTemplateId: string,
  newName: string,
  orgId: string,
  supabaseClient: ReturnType<typeof createClient>
): Promise<string> {
  const source = await getTemplatePreview(sourceTemplateId, supabaseClient);

  const { data, error } = await supabaseClient
    .from('helix_process_templates')
    .insert([
      {
        org_id: orgId,
        name: newName,
        description: `Copy of ${source.name}`,
        custom_stages: source.stages,
        evidence_config: source.evidenceConfig,
        gate_rules: source.gateRules,
        prompt_customizations: source.promptCustomizations,
        version: 1,
      },
    ])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
```

### 2. Template Library UI Component
#### File: `components/helix/templates/TemplateLibraryBrowser.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TemplatePreview } from './TemplatePreview';

interface TemplateLibraryBrowserProps {
  orgId: string;
  onApplyTemplate?: (templateId: string) => void;
}

export function TemplateLibraryBrowser({
  orgId,
  onApplyTemplate,
}: TemplateLibraryBrowserProps) {
  const supabase = createClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['template-library', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/orgs/${orgId}/templates/library`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const newName = prompt('Template name:');
      if (!newName) return;

      const response = await fetch(`/api/v1/orgs/${orgId}/templates/${templateId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) throw new Error('Duplicate failed');
      return response.json();
    },
  });

  const filteredTemplates = templates?.templates?.filter((t: any) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Template Library</h1>
        <span className="text-sm text-gray-600">
          {templates?.count || 0} template{templates?.count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search */}
      <div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates?.map((template: any) => (
            <div
              key={template.id}
              className={`rounded-lg shadow p-4 cursor-pointer transition ${
                selectedTemplate === template.id
                  ? 'ring-2 ring-blue-600 bg-blue-50'
                  : 'hover:shadow-lg bg-white'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{template.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>
                {template.isDefault && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded ml-2">
                    Default
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between text-sm text-gray-600">
                <span>{template.stageCount} stages</span>
                <span>v{template.version}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Preview */}
      {selectedTemplate && (
        <TemplatePreview
          templateId={selectedTemplate}
          onApply={() => onApplyTemplate?.(selectedTemplate)}
          onDuplicate={() => duplicateMutation.mutate(selectedTemplate)}
        />
      )}

      {/* Empty State */}
      {templates?.count === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No templates in library yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Save completed Helix processes as templates to get started
          </p>
        </div>
      )}
    </div>
  );
}
```

### 3. Template Library API
#### File: `app/api/v1/orgs/[id]/templates/library/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgTemplateLibrary, getTemplateUsageCount } from '@/lib/helix/templateLibrary';
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
    const templates = await getOrgTemplateLibrary(params.id, supabase);

    // Get usage counts
    const templatesWithUsage = await Promise.all(
      templates.map(async (t) => ({
        ...t,
        usageCount: await getTemplateUsageCount(t.id, supabase),
      }))
    );

    return NextResponse.json({
      orgId: params.id,
      templates: templatesWithUsage,
      count: templatesWithUsage.length,
    });
  } catch (error) {
    console.error('Template library API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
lib/
└── helix/
    └── templateLibrary.ts (NEW)
components/
└── helix/
    └── templates/
        └── TemplateLibraryBrowser.tsx (NEW)
app/
└── api/
    └── v1/
        └── orgs/
            └── [id]/
                └── templates/
                    └── library/
                        └── route.ts (NEW)
```

---

## Acceptance Criteria
1. Template library displays all org templates
2. Templates show name, description, stage count, version
3. Search filters templates by name and description
4. Template preview shows complete configuration
5. Default template highlighted
6. Duplicate template creates copy with new name
7. Usage count shows how many projects use template
8. API returns sorted list of templates
9. Templates sortable by name, version, or usage
10. Template selection highlights and enables actions

---

## Testing Instructions
1. Create 3+ templates in org
2. View template library, verify all displayed
3. Search for template by name, verify filtered
4. Click template, verify preview shows configuration
5. Duplicate template, verify copy created
6. View duplicate in library
7. Call API /templates/library, verify JSON response
8. Verify usage count increments when template applied
9. Verify default template marked
10. Verify search works across name and description

---

## Notes for the AI Agent
- Templates are immutable after creation (version history in Phase 155)
- Marketplace sharing between orgs is future enhancement
- Consider template categories/tags for organization
- Duplicate creates new template with increment version number
- Performance: cache template library for 15 minutes
