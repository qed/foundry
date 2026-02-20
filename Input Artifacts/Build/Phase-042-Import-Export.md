# Phase 042 - Requirements Import/Export

## Objective
Enable teams to import requirements documents from external files and export feature trees and FRDs in multiple formats (Markdown, PDF, JSON) for sharing and integration with external tools.

## Prerequisites
- Feature Requirements Document (Phase 033)
- Requirements Document Editor (Phase 034)
- Feature Tree (Phase 029)
- File handling and storage (Supabase Storage or S3)

## Context
Teams often need to share requirements externally (with stakeholders, other teams, documentation systems). Import/export capabilities enable integration with Markdown documentation, PDF presentations, and JSON for programmatic use.

## Detailed Requirements

### Import FRD

**Trigger:**
- Upload button in center panel toolbar or document list
- Drag-drop markdown file to editor

**Supported Formats:**
- `.md` (Markdown): Most common for requirements
- `.txt` (Plain text): Convert to basic HTML/text
- `.pdf` (PDF): Extract text (optional, advanced)

**Import Process:**
1. User selects file
2. File uploaded to Supabase Storage (or temporary location)
3. Content extracted and converted to HTML
4. New requirements document created with uploaded content
5. Show dialog: "Import as..."
   - Doc Type: Feature Requirement, Technical Requirement, Product Overview
   - Title: Auto-filled from filename or H1 heading
   - Feature Node: (optional) Link to feature if importing as FRD
5. On confirm, create requirements_documents row
6. Show success toast: "Imported {title}"

**Content Conversion:**
- Markdown → HTML via markdown-to-html library
- Preserve structure (headings, lists, code blocks)
- Sanitize HTML to prevent XSS

### Export Single FRD

**Trigger:**
- Download button in center panel toolbar (when FRD selected)
- Right-click context menu on FRD node

**Export Formats:**

1. **Markdown (.md):**
   - Convert HTML back to Markdown (html-to-markdown)
   - Preserve formatting
   - File name: "{node_title}.md"
   - Example: "Email Sign-up.md"

2. **PDF (.pdf):**
   - Render document with styling
   - Use puppeteer or pdfkit to generate PDF
   - Include metadata (title, date, author)
   - File name: "{node_title}.pdf"

3. **HTML (.html):**
   - Export as standalone HTML file
   - Include minimal styling (Tailwind CSS)
   - Self-contained (no external dependencies)

**Dialog:**
```
Export Document
Document: Email Sign-up - Feature Requirement

Format:
[•] Markdown (.md)
[ ] PDF (.pdf)
[ ] HTML (.html)

[Cancel] [Export]
```

### Export All FRDs

**Trigger:**
- "Export All" button in left panel or toolbar
- Export entire tree's requirements

**Options:**

1. **Concatenated Markdown:**
   - One file with all FRDs in tree order (Epics, then Features, etc.)
   - Each FRD as section (H2)
   - Include table of contents
   - File name: "{project_name}_requirements.md"

2. **Zip Archive:**
   - One file per FRD in folder structure (mirroring tree)
   - Folder: Epics/, Epics/{EpicName}/Features/, etc.
   - File name: "{project_name}_requirements.zip"

3. **PDF (Concatenated):**
   - All FRDs in one PDF
   - Table of contents
   - Page breaks between sections
   - File name: "{project_name}_requirements.pdf"

### Export Feature Tree

**Trigger:**
- Export button in Pattern Shop (near tree)
- Right-click context menu

**Export Formats:**

1. **JSON:**
   ```json
   {
     "project": {
       "id": "project-xyz",
       "name": "E-commerce Platform",
       "description": "..."
     },
     "tree": {
       "nodes": [
         {
           "id": "epic-1",
           "title": "User Authentication",
           "level": "epic",
           "status": "in_progress",
           "children": [
             {
               "id": "feature-1",
               "title": "Email Sign-up",
               "level": "feature",
               "status": "complete",
               "children": []
             }
           ]
         }
       ],
       "metadata": {
         "totalNodes": 12,
         "exportedAt": "2025-02-20T12:00:00Z",
         "exportedBy": "user@example.com"
       }
     }
   }
   ```

