# Phase 103 - Version Diff & Comparison

## Objective
Implement side-by-side diff viewing between document versions with highlighting and granular comparison options (line-by-line vs word-by-word).

## Prerequisites
- Phase 102 (Document Version History System) completed
- Diff library integrated (diff-match-patch, react-diff-viewer, or similar)

## Context
Users need to understand what changed between versions. A visual diff viewer with red/green highlighting shows additions and deletions clearly. Options for comparing at different granularities (lines vs words) provide flexibility.

## Detailed Requirements

### Diff Comparison View

#### Side-by-Side Layout
- Left panel: "Version X (from [date])" - old version
- Right panel: "Version Y (from [date])" - new version
- Both panels scrolled in sync
- Version selector dropdowns above each panel
- Toggle buttons: Line-by-line | Word-by-word diff

#### Highlighting
- Red background: deleted text (left side)
- Green background: added text (right side)
- Yellow background: modified lines (changed but same line number)
- Unchanged text: normal styling
- Line numbers shown on both sides

#### Line-by-Line Diff
- Each line is atomic unit
- Entire line colored if any content differs
- Shows line numbers
- Detects moved blocks
- Cleaner for understanding structural changes

#### Word-by-Word Diff
- Highlights individual word changes within lines
- More granular than line-level
- Shows exact character positions that changed
- Better for spotting small edits in long text

### UI Components

#### VersionDiffViewer Component
```typescript
interface VersionDiffViewerProps {
  documentId: string;
  documentType: 'requirement' | 'blueprint';
  fromVersion: number;
  toVersion: number;
  initialMode?: 'lines' | 'words';
}

export function VersionDiffViewer({
  documentId,
  documentType,
  fromVersion,
  toVersion,
  initialMode = 'lines',
}: VersionDiffViewerProps) {
  // Fetches both versions
  // Computes diff
  // Renders side-by-side view
}
```

#### DiffPanel Component
```typescript
interface DiffPanelProps {
  title: string;
  content: string;
  diffMarkers: DiffMarker[];  // Array of {position, type: 'add'|'remove'|'modify'}
  mode: 'lines' | 'words';
  lineNumbers?: boolean;
  syncScroll?: (scrollTop: number) => void;
}
```

#### VersionSelector Component
```typescript
interface VersionSelectorProps {
  documentId: string;
  documentType: string;
  currentVersion: number;
  onVersionSelect: (versionNum: number) => void;
  disabled?: boolean;
}
```

### Diff Algorithm

#### Using diff-match-patch Library
```typescript
import { diff_match_patch } from 'diff-match-patch';

interface DiffResult {
  lines: DiffLine[];
  wordDiffs: WordDiff[];
  stats: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    wordsAdded: number;
    wordsRemoved: number;
  };
}

function computeLineDiff(oldText: string, newText: string): DiffResult {
  const dmp = new diff_match_patch();

  // Split into lines
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Compute line-level diff
  const lineDiff = dmp.diff_linesToCharsMunge_(oldLines, newLines, 40);
  const diffs = dmp.diff_compute_(lineDiff[0], lineDiff[1], false, 4);

  // Convert back to lines
  const result: DiffLine[] = [];
  // Process diffs and build result

  return { lines: result, ... };
}

function computeWordDiff(oldText: string, newText: string): DiffResult {
  const dmp = new diff_match_patch();

  // Compute word-level diff
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);

  // Convert to word markers
  const result: DiffResult = {};
  // Process diffs and build result

  return result;
}
```

### Synchronized Scrolling

#### Scroll Synchronization
- When user scrolls left panel, right panel scrolls in sync
- Maintains vertical alignment for comparison
- Handles different content heights
- Works with both line and word diff modes

```typescript
function useSyncedScroll() {
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const handleLeftScroll = () => {
    if (rightPanelRef.current && leftPanelRef.current) {
      rightPanelRef.current.scrollTop = leftPanelRef.current.scrollTop;
    }
  };

  const handleRightScroll = () => {
    if (leftPanelRef.current && rightPanelRef.current) {
      leftPanelRef.current.scrollTop = rightPanelRef.current.scrollTop;
    }
  };

  return {
    leftPanelRef,
    rightPanelRef,
    handleLeftScroll,
    handleRightScroll,
  };
}
```

### Statistics Display

#### Diff Summary
```typescript
interface DiffStats {
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
  totalLinesChanged: number;
  percentageChanged: number;
  wordsAdded?: number;
  wordsRemoved?: number;
  charactersAdded?: number;
  charactersRemoved?: number;
}
```

Show summary above diff:
```
"Changes: 12 lines added, 8 lines removed, 5 lines modified (18% of document)"
```

## File Structure
```
src/
├── components/
│   ├── versioning/
│   │   ├── VersionDiffViewer.tsx
│   │   ├── DiffPanel.tsx
│   │   ├── VersionSelector.tsx
│   │   ├── DiffModeToggle.tsx
│   │   ├── DiffSummary.tsx
│   │   └── DiffSyncScroll.tsx
│   └── shared/
│       └── DiffHighlight.tsx   (styled span for diff markers)
├── lib/
│   ├── diff/
│   │   ├── differ.ts           (diff computation)
│   │   ├── formatters.ts       (format diff output)
│   │   └── algorithms.ts       (diff algorithm implementations)
│   └── types/
│       └── diff.ts             (TypeScript interfaces)
├── hooks/
│   ├── useDiff.ts              (diff computation hook)
│   └── useSyncedScroll.ts      (scroll sync hook)
└── app/api/
    └── documents/
        └── [docId]/
            └── diff/
                └── route.ts    (compute and return diff)
```

