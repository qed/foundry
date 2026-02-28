# Phase 019: Artifact Storage Integration for Helix Process

## Phase Overview
**Stage:** Epic 3: Documentation Stage (Infrastructure)
**Phase:** 019
**Time Estimate:** 3-4 hours
**Complexity:** High

## Objective
Integrate the Helix step output system with Foundry v1's existing Artifacts module, creating a unified documentation repository that connects the structured Helix process outputs with the Open Mode file management system. This enables bidirectional access to Helix documentation from both Helix Mode and Open Mode.

## Prerequisites
- Artifacts system exists in Foundry v1 (file storage via Supabase Storage)
- Supabase Storage bucket configured for projects
- helix_steps and helix_stage_gates tables created
- Phases 015-018 specifications understood (Step 2.1-2.4)
- Next.js API routes functional

## Epic Context
Phases 019-021 provide infrastructure and UI components supporting the Documentation Stage (Phase 015-018). Phase 019 focuses on connecting Helix outputs to the artifacts system, creating an organized folder structure for all documentation gathered during the Documentation Stage and future stages.

## Context
Foundry v1 has an artifacts system for storing project files. Rather than creating a separate, isolated documentation system for Helix, Phase 019 integrates Helix outputs into the existing artifacts infrastructure. Benefits:
- Unified file management
- Team members can access Helix documentation through Open Mode
- Automatic folder organization by stage
- Consistent with existing Foundry workflows
- Easy to integrate future stages (3-Build Planning, 4-Quality)

## Detailed Requirements

### 1. Artifact Folder Structure
Create automatic folder hierarchy in artifacts for Helix process:
```
{ProjectName}/Helix/
├── 1-Planning/
│   ├── Step-1.1-Define-Scope/
│   ├── Step-1.2-Clarify-Goals/
│   └── Step-1.3-Identify-Risks/
├── 2-Documentation/
│   ├── Step-2.1-Documentation-Inventory/
│   ├── Step-2.2-Knowledge-Capture/
│   ├── Step-2.3-Gathered-Files/
│   └── Step-2.4-Verification-Report/
├── 3-Build-Planning/
│   ├── Step-3.1-...
│   └── ...
└── 4-Quality/
    └── ...
```

Automatically create folder structure when project first enters Helix Mode (Epic 1 completion).

### 2. Helper Function: createHelixArtifact()
Create utility function in `lib/helix/artifacts.ts`:

```typescript
interface CreateHelixArtifactInput {
  projectId: string;
  stageNumber: number; // 1, 2, 3, 4
  stageName: string;   // "Planning", "Documentation", etc.
  stepKey: string;     // "2-1", "2-2", etc.
  stepName: string;    // "Identify Documentation", etc.
  content: string | Buffer; // File content or markdown text
  filename: string;    // "domain-knowledge-capture.md" or "spec.pdf"
  contentType: 'text' | 'markdown' | 'file'; // Content type
  description?: string; // Optional artifact description
}

interface CreateHelixArtifactOutput {
  artifact_id: string;
  file_path: string;
  storage_path: string;
  created_at: string;
  size_bytes: number;
  access_url: string; // Signed URL for download
}

async function createHelixArtifact(
  input: CreateHelixArtifactInput
): Promise<CreateHelixArtifactOutput>
```

**Function behavior:**
1. Validate inputs (projectId, stageNumber, content)
2. Create storage path: `projects/{projectId}/helix/{stageNumber}-{stageName}/{stepKey}-{stepName}/`
3. Generate unique filename if duplicate exists
4. Upload file to Supabase Storage
5. Create artifact record in `artifacts` table
6. Return artifact metadata
7. Handle errors gracefully (storage errors, DB errors)

### 3. Artifact Record Schema
Extend artifacts table with Helix-specific fields:

