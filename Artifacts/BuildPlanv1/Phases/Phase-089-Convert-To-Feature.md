# Phase 089 - Convert Feedback to Feature

## Objective
Implement the ability to convert feedback items into product features within the feature tree, with parent selection, description pre-population, bidirectional linking, and feature node creation.

## Prerequisites
- Phase 085: Feedback detail view with action buttons
- Phase 026: Feature tree and node management (assumed complete)
- Phase 081: Database feedback_submissions schema
- TypeScript and Tailwind CSS configured

## Context
Converting feedback to features enables teams to turn user insights into product roadmap items. The conversion process should allow selection of a parent epic or feature node, pre-populate feature details from feedback, and maintain bidirectional links between the feedback and resulting feature. This integration helps product managers see which features originated from user feedback and understand the underlying user problems.

## Detailed Requirements

### Conversion Trigger
- **Location**: "Convert to Feature" button in feedback detail (Phase 085)
- **Visibility**: Always visible unless already converted
- **Modal/Drawer**: Opens without page navigation
- **Optional Check**: Suggest categorization first (UX nice-to-have)

### Feature Tree Navigation
The modal should display:

**Feature Tree Selector**:
- **Structure**: Hierarchical view of project's feature tree
- **Display**: Epic > Feature hierarchy (collapsed/expanded)
- **Selection**: Radio button or click to select parent node
- **Constraints**:
  - Can only select Epic or Feature nodes (not Tasks/Subtasks)
  - Cannot select archived nodes
  - Show node status (active, on-hold, archived, completed)
- **Search**: Autocomplete search to find parent nodes quickly
- **Empty State**: "No parent features" if project has no epics/features

**Feature Levels** (from Phase 026 or equivalent):
- Level 1: Epics (e.g., "User Onboarding")
- Level 2: Features (e.g., "Email Signup Flow")
- Level 3: Tasks (e.g., "Design signup form")
- Level 4+: Subtasks/Details

### Pre-Filled Fields

| Field | Source | Example |
|-------|--------|---------|
| Title | Feedback content (first sentence) | "Email verification in signup flow" |
| Description | Full feedback + context | "[Content] User reported on Chrome desktop..." |
| Parent Node | User selection (required) | Epic: "User Onboarding" |
| Feature Level | Auto-set based on parent | Task (child of Feature) |
| Type | Auto-set | "Feature" or "Task" |
| Status | New (default) | "Not Started" |
| Tags/Labels | Copy from feedback | Inherited tags |
| Created From Feedback | Automatic | Bidirectional link |

### Modal/Drawer Layout

**Header**:
- Title: "Convert Feedback to Feature"
- Close button (X)

**Content Area**:
1. Original Feedback Reference
   - Preview box with first 100 chars
   - Expandable to show full content

2. Feature Tree Section
   - Tree view with parent node selection
   - Search input for quick find
   - Breadcrumb showing selected parent path

3. Feature Details Section
   - Title field (editable, pre-filled)
   - Description (editable, pre-filled)
   - Level selector (read-only usually, based on parent)
   - Tags/Labels (pre-filled from feedback)

**Footer**:
- Cancel button
- Create Feature button

### Feature Title Field
- **Type**: Text input
- **Max Length**: 255 characters
- **Pre-filled**: First line/sentence of feedback
- **Required**: Yes
- **Validation**: 5-255 characters
- **Help**: "Brief title for this feature"

### Feature Description Field
- **Type**: Textarea or rich text
- **Format**: Markdown
- **Pre-filled**: Full feedback content + metadata context
- **Required**: Yes
- **Template**:
```
## User Feedback
[Full feedback content]

## Context
- Submitted by: [Name/Email or Anonymous]
- Browser: [Browser]
- Device: [Device Type]
- Page: [URL]

## Why This Matters
[Optional: Team can add notes]
```

### Feature Level Handling
- **Auto-set**: Based on parent node
  - If parent is Epic → new node is Feature
  - If parent is Feature → new node is Task
  - If parent is Task → new node is Subtask
