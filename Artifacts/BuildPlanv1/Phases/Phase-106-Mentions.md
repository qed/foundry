# Phase 106 - @Mentions System

## Objective
Implement @mention functionality allowing users to reference and tag other users, documents, work orders, and artifacts in comments and editors with autocomplete and styled rendering.

## Prerequisites
- Phase 105 (Comments System Foundation) completed
- Phase 099 (Artifact Linking to Entities) completed (for artifact mentions)
- Editors in Hall, Pattern Shop, Control Room, Assembly Floor modules

## Context
@mentions enable users to notify team members about content and create rich references to entities. When a user types "@", an autocomplete dropdown suggests matching users and entities, and mentions are rendered as styled chips with links.

## Detailed Requirements

### Mention Types

#### User Mentions
- Mention user by name: "@John"
- Triggers notifications (Phase 107)
- Reference format: `@[user-name](user:{user-id})`

#### Document Mentions
- Mention requirements documents or blueprints: "@Design System"
- Clickable link to document
- Reference format: `@[doc-name](doc:{doc-type}:{doc-id})`

#### Work Order Mentions
- Mention work orders: "@WO-123"
- Reference format: `@[work-order-title](work_order:{order-id})`

#### Artifact Mentions
- Mention uploaded artifacts: "@Logo.png"
- Reference format: `@[artifact-name](artifact:{artifact-id})`

### Database Schema

#### mention_references table
Track all mentions in comments and content:

```sql
CREATE TABLE mention_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content_id UUID,
  content_type VARCHAR(50),
  mentioned_type VARCHAR(50) NOT NULL,
  mentioned_id UUID NOT NULL,
  mentioned_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (comment_id IS NOT NULL OR document_id IS NOT NULL),
  CHECK (mentioned_type IN ('user', 'document', 'work_order', 'artifact'))
);

CREATE INDEX idx_mention_references_comment ON mention_references(comment_id);
CREATE INDEX idx_mention_references_mentioned ON mention_references(mentioned_type, mentioned_id);
CREATE INDEX idx_mention_references_created_at ON mention_references(created_at DESC);
```

### Autocomplete System

#### Mention Trigger
- Type "@" anywhere in comment or editor
- Autocomplete dropdown appears
- Debounce typing to 200ms before showing results

#### Search Algorithm
```typescript
interface MentionMatch {
  type: 'user' | 'document' | 'work_order' | 'artifact';
  id: string;
  name: string;
  display: string;
  avatar?: string;
  highlighted: boolean; // Recently mentioned
}

function searchMentions(
  query: string,
  projectId: string,
  recentlyMentioned: MentionMatch[] = []
): Promise<MentionMatch[]> {
  // 1. Search users by name/email
  // 2. Search documents by title
  // 3. Search work orders by title/number
  // 4. Search artifacts by filename
  // 5. Prioritize exact matches and recently mentioned
  // 6. Return top 10 results
}
```

#### Dropdown UI
```typescript
interface MentionDropdownProps {
  query: string;
  matches: MentionMatch[];
  selectedIndex: number;
  position: { x: number; y: number };
  onSelect: (match: MentionMatch) => void;
  onDismiss: () => void;
}

export function MentionDropdown({
  query,
  matches,
  selectedIndex,
  position,
  onSelect,
  onDismiss,
}: MentionDropdownProps) {
  // Dropdown showing matching users/entities
  // Keyboard navigation (arrow keys)
  // Tab or Enter to select
}
```

### Mention Rendering

#### Styled Mention Chip
```typescript
interface MentionChipProps {
  type: 'user' | 'document' | 'work_order' | 'artifact';
  name: string;
  mentionedId: string;
  onClick?: () => void;
  avatar?: string;
}

export function MentionChip({
  type,
  name,
  mentionedId,
  onClick,
  avatar,
}: MentionChipProps) {
  // Styled chip with @ prefix
  // Type-specific icon/color
  // Hover shows preview
  // Click navigates to entity
}
```

