# Phase 050 - System Diagram Blueprints

**Objective:** Implement creation and editing of system diagram blueprints using Mermaid for architecture visualization.

**Prerequisites:**
- Phase 046 (Database schema)
- Phase 047 (Control Room layout)
- Phase 049 (Blueprint editor with Mermaid support)

**Context:**
System Diagram blueprints are technical diagrams that visualize system architecture and relationships. They use Mermaid diagram syntax and support multiple diagram types: flowchart, sequence, ER diagram, and class diagram. System diagrams are project-owned (not linked to specific features) and serve as reference documentation for understanding the overall system structure.

**Detailed Requirements:**

1. **System Diagram Blueprint Type**
   - Field: `blueprint_type` = 'system_diagram'
   - Field: `feature_node_id` = NULL
   - Field: `content` = Mermaid diagram code (plain text)
   - Multiple diagrams per project allowed
   - Typical count per project: 3-8 (high-level architecture, data flow, deployment, etc.)

2. **Create System Diagram**
   - Trigger: User clicks "New System Diagram" button in left panel
   - Modal/form:
     - Title input (required, e.g., "High-Level Architecture", "Data Flow Diagram")
     - Diagram type selector (required):
       - Flowchart (default)
       - Sequence Diagram
       - ER Diagram
       - Class Diagram
     - Template picker (optional):
       - System templates for each diagram type
       - Custom org templates
     - "Create" button saves and opens in editor
   - On creation:
     - Save to `blueprints` table with status='draft'
     - Populate content with template code for selected diagram type
     - Insert into `blueprint_versions` table (version 1)
     - Open in editor with split view

3. **System Diagram Editor**
   - Split-view layout:
     - Left side (50%): Code editor (monospace font)
       - Editable Mermaid diagram code
       - Line numbers
       - Syntax highlighting (light Mermaid-specific)
     - Right side (50%): Live preview
       - Rendered diagram using mermaid.js library
       - Zoom/pan controls (zoom in, zoom out, fit to viewport, reset)
       - Pan by dragging on diagram
     - Resize handle between left and right (draggable to resize)
     - Toggle full-screen view for diagram preview
   - Auto-save on code changes (500ms debounce)
   - Error handling: if Mermaid code has syntax error, show error message on right panel
   - Diagram export: buttons for SVG and PNG download

4. **Supported Mermaid Diagram Types**

   **Flowchart** (graph TD/LR syntax)
   - Default template:
     ```
     graph TD
         A["User Request"] --> B["API Gateway"]
         B --> C["Backend Service"]
         C --> D["Database"]
         D --> E["Response"]
         E --> A
     ```
   - Supports: TD (top-down), LR (left-right), TB, RL, BT layouts
   - Layout selector in toolbar

   **Sequence Diagram** (participant, message syntax)
   - Default template:
     ```
     sequenceDiagram
         participant Client
         participant Server
         participant DB
         Client->>Server: Request
         Server->>DB: Query
         DB->>Server: Result
         Server->>Client: Response
     ```
   - Supports: message types (->>, ->>), notes, alt/loop blocks

   **ER Diagram** (database schema visualization)
   - Default template:
     ```
     erDiagram
         USERS ||--o{ PROJECTS : owns
         PROJECTS ||--o{ FEATURES : contains
         USERS {
             string email
             string name
         }
     ```
   - Shows tables, relationships, columns

   **Class Diagram** (OOP structure)
   - Default template:
     ```
     classDiagram
         class Animal {
             -String name
             +void makeSound()
         }
         class Dog {
             +void bark()
         }
         Animal <|-- Dog
     ```

5. **Diagram Preview Features**
   - Live rendering updates as code changes (500ms debounce)
   - Error message display: "Syntax Error: [line number] - [error description]"
   - Zoom controls:
     - Zoom in (+ button)
     - Zoom out (- button)
     - Fit to viewport (fit button, scales diagram to fit preview area)
     - Reset zoom (reset button, returns to 100%)
   - Pan: click and drag on diagram to pan around
   - Full-screen button: expand preview to full width temporarily
   - Export buttons:
     - Download SVG (uses mermaid.render)
     - Download PNG (uses html2canvas or similar)

6. **Code Editor Features**
   - Syntax highlighting for Mermaid code (simple color coding)
   - Line numbers and line selection
   - Monospace font (Monaco or equivalent)
   - Undo/redo in code editor
   - Copy button to copy all code
   - Paste button to paste from clipboard

7. **Diagram Type Switching**
   - Dropdown selector or buttons for diagram type
   - Changing type shows warning: "This will replace your current diagram. Continue?"
   - On confirm: replace content with template for new diagram type
   - Undo available

8. **System Diagram Metadata**
   - Title editable inline in header
   - Status dropdown
   - Created by and updated metadata in header
   - Comments support (Phase 060)

9. **System Diagram in List**
   - Left panel shows system diagrams in collapsible section
   - List item shows:
     - Diagram icon (flow/sequence/database/class icon based on type)
     - Title
     - Status badge
     - Hover: duplicate, delete buttons
   - Quick preview: hover over item shows small thumbnail of diagram (optional)

10. **Search & Filter**
    - Search finds system diagrams by title
    - Can filter by status
    - System Diagrams tab in filter bar

11. **Keyboard Shortcuts** (in code editor)
    - Ctrl+Z: Undo
    - Ctrl+Y: Redo
    - Ctrl+A: Select all
    - Ctrl+C: Copy
    - Ctrl+V: Paste
    - Tab: Indent (or insert tab)
    - Shift+Tab: Outdent

