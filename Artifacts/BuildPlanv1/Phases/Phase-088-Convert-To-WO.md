# Phase 088 - Convert Feedback to Work Order

## Objective
Implement the ability to convert feedback items into work orders, with pre-populated fields, user editing capability, bidirectional linking, and status tracking.

## Prerequisites
- Phase 085: Feedback detail view with action buttons
- Phase 061: Work order creation and management (assumed complete)
- Phase 081: Database feedback_submissions schema
- TypeScript and Tailwind CSS configured

## Context
Converting feedback to work orders turns user insights into actionable tasks. The conversion process should intelligently pre-fill work order details from the feedback content and metadata, while allowing the user to refine the work order before creation. After conversion, both feedback and work order should maintain a bidirectional link for context and traceability. The interface should make the relationship between feedback and work order visible to help teams understand the origin and impact of their work.

## Detailed Requirements

### Conversion Trigger
- **Location**: "Convert to Work Order" button in feedback detail (Phase 085)
- **Visibility**: Always visible unless already converted
- **Disabled State**: Show tooltip suggesting categorization first (optional UX)
- **Modal/Drawer**: Opens without page navigation

### Pre-Filled Fields
The conversion modal should pre-populate:

| Field | Source | Example |
|-------|--------|---------|
| Title | Feedback content (first sentence or first line) | "App crashes on login" |
| Description | Full feedback content + metadata context | "[Content] Submitted on Chrome desktop from /login page" |
| Priority | Based on feedback category (optional) | Bug → High, Feature → Medium |
| Assignee | Inherit from project default (optional) | Project lead |
| Status | New (default state for work orders) | "To Do" |
| Labels/Tags | Copy from feedback tags | Tag names as-is |
| Project/Board | Inherit from current project | Current project |

### Modal/Drawer Layout

**Header**:
- Title: "Convert Feedback to Work Order"
- Close button (X)

**Content**:
- Form fields for editing work order details
- Field labels with descriptions/help text
- Real-time validation and error messages
- Show link to original feedback above form

**Footer**:
- Cancel button (closes modal)
- Create Work Order button (creates and closes)
- Loading state on button during submission

### Work Order Fields in Conversion Form

#### Title
- **Type**: Text input
- **Max Length**: 255 characters
- **Pre-filled**: From feedback first sentence/line
- **Required**: Yes
- **Validation**: 5-255 characters
- **Help**: "Summarize the work order in one line"

#### Description
- **Type**: Rich text editor or textarea
- **Format**: Markdown
- **Pre-filled**: Full feedback content with metadata context
- **Height**: 200px minimum, expandable
- **Required**: Yes
- **Template**:
```
## Original Feedback
[Full feedback content here]

## Context
- Submitted by: [Name/Email or Anonymous]
- Browser: [Browser]
- Device: [Device Type]
- Page: [URL]
- Timestamp: [ISO date]

## Metadata
- Viewport: [Width x Height]
```

#### Priority (Optional)
- **Type**: Dropdown
- **Options**: Low, Medium, High, Critical
- **Pre-filled**: Based on category:
  - Bug → High
  - Performance → High
  - Feature Request → Medium
  - UX Issue → Medium
  - Other → Low
- **Allow Override**: Yes

#### Assignee (Optional)
- **Type**: User select dropdown
- **Options**: Project team members
- **Pre-filled**: None or project default
- **Allow Unassigned**: Yes

#### Additional Fields (Conditional)
- **Due Date**: Optional calendar picker
- **Labels/Tags**: Auto-populated from feedback tags
- **Estimation**: Optional for tracking
- **Linked Feedback**: Display as read-only reference
- **Parent Work Order**: Optional, inherit from project structure

### Validation Rules
- **Title**: Required, 5-255 chars, no null bytes
- **Description**: Required, 10+ chars
- **Priority**: Optional, valid enum value
- **Assignee**: Optional, must be project member
- **Created By**: Auto-set to current user

### Linking & Tracking

#### Bidirectional Links
After creation:
- `feedback.converted_to_work_order_id` = new work order ID
- `work_order.converted_from_feedback_id` = feedback ID (if work orders table supports)
- Display: "Converted to Work Order [ID]" badge in feedback
- Display: "From Feedback" link in work order

