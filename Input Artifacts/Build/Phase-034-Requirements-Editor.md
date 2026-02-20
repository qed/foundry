# Phase 034 - Requirements Document Editor

## Objective
Implement a rich text editor for requirements documents (FRDs and technical docs) with TipTap integration, auto-save, document outline generation, and collaborative editing features.

## Prerequisites
- Feature Requirements Document (Phase 033)
- Pattern Shop layout (Phase 027)
- Product Overview (Phase 028)
- TipTap library (or Slate, ProseMirror alternatives)

## Context
The editor is the primary interface for writing and refining requirements. Teams spend significant time here, so the UX must be smooth, fast, and feature-rich. TipTap provides a headless, framework-agnostic editor built on ProseMirror with excellent React integration and extensibility.

## Detailed Requirements

### Editor Features

**Core Formatting Toolbar:**
1. **Text Styles:**
   - Bold (Ctrl+B / Cmd+B)
   - Italic (Ctrl+I / Cmd+I)
   - Underline (Ctrl+U / Cmd+U)

2. **Block Styles:**
   - Heading 1 (Cmd+Alt+1)
   - Heading 2 (Cmd+Alt+2)
   - Heading 3 (Cmd+Alt+3)
   - Paragraph

3. **Lists:**
   - Bullet list (Ctrl+Shift+8 or • button)
   - Numbered list (Ctrl+Shift+9 or 1. button)

