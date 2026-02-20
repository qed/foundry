# Phase 097 - Artifact Upload UI

## Objective
Implement user-friendly file upload interfaces across all modules, supporting drag-drop and file browser interactions with progress tracking.

## Prerequisites
- Phase 096 (Artifacts Schema) completed
- Next.js 14+ setup with Supabase client integration
- Tailwind CSS configured

## Context
Users need intuitive ways to upload artifacts from multiple locations: the Project Overview artifacts tab and within agent chat panels in all 5 modules. Upload should handle various file types with visual feedback during the process.

## Detailed Requirements

### Supported File Types
- Documents: `.pdf`, `.docx`, `.md`, `.txt`
- Images: `.png`, `.jpg`, `.jpeg`
- Spreadsheets: `.csv`, `.xlsx`
- Audio: `.mp3`, `.wav`, `.m4a`, `.aac`
- Maximum file size: 50MB

### Upload Locations

#### 1. Project Overview - Artifacts Tab
- Prominent upload zone at top of Artifacts tab
- Drag-drop area with text: "Drop artifacts here or click to browse"
- File browser fallback for users who can't drag-drop
- Display selected file(s) before upload
- Multiple file upload support (batch upload)

#### 2. Agent Chat Panels (All Modules)
- Upload button (paperclip/attachment icon) in chat input bar
- Click button to open file browser modal
- Single file upload per action (users can upload multiple sequentially)
- Success message displayed in chat after upload
- File appears as reference/attachment in chat history

### UI Components

#### UploadZone Component
```typescript
interface UploadZoneProps {
  projectId: string;
  folderId?: string;
  onUploadSuccess: (artifact: Artifact) => void;
  onUploadError: (error: Error) => void;
  maxSize?: number;
  acceptedTypes?: string[];
  multiple?: boolean;
}

export function UploadZone({
  projectId,
  folderId,
  onUploadSuccess,
  onUploadError,
  maxSize = 50 * 1024 * 1024,
  acceptedTypes = ['pdf', 'docx', 'md', 'txt', 'png', 'jpg', 'csv', 'xlsx', 'mp3', 'wav'],
  multiple = true,
}: UploadZoneProps) {
  // Implementation details in Phase 097
}
```

#### UploadProgress Component
```typescript
interface UploadProgressProps {
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export function UploadProgress({
  fileName,
  progress,
  status,
  error,
}: UploadProgressProps) {
  // Implementation details
}
```

#### ChatUploadButton Component
```typescript
interface ChatUploadButtonProps {
  projectId: string;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function ChatUploadButton({
  projectId,
  onFileSelected,
  disabled = false,
}: ChatUploadButtonProps) {
  // Implementation details
}
```

### Upload Process Flow

```
1. User selects file (drag-drop or file browser)
   ↓
2. Client validates: type, size, duplicates
   ↓
3. Show upload progress indicator (0%)
   ↓
4. Create artifact metadata in DB (with processing status)
   ↓
5. Upload file to Supabase Storage
   ↓
6. Update progress indicator (100%)
   ↓
7. Trigger text extraction job (Phase 100)
   ↓
8. Display success message with artifact preview
```

## File Structure
```
src/
├── components/
│   ├── artifacts/
│   │   ├── UploadZone.tsx
│   │   ├── UploadProgress.tsx
│   │   ├── ChatUploadButton.tsx
│   │   └── UploadModal.tsx
│   └── shared/
│       └── FileTypeIcon.tsx
├── lib/
│   ├── artifacts/
│   │   ├── upload.ts           (upload logic, validation)
│   │   └── fileTypes.ts        (file type utilities)
│   └── supabase/
│       └── storage.ts          (Storage client)
├── app/api/
│   └── artifacts/
│       └── upload/
│           └── route.ts        (upload endpoint)
└── hooks/
    └── useArtifactUpload.ts    (custom hook for upload logic)
```

## API Routes

### POST /api/artifacts/upload
Handle file upload and metadata creation:

```
Headers:
- Authorization: Bearer token
- Content-Type: multipart/form-data

Body:
- file: File (binary)
- project_id: string
- folder_id?: string
- name: string (optional, defaults to original filename)

Response:
{
  id: string,
  name: string,
  file_type: string,
  file_size: number,
  storage_path: string,
  created_at: string,
  processing_status: 'pending' | 'extracting_text' | 'complete'
}

Error Responses:
- 400: Invalid file type or size exceeds limit
- 401: Unauthorized
- 413: File too large
- 500: Upload failed
```

## Validation Logic

### Client-side Validation
```typescript
function validateFile(file: File, maxSize: number, acceptedTypes: string[]): ValidationResult {
  // Check file type
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!acceptedTypes.includes(ext || '')) {
    return { valid: false, error: 'File type not supported' };
  }

  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: 'File exceeds 50MB limit' };
  }

  // Check for duplicates (optional)

  return { valid: true };
}
```

## Acceptance Criteria
- [ ] UploadZone component renders with drag-drop and file browser
- [ ] File type validation prevents unsupported files
- [ ] File size validation enforces 50MB limit
- [ ] Progress indicator updates during upload
- [ ] Multiple file upload works in artifacts tab
- [ ] Single file upload works in chat panels
- [ ] ChatUploadButton integrated into all 5 module chat inputs
- [ ] Success/error messages display appropriately
- [ ] Uploaded artifacts appear immediately in browser (Phase 098)
- [ ] File metadata stored in database
- [ ] Files stored in correct Storage paths by folder hierarchy
- [ ] Error handling for network failures with retry option

## Testing Instructions

### Component Testing
```typescript
// UploadZone.test.tsx
describe('UploadZone', () => {
  it('accepts drag-dropped files', async () => {
    // Simulate drag-drop of PDF file
  });

  it('validates file type', async () => {
    // Attempt to upload .exe file, expect validation error
  });

  it('enforces 50MB size limit', async () => {
    // Attempt to upload 100MB file, expect size error
  });

  it('displays progress during upload', async () => {
    // Monitor progress state changes: 0% → 50% → 100%
  });

  it('calls onUploadSuccess callback', async () => {
    // Verify callback fired with artifact data
  });
});
```

### Integration Testing
```bash
# Upload valid PDF
curl -X POST http://localhost:3000/api/artifacts/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@document.pdf" \
  -F "project_id={project-id}"

# Attempt to upload invalid type
curl -X POST http://localhost:3000/api/artifacts/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@script.exe" \
  -F "project_id={project-id}"
# Expected: 400 error "File type not supported"

# Upload large file
# Expected: 413 "File too large"
```

### Manual Testing
1. Navigate to Project Overview > Artifacts tab
2. Drag a PDF onto the upload zone → file uploads and appears in list
3. Click "browse" link and select multiple files → all upload sequentially
4. Navigate to Hall > Agent Chat
5. Click upload button in chat input, select image → appears in chat
6. Attempt to upload 100MB file → error message "File exceeds 50MB limit"
7. Attempt to upload .exe file → error message "File type not supported"
8. Test in all 5 module chat panels for consistency
