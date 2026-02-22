# Phase 066 - Kanban Card Display

## Objective
Design and implement visually distinct, information-dense kanban cards that display work order summary, priority, assignee, and progress at a glance.

## Prerequisites
- Phase 062: Assembly Floor Page Layout
- Phase 065: Kanban Board View
- Next.js 14+ with App Router
- Tailwind CSS

## Context
Cards are the fundamental unit of the kanban board. They must communicate essential information at a glance (title, priority, assignee, progress) while remaining compact (150-200px width). The visual design should support quick scanning and differentiation between work orders. Cards are also interactive entry points to the detail view.

## Detailed Requirements

### Card Layout (150-200px width, 100-120px height)

#### Card Header (tight spacing)
- **Title** (2 lines max, truncate with ellipsis)
  - Font: 13px, font-weight 500 (medium)
  - Line-height: 1.4
  - Color: gray-900 (dark)
  - Truncate long titles

- **Priority Badge** (positioned top-right)
  - Colored dot or small pill: 8px dot or 24px pill
  - Colors: red (critical), orange (high), yellow (medium), gray (low)
  - Tooltip on hover: shows priority text
  - Positioned: absolute, top-right corner

#### Card Body
- **Assignee Avatar** (bottom-left)
  - 28px circular avatar image
  - Border: 1px light gray
  - Initials fallback if no image
  - Hover: tooltip with full name
  - Positioned: absolute, bottom-left

- **Acceptance Criteria Count** (bottom-right)
  - Format: "3/5 AC" or "3/5" in small font (11px)
  - Color: gray-600
  - Shows completed/total AC
  - Placeholder for Phase 078 (checkbox implementation)

- **Feature/Epic Tag** (optional, if space)
  - Small badge showing linked feature or epic name
  - Truncated to fit
  - Positioned: below title or inline with priority
  - Background: light blue or gray
  - Text: 11px

#### Card Styling
- **Background**: white, with subtle shadow
- **Border**: 1px solid gray-200
- **Hover State**:
  - Shadow elevation (0 4px 12px rgba(0, 0, 0, 0.15))
  - Background: slight gray-50 tint
  - Cursor: pointer
  - Smooth transition (150ms)
- **Dragging State** (via dnd-kit):
  - Opacity: 0.5 or ghost effect
  - Shadow: rgba(0, 0, 0, 0.3)
- **Focus State** (keyboard navigation):
  - Outline: 2px blue (for accessibility)
  - Background: subtle highlight

### Card Variants

#### Compact Mode (optional toggle)
- Even smaller: 120px width, 80px height
- Hide feature tag
- Priority badge small dot only
- Title 1 line only
- AC count only, no label

#### Full Mode (default)
- Standard 150-200px
- All info visible
- Readable text

### Interactions

#### Click/Tap
- Open work order detail view (slide-over)
- Passed to parent: click handler receives work_order_id

#### Hover
- Elevation shadow
- Slight background shift
- Show tooltip on assignee
- Show priority text tooltip

#### Right-Click (optional)
- Context menu: Edit, Delete, Quick Actions
- Implement in Phase 077

### Status-Specific Styling (optional)
- Cards in "Done" column may have faded appearance (opacity 0.85)
- Cards in "In Progress" may have subtle left border accent
- Applied via CSS based on status prop

## Database Schema
No new tables; uses `work_orders` from Phase 061.

## API Routes
No new routes; uses GET work-orders endpoint from Phase 065.

## UI Components

### New Components
1. **KanbanCard** (`app/components/Assembly/KanbanCard.tsx`)
   - Main card component
   - Props:
     ```typescript
     interface KanbanCardProps {
       id: string;
       title: string;
       priority: 'critical' | 'high' | 'medium' | 'low';
       assignee?: {
         id: string;
         name: string;
         avatar_url?: string;
       };
       acceptanceCriteria?: {
         completed: number;
         total: number;
       };
       featureNode?: {
         id: string;
         name: string;
       };
       onCardClick: (id: string) => void;
       isDragging?: boolean;
       compact?: boolean;
     }
     ```
   - Renders all sections
   - Handles click/hover/drag state

2. **PriorityBadge** (`app/components/Assembly/PriorityBadge.tsx`)
   - Colored dot with tooltip
   - Props: priority, size ('sm'|'md'|'lg'), showLabel
   - Reusable across app

3. **UserAvatar** (`app/components/common/UserAvatar.tsx`)
   - Circular avatar with initials
   - Props: name, avatar_url, size
   - Reusable component

4. **AcProgressMini** (`app/components/Assembly/AcProgressMini.tsx`)
   - Shows "X/Y AC" count
   - Small, right-aligned text

5. **FeatureTag** (`app/components/Assembly/FeatureTag.tsx`)
   - Small badge showing feature/epic name
   - Truncated text
   - Optional component

### Reused Components
- Avatar: from common library or shadcn/ui
- Tooltip: from common tooltip component