```sql
-- Add columns to existing artifacts table
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS helix_stage_number INT;
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS helix_step_key VARCHAR(10);
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS helix_evidence_type VARCHAR(50);
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS is_helix BOOLEAN DEFAULT false;

-- Example artifact record for Helix
{
  id: "artifact_abc123",
  project_id: "proj_456",
  name: "Domain Knowledge Capture - Step 2.2",
  description: "Captured domain knowledge, business rules, and design preferences",
  file_path: "projects/proj_456/helix/2-Documentation/Step-2.2-Knowledge-Capture/domain-knowledge-capture.md",
  storage_path: "projects/proj_456/helix/2-Documentation/Step-2.2-Knowledge-Capture/domain-knowledge-capture-20260228T140000.md",
  file_size_bytes: 45678,
  file_type: "text/markdown",
  created_at: "2026-02-28T14:00:00Z",
  updated_at: "2026-02-28T14:00:00Z",
  created_by: "user_123",
  is_helix: true,
  helix_stage_number: 2,
  helix_step_key: "2-2",
  helix_evidence_type: "knowledge_capture",
  tags: ["documentation", "helix-process"],
  access_level: "project" // All project members can view
}
```

### 4. Step Completion Artifact Creation
When a Helix step completes (passes gate check), automatically create artifact(s):

**Step 2.1 (Identify Documentation):**
- Type: Markdown artifact
- Filename: `documentation-inventory-{timestamp}.md`
- Content: Formatted inventory from evidence_data
- Include all categories and file count estimates

**Step 2.2 (Capture Knowledge):**
- Type: Markdown artifact
- Filename: `domain-knowledge-capture-{timestamp}.md`
- Content: All 8 sections formatted as markdown with headers
- Include timestamp and author

**Step 2.3 (Gather Documentation):**
- Type: File references (not a single file, but list)
- Create artifact metadata for each uploaded file
- Each file gets own artifact record with category tag
- Store reference in helix_steps.evidence_data

**Step 2.4 (Verify Documentation):**
- Type: Markdown artifact
- Filename: `verification-report-{timestamp}.md`
- Content: Verification summary, all gaps, acknowledgments
- Include statistics and status

### 5. Bidirectional Access
Enable Helix documentation accessible from Open Mode's Artifacts module:

**Changes to Artifacts UI:**
- Filter artifacts by "Helix Process" tag
- Show artifacts grouped by stage
- Show step name when viewing Helix artifact
- Link from artifact back to Helix step
- Prevent deletion of Helix artifacts from Open Mode (only from Helix)
- Show "Helix" badge on artifact cards

**Changes to Helix UI:**
- View step output from Helix (links to artifact view)
- Access Helix artifacts folder from Open Mode's Artifacts module
- Download any Helix artifact from Open Mode

### 6. Artifact Helper Functions
Create additional utilities in `lib/helix/artifacts.ts`:

```typescript
// Get all artifacts for a specific Helix stage
async function getStageArtifacts(
  projectId: string,
  stageNumber: number
): Promise<Artifact[]>

// Get artifact for specific step
async function getStepArtifact(
  projectId: string,
  stepKey: string
): Promise<Artifact | null>

// Delete Helix artifact (only from Helix, not from Open Mode)
async function deleteHelixArtifact(
  artifactId: string,
  projectId: string
): Promise<boolean>

// Get signed URL for artifact download
async function getArtifactDownloadUrl(
  artifactId: string,
  expirySeconds: number = 3600
): Promise<string>

// Convert evidence_data to markdown
function evidenceToMarkdown(
  evidence: Record<string, any>,
  stepName: string
): string
```

### 7. API Endpoints
Create endpoints to manage Helix artifacts:

