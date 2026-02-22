# Phase 021 - Hall Agent: Auto-Tag Suggestions

## Objective
Implement automatic tag suggestions when a new idea is created. The agent analyzes idea title and body to suggest relevant tags from existing project tags or proposes new ones.

## Prerequisites
- Phase 013: Create Idea / Note Capture (modal structure)
- Phase 020: Hall Agent Infrastructure (API and context)
- Phase 018: Tagging System (tag management)

## Context
Users often forget to tag ideas immediately upon capture, leading to organizational challenges later. Auto-tagging suggestions reduce friction by proposing relevant tags based on idea content, accelerating the capture process and improving organization from inception.

## Detailed Requirements

### Tag Suggestion Trigger

**When**
- After idea title and body filled in (minimum: non-empty title)
- Debounce 800ms after last keystroke in title or body
- Manual trigger: "Get suggestions" button in create modal (optional)

**Automatic Flow**
1. User enters idea title: "Mobile app authentication"
2. User enters body: "Need a secure login flow for mobile users..."
3. After 800ms of inactivity, suggestions requested
4. Suggestions appear below tag input as dismissible chips
5. User can accept (add to selected tags), reject (remove chip), or ignore

### Suggestion Display

**Suggestion Chips**
- Display below tag input field
- Show max 5 suggestions
- Format: `[Tag Name]` with light background (light gray or light colored based on tag color)
- Each chip has:
  - Tag name
  - Confidence score (optional, 0-100%): small percentage badge
  - "Accept" button (+ icon or checkmark)
  - "Reject" button (X icon)

**Grouping**
- Section header: "Suggested Tags"
- Below: "Existing Tags" and "New Tag Suggestions" if applicable
- Divider between existing and new suggestions

**Example Display**
```
Suggested Tags
──────────────
[Feature ✓ 95%] [Backend ✓ 87%] [Security ✓ 92%]
[X] Mobile [X] [X] API Integration [X]

New Suggestions
──────────────
[Mobile OAuth ✓ 78%] [X]
```

**Visual Feedback**
- Hover over chip: show tooltip with reasoning (e.g., "Found in 3 similar ideas")
- Accept: chip moves to selected tags section, color solidifies
- Reject: chip fades and disappears
- Accepted tags persist; user can still remove them manually

### API Endpoint: Suggest Tags

**Route**: POST /api/agent/hall/suggest-tags

**Request**
```json
{
  "projectId": "uuid",
  "ideaTitle": "Mobile app authentication",
  "ideaBody": "Need secure login flow for mobile users...",
  "existingTags": [
    { "id": "tag1", "name": "Feature", "color": "#3B82F6" },
    { "id": "tag2", "name": "Backend", "color": "#A855F7" }
  ]
}
```

**Response**
```json
{
  "suggestions": [
    {
      "id": "tag1",
      "name": "Feature",
      "isNew": false,
      "confidence": 0.95,
      "reasoning": "Title mentions 'feature' concepts"
    },
    {
      "id": "tag2",
      "name": "Backend",
      "isNew": false,
      "confidence": 0.87,
      "reasoning": "Body discusses server-side logic"
    },
    {
      "name": "Mobile OAuth",
      "isNew": true,
      "confidence": 0.78,
      "suggestedColor": "#EC4899",
      "reasoning": "Specific to mobile authentication patterns"
    }
  ]
}
```

### Agent Analysis Logic

**Approach**
1. **Keyword Matching**: Search idea title/body for tag names
   - Exact matches: high confidence (0.9+)
   - Partial matches: medium confidence (0.7-0.85)

2. **Semantic Analysis**: Use AI to infer tags from content
   - Send idea content to Claude with prompt: "What tags would organize this idea?"
   - Parse response for tag names from existing project tags
   - Suggest new tags if concepts not covered by existing ones

3. **Similar Ideas**: Find ideas with similar content
   - Use keyword overlap or embeddings (if available)
   - Extract tags from similar ideas
   - Suggest most frequent tags

4. **Confidence Scoring**
   - Keyword match: 0.9 + (0.1 per 10 word match radius)
   - Semantic: depends on AI confidence
   - Similar ideas: (count of similar ideas with tag) / (total similar ideas)

### Create Idea Modal Integration

