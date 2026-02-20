# Phase 079 - Leader Progress Dashboard

## Objective
Create a read-only leadership dashboard providing high-level visibility into project progress, phase status, epic completion, and team activity.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 069: Phases
- Phase 071: Progress Tracking & Rollup
- Phase 009: User Roles & Permissions (assumed: Leader role exists)

## Context
Project leaders and managers need high-level visibility without deep dive access. The Leader Dashboard provides a bird's-eye view of progress, identifies blockers, and tracks team velocity. All views are read-only; leaders cannot edit work orders from this dashboard.

## Detailed Requirements

### Dashboard Route
- Route: `/org/[orgSlug]/project/[projectId]/dashboard`
- Requires: "leader" role or above in project
- Alternative: `/org/[orgSlug]/project/[projectId]/floor/dashboard` (nested under floor)

### Dashboard Sections

#### 1. Project Progress Ring (Hero Section)
- Large circular progress indicator (200px diameter)
- Center: "XX% Complete" in large font
- Ring: colored gradient (gray → yellow → green)
- Below: "YYY of ZZZ work orders complete"
- Example: "48% Complete | 48 of 100 work orders done"

#### 2. Phase-Level Breakdown (Cards)
- Grid or list of phase cards
- Each card shows:
  - Phase name (e.g., "Foundation")
  - Progress bar: filled percentage
  - Count: "X/Y complete"
  - Status badge: planned/active/completed
  - Estimated completion date (if available)
  - Click card to see phase details

#### 3. Epic/Feature Progress (Collapsed Tree or List)
- Shows all epics with completion %
- Expandable: each epic shows child features
- Color-coded by completion:
  - 0%: gray
  - 1-99%: yellow/orange
  - 100%: green
- Example:
  ```
  ▼ User Management (60%)
    - Authentication (100%) ✓
    - Authorization (40%)
    - Profile Management (80%)
  ▼ Payments (20%)
    - Stripe Integration (0%)
    - Checkout (50%)
  ```

#### 4. Recent Activity Feed
- Last 20 work order updates
- Shows: "[User] moved [WO Title] to [Status]" with timestamp
- Filtered to significant changes (status, priority, assignment)
- Reverse chronological
- Scroll to see more

#### 5. Team Workload (optional)
- Bar chart or list showing work orders assigned per team member
- Shows: [Avatar] [Name] - 5 assigned, 2 done
- Identifies over/under-loaded team members
- Click to filter Assembly Floor to that assignee

#### 6. Burndown/Velocity (optional, Phase 2)
- Chart showing work orders closed per week/sprint
- Trend line showing velocity
- Helps forecast completion

#### 7. Blockers & Risks (optional)
- List of high-priority work orders still in Backlog/Ready
- Critical items in Review for too long
- Assignee with too many concurrent items
- Highlights potential issues

### Data Presentation

#### Responsiveness
- Desktop: 3-column grid for phases + full tree for epics
- Tablet: 2-column grid, tree collapses
- Mobile: single column, trees collapsed by default

#### Interactivity (Read-Only)
- Hover effects (subtle highlight)
- Click phase card: shows detailed phase view
- Click epic: shows feature tree expanded to that epic
- Click work order title: shows detail view (read-only)
- No edit controls visible to leaders

#### Real-Time Updates
- Data refreshes every 5 minutes (or via Supabase Realtime)
- Realtime tag on data that auto-updates

### Export (Phase 2)
- "Export as PDF" button to download dashboard snapshot
- "Share report" to email dashboard or send link

## Database Schema
No new tables. Uses:
- work_orders (status for progress calculation)
- phases (for phase progress)
- feature_nodes (for epic/feature progress)

## API Routes
```
GET /api/projects/[projectId]/dashboard
  - Get all dashboard data
  - Response: {
      project_progress: { total, completed, percentage },
      phases: [ { id, name, position, status, work_order_count, completed_count, percentage } ],
      epics: [ { id, name, features: [ ... ], completion_percentage } ],
      recent_activity: [ { user, action, work_order_title, timestamp } ],
      team_workload: [ { user_id, name, assigned_count, completed_count } ],
      blockers: [ { id, title, status, priority, days_in_status } ]
    }
  - Status: 200
  - Access: leader role only

GET /api/projects/[projectId]/phases/[phaseId]/details
  - Get detailed phase view (work orders, progress breakdown)
  - Response: { id, name, work_orders: [], progress: ... }
  - Status: 200
```

## UI Components

### New Components
1. **DashboardLayout** (`app/components/Dashboard/DashboardLayout.tsx`)
   - Main dashboard container
   - Grid layout for sections
   - Responsive arrangement

2. **ProjectProgressRing** (create/reuse from Phase 071)
   - Circular progress indicator
   - 200px diameter
   - Percentage + count display

3. **PhaseCards** (`app/components/Dashboard/PhaseCards.tsx`)
   - Grid of phase cards
   - Each card: name, progress bar, count, status

4. **FeatureTree** (`app/components/Dashboard/FeatureTree.tsx`)
   - Expandable tree of epics/features
   - Color-coded by completion
   - Show/hide details

5. **ActivityFeed** (reuse/modify from Phase 078)
   - Recent work order activity
   - 20 most recent entries
   - Formatted for dashboard context

6. **TeamWorkloadChart** (`app/components/Dashboard/TeamWorkloadChart.tsx`)
   - Bar chart or list showing per-member load
   - Shows assigned and completed counts