```typescript
// POST /api/helix/artifacts
// Create artifact from step evidence
{
  projectId: string;
  stageNumber: number;
  stepKey: string;
  contentType: 'text' | 'markdown' | 'file';
  content: string | Buffer;
  filename: string;
}
// Returns: CreateHelixArtifactOutput

// GET /api/helix/artifacts?projectId=X&stageNumber=Y
// Get all artifacts for stage
// Returns: Artifact[]

// GET /api/helix/artifacts/:artifactId
// Get single artifact metadata
// Returns: Artifact

// DELETE /api/helix/artifacts/:artifactId
// Delete artifact (admin only)
// Returns: { success: boolean }

// GET /api/helix/artifacts/:artifactId/download
// Get signed download URL
// Returns: { download_url: string }
```

### 8. Markdown Conversion Utility
Create function to convert evidence_data to markdown:

```typescript
// lib/helix/artifacts.ts

function evidenceToMarkdown(
  evidence: Record<string, any>,
  stepName: string,
  stepKey: string
): string {
  // Return markdown string with metadata header and formatted content
  // Example output:
  /*
  # Domain Knowledge Capture - Step 2.2

  **Project:** [Project Name]
  **Step:** Step 2.2 - Capture Undocumented Knowledge
  **Created:** 2026-02-28 14:00 UTC
  **Created By:** Jane Doe

  ---

  ## Domain Knowledge

  This project helps product teams...

  ## Business Rules

  Rules include: 1) Only admins can...

  ...
  */
}
```

### 9. Integration Points

**When step completes (helix_steps table updated with gate_status = 'passed'):**
1. Check if artifact should be created
2. Call createHelixArtifact() with step evidence data
3. Update helix_steps.evidence_data with artifact_id reference
4. Create notification: "Documentation saved to project artifacts"

**When viewing completed step in Helix:**
1. Check for artifact_id in evidence_data
2. Show "View in Artifacts" link
3. Show preview of artifact (first 500 chars)
4. Show download button

**From Artifacts module (Open Mode):**
1. Filter to show Helix artifacts
2. Display with Helix badge and step info
3. Show breadcrumb: Project > Helix > Stage > Step
4. Link back to Helix step if user has access

### 10. Component Breakdown

#### File: `lib/helix/artifacts.ts`
```typescript
// Main artifact management functions
export async function createHelixArtifact(input): Promise<CreateHelixArtifactOutput>
export async function getStageArtifacts(projectId, stageNumber): Promise<Artifact[]>
export async function getStepArtifact(projectId, stepKey): Promise<Artifact | null>
export async function deleteHelixArtifact(artifactId, projectId): Promise<boolean>
export async function getArtifactDownloadUrl(artifactId, expirySeconds): Promise<string>
export function evidenceToMarkdown(evidence, stepName, stepKey): string
export function formatInventoryAsMarkdown(inventory, stepKey): string
export function formatKnowledgeCaptureAsMarkdown(knowledge, stepKey): string
export function formatVerificationAsMarkdown(verification, stepKey): string
```

#### File: `lib/helix/artifact-creation.ts`
```typescript
// High-level step completion handlers
export async function createInventoryArtifact(projectId, stepData)
export async function createKnowledgeArtifact(projectId, stepData)
export async function createFileListArtifact(projectId, stepData)
export async function createVerificationArtifact(projectId, stepData)
```

#### Files: API Routes
```
/api/helix/artifacts/
  ├── route.ts               (POST create, GET list)
  ├── [artifactId]/
  │   ├── route.ts           (GET, DELETE)
  │   └── download.ts        (GET signed URL)
  └── stages/
      └── [stageNumber]/
          └── route.ts       (GET all for stage)
```

## File Structure
```
/lib/helix/
  ├── artifacts.ts                      (Main artifact functions)
  ├── artifact-creation.ts              (Step-specific artifact creators)
  ├── artifact-config.ts                (Folder structure config)
  └── evidence-formatters.ts            (Convert evidence to markdown)

/api/helix/artifacts/
  ├── route.ts                          (POST/GET artifacts)
  ├── [artifactId]/
  │   ├── route.ts                      (GET/DELETE specific artifact)
  │   └── download.ts                   (GET download URL)
  └── stages/
      └── [stageNumber]/
          └── route.ts                  (GET stage artifacts)

/components/helix/
  └── ArtifactLink.tsx                  (Display artifact reference in step)
```

