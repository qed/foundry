# Phase 022 - Hall Agent: Duplicate Detection

## Objective
Automatically detect potential duplicate ideas when a new idea is created. Alert users of similar existing ideas, allowing them to merge, link, or dismiss.

## Prerequisites
- Phase 013: Create Idea / Note Capture (modal and API)
- Phase 020: Hall Agent Infrastructure (API and streaming)
- Phase 011: Hall Database Schema (idea_connections table)

## Context
As The Hall grows, duplicate ideas accumulate, fragmenting discussion and duplicating effort. Detecting duplicates at capture time prevents fragmentation and encourages idea merging early. Users should be able to quickly assess similarity and decide whether to proceed, merge, or link ideas.

## Detailed Requirements

### Duplicate Detection Trigger

**When**
- After idea submitted (after POST /api/hall/ideas succeeds)
- Run in background (doesn't block submission)
- If duplicates found: show alert in Hall list or detail view

**Alternative: Pre-Submit Detection**
- Before idea creation, analyze against existing ideas
- Show alert before saving
- Allow user to cancel and merge into existing instead
- Less recommended (delays capture flow)

**Recommended: Post-Submit Detection**
- User creates idea quickly
- Idea appears in list immediately (optimistic)
- Background detection runs
- Alert shows with options to merge/link

### Similarity Matching Algorithm

**Approach 1: Keyword Overlap (Simple)**
- Extract keywords from new idea title + body
- Compare against all existing ideas
- Score based on keyword matches: (matching keywords / total keywords) × 100
- Threshold: Ideas with >70% similarity are duplicates

**Approach 2: Semantic Similarity (Advanced)**
- Use AI embeddings or semantic analysis
- Calculate similarity score (0-1)
- Threshold: >0.75 similarity = potential duplicate
- More accurate but requires API calls

**Recommended: Hybrid**
- Start with keyword matching for speed
- For top candidates, use AI semantic analysis for refinement
- Return top 3-5 potential duplicates with confidence

### Detection Result Display

**Alert Panel** (In Hall List or Detail View)

```
⚠️ Possible Duplicates Found

We found ideas similar to "Mobile push notifications":

[Similar] "Push notification system"
87% match - Created 2 days ago
"Send push notifications to mobile and web users..."
[View] [Merge] [Link]

[Similar] "Notification system redesign"
73% match - Created 1 week ago
"Improve our notification system for better user engagement..."
[View] [Merge] [Link]

[Dismiss All]
```

**Alert Display Location**
- Option 1: Floating toast or banner
- Option 2: Collapsible alert panel in detail view
- Option 3: Modal dialog (more intrusive)

**Recommended: Non-intrusive banner/alert**
- Appears below idea in list or detail view
- Can be dismissed
- Doesn't block workflow
- Offers actions: View, Merge, Link, Dismiss

### Duplicate Actions

**1. View**
- Opens detail view of potential duplicate
- User can quickly assess similarity
- Links back to original idea
- Option to return and merge

**2. Merge**
- User selects this idea to merge into
- All tags from both ideas combined
- History/notes combined in body or comments (future)
- Original idea archived or deleted
- Confirmation dialog: "Merge [New] into [Existing]? This cannot be undone."
- On confirm:
  - Merge tags
  - Archive new idea
  - Create connection with type "duplicates"
  - Toast: "Ideas merged"

**3. Link**
- User selects relationship type: "related", "duplicates", "extends"
- Creates idea_connection
- Both ideas remain active
- Toast: "Ideas linked"

**4. Dismiss**
- Close alert for this duplicate
- Next time The Hall is accessed, don't re-show this duplicate alert
- Store in local state or database (dismiss history)
- Individual dismiss per duplicate or "Dismiss All"

### API Endpoint: Detect Duplicates

**Route**: POST /api/agent/hall/detect-duplicates

**Request**
```json
{
  "projectId": "uuid",
  "ideaId": "uuid",
  "ideaTitle": "Mobile push notifications",
  "ideaBody": "Need to send push notifications to mobile users..."
}
```

**Response**
```json
{
  "duplicates": [
    {
      "ideaId": "idea2",
      "title": "Push notification system",
      "preview": "Send push notifications to mobile and web users...",
      "similarity": 0.87,
      "reason": "87% keyword overlap in title and body",
      "createdAt": "2025-02-18T10:00:00Z",
      "createdBy": "user@example.com"
    },
    {
      "ideaId": "idea3",
      "title": "Notification system redesign",
      "preview": "Improve our notification system for better...",
      "similarity": 0.73,
      "reason": "73% semantic similarity",
      "createdAt": "2025-02-15T14:30:00Z",
      "createdBy": "user@example.com"
    }
  ]
}
```

### Implementation Flow

**In IdeaCreateModal or Hall Page**

```typescript
// After idea created successfully
const handleIdeaCreated = async (newIdea: Idea) => {
  // Close modal
  setShowCreateModal(false);

  // Add to list optimistically
  setIdeas(prev => [newIdea, ...prev]);

  // Detect duplicates in background
  detectDuplicates(newIdea);
};

const detectDuplicates = async (idea: Idea) => {
  try {
    const response = await fetch(
      '/api/agent/hall/detect-duplicates',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ideaId: idea.id,
          ideaTitle: idea.title,
          ideaBody: idea.body,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.duplicates.length > 0) {
        setDuplicateAlert({
          ideaId: idea.id,
          duplicates: data.duplicates,
        });
      }
    }
  } catch (err) {
    console.error('Duplicate detection error:', err);
    // Fail silently; don't block user
  }
};
```

### Duplicate Alert Component

```typescript
interface DuplicateAlertProps {
  newIdeaId: string;
  newIdeaTitle: string;
  duplicates: DuplicateIdea[];
  projectId: string;
  onDismiss: () => void;
  onMerge?: (targetIdeaId: string) => void;
  onLink?: (targetIdeaId: string, type: string) => void;
}

export function DuplicateAlert({
  newIdeaId,
  newIdeaTitle,
  duplicates,
  projectId,
  onDismiss,
  onMerge,
  onLink,
}: DuplicateAlertProps) {
  const [selectedAction, setSelectedAction] = useState<{
    ideaId: string;
    action: 'merge' | 'link';
  } | null>(null);

  const handleMerge = async (targetIdeaId: string) => {
    const response = await fetch(`/api/hall/ideas/${newIdeaId}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetIdeaId }),
    });

    if (response.ok) {
      toast.success('Ideas merged successfully');
      onMerge?.(targetIdeaId);
      onDismiss();
    }
  };

  const handleLink = async (targetIdeaId: string, type: string) => {
    const response = await fetch('/api/hall/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceIdeaId: newIdeaId,
        targetIdeaId,
        connectionType: type,
      }),
    });

    if (response.ok) {
      toast.success('Ideas linked successfully');
      onLink?.(targetIdeaId, type);
      onDismiss();
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>

        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 mb-2">
            Possible Duplicates Found
          </h3>
          <p className="text-sm text-yellow-800 mb-4">
            We found ideas similar to "{newIdeaTitle}". You can merge, link, or dismiss them.
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {duplicates.map(dup => (
              <div key={dup.ideaId} className="p-3 bg-white rounded-lg border border-yellow-100">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {dup.title}
                  </h4>
                  <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                    {Math.round(dup.similarity * 100)}%
                  </span>
                </div>

                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {dup.preview}
                </p>

                <p className="text-xs text-gray-500 mb-2">
                  {dup.reason}
                </p>

                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => {
                      // Open detail view
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleMerge(dup.ideaId)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => setSelectedAction({ ideaId: dup.ideaId, action: 'link' })}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Link
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={onDismiss}
              className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

## API Route Implementation

**POST /api/agent/hall/detect-duplicates**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, ideaId, ideaTitle, ideaBody } = await request.json();

    // Verify project access
    const memberCheck = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (!memberCheck.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all ideas in project (excluding new idea)
    const ideasResponse = await supabase
      .from('ideas')
      .select(`
        id, title, body, created_at,
        created_by(email, user_metadata)
      `)
      .eq('project_id', projectId)
      .neq('id', ideaId);

    const existingIdeas = ideasResponse.data || [];

    // Step 1: Keyword-based similarity (fast)
    const newKeywords = extractKeywords(`${ideaTitle} ${ideaBody}`);

    const similarIdeasByKeyword = existingIdeas
      .map(idea => ({
        ...idea,
        similarity: calculateKeywordSimilarity(
          newKeywords,
          extractKeywords(`${idea.title} ${idea.body}`)
        ),
      }))
      .filter(idea => idea.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    // Step 2: Semantic analysis (for top candidates)
    let finalDuplicates = similarIdeasByKeyword;

    if (similarIdeasByKeyword.length > 0) {
      // Optional: Send to Claude for semantic confirmation
      const prompt = `Compare this new idea with existing ideas. Rate similarity 0-1.

New Idea: "${ideaTitle}"
${ideaBody}

Existing Ideas:
${similarIdeasByKeyword.map(idea => `- "${idea.title}": ${idea.body?.substring(0, 100)}...`).join('\n')}

Return JSON with similarity scores for each.`;

      try {
        const response = await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        // Parse semantic scores and merge with keyword scores
        // (simplified; implement proper parsing in production)
      } catch (err) {
        // Fall back to keyword-only results
      }
    }

    return NextResponse.json({
      duplicates: finalDuplicates.map(idea => ({
        ideaId: idea.id,
        title: idea.title,
        preview: (idea.body || '').substring(0, 150),
        similarity: idea.similarity,
        reason: `${Math.round(idea.similarity * 100)}% similarity match`,
        createdAt: idea.created_at,
        createdBy: idea.created_by?.email || 'Unknown',
      })),
    });
  } catch (error) {
    console.error('Duplicate detection error:', error);
    // Return empty duplicates on error (don't block)
    return NextResponse.json({ duplicates: [] });
  }
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 20);
}

function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}
```

**POST /api/hall/ideas/[ideaId]/merge**

```typescript
export async function POST(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  const { targetIdeaId } = await request.json();

  // Verify access...

  // Get both ideas
  const newIdea = await supabase.from('ideas').select('*').eq('id', params.ideaId).single();
  const targetIdea = await supabase.from('ideas').select('*').eq('id', targetIdeaId).single();

  // Merge tags
  const newIdeaTags = await supabase
    .from('idea_tags')
    .select('tag_id')
    .eq('idea_id', params.ideaId);

  const targetIdeatags = await supabase
    .from('idea_tags')
    .select('tag_id')
    .eq('idea_id', targetIdeaId);

  const allTagIds = new Set([
    ...newIdeaTags.data.map(t => t.tag_id),
    ...targetIdeatags.data.map(t => t.tag_id),
  ]);

  // Upsert tags into target idea
  await supabase
    .from('idea_tags')
    .upsert(
      Array.from(allTagIds).map(tagId => ({
        idea_id: targetIdeaId,
        tag_id: tagId,
      })),
      { onConflict: 'idea_id,tag_id' }
    );

  // Create connection
  await supabase
    .from('idea_connections')
    .insert({
      source_idea_id: params.ideaId,
      target_idea_id: targetIdeaId,
      connection_type: 'duplicates',
      created_by: session.user.id,
    });

  // Archive new idea
  await supabase
    .from('ideas')
    .update({ status: 'archived' })
    .eq('id', params.ideaId);

  return NextResponse.json({ success: true });
}
```

## Acceptance Criteria
1. Duplicate detection runs after idea creation
2. Detection doesn't block idea submission
3. Alert appears if duplicates found
4. Alert shows similar ideas with similarity percentage
5. Alert is dismissible without action
6. Merge action archives new idea and combines tags
7. Link action creates connection between ideas
8. View action opens duplicate idea detail
9. Similarity scoring 0-100% accurate
10. Keyword-based matching finds obvious duplicates
11. Handles edge cases (very long bodies, no body, etc.)
12. Error in detection doesn't break submission
13. Multiple duplicates shown (max 5)
14. Confirmation dialog for merge action
15. Toast feedback for actions (merge, link, dismiss)
16. Merged ideas have all tags from both
17. Connections created for duplicates/related
18. Performance: detection completes in <5 seconds
19. Only shows duplicates with >70% similarity
20. Respects project access controls

## Testing Instructions

### Detection Trigger
1. Create idea: "Mobile push notifications"
2. Submit idea
3. Verify idea appears in list immediately
4. Wait a few seconds
5. Verify alert appears (if duplicates exist)

### Alert Display
1. With alert showing, verify it shows:
   - Warning icon
   - Title: "Possible Duplicates Found"
   - List of similar ideas with similarity %
   - View, Merge, Link buttons for each

### Merge Action
1. In alert, click "Merge" on duplicate
2. Verify confirmation modal appears
3. Click "Merge" to confirm
4. Verify toast: "Ideas merged successfully"
5. Verify original idea removed from list
6. Open target idea; verify tags combined
7. Verify connection created

### Link Action
1. Click "Link" on duplicate
2. Select "related" connection type
3. Click "Link" to confirm
4. Verify both ideas remain active
5. Open either idea; verify connection shown
6. Verify connection visible in detail view

### Dismiss
1. Click "Dismiss" on alert
2. Verify alert disappears
3. Next Hall session, verify same alert doesn't reappear (locally dismissed)

### No Blocking
1. Slow API response (network throttle)
2. Create idea
3. Verify idea created immediately
4. Don't wait for alert
5. Navigate away
6. Verify no errors or loading states

### Edge Cases
1. Create idea with very short title: "Test"
2. Verify detection still works
3. Create idea with no body, just title
4. Verify detection works
5. Create duplicate of very long idea (5000 chars)
6. Verify detection completes
