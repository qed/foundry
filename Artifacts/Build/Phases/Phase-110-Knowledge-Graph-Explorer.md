# Phase 110 - Knowledge Graph Explorer Panel

## Objective
Create interactive side panel component for visualizing entity connections, showing all related entities grouped by connection type with navigation capabilities.

## Prerequisites
- Phase 109 (Knowledge Graph Schema) completed
- Phase 002 (Project Schema & Core Tables) completed
- All entity detail views implemented (ideas, features, blueprints, work orders, feedback)

## Context
Users need visual understanding of how entities relate to each other. The Knowledge Graph Explorer panel provides quick access to connected entities without leaving the current view, enabling discovery and understanding of project structure.

## Detailed Requirements

### Explorer Panel Features

#### Panel Structure
- Header: "Knowledge Graph" title with collapse button
- Search box: Filter connections by entity name or type
- Connection list: Grouped by connection type
- Each connection shows: icon, name, entity type, badge for multi-connections
- Footer: "View full graph" link (future phase)

#### Panel Positioning
- Right side panel on desktop (collapse when not needed)
- Slide-out drawer on mobile
- Width: 400px (desktop), 100% minus header (mobile)
- Overlay on content below certain breakpoint
- Smooth open/close animation

### Connection Grouping

#### Group By Connection Type
```
Outbound Connections
├─ implements (2)
│  ├─ Feature: User Registration
│  └─ Feature: Email Verification
├─ depends_on (1)
│  └─ Blueprint: Authentication System
└─ relates_to (3)
   ├─ Idea: SSO Integration
   ├─ Feature: OAuth Support
   └─ Artifact: Okta Documentation

Inbound Connections
├─ referenced_by (1)
│  └─ Work Order: WO-045
├─ implements (2)
│  ├─ Feature: Login Form
│  └─ Feature: Password Reset
└─ depends_on (1)
   └─ Blueprint: Database Schema
```

### Connection Item Component

#### ConnectionItem
```typescript
interface ConnectionItemProps {
  connection: EntityConnection;
  entity: Entity;
  direction: 'outbound' | 'inbound';
  onNavigate: (entity: Entity) => void;
  onRemove?: (connectionId: string) => void;
  editable?: boolean;
}

export function ConnectionItem({
  connection,
  entity,
  direction,
  onNavigate,
  onRemove,
  editable = false,
}: ConnectionItemProps) {
  // Shows: icon, name, type, connection label
  // Click to navigate
  // Remove button (if editable)
  // Hover preview
}
```

#### ConnectionType Icon
- implements: checkmark icon, green
- depends_on: arrow down, blue
- references: link icon, purple
- relates_to: network icon, orange
- derived_from: fork icon, gray
- conflicts_with: warning icon, red
- complements: plus icon, teal

### Explorer Panel Component

#### KnowledgeGraphExplorer
```typescript
interface KnowledgeGraphExplorerProps {
  entityType: 'idea' | 'feature' | 'blueprint' | 'work_order' | 'feedback' | 'artifact';
  entityId: string;
  projectId: string;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  onNavigate?: (entityType: string, entityId: string) => void;
  editable?: boolean;
}

export function KnowledgeGraphExplorer({
  entityType,
  entityId,
  projectId,
  isOpen = true,
  onToggle,
  onNavigate,
  editable = false,
}: KnowledgeGraphExplorerProps) {
  // Fetches connections
  // Renders grouped connections
  // Handles search filtering
  // Shows loading state while fetching
  // Shows empty state if no connections
}
```

#### Load Connections
```typescript
async function loadConnections(
  entityType: string,
  entityId: string,
  projectId: string,
  depth: number = 1
) {
  // GET /api/connections?source_type={type}&source_id={id}&project_id={projectId}
  // GET /api/connections?target_type={type}&target_id={id}&project_id={projectId}
  // Return: { outbound: [], inbound: [], related: [] }
}
```

### Search & Filter

#### Search Box
- Real-time filtering (debounce 300ms)
- Filters by: entity name, entity type
- Shows match count: "3 matches found"
- Clear button

#### Filter Options (Future Enhancement)
- Filter by connection type
- Filter by entity type
- Show only manual vs auto-detected

### Connection Count Badge

#### Badge on Entity Header
- Show count of all connections: "📎 5 connections"
- Click to open explorer panel
- Color coded by connection count: gray (0), blue (1-3), orange (4-10), red (10+)

#### Badge Component
```typescript
interface ConnectionCountBadgeProps {
  entityType: string;
  entityId: string;
  projectId: string;
  onClick?: () => void;
  showLabel?: boolean;
}

export function ConnectionCountBadge({
  entityType,
  entityId,
  projectId,
  onClick,
  showLabel = true,
}: ConnectionCountBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Fetch connection count
  }, [entityType, entityId]);

  return (
    <button onClick={onClick} className="flex items-center gap-1">
      <span>📎</span>
      <span>{count}</span>
      {showLabel && <span>connections</span>}
    </button>
  );
}
```

## File Structure
```
src/
├── components/
│   ├── knowledge-graph/
│   │   ├── KnowledgeGraphExplorer.tsx
│   │   ├── ConnectionList.tsx
│   │   ├── ConnectionGroup.tsx
│   │   ├── ConnectionItem.tsx
│   │   ├── ConnectionTypeIcon.tsx
│   │   ├── SearchConnections.tsx
│   │   ├── ConnectionCountBadge.tsx
│   │   └── ExplorerPanel.tsx
│   └── shared/
│       └── PreviewTooltip.tsx  (hover preview)
├── lib/
│   ├── knowledge-graph/
│   │   └── explorer.ts         (explorer logic)
│   └── types/
│       └── explorer.ts         (TypeScript types)
├── hooks/
│   ├── useKnowledgeGraph.ts    (fetch & state)
│   └── useExplorerPanel.ts     (panel state management)
└── app/api/
    └── connections/
        └── count/
            └── route.ts        (get connection count)
```