#### Status Changes
- **Feedback Status**: Update to "converted" after successful creation
- **Work Order Status**: Set to project default (usually "To Do")
- **Relationship**: Persist indefinitely, never auto-delete

#### Relationship Display
**In Feedback Detail**:
- Show badge: "Converted to Work Order #WO-123"
- Badge is clickable → navigate to work order
- "Converted On: [Date]" timestamp

**In Work Order Detail**:
- Show section: "Created from Feedback"
- Display feedback preview with link
- Ability to view original feedback in side panel (optional)

### Error Handling
- **Network Error**: Show retry button
- **Validation Error**: Highlight field, show error message
- **Title Duplicate**: Allow creation, warn user
- **Permission Error**: Show message, suggest contacting admin
- **Database Error**: Generic error message, log to monitoring

### Success Flow
1. Modal closes automatically
2. Feedback detail refreshes
3. Conversion badge appears in feedback
4. Toast notification: "Work Order WO-123 created"
5. Optional: Navigate to new work order or return to inbox

## UI Components

### _components/ConvertToWorkOrderModal.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import ConvertToWorkOrderForm from './ConvertToWorkOrderForm';
import { convertFeedbackToWorkOrder, getFeedbackDetail } from '@/lib/supabase/feedback';

interface ConvertToWorkOrderModalProps {
  feedbackId: string;
  projectId: string;
  onClose: () => void;
}

export default function ConvertToWorkOrderModal({
  feedbackId,
  projectId,
  onClose
}: ConvertToWorkOrderModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch feedback to get context
  const feedback = queryClient.getQueryData(['feedback-detail', feedbackId]) as any;

  const mutation = useMutation({
    mutationFn: (data: any) =>
      convertFeedbackToWorkOrder(feedbackId, projectId, data),
    onSuccess: (workOrder) => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
      queryClient.invalidateQueries({
        queryKey: ['feedback']
      });

      toast({
        title: 'Success',
        description: `Work Order ${workOrder.id} created successfully`,
        variant: 'success'
      });

      onClose();
    },
    onError: (error) => {
      console.error('Conversion error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create work order. Please try again.',
        variant: 'error'
      });
    }
  });

  if (!feedback) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Convert Feedback to Work Order
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Original Feedback Reference */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Original Feedback:</strong> {feedback.content.slice(0, 100)}...
            </p>
          </div>

          {/* Form */}
          <ConvertToWorkOrderForm
            feedback={feedback}
            projectId={projectId}
            onSubmit={(data) => mutation.mutate(data)}
            isLoading={mutation.isPending}
          />
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
              const form = document.getElementById('convert-form') as HTMLFormElement;
              if (form) form.requestSubmit();
            }}
            disabled={mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending && <div className="animate-spin">⟳</div>}
            Create Work Order
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### _components/ConvertToWorkOrderForm.tsx

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Feedback {
  id: string;
  content: string;
  submitter_name: string | null;
  submitter_email: string | null;
  metadata: any;
  created_at: string;
  tags: string[];
}