#### Mention Styles
- User mention: Blue chip with avatar
- Document mention: Purple chip with document icon
- Work order mention: Orange chip with ticket icon
- Artifact mention: Gray chip with file icon
- Hover: Background highlight + preview tooltip

### Mention Parsing

#### Extract Mentions from Content
```typescript
interface ParsedMention {
  type: 'user' | 'document' | 'work_order' | 'artifact';
  id: string;
  name: string;
  offset: number;
  length: number;
}

function parseMentions(content: string): ParsedMention[] {
  // Regex pattern: @[text](type:id)
  // Extract all mentions and return array
  const mentionRegex = /@\[([^\]]+)\]\((\w+):([a-f0-9-]+)\)/g;
  const matches = [...content.matchAll(mentionRegex)];

  return matches.map(m => ({
    name: m[1],
    type: m[2] as MentionType,
    id: m[3],
    offset: m.index,
    length: m[0].length,
  }));
}
```

#### Render Mentions in Display
```typescript
function renderMentions(content: string): JSX.Element {
  const mentions = parseMentions(content);

  // Split content by mention positions
  // Render text segments and mention chips
  return (
    <>
      {mentions.map((mention, i) => (
        <React.Fragment key={i}>
          <span>{content.substring(lastOffset, mention.offset)}</span>
          <MentionChip
            type={mention.type}
            name={mention.name}
            mentionedId={mention.id}
          />
        </React.Fragment>
      ))}
      <span>{content.substring(lastOffset)}</span>
    </>
  );
}
```

## File Structure
```
src/
├── components/
│   ├── mentions/
│   │   ├── MentionDropdown.tsx
│   │   ├── MentionChip.tsx
│   │   ├── MentionInput.tsx    (input with mention support)
│   │   └── MentionPreview.tsx
│   └── shared/
│       └── RenderMentions.tsx  (utility to render mentions)
├── lib/
│   ├── mentions/
│   │   ├── search.ts           (search mentions)
│   │   ├── parse.ts            (parse mention syntax)
│   │   ├── render.ts           (render mentions to JSX)
│   │   └── validation.ts       (validate mention syntax)
│   ├── editor-plugins/
│   │   └── mentionPlugin.ts    (TipTap plugin for mentions)
│   └── types/
│       └── mentions.ts         (TypeScript types)
├── hooks/
│   ├── useMention.ts           (mention detection & insertion)
│   └── useMentionSearch.ts     (search hook)
└── app/api/
    ├── mentions/
    │   ├── search/
    │   │   └── route.ts        (search endpoint)
    │   └── parse/
    │       └── route.ts        (parse mentions from content)
    └── comments/
        └── [id]/
            └── mentions/
                └── route.ts    (get mentions in comment)
```

## API Routes

### POST /api/mentions/search
Search for mentions:

```
Query params:
- project_id: string (required)
- query: string (required, min 1 char)
- types?: string[] (optional, filter by type)
- limit: number (optional, default 10)

Response:
{
  matches: [
    {
      type: 'user' | 'document' | 'work_order' | 'artifact',
      id: string,
      name: string,
      display: string,
      avatar?: string,
      recent: boolean
    }
  ],
  total: number
}
```

### POST /api/mentions/parse
Parse mentions from content:

```
Body:
{
  content: string,
  project_id: string
}

Response:
{
  mentions: [
    {
      type: string,
      id: string,
      name: string,
      offset: number,
      length: number,
      exists: boolean  // entity still exists
    }
  ],
  has_invalid: boolean
}
```

### GET /api/comments/[id]/mentions
Get all mentions in comment:

```
Response:
{
  mentions: [
    {
      type: string,
      id: string,
      name: string,
      mentioned_id: string
    }
  ]
}
```

## Mention Tracking

### Create mention_references entries when:
1. Comment posted with mentions
2. Document saved with mentions
3. Work order created/updated with mentions

