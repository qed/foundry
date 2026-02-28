# Phase 104 — Integration Test Checklist Generator

## Objective
AI-generated integration test checklist based on all build phases, their acceptance criteria, cross-phase dependencies, and data flow. Checklist items include expected behavior and steps to reproduce. Enable user editing before finalizing.

## Prerequisites
- Phase 103 — Test Results Capture And Storage — provides test documentation
- Phase 094 — Automated Phase Discovery — provides dependency data

## Epic Context
**Epic:** 12 — Testing Intelligence — Steps 7.1-7.2 Enhancement
**Phase:** 104 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Integration testing often gets overlooked because it requires understanding how all phases interact. Without a systematic checklist, critical integration points are missed. Building a checklist requires analyzing all 157 phases, their outputs, and cross-phase dependencies.

This phase generates an integration checklist by querying all phases, identifying cross-phase dependencies, and using Claude API to suggest integration test cases. Output is editable before finalizing.

---

## Detailed Requirements

### 1. Integration Test Generator Service
#### File: `lib/helix/testing/integration-generator.ts` (NEW)
AI-powered integration test checklist generation.

```typescript
import Anthropic from '@anthropic-ai/sdk';

export interface IntegrationTestCase {
  id: string;
  fromPhase: number;
  toPhase: number;
  testName: string;
  expectedBehavior: string;
  stepsToReproduce: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  dataFlow: string;
}

const client = new Anthropic();

export const generateIntegrationChecklist = async (
  phases: any[],
  dependencies: Map<number, number[]>
): Promise<IntegrationTestCase[]> => {
  const phaseSummaries = phases
    .map(
      (p) =>
        `Phase ${p.number}: ${p.title} - Outputs: ${p.outputs?.join(', ') || 'TBD'}`
    )
    .join('\n');

  const dependencySummaries = Array.from(dependencies.entries())
    .map(
      ([phase, deps]) =>
        `Phase ${phase} depends on: ${deps.join(', ')}`
    )
    .join('\n');

  const prompt = `
You are a test architect analyzing a 157-phase software build plan.

PHASES OVERVIEW:
${phaseSummaries}

DEPENDENCIES:
${dependencySummaries}

Generate integration test cases that verify cross-phase data flow and dependencies work correctly.

For each test case, provide:
1. From/to phases being tested
2. Test name
3. Expected behavior
4. Steps to reproduce
5. Priority (critical/high/medium/low)
6. Data flow description

Return as JSON array of objects with keys: fromPhase, toPhase, testName, expectedBehavior, stepsToReproduce[], priority, dataFlow

Generate 20-30 test cases focusing on critical integration points.`;

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

    const testCases = JSON.parse(jsonMatch[0]) as IntegrationTestCase[];
    return testCases.map((tc, idx) => ({
      ...tc,
      id: `integration-${idx}`,
    }));
  } catch (error) {
    console.error('Failed to generate integration checklist:', error);
    return [];
  }
};
```

### 2. Integration Checklist UI Component
#### File: `components/helix/testing/IntegrationChecklist.tsx` (NEW)
Editable integration test checklist.