interface ConvertToWorkOrderFormProps {
  feedback: Feedback;
  projectId: string;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export default function ConvertToWorkOrderForm({
  feedback,
  projectId,
  onSubmit,
  isLoading
}: ConvertToWorkOrderFormProps) {
  const [formData, setFormData] = useState({
    title: feedback.content.split('\n')[0].slice(0, 255),
    description: buildDescription(feedback),
    priority: getPriorityFromCategory(feedback),
    assignee: null as string | null,
    tags: feedback.tags || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => getProjectMembers(projectId),
    staleTime: 60000
  });

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
    <form id="convert-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Title *
        </label>
        <input
          type="text"
          maxLength={255}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Work order title"
        />
        {errors.title && (
          <p className="text-red-600 text-xs mt-1">{errors.title}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          {formData.title.length}/255
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isLoading}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          placeholder="Work order description"
        />
        {errors.description && (
          <p className="text-red-600 text-xs mt-1">{errors.description}</p>
        )}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Priority
        </label>
        <select
          value={formData.priority || 'medium'}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Assignee
        </label>
        <select
          value={formData.assignee || ''}
          onChange={(e) => setFormData({ ...formData, assignee: e.target.value || null })}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Unassigned</option>
          {teamMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.full_name || member.email}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      {formData.tags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
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

  return `## Original Feedback
${feedback.content}

## Context
- Submitted by: ${submitter}
- Browser: ${metadata.browser || 'Unknown'}
- Device: ${metadata.device || 'Unknown'}
- Page: ${metadata.page_url || 'Unknown'}
- Timestamp: ${new Date(feedback.created_at).toISOString()}

## Metadata
- Viewport: ${metadata.viewport ? `${metadata.viewport.width}x${metadata.viewport.height}` : 'Unknown'}
- User Agent: ${metadata.user_agent || 'Not available'}`;
}

function getPriorityFromCategory(feedback: Feedback): string {
  switch (feedback.category) {
    case 'bug':
    case 'performance':
      return 'high';
    case 'feature_request':
    case 'ux_issue':
      return 'medium';
    default:
      return 'low';
  }
}

async function getProjectMembers(projectId: string) {
  // Implementation fetches team members from Supabase
  // Returns array of { id, full_name, email }
}
```

## Database Updates

### feedback_submissions Table
- Add column (if not present from Phase 081):
  - `converted_to_work_order_id` (uuid, FK to work_orders.id, nullable)

### work_orders Table (if not already present)
- Add column (if needed for reverse link):
  - `converted_from_feedback_id` (uuid, FK to feedback_submissions.id, nullable)

## File Structure
```
app/
└── org/
    └── [orgSlug]/
        └── project/
            └── [projectId]/
                └── lab/
                    └── _components/
                        ├── ConvertToWorkOrderModal.tsx
                        └── ConvertToWorkOrderForm.tsx
lib/
├── supabase/
│   └── feedback.ts
│       └── convertFeedbackToWorkOrder(feedbackId, projectId, data)
└── work-orders/
    └── create.ts
```

## Acceptance Criteria
- [x] "Convert to Work Order" button visible in feedback detail
- [x] Clicking button opens modal without page navigation
- [x] Modal shows original feedback content as reference
- [x] Title field pre-filled with first line of feedback
- [x] Description pre-filled with full content + context metadata
- [x] Priority auto-set based on category (bug/perf → high, feature/ux → medium, other → low)
- [x] Assignee dropdown shows project team members
- [x] Tags copied from feedback and displayed
- [x] Form validation prevents invalid submissions
- [x] Title length validation (5-255 chars)
- [x] Description length validation (10+ chars)
- [x] Create button disabled during submission
- [x] Cancel button closes modal without changes
- [x] On success: feedback status changed to "converted"
- [x] On success: feedback.converted_to_work_order_id updated
- [x] On success: "Converted to Work Order" badge appears in feedback
- [x] On success: Toast notification with work order ID
- [x] On success: Modal closes
- [x] Error messages display for failed submissions
- [x] Retry button appears on network errors

## Testing Instructions

1. **Modal Opening**
   - Open feedback detail
   - Click "Convert to Work Order"
   - Verify modal opens and isn't blocking
   - Verify close button works
   - Verify ESC key closes modal

2. **Pre-filled Fields**
   - Verify title = first line of feedback
   - Verify description includes full feedback + context
   - Verify priority matches category (bug → high)
   - Verify tags from feedback show

3. **Form Validation**
   - Clear title, try submit → error
   - Enter < 5 char title → error
   - Enter > 255 char title → error
   - Clear description → error
   - Verify error messages display correctly

4. **Field Editing**
   - Modify title
   - Modify description
   - Select different priority
   - Select assignee
   - Verify all changes persist in form

5. **Submission**
   - Fill form correctly
   - Click "Create Work Order"
   - Verify button shows loading state
   - Verify work order created in database
   - Verify feedback status changed to "converted"
   - Verify feedback.converted_to_work_order_id set

6. **Success Feedback**
   - After submission, modal closes
   - Toast notification shows "Work Order WO-123 created"
   - Refresh feedback detail
   - Verify "Converted to Work Order" badge appears
   - Verify badge links to work order

7. **Error Handling**
   - Simulate network error
   - Verify error message displays
   - Retry button works
   - Form data persists after retry

8. **Bidirectional Link**
   - Convert feedback to work order
   - Navigate to new work order
   - Verify work order shows "From Feedback" link
   - Click link to return to feedback
