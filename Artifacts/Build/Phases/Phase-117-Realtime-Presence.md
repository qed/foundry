# Phase 117 - Real-Time Presence

## Objective
Implement real-time presence tracking showing which users are currently viewing projects and which module they're in, with visual indicators and online status in the UI.

## Prerequisites
- Phase 002 (Project Schema & Core Tables) completed
- Supabase Realtime configured
- All module routes implemented

## Context
Presence information helps teams understand who's working on what, preventing duplicate effort and enabling real-time collaboration awareness. Visual indicators (green dots, avatars) show online users and their current location.

## Detailed Requirements

### Presence System Architecture

#### Supabase Realtime Channels
- Channel per project: `project:{project_id}:presence`
- Users broadcast presence when entering project
- Presence includes: user info, current module, timestamp
- Auto-cleanup when connection drops

#### Presence Data Structure
```typescript
interface UserPresence {
  user_id: string;
  user_name: string;
  user_avatar: string;
  project_id: string;
  current_module: 'hall' | 'pattern_shop' | 'control_room' | 'assembly_floor' | 'insights_lab';
  timestamp: number;
  last_activity: number;
}
```

### Presence Hooks

#### usePresence Hook
```typescript
interface UsePresenceOptions {
  projectId: string;
  enabled?: boolean;
}

function usePresence({ projectId, enabled = true }: UsePresenceOptions) {
  const { session } = useAuth();
  const { currentModule } = useRouter(); // or custom hook

  useEffect(() => {
    if (!enabled || !session || !projectId) return;

    // Subscribe to presence channel
    const channel = supabase.channel(`project:${projectId}:presence`, {
      config: {
        broadcast: { self: true },
        presence: { key: session.user.id },
      },
    });

    // Track current user
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<UserPresence>();
      // Update presence list
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      // New user joined
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      // User left
    });

    // Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Broadcast user presence
        await channel.track({
          user_id: session.user.id,
          user_name: session.user.user_metadata?.full_name || 'Anonymous',
          user_avatar: session.user.user_metadata?.avatar_url,
          project_id: projectId,
          current_module: currentModule,
          timestamp: Date.now(),
        });
      }
    });

    // Update module when it changes
    const updatePresenceModule = async (module: string) => {
      await channel.track({
        user_id: session.user.id,
        user_name: session.user.user_metadata?.full_name || 'Anonymous',
        user_avatar: session.user.user_metadata?.avatar_url,
        project_id: projectId,
        current_module: module,
        timestamp: Date.now(),
        last_activity: Date.now(),
      });
    };

    return () => {
      channel.unsubscribe();
    };
  }, [projectId, enabled, session, currentModule]);

  return {
    onlineUsers: presenceUsers,
    isOnline: (userId: string) => presenceUsers.some(u => u.user_id === userId),
    getUsersInModule: (module: string) => presenceUsers.filter(u => u.current_module === module),
  };
}
```

### UI Components

