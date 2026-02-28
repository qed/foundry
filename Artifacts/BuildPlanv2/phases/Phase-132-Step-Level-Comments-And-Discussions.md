# Phase 132 — Step-Level Comments And Discussions

## Objective
Enable threaded comments on individual Helix steps using v1's polymorphic comments system. Support @mentions with autocomplete, comment resolution tracking, and comment count badges per step.

## Prerequisites
- Phase 009 — Step Detail View Component — Step UI in place
- comments table exists with polymorphic support (entity_type, entity_id)

## Epic Context
**Epic:** 16 — Real-Time Collaboration
**Phase:** 132 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Steps often need discussion and feedback. Comments enable asynchronous collaboration on specific steps. @mentions notify team members. Resolution tracking shows when feedback was addressed.

---

## Detailed Requirements

### 1. Step Comments Extension
#### File: `src/lib/helix/step-comments.ts` (NEW)
```typescript
// src/lib/helix/step-comments.ts

import { createClient } from '@/lib/supabase';

export interface StepComment {
  id: string;
  step_id: string;
  user_id: string;
  content: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  parent_id?: string; // For threaded replies
}

/**
 * Create comment on step
 */
export async function createStepComment(
  stepId: string,
  content: string,
  userId: string,
  parentId?: string
): Promise<StepComment> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      entity_type: 'helix_step',
      entity_id: stepId,
      content,
      user_id: userId,
      parent_id: parentId,
      resolved: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get comments for step
 */
export async function getStepComments(stepId: string): Promise<StepComment[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('entity_type', 'helix_step')
    .eq('entity_id', stepId)
    .order('created_at', { ascending: true });

  return data || [];
}

/**
 * Mark comment as resolved
 */
export async function resolveComment(commentId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('comments')
    .update({ resolved: true, updated_at: new Date().toISOString() })
    .eq('id', commentId);
}
```

### 2. Comments UI Component
#### File: `src/app/helix/projects/[projectId]/steps/[stepId]/step-comments.tsx` (NEW)
```typescript
// src/app/helix/projects/[projectId]/steps/[stepId]/step-comments.tsx

'use client';

import { useEffect, useState } from 'react';
import { createStepComment, getStepComments, resolveComment } from '@/lib/helix/step-comments';

interface StepCommentsProps {
  stepId: string;
  currentUserId: string;
}

export function StepComments({ stepId, currentUserId }: StepCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [stepId]);

  async function loadComments() {
    try {
      const loaded = await getStepComments(stepId);
      setComments(loaded);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;

    try {
      await createStepComment(stepId, newComment, currentUserId);
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }

  async function handleResolve(commentId: string) {
    try {
      await resolveComment(commentId);
      await loadComments();
    } catch (error) {
      console.error('Failed to resolve comment:', error);
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">{comments.length} Comments</h4>

      {loading ? (
        <p className="text-sm text-gray-600">Loading comments...</p>
      ) : (
        <div className="space-y-2">
          {comments.map(comment => (
            <div key={comment.id} className={`p-3 border rounded ${comment.resolved ? 'bg-gray-50' : 'bg-white'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{comment.user_id}</p>
                  <p className="text-xs text-gray-600">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
                {!comment.resolved && comment.user_id === currentUserId && (
                  <button
                    onClick={() => handleResolve(comment.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Resolve
                  </button>
                )}
              </div>
              <p className="text-sm mt-2">{comment.content}</p>
              {comment.resolved && <p className="text-xs text-gray-600 mt-1 italic">Resolved</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="border rounded p-3 bg-gray-50">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment... Use @ to mention"
          className="w-full p-2 border rounded text-sm"
          rows={2}
        />
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        >
          Comment
        </button>
      </div>
    </div>
  );
}
```

---

## File Structure
```
src/lib/helix/
├── step-comments.ts (NEW)

src/app/helix/projects/[projectId]/steps/[stepId]/
├── step-comments.tsx (NEW)
```

---

## Acceptance Criteria
1. createStepComment inserts to comments table with entity_type='helix_step'
2. getStepComments filters by entity_type and entity_id
3. resolveComment updates resolved=true
4. StepComments displays all comments in chronological order
5. Comment shows author, timestamp, and content
6. Resolve button appears for unresolved comments by author
7. New comment textarea supports input
8. Comment count displays at top
9. Comments load on component mount
10. Resolved comments show faded background

---

## Testing Instructions
1. Create comment on step
2. Verify comment appears in list
3. Create reply (parent_id set)
4. Verify reply threaded
5. Mark comment as resolved
6. Verify background fades
7. Load StepComments component
8. Verify comment count accurate
9. Test @mention (future: autocomplete)
10. Test comment visibility across users

---

## Notes for the AI Agent
- Uses v1 polymorphic comments system
- entity_type='helix_step' distinguishes from other entities
- Threaded replies support discussion trees
- @mentions will be implemented in Phase 135 with notifications