12. **Data Validation**
    - Title: required, 1-255 characters
    - Content: valid Mermaid syntax (validated by Mermaid.js)
    - Diagram type: one of flowchart, sequence, er, class
    - Prevents save if Mermaid syntax error
    - Shows error message on preview with line number

**API Routes**
```
POST /api/projects/[projectId]/blueprints
  Body: { blueprint_type: 'system_diagram', title, content, diagram_type }
  Returns: { id, created_at, ... }

GET /api/projects/[projectId]/blueprints?type=system_diagram
  Returns: { blueprints: [...] }

PATCH /api/projects/[projectId]/blueprints/[blueprintId]
  Body: { title?, content? }
  Returns: updated blueprint

POST /api/projects/[projectId]/blueprints/[blueprintId]/duplicate
  Returns: { id, title, ... }

GET /api/mermaid/validate
  Query: { diagram_code, diagram_type }
  Returns: { valid: boolean, error?: string, line?: number }

POST /api/mermaid/export
  Body: { diagram_code, format: 'svg' | 'png' }
  Returns: binary file or data URL
```

**UI Components**
- `CreateSystemDiagramModal` (modal for creation)
- `SystemDiagramEditor` (split-view editor)
- `MermaidCodeEditor` (left side, code input)
- `MermaidPreview` (right side, rendered diagram)
- `DiagramTypeSelector` (dropdown/buttons)
- `ZoomControls` (zoom in/out/fit/reset buttons)
- `SystemDiagramSection` (collapsible section in sidebar)
- `SystemDiagramItem` (list item with actions)
- `DiagramExportButtons` (SVG, PNG download)
- `MermaidErrorMessage` (error display)

**File Structure**
```
app/
  api/
    projects/
      [projectId]/
        blueprints/
          route.ts (POST create, GET list)
          [blueprintId]/
            route.ts (PATCH update)
            duplicate/
              route.ts (POST duplicate)
    mermaid/
      validate/
        route.ts (POST validate diagram)
      export/
        route.ts (POST export diagram to SVG/PNG)
  components/
    room/
      diagrams/
        CreateSystemDiagramModal.tsx
        SystemDiagramEditor.tsx
        SystemDiagramSection.tsx
        SystemDiagramItem.tsx
  components/
    editor/
      MermaidCodeEditor.tsx
      MermaidPreview.tsx
      DiagramTypeSelector.tsx
      ZoomControls.tsx
      DiagramExportButtons.tsx
      MermaidErrorMessage.tsx
  lib/
    mermaid/
      templates.ts (diagram type templates)
      validator.ts (Mermaid syntax validation)
      exporter.ts (export to SVG/PNG)
```

**Acceptance Criteria**
- [ ] "New System Diagram" button opens modal with title, diagram type, and template picker
- [ ] Creating system diagram saves to database and shows in sidebar
- [ ] Split-view editor displays: code left, preview right
- [ ] Code editor is editable with syntax highlighting and line numbers
- [ ] Preview updates in real-time as code changes (with 500ms debounce)
- [ ] Zoom in/out buttons work on preview
- [ ] Fit to viewport button scales diagram appropriately
- [ ] Pan functionality works by dragging on preview
- [ ] Mermaid syntax errors display with line number on preview
- [ ] Export buttons download diagram as SVG and PNG
- [ ] Diagram type selector allows switching types with confirmation
- [ ] Auto-save works after code changes
- [ ] Title field editable inline with auto-save
- [ ] Status dropdown allows status transitions
- [ ] Duplicate button creates copy with "(Copy)" suffix
- [ ] System diagram section appears in left panel with diagram type icons
- [ ] Filter/search finds system diagrams by title
- [ ] All four diagram types (flowchart, sequence, ER, class) render correctly
- [ ] Keyboard shortcuts work in code editor (Ctrl+Z, Ctrl+Y, etc.)
- [ ] Full-screen preview button expands diagram
- [ ] Undo/redo work in code editor
- [ ] Copy button copies diagram code
- [ ] Tooltips appear on all control buttons

**Testing Instructions**
1. Navigate to Control Room and click "New System Diagram" button
2. Verify modal opens with title input, diagram type selector, template picker
3. Enter title "Data Flow Diagram" and select diagram type "Flowchart"
4. Click Create and verify system diagram opens in split-view editor
5. Verify code editor on left shows Mermaid template code
6. Verify preview on right shows rendered flowchart diagram
7. Edit code in code editor (change a label) and verify preview updates in real-time
8. Click zoom in button and verify diagram zooms in on preview
9. Click fit to viewport and verify diagram scales to fit preview area
10. Test pan: drag on diagram and verify it pans around
11. Export diagram as SVG and verify file downloads
12. Click diagram type selector and change to "Sequence Diagram"
13. Verify confirmation dialog appears, click confirm
14. Verify diagram content replaced with sequence diagram template
15. Enter invalid Mermaid syntax and verify error message shows on preview with line number
16. Fix syntax and verify diagram re-renders successfully
17. Click title and edit inline, verify auto-saves
18. Change status from Draft to In Review
19. Hover over diagram item in left panel, verify duplicate button appears
20. Click duplicate and verify copy created with "(Copy)" suffix
21. Create "ER Diagram" type and verify database schema renders correctly
22. Create "Class Diagram" type and verify OOP structure renders correctly
23. Search for diagram by title and verify it appears in results
24. Test Ctrl+Z in code editor to undo changes
25. Test Ctrl+C to copy diagram code
26. Verify full-screen button expands preview temporarily