## API Routes

### POST /api/documents/[docId]/diff
Compute diff between versions:

```
Headers: Authorization: Bearer token

Body:
{
  document_type: 'requirement' | 'blueprint',
  from_version: number,
  to_version: number,
  mode: 'lines' | 'words' (optional, default 'lines')
}

Response:
{
  from_version: {
    version_number: number,
    created_at: string,
    created_by: { name },
    content: string
  },
  to_version: {
    version_number: number,
    created_at: string,
    created_by: { name },
    content: string
  },
  diffs: [
    {
      type: 'add' | 'remove' | 'modify',
      position: { line: number, column?: number },
      oldText?: string,
      newText?: string,
      context: string  // surrounding text for context
    }
  ],
  stats: {
    linesAdded: number,
    linesRemoved: number,
    linesModified: number,
    totalLinesChanged: number,
    percentageChanged: number
  },
  computation_time_ms: number
}

Errors:
- 400: Invalid version numbers or mode
- 404: Document or versions not found
- 403: Unauthorized
```

## Acceptance Criteria
- [ ] VersionDiffViewer component renders side-by-side panels
- [ ] Left panel shows "from" version, right panel shows "to" version
- [ ] Deleted text highlighted in red
- [ ] Added text highlighted in green
- [ ] Modified lines highlighted in yellow
- [ ] Line-by-line diff mode functional
- [ ] Word-by-word diff mode functional
- [ ] Mode toggle switches between line and word diffs
- [ ] Version selectors allow choosing which versions to compare
- [ ] Sync scroll keeps panels aligned during scroll
- [ ] Line numbers displayed correctly
- [ ] Diff summary shows statistics
- [ ] API endpoint computes diff correctly
- [ ] Diff computation works for requirements documents
- [ ] Diff computation works for blueprints
- [ ] Performance: diff computation < 500ms for typical documents
- [ ] Handles large documents efficiently (lazy render if needed)
- [ ] Special characters and formatting preserved in diff
- [ ] Handles empty documents gracefully
- [ ] Accessible: keyboard navigation, screen reader support
- [ ] Mobile responsive (stacked panels on small screens)

## Testing Instructions

### Diff Algorithm Tests
```typescript
// differ.test.ts
describe('Diff Algorithm', () => {
  it('detects added lines', () => {
    const old = 'Line 1\nLine 2';
    const new_ = 'Line 1\nLine 1.5\nLine 2';
    const diff = computeLineDiff(old, new_);

    expect(diff.stats.linesAdded).toBe(1);
    expect(diff.lines.some(l => l.type === 'add')).toBe(true);
  });

  it('detects removed lines', () => {
    const old = 'Line 1\nLine 2\nLine 3';
    const new_ = 'Line 1\nLine 3';
    const diff = computeLineDiff(old, new_);

    expect(diff.stats.linesRemoved).toBe(1);
  });

  it('detects modified lines', () => {
    const old = 'This is line one';
    const new_ = 'This is line one modified';
    const diff = computeLineDiff(old, new_);

    expect(diff.stats.linesModified).toBe(1);
  });

  it('computes word-level diff', () => {
    const old = 'The quick brown fox';
    const new_ = 'The slow brown fox';
    const diff = computeWordDiff(old, new_);

    // "quick" removed, "slow" added
  });
});
```

### Component Tests
```typescript
// VersionDiffViewer.test.tsx
describe('VersionDiffViewer', () => {
  it('renders both versions', () => {
    // Verify left and right panels rendered
  });

  it('highlights additions in green', () => {
    // Verify added text has green background
  });

  it('highlights deletions in red', () => {
    // Verify removed text has red background
  });

  it('syncs scroll between panels', async () => {
    // Scroll left panel, verify right panel scrolled
  });

  it('toggles between diff modes', async () => {
    // Click toggle, verify diff recomputed in new mode
  });

  it('shows diff summary statistics', () => {
    // Verify summary shows added/removed/modified counts
  });
});
```

### Integration Tests
```bash
# Compute diff between versions
curl -X POST http://localhost:3000/api/documents/{doc-id}/diff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "document_type": "requirement",
    "from_version": 1,
    "to_version": 2,
    "mode": "lines"
  }'

# Request word-level diff
curl -X POST http://localhost:3000/api/documents/{doc-id}/diff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "document_type": "requirement",
    "from_version": 1,
    "to_version": 3,
    "mode": "words"
  }'
```

### Manual Testing
1. Create requirement document with initial content
2. Create version 2 by editing content
3. Navigate to version history
4. Select "Compare versions" or "View diff"
5. Choose version 1 vs version 2
6. Verify side-by-side diff displays
7. Verify additions highlighted in green
8. Verify deletions highlighted in red
9. Toggle to word-by-word diff
10. Verify word-level changes highlighted
11. Scroll left panel and verify right panel scrolls in sync
12. Check diff summary shows correct statistics
13. Select different version pair and regenerate diff
14. Test with large document (1000+ lines)
15. Test with document containing special characters
16. Verify mobile view stacks panels vertically