### Process:
```typescript
async function trackMentions(
  content: string,
  parentType: 'comment' | 'document',
  parentId: string,
  projectId: string
) {
  const mentions = parseMentions(content);

  for (const mention of mentions) {
    // Verify entity exists
    const entity = await getEntity(mention.type, mention.id);
    if (!entity) continue;

    // Create mention reference
    await createMentionReference({
      [parentType === 'comment' ? 'comment_id' : 'document_id']: parentId,
      mentioned_type: mention.type,
      mentioned_id: mention.id,
      mentioned_name: mention.name,
    });

    // If user mention, create notification (Phase 107)
    if (mention.type === 'user') {
      await createNotification(mention.id, {
        type: 'mention',
        entity_type: parentType,
        entity_id: parentId,
      });
    }
  }
}
```

## Acceptance Criteria
- [ ] Typing "@" shows mention autocomplete dropdown
- [ ] Autocomplete filters users, documents, work orders, artifacts
- [ ] Dropdown shows up to 10 results
- [ ] Arrow keys navigate dropdown
- [ ] Enter/Tab selects mention
- [ ] Escape closes dropdown
- [ ] Mention inserted in correct format: @[name](type:id)
- [ ] Mention chips render with type-specific styling
- [ ] User mention chips show avatar
- [ ] Mention chips clickable to navigate to entity
- [ ] Mentions parsed from stored content
- [ ] mention_references table tracks all mentions
- [ ] User mentions trigger notifications
- [ ] Recently mentioned items prioritized in search
- [ ] Works in comments section
- [ ] Works in editors (all modules)
- [ ] Permission checks prevent mentioning private entities
- [ ] Mentions to deleted entities marked as invalid
- [ ] Performance: mention search < 100ms
- [ ] Mobile friendly dropdown positioning

## Testing Instructions

### Database Tests
```sql
-- Create mention reference
INSERT INTO mention_references
  (comment_id, mentioned_type, mentioned_id, mentioned_name)
VALUES ('{comment-id}', 'user', '{user-id}', 'John Doe');

-- Query mentions in comment
SELECT * FROM mention_references
WHERE comment_id = '{comment-id}';
```

### Component Tests
```typescript
// MentionDropdown.test.tsx
describe('MentionDropdown', () => {
  it('shows matching users', () => {
    // Verify users in dropdown
  });

  it('filters by query', async () => {
    // Type query, verify filtered results
  });

  it('selects on Enter', async () => {
    // Verify onSelect called
  });

  it('navigates with arrow keys', async () => {
    // Arrow down selects next item
  });
});

// MentionChip.test.tsx
describe('MentionChip', () => {
  it('renders with type-specific styling', () => {
    // Verify colors for user/doc/work_order/artifact
  });

  it('shows avatar for user mention', () => {
    // Verify avatar displays
  });

  it('navigates on click', async () => {
    // Click chip, verify navigation
  });
});
```

### Integration Tests
```bash
# Search mentions
curl "http://localhost:3000/api/mentions/search?project_id={project-id}&query=john"

# Parse mentions in content
curl -X POST http://localhost:3000/api/mentions/parse \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Check out @[Design System](doc:blueprint:{id})",
    "project_id": "{project-id}"
  }'

# Get mentions in comment
curl "http://localhost:3000/api/comments/{comment-id}/mentions"
```

### Manual Testing
1. Navigate to comment section
2. Type "@" and verify dropdown appears
3. Type "@john" and verify users filtered
4. Select user from dropdown and verify mention inserted
5. Type "@" in editor and select document
6. Verify mention renders as styled chip
7. Click mention chip and verify navigation to entity
8. Edit comment and verify mentions preserved
9. Hover over mention chip and verify preview tooltip
10. Test in comments and all editor types
11. Create comment with multiple mentions
12. Verify mention_references created for each
13. Test notification sent on user mention (Phase 107)
14. Test with special characters in entity names
15. Test mention to deleted entity (should handle gracefully)
