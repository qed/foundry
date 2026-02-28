# Phase 027 - Pattern Shop Page Layout

## Objective
Create the foundational three-panel layout for The Pattern Shop, establishing the visual structure and navigation paradigm for teams to work with hierarchical feature trees and requirements documents.

## Prerequisites
- Database schema for Pattern Shop (Phase 026)
- Authentication and project context (Phases 003-010)
- Tailwind CSS configured (Phase 014)
- Layout components and routing foundation (Phases 006, 010)

## Context
The Pattern Shop is accessed via a dedicated route within each project. The layout uses a three-panel paradigm:
1. **Left Panel** (collapsible): Feature tree navigation showing hierarchical decomposition
2. **Center Panel** (main): Rich text editor for requirements documents
3. **Right Panel** (collapsible): Agent chat interface for assistance

A header displays the project title and key statistics. A getting-started banner guides new projects through the initial workflow.

## Detailed Requirements

### Route Definition
- **Route Path:** `/org/[orgSlug]/project/[projectId]/shop`
- **Layout File:** `app/org/[orgSlug]/project/[projectId]/shop/layout.tsx`
- **Page File:** `app/org/[orgSlug]/project/[projectId]/shop/page.tsx`

The route uses Next.js 14 App Router dynamic segments.

### Page-Level State Management
The page manages:
- `selectedNodeId`: UUID of currently selected feature node
- `expandedNodeIds`: Set<UUID> of expanded tree nodes
- `leftPanelOpen`: boolean for collapsible left panel
- `rightPanelOpen`: boolean for collapsible right panel
- `searchQuery`: string for tree search/filter
- `statusFilter`: array of selected status values

Use React Context or Zustand to avoid prop drilling.

### Header Section
**Height:** 80px fixed at top

**Components:**
- Left: "The Pattern Shop" title with icon
- Center: Stats bar showing:
  - Epic count (X Epics)
  - Feature count (Y Features)
  - Sub-feature count (Z Sub-features)
  - Task count (W Tasks)
  - Overall completion percentage (X% complete)
- Right: User profile menu, project switcher
- All text: gray-900, font-semibold

**Styling:**
```css
height: 80px;
background: white;
border-bottom: 1px solid #e5e7eb;
display: flex;
align-items: center;
padding: 0 24px;
gap: 24px;
```

### Getting Started Alert Banner
Shown conditionally for new projects (no feature nodes created yet).

**Content:**
"Welcome to The Pattern Shop! Start by creating your first Epic, or upload a project brief and let our agent generate a feature tree for you."

**Actions:**
- "Create Epic" button (primary)
- "Upload Brief & Generate Tree" button (secondary)
- Dismiss button (X icon)

**Styling:**
- Background: #fef3c7 (amber-50)
- Border: 2px solid #fbbf24 (amber-400)
- Border-radius: 8px
- Padding: 16px
- Margin: 16px
- Display: flex, align-items: center, gap: 12px

### Three-Panel Layout Structure

```
┌─────────────────────────────────────────┐
│              HEADER (80px)              │
├────────────┬──────────────────┬─────────┤
│            │                  │         │
│ LEFT PANEL │  CENTER PANEL    │ RIGHT   │
│ (280px)    │  (flex-grow)     │ PANEL   │
│            │                  │ (360px) │
│            │                  │         │
│            │                  │         │
│            │                  │         │
│            │                  │         │
├────────────┴──────────────────┴─────────┤
│         FOOTER / STATUS BAR              │
└─────────────────────────────────────────┘
```

**Layout Properties:**
- Total height: 100vh - 80px (header)
- Left panel: 280px width, collapsible via toggle button in header
- Center panel: flex-grow, minimum 400px
- Right panel: 360px width, collapsible via toggle button in header
- Panels separated by 1px solid #e5e7eb borders
- All panels scroll independently

### Left Panel
**Content:**
- Search box with filter controls (detailed in Phase 036)
- Product Overview document (pinned at top, doc_type='product_overview')
- Feature tree hierarchy rendering feature_nodes
- Technical Requirements section (collapsed by default)

**Toggle Button:**
- Located in header left side
- Icon: chevron-left/right (Lucide or similar)
- Tooltip: "Toggle feature tree"
- Width when collapsed: 0px with smooth transition
- Padding: 12px

### Center Panel
**Content:**
- When node is selected: Requirements document editor (FRD content)
- When Product Overview is selected: Product overview editor
- When no selection: Empty state with instructional text

**Toolbar (above editor):**
- Document title display (editable inline)
- Status dropdown (not_started, in_progress, complete, blocked)
- Quick actions: Save indicator, Version history button, Share button
- Right side: Word count, outline toggle