```typescript
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

interface IntegrationTestCase {
  id: string;
  fromPhase: number;
  toPhase: number;
  testName: string;
  expectedBehavior: string;
  stepsToReproduce: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  dataFlow: string;
}

interface IntegrationChecklistProps {
  projectId: string;
}

export const IntegrationChecklist: React.FC<IntegrationChecklistProps> = ({
  projectId,
}) => {
  const [testCases, setTestCases] = useState<IntegrationTestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerateChecklist = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/helix/projects/${projectId}/testing/generate-integration`,
        { method: 'POST' }
      );
      const data = await res.json();
      setTestCases(data.testCases || []);
      setGenerated(true);
    } catch (error) {
      console.error('Failed to generate checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCase = (id: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const handleUpdateCase = (updated: IntegrationTestCase) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === updated.id ? updated : tc))
    );
    setEditingId(null);
  };

  const priorityColors = {
    critical: 'bg-red-900 text-red-100',
    high: 'bg-orange-900 text-orange-100',
    medium: 'bg-yellow-900 text-yellow-100',
    low: 'bg-blue-900 text-blue-100',
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Integration Test Checklist</h2>
        <p className="text-slate-300 mb-4">
          AI-generated test cases for cross-phase integration points.
        </p>

        {!generated ? (
          <button
            onClick={handleGenerateChecklist}
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-3 px-6 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Generating...' : 'Generate Integration Checklist'}
          </button>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-4">
              {testCases.length} test cases generated
            </p>

            {testCases.length > 0 && (
              <button
                onClick={() =>
                  fetch(`/api/helix/projects/${projectId}/testing/integration-checklist`, {
                    method: 'POST',
                    body: JSON.stringify({ testCases }),
                  })
                }
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                Finalize Checklist
              </button>
            )}
          </>
        )}
      </div>

      {testCases.length > 0 && (
        <div className="space-y-3">
          {testCases.map((tc) => (
            <div key={tc.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              {editingId === tc.id ? (
                <IntegrationTestForm
                  testCase={tc}
                  onSave={handleUpdateCase}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{tc.testName}</h3>
                      <p className="text-sm text-slate-400">
                        Phase {tc.fromPhase} → Phase {tc.toPhase}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        priorityColors[tc.priority]
                      }`}
                    >
                      {tc.priority.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 mb-3">{tc.expectedBehavior}</p>

                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Steps:</p>
                    <ol className="text-sm text-slate-300 space-y-1">
                      {tc.stepsToReproduce.map((step, idx) => (
                        <li key={idx} className="ml-4">
                          {idx + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <p className="text-xs text-slate-400 mb-3">
                    <span className="font-semibold">Data Flow:</span> {tc.dataFlow}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(tc.id)}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-1 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCase(tc.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const IntegrationTestForm = ({
  testCase,
  onSave,
  onCancel,
}: {
  testCase: IntegrationTestCase;
  onSave: (tc: IntegrationTestCase) => void;
  onCancel: () => void;
}) => {
  const [data, setData] = useState(testCase);

  return (
    <div className="space-y-3 bg-slate-700 p-3 rounded">
      <input
        type="text"
        value={data.testName}
        onChange={(e) => setData({ ...data, testName: e.target.value })}
        className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder="Test name"
      />

      <textarea
        value={data.expectedBehavior}
        onChange={(e) => setData({ ...data, expectedBehavior: e.target.value })}
        className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        rows={2}
        placeholder="Expected behavior"
      />

      <textarea
        value={data.dataFlow}
        onChange={(e) => setData({ ...data, dataFlow: e.target.value })}
        className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder="Data flow description"
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
lib/helix/testing/
├── integration-generator.ts (NEW)

components/helix/testing/
├── IntegrationChecklist.tsx (NEW)

app/api/helix/projects/[projectId]/
├── testing/
│   └── generate-integration/route.ts (NEW)
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
2. API returns 20-30 integration test cases
3. Test cases include fromPhase, toPhase, testName, expectedBehavior, steps, priority, dataFlow
4. Test cases render in collapsible cards
5. Priority badge color-codes (critical=red, high=orange, etc.)
6. Edit button opens form to modify test case
7. Delete button removes test case
8. Finalize button saves checklist to database
9. Generated checklist is editable before finalization
10. Checklist includes critical integration points

---

## Testing Instructions
1. Click "Generate Integration Checklist" button
2. Wait for Claude API response
3. Verify 20+ test cases returned
4. Check priority levels are distributed
5. Edit a test case and save
6. Delete a test case
7. Verify test case data structure is valid
8. Click Finalize and verify save
9. Test with different phase counts
10. Verify API integration with Anthropic SDK

---

## Notes for the AI Agent
- Use streaming for faster feedback on long generation
- Cache generated checklists per project
- Allow re-generation with updated phase data
- Link test cases to actual test execution
