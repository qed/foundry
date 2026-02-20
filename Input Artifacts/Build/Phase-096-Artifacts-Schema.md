# Phase 096 - Artifacts Database & Storage

## Objective
Establish a centralized artifact storage system with database schema and Supabase integration to enable file management across all Helix Foundry modules.

## Prerequisites
- Phase 002 (Project Schema & Core Tables) completed
- Supabase project configured with PostgreSQL database
- Supabase Storage initialized

## Context
Artifacts are files uploaded by users that support the design and development process: PDFs, documents, images, spreadsheets, audio files, etc. These files need to be stored securely, organized hierarchically, and searchable across the platform. The artifact system will support all 5 modules (Hall, Pattern Shop, Control Room, Assembly Floor, Insights Lab) with unified storage and retrieval.

## Detailed Requirements

### Database Schema

#### artifacts table
Create a new table in PostgreSQL to store artifact metadata:

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  content_text TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (folder_id IS NULL OR file_type = 'folder')
);

CREATE INDEX idx_artifacts_project ON artifacts(project_id);
CREATE INDEX idx_artifacts_folder ON artifacts(folder_id);
CREATE INDEX idx_artifacts_uploaded_by ON artifacts(uploaded_by);
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at DESC);
```

#### artifact_folders table
Create a dedicated table for folder organization:

```sql
CREATE TABLE artifact_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES artifact_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, parent_folder_id, name)
);

CREATE INDEX idx_artifact_folders_project ON artifact_folders(project_id);
CREATE INDEX idx_artifact_folders_parent ON artifact_folders(parent_folder_id);
```

### Supabase Storage Configuration

#### Bucket: project-artifacts
- **Visibility:** Private
- **Size limit:** 5 GB per project
- **Path pattern:** `{project_id}/{folder_hierarchy}/{filename}`
- **RLS Policies:**
  - Users can read artifacts from projects they are members of
  - Users can upload artifacts to projects they have editor+ role
  - Users can delete artifacts they uploaded or project admins can delete any

## File Structure
```
src/
├── lib/
│   ├── artifacts/
│   │   ├── storage.ts          (Supabase Storage client wrapper)
│   │   ├── schema.ts           (DB query builders)
│   │   └── types.ts            (TypeScript interfaces)
│   └── types/
│       └── artifacts.ts        (shared types)
├── app/api/
│   └── artifacts/
│       ├── route.ts            (artifact CRUD endpoints)
│       └── folders/
│           └── route.ts        (folder operations)
└── migrations/
    └── 096_artifacts_schema.sql (migration file)
```

## Database Sequence
1. Create artifact_folders table first (no dependencies)
2. Create artifacts table (references artifact_folders and projects)
3. Add RLS policies for both tables
4. Create Supabase Storage bucket with RLS

## API Routes

### GET /api/artifacts
List artifacts in project (with folder filtering):
```
Query params:
- project_id (required)
- folder_id (optional, defaults to root)
- search (optional, searches name and content_text)

Response: { artifacts: Artifact[], folders: Folder[], pagination }
```

### POST /api/artifacts
Create artifact metadata (file uploaded separately to Storage):
```
Body: { project_id, folder_id?, name, file_type, file_size, storage_path, content_text? }
Response: { id, created_at, ... }
```

### DELETE /api/artifacts/[id]
Delete artifact and associated Storage file:
```
- Verify user owns artifact or is project admin
- Delete from Storage
- Delete from artifacts table
Response: { success: true }
```

### POST /api/artifacts/folders
Create folder:
```
Body: { project_id, parent_folder_id?, name }
Response: { id, created_at }
```

### PATCH /api/artifacts/folders/[id]
Rename folder:
```
Body: { name }
Response: { id, name }
```

## Acceptance Criteria
- [ ] artifacts and artifact_folders tables created with proper constraints
- [ ] Supabase Storage bucket `project-artifacts` created with RLS policies
- [ ] All indexes created for query performance
- [ ] TypeScript interfaces defined for Artifact and Folder types
- [ ] CRUD API routes functional with proper auth checks
- [ ] File size validation (max 50MB enforced in subsequent phases)
- [ ] Self-referential folder structure supports max 3-level nesting
- [ ] Database tests pass (CRUD operations on both tables)

## Testing Instructions

### Database Tests
```sql
-- Test artifact creation
INSERT INTO artifacts (project_id, name, file_type, file_size, storage_path, uploaded_by)
VALUES ('{test-project-id}', 'test.pdf', 'pdf', 1024, 'path/to/test.pdf', '{test-user-id}');

-- Test folder creation
INSERT INTO artifact_folders (project_id, name)
VALUES ('{test-project-id}', 'Test Folder');

-- Test nested folder
INSERT INTO artifact_folders (project_id, parent_folder_id, name)
VALUES ('{test-project-id}', '{parent-folder-id}', 'Nested Folder');

-- Verify unique constraint on folder names
INSERT INTO artifact_folders (project_id, parent_folder_id, name)
VALUES ('{test-project-id}', '{parent-folder-id}', 'Nested Folder'); -- Should fail
```

### API Tests
```bash
# Create artifact
curl -X POST http://localhost:3000/api/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "{test-project-id}",
    "name": "document.pdf",
    "file_type": "pdf",
    "file_size": 2048,
    "storage_path": "project/document.pdf"
  }'

# List artifacts
curl http://localhost:3000/api/artifacts?project_id={test-project-id}

# Create folder
curl -X POST http://localhost:3000/api/artifacts/folders \
  -H "Content-Type: application/json" \
  -d '{"project_id": "{test-project-id}", "name": "Documents"}'
```

### Manual Testing
1. Verify Storage bucket is accessible via Supabase dashboard
2. Check RLS policies prevent unauthorized access
3. Confirm folder hierarchy limitations (max 3 levels)
4. Validate constraint preventing files as folders