7. **BlockersWidget** (`app/components/Dashboard/BlockersWidget.tsx`)
   - List of high-priority items at risk
   - Shows priority badge, status, days waiting

### Reused Components
- ProgressRing/ProgressBar (from Phase 071)
- Card (from common)
- Tree/Collapsible (from common)

## File Structure
```
app/
  components/
    Dashboard/
      DashboardLayout.tsx                 # Main dashboard container
      ProjectProgressRing.tsx             # Hero progress circle
      PhaseCards.tsx                      # Phase overview cards
      FeatureTree.tsx                     # Epic/feature tree
      ActivityFeed.tsx                    # Recent activity
      TeamWorkloadChart.tsx               # Workload visualization
      BlockersWidget.tsx                  # Blockers list
  api/
    projects/
      [projectId]/
        dashboard/
          route.ts                        # GET dashboard data
        phases/
          [phaseId]/
            details/
              route.ts                    # GET phase details
  org/[orgSlug]/
    project/[projectId]/
      dashboard/
        page.tsx                          # Dashboard page
        layout.tsx                        # Dashboard layout wrapper
      floor/
        hooks/
          useDashboard.ts                 # React Query hook for dashboard data
```

## Acceptance Criteria
- Route `/org/[slug]/project/[id]/dashboard` exists and loads
- Requires leader role (verified on API)
- Project progress ring displays with accurate percentage
- Phases display in cards with progress bars
- Phase progress counts correct: "X/Y complete"
- Epics and features shown in collapsible tree
- Feature completion percentages accurate
- Activity feed shows recent work order changes (20 entries)
- Team workload chart or list visible
- Blockers widget shows at-risk items
- All data read-only (no edit controls visible)
- Responsive layout: desktop/tablet/mobile views
- Data refreshes or shows "last updated" timestamp
- All progress calculations accurate
- No performance issues loading dashboard

## Testing Instructions

1. **Dashboard Access**
   - Non-member: navigate to dashboard → 403 or redirect to login
   - Member (not leader): navigate to dashboard → 403 or "Not authorized"
   - Leader: navigate to dashboard → loads successfully

2. **Progress Ring**
   - Project with 100 work orders, 25 done
   - Verify ring shows: "25% Complete"
   - Verify text: "25 of 100 work orders complete"
   - Ring 25% filled visually

3. **Phase Cards**
   - 3 phases in project
   - Phase 1: 4/8 done (50%)
   - Phase 2: 0/5 done (0%)
   - Phase 3: 5/5 done (100%)
   - Verify cards show correct counts and progress bars
   - Verify colors: green for 100%, yellow for 50%, gray for 0%

4. **Click Phase Card**
   - Click phase 1 card
   - Verify detail view shows: all work orders in phase with status
   - Verify modal or new view read-only (no edit buttons)

5. **Feature Tree Display**
   - Epics and features listed
   - Click epic to expand
   - Verify child features visible
   - Click epic again to collapse
   - Verify smooth animation

6. **Feature Completion Colors**
   - Feature 1: 100% → green
   - Feature 2: 50% → yellow/orange
   - Feature 3: 0% → gray
   - Verify colors correct

7. **Activity Feed**
   - Recent 20 work order updates listed
   - Shows: "[User] moved [Work Order] to In Progress" - "2 hours ago"
   - Reverse chronological (newest first)
   - Scroll to see more (or paginate)

8. **Team Workload**
   - User A: 5 assigned, 2 done
   - User B: 3 assigned, 3 done
   - User C: 8 assigned, 1 done
   - Verify chart/list shows workload distribution
   - Click user to filter Assembly Floor (optional)

9. **Blockers Widget**
   - High-priority work orders in Backlog shown
   - Critical items in Review for 5+ days shown
   - Shows priority badge, status, days waiting
   - List empty if no blockers

10. **Data Accuracy**
    - Create work orders, assign, change status
    - Dashboard progress updates correctly
    - Phase progress reflects changes
    - Feature progress aggregates correctly

11. **Read-Only Verification**
    - No edit buttons on work orders in dashboard
    - No status dropdown, no assignee changes possible
    - All controls inactive/disabled

12. **Responsive Layout**
    - Desktop (1920px): 3-column grid for phases, full tree for epics
    - Tablet (1024px): 2-column, trees collapsible
    - Mobile (375px): single column, all trees collapsed by default

13. **Real-Time Updates** (if implemented)
    - Open dashboard in two tabs
    - Tab 2: create work order, change status
    - Tab 1: verify updates appear automatically
    - Or: verify "last updated" time

14. **Performance**
    - Project with 1000 work orders, 50 phases, 20 epics
    - Load dashboard
    - Verify load time < 3s
    - Smooth scrolling

15. **Empty Project**
    - Dashboard for project with no work orders
    - Verify graceful display: "No work orders" or 0% progress
    - No errors

16. **Concurrent Activity**
    - While viewing dashboard
    - Team member creates/updates work orders
    - Dashboard updates or shows refresh button

17. **Export** (Phase 2)
    - "Export as PDF" button visible
    - Click button
    - PDF generated with dashboard snapshot
    - Verify includes all sections

18. **Share Report** (Phase 2)
    - "Share" button visible
    - Click to share link via email
    - Link shows dashboard to recipient
