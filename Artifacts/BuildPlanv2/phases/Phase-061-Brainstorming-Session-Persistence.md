# Phase 061 — Brainstorming Session Persistence

## Objective
Save chat sessions to database, enable resuming interrupted sessions with full message/state restoration, and provide session history UI for step 1.2.

## Prerequisites
- Phase 060 — Save & Edit Generated Brief — brief editor complete
- Supabase project with helix_chat_sessions table

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 061 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Brainstorming sessions can be lengthy and users may need to pause and return later. This phase persists entire chat sessions to the database (messages, phase state, generated content) allowing seamless resumption. A session history view shows previous brainstorming sessions for the step, with ability to "Continue" a paused session or "Start New Session" to begin fresh.

---

## Detailed Requirements

### 1. Session Persistence Service
#### File: `lib/helix/session-service.ts` (NEW)
Service for saving and loading chat sessions.

```typescript
import { createClient } from '@/lib/supabase/server';
import { BrainstormingStateManager } from './brainstorming-state';

export interface ChatSessionRecord {
  id: string;
  projectId: string;
  stepId: string;
  phaseName: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  phase: 'discovery' | 'proposal' | 'review' | 'final-brief';
  phaseState: any;
  generatedBrief?: string;
  createdAt: string;
  updatedAt: string;
  isComplete: boolean;
}

export class SessionService {
  async createSession(
    projectId: string,
    stepId: string,
    phaseName: string
  ): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('helix_chat_sessions')
      .insert({
        project_id: projectId,
        step_id: stepId,
        phase_name: phaseName,
        messages: [],
        phase: 'discovery',
        phase_state: {},
        is_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async saveSession(
    sessionId: string,
    messages: any[],
    phase: string,
    phaseState: any,
    generatedBrief?: string,
    isComplete: boolean = false
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('helix_chat_sessions')
      .update({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        phase,
        phase_state: phaseState,
        generated_brief: generatedBrief,
        is_complete: isComplete,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async loadSession(sessionId: string): Promise<ChatSessionRecord> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('helix_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      projectId: data.project_id,
      stepId: data.step_id,
      phaseName: data.phase_name,
      messages: data.messages || [],
      phase: data.phase,
      phaseState: data.phase_state,
      generatedBrief: data.generated_brief,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isComplete: data.is_complete,
    };
  }

  async getSessionHistory(
    projectId: string,
    stepId: string
  ): Promise<ChatSessionRecord[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('helix_chat_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('step_id', stepId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((d) => ({
      id: d.id,
      projectId: d.project_id,
      stepId: d.step_id,
      phaseName: d.phase_name,
      messages: d.messages || [],
      phase: d.phase,
      phaseState: d.phase_state,
      generatedBrief: d.generated_brief,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      isComplete: d.is_complete,
    }));
  }

  async deleteSession(sessionId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('helix_chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }
}
```

### 2. Session Hook
#### File: `hooks/useChatSession.ts` (NEW)
React hook for managing session state and auto-save.

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import { SessionService } from '@/lib/helix/session-service';
import { Message } from '@/components/helix/chat/ChatMessage';

interface UseChatSessionOptions {
  projectId: string;
  stepId: string;
  sessionId?: string;
  phaseName: string;
  autoSaveInterval?: number; // milliseconds
}