**Modified Flow**
1. User fills title and body
2. Click outside input or wait 800ms
3. Suggestions API called in background
4. Loading indicator appears briefly
5. Suggestions populate as chips
6. User can:
   - Click chip to accept: moves to selected tags
   - Click X to reject: chip disappears
   - Manually manage all tags as before
   - Click "Create Idea" to submit with selected tags

**No Blocking**
- Suggestions don't block idea creation
- If API slow or fails, user can still submit idea
- Suggestions are optional/advisory

**Implementation in IdeaCreateModal**

```typescript
const [suggestedTags, setSuggestedTags] = useState<TagSuggestion[]>([]);
const [suggestionsLoading, setSuggestionsLoading] = useState(false);
const suggestionsTimer = useRef<NodeJS.Timeout>();

const requestSuggestions = async (title: string, body: string) => {
  if (!title.trim()) return; // No suggestions without title

  setSuggestionsLoading(true);

  try {
    const response = await fetch('/api/agent/hall/suggest-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        ideaTitle: title,
        ideaBody: body,
        existingTags: projectTags,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setSuggestedTags(data.suggestions);
    }
  } catch (err) {
    console.error('Error getting suggestions:', err);
  } finally {
    setSuggestionsLoading(false);
  }
};

const handleTitleChange = (value: string) => {
  setFormData(prev => ({ ...prev, title: value }));

  // Debounce suggestion request
  if (suggestionsTimer.current) {
    clearTimeout(suggestionsTimer.current);
  }

  suggestionsTimer.current = setTimeout(() => {
    requestSuggestions(value, formData.body);
  }, 800);
};

const handleAcceptSuggestion = (suggestion: TagSuggestion) => {
  if (!suggestion.isNew) {
    // Existing tag: add to selected
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(suggestion.id)
        ? prev.tagIds
        : [...prev.tagIds, suggestion.id],
    }));
  } else {
    // New tag: add to newTags
    setFormData(prev => ({
      ...prev,
      newTags: prev.newTags.some(t => t.name === suggestion.name)
        ? prev.newTags
        : [...prev.newTags, {
            name: suggestion.name,
            color: suggestion.suggestedColor || '#808080',
          }],
    }));
  }

  // Remove from suggestions
  setSuggestedTags(prev =>
    prev.filter(s => s.name !== suggestion.name)
  );
};

const handleRejectSuggestion = (suggestionName: string) => {
  setSuggestedTags(prev =>
    prev.filter(s => s.name !== suggestionName)
  );
};

// In JSX form:
{suggestedTags.length > 0 && (
  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <h4 className="text-sm font-semibold text-blue-900 mb-3">
      Suggested Tags
    </h4>
    <div className="flex flex-wrap gap-2">
      {suggestedTags.map((suggestion, idx) => (
        <div
          key={idx}
          className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-blue-300 rounded-full text-sm"
        >
          <span>{suggestion.name}</span>
          {suggestion.confidence && (
            <span className="text-xs text-blue-600 font-semibold">
              {Math.round(suggestion.confidence * 100)}%
            </span>
          )}
          <button
            type="button"
            onClick={() => handleAcceptSuggestion(suggestion)}
            title="Accept suggestion"
            className="text-green-600 hover:text-green-700"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => handleRejectSuggestion(suggestion.name)}
            title="Reject suggestion"
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

## API Route Implementation

**POST /api/agent/hall/suggest-tags**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, ideaTitle, ideaBody, existingTags } = await request.json();

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

    // Get all ideas in project for context
    const ideasResponse = await supabase
      .from('ideas')
      .select(`
        id, title, body,
        idea_tags(tag_id, tags(id, name))
      `)
      .eq('project_id', projectId)
      .limit(50);

    const ideas = ideasResponse.data || [];

    // Build prompt for Claude
    const systemPrompt = `You are a tagging assistant for a product idea management system.
Analyze the given idea and suggest tags from the provided list, or propose new tags if needed.

Existing tags: ${existingTags.map(t => t.name).join(', ')}

For each suggestion, provide:
1. Tag name (from existing or new)
2. Confidence (0-100)
3. Brief reasoning

Format as JSON array:
[
  { "name": "Feature", "confidence": 95, "isNew": false, "reasoning": "..." },
  { "name": "Mobile Auth", "confidence": 78, "isNew": true, "reasoning": "..." }
]`;

    const userPrompt = `
Idea Title: ${ideaTitle}
Idea Body: ${ideaBody}

