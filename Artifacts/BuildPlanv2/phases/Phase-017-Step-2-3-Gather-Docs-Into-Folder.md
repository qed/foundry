# Phase 017: Step 2.3 — Gather All Documentation Into One Folder

## Phase Overview
**Stage:** Epic 3: Documentation Stage (Step 2.3)
**Phase:** 017
**Route:** `/org/[orgSlug]/project/[projectId]/helix/step/2-3/`
**Time Estimate:** 2-3 hours
**Complexity:** High

## Objective
Enable project teams to upload and centralize all documentation files identified in Step 2.1 into a single organized project folder. This creates a unified documentation repository accessible to the entire build team and sets the foundation for step 2.4 (verification).

## Prerequisites
- Phase 015 (Step 2.1) complete: Documentation inventory exists
- Phase 016 (Step 2.2) complete or in progress (optional but recommended)
- Supabase Storage configured with bucket for Helix artifacts
- Artifacts system integrated from Foundry v1
- File upload middleware configured in Next.js

## Epic Context
Step 2.3 is the third step of Epic 3 (Documentation Stage). It implements the actual file gathering phase, where teams upload all documentation identified in the inventory. These files are organized, stored, and tracked for step 2.4's verification process.

## Context
After inventorying what documentation exists (step 2.1), the team needs to physically gather those files into one place. This includes:
- Design files from Figma/Adobe XD
- Technical specifications in various formats
- Meeting notes and transcripts
- Code samples and prototypes
- User research data
- API documentation
- Design system files
- Business requirement documents

A centralized folder prevents information scattered across drives/clouds and ensures the entire build team has access to complete project documentation.

## Detailed Requirements

### 1. Multi-File Upload Zone
Create a drag-and-drop file upload interface with:
- **Drag and drop area** with visual hover state
- **"Click to upload" button** as fallback
- **File type icons** (auto-detected by extension)
- **Visible file size** for each file
- **Upload progress bar** per file (percentage, animated)
- **Estimated time remaining** for each file
- **Cancel upload button** per file (if in progress)

**Supported File Types:**
- Documents: PDF, DOCX, DOC, XLSX, XLS, TXT, MD, CSV
- Images: PNG, JPG, JPEG, GIF, SVG, WebP
- Archives: ZIP, TAR, GZ
- Drawings: Figma (web only, export as PDF), Adobe XD (export as PDF)
- Other: PPTX, ODP (presentations)

**File Constraints:**
- Max file size: 50MB per file
- Max files per upload: 100 at once
- Max total per step: 500MB
- Validate MIME type server-side

### 2. Category Organization
Files are organized by the categories from Step 2.1:
- **Category selector** when uploading (required)
- Or **auto-detect category** if file uploaded from specific location
- Dropdown/select showing all categories from inventory
- "Other" category for files that don't fit standard categories
- Custom categories created in step 2.1 also available here

### 3. File List Display
After upload, display all uploaded files in a structured table/list:
- **File name** (clickable to preview)
- **File type icon** (visual indicator)
- **File size** (human readable: 2.4 MB)
- **Category** (assigned category from step 2.1)
- **Upload date/time**
- **Uploader name** (user who uploaded)
- **Actions:**
  - Preview (opens file viewer or download)
  - Move to different category
  - Replace file (re-upload new version)
  - Delete (removes from Helix and storage)
  - Download link

### 4. File Type Detection & Icons
Auto-detect file type and show appropriate icon:
- **PDF**: document icon (lucide-react: `FileText`)
- **Word/DOCX**: document icon with color
- **Excel/CSV**: table icon (lucide-react: `Table2`)
- **Markdown**: code icon (lucide-react: `FileCode`)
- **Image**: image icon (lucide-react: `Image`)
- **ZIP/Archive**: archive icon (lucide-react: `Archive`)
- **Code**: code brackets icon (lucide-react: `Code2`)
- **Unknown**: generic file icon (lucide-react: `File`)