2. **Markdown (Tree Structure):**
   - Visual representation of tree
   - Use indentation and symbols
   - Include status emojis (✅ ⏳ ❌)
   ```markdown
   # Feature Tree: E-commerce Platform

   - 📂 User Authentication (Epic, ⏳ In Progress)
     - 🧩 Email Sign-up (Feature, ✅ Complete)
     - 🧩 Login (Feature, ⏳ In Progress)
   ```

3. **CSV:**
   - Rows: Node ID, Title, Level, Status, Parent ID, Position
   - For import into spreadsheets or other tools

**Dialog:**
```
Export Feature Tree
Project: E-commerce Platform

Format:
[•] JSON (.json)
[ ] Markdown (.md)
[ ] CSV (.csv)

Include:
[✓] All nodes
[✓] Status information
[ ] Full descriptions (for JSON)

[Cancel] [Export]
```

### Import Feature Tree

**Trigger:**
- Upload button next to tree (Phase 030)
- "Import Tree" command in agent

**Supported Formats:**
- JSON (from previous export)
- CSV with structure (parent ID, etc.)

**Import Process:**
1. Parse JSON or CSV
2. Validate structure (level progression, parent references)
3. Show preview of nodes to create
4. Allow edit of titles before import (optional)
5. Batch-create nodes (Phase 038 bulk-create)

## Database Schema
No new tables. Uses Phase 026, 033 schema.

## API Routes

### POST /api/projects/[projectId]/requirements-documents/import
Import a requirements document from file.

**Body (multipart/form-data):**
```
file: <binary>
docType: 'feature_requirement' | 'technical_requirement' | 'product_overview'
title: 'Imported Document'
featureNodeId: 'feature-1' (optional)
```

**Response (201 Created):**
```json
{
  "id": "frd-uuid",
  "title": "Imported Document",
  "doc_type": "feature_requirement",
  "feature_node_id": "feature-1",
  "content": "<h1>Imported Document</h1>...",
  "created_at": "2025-02-20T12:00:00Z"
}
```

### GET /api/projects/[projectId]/requirements-documents/[docId]/export
Export a requirements document.

**Query Parameters:**
- `format` ('markdown', 'pdf', 'html'): Export format
- `includeMetadata` (boolean): Include document metadata

**Response:**
- Streams file content with appropriate Content-Type
- Sets Content-Disposition header for download
- File name: {title}.{ext}

### POST /api/projects/[projectId]/feature-nodes/export
Export feature tree.

**Query Parameters:**
- `format` ('json', 'markdown', 'csv'): Export format
- `includeDescriptions` (boolean): For JSON, include full descriptions

**Response:**
- Streams file content
- Sets Content-Disposition header

### POST /api/projects/[projectId]/requirements-documents/export-all
Export all FRDs.

**Query Parameters:**
- `format` ('markdown', 'pdf', 'zip'): Export format

**Response:**
- Streams file (single file or zip)

### POST /api/projects/[projectId]/feature-nodes/import
Import feature tree from file.

**Body (multipart/form-data):**
```
file: <binary>
format: 'json' | 'csv'
```

**Response (201 Created):**
```json
{
  "created": 5,
  "nodeIds": ["epic-1", "feature-1", ...],
  "preview": [
    {
      "id": "preview-epic-1",
      "title": "User Authentication",
      "level": "epic",
      "children": 3
    }
  ]
}
```

## UI Components

### ImportButton Component
**Path:** `/components/PatternShop/ImportButton.tsx`

Trigger for import (document or tree).

```typescript
interface ImportButtonProps {
  projectId: string;
  type: 'document' | 'tree';
  onImportSuccess: () => void;
}

export default function ImportButton({
  projectId,
  type,
  onImportSuccess,
}: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    // Show import dialog
    if (type === 'document') {
      showImportDocumentDialog(file, projectId, onImportSuccess);
    } else {
      showImportTreeDialog(file, projectId, onImportSuccess);
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
      >
        {type === 'document' ? 'Import Document' : 'Import Tree'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={type === 'document' ? '.md,.txt,.pdf' : '.json,.csv'}
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}
```

