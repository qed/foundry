# Phase 085 - Feedback Detail View

## Objective
Implement the right-panel detail view displaying complete feedback information, metadata, categorization controls, action buttons for converting to work orders/features, and related feedback suggestions.

## Prerequisites
- Phase 084: Feedback inbox display complete
- Phase 083: Insights Lab layout structure established
- Phase 081: Database schema with feedback_submissions
- Phase 086: Categorization controls (concurrent)

## Context
The detail view is where users examine complete feedback, take action on it, and see contextual information. This panel displays full feedback text, submitter details, browser/device metadata, category and tags, priority score, and action buttons. It also shows related feedback to help identify duplicate or related issues. The panel should facilitate quick decision-making on how to handle each piece of feedback (categorize, convert, archive).

## Detailed Requirements

### Detail Panel Header
- **Back Button**: Mobile only, returns to inbox view (arrow left icon)
- **Title**: "Feedback Details" or truncated content preview
- **Timestamp**: Created date and time
- **Status Badge**: Shows current status with color

### Main Content Areas

#### 1. Full Content Section
- **Label**: "Feedback"
- **Content**: Full text of feedback in readable format (word wrap)
- **Copy Button**: Copy content to clipboard
- **Max Height**: Allow scrolling if very long (> 500 words)

#### 2. Submitter Information
- **Submitter Name**: If available, otherwise empty
- **Submitter Email**: If available, clickable mailto link, otherwise empty
- **Label**: "Submitted by"
- **If Anonymous**: Show "Anonymous" instead

#### 3. Metadata Section
- **Browser**: "Chrome", "Firefox", etc. (from User-Agent)
- **Device**: "Desktop", "Mobile", "Tablet"
- **Page URL**: Link to page where feedback was submitted (if available)
- **Timestamp (Server)**: When feedback was received
- **Timestamp (Client)**: Client-side time if available
- **Viewport**: Width x Height if available (e.g., "1920x1080")
- **User-Agent**: Collapsed details, expandable

#### 4. Categorization Section (editable)
- **Current Category**: Dropdown to change category
- **Category Options**: Bug, Feature Request, UX Issue, Performance, Other
- **Tags**: Chips with existing tags, "+" button to add new tags
- **Priority Score**: Display score if available (0-100)
- **Auto-Enriched**: Indicator that score was auto-assigned, can be manually adjusted

#### 5. Actions Section
- **Button: Convert to Work Order**: Opens modal/drawer with pre-filled form
- **Button: Convert to Feature**: Opens modal/drawer with feature tree selection
- **Button: Archive**: Marks status as archived
- **Button: More Options**: Dropdown for additional actions

#### 6. Related Feedback Section
- **Title**: "Similar Feedback"
- **List**: Up to 5 related items (same category, similar content)
- **Item Format**: Compact display - category, score, timestamp, 1-line preview
- **Empty State**: "No similar feedback found"
- **Clickable**: Can click to switch to related item

### Metadata Display Details

**Metadata Object Structure**:
```typescript
{
  browser?: string;          // "Chrome", "Firefox", etc.
  device?: string;           // "desktop", "mobile", "tablet"
  page_url?: string;         // Full URL
  user_agent?: string;       // Raw UA string
  viewport?: {
    width: number;
    height: number;
  };
  timestamp_client?: number;  // ms since epoch
  [key: string]: any;        // Custom metadata
}
```

### Page URL Handling
- Display as clickable link if available
- Show domain in gray, full URL on hover
- Icon indicating external link
- Disabled/non-clickable if null

### Responsive Behavior
- **Desktop**: Fixed right panel, scrollable content
- **Mobile**: Full screen, back button at top, scroll through all sections
- **Sticky Header**: Category/Tags section stays visible while scrolling (optional)

## UI Components

### _components/FeedbackDetailPanel.tsx

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FeedbackDetailContent from './FeedbackDetailContent';
import FeedbackDetailMetadata from './FeedbackDetailMetadata';
import FeedbackDetailCategorization from './FeedbackDetailCategorization';
import FeedbackDetailActions from './FeedbackDetailActions';
import RelatedFeedbackSection from './RelatedFeedbackSection';
import { getFeedbackDetail } from '@/lib/supabase/feedback';