## Dependencies

### Database
- `artifacts` table (extended with helix fields)
- `helix_steps` table
- `projects` table

### Supabase
- Storage bucket: `helix-documentation` or `project-artifacts`
- Database access for artifacts table
- RLS policies for artifact access

### Libraries
- `uuid` - Generate artifact IDs
- `date-fns` - Format timestamps
- File handling libraries (already in Next.js)

### External APIs
- Supabase Storage API (already configured)
- Supabase Database API (already configured)

## Tech Stack
- **Backend:** Next.js API Routes, TypeScript
- **Database:** Supabase PostgreSQL
- **File Storage:** Supabase Storage
- **Utilities:** uuid, date-fns, node filesystem APIs

## Acceptance Criteria

1. **Folder Structure Created**: Helix folder structure auto-created in artifacts when project enters Helix Mode, with Stage/Step subfolders
2. **createHelixArtifact Works**: Function successfully creates artifact from evidence data, stores file, creates DB record, returns artifact metadata
3. **Evidence Conversion**: Evidence data correctly converts to markdown format with proper formatting and metadata headers
4. **Artifact Records Saved**: Artifacts table contains proper records with helix_stage_number, helix_step_key, is_helix=true flags
5. **Step Completion Creates Artifacts**: When step 2.1-2.4 complete, appropriate artifacts auto-created and artifact_id stored in evidence_data
6. **Bidirectional Access**: Artifacts visible in Open Mode Artifacts module with Helix badges and step info; can navigate from step to artifact
7. **Download Works**: Signed URLs generated correctly, files downloadable from both Helix and Open Mode
8. **File Organization**: Files stored in correct folder structure in Supabase Storage
9. **Error Handling**: API handles storage errors, DB errors, invalid inputs gracefully
10. **RLS Policies**: Artifacts only accessible to project members, proper access control enforced

## Testing Instructions

1. **Test Folder Structure Creation**
   - Complete Helix setup (Epic 1)
   - Check Supabase Storage bucket
   - Verify `projects/{projectId}/helix/1-Planning/` folder exists
   - Verify `projects/{projectId}/helix/2-Documentation/` folder exists
   - Verify Step subfolders created

2. **Test createHelixArtifact Function**
   - Call function with sample inventory evidence
   - Verify artifact created in Supabase Storage
   - Verify artifact record created in DB
   - Verify returned metadata includes artifact_id, file_path, storage_path
   - Verify file accessible via signed URL

3. **Test Evidence Markdown Conversion**
   - Pass inventory evidence to evidenceToMarkdown()
   - Verify output is valid markdown
   - Verify includes metadata header with step name, date, author
   - Verify includes all inventory categories
   - Verify formatting readable

4. **Test Artifact Auto-creation on Step Completion**
   - Complete step 2.1 (Identify Documentation)
   - Verify artifact created automatically
   - Verify artifact_id added to evidence_data
   - Check artifacts table for new record
   - Verify is_helix = true, helix_step_key = "2-1"

5. **Test Bidirectional Access**
   - Complete step 2.2 (creates artifact)
   - View step in Helix, verify artifact link visible
   - Click artifact link
   - Verify artifact viewer opens
   - Go to Open Mode Artifacts module
   - Filter by "Helix Process"
   - Verify step 2.2 artifact visible with Helix badge
   - Click artifact from Open Mode
   - Verify can navigate back to step

6. **Test File Organization in Storage**
   - Upload multiple files in step 2.3
   - Query Supabase Storage bucket structure
   - Verify files in: `projects/{projectId}/helix/2-Documentation/Step-2.3-Gathered-Files/`
   - Verify folder structure clean and organized

