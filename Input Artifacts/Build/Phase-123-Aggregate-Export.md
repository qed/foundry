# Phase 123: Pattern Shop - Aggregate Export

## Objective
Enable export of an entire project's requirements as a single consolidated markdown or PDF file, preserving the feature tree hierarchy, including all FRDs, technical requirements, and product overview.

## Prerequisites
- Phase 042: Pattern Shop - Feature Tree Structure (feature hierarchy)
- Phase 037: Pattern Shop - Agent Integration (generated requirements)
- Feature and requirement data structures in database
- PDF generation library (e.g., html2pdf, pdfkit)

## Context
Teams often need to share complete, comprehensive documentation with stakeholders, external teams, or for archival purposes. An aggregate export generates a professional document with the product overview, complete feature tree, all functional and technical requirements, and auto-generated table of contents.

## Detailed Requirements

### Export Formats
- **Markdown (.md):** Plain text with markdown formatting, preserves structure
- **PDF (.pdf):** Professional PDF with cover page, TOC, pagination

### Document Structure
1. **Cover Page (PDF only)**
   - Project name and logo
   - Export date
   - Project description
   - Organization name

2. **Table of Contents**
   - Auto-generated from feature tree structure
   - Page numbers (PDF only)
   - Linked to sections (both formats)

3. **Project Overview**
   - Project description
   - Key objectives
   - Target audience

4. **Feature Tree Hierarchy**
   For each feature (maintaining tree depth):
   - Feature name (heading level matches tree depth: H2 for top-level, H3 for children, etc.)
   - Feature description
   - Status badge (Not Started, In Progress, Complete)
   - Associated Functional Requirements Document (FRD):
     - All requirements listed
     - Acceptance criteria
   - Associated Technical Requirements:
     - All technical specs and constraints
   - Work Order count and status summary
   - Linked artifacts/references

### Markdown Export
- File naming: `{ProjectName}-{ExportDate}.md`
- Heading hierarchy reflects feature tree depth
- Code blocks for technical requirements
- Bullet points for requirements lists
- Timestamps and version info in footer

### PDF Export
- File naming: `{ProjectName}-{ExportDate}.pdf`
- Professional styling with branded colors
- Page breaks after major sections
- Footers with page numbers and project name
- Header with section names on each page
- Table of contents with clickable links
- Print-optimized layout

### API Endpoint
- `GET /api/projects/:projectId/export?format=markdown` → returns .md file
- `GET /api/projects/:projectId/export?format=pdf` → returns .pdf file
- Query param: `includeDrafts=true/false` (default false - only include published requirements)

### UI Component
- "Export" button in Pattern Shop header
- Dropdown: "Export as Markdown" or "Export as PDF"
- Modal with options:
  - Include draft requirements? (checkbox)
  - Include work orders summary? (checkbox)
  - Include artifacts? (checkbox)
- "Generate & Download" button
- Progress indicator during export
- Confirmation when download starts

### Performance Considerations
- Stream large PDFs to avoid memory overload
- Cache TOC generation (regenerate only if structure changes)
- Limit to 30-minute timeout for very large projects

## File Structure
```
/app/api/projects/[projectId]/export/route.ts
/app/components/PatternShop/ExportModal.tsx
/app/lib/export/markdownGenerator.ts
/app/lib/export/pdfGenerator.ts
/app/lib/export/tocGenerator.ts
/app/hooks/useExport.ts
/app/lib/supabase/queries/getProjectExportData.ts
```

## Acceptance Criteria
- [ ] Export button available in Pattern Shop header
- [ ] Dropdown menu with Markdown and PDF options
- [ ] Modal displays with include/exclude options
- [ ] Markdown export generates valid markdown file
- [ ] Markdown preserves feature tree hierarchy with correct heading levels
- [ ] Markdown includes project overview, all features, all requirements, all technical specs
- [ ] PDF export generates professional-looking PDF document
- [ ] PDF includes cover page, table of contents with page numbers
- [ ] Table of contents auto-generated and accurate for both formats
- [ ] Feature tree structure accurately reflected in document (parent-child relationships)
- [ ] Drafts excluded by default, included when checkbox enabled
- [ ] Work orders summary included/excluded based on checkbox
- [ ] Artifacts included/excluded based on checkbox
- [ ] Download initiated automatically when generation complete
- [ ] Files named correctly with project name and export date
- [ ] Timestamps and version information included in footer
- [ ] Large projects (100+ features) export without timeout
- [ ] Multiple concurrent exports work without conflicts

## Testing Instructions
1. Navigate to Pattern Shop and create feature tree with 3-5 nested features
2. Ensure each feature has description, requirements, technical specs
3. Mark some requirements as draft
4. Click "Export" button and select "Markdown"
5. Configure options: include drafts, include work orders
6. Click "Generate & Download"
7. Verify .md file downloads with correct naming
8. Open markdown file and verify:
   - Project overview at top
   - Table of contents accurately lists all features
   - Feature hierarchy preserved with correct heading levels
   - All FRDs and technical requirements included
   - Draft requirements present (since checkbox was enabled)
9. Repeat with PDF export
10. Verify PDF has:
    - Professional cover page
    - Table of contents with page numbers
    - All content properly formatted and paginated
11. Test with feature tree containing 20+ features
12. Verify export completes within reasonable time
13. Test excluding drafts and verify they don't appear in export
14. Verify concurrent exports from multiple users work correctly
