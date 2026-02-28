# Phase 093 — Build Session Tracking

## Objective
Implement session tracking for individual build phases, recording start/end times, session notes, and outcomes. Enable historical analysis of how long each phase takes and build context for handoff between development sessions.

## Prerequisites
- Phase 092 — Phase Spec Viewer — provides UI foundation for phase-related components
- Phase 091 — Build Phase Management Foundation — establishes helix_build_phases table structure

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 093 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Build phases are rarely completed in a single session. Engineers work on a phase, pause, and resume later. Currently, there is no tracking of these session boundaries, making it difficult to understand phase duration, identify blockers, or provide context to the next engineer.

This phase adds session tracking: each time work starts on a phase, a session is created; when paused or completed, session end time and notes are recorded. Session outcomes (success, partial, failed) indicate the phase of completion. This data enables velocity analytics and proper handoff summaries.

---

## Detailed Requirements

### 1. Session Tracking Database Extension
#### File: `lib/helix/db/schema.ts` (UPDATED)
Add session tracking fields and new helix_sessions table.

```typescript
import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const helixBuildPhases = pgTable('helix_build_phases', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  projectId: text('project_id').notNull(),
  phaseNumber: integer('phase_number').notNull(),
  phaseTitle: text('phase_title').notNull(),
  status: text('status').default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  currentSessionId: integer('current_session_id'),
  notes: text('notes'),
  evidence: jsonb('evidence'),
});

export const helixSessions = pgTable('helix_sessions', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phaseId: integer('phase_id').references(() => helixBuildPhases.id),
  projectId: text('project_id').notNull(),
  phaseNumber: integer('phase_number').notNull(),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'),
  outcome: text('outcome'),
  notes: text('notes'),
  agentName: text('agent_name'),
  commits: jsonb('commits'),
  filesModified: jsonb('files_modified'),
  screenCapture: text('screen_capture'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 2. Session Tracker Component
#### File: `components/helix/build/SessionTracker.tsx` (NEW)
UI component for starting, ending, and viewing sessions.

```typescript
import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, CheckCircle, AlertCircle } from 'lucide-react';
import { useHelixSession } from '@/hooks/useHelixSession';

interface SessionTrackerProps {
  phaseNumber: number;
  phaseTitle: string;
  projectId: string;
}

