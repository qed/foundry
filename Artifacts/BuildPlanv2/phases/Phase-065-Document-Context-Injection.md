# Phase 065 — Document Context Injection

## Objective
Collect all Helix artifacts from Stages 1-2 (brief, docs, knowledge), format them for AI context with token budget management, and display to user before AI processing.

## Prerequisites
- Phase 063 — Build Planning Chat Interface — chat interface with doc panel
- Phase 064 — Building Brief Summary Prompt Engine — prompt engine ready

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 065 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Before Claude can intelligently plan the build, it needs access to all relevant project context: project brief from Stage 1, technical documentation from Stage 2, and knowledge artifacts. This phase loads all artifacts, prioritizes them by relevance, manages token budget (to stay within API limits), and shows the user exactly what context will be sent to Claude.

---

## Detailed Requirements

### 1. Context Injection Service
#### File: `lib/helix/context-injection.ts` (NEW)
Service for collecting, prioritizing, and formatting artifacts.

```typescript
import { createClient } from '@/lib/supabase/server';

export interface ArtifactWithMetadata {
  id: string;
  type: string;
  title: string;
  content: string;
  size: number;
  priority: number; // 1-10, higher = more relevant
  source: string;
}

export interface InjectedContext {
  artifacts: ArtifactWithMetadata[];
  contextString: string;
  totalTokens: number;
  tokenBudget: number;
  isBudgetExceeded: boolean;
  summary: string;
}

export class ContextInjectionService {
  private tokenBudget: number = 8000; // Reserve for response

  async collectProjectContext(projectId: string): Promise<InjectedContext> {
    const supabase = await createClient();

    // Load all artifact types
    const { data: artifacts, error } = await supabase
      .from('helix_artifacts')
      .select('*')
      .eq('project_id', projectId)
      .in('artifact_type', [
        'project_brief',
        'documentation',
        'knowledge_capture',
        'technical_spec',
      ]);

    if (error || !artifacts) {
      return {
        artifacts: [],
        contextString: '',
        totalTokens: 0,
        tokenBudget: this.tokenBudget,
        isBudgetExceeded: false,
        summary: 'No artifacts found',
      };
    }

    // Enrich with metadata and priority
    const enriched = artifacts.map((a) => ({
      id: a.id,
      type: a.artifact_type,
      title: a.metadata?.title || a.artifact_type,
      content: a.content,
      size: a.content.length,
      priority: this.calculatePriority(a.artifact_type),
      source: a.metadata?.source || 'unknown',
    }));

    // Sort by priority (higher first)
    enriched.sort((a, b) => b.priority - a.priority);

    // Fit artifacts within budget
    const contextString = this.formatContext(enriched, this.tokenBudget);
    const totalTokens = Math.ceil(contextString.length / 4); // Rough estimate

    return {
      artifacts: enriched,
      contextString,
      totalTokens,
      tokenBudget: this.tokenBudget,
      isBudgetExceeded: totalTokens > this.tokenBudget,
      summary: this.generateSummary(enriched, totalTokens),
    };
  }

  private calculatePriority(artifactType: string): number {
    const priorities: Record<string, number> = {
      project_brief: 10, // Highest priority
      technical_spec: 9,
      documentation: 7,
      knowledge_capture: 6,
    };
    return priorities[artifactType] || 5;
  }

  private formatContext(
    artifacts: ArtifactWithMetadata[],
    tokenBudget: number
  ): string {
    let context = '';
    let currentTokens = 0;

    for (const artifact of artifacts) {
      const artifactSection = `# ${artifact.title}\n\n${artifact.content}\n\n---\n\n`;
      const tokens = Math.ceil(artifactSection.length / 4);

      if (currentTokens + tokens <= tokenBudget) {
        context += artifactSection;
        currentTokens += tokens;
      }
    }

    return context;
  }

  private generateSummary(
    artifacts: ArtifactWithMetadata[],
    totalTokens: number
  ): string {
    const briefCount = artifacts.filter((a) => a.type === 'project_brief').length;
    const docCount = artifacts.filter((a) => a.type === 'documentation').length;
    const knowledgeCount = artifacts.filter(
      (a) => a.type === 'knowledge_capture'
    ).length;

    return `${briefCount} brief + ${docCount} docs + ${knowledgeCount} knowledge artifacts (~${totalTokens} tokens)`;
  }

  setTokenBudget(budget: number): void {
    this.tokenBudget = budget;
  }
}
```

### 2. Context Display Component
#### File: `components/helix/build-planning/ContextInjectDisplay.tsx` (NEW)
Shows user what context will be sent to Claude.

```typescript
'use client';

import { useState } from 'react';
import { InjectedContext } from '@/lib/helix/context-injection';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ContextInjectDisplayProps {
  context: InjectedContext;
  onProceed: (context: InjectedContext) => void;
}