### 5. Evidence Collection
Evidence object saved to helix_steps.evidence_data as jsonb:
```json
{
  "evidence_type": "documentation_files",
  "created_at": "2026-02-28T16:00:00Z",
  "updated_at": "2026-02-28T16:00:00Z",
  "files": [
    {
      "file_id": "artifact_uuid_001",
      "artifact_id": "artifact_abc123",
      "file_name": "Technical_Specification_v2.pdf",
      "file_size_bytes": 2456789,
      "file_type": "application/pdf",
      "category": "specifications",
      "upload_date": "2026-02-28T16:00:00Z",
      "uploaded_by": "user@example.com",
      "storage_path": "projects/proj_123/helix/2-documentation/specifications/Technical_Specification_v2.pdf",
      "artifact_id": "artifact_abc123",
      "preview_available": true
    },
    {
      "file_id": "artifact_uuid_002",
      "file_name": "Design_System_Figma_Export.pdf",
      "file_size_bytes": 5234567,
      "file_type": "application/pdf",
      "category": "design_files",
      "upload_date": "2026-02-28T16:05:00Z",
      "uploaded_by": "user@example.com",
      "storage_path": "projects/proj_123/helix/2-documentation/design_files/Design_System_Figma_Export.pdf",
      "artifact_id": "artifact_xyz789",
      "preview_available": true
    }
  ],
  "total_files": 2,
  "total_size_bytes": 7691356,
  "categories_covered": ["specifications", "design_files"],
  "categories_missing": ["mockups_wireframes", "api_documentation"]
}
```

### 6. File Storage Structure
Files stored in Supabase Storage with organized folder structure:
```
projects/
  └── {projectId}/
      └── helix/
          └── 2-documentation/
              ├── specifications/
              │   ├── Technical_Specification_v2.pdf
              │   └── Feature_Spec_Dashboard.pdf
              ├── design_files/
              │   ├── Design_System_Export.pdf
              │   └── Component_Library.figma.pdf
              ├── meeting_notes/
              │   └── Q1_Planning_2026-02-15.md
              ├── existing_code/
              │   └── Current_Architecture.md
              ├── api_documentation/
              │   └── API_Reference_v3.pdf
              ├── user_research/
              │   ├── User_Interview_Summary.md
              │   └── Personas.pdf
              └── other/
                  └── Marketing_Requirements.docx
```

### 7. Minimum Viable Gate Requirement
- **Gate Block:** At least 1 file must be uploaded
- Validation: Check that files array is not empty
- Error message: "Please upload at least one documentation file before advancing to verification"
- Minimum file size: files must be at least 1KB (prevents empty files)

### 8. UI/UX Details
- **Drag-drop zone:** Large, prominent (400px height), with dashed border
- **Hover state:** Background color changes to `bg-tertiary`, accent border turns `accent-cyan`
- **Upload progress:** Green progress bar with percentage, animated
- **File list:** Table or card grid layout, responsive
- **Color coding:** Icons use `accent-cyan` for active, `text-primary` for inactive
- **Loading states:** Spinner during upload, "Uploading..." text, disable submit button
- **Success state:** Green checkmark next to file, toast notification
- **Error state:** Red error icon, error toast with retry option

### 9. Component Breakdown

#### Page Component: `app/org/[orgSlug]/project/[projectId]/helix/step/2-3/page.tsx`
```typescript
// Route handler for step 2.3
// Loads existing evidence from helix_steps
// Renders DocumentGathering component
// Handles form submission via POST /api/helix/steps/2-3
```

#### Component: `components/helix/DocumentGathering.tsx`
```typescript
interface UploadedFile {
  file_id: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  category: string;
  upload_date: string;
  uploaded_by: string;
  preview_available: boolean;
  artifact_id: string;
}

interface DocumentGatheringState {
  files: UploadedFile[];
  uploading_files: {
    file_id: string;
    progress: number;
    file_name: string;
  }[];
  upload_status: 'idle' | 'uploading' | 'success' | 'error';
  error_message: string | null;
}

// Features:
// - Drag-drop upload zone
// - File type detection
// - Progress tracking per file
// - File list display with actions
// - Category assignment
```

#### Component: `components/helix/DragDropUploadZone.tsx`
```typescript
interface DragDropUploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  accepting_files: string[]; // MIME types
  max_file_size: number;
  uploading: boolean;
}

// Features:
// - Drag-drop handler
// - Visual feedback on drag
// - File validation
// - Click to upload fallback
```

#### Component: `components/helix/FileListTable.tsx`
```typescript
interface FileListTableProps {
  files: UploadedFile[];
  categories: string[];
  onMoveToCategory: (file_id: string, new_category: string) => void;
  onDelete: (file_id: string) => void;
  onPreview: (file: UploadedFile) => void;
}

// Features:
// - Display uploaded files in table
// - Category reassignment
// - File actions (preview, delete, download)
// - Sorting and filtering
```

