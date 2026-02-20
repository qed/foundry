# Phase 095 - Feedback Bulk Operations

## Objective
Implement multi-select and bulk action capabilities for feedback items, enabling teams to perform categorization, tagging, and work order conversion at scale.

## Prerequisites
- Phase 084: Feedback inbox display with items
- Phase 086: Categorization and tagging system
- Phase 088: Convert to work order
- Phase 095: Bulk categorize bar component (from Phase 086)

## Context
When teams have hundreds of feedback items, performing actions one-by-one is inefficient. Bulk operations enable selecting multiple items at once and applying categorization, tags, or conversions to all selected items simultaneously. This dramatically speeds up triage workflows, especially for backlog grooming and handling duplicate reports.

## Detailed Requirements

### Multi-Select Functionality

#### Checkbox Support
- **List Checkboxes**: Checkbox at start of each list item
- **Header Checkbox**: "Select All" checkbox in inbox header
- **Behavior**:
  - Check item → add to selection
  - Uncheck item → remove from selection
  - Check "Select All" → check all visible items (respecting current filters)
  - Uncheck "Select All" → uncheck all items
  - Partial selection → header checkbox shows minus/dash icon

#### Selection State
- **Visual**: Selected items highlighted with background color
- **Counter**: "X items selected" badge in header
- **Persistence**: Selection persists while navigating detail panel
- **Clear**: Selection clears when applying filters or changing sort

### Floating Action Bar

Appears at bottom of screen when items selected:
- **Position**: Fixed bottom, centered or right-aligned
- **Width**: Responsive, full width on mobile
- **Z-index**: Above other elements
- **Background**: White with shadow
- **Dismiss**: X button to close without action

#### Action Bar Contents

**Left Side**:
- Selection counter: "12 items selected"
- "Select all X items in project" link (if filtered)

**Center**:
- Action buttons (see below)

**Right Side**:
- "Clear Selection" button
- Close button (X)

### Bulk Actions Available

#### 1. Bulk Categorize
- **Button**: Category icons as quick buttons (bug, feature, ux, etc.)
- **Behavior**: Click icon → confirmation dialog → apply to all
- **Dialog**: "Apply [Category] to X items?"
- **Confirmation**: Shows preview of affected items

#### 2. Bulk Tag
- **Button**: "Add Tag" text button with dropdown
- **Behavior**: Select tag → apply to all
- **Duplicate Prevention**: Don't add if items already have tag
- **Multiple Tags**: Can apply multiple tags in succession

#### 3. Bulk Archive
- **Button**: Archive icon with text
- **Confirmation**: "Archive X items? This can be undone."
- **Effect**: Mark status as "archived", move to bottom of list

#### 4. Bulk Convert to Work Order
- **Button**: "Convert to WO" button
- **Behavior**: Opens dialog to select template/parent
- **Bulk Logic**: Creates one work order referencing multiple feedback items
  - Title: Auto-generated from cluster theme
  - Description: Lists all feedback items
  - Can edit before creating
- **Alternative**: Create separate work orders for each item (checkbox option)

#### 5. Bulk Delete
- **Visibility**: Admin only
- **Button**: Trash icon
- **Confirmation**: "Permanently delete X items? This cannot be undone."
- **Soft Delete**: Mark as deleted_at, don't hard delete

### Confirmation Dialogs

**Typical Structure**:
- Icon/emoji for action
- Title: "Apply [action] to X items?"
- Preview: Show 3 example items
- Checkbox: "Don't show this confirmation again"
- Buttons: Cancel, Confirm

**Example**:
```
🏷️ Add tag to 5 items?

Preview:
- "App crashes on login"
- "Login button unresponsive"
- "Can't sign in"

[x] Don't show again

[Cancel] [Apply]
```

### Batch Processing

For large operations (100+ items):
- **Progress Indicator**: Show progress bar
- **Estimate**: "Processing ~2 seconds remaining"
- **Pausable**: Pause button (if long operation)
- **Cancellable**: Cancel button stops and rolls back changes
- **Background**: Can minimize and continue working

