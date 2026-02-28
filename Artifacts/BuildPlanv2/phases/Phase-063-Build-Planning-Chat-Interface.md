# Phase 063 — Build Planning Chat Interface

## Objective
Implement a specialized chat interface for build planning that handles large documentation context, displays available documents, and allows users to include/exclude specific docs from AI context.

## Prerequisites
- Phase 053 — Chat Interface Component — base chat UI available
- Phase 054 — Claude API Streaming Integration — streaming API ready

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 063 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Build planning conversations are more context-heavy than brainstorming because they reference project briefs, technical documentation, and knowledge artifacts from earlier stages. The chat interface for build planning needs to display available context documents, allow users to selectively include/exclude them, and handle larger prompts. This phase extends the base ChatInterface from Phase 053 with these specialized capabilities.

---

## Detailed Requirements

### 1. Build Planning Chat Component
#### File: `components/helix/build-planning/BuildPlanningChat.tsx` (NEW)
Enhanced chat interface with document context management.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/helix/chat/ChatInterface';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { DocumentPanel } from './DocumentPanel';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ContextDocument {
  id: string;
  title: string;
  type: 'brief' | 'documentation' | 'knowledge' | 'artifact';
  content: string;
  size: number; // bytes
  included: boolean;
}

interface BuildPlanningChatProps {
  projectId: string;
  sessionId: string;
  systemPrompt: string;
  documents: ContextDocument[];
  onSendMessage?: (messages: any[], context: string) => void;
  maxHeight?: string;
}

