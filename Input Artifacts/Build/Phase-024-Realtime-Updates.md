# Phase 024 - Hall Real-Time Updates

## Objective
Implement real-time synchronization of idea changes across all connected clients using Supabase Realtime. Show live updates, presence indicators, and optimistic UI with server reconciliation.

## Prerequisites
- Phase 002: Project & Organization Structure (projects table)
- Phase 011: Hall Database Schema (ideas table with RLS)
- Phase 012: Hall Page Layout (idea list display)
- Phase 014: Idea List View (core list/grid components)

## Context
When teams collaborate on The Hall, seeing updates in real-time prevents duplicate work and keeps everyone synchronized. A user edits an idea, and team members see the change immediately. New ideas appear as soon as created. Presence indicators show who's currently viewing The Hall.

## Detailed Requirements

### Supabase Realtime Subscriptions

**Setup**

```typescript
import { RealtimeClient } from '@supabase/realtime-js';

const realtimeClient = new RealtimeClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
});

// Subscribe to ideas table changes for specific project
const subscription = realtimeClient
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'ideas',
      filter: `project_id=eq.${projectId}`,
    },
    (payload) => {
      handleIdeaChange(payload);
    }
  )
  .subscribe();
```

**Change Types**

```typescript
interface RealtimePayload {
  type: 'INITIAL_STATE' | 'INSERT' | 'UPDATE' | 'DELETE';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  record: Idea; // New/updated record
  old_record?: Idea; // Previous state (for UPDATE/DELETE)
}
```

### Real-Time Handlers

**INSERT: New Idea**
- Check if optimistic version already in list (prevent duplicate)
- If not, add to list at top
- Animate entrance (slide-in, fade)
- Update count badges

**UPDATE: Edited Idea**
- Find idea in current list by ID
- Update all properties (title, body, status, tags)
- If card is scrolled into view, highlight briefly (yellow flash)
- If user is viewing detail, update detail view with new content
- Preserve local edits if user is actively editing

**DELETE: Archived Idea**
- Remove from current filtered view
- If filtered to show only "active" ideas, remove from display
- If viewing that idea's detail, show "Idea Archived" message
- Toast: "An idea you were viewing was archived"

**Conflict Resolution**
- Optimistic updates: client sends change, shows immediately
- Server confirms: if mismatch, server version wins
- Reconciliation: if user edited idea while it was being edited elsewhere:
  - Show conflict dialog: "This idea was changed by [User]. Reload to see changes?"
  - Options: Reload, Keep My Changes, Merge (if possible)

### Presence Indicators

**Avatar Bar**
- Show avatars of users currently in The Hall
- Positioned in header or sidebar
- Tooltip on hover: "[Name] is viewing The Hall"
- Click to see detail: "Last active 2 minutes ago"
- Limit display: show max 5 avatars, "+N more" for rest

**Presence Channel**

```typescript
interface PresenceState {
  user_id: string;
  username: string;
  avatar_url: string;
  last_active: string;
}

// Join presence channel
const presenceChannel = supabase.channel(`hall:${projectId}`);

presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    setPresenceUsers(state);
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('User joined:', newPresences);
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('User left:', leftPresences);
  })
  .subscribe();

// Send presence every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    presenceChannel.track({
      user_id: session.user.id,
      username: session.user.user_metadata?.full_name,
      avatar_url: session.user.user_metadata?.avatar_url,
      last_active: new Date().toISOString(),
    });
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

### Optimistic UI with Reconciliation

**Create Idea**
1. User fills form, clicks submit
2. Immediately add to state: `ideas.push(optimisticIdea)`
3. Show in list with "saving..." indicator
4. POST request sent
5. Server returns created idea with `id`
6. Replace optimistic version with server version
7. Remove "saving..." indicator

**Edit Idea**
1. User edits title in detail view
2. Auto-save triggers (Phase 017)
3. Update local state immediately
4. Show "Saving..." indicator
5. PUT request sent
6. Server returns updated idea
7. Merge with local state (server version wins for conflict fields)
8. Clear "saving..." indicator

**Delete Idea**
1. User clicks delete, confirms
2. Immediately change status to "archived" in UI (optimistic)
3. Remove from list (if filtered to hide archived)
4. Show undo toast
5. DELETE request sent
6. Server confirms
7. Clear undo button if confirmed

### Real-Time Filters & Subscriptions

**Smart Subscription**
- Only subscribe to changes matching current filters
- If filter changes, update subscription
- Example: If user filters by tag "Feature", subscribe to changes involving "Feature"-tagged ideas

**Challenge**: Difficult to filter on Realtime level. Alternative:
- Subscribe to all ideas in project
- Filter changes on client side
- If filtered idea is deleted, remove from view
- If archived idea becomes visible (filter updated), request full list

**Recommended Approach**
- Subscribe to all idea changes for project (simpler, scales well for <1000 ideas)
- Handle filtering on client side
- Periodically sync full list (every 5 minutes) to ensure consistency

### Connection Status

**Indicator**
- Small icon in header: connected/disconnected
- Green dot when connected
- Red dot with "offline" when disconnected
- Tooltip: "Synced" or "Reconnecting..."

**Offline Mode**
- Changes queued locally
- Queue syncs when connection restored
- If offline for >10 minutes, warn: "You're viewing offline data. Reconnect for latest updates."

### Animations & Transitions

**New Idea Appears**
- Slide in from top or fade in
- Subtle highlight for 2 seconds
- Smooth transition (300ms)

**Idea Updated**
- If visible on screen: brief yellow background flash (500ms)
- Inline animation of changed fields (text fade)
- No disruption to reading

**Idea Deleted**
- Slide out or fade out (300ms)
- Replace with "Archived" state briefly before removal

## File Structure

```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               └── hall/
│                   ├── page.tsx
│                   └── components/
│                       ├── RealtimeSubscriber.tsx
│                       ├── PresenceAvatars.tsx
│                       ├── ConnectionStatus.tsx
│                       └── IdeaUpdateAnimation.tsx
└── hooks/
    ├── useRealtimeIdeas.ts
    ├── usePresence.ts
    └── useConnectionStatus.ts