## File Structure
```
app/
  components/
    Assembly/
      KanbanCard.tsx                      # Main card component
      PriorityBadge.tsx                   # Priority indicator
      AcProgressMini.tsx                  # AC count display
      FeatureTag.tsx                      # Feature badge
      KanbanCard.module.css               # Card styling
    common/
      UserAvatar.tsx                      # Avatar component (if not exists)
      Tooltip.tsx                         # Tooltip wrapper (if not exists)
```

## Styling Details

### CSS Classes (Tailwind)
```css
/* Card container */
.kanban-card {
  @apply relative w-40 h-28 bg-white border border-gray-200 rounded-lg p-3 cursor-pointer transition-all duration-150 hover:shadow-md hover:bg-gray-50;
}

.kanban-card:focus-visible {
  @apply outline-2 outline-blue-500 outline-offset-1;
}

.kanban-card.dragging {
  @apply opacity-50 shadow-lg;
}

.kanban-card.done {
  @apply opacity-85;
}

/* Title */
.kanban-card-title {
  @apply text-sm font-medium text-gray-900 line-clamp-2 mb-2;
}

/* Priority badge */
.priority-badge {
  @apply absolute top-3 right-3;
}

/* Assignee avatar */
.assignee-avatar {
  @apply absolute bottom-3 left-3 w-7 h-7;
}

/* AC count */
.ac-count {
  @apply absolute bottom-3 right-3 text-xs text-gray-600;
}

/* Feature tag */
.feature-tag {
  @apply text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block;
}

/* Compact variant */
.kanban-card.compact {
  @apply w-32 h-20 p-2;
}

.kanban-card.compact .kanban-card-title {
  @apply text-xs line-clamp-1;
}
```

## Acceptance Criteria
- Card displays in kanban column with correct dimensions
- Title shows (2 lines, truncated with ellipsis)
- Priority badge visible in top-right with correct color
- Assignee avatar visible in bottom-left with initials or image
- AC count visible in bottom-right (format: "3/5" or "3/5 AC")
- Feature tag displays if feature linked (truncated if needed)
- Hover state: elevation shadow, background highlight, smooth transition
- Click card: opens work order detail view
- Drag state: card appears ghost/semi-transparent
- Focus state: keyboard navigation shows focus outline
- Compact mode: smaller card with less info (if toggled)
- All text truncated appropriately (no overflow)
- Responsive: card sizing adapts to column width

## Testing Instructions

1. **Basic Card Rendering**
   - Create work order with all fields
   - Add to kanban column
   - Verify card displays with correct dimensions

2. **Title Display**
   - Create work order with short title (< 20 chars)
   - Verify title displays fully, not truncated
   - Create with long title (> 50 chars)
   - Verify title truncated with ellipsis
   - Verify 2-line limit enforced

3. **Priority Badge**
   - Create work orders with each priority: critical, high, medium, low
   - Verify each shows correct color: red, orange, yellow, gray
   - Hover over badge
   - Verify tooltip shows priority text
   - Verify badge positioned top-right

4. **Assignee Avatar**
   - Create work order assigned to user with avatar
   - Verify avatar displays correctly
   - Create unassigned work order
   - Verify empty avatar or placeholder shows
   - Hover over avatar
   - Verify tooltip with user name appears

5. **AC Count Display**
   - Create work order with 0 AC: verify "0/0" shows
   - Create with 3 total AC: verify "0/3" shows
   - In future (Phase 078), check completed AC
   - Verify positioned bottom-right

6. **Feature Tag**
   - Create work order linked to feature node
   - Verify feature tag displays below title (or inline)
   - Verify tag text truncated if needed
   - Create work order without feature link
   - Verify no tag displays (space available for other content)

7. **Hover State**
   - Hover over card
   - Verify shadow elevation increases
   - Verify background slightly lighter
   - Verify smooth 150ms transition
   - Verify cursor changes to pointer

8. **Click Interaction**
   - Click card
   - Verify detail view opens (slide-over)
   - Close detail view
   - Return to kanban

9. **Drag State** (during Phase 065 testing)
   - Drag card
   - Verify opacity reduces (0.5)
   - Verify shadow appears
   - Release
   - Verify returns to normal state

10. **Focus & Keyboard Navigation**
    - Tab to card on kanban board
    - Verify focus outline visible (2px blue)
    - Verify focus ring has proper contrast
    - Press Enter to activate (if applicable)

11. **Compact Mode** (if implemented)
    - Toggle compact mode in board view
    - Verify cards display smaller (120px width)
    - Verify title 1 line only
    - Verify feature tag hidden
    - Verify all essential info still visible

12. **Responsive Card Width**
    - Test at 1920px: cards full size
    - Test at 1024px: cards may compress
    - Test at 768px: verify still readable

13. **Multiple Card States**
    - Create cards with different combinations of fields
    - Some with assignee, some without
    - Some with feature, some without
    - Verify all combinations render correctly

14. **Visual Consistency**
    - Multiple cards in column
    - Verify consistent spacing and alignment
    - Verify hover/focus effects apply to all
