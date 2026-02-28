# Phase 020: Step Output Summary Cards Component

## Phase Overview
**Stage:** Epic 3: Documentation Stage (Infrastructure)
**Phase:** 020
**Time Estimate:** 2-3 hours
**Complexity:** Medium

## Objective
Create reusable summary cards that display completed step outputs across Helix Mode, providing quick visual overviews of what was produced, when, and by whom. These cards enable efficient navigation and progress tracking throughout the Helix process.

## Prerequisites
- Phase 019 complete: Artifact integration implemented
- helix_steps table with evidence_data fully populated
- Evidence structures from phases 015-018 implemented
- React component library accessible

## Epic Context
Phase 020 complements the Documentation Stage (Phases 015-018) and Artifact Integration (Phase 019) by providing UI components to display step outputs in multiple contexts: within step details, on the Helix dashboard, in stage overviews, and on the process timeline. These cards serve as connective tissue between different Helix UI surfaces.

## Context
Users need quick visual feedback about what's been completed in each step without having to open full step detail views. Step Output Summary Cards provide:
- Visual evidence that work was done
- Quick insight into output type (file, document, data)
- Timestamp and creator information
- Links to full evidence viewer or artifact
- Compact footprint for dashboard/timeline display

## Detailed Requirements

### 1. Card Component Design
Create `StepOutputCard.tsx` component with following structure:

**Card Layout (compact, 320px width typical):**
```
┌─────────────────────────────────────────┐
│ 🏷️ Step 2.1: Identify Documentation    │  ← Step name
│                                          │
│ 📊 12 categories, 6 with content       │  ← Evidence preview
│ Completed: 2026-02-28 14:30 UTC        │  ← Timestamp
│ By: Jane Doe                           │  ← Created by
│                                          │
│ [View Details] [Download]              │  ← Actions
└─────────────────────────────────────────┘
```

**Card Elements:**
1. **Header Section**
   - Step number and name (bold, 16px)
   - Evidence type icon (28px)
   - Steps: colored badge (e.g., "Step 2" in cyan)

2. **Preview Section**
   - Evidence summary: brief text (max 100 chars)
   - For files: file count, total size
   - For documents: section count, character count
   - For inventory: category count, completion percentage

3. **Metadata Section**
   - Completion timestamp (relative: "2 hours ago", or absolute: "Feb 28, 2026 2:30 PM")
   - Creator name (with optional avatar)
   - Status badge: "Complete" (green), "In Progress" (yellow), "Incomplete" (gray)

4. **Action Buttons**
   - "View Details" - Opens full evidence viewer or step detail
   - "Download" or context menu for additional actions

### 2. Evidence Type Handling
Card component adapts display based on evidence type:

**Type: documentation_inventory (Step 2.1)**
- Icon: `FolderOpen` (lucide-react)
- Preview: "{total} categories, {checked} with content"
- Example: "12 categories, 6 with content"
- Action: View inventory checklist

**Type: knowledge_capture (Step 2.2)**
- Icon: `BookOpen` (lucide-react)
- Preview: "{sections} sections, {characters} characters"
- Example: "8 sections, 5,234 characters"
- Action: View knowledge document

**Type: documentation_files (Step 2.3)**
- Icon: `File` (lucide-react)
- Preview: "{file_count} files, {total_size} total"
- Example: "18 files, 245 MB total"
- Action: View file list

**Type: documentation_verification (Step 2.4)**
- Icon: `CheckCircle2` (lucide-react)
- Preview: "{complete} complete, {gaps} gaps acknowledged"
- Example: "8 complete, 2 gaps acknowledged"
- Action: View verification report

### 3. Component Props
```typescript
interface StepOutputCardProps {
  stepKey: string;              // "2-1", "2-2", etc.
  stepName: string;             // "Identify Documentation"
  evidence: {
    type: string;               // evidence_type from helix_steps
    data: Record<string, any>;  // evidence_data jsonb
    created_at: string;         // ISO timestamp
    updated_at: string;         // ISO timestamp
    created_by: string;         // User email/name
  };
  onClick?: () => void;         // Handle click
  onViewDetails?: () => void;   // View full evidence
  onDownload?: () => void;      // Download artifact
  expandable?: boolean;         // Can expand for more details
  variant?: 'compact' | 'detailed'; // Display variant
}
```