export const SessionTracker: React.FC<SessionTrackerProps> = ({
  phaseNumber,
  phaseTitle,
  projectId,
}) => {
  const {
    currentSession,
    sessions,
    startSession,
    endSession,
    addSessionNote,
    loading,
  } = useHelixSession(projectId, phaseNumber);

  const [sessionNote, setSessionNote] = useState('');
  const [outcome, setOutcome] = useState<'success' | 'partial' | 'failed' | 'paused'>('paused');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!currentSession) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(currentSession.startedAt).getTime()) / 1000
      );
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async () => {
    await startSession({ agentName: 'User' });
  };

  const handleEndSession = async () => {
    await endSession({
      outcome,
      notes: sessionNote,
    });
    setSessionNote('');
    setOutcome('paused');
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Build Session</h3>

      {currentSession ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-700 p-4 rounded">
            <div>
              <p className="text-sm text-slate-300">Session Running</p>
              <p className="text-2xl font-mono text-cyan-400">{formatTime(elapsedTime)}</p>
            </div>
            <Clock className="text-cyan-400" size={32} />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Session Notes</label>
            <textarea
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              className="w-full bg-slate-700 text-white rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={4}
              placeholder="What did you accomplish in this session?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Session Outcome</label>
            <div className="grid grid-cols-4 gap-2">
              {['success', 'partial', 'failed', 'paused'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setOutcome(opt as any)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    outcome === opt
                      ? 'bg-cyan-500 text-slate-900'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleEndSession}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Ending Session...' : 'End Session'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleStartSession}
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-3 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Play size={18} />
          Start Session
        </button>
      )}

      {sessions.length > 0 && (
        <div className="mt-6 border-t border-slate-700 pt-6">
          <h4 className="text-sm font-semibold text-white mb-3">Session History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessions.map((session) => (
              <div key={session.id} className="bg-slate-700 p-3 rounded text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-300">
                    {new Date(session.startedAt).toLocaleString()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      session.outcome === 'success'
                        ? 'bg-green-600'
                        : session.outcome === 'failed'
                          ? 'bg-red-600'
                          : 'bg-yellow-600'
                    }`}
                  >
                    {session.outcome}
                  </span>
                </div>
                {session.notes && (
                  <p className="text-slate-400 text-xs mb-1">{session.notes}</p>
                )}
                <p className="text-slate-500 text-xs">
                  Duration: {Math.round(session.duration / 60)}m
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 3. Session Management Hooks
#### File: `hooks/useHelixSession.ts` (NEW)
React hook for session operations.

```typescript
import { useState, useCallback, useEffect } from 'react';

export const useHelixSession = (projectId: string, phaseNumber: number) => {
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/helix/projects/${projectId}/phases/${phaseNumber}/sessions`
      );
      const data = await res.json();
      setSessions(data.sessions || []);
      setCurrentSession(data.currentSession || null);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, [projectId, phaseNumber]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const startSession = useCallback(
    async (options: { agentName: string }) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/phases/${phaseNumber}/sessions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
          }
        );
        const data = await res.json();
        setCurrentSession(data.session);
      } catch (error) {
        console.error('Failed to start session:', error);
      } finally {
        setLoading(false);
      }
    },
    [projectId, phaseNumber]
  );

  const endSession = useCallback(
    async (options: { outcome: string; notes: string }) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/phases/${phaseNumber}/sessions/${currentSession?.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
          }
        );
        const data = await res.json();
        setSessions([...sessions, data.session]);
        setCurrentSession(null);
        await fetchSessions();
      } catch (error) {
        console.error('Failed to end session:', error);
      } finally {
        setLoading(false);
      }
    },
    [projectId, phaseNumber, currentSession, sessions, fetchSessions]
  );

  const addSessionNote = useCallback(
    async (note: string) => {
      if (!currentSession) return;
      try {
        await fetch(
          `/api/helix/projects/${projectId}/phases/${phaseNumber}/sessions/${currentSession.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: note }),
          }
        );
        await fetchSessions();
      } catch (error) {
        console.error('Failed to add session note:', error);
      }
    },
    [projectId, phaseNumber, currentSession, fetchSessions]
  );

  return {
    currentSession,
    sessions,
    startSession,
    endSession,
    addSessionNote,
    loading,
  };
};
```

---

## File Structure
```
components/helix/build/
├── SessionTracker.tsx (NEW)

hooks/
├── useHelixSession.ts (NEW)

lib/helix/db/
├── schema.ts (UPDATED)

app/api/helix/projects/[projectId]/phases/[phaseNumber]/
├── sessions/
│   ├── route.ts (NEW)
│   └── [sessionId]/route.ts (NEW)
```

---

## Dependencies
- Supabase (PostgreSQL)
- Drizzle ORM
- lucide-react (icons)
- TypeScript

---

## Tech Stack for This Phase
- TypeScript
- React
- Next.js
- Supabase
- Drizzle ORM

---

## Acceptance Criteria
1. Session starts when user clicks "Start Session" button
2. Session timer displays elapsed time in HH:MM:SS format
3. Session notes textarea captures freeform input
4. Outcome dropdown allows selection of success, partial, failed, paused
5. "End Session" button saves session with all data to helix_sessions table
6. Session history list displays previous sessions with timestamp, outcome, duration
7. Session outcomes are color-coded (green=success, red=failed, yellow=partial/paused)
8. Current session data prevents duplicate session creation
9. Sessions API endpoint returns current and historical sessions
10. Session duration is calculated and stored in seconds

---

## Testing Instructions
1. Start a session and verify timer increments correctly
2. Add session notes and end session, confirming notes are saved
3. Change outcome dropdown values and verify selection state changes
4. End session with different outcomes and verify color coding
5. Verify session history list displays all previous sessions chronologically
6. Check that a new session cannot start if one is already active
7. Verify session duration calculation matches elapsed time
8. Test API endpoint returns correct session data
9. Verify page refresh reloads current and historical sessions
10. Test with multiple phases to ensure session isolation per phase

---

## Notes for the AI Agent
- Use Supabase Realtime to update UI when sessions change across tabs
- Consider adding session commit capture in Phase 096
- Session outcome affects phase status in helix_build_phases table
- Integrate with Build Handoff system in Phase 100