export function BuildPlanningChat({
  projectId,
  sessionId,
  systemPrompt,
  documents,
  onSendMessage,
  maxHeight = 'h-[600px]',
}: BuildPlanningChatProps) {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
    new Set(documents.filter((d) => d.included).map((d) => d.id))
  );
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [contextSummary, setContextSummary] = useState<string>('');

  const { messages, isLoading, error, sendMessage } = useStreamingChat({
    projectId,
    sessionId,
    systemPrompt,
    model: 'claude-sonnet-4-5-20250929', // Sonnet for complex build planning
  });

  // Generate context summary
  useEffect(() => {
    const includedDocs = documents.filter((d) => selectedDocs.has(d.id));
    const totalTokens = includedDocs.reduce((sum, d) => sum + Math.ceil(d.size / 4), 0);
    const docList = includedDocs.map((d) => `${d.title} (${d.type})`).join(', ');

    setContextSummary(
      includedDocs.length > 0
        ? `${includedDocs.length} document${includedDocs.length !== 1 ? 's' : ''} • ~${totalTokens} tokens • ${docList}`
        : 'No context documents selected'
    );
  }, [selectedDocs, documents]);

  const handleToggleDoc = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSendMessage = async (content: string) => {
    const includedDocuments = documents
      .filter((d) => selectedDocs.has(d.id))
      .map((d) => `# ${d.title}\n\n${d.content}`)
      .join('\n\n---\n\n');

    const enhancedSystemPrompt = systemPrompt
      ? `${systemPrompt}\n\n## Available Context\n\n${includedDocuments}`
      : `## Available Context\n\n${includedDocuments}`;

    await sendMessage(content);

    if (onSendMessage) {
      onSendMessage(messages, enhancedSystemPrompt);
    }
  };

  const selectedCount = selectedDocs.size;
  const totalCount = documents.length;

  return (
    <div className="flex gap-4 h-full">
      {/* Document Panel (Sidebar) */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          showDocPanel ? 'w-64 border-r border-slate-200' : 'w-0'
        }`}
      >
        {showDocPanel && (
          <DocumentPanel
            documents={documents}
            selectedDocs={selectedDocs}
            onToggleDoc={handleToggleDoc}
            contextSummary={contextSummary}
          />
        )}
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setShowDocPanel(!showDocPanel)}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
        title={showDocPanel ? 'Hide documents' : 'Show documents'}
      >
        {showDocPanel ? (
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-600" />
        )}
      </button>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Context Info Bar */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Context:</span> {contextSummary}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            💡 Click the docs icon to select which documents to include in AI context
          </p>
        </div>

        {/* Chat Interface */}
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          placeholder="Ask about build planning, phases, architecture..."
          maxHeight={maxHeight}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. Document Panel Component
#### File: `components/helix/build-planning/DocumentPanel.tsx` (NEW)
Sidebar showing available context documents.

```typescript
'use client';

import { useMemo } from 'react';
import { FileText, Book, Database, Zap } from 'lucide-react';
import { ContextDocument } from './BuildPlanningChat';

interface DocumentPanelProps {
  documents: ContextDocument[];
  selectedDocs: Set<string>;
  onToggleDoc: (docId: string) => void;
  contextSummary: string;
}

const typeIcons = {
  brief: <FileText className="w-4 h-4" />,
  documentation: <Book className="w-4 h-4" />,
  knowledge: <Database className="w-4 h-4" />,
  artifact: <Zap className="w-4 h-4" />,
};

const typeColors = {
  brief: 'bg-blue-100 text-blue-700',
  documentation: 'bg-amber-100 text-amber-700',
  knowledge: 'bg-purple-100 text-purple-700',
  artifact: 'bg-green-100 text-green-700',
};

export function DocumentPanel({
  documents,
  selectedDocs,
  onToggleDoc,
  contextSummary,
}: DocumentPanelProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, ContextDocument[]> = {
      brief: [],
      documentation: [],
      knowledge: [],
      artifact: [],
    };

    documents.forEach((doc) => {
      groups[doc.type].push(doc);
    });

    return groups;
  }, [documents]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">
          Context Documents
        </h2>
        <p className="text-xs text-slate-600">
          {selectedDocs.size}/{documents.length} selected
        </p>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(grouped).map(([type, docs]) => {
          if (docs.length === 0) return null;

          return (
            <div key={type}>
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {type}
              </h3>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.has(doc.id)}
                      onChange={() => onToggleDoc(doc.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            typeColors[doc.type]
                          }`}
                        >
                          {typeIcons[doc.type]}
                          {doc.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {Math.round(doc.size / 1024)}KB
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4 flex-shrink-0 bg-slate-50">
        <p className="text-xs text-slate-600 text-center">
          Select documents to include in AI context
        </p>
      </div>
    </div>
  );
}
```

### 3. Document Context Hook
#### File: `hooks/useBuildPlanningDocs.ts` (NEW)
Hook for loading available documents for a project.

```typescript
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ContextDocument } from '@/components/helix/build-planning/BuildPlanningChat';

export function useBuildPlanningDocs(projectId: string) {
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        setIsLoading(true);
        const supabase = await createClient();

        // Load project brief (artifact from Step 1.2)
        const { data: briefArtifact } = await supabase
          .from('helix_artifacts')
          .select('*')
          .eq('project_id', projectId)
          .eq('artifact_type', 'project_brief')
          .single();

        // Load documentation artifacts
        const { data: docsArtifacts } = await supabase
          .from('helix_artifacts')
          .select('*')
          .eq('project_id', projectId)
          .eq('artifact_type', 'documentation');

        // Load knowledge capture artifacts
        const { data: knowledgeArtifacts } = await supabase
          .from('helix_artifacts')
          .select('*')
          .eq('project_id', projectId)
          .eq('artifact_type', 'knowledge_capture');

        const docs: ContextDocument[] = [];

        if (briefArtifact) {
          docs.push({
            id: briefArtifact.id,
            title: 'Project Brief',
            type: 'brief',
            content: briefArtifact.content,
            size: briefArtifact.content.length,
            included: true,
          });
        }

        (docsArtifacts || []).forEach((doc) => {
          docs.push({
            id: doc.id,
            title: doc.metadata?.title || 'Documentation',
            type: 'documentation',
            content: doc.content,
            size: doc.content.length,
            included: true,
          });
        });

        (knowledgeArtifacts || []).forEach((doc) => {
          docs.push({
            id: doc.id,
            title: doc.metadata?.title || 'Knowledge Capture',
            type: 'knowledge',
            content: doc.content,
            size: doc.content.length,
            included: true,
          });
        });

        setDocuments(docs);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load documents';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocs();
  }, [projectId]);

  return { documents, isLoading, error };
}
```

---

## File Structure
```
components/helix/build-planning/
├── BuildPlanningChat.tsx (NEW)
└── DocumentPanel.tsx (NEW)

hooks/
└── useBuildPlanningDocs.ts (NEW)
```

---

## Dependencies
- React 19+ (hooks, state)
- useStreamingChat from Phase 054
- ChatInterface from Phase 053
- Supabase client for loading artifacts
- lucide-react for icons

---

## Tech Stack for This Phase
- TypeScript
- React Hooks (useState, useEffect, useMemo)
- Tailwind CSS
- Set data structure for selected docs

---

## Acceptance Criteria
1. BuildPlanningChat displays document panel on left when opened (togglable)
2. DocumentPanel lists all documents grouped by type (brief, documentation, knowledge, artifact)
3. Each document shows title, type badge, and file size
4. Checkboxes allow selecting/deselecting documents
5. Context summary displays count and total tokens of selected documents
6. Tokens estimated as file size / 4 (rough approximation)
7. Chat sends message with selected document context injected into system prompt
8. useBuildPlanningDocs loads all artifacts of relevant types
9. Brief artifact is included by default (included: true)
10. Mobile layout collapses document panel when showDocPanel = false

---

## Testing Instructions
1. Mount BuildPlanningChat with sample documents, verify document panel displays
2. Toggle panel closed/open, verify panel slides in/out smoothly
3. Check/uncheck documents, verify selectedDocs Set updates
4. Verify context summary updates token count when docs toggled
5. Call useBuildPlanningDocs with projectId, verify artifacts loaded
6. Send message, verify selected doc content injected into system prompt
7. Test with large document, verify token estimation reasonable
8. Verify document panel scrolls when many documents present
9. Test on mobile viewport, verify panel collapses by default
10. Verify document types color-coded and icon-coded correctly

---

## Notes for the AI Agent
- Token estimation uses simple file size / 4; consider using official tokenizer in v2.
- Document panel is collapsible to maximize chat area on smaller screens.
- Selected documents are injected at the end of system prompt; consider prioritization in v2.
- The BuildPlanningChat reuses useStreamingChat hook; this ensures consistency with Phase 054.