### Right Panel
**Content:**
- "Pattern Shop Agent" title
- Chat message history (scrollable)
- Message input box at bottom with send button
- Loading indicator while agent responds

**Behavior:**
- Message history persists for current project session
- Agent responses are streamed
- Collapse/expand smooth transition

### Responsive Behavior
At breakpoints below 1400px:
- Right panel closes automatically (user can reopen)
- Left panel can still toggle

At breakpoints below 960px:
- Switch to mobile layout (stack panels vertically or use tabs)
- Panels become full-width sheets or drawers

### Color Scheme
- Header background: white (#ffffff)
- Panel backgrounds: white (#ffffff)
- Border color: #e5e7eb (gray-200)
- Text: #111827 (gray-900) for primary, #6b7280 (gray-500) for secondary
- Accent: #3b82f6 (blue-500)

## Database Schema
No new tables; uses Phase 026 schema.

## API Routes
No new routes in this phase; builds on existing project routing (Phase 010).

## UI Components

### ShopLayout Component
**Path:** `/components/PatternShop/ShopLayout.tsx`

```typescript
interface ShopLayoutProps {
  projectId: string;
  children: ReactNode;
}

export default function ShopLayout({ projectId, children }: ShopLayoutProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [stats, setStats] = useState({ epics: 0, features: 0, subfeatures: 0, tasks: 0, completionPercent: 0 });

  return (
    <div className="h-screen flex flex-col">
      <ShopHeader projectId={projectId} stats={stats}
        onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <ShopLeftPanel open={leftPanelOpen} projectId={projectId} />
        <main className="flex-1 flex flex-col border-l border-r border-gray-200">
          {children}
        </main>
        <ShopRightPanel open={rightPanelOpen} projectId={projectId} />
      </div>
    </div>
  );
}
```

### ShopHeader Component
**Path:** `/components/PatternShop/ShopHeader.tsx`

Displays title, stats, toggle buttons, and getting-started banner.

### ShopLeftPanel Component
**Path:** `/components/PatternShop/ShopLeftPanel.tsx`

Contains tree search, product overview pinned item, feature tree, and technical requirements section.

### ShopRightPanel Component
**Path:** `/components/PatternShop/ShopRightPanel.tsx`

Contains agent chat interface.

## File Structure
```
app/org/[orgSlug]/project/[projectId]/shop/
  layout.tsx          (wraps page with ShopLayout context)
  page.tsx            (empty, content provided by layout)

components/PatternShop/
  ShopLayout.tsx      (main three-panel layout)
  ShopHeader.tsx      (header with stats and toggles)
  ShopLeftPanel.tsx   (feature tree panel)
  ShopRightPanel.tsx  (agent chat panel)
  ShopGettingStarted.tsx (conditional banner)
```

## Acceptance Criteria
- [ ] Route `/org/[orgSlug]/project/[projectId]/shop` loads successfully
- [ ] Header displays with correct height (80px) and styling
- [ ] Three-panel layout renders with correct proportions (280px left, 360px right, flex-grow center)
- [ ] Left panel toggle button collapses/expands left panel smoothly
- [ ] Right panel toggle button collapses/expands right panel smoothly
- [ ] Panel widths adjust correctly (280px/360px when open, 0px when closed)
- [ ] Getting-started banner appears only when project has no feature nodes
- [ ] All three panels scroll independently
- [ ] Header stats bar exists and has layout space (actual population via Phase 041)
- [ ] Responsive design collapses panels on mobile (<960px)

## Testing Instructions

1. **Test route loading:**
   ```bash
   npm run dev
   navigate to /org/my-org/project/xyz/shop
   ```
   Verify page loads without errors and three-panel layout is visible.

2. **Test header render:**
   - Verify header is 80px tall
   - Verify title "The Pattern Shop" is visible
   - Verify stats bar has placeholder space
   - Verify user menu is in top right

3. **Test panel toggles:**
   - Click left panel toggle button
   - Verify left panel smoothly collapses to 0px width
   - Click again to expand to 280px
   - Repeat for right panel with 360px width

4. **Test getting-started banner:**
   - In a brand-new project (no feature nodes), verify banner appears
   - Verify "Create Epic" and "Upload Brief" buttons exist
   - Click dismiss (X button), banner should hide
   - Create first epic, banner should not reappear on reload

5. **Test independent scrolling:**
   - Add many feature tree nodes to left panel (to trigger scroll)
   - Scroll left panel
   - Verify center panel and right panel don't scroll
   - Scroll center panel editor independently

6. **Test responsive:**
   - Resize browser to <960px width
   - Verify layout adapts (e.g., panels stack or become drawers)

## Dependencies
- Phase 006: Layout and routing foundation
- Phase 010: Project context and routing
- Phase 014: Tailwind CSS
- Phase 026: Database schema