```

## Hook Implementations

### useRealtimeIdeas.ts

```typescript
interface UseRealtimeIdeasOptions {
  projectId: string;
  filter?: { status?: string; tags?: string[] };
}

export function useRealtimeIdeas({
  projectId,
  filter,
}: UseRealtimeIdeasOptions) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const ideaMapRef = useRef(new Map<string, Idea>());

  useEffect(() => {
    const channel = supabase.channel(`hall:${projectId}`);

    // Subscribe to all idea changes
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ideas',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: RealtimePayload) => {
          handleIdeaChange(payload);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Load initial ideas
          await loadIdeas();
          setIsInitialized(true);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [projectId]);

  const loadIdeas = async () => {
    const response = await supabase
      .from('ideas')
      .select('*')
      .eq('project_id', projectId);

    if (response.data) {
      response.data.forEach(idea => ideaMapRef.current.set(idea.id, idea));
      updateIdeasList();
    }
  };

  const handleIdeaChange = (payload: RealtimePayload) => {
    if (payload.event === 'INSERT' || payload.event === 'UPDATE') {
      ideaMapRef.current.set(payload.record.id, payload.record);
    } else if (payload.event === 'DELETE') {
      ideaMapRef.current.delete(payload.record.id);
    }

    updateIdeasList();
  };

  const updateIdeasList = () => {
    let filteredIdeas = Array.from(ideaMapRef.current.values());

    // Apply filters
    if (filter?.status) {
      filteredIdeas = filteredIdeas.filter(i => i.status === filter.status);
    }

    setIdeas(filteredIdeas);
  };

  return { ideas, isInitialized };
}
```

### usePresence.ts

```typescript
export function usePresence(projectId: string) {
  const [presenceUsers, setPresenceUsers] = useState<PresenceState[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`hall:${projectId}`);

    // Subscribe to presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, PresenceState[]>;
        const users = Object.values(state).flat();
        setPresenceUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setPresenceUsers(prev => [...prev, ...newPresences]);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftIds = leftPresences.map(p => p.user_id);
        setPresenceUsers(prev => prev.filter(p => !leftIds.includes(p.user_id)));
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          // Send presence
          const session = await getSession();
          channel.track({
            user_id: session.user.id,
            username: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
            last_active: new Date().toISOString(),
          });
        }
      });

    // Heartbeat: update presence every 30 seconds
    const interval = setInterval(() => {
      getSession().then(session => {
        channel.track({
          user_id: session.user.id,
          username: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          last_active: new Date().toISOString(),
        });
      });
    }, 30000);

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [projectId]);

  return { presenceUsers };
}
```

### useConnectionStatus.ts

```typescript
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Listen for supabase connection changes
    const subscription = supabase.auth.onAuthStateChange(() => {
      setIsConnected(true);
    });

    // Periodic health check
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.from('ideas').select('id').limit(1);
        setIsConnected(true);
      } catch (err) {
        setIsConnected(false);
      }
    }, 30000);

    return () => {
      subscription.data.subscription?.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { isConnected };
}
```

## Component: PresenceAvatars

```typescript
interface PresenceAvatarsProps {
  presenceUsers: PresenceState[];
  currentUserId: string;
}