- **Display**: Show as label or read-only field
- **No Duplication**: Prevent two-level jump

### Parent Node Selection
- **Required**: Yes, must select a parent
- **Options**: Only Epic and Feature nodes
- **Excluded**: Tasks, Subtasks, archived nodes
- **Display Format**: "Epic Name > Feature Name"
- **Search**: Type to filter tree nodes
- **Visual Indicator**: Show selected node with highlight

### Validation Rules
- **Title**: Required, 5-255 chars
- **Description**: Required, 10+ chars
- **Parent Node**: Required, must be valid Epic or Feature
- **Feature Level**: Auto-determined by parent level

### Linking & Tracking

#### Bidirectional Links
After creation:
- `feedback.converted_to_feature_id` = new feature node ID
- `feature_node.created_from_feedback_id` = feedback ID (if schema supports)
- Update feedback status to "converted"

#### Display in Feedback
- Show badge: "Converted to Feature"
- Clickable → navigate to feature node
- Show feature path: "Epics > User Onboarding > Email Verification"

#### Display in Feature Node
- Show "Created from Feedback" link
- Link back to original feedback item
- Optional side panel to view feedback context

### Error Handling
- **No Parent Selected**: Show error, disable create button
- **Network Error**: Show retry button
- **Validation Error**: Highlight fields, show messages
- **Permission Error**: Show message about permissions
- **Database Error**: Generic error with log reference

### Success Flow
1. Modal closes automatically
2. Feedback detail refreshes
3. "Converted to Feature" badge appears
4. Toast notification: "Feature created in [Epic > Feature]"
5. Optional: Navigate to new feature node

## UI Components

### _components/ConvertToFeatureModal.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import FeatureTreeSelector from './FeatureTreeSelector';
import ConvertToFeatureForm from './ConvertToFeatureForm';
import { convertFeedbackToFeature, getFeedbackDetail } from '@/lib/supabase/feedback';
import { getProjectFeatureTree } from '@/lib/supabase/features';

interface ConvertToFeatureModalProps {
  feedbackId: string;
  projectId: string;
  onClose: () => void;
}

