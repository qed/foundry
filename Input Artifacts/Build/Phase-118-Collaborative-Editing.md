# Phase 118 - Real-Time Collaborative Editing

## Objective
Implement CRDT-based collaborative editing using Yjs and TipTap, enabling multiple users to edit documents simultaneously without conflicts, with awareness of other users' cursors and selections.

## Prerequisites
- Phase 034 (Requirements Editor) completed
- Phase 049 (Blueprint Editor) completed
- Phase 117 (Real-Time Presence) completed
- Supabase Realtime configured
- TipTap editor integrated

## Context
Teams need to collaborate on documents in real-time. Collaborative editing with CRDTs (Conflict-free Replicated Data Types) ensures all users have consistent state even with concurrent edits and network latency.

## Detailed Requirements

### Architecture

#### Yjs Document
```typescript
import * as Y from 'yjs';

// Create shared document
const ydoc = new Y.Doc();
const ytext = ydoc.getText('shared-text');
const ymap = ydoc.getMap('shared-metadata');

// Observe changes
ytext.observe(event => {
  // Update UI with remote changes
});
```

#### Supabase Realtime Transport
```typescript
import { WebsocketProvider } from 'y-supabase';

// Bind Yjs to Supabase Realtime
const provider = new WebsocketProvider(
  'wss://supabase.example.com',
  `doc:${documentId}`,
  ydoc,
  {
    awareness: true,  // Enable awareness for cursors
  }
);
```

#### TipTap Integration
```typescript
import { useEditor } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

const editor = useEditor({
  extensions: [
    StarterKit,
    Collaboration.configure({
      document: ydoc,
    }),
    CollaborationCursor.configure({
      provider: provider,
    }),
  ],
});
```

### Collaborative Editor Component

#### CollaborativeEditor Component
```typescript
interface CollaborativeEditorProps {
  documentId: string;
  documentType: 'requirement' | 'blueprint';
  projectId: string;
  isReadOnly?: boolean;
}

export function CollaborativeEditor({
  documentId,
  documentType,
  projectId,
  isReadOnly = false,
}: CollaborativeEditorProps) {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const [awareness, setAwareness] = useState<any>(null);

  useEffect(() => {
    // Initialize Yjs document
    const newYdoc = new Y.Doc();
    const newProvider = new WebsocketProvider(
      supabaseRealtimeURL,
      `doc:${projectId}:${documentType}:${documentId}`,
      newYdoc,
      { awareness: true }
    );

    setYdoc(newYdoc);
    setProvider(newProvider);
    setAwareness(newProvider.awareness);

    return () => {
      newYdoc.destroy();
      newProvider.disconnect();
    };
  }, [documentId, documentType, projectId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({ provider }),
    ],
    content: initialContent,
    editable: !isReadOnly,
  });

  // Track user's own awareness
  useEffect(() => {
    if (!awareness) return;

    const { session } = useAuth();
    awareness.setLocalState({
      user: {
        name: session?.user?.user_metadata?.full_name,
        color: generateUserColor(session?.user?.id),
        avatar: session?.user?.user_metadata?.avatar_url,
      },
    });
  }, [awareness]);

  return (
    <div className="collaborative-editor">
      <RemoteUsersIndicator awareness={awareness} />
      <EditorContent editor={editor} />
    </div>
  );
}
```

### Awareness/Cursor Component

#### RemoteUsersIndicator Component
```typescript
interface RemoteUsersIndicatorProps {
  awareness: any;
  maxDisplay?: number;
}

export function RemoteUsersIndicator({
  awareness,
  maxDisplay = 5,
}: RemoteUsersIndicatorProps) {
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateRemoteUsers = () => {
      const states = awareness.getStates();
      const remoteStates = Array.from(states.entries())
        .filter(([key]) => key !== awareness.clientID)
        .map(([, state]: any) => state);

      setRemoteUsers(remoteStates);
    };

    awareness.on('update', updateRemoteUsers);
    updateRemoteUsers();

    return () => awareness.off('update', updateRemoteUsers);
  }, [awareness]);

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
      <span className="text-sm font-medium">Editing:</span>
      {remoteUsers.slice(0, maxDisplay).map((state, i) => (
        <div
          key={i}
          className="flex items-center gap-1"
          style={{
            backgroundColor: state.user?.color,
            padding: '2px 8px',
            borderRadius: '4px',
            color: 'white',
            fontSize: '12px',
          }}
        >
          <img
            src={state.user?.avatar}
            alt={state.user?.name}
            className="w-4 h-4 rounded-full"
          />
          {state.user?.name}
        </div>
      ))}
      {remoteUsers.length > maxDisplay && (
        <span className="text-sm text-gray-600">
          +{remoteUsers.length - maxDisplay} more
        </span>
      )}
    </div>
  );
}
```

### Conflict-Free Editing

#### How CRDT Works
1. Each user has unique client ID
2. Each edit generates unique operation ID: `{clientID}:{clock}`
3. Operations propagate to all users
4. All users apply same operations in same order
5. Final state converges automatically (conflict-free)