### Keyboard Shortcuts

- **Cmd/Ctrl+A**: Select all visible items
- **Shift+Click**: Range select from last clicked to current
- **Escape**: Clear selection
- **Delete**: Archive selected items (if no text input active)

### Mobile Considerations

**Touch Interactions**:
- Larger checkboxes for touch (48px minimum)
- Long-press to open context menu with actions
- Action bar slides up from bottom
- Swipe down to close action bar

**Responsive Behavior**:
- On mobile: Stack actions vertically
- On tablet: Show 2-column action buttons
- On desktop: Show all buttons horizontally

## UI Components

### _components/FeedbackInbox.tsx (Updated)

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import FeedbackInboxItem from './FeedbackInboxItem';
import FeedbackInboxHeader from './FeedbackInboxHeader';
import BulkActionsBar from './BulkActionsBar';
import InboxPagination from './InboxPagination';
import { getFeedbackList } from '@/lib/supabase/feedback';

interface FeedbackInboxProps {
  projectId: string;
  selectedId: string | null;
  onSelectFeedback: (id: string) => void;
  isLoading: boolean;
}

export default function FeedbackInbox({
  projectId,
  selectedId,
  onSelectFeedback,
  isLoading: parentLoading
}: FeedbackInboxProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'highest-score' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['feedback', projectId, sortBy, currentPage],
    queryFn: () =>
      getFeedbackList(projectId, {
        sortBy,
        page: currentPage,
        pageSize
      }),
    staleTime: 30000
  });

  const feedback = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const totalCount = data?.totalCount || 0;

  // Selection handlers
  const handleSelectItem = useCallback((id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(false);
  }, [selectedIds]);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(feedback.map(f => f.id)));
      setSelectAll(true);
    }
  }, [selectAll, feedback]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, []);

  const handleBulkActionComplete = useCallback(() => {
    refetch();
    handleClearSelection();
  }, [refetch, handleClearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
      if (e.key === 'Escape') {
        handleClearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAll, handleClearSelection]);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200">
      {/* Inbox Header */}
      <FeedbackInboxHeader
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalCount={totalCount}
        selectedCount={selectedIds.size}
        allSelected={selectAll}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {/* Feedback List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading || parentLoading ? (
          // Skeleton loaders
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="flex items-center justify-center h-full text-red-600">
            <div className="text-center">
              <p className="font-medium">Error loading feedback</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : feedback.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No feedback found</p>
              <p className="text-sm mt-2">
                Feedback will appear here once users submit it
              </p>
            </div>
          </div>
        ) : (
          // Feedback items
          <div className="divide-y divide-gray-100">
            {feedback.map((item) => (
              <FeedbackInboxItem
                key={item.id}
                feedback={item}
                isSelected={selectedId === item.id}
                isCheckboxSelected={selectedIds.has(item.id)}
                onSelect={() => onSelectFeedback(item.id)}
                onCheckboxSelect={() => handleSelectItem(item.id)}
                showCheckbox={selectedIds.size > 0 || selectAll}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !isLoading && feedback.length > 0 && (
        <InboxPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          projectId={projectId}
          selectedIds={Array.from(selectedIds)}
          totalSelected={selectedIds.size}
          onClose={handleClearSelection}
          onActionComplete={handleBulkActionComplete}
        />
      )}
    </div>
  );
}
```

### _components/FeedbackInboxItem.tsx (Updated)

```typescript
'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Lightbulb,
  Eye,
  Zap,
  Tag,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feedback {
  id: string;
  content: string;
  category: string;
  status: string;
  score: number | null;
  submitter_email: string | null;
  submitter_name: string | null;
  created_at: string;
}

interface FeedbackInboxItemProps {
  feedback: Feedback;
  isSelected: boolean;
  isCheckboxSelected: boolean;
  onSelect: () => void;
  onCheckboxSelect: () => void;
  showCheckbox: boolean;
}

export default function FeedbackInboxItem({
  feedback,
  isSelected,
  isCheckboxSelected,
  onSelect,
  onCheckboxSelect,
  showCheckbox
}: FeedbackInboxItemProps) {
  // ... (existing category config code) ...

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
      {/* Checkbox */}
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isCheckboxSelected}
          onChange={onCheckboxSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 mt-2 cursor-pointer"
        />
      )}

      {/* Rest of item content */}
      <button
        onClick={onSelect}
        className={cn(
          'flex-1 text-left transition-colors border-l-4 hover:bg-gray-50',
          isSelected
            ? 'bg-indigo-50 border-l-indigo-600'
            : 'border-l-transparent'
        )}
      >
        {/* ... existing content ... */}
      </button>
    </div>
  );
}
```

### _components/BulkActionsBar.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Tag, Archive, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BulkCategorizeBar from './BulkCategorizeBar';
import BulkTagDialog from './BulkTagDialog';
import BulkConvertDialog from './BulkConvertDialog';
import { useToast } from '@/hooks/useToast';
import { archiveFeedback, deleteFeedback } from '@/lib/supabase/feedback';

interface BulkActionsBarProps {
  projectId: string;
  selectedIds: string[];
  totalSelected: number;
  onClose: () => void;
  onActionComplete: () => void;
}

export default function BulkActionsBar({
  projectId,
  selectedIds,
  totalSelected,
  onClose,
  onActionComplete
}: BulkActionsBarProps) {
  const [showCategorize, setShowCategorize] = useState(false);
  const [showTag, setShowTag] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const archiveMutation = useMutation({
    mutationFn: () => archiveFeedback(selectedIds),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Archived ${totalSelected} items`,
        variant: 'success'
      });
      onActionComplete();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFeedback(selectedIds),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Deleted ${totalSelected} items`,
        variant: 'success'
      });
      onActionComplete();
    }
  });

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-6 right-6 lg:bottom-auto lg:right-6 lg:left-auto lg:w-auto
                      bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-40">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Counter */}
          <div className="text-sm font-medium text-gray-900">
            {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
          </div>

          {/* Actions */}
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-2 w-full lg:w-auto">
            {/* Categorize */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategorize(true)}
              className="gap-2 text-xs lg:text-sm"
            >
              🏷️ Categorize
            </Button>

            {/* Tag */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTag(true)}
              className="gap-2 text-xs lg:text-sm"
            >
              <Tag className="w-4 h-4" />
              Add Tag
            </Button>

            {/* Convert to WO */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConvert(true)}
              className="gap-2 text-xs lg:text-sm"
            >
              <FileText className="w-4 h-4" />
              Convert
            </Button>

            {/* Archive */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchiveConfirm(true)}
              className="gap-2 text-xs lg:text-sm"
            >
              <Archive className="w-4 h-4" />
              Archive
            </Button>

            {/* Delete (Admin) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-2 text-xs lg:text-sm text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dialogs */}
      {showCategorize && (
        <BulkCategorizeBar
          selectedIds={selectedIds}
          onClose={() => setShowCategorize(false)}
          onComplete={onActionComplete}
        />
      )}

      {showTag && (
        <BulkTagDialog
          selectedIds={selectedIds}
          projectId={projectId}
          onClose={() => setShowTag(false)}
          onComplete={onActionComplete}
        />
      )}

      {showConvert && (
        <BulkConvertDialog
          selectedIds={selectedIds}
          projectId={projectId}
          onClose={() => setShowConvert(false)}
          onComplete={onActionComplete}
        />
      )}

      {/* Archive Confirmation */}
      {showArchiveConfirm && (
        <ConfirmDialog
          title={`Archive ${totalSelected} items?`}
          description="These items will be marked as archived and can be restored later."
          onConfirm={() => {
            archiveMutation.mutate();
            setShowArchiveConfirm(false);
          }}
          onCancel={() => setShowArchiveConfirm(false)}
          confirmText="Archive"
          isLoading={archiveMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Delete ${totalSelected} items?`}
          description="This action cannot be undone. These items will be permanently deleted."
          onConfirm={() => {
            deleteMutation.mutate();
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
          isDangerous={true}
          isLoading={deleteMutation.isPending}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
  confirmText,
  isDangerous = false,
  isLoading = false
}: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{description}</p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium text-white ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-50`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
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
                    └── _components/
                        ├── FeedbackInbox.tsx (updated)
                        ├── FeedbackInboxItem.tsx (updated)
                        ├── BulkActionsBar.tsx
                        ├── BulkCategorizeBar.tsx (from Phase 086)
                        ├── BulkTagDialog.tsx
                        └── BulkConvertDialog.tsx
lib/
└── supabase/
    └── feedback.ts
        ├── archiveFeedback(ids)
        ├── deleteFeedback(ids)
        ├── bulkUpdateCategory(ids, category)
        └── bulkAddTags(ids, tags)
```

## Acceptance Criteria
- [x] Checkboxes appear on list items when multi-select enabled
- [x] Clicking checkbox selects/deselects item
- [x] Header "Select All" checkbox selects all visible items
- [x] Selection counter shows X items selected
- [x] Floating action bar appears when items selected
- [x] Action bar shows at bottom on mobile, fixed on desktop
- [x] Bulk categorize button opens category selector
- [x] Bulk categorize applies to all selected items
- [x] Bulk tag button opens tag dialog
- [x] Bulk tag applies to all selected items
- [x] Bulk convert opens conversion dialog
- [x] Bulk archive confirms before applying
- [x] Bulk delete confirms with warning before applying
- [x] Clear selection clears all checkboxes
- [x] Keyboard shortcut Cmd/Ctrl+A selects all
- [x] Keyboard shortcut Escape clears selection
- [x] Selection persists while navigating detail panel
- [x] Selection clears when filters change
- [x] Progress indicator for long operations
- [x] Toast notification on action completion
- [x] Mobile checkboxes larger (48px minimum)

## Testing Instructions

1. **Multi-Select**
   - Hover over feedback item
   - Checkbox should appear or be visible
   - Click checkbox to select
   - Counter shows "1 item selected"
   - Click another checkbox
   - Counter shows "2 items selected"

2. **Select All**
   - Click "Select All" in header
   - Verify all visible items checked
   - Counter shows correct total
   - Uncheck one item
   - Verify header checkbox shows minus icon (partial)
   - Click header checkbox again
   - Verify all re-checked

3. **Floating Bar**
   - Select some items
   - Floating action bar appears
   - Try each action button
   - Close button works
   - Clear Selection link works

4. **Bulk Categorize**
   - Select 3 items with mixed categories
   - Click "Categorize"
   - Select a category
   - Confirm
   - Verify all 3 items now have new category
   - Verify toast notification

5. **Bulk Tag**
   - Select multiple items
   - Click "Add Tag"
   - Type or select tag
   - Apply
   - Verify tag added to all items
   - Try adding second tag to same items

6. **Bulk Archive**
   - Select items
   - Click "Archive"
   - Confirm in dialog
   - Verify items disappear from inbox
   - Verify status changed to archived

7. **Bulk Delete** (Admin)
   - Select items
   - Click "Delete"
   - Confirm warning dialog
   - Verify items removed
   - Verify cannot undo

8. **Keyboard Shortcuts**
   - Press Cmd/Ctrl+A
   - Verify all items selected
   - Press Escape
   - Verify selection cleared

9. **Mobile Responsive**
   - View on mobile
   - Checkboxes larger and touch-friendly
   - Floating bar at bottom
   - Actions stack vertically

10. **Partial Selection**
    - Select 2 out of 5 items
    - Header checkbox shows minus/partial state
    - Click header checkbox
    - Verify only the 2 selected items affected