interface FeedbackDetailPanelProps {
  feedbackId: string;
  projectId: string;
  onBack?: () => void;
}

export default function FeedbackDetailPanel({
  feedbackId,
  projectId,
  onBack
}: FeedbackDetailPanelProps) {
  const { data: feedback, isLoading, error } = useQuery({
    queryKey: ['feedback-detail', feedbackId],
    queryFn: () => getFeedbackDetail(feedbackId),
    staleTime: 30000
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="h-full flex items-center justify-center text-red-600">
        <div className="text-center">
          <p>Error loading feedback</p>
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm" className="mt-4">
              Go back
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden p-2 hover:bg-gray-100 rounded"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            Feedback Details
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(feedback.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Full Content */}
        <FeedbackDetailContent content={feedback.content} />

        {/* Submitter Info */}
        {(feedback.submitter_name || feedback.submitter_email) && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Submitted By</h3>
            <div className="text-sm">
              {feedback.submitter_name && (
                <p className="text-gray-900">{feedback.submitter_name}</p>
              )}
              {feedback.submitter_email && (
                <a
                  href={`mailto:${feedback.submitter_email}`}
                  className="text-indigo-600 hover:underline"
                >
                  {feedback.submitter_email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <FeedbackDetailMetadata metadata={feedback.metadata} />

        {/* Categorization */}
        <FeedbackDetailCategorization
          feedbackId={feedbackId}
          currentCategory={feedback.category}
          currentTags={feedback.tags || []}
          score={feedback.score}
        />

        {/* Actions */}
        <FeedbackDetailActions
          feedbackId={feedbackId}
          projectId={projectId}
          status={feedback.status}
          convertedToWorkOrderId={feedback.converted_to_work_order_id}
          convertedToFeatureId={feedback.converted_to_feature_id}
        />

        {/* Related Feedback */}
        <RelatedFeedbackSection
          feedbackId={feedbackId}
          projectId={projectId}
          category={feedback.category}
        />
      </div>
    </div>
  );
}
```

### _components/FeedbackDetailContent.tsx

```typescript
'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface FeedbackDetailContentProps {
  content: string;
}

export default function FeedbackDetailContent({
  content
}: FeedbackDetailContentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Feedback</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
          title="Copy feedback text"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    </div>
  );
}
```

### _components/FeedbackDetailMetadata.tsx

```typescript
'use client';

import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';

interface Metadata {
  browser?: string;
  device?: string;
  page_url?: string;
  user_agent?: string;
  viewport?: { width: number; height: number };
  timestamp_client?: number;
  [key: string]: any;
}

interface FeedbackDetailMetadataProps {
  metadata: Metadata;
}

export default function FeedbackDetailMetadata({
  metadata
}: FeedbackDetailMetadataProps) {
  const [expandUserAgent, setExpandUserAgent] = useState(false);

  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
      <div className="space-y-2 text-sm">
        {metadata.browser && (
          <div>
            <p className="text-gray-600">Browser</p>
            <p className="text-gray-900 font-medium">{metadata.browser}</p>
          </div>
        )}

        {metadata.device && (
          <div>
            <p className="text-gray-600">Device</p>
            <p className="text-gray-900 font-medium capitalize">{metadata.device}</p>
          </div>
        )}

        {metadata.viewport && (
          <div>
            <p className="text-gray-600">Viewport</p>
            <p className="text-gray-900 font-medium">
              {metadata.viewport.width}x{metadata.viewport.height}
            </p>
          </div>
        )}

        {metadata.page_url && (
          <div>
            <p className="text-gray-600">Page</p>
            <a
              href={metadata.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline flex items-center gap-1 break-all"
            >
              {new URL(metadata.page_url).hostname}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
        )}

        {metadata.timestamp_client && (
          <div>
            <p className="text-gray-600">Client Time</p>
            <p className="text-gray-900 font-medium text-xs">
              {new Date(metadata.timestamp_client).toLocaleString()}
            </p>
          </div>
        )}

        {metadata.user_agent && (
          <div>
            <button
              onClick={() => setExpandUserAgent(!expandUserAgent)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  expandUserAgent ? 'rotate-180' : ''
                }`}
              />
              User Agent
            </button>
            {expandUserAgent && (
              <p className="text-xs text-gray-600 mt-2 font-mono bg-gray-50 p-2 rounded break-all">
                {metadata.user_agent}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### _components/FeedbackDetailCategorization.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { updateFeedbackCategory, addFeedbackTag, removeFeedbackTag } from '@/lib/supabase/feedback';

interface FeedbackDetailCategorizationProps {
  feedbackId: string;
  currentCategory: string;
  currentTags: string[];
  score: number | null;
}

const categoryOptions = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'ux_issue', label: 'UX Issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
  { value: 'uncategorized', label: 'Uncategorized' }
];

export default function FeedbackDetailCategorization({
  feedbackId,
  currentCategory,
  currentTags,
  score
}: FeedbackDetailCategorizationProps) {
  const [newTag, setNewTag] = useState('');
  const queryClient = useQueryClient();

  const updateCategoryMutation = useMutation({
    mutationFn: (category: string) =>
      updateFeedbackCategory(feedbackId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
    }
  });

  const addTagMutation = useMutation({
    mutationFn: (tag: string) => addFeedbackTag(feedbackId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
      setNewTag('');
    }
  });

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => removeFeedbackTag(feedbackId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
    }
  });

  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Categorization</h3>

      {/* Category Dropdown */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          value={currentCategory}
          onChange={(e) => updateCategoryMutation.mutate(e.target.value)}
          disabled={updateCategoryMutation.isPending}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {categoryOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Score */}
      {score !== null && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Priority Score</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 min-w-fit">
              {score}/100
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">AI-assigned score</p>
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {currentTags.map(tag => (
            <div
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs"
            >
              {tag}
              <button
                onClick={() => removeTagMutation.mutate(tag)}
                disabled={removeTagMutation.isPending}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Tag Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTag.trim()) {
                addTagMutation.mutate(newTag.trim());
              }
            }}
            placeholder="Add tag..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={() => {
              if (newTag.trim()) {
                addTagMutation.mutate(newTag.trim());
              }
            }}
            disabled={!newTag.trim() || addTagMutation.isPending}
            className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
```

### _components/FeedbackDetailActions.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import ConvertToWorkOrderModal from './ConvertToWorkOrderModal';
import ConvertToFeatureModal from './ConvertToFeatureModal';
import { archiveFeedback } from '@/lib/supabase/feedback';

interface FeedbackDetailActionsProps {
  feedbackId: string;
  projectId: string;
  status: string;
  convertedToWorkOrderId: string | null;
  convertedToFeatureId: string | null;
}

export default function FeedbackDetailActions({
  feedbackId,
  projectId,
  status,
  convertedToWorkOrderId,
  convertedToFeatureId
}: FeedbackDetailActionsProps) {
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: () => archiveFeedback(feedbackId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
    }
  });

  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>

      <div className="space-y-2">
        {!convertedToWorkOrderId && (
          <Button
            onClick={() => setShowWorkOrderModal(true)}
            variant="outline"
            className="w-full justify-start"
          >
            Convert to Work Order
          </Button>
        )}

        {!convertedToFeatureId && (
          <Button
            onClick={() => setShowFeatureModal(true)}
            variant="outline"
            className="w-full justify-start"
          >
            Convert to Feature
          </Button>
        )}

        {status !== 'archived' && (
          <Button
            onClick={() => archiveMutation.mutate()}
            variant="outline"
            disabled={archiveMutation.isPending}
            className="w-full justify-start"
          >
            Archive
          </Button>
        )}

        {convertedToWorkOrderId && (
          <div className="text-xs bg-green-50 border border-green-200 rounded p-2 text-green-800">
            Converted to work order
          </div>
        )}

        {convertedToFeatureId && (
          <div className="text-xs bg-green-50 border border-green-200 rounded p-2 text-green-800">
            Converted to feature
          </div>
        )}
      </div>

      {/* Modals */}
      {showWorkOrderModal && (
        <ConvertToWorkOrderModal
          feedbackId={feedbackId}
          projectId={projectId}
          onClose={() => setShowWorkOrderModal(false)}
        />
      )}

      {showFeatureModal && (
        <ConvertToFeatureModal
          feedbackId={feedbackId}
          projectId={projectId}
          onClose={() => setShowFeatureModal(false)}
        />
      )}
    </div>
  );
}
```

### _components/RelatedFeedbackSection.tsx

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getRelatedFeedback } from '@/lib/supabase/feedback';

interface RelatedFeedbackSectionProps {
  feedbackId: string;
  projectId: string;
  category: string;
}

export default function RelatedFeedbackSection({
  feedbackId,
  projectId,
  category
}: RelatedFeedbackSectionProps) {
  const { data: relatedItems } = useQuery({
    queryKey: ['related-feedback', feedbackId, category],
    queryFn: () => getRelatedFeedback(feedbackId, projectId, category),
    staleTime: 60000
  });

  if (!relatedItems || relatedItems.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Similar Feedback</h3>
      <div className="space-y-2">
        {relatedItems.map(item => (
          <div
            key={item.id}
            className="p-2 border border-gray-200 rounded text-xs bg-gray-50 hover:bg-gray-100 cursor-pointer"
          >
            <p className="text-gray-900 truncate">{item.content}</p>
            <p className="text-gray-600 mt-1">
              {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
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
                        ├── FeedbackDetailPanel.tsx
                        ├── FeedbackDetailContent.tsx
                        ├── FeedbackDetailMetadata.tsx
                        ├── FeedbackDetailCategorization.tsx
                        ├── FeedbackDetailActions.tsx
                        ├── RelatedFeedbackSection.tsx
                        ├── ConvertToWorkOrderModal.tsx (Phase 088)
                        └── ConvertToFeatureModal.tsx (Phase 089)
```

## Acceptance Criteria
- [x] Detail panel displays full feedback content with text wrapping
- [x] Copy button copies content to clipboard with confirmation
- [x] Submitter name and email displayed, with mailto link on email
- [x] Metadata section shows browser, device, page URL, viewport, timestamps
- [x] User-Agent collapsed by default, expandable
- [x] Page URL displays as clickable link with domain visible
- [x] Category dropdown allows changing categorization
- [x] Priority score displayed as bar chart with numeric value
- [x] Tags displayed as chips with remove button
- [x] Add tag input with enter key support
- [x] Action buttons: Convert to Work Order, Convert to Feature, Archive
- [x] Conversion status displayed when already converted
- [x] Related feedback section shows up to 5 similar items
- [x] Related feedback clickable to switch view
- [x] Back button visible on mobile, hidden on desktop
- [x] All updates (category, tags, archive) persist to database
- [x] Mutations invalidate detail query cache on success

## Testing Instructions

1. **Content Display**
   - Select feedback item
   - Verify full content displays properly
   - Verify submitter info shows correctly
   - Verify timestamp matches database

2. **Copy Function**
   - Click copy button
   - Verify clipboard contains feedback text
   - Verify button shows "Copied" confirmation
   - Verify confirmation disappears after 2 seconds

3. **Metadata**
   - Verify browser shows correct value
   - Verify device shows correct value
   - Verify page URL is clickable and links to correct page
   - Expand user agent and verify full string shows

4. **Categorization**
   - Change category via dropdown
   - Verify category updates in database
   - Verify detail view refreshes
   - Verify category change reflects in inbox list

5. **Tags**
   - Add new tag via input
   - Verify tag appears as chip
   - Click X on tag
   - Verify tag is removed
   - Press Enter to add instead of clicking button

6. **Actions**
   - Click "Convert to Work Order"
   - Verify modal opens
   - Click "Convert to Feature"
   - Verify modal opens
   - Click Archive
   - Verify status changes to archived
   - Verify Archive button disables after archive

7. **Related Feedback**
   - Select feedback with category "bug"
   - Verify similar bug feedback appears in Related section
   - Click related item
   - Verify detail panel updates to show that item

8. **Mobile Responsiveness**
   - View on mobile
   - Verify back button appears
   - Click back → returns to inbox
   - Verify all sections readable and actionable