export function useChatSession({
  projectId,
  stepId,
  sessionId: initialSessionId,
  phaseName,
  autoSaveInterval = 30000, // Auto-save every 30 seconds
}: UseChatSessionOptions) {
  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const serviceRef = useRef(new SessionService());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        if (!sessionId) {
          setIsLoading(true);
          const newSessionId = await serviceRef.current.createSession(
            projectId,
            stepId,
            phaseName
          );
          setSessionId(newSessionId);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create session';
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [projectId, stepId, phaseName, sessionId]);

  // Auto-save function
  const autoSave = useCallback(
    async (
      messages: Message[],
      phase: string,
      phaseState: any,
      generatedBrief?: string,
      isComplete: boolean = false
    ) => {
      if (!sessionId) return;

      try {
        await serviceRef.current.saveSession(
          sessionId,
          messages,
          phase,
          phaseState,
          generatedBrief,
          isComplete
        );
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    },
    [sessionId]
  );

  // Set up auto-save interval
  useEffect(() => {
    const setupAutoSave = () => {
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave([], 'discovery', {});
      }, autoSaveInterval);
    };

    setupAutoSave();

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSaveInterval, autoSave]);

  const loadSession = useCallback(async (sessionIdToLoad: string) => {
    try {
      setIsLoading(true);
      const session = await serviceRef.current.loadSession(sessionIdToLoad);
      return session;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load session';
      setLoadError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHistory = useCallback(async () => {
    try {
      return await serviceRef.current.getSessionHistory(projectId, stepId);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      return [];
    }
  }, [projectId, stepId]);

  const deleteSession = useCallback(async (sessionIdToDelete: string) => {
    try {
      await serviceRef.current.deleteSession(sessionIdToDelete);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, []);

  return {
    sessionId,
    isLoading,
    loadError,
    autoSave,
    loadSession,
    getHistory,
    deleteSession,
  };
}
```

### 3. Session History UI Component
#### File: `components/helix/brainstorming/SessionHistory.tsx` (NEW)
Display previous sessions with continue/new session options.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ChatSessionRecord } from '@/lib/helix/session-service';
import { useChatSession } from '@/hooks/useChatSession';
import { formatDistanceToNow } from 'date-fns';
import { Play, Trash2, Plus } from 'lucide-react';

interface SessionHistoryProps {
  projectId: string;
  stepId: string;
  phaseName: string;
  onContinueSession: (session: ChatSessionRecord) => void;
  onNewSession: () => void;
}

export function SessionHistory({
  projectId,
  stepId,
  phaseName,
  onContinueSession,
  onNewSession,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getHistory, deleteSession } = useChatSession({
    projectId,
    stepId,
    phaseName,
  });

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getHistory();
        setSessions(history);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [getHistory]);

  const handleDelete = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Brainstorming Sessions
        </h2>
        <p className="text-sm text-slate-600">
          Resume a previous session or start fresh.
        </p>
      </div>

      {/* Start New Button */}
      <button
        onClick={onNewSession}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Start New Session
      </button>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No previous sessions. Start a new one!
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">
                      {session.phaseName} Phase
                      {session.isComplete && (
                        <span className="ml-2 inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Complete
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {session.messages.length} messages •{' '}
                      {formatDistanceToNow(new Date(session.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                    <div className="text-xs text-slate-600 mt-2">
                      Phase: <span className="font-mono">{session.phase}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onContinueSession(session)}
                      className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                      title="Continue session"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## File Structure
```
lib/helix/
├── session-service.ts (NEW)
└── [previous utilities]

hooks/
└── useChatSession.ts (NEW)

components/helix/brainstorming/
└── SessionHistory.tsx (NEW)
```

---

## Dependencies
- React 19+ (hooks, state)
- Supabase client
- date-fns for formatting timestamps
- lucide-react for icons

---

## Tech Stack for This Phase
- TypeScript
- React Hooks with custom service management
- Supabase database
- Date formatting utilities

---

## Acceptance Criteria
1. SessionService.createSession inserts new row with default state and returns ID
2. SessionService.saveSession updates existing session with messages, phase, phaseState
3. SessionService.loadSession retrieves full session record from database
4. SessionService.getSessionHistory returns all sessions for a project/step, sorted newest first
5. useChatSession creates session on mount if sessionId not provided
6. useChatSession provides autoSave method that persists session state
7. useChatSession auto-saves at configurable interval (default 30s)
8. SessionHistory displays list of previous sessions with message count and timestamp
9. SessionHistory "Continue" button calls onContinueSession with full session record
10. SessionHistory "Delete" button removes session from DB and UI

---

## Testing Instructions
1. Create SessionService, call createSession, verify row in helix_chat_sessions table
2. Call saveSession with messages array, verify DB row updated
3. Call loadSession with sessionId, verify returned record matches saved data
4. Call getSessionHistory, verify returns sorted by updated_at DESC
5. Mount useChatSession without sessionId, verify session created automatically
6. Call autoSave, wait 30s, verify DB updated
7. Change autoSaveInterval to 5s, verify saves more frequently
8. Mount SessionHistory component, verify displays previous sessions
9. Click "Continue Session", verify onContinueSession callback fires with session record
10. Delete session via SessionHistory, verify removed from DB and list

---

## Notes for the AI Agent
- Session persistence uses Supabase JSONB for messages and phaseState, allowing flexible structure.
- Auto-save interval is configurable per session; consider reducing to 15s for longer sessions.
- Session history is limited to project/step level; consider adding global history in v2.
- Messages are stored with timestamps for audit trail and future replay functionality.
- Consider adding session export (JSON/PDF) in future iterations.