export default function ConvertToFeatureModal({
  feedbackId,
  projectId,
  onClose
}: ConvertToFeatureModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get feedback context
  const feedback = queryClient.getQueryData(['feedback-detail', feedbackId]) as any;

  // Get feature tree
  const { data: featureTree = [] } = useQuery({
    queryKey: ['feature-tree', projectId],
    queryFn: () => getProjectFeatureTree(projectId),
    staleTime: 60000
  });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      convertFeedbackToFeature(feedbackId, projectId, data),
    onSuccess: (featureNode) => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
      queryClient.invalidateQueries({
        queryKey: ['feature-tree', projectId]
      });

      toast({
        title: 'Success',
        description: `Feature created successfully`,
        variant: 'success'
      });

      onClose();
    },
    onError: (error) => {
      console.error('Conversion error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create feature. Please try again.',
        variant: 'error'
      });
    }
  });

  if (!feedback) {
    return null;
  }

  const handleCreateFeature = (data: any) => {
    if (!selectedParentId) {
      toast({
        title: 'Error',
        description: 'Please select a parent feature',
        variant: 'error'
      });
      return;
    }

    mutation.mutate({
      ...data,
      parentNodeId: selectedParentId
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Convert Feedback to Feature
          </h2>
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Original Feedback Reference */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Original Feedback:</strong> {feedback.content.slice(0, 100)}...
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Feature Tree Selector */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Select Parent Feature
              </h3>
              <FeatureTreeSelector
                tree={featureTree}
                selectedNodeId={selectedParentId}
                onSelectNode={setSelectedParentId}
              />
            </div>

            {/* Feature Details Form */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Feature Details
              </h3>
              <ConvertToFeatureForm
                feedback={feedback}
                parentNodeId={selectedParentId}
                featureTree={featureTree}
                onSubmit={handleCreateFeature}
                isLoading={mutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={() => {
              if (!selectedParentId) {
                toast({
                  title: 'Error',
                  description: 'Please select a parent feature',
                  variant: 'error'
                });
                return;
              }
              const form = document.getElementById('feature-form') as HTMLFormElement;
              if (form) form.requestSubmit();
            }}
            disabled={mutation.isPending || !selectedParentId}
            className="gap-2"
          >
            {mutation.isPending && <div className="animate-spin">⟳</div>}
            Create Feature
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### _components/FeatureTreeSelector.tsx

```typescript
'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreeNode {
  id: string;
  name: string;
  type: 'epic' | 'feature' | 'task' | 'subtask';
  status: 'active' | 'on-hold' | 'archived' | 'completed';
  children?: TreeNode[];
  level: number;
}

interface FeatureTreeSelectorProps {
  tree: TreeNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export default function FeatureTreeSelector({
  tree,
  selectedNodeId,
  onSelectNode
}: FeatureTreeSelectorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpanded(newExpanded);
  };

  const isSelectableLevel = (type: string) => type === 'epic' || type === 'feature';

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const isSelectable = isSelectableLevel(node.type);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const matchesSearch =
      !searchTerm || node.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return null;

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            if (isSelectable) {
              onSelectNode(node.id);
            }
            if (hasChildren) {
              toggleExpanded(node.id);
            }
          }}
          disabled={!isSelectable || node.status === 'archived'}
          className={cn(
            'w-full text-left px-3 py-2 flex items-center gap-1 text-sm rounded',
            isSelected && isSelectable && 'bg-indigo-50 border border-indigo-200',
            isSelectable && !isSelected && 'hover:bg-gray-50',
            !isSelectable && 'text-gray-500 cursor-not-allowed',
            node.status === 'archived' && 'opacity-50'
          )}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <span className="flex-1">{node.name}</span>
          <span className="text-xs text-gray-500 capitalize">{node.type}</span>
        </button>

        {isExpanded && hasChildren && (
          <div className="pl-4">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search features..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {/* Tree */}
      <div className="border border-gray-200 rounded-md overflow-y-auto max-h-96 bg-gray-50">
        {tree.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No features found
          </div>
        ) : (
          <div className="p-2">
            {tree.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {/* Selected Path Display */}
      {selectedNodeId && (
        <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-900">
          <p className="font-medium">Selected Parent:</p>
          <p className="mt-1">{getNodePath(tree, selectedNodeId)}</p>
        </div>
      )}
    </div>
  );
}

function getNodePath(tree: TreeNode[], targetId: string): string {
  function findPath(node: TreeNode, path: string[]): string[] | null {
    const currentPath = [...path, node.name];
    if (node.id === targetId) return currentPath;

    if (node.children) {
      for (const child of node.children) {
        const result = findPath(child, currentPath);
        if (result) return result;
      }
    }

    return null;
  }

  for (const node of tree) {
    const path = findPath(node, []);
    if (path) return path.join(' > ');
  }

  return 'Unknown';
}
```

### _components/ConvertToFeatureForm.tsx

```typescript
'use client';

import { useState } from 'react';

interface Feedback {
  id: string;
  content: string;
  submitter_name: string | null;
  submitter_email: string | null;
  metadata: any;
  created_at: string;
  tags: string[];
}

interface TreeNode {
  id: string;
  name: string;
  type: 'epic' | 'feature' | 'task' | 'subtask';
  level: number;
}

interface ConvertToFeatureFormProps {
  feedback: Feedback;
  parentNodeId: string | null;
  featureTree: TreeNode[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export default function ConvertToFeatureForm({
  feedback,
  parentNodeId,
  featureTree,
  onSubmit,
  isLoading
}: ConvertToFeatureFormProps) {
  const [formData, setFormData] = useState({
    title: feedback.content.split('\n')[0].slice(0, 255),
    description: buildDescription(feedback),
    tags: feedback.tags || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    if (formData.title.length > 255) {
      newErrors.title = 'Title must be 255 characters or less';
    }
    if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form id="feature-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-900 mb-1">
          Title *
        </label>
        <input
          type="text"
          maxLength={255}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Feature title"
        />
        {errors.title && (
          <p className="text-red-600 text-xs mt-1">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-900 mb-1">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isLoading}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
          placeholder="Feature description"
        />
        {errors.description && (
          <p className="text-red-600 text-xs mt-1">{errors.description}</p>
        )}
      </div>

      {/* Tags Display */}
      {formData.tags.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">
            Tags
          </label>
          <div className="flex flex-wrap gap-1">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-block px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

function buildDescription(feedback: Feedback): string {
  const submitter = feedback.submitter_name || feedback.submitter_email || 'Anonymous';
  const metadata = feedback.metadata || {};

  return `## User Feedback
${feedback.content}

## Context
- Submitted by: ${submitter}
- Browser: ${metadata.browser || 'Unknown'}
- Device: ${metadata.device || 'Unknown'}
- Page: ${metadata.page_url || 'Unknown'}
- Timestamp: ${new Date(feedback.created_at).toISOString()}`;
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
                        ├── ConvertToFeatureModal.tsx
                        ├── FeatureTreeSelector.tsx
                        └── ConvertToFeatureForm.tsx
lib/
├── supabase/
│   ├── feedback.ts
│   │   └── convertFeedbackToFeature(feedbackId, projectId, data)
│   └── features.ts
│       └── getProjectFeatureTree(projectId)
```

## Acceptance Criteria
- [x] "Convert to Feature" button visible in feedback detail
- [x] Clicking button opens modal without navigation
- [x] Modal shows original feedback as reference
- [x] Feature tree displays with parent node selection
- [x] Can only select Epic or Feature nodes (not Tasks/Subtasks)
- [x] Archived nodes disabled and cannot be selected
- [x] Search input filters tree nodes by name
- [x] Selected parent path shows in breadcrumb/display
- [x] Title field pre-filled with first line of feedback
- [x] Description pre-filled with content + context
- [x] Title validation (5-255 chars)
- [x] Description validation (10+ chars)
- [x] Tags from feedback copied and displayed
- [x] Parent node selection required (create button disabled if none)
- [x] Create button disabled during submission
- [x] Cancel button closes modal
- [x] On success: feedback status changed to "converted"
- [x] On success: feedback.converted_to_feature_id updated
- [x] On success: "Converted to Feature" badge appears
- [x] On success: Toast notification shows
- [x] On success: Modal closes

## Testing Instructions

1. **Modal Opening**
   - Open feedback detail
   - Click "Convert to Feature"
   - Verify modal opens
   - Verify close button works
   - Verify ESC closes modal

2. **Feature Tree Display**
   - Verify tree shows epics and features
   - Verify tasks/subtasks appear as non-selectable (grayed)
   - Expand epic to show child features
   - Collapse epic

3. **Node Selection**
   - Click on epic → selected
   - Click on feature → selected
   - Try clicking task → disabled
   - Verify selected node highlighted
   - Verify breadcrumb path updates

4. **Search Functionality**
   - Type feature name in search
   - Verify tree filters to matching items
   - Clear search
   - Verify all items return

5. **Pre-filled Fields**
   - Verify title = first line of feedback
   - Verify description includes full feedback + context
   - Verify tags from feedback show

6. **Form Validation**
   - Clear title, try submit → error
   - Clear description → error
   - Enter < 5 char title → error
   - Verify error messages

7. **Parent Required**
   - Don't select parent node
   - Verify create button disabled
   - Select parent
   - Verify create button enabled

8. **Submission**
   - Select parent epic/feature
   - Fill form correctly
   - Click "Create Feature"
   - Verify button shows loading state
   - Verify feature created in database
   - Verify feedback status changed to "converted"

9. **Success Feedback**
   - After submission, modal closes
   - Toast shows success
   - Feedback detail refreshes
   - "Converted to Feature" badge appears
   - Badge links to feature node

10. **Bidirectional Link**
    - Convert feedback to feature
    - Navigate to feature node
    - Verify "Created from Feedback" link
    - Click link to return to feedback