## API Routes

### GET /api/connections/count
Get connection count for entity:

```
Query params:
- entity_type: string
- entity_id: string
- project_id: string

Response:
{
  count: number,
  outbound_count: number,
  inbound_count: number,
  by_type: {
    "implements": 2,
    "depends_on": 1,
    ...
  }
}
```

### GET /api/connections/explore
Get all connections for explorer (with entity details):

```
Query params:
- entity_type: string
- entity_id: string
- project_id: string
- depth?: number (default 1)

Response:
{
  outbound: [
    {
      connection_id: string,
      connection_type: string,
      target: {
        type: string,
        id: string,
        name: string,
        status?: string,
        description?: string
      },
      created_at: string,
      is_auto_detected: boolean
    }
  ],
  inbound: [
    {
      connection_id: string,
      connection_type: string,
      source: { type, id, name, ... },
      ...
    }
  ],
  total_count: number
}
```

## Display Logic

### Grouping Algorithm
```typescript
function groupConnections(
  connections: EntityConnection[],
  direction: 'outbound' | 'inbound'
): GroupedConnections {
  const grouped: Record<string, EntityConnection[]> = {};

  for (const conn of connections) {
    const type = conn.connection_type;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(conn);
  }

  // Sort groups by importance/frequency
  const order = [
    'implements',
    'depends_on',
    'references',
    'relates_to',
    'derived_from',
    'conflicts_with',
    'complements',
  ];

  return Object.entries(grouped)
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .reduce((acc, [type, items]) => {
      acc[type] = items.sort((a, b) =>
        a.target.name.localeCompare(b.target.name)
      );
      return acc;
    }, {});
}
```

### Empty State Messages
- No outbound: "This entity doesn't implement or reference anything"
- No inbound: "No other entities reference this"
- No connections: "No connections yet. Create one using the link dialog."

### Loading State
- Skeleton loaders for each group
- Fade in animation when loaded
- Prevent layout shift during load

## Acceptance Criteria
- [ ] KnowledgeGraphExplorer component renders
- [ ] Connections fetched from API on mount
- [ ] Connections grouped by type
- [ ] Outbound and inbound connections shown
- [ ] Connection items show icon, name, type
- [ ] Click connection navigates to entity
- [ ] Search filters connections by name
- [ ] Connection count badge displays
- [ ] Badge click opens explorer panel
- [ ] Panel opens/closes smoothly
- [ ] Loading state shows skeleton loaders
- [ ] Empty state message displays when no connections
- [ ] Works for all entity types
- [ ] Handles auto-detected connections (different styling)
- [ ] Mobile responsive (stacked layout)
- [ ] Performance: load explorer < 300ms
- [ ] Keyboard navigation support
- [ ] Accessibility: ARIA labels, semantic HTML
- [ ] Connection type icons consistent
- [ ] Hover preview shows entity details

## Testing Instructions

### Component Tests
```typescript
// KnowledgeGraphExplorer.test.tsx
describe('KnowledgeGraphExplorer', () => {
  it('fetches and displays connections', async () => {
    const { getByText } = render(
      <KnowledgeGraphExplorer
        entityType="feature"
        entityId={featureId}
        projectId={projectId}
      />
    );

    await waitFor(() => {
      expect(getByText('depends_on')).toBeInTheDocument();
    });
  });

  it('groups connections by type', () => {
    // Verify connections under correct type headers
  });

  it('navigates on connection click', async () => {
    const onNavigate = vi.fn();
    const { getByText } = render(
      <KnowledgeGraphExplorer
        entityType="feature"
        entityId={featureId}
        projectId={projectId}
        onNavigate={onNavigate}
      />
    );

    await userEvent.click(getByText('Related Feature'));
    expect(onNavigate).toHaveBeenCalled();
  });

  it('filters connections by search', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <KnowledgeGraphExplorer
        entityType="feature"
        entityId={featureId}
        projectId={projectId}
      />
    );

    const searchBox = getByPlaceholderText('Search connections');
    await userEvent.type(searchBox, 'auth');

    expect(getByText('3 matches found')).toBeInTheDocument();
    expect(queryByText('Unrelated Feature')).not.toBeInTheDocument();
  });

  it('shows connection count badge', () => {
    const { getByText } = render(
      <ConnectionCountBadge
        entityType="feature"
        entityId={featureId}
        projectId={projectId}
      />
    );

    expect(getByText('5')).toBeInTheDocument();
  });
});
```

### Integration Tests
```bash
# Get connection count
curl "http://localhost:3000/api/connections/count?entity_type=feature&entity_id={feature-id}&project_id={project-id}"

# Get connections for explorer
curl "http://localhost:3000/api/connections/explore?entity_type=feature&entity_id={feature-id}&project_id={project-id}"
```

### Manual Testing
1. Navigate to feature detail view
2. Verify connection count badge appears in header
3. Click badge to open Knowledge Graph Explorer
4. Verify outbound connections displayed
5. Verify connections grouped by type
6. Click connection to navigate to related entity
7. Verify back navigation returns to original entity
8. Type in search box and filter connections
9. Verify filtered results show only matches
10. Close explorer and reopen
11. Verify explorer state preserved
12. Test with entity having many connections (10+)
13. Test with entity having no connections
14. Verify mobile layout (panel becomes drawer)
15. Test with auto-detected connections (different styling)
16. Verify accessibility with keyboard navigation
17. Test hover preview on connection items
