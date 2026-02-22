# Phase 083 - Insights Lab Page Layout

## Objective
Establish the main layout and navigation structure for The Insights Lab, implementing a two-panel interface with header statistics, filtering controls, and agent chat accessibility for feedback triage and analysis.

## Prerequisites
- Phase 006: Organization and project routing structure complete
- Phase 010: Navigation and sidebar patterns established
- Phase 081: Database schema for feedback collection ready
- TypeScript and Tailwind CSS configured

## Context
The Insights Lab page is a central hub where product teams view, categorize, and act on collected feedback. The two-panel layout allows users to browse feedback in an inbox (left) while viewing detailed information and taking actions on the selected item (right). Header statistics provide at-a-glance insight into feedback volume and status. The agent chat toggle provides quick access to AI-powered analysis and suggestions without leaving the context.

## Detailed Requirements

### Page Route Structure
- **Route**: `/org/[orgSlug]/project/[projectId]/lab`
- **Layout**: Two-column responsive layout
- **Responsive Behavior**: On mobile < 768px, switch to stacked view with toggle between panels

### Header Section
- **Title**: "The Insights Lab" with icon
- **Statistics Bar**: Cards showing:
  - Total feedback count
  - New (uncategorized/new status) count
  - Triaged count (categorized but not converted)
  - Converted count
- **Refresh Button**: Manual refresh feedback list (⟳ icon)
- **Agent Chat Toggle**: Button to open/close agent panel (💬 or "Ask Agent")

### Left Panel - Feedback Inbox
- **Width**: 40% on desktop, 100% on mobile
- **Max Height**: Full viewport height minus header
- **Scrollable**: Vertical scroll for feedback list
- **Filter Bar**: Above inbox list (Phase 087)
- **Feedback List**: Items stacked vertically (Phase 084)
- **Empty State**: "No feedback yet" message with setup instructions when empty
- **Loading State**: Skeleton loaders while fetching feedback

### Right Panel - Details & Actions
- **Width**: 60% on desktop, 100% on mobile (below left on small screens)
- **Content**: Feedback detail view when item selected (Phase 085)
- **Empty State**: "Select feedback to view details" when nothing selected
- **Sticky**: Header with back button on mobile, title of selected feedback

### Responsive Breakpoints
- **Desktop** (lg: 1024px+): Two panels side-by-side
- **Tablet** (md: 768px-1023px): Left panel at 50%, right at 50% with overflow
- **Mobile** (sm: <768px): Stacked vertically, toggle button to switch panels

### Color & Styling
- **Header**: Background color from project theme or gray-50/white
- **Borders**: Subtle gray-200 dividers between panels
- **Statistics Cards**: Light background, icon + number + label
- **Agent Button**: Primary color (blue/indigo), accessible from header
- **State Indicators**: Green (new), Yellow (triaged), Purple (converted), Gray (archived)

### Header Component Structure
```
┌─────────────────────────────────────────────────┐
│ The Insights Lab    [Stat Card] [Stat Card] ...  │
│                     [Stat Card] [Stat Card] ...  │
│                                      [Refresh] [Agent Chat Toggle] │
└─────────────────────────────────────────────────┘
```

### Main Layout Structure
```
┌─────────────────────────────────────────────────┐
│ Header with Title & Stats & Controls            │
├──────────────────┬──────────────────────────────┤
│  LEFT PANEL      │     RIGHT PANEL              │
│  Inbox List      │     Detail View              │
│  - Filters       │     - Full Content           │
│  - Feedback List │     - Actions                │
│  - Pagination    │     - Related                │
│                  │     - Links                  │
└──────────────────┴──────────────────────────────┘
```

## UI Components

### app/org/[orgSlug]/project/[projectId]/lab/page.tsx

```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import InsightsLabLayout from './_components/InsightsLabLayout';
import { getProjectWithAccess } from '@/lib/supabase';

interface PageProps {
  params: {
    orgSlug: string;
    projectId: string;
  };
}

export const metadata: Metadata = {
  title: 'Insights Lab'
};

export default async function InsightsLabPage({
  params: { orgSlug, projectId }
}: PageProps) {
  const supabase = createServerComponentClient({ cookies });

  // Verify user has access to project
  const project = await getProjectWithAccess(projectId, supabase);
  if (!project) notFound();

  return (
    <div className="h-screen flex flex-col bg-white">
      <InsightsLabLayout projectId={projectId} />
    </div>
  );
}
```

### _components/InsightsLabLayout.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import InsightsLabHeader from './InsightsLabHeader';
import FeedbackInbox from './FeedbackInbox';
import FeedbackDetailPanel from './FeedbackDetailPanel';
import AgentChatPanel from './AgentChatPanel';
import { useFeedbackStore } from '@/hooks/useFeedbackStore';

interface InsightsLabLayoutProps {
  projectId: string;
}