export function PresenceAvatars({
  presenceUsers,
  currentUserId,
}: PresenceAvatarsProps) {
  // Exclude current user
  const otherUsers = presenceUsers.filter(u => u.user_id !== currentUserId);

  if (otherUsers.length === 0) {
    return <p className="text-sm text-gray-500">You're the only one here</p>;
  }

  const displayedUsers = otherUsers.slice(0, 5);
  const moreCount = Math.max(0, otherUsers.length - 5);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">Now viewing:</span>
      <div className="flex -space-x-2">
        {displayedUsers.map(user => (
          <div
            key={user.user_id}
            className="relative group"
            title={user.username}
          >
            <img
              src={user.avatar_url || '/avatar-placeholder.svg'}
              alt={user.username}
              className="w-8 h-8 rounded-full border-2 border-white bg-gray-300"
            />
            <div className="invisible group-hover:visible absolute bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              {user.username}
            </div>
          </div>
        ))}
        {moreCount > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
            +{moreCount}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Component: ConnectionStatus

```typescript
export function ConnectionStatus() {
  const { isConnected } = useConnectionStatus();

  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-gray-600">
        {isConnected ? 'Synced' : 'Offline'}
      </span>
    </div>
  );
}
```

## Hall Page Integration

```typescript
'use client';

export default function HallPage({ params }) {
  const { ideas, isInitialized } = useRealtimeIdeas({ projectId: params.projectId });
  const { presenceUsers } = usePresence(params.projectId);
  const { isConnected } = useConnectionStatus();

  return (
    <div className="flex flex-col h-screen">
      {/* Header with presence and connection status */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-bold">The Hall</h1>
        <div className="flex items-center gap-6">
          <PresenceAvatars presenceUsers={presenceUsers} />
          <ConnectionStatus />
        </div>
      </div>

      {/* Ideas list with real-time updates */}
      {isInitialized ? (
        <IdeaGrid
          ideas={ideas}
          // ...
        />
      ) : (
        <LoadingState />
      )}
    </div>
  );
}
```

## Acceptance Criteria
1. New ideas appear in list immediately when created by any user
2. Edited ideas update in real-time for all viewers
3. Deleted ideas disappear from list in real-time
4. Optimistic updates show immediately, reconcile with server
5. Presence avatars show who's currently viewing The Hall
6. Presence updates every 30 seconds
7. Connection status indicator shows synced/offline
8. Animations smooth (300ms fade/slide)
9. New ideas highlighted briefly
10. Offline mode gracefully degrades
11. Queue syncs when connection restored
12. No duplicate ideas from optimistic + realtime
13. Filters apply to realtime updates
14. Tab shows "N new ideas" when unfocused
15. Conflict detection if idea edited by multiple users
16. Performance: handles 100+ concurrent updates
17. RLS enforced for all realtime events
18. Unsubscribe on component unmount
19. Memory leaks prevented (cleanup timers/subscriptions)
20. Works across browser tabs for same user

## Testing Instructions

### Real-Time Insert
1. Open Hall in two browser windows (same project)
2. In window 1, create new idea: "Test Idea"
3. In window 2, verify idea appears immediately
4. No page refresh needed

### Real-Time Update
1. Open Hall in two windows
2. In window 1, open idea detail and edit title
3. In window 2, verify title updates in list/detail
4. Highlight effect shows briefly

### Real-Time Delete
1. Open Hall in two windows
2. In window 1, delete idea
3. In window 2, verify idea disappears
4. Undo still works in window 1

### Presence Avatars
1. Open Hall in two windows (different users if possible)
2. Verify avatars show in header
3. Hover over avatar; verify name tooltip
4. Close window; avatar disappears after 30 seconds
5. Click "+3 more"; verify shows all users

### Connection Status
1. Open Hall
2. Verify green "Synced" indicator
3. Disconnect network (DevTools)
4. Verify red "Offline" indicator
5. Reconnect network
6. Verify back to "Synced"

### Offline Mode
1. Create offline by disabling network
2. Attempt to create idea locally
3. Verify shows "offline" state
4. Reconnect network
5. Verify idea creates on server

### Performance
1. Create 20+ ideas in rapid succession (via API calls)
2. Verify all appear in real-time in connected client
3. No UI freezing or lag
4. Smooth animations throughout

### Conflict Resolution
1. Open same idea detail in two windows
2. In window 1, edit title to "A"
3. Simultaneously in window 2, edit to "B"
4. Both send to server (within same second)
5. Verify server version (most recent) wins
6. Show conflict notification if needed

### Memory/Cleanup
1. Open Hall
2. DevTools: Memory tab, take snapshot
3. Close Hall
4. Take another snapshot
5. Verify memory released (no leaks)

### Tab Synchronization
1. Open same project in two tabs
2. Edit idea in tab 1
3. Switch to tab 2
4. Verify update visible
5. No duplicate operations
