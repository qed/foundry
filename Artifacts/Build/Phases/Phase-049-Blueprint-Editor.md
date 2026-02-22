# Phase 049 - Blueprint Rich Text Editor

**Objective:** Implement a TipTap-based rich text editor with extended features for blueprint content, including code blocks, Mermaid diagrams, and document outline.

**Prerequisites:**
- Phase 047 (Control Room layout)
- Phase 048 (Foundation blueprints to test with)
- TipTap library and dependencies installed

**Context:**
The blueprint editor is the core interface for writing technical documentation. It extends the Pattern Shop's TipTap editor with additional capabilities needed for blueprints: syntax-highlighted code blocks, inline Mermaid diagram rendering, and table support. The editor includes auto-save functionality with debouncing and a document outline sidebar for navigation within long blueprints.

**Detailed Requirements:**

1. **TipTap Editor Configuration**
   - Base extensions:
     - Paragraph
     - Heading (levels 1-3)
     - BulletList
     - OrderedList
     - BlockQuote
     - CodeBlock (with syntax highlighting via Prism.js)
     - Code (inline code)
     - Bold
     - Italic
     - Underline
     - Link
     - HorizontalRule
     - Table (with headers, rows, cells)
     - TaskList (if needed)
   - Additional extensions for blueprints:
     - Custom **Mermaid block** extension (render diagrams inline)
     - Custom **Code fence with language selector** (show language in block)

2. **Toolbar**
   - Formatting buttons: Bold, Italic, Underline
   - Block buttons: H1, H2, H3, Paragraph
   - List buttons: Bullet List, Numbered List
   - Table button: Insert Table (prompt for rows/cols)
   - Code block button: Insert Code Block (dropdown for language)
   - Mermaid button: Insert Mermaid Diagram (prompt for type)
   - Link button: Add Link (dialog)
   - Clear formatting button: Remove All Formatting
   - Undo/Redo buttons

3. **Code Block Enhancement**
   - Language selector dropdown (JavaScript, TypeScript, SQL, JSON, Python, Bash, etc.)
   - Syntax highlighting via Prism.js
   - Copy code button (top-right of block)
   - Line numbers (optional)
   - Dark theme for code blocks

4. **Mermaid Diagram Block**
   - Custom ProseMirror node for Mermaid content
   - When user clicks "Mermaid" button:
     - Prompt: select diagram type (flowchart, sequence, ER diagram, class diagram)
     - Insert new block with template code for selected type
   - Block displays:
     - Left side: code editor (monospace text, no syntax highlighting)
     - Right side: live preview of diagram (rendered by mermaid.js)
     - Rendered diagram updates in real-time as user types (with debounce 300ms)
   - Resize handle between code and preview (draggable)
   - Zoom/pan controls on preview: zoom in/out buttons, pan drag
   - Export button (SVG, PNG options)

5. **Document Outline Sidebar**
   - Collapsible panel on right edge of editor (or separate sidebar)
   - Auto-generated from heading structure (H1, H2, H3)
   - Hierarchical list of headings
   - Click heading → scroll editor to that heading
   - Smooth scroll behavior
   - Updates in real-time as content changes
   - Collapse/expand all headings button

6. **Table Support**
   - Insert Table dialog: prompt for number of rows and columns
   - Controls: add row, delete row, add column, delete column (context menu on table)
   - Cell editing: click to edit cell content
   - Header row option: toggle first row as header (th cells)

7. **Auto-Save**
   - Debounced save: wait 500ms after last keystroke before saving
   - Save endpoint: `PATCH /api/projects/[projectId]/blueprints/[blueprintId]`
   - Save indicator: subtle text "Saving..." during request, "Saved" on success
   - Error handling: toast notification if save fails, disable save on persistent failure
   - Show unsaved changes indicator: small dot next to title if changes exist
   - Prevent navigation if unsaved changes (browser beforeunload event)

8. **Content Validation**
   - Minimum length: 10 characters
   - Required: content cannot be empty
   - On blur or save: validate
   - Display error message inline if validation fails
   - Prevent save if validation fails

9. **User Experience**
   - Placeholder text: "Start typing your blueprint..."
   - Focus state: subtle border highlight
   - Cursor position preserved when switching between elements
   - Keyboard shortcuts:
     - Ctrl+B: Bold
     - Ctrl+I: Italic
     - Ctrl+Z: Undo
     - Ctrl+Y: Redo
     - Ctrl+S: Explicit save (if auto-save disabled)
     - Ctrl+K: Insert link

10. **Editor State Management**
    - Store editor HTML/JSON in component state
    - Sync with database via auto-save
    - Handle optimistic updates: show changes immediately, roll back if save fails
    - Conflict handling: if server has newer version, show merge dialog

11. **Accessibility**
    - Toolbar buttons have aria-labels
    - Editor has role="textbox" and aria-label
    - Keyboard navigation of toolbar (Tab/Arrow keys)
    - Focus visible on all interactive elements
    - WCAG AA compliant

