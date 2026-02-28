# Phase 095 — Build Progress Real-Time Updates

## Objective
Implement Supabase Realtime subscriptions to broadcast phase status changes across all connected clients. Enable multiple team members to see live progress without page refresh and display presence indicators for who is working on which phase.

## Prerequisites
- Phase 093 — Build Session Tracking — establishes session state tracking
- Phase 091 — Build Phase Management Foundation — provides helix_build_phases table

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 095 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
When one engineer completes a phase, other team members don't see the update until they manually refresh. This creates bottlenecks where dependent phases can't start because the previous phase completion isn't visible.

This phase integrates Supabase Realtime to broadcast helix_build_phases changes. When a phase status updates, all connected clients receive the update instantly via WebSocket. Presence indicators show which team members are actively working on which phases.

---

## Detailed Requirements

### 1. Realtime Hook
#### File: `hooks/useHelixRealtime.ts` (NEW)
Custom hook for subscribing to phase and presence changes.

```typescript
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export interface PresenceUser {
  userId: string;
  username: string;
  phaseNumber: number;
  status: 'idle' | 'active' | 'away';
  lastSeen: string;
}

export const useHelixRealtime = (projectId: string) => {
  const [phases, setPhases] = useState<any[]>([]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Subscribe to phase changes
    const phaseSubscription = supabase
      .channel(`project:${projectId}:phases`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'helix_build_phases',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPhases((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          } else if (payload.eventType === 'INSERT') {
            setPhases((prev) => [...prev, payload.new]);
          }
        }
      )
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const state = phaseSubscription.presenceState();
          const users: PresenceUser[] = [];
          for (const key in state) {
            if (state[key].length > 0) {
              users.push(state[key][0]);
            }
          }
          setPresence(users);
        }
      )
      .on(
        'presence',
        { event: 'join' },
        ({ key, newPresences }) => {
          setPresence((prev) => [
            ...prev,
            ...newPresences.filter((u: any) => !prev.find((p) => p.userId === u.userId)),
          ]);
        }
      )
      .on(
        'presence',
        { event: 'leave' },
        ({ key, leftPresences }) => {
          setPresence((prev) =>
            prev.filter((u) => !leftPresences.find((lp: any) => lp.userId === u.userId))
          );
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setLoading(false);
        }
      });

    return () => {
      phaseSubscription.unsubscribe();
    };
  }, [projectId]);

  const updatePhaseStatus = useCallback(
    async (phaseNumber: number, status: string) => {
      const { error } = await supabase
        .from('helix_build_phases')
        .update({ status })
        .eq('project_id', projectId)
        .eq('phase_number', phaseNumber);

      if (error) console.error('Failed to update phase:', error);
    },
    [projectId]
  );

  const updatePresence = useCallback(
    async (userId: string, username: string, phaseNumber: number, status: 'idle' | 'active' | 'away') => {
      const phaseSubscription = supabase.channel(`project:${projectId}:phases`);

      phaseSubscription.track({
        userId,
        username,
        phaseNumber,
        status,
        lastSeen: new Date().toISOString(),
      });
    },
    [projectId]
  );

  return {
    phases,
    presence,
    loading,
    updatePhaseStatus,
    updatePresence,
  };
};
```

### 2. Presence Indicator Component
#### File: `components/helix/build/PresenceIndicator.tsx` (NEW)
Display avatars and names of users working on each phase.

```typescript
import React from 'react';
import { Users, User } from 'lucide-react';

interface PresenceIndicatorProps {
  phaseNumber: number;
  users: Array<{
    userId: string;
    username: string;
    phaseNumber: number;
    status: 'idle' | 'active' | 'away';
  }>;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  phaseNumber,
  users,
}) => {
  const activeUsers = users.filter((u) => u.phaseNumber === phaseNumber);

  if (activeUsers.length === 0) {
    return null;
  }

  const statusColor = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    away: 'bg-gray-500',
  };

  return (
    <div className="flex items-center gap-2">
      <Users size={16} className="text-slate-400" />
      <div className="flex -space-x-2">
        {activeUsers.map((user) => (
          <div
            key={user.userId}
            className="relative group"
            title={`${user.username} (${user.status})`}
          >
            <div
              className={`w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-semibold text-white`}
            >
              {user.username.substring(0, 1)}
            </div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor[user.status]} rounded-full border border-slate-800`} />
          </div>
        ))}
      </div>
      <span className="text-xs text-slate-400">{activeUsers.length} working</span>
    </div>
  );
};
```

### 3. Live Phase Status Card
#### File: `components/helix/build/LivePhaseCard.tsx` (NEW)
Phase card with real-time status updates.

```typescript
import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { PresenceIndicator } from './PresenceIndicator';

interface LivePhaseCardProps {
  phase: any;
  presence: any[];
  onStatusChange: (status: string) => void;
}

export const LivePhaseCard: React.FC<LivePhaseCardProps> = ({
  phase,
  presence,
  onStatusChange,
}) => {
  const [localStatus, setLocalStatus] = useState(phase.status);

  useEffect(() => {
    setLocalStatus(phase.status);
  }, [phase.status]);

  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-700' },
    in_progress: { icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-900' },
    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900' },
    blocked: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900' },
  };

  const config = statusConfig[phase.status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} border-l-4 border-slate-600 p-4 rounded transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">
            Phase {phase.phaseNumber}
          </h3>
          <p className="text-slate-300 text-sm">{phase.phaseTitle}</p>
        </div>
        <Icon className={config.color} size={24} />
      </div>

      <div className="flex items-center justify-between">
        <PresenceIndicator phaseNumber={phase.phaseNumber} users={presence} />
        <span className={`text-xs font-semibold px-2 py-1 rounded ${config.bg}`}>
          {phase.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
};
```

---

## File Structure
```
hooks/
├── useHelixRealtime.ts (NEW)

components/helix/build/
├── PresenceIndicator.tsx (NEW)
├── LivePhaseCard.tsx (NEW)
```

---

## Dependencies
- Supabase (Realtime)
- Supabase JavaScript SDK
- lucide-react (icons)

---

## Tech Stack for This Phase
- TypeScript
- React
- Supabase Realtime
- WebSocket

---

## Acceptance Criteria
1. useHelixRealtime hook successfully subscribes to phase changes
2. Phase updates trigger component re-renders without page refresh
3. Presence indicator shows all users working on a phase
4. User avatars display first letter of username
5. Status indicator shows idle/active/away state with color
6. Presence indicator disappears when no users are on phase
7. Multiple users can be tracked simultaneously
8. Presence updates when user navigates to different phase
9. Realtime subscription is cleaned up on component unmount
10. Phase status changes reflected in all connected clients within 100ms

---

## Testing Instructions
1. Subscribe to helix_build_phases channel and verify connection
2. Update phase status in database and confirm UI updates
3. Open same phase in two browser windows and update status in one
4. Verify update appears in second window without refresh
5. Test presence tracking with multiple simulated users
6. Verify presence disappears when user unsubscribes
7. Test with unreliable network (slow down in DevTools)
8. Verify no memory leaks with subscriptions
9. Test with 50+ phases loaded simultaneously
10. Test WebSocket reconnection after network interruption

---

## Notes for the AI Agent
- Implement exponential backoff for reconnection attempts
- Consider presence timeout (mark away after 5 minutes inactivity)
- Use Postgres Row Security for permission checking
- Cache presence state to avoid repeated queries