4. **Blocks:**
   - Code block (```code section)
   - Blockquote (> quoted text)

5. **Links:**
   - Insert/edit link (Ctrl+K)
   - Remove link

**Toolbar Layout:**
```
┌─ [B] [I] [U] │ [H1] [H2] [H3] │ [●] [1.] │ [{}] ["] │ [Link] │ [Undo] [Redo] ─┐
│                                                                                   │
│  {Editor content}                                                               │
│                                                                                   │
└─ Word count: 1,250 │ Reading time: 5 min ───────────────────────────────────────┘
```

### Auto-Save Functionality

**Trigger:**
- Every 2 seconds after user stops typing (debounced)
- On blur (user leaves editor)
- On manual save (Ctrl+S)

**Behavior:**
1. Capture current document content (HTML)
2. Send PUT request to `/api/requirements-documents/[docId]`
3. If successful: update updated_at timestamp, show brief "Saved" indicator
4. If failed: show error toast "Failed to save"
5. No explicit "Save" button needed (implicit save)

**Save Indicator:**
- "Saving..." text appears briefly during request
- "Saved at 12:34" appears after success
- Error message appears on failure
- All indicators fade out after 3 seconds

### Document Outline (Table of Contents)

**Feature:**
- Parse all H1, H2, H3 headings from editor content
- Display as collapsible panel (right side or toggle)
- Click heading to jump to that section in editor

**Outline Structure:**
```
H1 Feature Title
  ├─ H2 Overview
  ├─ H2 User Story
  ├─ H2 Requirements
  │   └─ H3 Functional Requirements
  │   └─ H3 Non-Functional Requirements
  └─ H2 Acceptance Criteria
```

**Styling:**
- Monospace font for outline
- Indentation reflects hierarchy
- Active section (scrolled into view) highlighted
- Smooth scroll to heading on click

### Word Count & Reading Time

**Display (bottom of editor):**
- "Word count: X words"
- "Reading time: Y minutes" (estimate: 200 words/min)
- Update live as user types

### Collaborative Awareness (Optional, Phase 034+)

For now, single-user editing. Multi-user collaboration deferred to later phase.

**Future:**
- Show who is editing (name/avatar)
- Conflict resolution (last-writer-wins)
- Real-time updates via Supabase Realtime

## Database Schema
Uses Phase 026 schema. No new tables.

**Columns used:**
- `requirements_documents.content` (TEXT): stored as HTML
- `requirements_documents.updated_at` (TIMESTAMP): auto-update on save

## API Routes

### PUT /api/requirements-documents/[docId]
Update a requirements document with new content.

**Body:**
```json
{
  "title": "Email Verification - Feature Requirement",
  "content": "<h1>Email Verification...</h1><p>Content here...</p>"
}
```

**Response (200 OK):**
```json
{
  "id": "frd-123",
  "project_id": "project-xyz",
  "feature_node_id": "feature-1",
  "doc_type": "feature_requirement",
  "title": "Email Verification - Feature Requirement",
  "content": "<h1>Email Verification...</h1>...",
  "updated_at": "2025-02-20T12:05:30Z"
}
```

**Error Responses:**
- 400 Bad Request: Title or content too long
- 404 Not Found: Document not found
- 409 Conflict: Document was modified (for optimistic lock, if implemented)

**Logic:**
1. Validate content length (max 50,000 characters)
2. Sanitize HTML to prevent XSS (allow safe tags: p, h1-h6, strong, em, u, ul, ol, li, code, pre, blockquote, a)
3. UPDATE requirements_documents SET title = ?, content = ?, updated_at = NOW() WHERE id = ?
4. If significant changes, create version entry (Phase 043)
5. Invalidate cache
6. Return updated document

### GET /api/requirements-documents/[docId]/outline
Extract document outline (headings).

**Response (200 OK):**
```json
{
  "headings": [
    {
      "id": "heading-1",
      "level": 1,
      "text": "Email Verification - Feature Requirement",
      "offset": 0
    },
    {
      "id": "heading-2",
      "level": 2,
      "text": "Overview",
      "offset": 125
    },
    {
      "id": "heading-3",
      "level": 2,
      "text": "User Story",
      "offset": 250
    }
  ]
}
```

**Logic:**
1. Parse HTML content
2. Extract all h1, h2, h3 tags
3. Generate unique IDs for each heading
4. Return list with level, text, and character offset

## UI Components

### RequirementsEditor Component
**Path:** `/components/PatternShop/RequirementsEditor.tsx`

Main editor container with toolbar, editor, outline, and metadata.

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';

interface RequirementsEditorProps {
  document: RequirementsDocument;
  onSave: (content: string) => Promise<void>;
  readOnly?: boolean;
}

export default function RequirementsEditor({
  document,
  onSave,
  readOnly = false,
}: RequirementsEditorProps) {
  const [saveIndicator, setSaveIndicator] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [wordCount, setWordCount] = useState(0);
  const [outline, setOutline] = useState<Heading[]>([]);
  const [showOutline, setShowOutline] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Underline,
    ],
    content: document.content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(text.split(/\s+/).length);

      // Extract outline
      const html = editor.getHTML();
      const headings = extractHeadings(html);
      setOutline(headings);

      // Auto-save (debounced)
      debouncedSave(editor.getHTML());
    },
  });

  const debouncedSave = useMemo(
    () => debounce(async (html: string) => {
      setSaveIndicator('saving');
      try {
        await onSave(html);
        setSaveIndicator('saved');
        setTimeout(() => setSaveIndicator('idle'), 3000);
      } catch {
        setSaveIndicator('error');
        setTimeout(() => setSaveIndicator('idle'), 5000);
      }
    }, 2000),
    [onSave]
  );

  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="flex h-full gap-4 p-6 bg-white">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <EditorToolbar editor={editor} readOnly={readOnly} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded p-4 my-4">
          <EditorContent editor={editor} className="prose prose-sm max-w-none" />
        </div>

        {/* Metadata */}
        <div className="flex justify-between text-sm text-gray-600 border-t pt-2">
          <span>Word count: {wordCount}</span>
          <span>Reading time: {readingTime} min</span>
          <span className={`${saveIndicator === 'error' ? 'text-red-600' : ''}`}>
            {saveIndicator === 'saving' && 'Saving...'}
            {saveIndicator === 'saved' && 'Saved'}
            {saveIndicator === 'error' && 'Failed to save'}
          </span>
        </div>
      </div>

      {/* Outline Sidebar */}
      {showOutline && (
        <div className="w-64 border-l border-gray-200 pl-4 overflow-y-auto">
          <DocumentOutline headings={outline} />
        </div>
      )}
    </div>
  );
}
```

### EditorToolbar Component
**Path:** `/components/PatternShop/EditorToolbar.tsx`

Formatting buttons and controls.

```typescript
interface EditorToolbarProps {
  editor: Editor | null;
  readOnly?: boolean;
}

export default function EditorToolbar({ editor, readOnly }: EditorToolbarProps) {
  if (!editor || readOnly) return null;

  return (
    <div className="flex gap-1 p-2 bg-gray-50 border border-gray-200 rounded">
      {/* Text Styles */}
      <ToolbarButton
        icon={<Bold size={18} />}
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        tooltip="Bold (Ctrl+B)"
      />
      <ToolbarButton
        icon={<Italic size={18} />}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        tooltip="Italic (Ctrl+I)"
      />
      <ToolbarButton
        icon={<Underline size={18} />}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        tooltip="Underline (Ctrl+U)"
      />

      <Divider />

      {/* Headings */}
      <ToolbarButton
        icon={<Heading1 size={18} />}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        tooltip="Heading 1"
      />
      <ToolbarButton
        icon={<Heading2 size={18} />}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        tooltip="Heading 2"
      />
      <ToolbarButton
        icon={<Heading3 size={18} />}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        tooltip="Heading 3"
      />

      <Divider />

      {/* Lists */}
      <ToolbarButton
        icon={<List size={18} />}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        tooltip="Bullet List"
      />
      <ToolbarButton
        icon={<ListOrdered size={18} />}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        tooltip="Ordered List"
      />

      <Divider />

      {/* Code & Blockquote */}
      <ToolbarButton
        icon={<Code size={18} />}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        tooltip="Code Block"
      />
      <ToolbarButton
        icon={<Quote size={18} />}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        tooltip="Blockquote"
      />

      <Divider />

      {/* Link */}
      <ToolbarButton
        icon={<Link size={18} />}
        onClick={() => {
          const url = prompt('Enter URL:');
          if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
        }}
        isActive={editor.isActive('link')}
        tooltip="Insert Link (Ctrl+K)"
      />

      <Divider />

      {/* Undo/Redo */}
      <ToolbarButton
        icon={<Undo size={18} />}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        tooltip="Undo"
      />
      <ToolbarButton
        icon={<Redo size={18} />}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        tooltip="Redo"
      />
    </div>
  );
}
```

### DocumentOutline Component
**Path:** `/components/PatternShop/DocumentOutline.tsx`

Navigable table of contents.

```typescript
interface DocumentOutlineProps {
  headings: Heading[];
}

export default function DocumentOutline({ headings }: DocumentOutlineProps) {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  return (
    <nav className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Contents</h3>
      {headings.map((heading) => (
        <button
          key={heading.id}
          onClick={() => {
            // Scroll to heading
            const element = document.getElementById(heading.id);
            element?.scrollIntoView({ behavior: 'smooth' });
            setActiveHeadingId(heading.id);
          }}
          className={`
            text-sm text-left w-full px-2 py-1 rounded
            ${activeHeadingId === heading.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
          `}
          style={{ paddingLeft: `${12 + (heading.level - 1) * 12}px` }}
        >
          {heading.text}
        </button>
      ))}
    </nav>
  );
}
```

## File Structure
```
components/PatternShop/
  RequirementsEditor.tsx      (main editor)
  EditorToolbar.tsx           (formatting toolbar)
  DocumentOutline.tsx         (table of contents)
  ToolbarButton.tsx           (reusable button)

lib/
  editor/
    extractHeadings.ts        (parse headings from HTML)
    sanitizeHtml.ts           (XSS prevention)
  api/
    requirementsDocuments.ts  (API client)
```

## Acceptance Criteria
- [ ] Rich text editor renders with TipTap
- [ ] All toolbar buttons work (bold, italic, headings, lists, code, blockquote, link)
- [ ] Keyboard shortcuts work (Ctrl+B for bold, etc.)
- [ ] Content auto-saves after 2 seconds of inactivity
- [ ] Save indicator shows "Saving...", "Saved", or error
- [ ] Word count updates live
- [ ] Reading time calculated correctly (200 words/min)
- [ ] Document outline extracts all H1-H3 headings
- [ ] Clicking outline heading jumps to that section
- [ ] Link insertion works (with URL prompt)
- [ ] Undo/Redo buttons work
- [ ] Read-only mode disables editing (for viewers)
- [ ] HTML sanitization prevents XSS

## Testing Instructions

1. **Test toolbar:**
   - Click Bold button, type text
   - Verify text is bold
   - Repeat for Italic, Underline, Headings

2. **Test keyboard shortcuts:**
   - Ctrl+B to toggle bold
   - Ctrl+I to toggle italic
   - Verify work

3. **Test auto-save:**
   - Edit document
   - Wait 2 seconds
   - Check API request was sent (Network tab)
   - Refresh page
   - Verify edits persisted

4. **Test word count:**
   - Add 100 words
   - Verify word count shows 100
   - Remove 50 words
   - Verify count updates to 50

5. **Test outline:**
   - Add H1, H2, H3 headings
   - Click in outline
   - Verify editor scrolls to that heading

6. **Test read-only mode:**
   - Fetch FRD as viewer (read-only)
   - Verify toolbar is hidden
   - Verify content cannot be edited

7. **Test link insertion:**
   - Click Link button
   - Enter URL
   - Verify link is created and clickable

## Dependencies
- Phase 026: Database schema
- Phase 027: Pattern Shop layout
- Phase 028: Product Overview
- Phase 033: Feature Requirements Document