7. **Test Download URL Generation**
   - Call getArtifactDownloadUrl() with artifact ID
   - Verify returns valid signed URL
   - Verify URL accessible
   - Verify expires after set duration (3600 seconds default)
   - Test with custom expiry

8. **Test Delete Functionality**
   - Create artifact for step 2.1
   - Call deleteHelixArtifact()
   - Verify artifact record deleted from DB
   - Verify file deleted from Storage
   - Verify artifact no longer accessible

9. **Test API Endpoints**
   - POST /api/helix/artifacts - Create artifact
   - GET /api/helix/artifacts?projectId=X&stageNumber=2 - List stage artifacts
   - GET /api/helix/artifacts/{artifactId} - Get artifact metadata
   - GET /api/helix/artifacts/{artifactId}/download - Get download URL
   - DELETE /api/helix/artifacts/{artifactId} - Delete artifact

10. **Test Error Handling**
    - Try to create artifact with missing projectId
    - Try to download non-existent artifact
    - Try to delete artifact from non-owner user
    - Verify proper error messages returned
    - Verify graceful failure (no data corruption)

## Notes for AI Agent

### Implementation Guidance
- Use Supabase Storage SDK for file operations
- Create atomic transactions: store file, then DB record (or rollback)
- Use `createClient` from `@supabase/supabase-js` for both storage and database
- Implement proper error logging for storage/DB failures
- Use signed URLs with reasonable expiry (1 hour default, configurable)

### Folder Structure Config
```typescript
// lib/helix/artifact-config.ts
const HELIX_STAGES = [
  { number: 1, name: 'Planning' },
  { number: 2, name: 'Documentation' },
  { number: 3, name: 'Build-Planning' },
  { number: 4, name: 'Quality' },
];

const STAGE_STEPS = {
  1: [
    { key: '1-1', name: 'Define-Scope' },
    { key: '1-2', name: 'Clarify-Goals' },
    { key: '1-3', name: 'Identify-Risks' },
  ],
  2: [
    { key: '2-1', name: 'Documentation-Inventory' },
    { key: '2-2', name: 'Knowledge-Capture' },
    { key: '2-3', name: 'Gathered-Files' },
    { key: '2-4', name: 'Verification-Report' },
  ],
  // ... etc
};
```

### File Upload Best Practices
- Validate file before storing (MIME type, size)
- Generate unique filename with timestamp to prevent collisions
- Use project-scoped paths for data isolation
- Store file metadata in DB (size, type, uploader)
- Implement cleanup for orphaned files

### Markdown Generation
```typescript
function evidenceToMarkdown(evidence, stepName, stepKey): string {
  const header = `# ${stepName} - Step ${stepKey}\n\n`;
  const meta = `**Created:** ${new Date().toISOString()}\n\n`;
  const content = JSON.stringify(evidence, null, 2);
  return header + meta + content;
}
```

### Performance Considerations
- Lazy-load artifact list (pagination)
- Cache artifact URLs (but refresh before expiry)
- Use streams for large file uploads
- Index helix fields in artifacts table for fast queries

### Security Considerations
- Verify user has project access before allowing artifact operations
- Use Supabase RLS policies to enforce access control
- Sign URLs with limited expiry
- Don't expose storage paths directly to client
- Validate all inputs server-side

### Common Pitfalls
- Don't forget to update evidence_data with artifact_id
- Don't create duplicate artifacts if step already completed
- Don't expose internal storage paths in API responses
- Don't forget RLS policies (files should be private to project)
- Test with large files (> 10MB) before production

### Future Enhancements
- Artifact versioning (track changes to step outputs)
- Artifact collaboration (multiple users editing evidence)
- Automatic artifact generation from templates
- Artifact templates for each stage/step
- Integration with version control (store evidence in Git)

---

**Phase Author:** Helix Documentation Stage Design Team
**Version:** 1.0
**Last Updated:** 2026-02-28
**Status:** Ready for Implementation