## File Structure
```
/app/org/[orgSlug]/project/[projectId]/helix/step/2-3/
  └── page.tsx                          (Step page wrapper)

/components/helix/
  ├── DocumentGathering.tsx             (Main upload component)
  ├── DragDropUploadZone.tsx            (Upload area)
  ├── FileListTable.tsx                 (File list display)
  ├── FileUploadProgress.tsx            (Progress bar per file)
  ├── FileTypeIcon.tsx                  (Icon selector)
  └── FileCategorySelector.tsx          (Category dropdown)

/lib/helix/
  ├── file-upload.ts                    (Upload logic, validation)
  ├── file-types.ts                     (File type configuration)
  └── storage-helpers.ts                (Supabase Storage helpers)

/api/helix/steps/
  └── 2-3/
      ├── route.ts                      (POST for metadata, GET for loading)
      └── upload.ts                     (POST for file upload)
```

## Dependencies

### Database
- `helix_steps` table with evidence_data jsonb column
- `artifacts` table for storing file references
- `helix_stage_gates` table for gate status

### API Endpoints
- `POST /api/helix/steps/2-3/upload` - Handle file upload to Supabase Storage
- `POST /api/helix/steps/2-3` - Save evidence metadata
- `GET /api/helix/steps/2-3` - Load existing files
- `DELETE /api/helix/steps/2-3/file/{fileId}` - Delete file
- `PATCH /api/helix/steps/2-3/file/{fileId}` - Update file category

### Supabase
- Storage bucket: `helix-documentation`
- Database client for artifacts and helix_steps

### Libraries
- `react-dropzone` or native Drag/Drop API
- `lucide-react` - File type icons
- `next-auth` - User context for "uploaded by"
- File type detection library (MIME type detection)

### Components
- `StepDetailView` (parent container from Epic 2)
- Toast notification system
- Modal for file preview
- File viewer/renderer

## Tech Stack
- **Frontend:** Next.js 16+ (App Router), TypeScript, React
- **File Upload:** Dropzone API or `react-dropzone`
- **Styling:** Tailwind CSS v4, CSS custom properties
- **Icons:** lucide-react
- **Storage:** Supabase Storage
- **Database:** Supabase PostgreSQL
- **API:** Next.js API Routes

## Acceptance Criteria

1. **Drag-Drop Works**: User can drag files onto upload zone, visual feedback shows on hover, files upload on drop
2. **Click Upload Works**: Click-to-upload button opens file selector, user can select multiple files, files upload on selection
3. **File Type Detection**: Uploaded files show appropriate icon based on extension, file type correctly identified
4. **Upload Progress**: Progress bar displays for each file, shows percentage, animates smoothly, updates in real-time
5. **File Size Validation**: Files exceeding 50MB rejected with error message, user cannot upload oversized files
6. **File List Displays**: After upload, files display in list/table with name, size, type, category, upload date
7. **Category Organization**: Files can be assigned to categories, category selector accessible for each file, categories from step 2.1 available
8. **File Actions Work**: User can preview, move to new category, replace, and delete files; delete removes from storage
9. **Evidence Structure**: Completed evidence_data contains all files with correct metadata, artifact references, and folder structure
10. **Minimum Gate Check**: Cannot advance without uploading at least 1 file; error displays if attempted; enables after 1+ file uploaded

## Testing Instructions

1. **Test Drag-Drop Upload**
   - Open step 2.3 page
   - Drag file onto upload zone
   - Verify zone highlights on drag-over
   - Drop file
   - Verify upload starts
   - Monitor progress bar
   - Verify completion

2. **Test Click Upload**
   - Click "Click to upload" or upload button
   - Verify file dialog opens
   - Select multiple files (5+)
   - Verify all files selected
   - Click open
   - Verify all files upload

3. **Test File Type Icons**
   - Upload PDF file, verify document icon appears
   - Upload Excel file, verify table icon appears
   - Upload image file, verify image icon appears
   - Upload Zip file, verify archive icon appears
   - Verify icon colors match CSS variables

4. **Test File Size Limit**
   - Try to upload file > 50MB
   - Verify error message: "File exceeds 50MB limit"
   - Verify file rejected
   - Upload file < 50MB
   - Verify upload succeeds