12. **Mermaid-Specific Features**
    - Supported diagram types:
      - **Flowchart** (graph TD/LR syntax)
      - **Sequence Diagram** (actor, message sequences)
      - **Entity-Relationship Diagram** (database schema visualization)
      - **Class Diagram** (object-oriented design)
    - Template examples pre-filled for each type
    - Error display: if diagram has syntax error, show error message on preview area
    - Diagram styling: use consistent colors matching app theme

**API Routes**
```
PATCH /api/projects/[projectId]/blueprints/[blueprintId]
  Body: { content } (HTML or JSON format)
  Returns: { updated_at, version_number, status }

GET /api/mermaid/validate
  Query: { diagram_code }
  Returns: { valid: boolean, error?: string }
```

**UI Components**
- `BlueprintEditor` (main editor wrapper)
- `BlueprintEditorToolbar` (toolbar with formatting buttons)
- `MermaidBlock` (custom ProseMirror node component)
- `MermaidDiagramPreview` (renders Mermaid diagram)
- `DocumentOutline` (collapsible sidebar showing headings)
- `CodeBlockLanguageSelector` (dropdown for language)
- `TableInsertDialog` (modal for table creation)
- `MermaidTypeSelector` (modal to choose diagram type)
- `SaveIndicator` (shows saving/saved state)
- `UnsavedChangesIndicator` (dot icon next to title)

**File Structure**
```
app/
  components/
    room/
      BlueprintEditor.tsx (main editor component)
      BlueprintEditorToolbar.tsx
      DocumentOutline.tsx
      DocumentOutlineItem.tsx
  components/
    editor/
      MermaidBlock.tsx (Mermaid diagram block)
      MermaidDiagramPreview.tsx (live preview)
      MermaidTypeSelector.tsx (dialog)
      CodeBlockLanguageSelector.tsx
      TableInsertDialog.tsx
      SaveIndicator.tsx
      UnsavedChangesIndicator.tsx
  lib/
    editor/
      tiptap-extensions.ts (custom Mermaid extension, etc.)
      editor-config.ts (toolbar items, extensions list)
  lib/
    hooks/
      useBlueprint.ts (blueprint state, auto-save logic)
      useDocumentOutline.ts (extract headings from content)
```

**Acceptance Criteria**
- [ ] TipTap editor renders with toolbar
- [ ] Bold, Italic, Underline buttons toggle formatting
- [ ] Heading buttons (H1, H2, H3) create heading blocks
- [ ] Bullet and numbered lists create list items
- [ ] Code block button inserts code block with language selector
- [ ] Syntax highlighting works in code blocks (Prism.js)
- [ ] Copy button copies code block content to clipboard
- [ ] Mermaid button opens type selector and inserts diagram block
- [ ] Mermaid blocks display code editor and live preview side-by-side
- [ ] Mermaid preview updates in real-time as code typed (with debounce)
- [ ] Zoom in/out buttons work on Mermaid preview
- [ ] Pan/drag works on Mermaid preview
- [ ] Mermaid export (SVG/PNG) functionality works
- [ ] Document outline sidebar shows heading hierarchy
- [ ] Clicking outline heading scrolls editor to that heading
- [ ] Table insert dialog creates table with specified rows/cols
- [ ] Add/delete row/column options appear in context menu on tables
- [ ] Auto-save triggers after 500ms inactivity
- [ ] Save indicator shows "Saving..." and "Saved" states
- [ ] Unsaved changes dot appears next to title when dirty
- [ ] Content validation prevents saving empty blueprints
- [ ] Keyboard shortcuts work (Ctrl+B, Ctrl+I, Ctrl+Z, Ctrl+K)
- [ ] Toolbar buttons have aria-labels
- [ ] Editor focus visible with keyboard navigation
- [ ] Error messages show for Mermaid syntax errors
- [ ] Browser beforeunload prevents navigation with unsaved changes
- [ ] Placeholder text displays in empty editor

**Testing Instructions**
1. Open Control Room and create a new foundation blueprint
2. Verify TipTap editor renders in center panel with toolbar visible
3. Type text and verify placeholder disappears
4. Click H2 button and verify heading formatting applied
5. Select text and click Bold button, verify text becomes bold
6. Create bullet list: click Bullet List button, type items
7. Insert code block: click Code Block button, select "TypeScript" language
8. Paste TypeScript code and verify syntax highlighting
9. Click Copy button on code block, verify code copied to clipboard
10. Click Mermaid button, select "Flowchart" diagram type
11. Verify Mermaid block renders with code on left, preview on right
12. Edit Mermaid code and verify preview updates in real-time
13. Test Mermaid zoom in/out buttons
14. Create heading structure (H1, H2, H3) and verify Document Outline updates
15. Click heading in outline, verify editor scrolls to that heading
16. Insert table and verify table appears with correct structure
17. Right-click table and verify add/delete row/column options
18. Edit blueprint content and wait 500ms, verify auto-save completes
19. Verify "Saved" indicator appears briefly
20. Navigate away from blueprint, verify no beforeunload warning (changes saved)
21. Make changes and immediately navigate away, verify beforeunload blocks navigation
22. Test validation: remove all content, verify save fails with error
23. Test keyboard shortcut Ctrl+B to bold text
24. Test keyboard shortcut Ctrl+K to add link (opens link dialog)
25. Verify accessibility: navigate toolbar with Tab key, all buttons have aria-labels