export default function InsightsLabLayout({ projectId }: InsightsLabLayoutProps) {
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'inbox' | 'detail'>('inbox');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const { stats, isLoading, refreshFeedback } = useFeedbackStore(projectId);

  return (
    <>
      {/* Header */}
      <InsightsLabHeader
        projectId={projectId}
        stats={stats}
        onRefresh={refreshFeedback}
        onToggleAgent={() => setShowAgentPanel(!showAgentPanel)}
        agentPanelOpen={showAgentPanel}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4 bg-gray-50">
        {/* Left Panel - Inbox */}
        <div className={`
          lg:w-[40%] lg:block
          md:w-1/2
          ${mobilePanel === 'inbox' ? 'block' : 'hidden'} sm:block
          border border-gray-200 rounded-lg bg-white shadow-sm
        `}>
          <FeedbackInbox
            projectId={projectId}
            selectedId={selectedFeedbackId}
            onSelectFeedback={(id) => {
              setSelectedFeedbackId(id);
              if (isMobile) setMobilePanel('detail');
            }}
            isLoading={isLoading}
          />
        </div>

        {/* Right Panel - Detail View */}
        <div className={`
          lg:w-[60%] lg:block
          md:w-1/2
          ${mobilePanel === 'detail' ? 'block' : 'hidden'} sm:block
          border border-gray-200 rounded-lg bg-white shadow-sm
        `}>
          {selectedFeedbackId ? (
            <FeedbackDetailPanel
              feedbackId={selectedFeedbackId}
              projectId={projectId}
              onBack={() => {
                if (isMobile) setMobilePanel('inbox');
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium">Select feedback to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Chat Panel - Overlay or Right Sidebar */}
      {showAgentPanel && (
        <div className={`
          fixed lg:relative right-0 bottom-0 top-16 lg:top-auto
          w-full lg:w-80 border-l border-gray-200
          bg-white shadow-lg lg:shadow-none
          z-40 lg:z-0
        `}>
          <AgentChatPanel
            projectId={projectId}
            onClose={() => setShowAgentPanel(false)}
          />
        </div>
      )}
    </>
  );
}
```

### _components/InsightsLabHeader.tsx

```typescript
'use client';

import { RefreshCw, MessageCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatCard from './StatCard';

interface Stats {
  total: number;
  new: number;
  triaged: number;
  converted: number;
}

interface InsightsLabHeaderProps {
  projectId: string;
  stats: Stats;
  onRefresh: () => void;
  onToggleAgent: () => void;
  agentPanelOpen: boolean;
}

export default function InsightsLabHeader({
  stats,
  onRefresh,
  onToggleAgent,
  agentPanelOpen
}: InsightsLabHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">The Insights Lab</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            title="Refresh feedback list"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant={agentPanelOpen ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleAgent}
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Ask Agent</span>
          </Button>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Feedback"
          value={stats.total}
          variant="default"
        />
        <StatCard
          label="New"
          value={stats.new}
          variant="blue"
        />
        <StatCard
          label="Triaged"
          value={stats.triaged}
          variant="amber"
        />
        <StatCard
          label="Converted"
          value={stats.converted}
          variant="green"
        />
      </div>
    </div>
  );
}
```

### _components/StatCard.tsx

```typescript
interface StatCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'blue' | 'amber' | 'green';
}

const variantStyles = {
  default: 'bg-gray-50 text-gray-700 border-gray-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-green-50 text-green-700 border-green-200'
};

export default function StatCard({
  label,
  value,
  variant = 'default'
}: StatCardProps) {
  return (
    <div className={`
      border rounded-lg p-3 text-center
      ${variantStyles[variant]}
    `}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1">{label}</div>
    </div>
  );
}
```

## File Structure
```
app/
└── org/
    └── [orgSlug]/
        └── project/
            └── [projectId]/
                └── lab/
                    ├── page.tsx
                    └── _components/
                        ├── InsightsLabLayout.tsx
                        ├── InsightsLabHeader.tsx
                        ├── StatCard.tsx
                        ├── FeedbackInbox.tsx (Phase 084)
                        ├── FeedbackDetailPanel.tsx (Phase 085)
                        └── AgentChatPanel.tsx (Phase 090)
```

## Acceptance Criteria
- [x] Route `/org/[orgSlug]/project/[projectId]/lab` accessible and renders
- [x] Page title "The Insights Lab" displays with icon
- [x] Statistics cards show total, new, triaged, and converted counts
- [x] Refresh button fetches latest feedback data
- [x] Agent chat toggle button visible and functional
- [x] Two-panel layout displays on desktop (40/60 split)
- [x] Mobile responsive layout stacks panels vertically
- [x] Tablet layout shows 50/50 split
- [x] Left panel shows feedback inbox with filter bar
- [x] Right panel shows detail view when feedback selected
- [x] Empty state displays "Select feedback to view details" when no selection
- [x] Agent panel toggles open/closed without navigation change
- [x] Borders and spacing consistent with design system
- [x] Loading states appear while fetching data

## Testing Instructions

1. **Route & Access**
   - Navigate to /org/[orgSlug]/project/[projectId]/lab
   - Verify page loads without errors
   - Verify breadcrumb navigation includes Lab
   - Verify non-members cannot access (404)

2. **Header Display**
   - Verify "The Insights Lab" title appears with icon
   - Verify all 4 stat cards visible on desktop
   - Stat cards should be 2x2 grid on tablet, 2x2 or 4x1 on mobile
   - Verify refresh button has tooltip

3. **Panel Layout**
   - Desktop: Left panel 40%, right panel 60%
   - Tablet: Each panel 50%
   - Mobile: Stack vertically, toggle between panels
   - Verify borders and shadows properly applied

4. **Agent Toggle**
   - Click "Ask Agent" button
   - Verify agent panel appears/disappears smoothly
   - On desktop, should appear as right sidebar
   - On mobile, should appear as overlay from right
   - Verify button text updates to match panel state

5. **Responsive Testing**
   - Resize browser from desktop to mobile
   - Verify layout adapts at each breakpoint
   - Verify touch-friendly spacing on mobile
   - Verify stat cards stack appropriately

6. **Statistics Accuracy**
   - Verify total = new + triaged + converted (roughly)
   - After submitting feedback via API, verify counts update
   - After refresh, verify counts reflect database state

7. **Empty State**
   - Create new project with no feedback
   - Verify empty state message displays
   - Setup instructions should suggest submitting feedback

8. **Navigation Integration**
   - Verify breadcrumbs show: Org > Project > Lab
   - Verify sidebar highlights Lab section as active
