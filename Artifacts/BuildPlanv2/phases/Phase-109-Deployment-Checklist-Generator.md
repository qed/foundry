# Phase 109 — Deployment Checklist Generator

## Objective
AI-generated deployment checklist based on project tech stack and infrastructure choices. Includes categories for code, infrastructure, data, monitoring, and communication. Editable before finalizing.

## Prerequisites
- Phase 108 — Test Report Generation — provides test readiness data
- Phase 089 — Project Brief (v1) — provides tech stack and infrastructure info

## Epic Context
**Epic:** 13 — Deployment Pipeline — Steps 8.1-8.3 Enhancement
**Phase:** 109 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Deployment checklists are often generic or missing critical items. A proper checklist must be tailored to the project's tech stack, database choices, and infrastructure. A Next.js/Supabase project needs different checks than a Rails/PostgreSQL/AWS setup.

This phase generates context-aware deployment checklists by analyzing the project brief (tech stack, database, hosting, CDN, etc.) and using Claude API to suggest relevant deployment steps. Engineers can edit before finalizing.

---

## Detailed Requirements

### 1. Deployment Checklist Generator Service
#### File: `lib/helix/deployment/checklist-generator.ts` (NEW)
AI-powered deployment checklist generation.

```typescript
import Anthropic from '@anthropic-ai/sdk';

export interface DeploymentChecklistItem {
  id: string;
  category: 'code' | 'infrastructure' | 'data' | 'monitoring' | 'communication';
  title: string;
  description: string;
  critical: boolean;
  estimatedTime: string;
}

const client = new Anthropic();

export const generateDeploymentChecklist = async (
  projectBrief: any
): Promise<DeploymentChecklistItem[]> => {
  const techStackDescription = `
Tech Stack: ${projectBrief.techStack || 'Not specified'}
Frontend: ${projectBrief.frontend || 'Not specified'}
Backend: ${projectBrief.backend || 'Not specified'}
Database: ${projectBrief.database || 'Not specified'}
Hosting: ${projectBrief.hosting || 'Not specified'}
CDN: ${projectBrief.cdn || 'Not specified'}
Authentication: ${projectBrief.authentication || 'Not specified'}
Monitoring: ${projectBrief.monitoring || 'Not specified'}
  `.trim();

  const prompt = `
You are a DevOps expert creating a deployment checklist for a new project.

PROJECT TECH STACK:
${techStackDescription}

Generate a deployment checklist with 20-30 items organized by category:
- Code (build, tests, merge)
- Infrastructure (DNS, SSL, scaling)
- Data (migrations, backups)
- Monitoring (error tracking, logging, uptime)
- Communication (documentation, notifications)

For each item provide:
1. Category
2. Title (short, actionable)
3. Description
4. Critical (true/false)
5. Estimated time (e.g., "15 min")

Return as JSON array with keys: category, title, description, critical, estimatedTime

Focus on items specific to the tech stack above. Skip generic items.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const items = JSON.parse(jsonMatch[0]) as DeploymentChecklistItem[];
    return items.map((item, idx) => ({
      ...item,
      id: `checklist-${idx}`,
    }));
  } catch (error) {
    console.error('Failed to generate deployment checklist:', error);
    return [];
  }
};
```

### 2. Deployment Checklist Component
#### File: `components/helix/deployment/DeploymentChecklist.tsx` (NEW)
Editable deployment checklist UI.

```typescript
import React, { useState } from 'react';
import { Save, Plus, Trash2, CheckCircle } from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: 'code' | 'infrastructure' | 'data' | 'monitoring' | 'communication';
  title: string;
  description: string;
  critical: boolean;
  estimatedTime: string;
  completed?: boolean;
}

interface DeploymentChecklistProps {
  projectId: string;
  checklist: ChecklistItem[];
  onSave: (checklist: ChecklistItem[]) => void;
}