### ExportButton Component
**Path:** `/components/PatternShop/ExportButton.tsx`

Trigger for export (document, all, or tree).

```typescript
interface ExportButtonProps {
  projectId: string;
  type: 'document' | 'all' | 'tree';
  documentId?: string;
  onExport?: (format: string) => void;
}

export default function ExportButton({
  projectId,
  type,
  documentId,
  onExport,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('markdown');

  const handleExport = async () => {
    try {
      const blob = await exportContent(projectId, type, selectedFormat, documentId);
      downloadBlob(blob, getFileName(type, selectedFormat));
      setOpen(false);
      onExport?.(selectedFormat);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
      >
        Export
      </button>

      {open && (
        <ExportDialog
          type={type}
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          onExport={handleExport}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

### ExportDialog Component
**Path:** `/components/PatternShop/ExportDialog.tsx`

Dialog for selecting export options.

(Dialog component using Radix UI or Headless UI)

## File Structure
```
components/PatternShop/
  ImportButton.tsx            (import trigger)
  ExportButton.tsx            (export trigger)
  ExportDialog.tsx            (export options dialog)
  ImportPreviewDialog.tsx     (preview before import)

lib/
  export/
    markdown.ts               (convert to markdown)
    pdf.ts                    (generate PDF)
    json.ts                   (export as JSON)
    csv.ts                    (export as CSV)
  import/
    markdown.ts               (parse markdown)
    json.ts                   (parse JSON)
    csv.ts                    (parse CSV)

app/api/projects/[projectId]/
  requirements-documents/
    import/
      route.ts                (POST import)
    [docId]/
      export/
        route.ts              (GET export)
  feature-nodes/
    import/
      route.ts                (POST tree import)
    export/
      route.ts                (GET tree export)
```

## Acceptance Criteria
- [ ] Import document from .md file works
- [ ] Imported content preserves markdown formatting (H1-H3, lists, code blocks)
- [ ] Import dialog allows selecting doc type and feature node link
- [ ] Export single FRD as markdown works
- [ ] Export single FRD as PDF works (contains proper styling)
- [ ] Export single FRD as HTML works (self-contained)
- [ ] Export all FRDs as concatenated markdown works
- [ ] Export all FRDs as zip archive works (maintains tree structure)
- [ ] Export feature tree as JSON works (valid structure)
- [ ] Export feature tree as markdown works (visual representation)
- [ ] Export feature tree as CSV works (importable)
- [ ] Import feature tree from JSON works
- [ ] Import feature tree from CSV works
- [ ] Imported nodes appear in tree
- [ ] Downloaded files have correct names and extensions

## Testing Instructions

1. **Test import markdown:**
   - Create markdown file with requirements
   - Click Import Document
   - Select Feature Requirement, set title
   - Click Import
   - Verify FRD appears with formatted content

2. **Test export markdown:**
   - Create FRD with headings, lists, code blocks
   - Click Export
   - Select Markdown format
   - Download and verify formatting preserved

3. **Test export PDF:**
   - Create FRD
   - Click Export, select PDF
   - Verify PDF generates and downloads
   - Open PDF and verify content and styling

4. **Test export all:**
   - Create tree with 3 epics, 5 features, all with FRDs
   - Click Export All
   - Select Markdown or ZIP
   - Verify file downloads
   - If ZIP, verify folder structure matches tree

5. **Test tree export/import:**
   - Export tree as JSON
   - In new project, import that JSON
   - Verify tree structure matches original

6. **Test API:**
   ```bash
   curl -F "file=@requirements.md" \
     "http://localhost:3000/api/projects/xyz/requirements-documents/import"
   ```

## Dependencies
- Phase 026: Database schema
- Phase 033: Feature Requirements Document
- Phase 034: Requirements editor
- Phase 029: Feature tree