### 4. Visual States and Variants

**Variant: compact (default)**
- Fixed height: 140px
- Single line preview
- Minimal text
- For dashboards, sidebars, process timelines

**Variant: detailed**
- Expandable height: 140px → 250px
- Multi-line preview
- Additional metadata
- For stage overviews, history views

**State: complete**
- Background: `bg-secondary`
- Border: 2px solid `accent-cyan`
- Status badge: green with checkmark

**State: incomplete**
- Background: `bg-tertiary`
- Border: 1px solid text-primary (muted)
- Status badge: gray

**State: in_progress**
- Background: `bg-secondary`
- Border: 2px dashed `accent-cyan`
- Status badge: yellow

### 5. Preview Text Generation
Smart preview generation based on evidence type:

```typescript
function generatePreview(evidence: EvidenceData): string {
  switch (evidence.type) {
    case 'documentation_inventory':
      const cats = evidence.data.categories || [];
      const checked = cats.filter(c => c.exists).length;
      return `${cats.length} categories, ${checked} checked`;

    case 'knowledge_capture':
      const sections = Object.keys(evidence.data.sections || {});
      const withContent = sections.filter(s =>
        evidence.data.sections[s].content.length > 50
      ).length;
      return `${withContent} of ${sections.length} sections`;

    case 'documentation_files':
      return `${evidence.data.total_files} files, ${formatBytes(evidence.data.total_size_bytes)}`;

    case 'documentation_verification':
      const complete = evidence.data.verification.categories_complete;
      const gaps = evidence.data.verification.categories_missing +
                   evidence.data.verification.categories_partial;
      return `${complete} complete, ${gaps} gaps`;

    default:
      return 'Evidence data';
  }
}
```

### 6. Icon Selection
Auto-select appropriate icon based on evidence type:

```typescript
function getEvidenceIcon(evidenceType: string): React.ReactNode {
  const iconMap = {
    documentation_inventory: <FolderOpen size={24} />,
    knowledge_capture: <BookOpen size={24} />,
    documentation_files: <File size={24} />,
    documentation_verification: <CheckCircle2 size={24} />,
  };
  return iconMap[evidenceType] || <File size={24} />;
}
```

### 7. Timestamp Formatting
Display timestamps in relative format with tooltip:

- Less than 1 minute: "Just now"
- Less than 1 hour: "15 minutes ago"
- Less than 24 hours: "2 hours ago"
- Less than 7 days: "3 days ago"
- Otherwise: "Feb 28, 2026"
- Hover tooltip: Full ISO timestamp "2026-02-28T14:30:00Z"

Use `date-fns` library for formatting:
```typescript
import { formatDistanceToNow } from 'date-fns';

const relativeTime = formatDistanceToNow(new Date(evidence.created_at), { addSuffix: true });
// Output: "2 hours ago"
```

### 8. Expandable Details
When variant="detailed" and expandable=true:

**Expanded view shows:**
- Full step name and number
- Complete preview text (up to 300 chars)
- Creator avatar (if available)
- Created and updated timestamps
- Evidence type label
- "View Full Evidence" link
- Additional metadata per type

**Collapse/expand animation:**
- Smooth height transition (200ms)
- Arrow icon rotates on expand
- Click anywhere on card to toggle

### 9. Context Menu / Actions
Right-click or action menu provides:
- "View Details" - Open full evidence viewer
- "Download" - Download artifact (if applicable)
- "Share" - Get shareable link (future)
- "Delete" - Remove evidence (admin only, future)
- "Archive" - Move to archive (future)

### 10. Component Breakdown

#### File: `components/helix/StepOutputCard.tsx`
```typescript
interface StepOutputCardProps {
  stepKey: string;
  stepName: string;
  evidence: Evidence;
  onClick?: () => void;
  onViewDetails?: () => void;
  onDownload?: () => void;
  expandable?: boolean;
  variant?: 'compact' | 'detailed';
}

export function StepOutputCard(props: StepOutputCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.card}>
      {/* Header with step name and icon */}
      {/* Preview section */}
      {/* Metadata section */}
      {/* Expanded details (if applicable) */}
      {/* Action buttons */}
    </div>
  );
}
```