Suggest 3-5 most relevant tags. Return ONLY valid JSON.`;

    // Call Claude
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    let suggestions: any[] = [];

    try {
      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (err) {
      console.error('Error parsing suggestions:', err);
    }

    // Enrich suggestions with tag IDs and colors
    const enrichedSuggestions = suggestions.map(sugg => {
      const existingTag = existingTags.find(
        t => t.name.toLowerCase() === sugg.name.toLowerCase()
      );

      return {
        id: existingTag?.id,
        name: sugg.name,
        isNew: !existingTag,
        confidence: sugg.confidence / 100, // Convert to 0-1
        suggestedColor: existingTag?.color || generateColor(),
        reasoning: sugg.reasoning,
      };
    });

    return NextResponse.json({
      suggestions: enrichedSuggestions,
    });
  } catch (error) {
    console.error('Error suggesting tags:', error);
    return NextResponse.json(
      { error: 'Failed to suggest tags' },
      { status: 500 }
    );
  }
}

function generateColor(): string {
  const colors = [
    '#3B82F6', '#EF4444', '#A855F7', '#10B981',
    '#F59E0B', '#EC4899', '#06B6D4', '#F97316',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
```

## Acceptance Criteria
1. Suggestions appear automatically 800ms after title/body input
2. Max 5 suggestions shown as dismissible chips
3. Existing tags and new suggestions distinguished
4. Confidence score displayed on each suggestion
5. "Accept" button (✓) adds tag to selected
6. "Reject" button (X) removes suggestion
7. Accepted suggestions move to selected tags section
8. API call doesn't block idea creation
9. Graceful fallback if API fails (suggestions simply don't appear)
10. New tag suggestions include color selection
11. Suggestions context-aware (analyzed from idea content)
12. No duplicate suggestions
13. Confidence scores reasonable (0-100%)
14. Reasoning provided (tooltip or summary)
15. Suggestions cleared when title/body cleared
16. Manual tag selection still works alongside suggestions
17. Responsive: suggestions wrap properly on mobile
18. Loading indicator shows while fetching
19. Suggestions updated if title/body changed (re-request)
20. Project tags available for suggestion matching

## Testing Instructions

### Auto-Suggestion Trigger
1. Open create idea modal
2. Type title: "Mobile push notifications"
3. Leave body empty, wait 800ms
4. Verify suggestions appear
5. Type body: "Need to send push notifications to mobile users..."
6. Wait 800ms
7. Verify suggestions update with new context

### Suggestion Display
1. Verify suggestions show as chips with tag names
2. Verify confidence percentages shown (e.g., "92%")
3. Verify checkmark (✓) and X buttons visible
4. Verify "Suggested Tags" header displayed
5. Verify max 5 suggestions shown (truncate if more)

### Accept Suggestion
1. See suggestion for existing tag "Mobile"
2. Click checkmark
3. Verify suggestion moves to selected tags
4. Verify tag appears as colored pill in selected section
5. Verify suggestion chip disappears

### Reject Suggestion
1. See suggestion for tag "Mobile"
2. Click X button
3. Verify suggestion disappears
4. Verify doesn't add to selected tags

### New Tag Suggestion
1. See suggestion for new tag "Push Notifications"
2. Click checkmark to accept
3. Verify new tag added to form (marked as "new")
4. Create idea
5. Verify new tag created in database

### No Blocking
1. Open create modal
2. Type title and body
3. Don't wait for suggestions to appear
4. Click "Create Idea" immediately
5. Verify idea created successfully
6. Verify suggestions don't delay submission

### Error Handling
1. Simulate API error (network throttle)
2. Type title and body
3. Wait for suggestions
4. Verify error doesn't prevent idea creation
5. Verify suggestions simply don't appear

### Responsive
- **Mobile**: Suggestions wrap properly
- **Desktop**: Chips display in single row or wrap as needed

### Confidence Scoring
1. Create idea with very specific title matching existing tag
2. Verify that suggestion gets high confidence (85%+)
3. Create vague idea
4. Verify suggestions get lower confidence (60-70%)

### Multi-Tag Ideas
1. Create idea about "Mobile payment authentication"
2. Verify multiple relevant suggestions (Mobile, Payment, Security)
3. Accept multiple suggestions
4. Create idea
5. Verify all accepted tags applied