export function ContextInjectDisplay({
  context,
  onProceed,
}: ContextInjectDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const budgetPercent = (context.totalTokens / context.tokenBudget) * 100;
  const isWarning = budgetPercent > 80;
  const isError = context.isBudgetExceeded;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-blue-900 mb-1">
              Project Context
            </h2>
            <p className="text-xs text-blue-700">{context.summary}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-blue-100 rounded"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-blue-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-blue-600" />
            )}
          </button>
        </div>

        {/* Token Budget Indicator */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-700">Token Usage</span>
            <span
              className={`font-semibold ${
                isError
                  ? 'text-red-700'
                  : isWarning
                  ? 'text-amber-700'
                  : 'text-green-700'
              }`}
            >
              {context.totalTokens} / {context.tokenBudget}
            </span>
          </div>
          <div
            className={`h-2 rounded-full overflow-hidden ${
              isError
                ? 'bg-red-200'
                : isWarning
                ? 'bg-amber-200'
                : 'bg-green-200'
            }`}
          >
            <div
              className={`h-full transition-all ${
                isError
                  ? 'bg-red-600'
                  : isWarning
                  ? 'bg-amber-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
        </div>

        {isError && (
          <div className="mt-3 text-xs bg-red-100 text-red-700 p-2 rounded">
            ⚠️ Context exceeds token budget. Some artifacts will be excluded.
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {context.artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="text-xs bg-white rounded p-2 border border-slate-200"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">
                    {artifact.title}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">
                    {artifact.type}
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-2">
                  {artifact.content.substring(0, 100)}...
                </p>
                <div className="mt-2 flex items-center justify-between text-slate-500">
                  <span>{Math.round(artifact.size / 1024)}KB</span>
                  <span className="text-xs">Priority: {artifact.priority}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="border-t border-slate-200 p-4 bg-white flex gap-2">
        <button
          onClick={() => onProceed(context)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          disabled={isError}
        >
          Proceed with Context
        </button>
      </div>
    </div>
  );
}
```

### 3. Hook for Context Management
#### File: `hooks/useProjectContext.ts` (NEW)
React hook for loading and managing project context.

```typescript
import { useState, useEffect } from 'react';
import {
  ContextInjectionService,
  InjectedContext,
} from '@/lib/helix/context-injection';

export function useProjectContext(projectId: string) {
  const [context, setContext] = useState<InjectedContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      try {
        setIsLoading(true);
        const service = new ContextInjectionService();
        const ctx = await service.collectProjectContext(projectId);
        setContext(ctx);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load context';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadContext();
  }, [projectId]);

  return { context, isLoading, error };
}
```

---

## File Structure
```
lib/helix/
└── context-injection.ts (NEW)

components/helix/build-planning/
└── ContextInjectDisplay.tsx (NEW)

hooks/
└── useProjectContext.ts (NEW)
```

---

## Dependencies
- Supabase client
- React 19+ (hooks)
- lucide-react for icons

---

## Tech Stack for This Phase
- TypeScript
- Service class for context management
- Token estimation (content length / 4)
- React hooks

---

## Acceptance Criteria
1. ContextInjectionService collects all artifact types
2. calculatePriority returns 10 for brief, 9 for specs, 7 for docs, 6 for knowledge
3. formatContext fits artifacts within token budget, highest priority first
4. Total tokens estimated as context length / 4
5. ContextInjectDisplay shows summary: "{count} brief + {count} docs + {count} knowledge"
6. Token budget progress bar color: green (<80%), amber (80-99%), red (>100%)
7. Expandable details show individual artifacts with truncated preview
8. Each artifact shows title, type badge, size (KB), and priority
9. Proceed button disabled when isBudgetExceeded = true
10. useProjectContext hook loads context on mount and handles errors

---

## Testing Instructions
1. Create ContextInjectionService, call collectProjectContext with projectId
2. Verify returned artifacts include all 4 types (brief, docs, knowledge, spec)
3. Verify artifacts sorted by priority (brief first)
4. Verify formatContext stops adding when tokens exceed budget
5. Mount ContextInjectDisplay with sample context, verify summary displays
6. Verify token progress bar color changes based on usage %
7. Click expand, verify individual artifacts displayed with previews
8. Verify "Proceed" button disabled when isBudgetExceeded = true
9. Call useProjectContext, verify context loaded and error handling works
10. Test with project having no artifacts, verify graceful fallback

---

## Notes for the AI Agent
- Token estimation uses simple content length / 4; consider official tokenizer in v2.
- Priority system is hardcoded; consider making configurable per project type.
- Token budget (8000) can be adjusted; reserve space for response generation.
- Artifact selection can be enhanced with user customization in future phases.