#### File: `components/helix/StepOutputCardGrid.tsx`
```typescript
interface StepOutputCardGridProps {
  steps: StepOutput[];  // Array of completed steps
  columns?: number;     // Default: 2, responsive
  gap?: string;         // Spacing between cards
}

// Render grid of StepOutputCard components
// Responsive: 1 column (mobile), 2 columns (tablet), 3+ columns (desktop)
```

#### File: `lib/helix/step-output-utils.ts`
```typescript
// Utility functions for step output cards:
export function generatePreview(evidence: Evidence): string
export function getEvidenceIcon(type: string): React.ReactNode
export function formatTimestamp(date: string, format?: 'relative' | 'absolute'): string
export function calculateEvidenceSize(evidence: Evidence): number
export function isEvidenceComplete(evidence: Evidence): boolean
export function getEvidenceStatus(evidence: Evidence): 'complete' | 'incomplete' | 'in_progress'
```

## File Structure
```
/components/helix/
  ├── StepOutputCard.tsx                (Main card component)
  ├── StepOutputCardGrid.tsx            (Grid layout wrapper)
  ├── StepOutputCardHeader.tsx          (Card header section)
  ├── StepOutputCardPreview.tsx         (Preview content section)
  ├── StepOutputCardMetadata.tsx        (Metadata footer section)
  └── StepOutputCardActions.tsx         (Action buttons/menu)

/lib/helix/
  └── step-output-utils.ts              (Utility functions)

/styles/helix/
  └── step-output-card.module.css       (Component styles)
```

## Dependencies

### Components
- React hooks (useState, useCallback)
- lucide-react icons
- Tooltip component (Radix UI or custom)
- Context menu component (or use native right-click)

### Libraries
- `date-fns` - Relative timestamp formatting
- `classnames` - Conditional CSS classes

### Data
- helix_steps table (for evidence data)
- User information (creator name/email)

## Tech Stack
- **Frontend:** Next.js 16+, TypeScript, React
- **Styling:** Tailwind CSS v4, CSS modules
- **Icons:** lucide-react
- **Utilities:** date-fns
- **Database:** Supabase (query helix_steps)

## Acceptance Criteria

1. **Card Renders**: Component renders compact card with step name, icon, preview, timestamp, creator
2. **Evidence Types Handled**: Card correctly displays preview for all 4 evidence types (inventory, knowledge, files, verification)
3. **Icons Display Correctly**: Appropriate icon appears for each evidence type, icon size and color match design
4. **Preview Text Accurate**: Preview text correctly summarizes evidence (file count, section count, etc.)
5. **Timestamps Format**: Relative timestamps display correctly ("2 hours ago"), hover shows absolute time
6. **Responsive Layout**: Cards stack on mobile, display in grid on desktop, spacing consistent
7. **Expandable Works**: Card expands on click to show details, collapse works, smooth animation
8. **Variants Work**: Compact variant shows minimal info, detailed variant shows more
9. **Status Badges Display**: Complete/incomplete/in-progress status shows with correct color
10. **Action Buttons Work**: View Details, Download buttons functional, click handlers called

## Testing Instructions

1. **Test Card Rendering**
   - Create step with evidence of each type
   - Render StepOutputCard for each
   - Verify all elements display: name, icon, preview, timestamp, creator
   - Verify styling applied correctly

2. **Test Evidence Type Preview**
   - Step 2.1: Verify shows "12 categories, 6 checked"
   - Step 2.2: Verify shows "8 sections, 5,234 characters"
   - Step 2.3: Verify shows "18 files, 245 MB"
   - Step 2.4: Verify shows "8 complete, 2 gaps acknowledged"

3. **Test Icons**
   - Step 2.1: Verify FolderOpen icon displays
   - Step 2.2: Verify BookOpen icon displays
   - Step 2.3: Verify File icon displays
   - Step 2.4: Verify CheckCircle2 icon displays
   - Verify icon colors and sizes

