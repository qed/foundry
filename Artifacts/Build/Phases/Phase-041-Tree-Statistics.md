# Phase 041 - Feature Tree Statistics

## Objective
Display real-time statistics about the feature tree in a header stats bar, including node counts by level, completion percentage, and visual progress indicators.

## Prerequisites
- Feature Tree (Phase 029)
- Status Tracking (Phase 035)
- Pattern Shop layout (Phase 027)

## Context
The stats bar (part of Phase 027 header) needs to be populated with actual data. This phase implements the data fetching, calculation, and real-time updates as the tree changes.

## Detailed Requirements

### Stats Display

**Location:** Header stats bar (Phase 027)

**Displayed Metrics:**
```
X Epics | Y Features | Z Sub-features | W Tasks | P% Complete

[████████░░] 45% (9 of 20 nodes complete)
```

**Calculation:**

1. **Node Counts:**
   ```sql
   SELECT level, COUNT(*) FROM feature_nodes
   WHERE project_id = ? AND deleted_at IS NULL
   GROUP BY level
   ```
   - Epic count: count where level='epic'
   - Feature count: count where level='feature'
   - Sub-feature count: count where level='sub_feature'
   - Task count: count where level='task'

2. **Completion %:**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE status = 'complete') as complete_count,
     COUNT(*) as total_count
   FROM feature_nodes
   WHERE project_id = ? AND deleted_at IS NULL
   ```
   - Completion % = (complete_count / total_count) * 100
   - Rounded to nearest integer

3. **In Progress %:**
   - Count where status = 'in_progress'
   - Used for progress bar color coding

4. **Blocked %:**
   - Count where status = 'blocked'
   - Highlighted in red

### Stats Component

**Path:** `/components/PatternShop/TreeStats.tsx`

```
┌─ Stats Bar ─────────────────────────────────────┐
│ 2 Epics | 5 Features | 8 Sub-features | 3 Tasks │
│                                                  │
│ Progress: 45% (9 of 20 complete)               │
│ [████████░░░░░░░░░░] (green for complete,      │
│                        blue for in progress)    │
└──────────────────────────────────────────────────┘
```

### Real-Time Updates

Stats update automatically when:
1. Nodes are created/deleted
2. Node status changes
3. User performs bulk operations (drag-drop, import)

**Implementation:**
- Subscribe to Supabase Realtime changes on feature_nodes table
- Recalculate stats on each change
- Debounce updates (max once per 500ms) to avoid excessive re-renders

```typescript
useEffect(() => {
  const subscription = supabase
    .from('feature_nodes')
    .on('*', () => {
      // Recalculate stats
      fetchTreeStats(projectId).then(setStats);
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [projectId]);
```

### API Route

**Route:** `GET /api/projects/[projectId]/feature-nodes/stats`

**Query Parameters:**
- `projectId` (required): Project UUID

**Response (200 OK):**
```json
{
  "projectId": "project-uuid",
  "totalNodes": 20,
  "epicCount": 2,
  "featureCount": 5,
  "subfeatureCount": 8,
  "taskCount": 3,
  "statusBreakdown": {
    "not_started": 11,
    "in_progress": 5,
    "complete": 4,
    "blocked": 0
  },
  "completionPercent": 20,
  "inProgressPercent": 25,
  "blockedPercent": 0,
  "blockedNodeCount": 0,
  "lastUpdated": "2025-02-20T12:05:00Z"
}
```

**Logic:**
1. Query feature_nodes grouped by level and status
2. Calculate counts and percentages
3. Return stats object
4. Cache result for 10 seconds (optional, for performance)

**Error Responses:**
- 403 Forbidden: User not a member of project
- 404 Not Found: Project not found

## Database Schema
No new tables. Uses Phase 026 schema.

**Optional optimization:**
- Add materialized view for stats (if project has 10,000+ nodes)
```sql
CREATE MATERIALIZED VIEW feature_tree_stats AS
SELECT
  project_id,
  COUNT(*) as total_nodes,
  COUNT(*) FILTER (WHERE level = 'epic') as epic_count,
  COUNT(*) FILTER (WHERE level = 'feature') as feature_count,
  COUNT(*) FILTER (WHERE level = 'sub_feature') as subfeature_count,
  COUNT(*) FILTER (WHERE level = 'task') as task_count,
  COUNT(*) FILTER (WHERE status = 'complete') as complete_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE status = 'blocked') as blocked_count
FROM feature_nodes
WHERE deleted_at IS NULL
GROUP BY project_id;

CREATE UNIQUE INDEX ON feature_tree_stats (project_id);
```

## File Structure
```
components/PatternShop/
  TreeStats.tsx               (stats display component)
  ProgressBar.tsx             (reuse from Phase 035)

lib/
  api/
    featureNodes.ts           (stats endpoint client)

app/api/projects/[projectId]/
  feature-nodes/
    stats/
      route.ts                (GET endpoint)
```

## UI Components

### TreeStats Component
**Path:** `/components/PatternShop/TreeStats.tsx`

Displays stats in header.

```typescript
interface TreeStatsData {
  totalNodes: number;
  epicCount: number;
  featureCount: number;
  subfeatureCount: number;
  taskCount: number;
  completionPercent: number;
  blockedNodeCount: number;
}

export default function TreeStats({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<TreeStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchTreeStats(projectId).then(setStats).finally(() => setLoading(false));

    // Subscribe to real-time updates
    const subscription = supabase
      .from('feature_nodes')
      .on('*', () => {
        // Debounced stats recalculation
        debouncedFetchStats(projectId, setStats);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [projectId]);

  if (loading || !stats) {
    return <div className="text-gray-500 text-sm">Loading stats...</div>;
  }

  return (
    <div className="flex items-center gap-6 text-sm text-gray-700">
      <div className="flex gap-4">
        <Stat label="Epics" value={stats.epicCount} />
        <Stat label="Features" value={stats.featureCount} />
        <Stat label="Sub-features" value={stats.subfeatureCount} />
        <Stat label="Tasks" value={stats.taskCount} />
      </div>

      <div className="border-l border-gray-300 pl-6 flex items-center gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {stats.completionPercent}% Complete
          </div>
          <div className="text-xs text-gray-500">
            ({stats.totalNodes - stats.blockedNodeCount} of {stats.totalNodes} nodes)
          </div>
        </div>

        <ProgressIndicator
          completionPercent={stats.completionPercent}
          blockedNodeCount={stats.blockedNodeCount}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function ProgressIndicator({
  completionPercent,
  blockedNodeCount,
}: {
  completionPercent: number;
  blockedNodeCount: number;
}) {
  const donutRadius = 35;
  const circumference = 2 * Math.PI * donutRadius;
  const strokeDashoffset = circumference - (completionPercent / 100) * circumference;

  return (
    <div className="relative w-20 h-20">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40"
          cy="40"
          r={donutRadius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />

        {/* Progress circle */}
        <circle
          cx="40"
          cy="40"
          r={donutRadius}
          fill="none"
          stroke={blockedNodeCount > 0 ? '#ef4444' : '#10b981'}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-900">{completionPercent}%</span>
      </div>

      {/* Blocked indicator */}
      {blockedNodeCount > 0 && (
        <div
          className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
          title={`${blockedNodeCount} blocked`}
        >
          {blockedNodeCount}
        </div>
      )}
    </div>
  );
}
```

### Integrate into ShopHeader

**Update:** `/components/PatternShop/ShopHeader.tsx`

```typescript
export default function ShopHeader({ projectId, ... }) {
  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center px-6 gap-6">
      <div className="flex items-center gap-2">
        <BarChart3 size={24} className="text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">The Pattern Shop</h1>
      </div>

      <TreeStats projectId={projectId} />

      <div className="flex-1" /> {/* Spacer */}

      <UserMenu />
    </header>
  );
}
```

## Acceptance Criteria
- [ ] Stats bar displays in header with all metrics (epics, features, sub-features, tasks)
- [ ] Completion % calculated correctly
- [ ] Donut progress chart displays with correct fill percentage
- [ ] Donut chart is green when no blocked nodes, red if any blocked
- [ ] Stats update in real-time when nodes are created/deleted
- [ ] Stats update when node status changes
- [ ] GET /api/projects/[projectId]/feature-nodes/stats returns correct data
- [ ] Stats load instantly on first page load (no visible spinner)
- [ ] Performance acceptable for projects with 1000+ nodes
- [ ] Blocked node count shown as badge on donut chart

## Testing Instructions

1. **Test initial load:**
   - Open Pattern Shop for project with 10 nodes (2 complete, 1 blocked)
   - Verify stats show correct counts
   - Verify progress is 20% (2 of 10)
   - Verify donut shows red (blocked node present)

2. **Test real-time updates:**
   - Create new Epic node
   - Verify Epic count increments by 1 in stats
   - Verify total node count increments
   - Verify progress % updates

3. **Test status change:**
   - Change task status from "not_started" to "complete"
   - Verify completion % increases
   - Verify donut chart fill updates

4. **Test blocked indicator:**
   - Change a node status to "blocked"
   - Verify donut color changes to red
   - Verify blocked count badge appears

5. **Test API:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/projects/xyz/feature-nodes/stats"
   ```
   Verify response contains all metrics.

6. **Stress test:**
   - Create project with 500 nodes
   - Verify stats display and update smoothly
   - No lag or delay in UI updates

## Dependencies
- Phase 026: Database schema
- Phase 027: Pattern Shop layout
- Phase 029: Feature tree
- Phase 035: Status tracking