5. **Test File List Display**
   - Upload 3 files to different categories
   - Verify all files appear in list/table
   - Verify file names, sizes, types display correctly
   - Verify categories display correctly
   - Verify upload dates visible
   - Verify "uploaded by" shows current user

6. **Test Category Assignment**
   - Upload file without selecting category
   - Verify default category applied (or error)
   - Click file's category dropdown
   - Select different category
   - Verify category changes
   - Save changes, refresh page
   - Verify category persists

7. **Test File Actions**
   - Upload test PDF file
   - Click preview, verify PDF viewer opens
   - Go back, click download
   - Verify file downloads
   - Click delete
   - Verify deletion confirmation dialog
   - Confirm deletion
   - Verify file removed from list and storage

8. **Test Multiple File Upload**
   - Select 10+ files at once
   - Verify all show in queue with progress bars
   - Monitor uploads complete
   - Verify all files appear in list
   - Verify progress bars disappear after completion

9. **Test Minimum Gate Check**
   - Open empty step 2.3
   - Try to click "Complete Step" button
   - Verify error message appears
   - Upload 1 file
   - Verify error clears
   - Verify step can be completed

10. **Test Storage Structure**
    - Upload files to various categories
    - Query Supabase Storage bucket
    - Verify folder structure: `projects/{projectId}/helix/2-documentation/{category}/`
    - Verify files stored in correct category folders
    - Verify file names preserved
    - Verify accessible from storage

## Notes for AI Agent

### Implementation Guidance
- Use HTML5 Drag and Drop API or `react-dropzone` library
- Implement file size validation client-side AND server-side
- Use FormData for multipart file upload to Next.js API
- Stream large files directly to Supabase Storage to avoid memory issues
- Create unique filename if duplicate exists: `filename-{timestamp}.ext`

### File Upload Flow
```typescript
1. User selects/drags files
2. Client-side validation: size, type
3. Show files in upload queue with progress
4. For each file:
   a. Create FormData with file
   b. POST to /api/helix/steps/2-3/upload
   c. Server validates again
   d. Upload to Supabase Storage
   e. Create artifact record
   f. Update evidence_data
5. Show completion with file list
```

### File Type Detection
- Use MIME type from File object as primary indicator
- Fall back to extension-based detection
- Maintain whitelist of allowed MIME types in `lib/helix/file-types.ts`
- Be strict: validate both MIME type and extension

### Progress Tracking
- Use `XMLHttpRequest.upload.onprogress` or fetch with `ReadableStream`
- Update state for each file independently
- Show percentage and bytes uploaded/total
- Estimate time remaining based on transfer speed

### Error Handling
- Validate file on client before upload (show error immediately)
- Validate again on server (security)
- If upload fails, show error message with retry button
- Store error state per file, not globally
- Allow retry of failed uploads without re-selecting files

### Category Management
- Load categories from helix_steps.evidence_data from step 2.1
- If step 2.1 not done, use hardcoded standard categories
- When reassigning category, update helix_steps.evidence_data AND move file in storage

### Storage Path Strategy
- Use consistent naming: `projects/{projectId}/helix/{stageNumber}-{stageName}/{category}/{filename}`
- Never expose full storage paths to client (use artifact_id references)
- Generate signed URLs for file downloads (secure, time-limited)

### Styling Notes
- Upload zone border: dashed, 2px, `accent-cyan` on hover
- Upload zone background: `bg-tertiary` on hover
- File list: `bg-secondary` for rows
- Progress bar: `bg-accent-cyan`
- File size text: `text-primary` with smaller font

### Common Pitfalls
- Don't upload files without server-side validation (security risk)
- Don't allow duplicate filenames to overwrite each other
- Don't forget to create artifact records for each file
- Don't lose upload progress if page refreshed (consider resumable uploads)
- Don't expose Supabase Storage paths directly to client
- Test with various file types and sizes before deployment

### Future Enhancements
- Resumable uploads for large files (pause/resume)
- Batch processing (compress, convert formats)
- Automatic file type classification
- Duplicate file detection
- File versioning (track multiple versions of same file)
- Integration with Figma/Adobe XD APIs to export directly
- OCR for image-based documents (extract searchable text)

---

**Phase Author:** Helix Documentation Stage Design Team
**Version:** 1.0
**Last Updated:** 2026-02-28
**Status:** Ready for Implementation