4. **Test Timestamp Formatting**
   - Evidence created 5 minutes ago: displays "5 minutes ago"
   - Evidence created 2 days ago: displays "2 days ago"
   - Evidence created 30 days ago: displays "Jan 29, 2026"
   - Hover on timestamp: shows absolute time in tooltip

5. **Test Expandable Cards**
   - Render card with variant="detailed"
   - Click on card, verify expands smoothly
   - Verify expanded shows additional details
   - Click again, verify collapses
   - Verify animation smooth (200ms duration)

6. **Test Compact vs. Detailed**
   - Render same step with variant="compact"
   - Verify height fixed at ~140px
   - Render with variant="detailed"
   - Verify can expand beyond 140px
   - Verify text overflow handled correctly in compact

7. **Test Status Badges**
   - Complete step: verify green "Complete" badge
   - Incomplete step: verify gray badge
   - In-progress step: verify yellow badge
   - Verify colors match CSS variables

8. **Test Responsive Grid**
   - Render StepOutputCardGrid with 4 steps
   - Desktop (1200px+): verify 3 columns
   - Tablet (768px): verify 2 columns
   - Mobile (375px): verify 1 column
   - Verify spacing/gap consistent

9. **Test Action Buttons**
   - Click "View Details" button
   - Verify onViewDetails callback called
   - Click "Download" button (if available)
   - Verify onDownload callback called
   - Verify buttons accessible on keyboard

10. **Test Accessibility**
    - Verify keyboard navigation (Tab, Enter)
    - Verify screen reader reads card content
    - Verify color not only differentiator for status
    - Verify sufficient contrast for text/icons
    - Verify ARIA labels on buttons

## Notes for AI Agent

### Implementation Guidance
- Create card as self-contained, reusable component
- Use Tailwind utility classes for styling, avoid custom CSS when possible
- Implement evidence preview generation as pure function (testable)
- Use proper TypeScript interfaces for type safety
- Consider performance: memoize expensive calculations

### Component Structure
```typescript
// StepOutputCard.tsx structure
function StepOutputCard({ stepKey, stepName, evidence, ...props }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Compute derived values
  const preview = generatePreview(evidence);
  const icon = getEvidenceIcon(evidence.type);
  const timestamp = formatTimestamp(evidence.created_at, 'relative');
  const status = getEvidenceStatus(evidence);

  // Render
  return (
    <div onClick={() => setExpanded(!expanded)}>
      <CardHeader stepName={stepName} icon={icon} status={status} />
      <CardPreview text={preview} />
      <CardMetadata timestamp={timestamp} creator={evidence.created_by} />
      {expanded && <CardActions {...props} />}
    </div>
  );
}
```

### Preview Generation Logic
- Keep preview generation in separate utility function
- Handle edge cases: empty evidence, missing data
- Preview should fit in single line for compact variant
- Use consistent formatting (e.g., always show counts)

### Styling Strategy
- Use Tailwind classes for responsive design
- Use CSS variables for colors: `var(--bg-primary)`, etc.
- Create `.module.css` for complex animations
- Ensure sufficient contrast for accessibility

### Performance Considerations
- Memoize component with React.memo if used in lists
- Lazy load expanded content (don't render hidden details)
- Use useCallback for event handlers
- Don't re-fetch data on re-renders

### Accessibility
- All buttons should have aria-labels
- Card should be keyboard navigable
- Ensure color is not sole differentiator
- Use semantic HTML: <button>, <time>, etc.
- Include ARIA live region for expanded state

### Testing Strategy
- Unit test preview generation function
- Unit test icon selection function
- Component tests for rendering different states
- Snapshot tests for layout
- Integration tests with real data from helix_steps

### Common Pitfalls
- Don't hard-code card width (use responsive container)
- Don't forget hover/focus states for accessibility
- Don't show preview that's misleading (truncate properly)
- Don't forget to handle missing/corrupt evidence data
- Test with very long creator names and step names

### Future Enhancements
- Copy evidence link/share functionality
- Quick edit from card (inline editing)
- Comparison view (compare evidence between two steps)
- History/versioning of evidence
- Evidence annotations/comments
- Integration with team communication (@ mentions)

---

**Phase Author:** Helix Documentation Stage Design Team
**Version:** 1.0
**Last Updated:** 2026-02-28
**Status:** Ready for Implementation