#### OnlineIndicator Component
```typescript
interface OnlineIndicatorProps {
  userId: string;
  projectId: string;
  showLabel?: boolean;
}

export function OnlineIndicator({
  userId,
  projectId,
  showLabel = false,
}: OnlineIndicatorProps) {
  const { onlineUsers } = usePresence({ projectId });
  const isOnline = onlineUsers.some(u => u.user_id === userId);

  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${
        isOnline ? 'bg-green-500' : 'bg-gray-300'
      }`} />
      {showLabel && (
        <span className="text-sm text-gray-600">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}
```

#### OnlineUsersList Component
```typescript
interface OnlineUsersListProps {
  projectId: string;
  currentModule?: string;
  maxDisplay?: number;
}

export function OnlineUsersList({
  projectId,
  currentModule,
  maxDisplay = 5,
}: OnlineUsersListProps) {
  const { onlineUsers, getUsersInModule } = usePresence({ projectId });

  const usersToShow = currentModule
    ? getUsersInModule(currentModule)
    : onlineUsers;

  return (
    <div className="flex -space-x-2">
      {usersToShow.slice(0, maxDisplay).map(user => (
        <div key={user.user_id} className="relative" title={user.user_name}>
          <img
            src={user.user_avatar}
            alt={user.user_name}
            className="w-6 h-6 rounded-full border-2 border-white"
          />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full" />
        </div>
      ))}
      {usersToShow.length > maxDisplay && (
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
          +{usersToShow.length - maxDisplay}
        </div>
      )}
    </div>
  );
}
```

#### PresenceSidebar Component
```typescript
interface PresenceSidebarProps {
  projectId: string;
}

export function PresenceSidebar({
  projectId,
}: PresenceSidebarProps) {
  const { onlineUsers, getUsersInModule } = usePresence({ projectId });

  const modules = [
    'hall',
    'pattern_shop',
    'control_room',
    'assembly_floor',
    'insights_lab',
  ];

  return (
    <div className="p-4 bg-gray-50 rounded">
      <h3 className="font-semibold mb-4">Online Users ({onlineUsers.length})</h3>

      {modules.map(module => {
        const usersInModule = getUsersInModule(module);
        if (usersInModule.length === 0) return null;

        return (
          <div key={module} className="mb-4">
            <p className="text-sm text-gray-600 mb-2 capitalize">
              In {module.replace('_', ' ')}
            </p>
            {usersInModule.map(user => (
              <div
                key={user.user_id}
                className="flex items-center gap-2 py-1"
              >
                <div className="relative">
                  <img
                    src={user.user_avatar}
                    alt={user.user_name}
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-500 rounded-full" />
                </div>
                <span className="text-sm">{user.user_name}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

#### ViewersIndicator Component
```typescript
interface ViewersIndicatorProps {
  documentId: string;
  projectId: string;
  entityType: string;
}

export function ViewersIndicator({
  documentId,
  projectId,
  entityType,
}: ViewersIndicatorProps) {
  const { onlineUsers } = usePresence({ projectId });

  // Filter users viewing this specific document
  const viewers = onlineUsers.filter(u =>
    u.viewingEntity?.type === entityType &&
    u.viewingEntity?.id === documentId
  );

  return (
    <div className="flex items-center gap-2">
      <OnlineUsersList
        projectId={projectId}
        maxDisplay={3}
      />
      {viewers.length > 0 && (
        <span className="text-sm text-gray-600">
          {viewers.length} viewing this document
        </span>
      )}
    </div>
  );
}
```

## File Structure
```
src/
├── components/
│   ├── presence/
│   │   ├── OnlineIndicator.tsx
│   │   ├── OnlineUsersList.tsx
│   │   ├── PresenceSidebar.tsx
│   │   ├── ViewersIndicator.tsx
│   │   └── UserAvatar.tsx
│   └── shared/
│       └── PresenceProvider.tsx
├── lib/
│   ├── presence/
│   │   ├── hooks.ts            (usePresence hook)
│   │   ├── utils.ts            (presence utilities)
│   │   └── types.ts            (TypeScript types)
│   └── supabase/
│       └── realtime.ts         (Supabase Realtime setup)
└── hooks/
    ├── usePresence.ts          (main presence hook)
    └── useCurrentModule.ts     (track current module)
```

## Integration Points

### Project Sidebar
- Show "Online Users" section
- List users by module
- Green dot indicator

### Document Headers
- Show who's viewing this document
- "X users viewing this document"

### Entity Detail Views
- Online indicator in header
- List of current viewers

### Chat Panels
- Show online status of other users
- Visual avatars for current viewers

## Presence Lifecycle

### Join Project
1. User navigates to project
2. usePresence hook subscribes to project channel
3. User's presence broadcast to channel
4. Other users see new user appear

### Update Module
1. User navigates to different module
2. usePresence detects module change
3. Presence updated with new module
4. Other users see module update

### Leave Project
1. User navigates away or closes app
2. Connection drops
3. Supabase auto-cleans up presence (after timeout)
4. Other users see user disappear

## Acceptance Criteria
- [ ] usePresence hook functional
- [ ] Presence broadcasts on project entry
- [ ] Presence updates when changing modules
- [ ] OnlineIndicator shows correct status
- [ ] OnlineUsersList displays avatars
- [ ] Module filtering works correctly
- [ ] Sidebar shows users grouped by module
- [ ] ViewersIndicator shows document viewers
- [ ] Performance: presence updates < 200ms
- [ ] Handles offline/reconnection gracefully
- [ ] Works across all 5 modules
- [ ] Presence cleanup on disconnect
- [ ] No memory leaks from presence subscriptions
- [ ] Mobile responsive
- [ ] Accessibility: ARIA labels for avatars
- [ ] Shows last activity time (future enhancement)
- [ ] Handles concurrent viewers correctly
- [ ] Realtime sync across browser tabs (same user)

## Testing Instructions

### Manual Testing
1. Open project in browser window 1
2. Open project in browser window 2 (different user)
3. Verify both users appear as online in each window
4. Check online count increments
5. Navigate to different module in window 1
6. Verify module changes in sidebar
7. Verify window 2 shows user in new module
8. Close window 1
9. Verify user disappears from window 2 (after 5-10 seconds)
10. Open document in window 1
11. Open same document in window 2
12. Verify "2 users viewing" indicator
13. Navigate to different document in window 1
14. Verify indicator decrements
15. Test avatar display and styling
16. Test user list grouping by module
17. Test with 10+ online users
18. Disconnect network and verify reconnection
19. Test on mobile viewport
20. Verify no console errors

### Performance Testing
- Monitor presence update latency (target < 200ms)
- Check memory usage over time (no leaks)
- Verify no unnecessary re-renders
- Test with 50+ simultaneous users