export const DeploymentChecklist: React.FC<DeploymentChecklistProps> = ({
  projectId,
  checklist,
  onSave,
}) => {
  const [items, setItems] = useState(checklist);
  const [editingId, setEditingId] = useState<string | null>(null);

  const categoryColors = {
    code: 'bg-blue-900',
    infrastructure: 'bg-purple-900',
    data: 'bg-green-900',
    monitoring: 'bg-orange-900',
    communication: 'bg-cyan-900',
  };

  const categoryLabels = {
    code: 'Code',
    infrastructure: 'Infrastructure',
    data: 'Data',
    monitoring: 'Monitoring',
    communication: 'Communication',
  };

  const handleToggleComplete = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddItem = () => {
    const newItem: ChecklistItem = {
      id: `new-${Date.now()}`,
      category: 'code',
      title: 'New Item',
      description: '',
      critical: false,
      estimatedTime: '30 min',
    };
    setItems([...items, newItem]);
    setEditingId(newItem.id);
  };

  const completedCount = items.filter((i) => i.completed).length;
  const criticalCount = items.filter((i) => i.critical && !i.completed).length;

  const groupedByCategory = {
    code: items.filter((i) => i.category === 'code'),
    infrastructure: items.filter((i) => i.category === 'infrastructure'),
    data: items.filter((i) => i.category === 'data'),
    monitoring: items.filter((i) => i.category === 'monitoring'),
    communication: items.filter((i) => i.category === 'communication'),
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-xs text-slate-400 mb-1">Completion</p>
          <p className="text-2xl font-bold text-cyan-400">
            {completedCount}/{items.length}
          </p>
        </div>
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-xs text-slate-400 mb-1">Critical Items</p>
          <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-xs text-slate-400 mb-1">Est. Time</p>
          <p className="text-xl font-bold text-white">
            {Math.ceil(
              items
                .filter((i) => !i.completed)
                .reduce((sum, i) => {
                  const minutes = parseInt(i.estimatedTime) || 0;
                  return sum + minutes;
                }, 0) / 60
            )}{' '}
            h
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleAddItem}
          className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Add Item
        </button>
        <button
          onClick={() => onSave(items)}
          className="ml-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
        >
          <Save size={18} />
          Save Checklist
        </button>
      </div>

      {/* Checklist by Category */}
      {Object.entries(groupedByCategory).map(
        ([category, categoryItems]) =>
          categoryItems.length > 0 && (
            <div key={category}>
              <h3 className={`text-lg font-semibold text-white px-4 py-2 rounded ${categoryColors[category as keyof typeof categoryColors]}`}>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h3>

              <div className="space-y-2 mt-3">
                {categoryItems.map((item) =>
                  editingId === item.id ? (
                    <ChecklistItemForm
                      key={item.id}
                      item={item}
                      onSave={(updated) => {
                        setItems((prev) =>
                          prev.map((i) => (i.id === item.id ? updated : i))
                        );
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border-l-4 transition-all ${
                        item.completed
                          ? 'bg-slate-900 border-slate-600 opacity-60'
                          : 'bg-slate-800 border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className={`mt-1 flex-shrink-0 ${
                            item.completed
                              ? 'text-green-400'
                              : 'text-slate-500 hover:text-green-400'
                          }`}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold">{item.title}</h4>
                            {item.critical && (
                              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">
                                CRITICAL
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{item.estimatedTime}</span>
                          </div>
                          <p className="text-sm text-slate-400">{item.description}</p>
                        </div>
                        <button
                          onClick={() => setEditingId(item.id)}
                          className="text-slate-400 hover:text-white transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )
      )}
    </div>
  );
};

const ChecklistItemForm = ({
  item,
  onSave,
  onCancel,
}: {
  item: ChecklistItem;
  onSave: (item: ChecklistItem) => void;
  onCancel: () => void;
}) => {
  const [data, setData] = useState(item);

  return (
    <div className="bg-slate-700 p-4 rounded-lg space-y-3">
      <input
        type="text"
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
        className="w-full bg-slate-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder="Title"
      />

      <textarea
        value={data.description}
        onChange={(e) => setData({ ...data, description: e.target.value })}
        className="w-full bg-slate-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        rows={2}
        placeholder="Description"
      />

      <div className="flex gap-2">
        <button
          onClick={() => onSave(data)}
          className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 rounded transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
```

---

## File Structure
```
lib/helix/deployment/
├── checklist-generator.ts (NEW)

components/helix/deployment/
├── DeploymentChecklist.tsx (NEW)

app/api/helix/projects/[projectId]/
├── deployment/
│   └── generate-checklist/route.ts (NEW)
```

---

## Dependencies
- Anthropic Claude API
- lucide-react (icons)

---

## Tech Stack for This Phase
- TypeScript
- React
- Claude API
- Next.js

---

## Acceptance Criteria
1. Generate button calls Claude API
2. API analyzes tech stack and returns 20-30 items
3. Items are categorized: code, infrastructure, data, monitoring, communication
4. Checklist is editable (add, edit, delete items)
5. Completion checkbox toggles item status
6. Critical items are color-coded and highlighted
7. Estimated time per item calculates total time
8. Items can be marked complete
9. Save button persists checklist to database
10. Completion summary shows progress

---

## Testing Instructions
1. Click Generate and verify Claude API call
2. Check items are properly categorized
3. Verify critical items marked correctly
4. Add new item and verify appears in list
5. Edit item and save changes
6. Delete item and verify removal
7. Mark items complete and check count
8. Verify estimated time totals correctly
9. Test with different tech stacks
10. Save checklist and reload, verify persistence

---

## Notes for the AI Agent
- Cache generated checklists per project
- Allow re-generation with updated tech stack
- Link checklist to deployment execution
- Auto-check items when tasks complete