#### Example Concurrent Edits
```
User A inserts "hello" at position 0
User B inserts "world" at position 0

Without CRDT: conflict, content corrupted
With CRDT (Yjs):
- A's op: insert "hello" with id (A, 1) at pos 0
- B's op: insert "world" with id (B, 1) at pos 0
- Both users converge to same result based on op IDs
- Final text: "helloworld" or "worldhello" (consistent)
```

## File Structure
```
src/
├── components/
│   ├── editors/
│   │   ├── CollaborativeEditor.tsx
│   │   ├── RemoteUsersIndicator.tsx
│   │   ├── CollaborativeCursor.tsx
│   │   ├── CollaborativeSelection.tsx
│   │   └── ConflictResolutionUI.tsx
│   └── shared/
│       └── EditorToolbar.tsx
├── lib/
│   ├── collaboration/
│   │   ├── yjs.ts              (Yjs setup)
│   │   ├── provider.ts         (Supabase provider)
│   │   ├── awareness.ts        (awareness management)
│   │   ├── colors.ts           (user color assignment)
│   │   └── sync.ts             (sync logic)
│   └── types/
│       └── collaboration.ts    (TypeScript types)
└── hooks/
    ├── useYjs.ts               (Yjs hook)
    ├── useCollaborativeEditor.ts
    └── useAwareness.ts
```

## TipTap Extensions

### Required Extensions
```typescript
import { useEditor } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';

const editor = useEditor({
  extensions: [
    Document,
    Paragraph,
    Text,
    Bold,
    Italic,
    Collaboration.configure({
      document: ydoc,
      field: 'shared-text',
    }),
    CollaborationCursor.configure({
      provider: provider,
      user: {
        name: currentUser.name,
        color: userColor,
      },
    }),
  ],
});
```

### Custom Cursor Appearance
```typescript
// CSS for collaborative cursors
.collaboration-cursor {
  position: absolute;
  pointer-events: none;
  user-select: none;
}

.collaboration-cursor__caret {
  position: relative;
  margin-left: -1px;
  width: 1px;
  height: 1em;
  border-right: 1px solid currentColor;
}

.collaboration-cursor__label {
  position: absolute;
  top: -1.4em;
  left: -1px;
  font-size: 0.75rem;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  white-space: nowrap;
}
```

## Sync Strategy

### Document Load
1. Editor loads empty
2. Yjs connects to provider
3. Provider syncs document state from server
4. Editor content updates with latest state
5. User can start editing immediately

### Save Strategy
- Documents auto-save on edit (debounced 30s)
- Save triggered by Yjs change events
- Version created on save (Phase 102)
- No explicit save button needed

## Performance Considerations

### Optimization
- Lazy load Yjs for large documents
- Compress operations in transit
- Implement operation batching
- Clean up awareness for inactive users
- Limit awareness updates to 100ms intervals

### Scalability
- Estimated max concurrent editors per doc: 20-50
- Max document size: 10MB (before performance degrades)
- Awareness traffic: ~1KB per user update
- Document sync traffic: ~100-500 bytes per edit

## Acceptance Criteria
- [ ] Yjs integration working
- [ ] Supabase Realtime transport connected
- [ ] TipTap editor renders with collaboration
- [ ] Concurrent edits don't conflict
- [ ] Remote user cursors visible
- [ ] Remote user selections highlighted
- [ ] Awareness shows who's editing
- [ ] Documents load with latest state
- [ ] Changes sync in real-time (< 500ms latency)
- [ ] Conflict resolution automatic (CRDT)
- [ ] Works for requirements documents
- [ ] Works for blueprints
- [ ] Handles network disconnections
- [ ] Auto-reconnect on network restore
- [ ] Performance acceptable with 10+ concurrent editors
- [ ] Mobile responsive (cursor display)
- [ ] Read-only mode functional
- [ ] Version history captures collaborative edits
- [ ] No data loss on disconnect/reconnect
- [ ] Memory usage reasonable (no leaks)

## Testing Instructions

### Local Testing
1. Open document in two browser windows
2. Edit in window 1
3. Verify changes appear in window 2 immediately
4. Simultaneously edit in both windows
5. Verify no conflicts or corruption
6. Verify remote cursor appears
7. Verify both users' names shown
8. Disconnect network in window 1
9. Continue editing in window 2
10. Reconnect window 1
11. Verify edits sync automatically
12. Make several rapid edits in both windows
13. Verify final state consistent
14. Reload page
15. Verify document loads with all edits
16. Test with 5+ concurrent editors
17. Test with large document (1000+ lines)
18. Test cursor positions with different text lengths
19. Test with special characters and formatting
20. Monitor performance with DevTools

### Conflict Scenario Tests
1. User A deletes text that User B is adding
2. Verify consistent final state
3. User A inserts at position 100
4. User B inserts at position 100
5. Verify deterministic ordering
6. Both users undo changes
7. Verify undo works across network

### Performance Profiling
- Measure edit latency (target < 100ms)
- Monitor memory growth over time
- Check network traffic per edit
- Profile CPU during concurrent edits
- Test with slow network simulation
