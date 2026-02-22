# Phase 043 - Pattern Shop Document Versioning

## Objective
Implement automatic version history for requirements documents with point-in-time snapshots, version comparison (diff view), and one-click restore to previous versions.

## Prerequisites
- Requirements Document Editor (Phase 034)
- Feature Requirements Document (Phase 033)
- Product Overview (Phase 028)
- Requirement versions table (Phase 026 schema)

## Context
Teams iterate on requirements multiple times. Version history provides accountability (who changed what when), enables recovery from accidental edits, and documents the evolution of requirements. Versions are created automatically, not on every keystroke (to avoid spam), but on significant saves.

## Detailed Requirements

### Automatic Version Creation

**Trigger:**
- User stops editing for 30 seconds (auto-save triggered)
- User explicitly clicks "Save" (if button exists)
- Content has meaningfully changed (diff > threshold)

**Content Threshold:**
- Create version if:
  - Content change > 10 characters (typo fixes don't create versions)
  - Sections added/removed
  - Major structural change

**Implementation:**
```typescript
async function saveDocumentWithVersioning(
  docId: string,
  newContent: string,
  previousContent: string
) {
  // Check if change is significant
  const diff = calculateDiff(previousContent, newContent);
  const isSignificant = diff.additions + diff.deletions > 10;

  // Update document
  await updateRequirementsDocument(docId, { content: newContent });

  // Create version if significant change
  if (isSignificant) {
    const previousVersion = await getLatestVersion(docId);
    const newVersion = previousVersion.version_number + 1;

    await createVersion(docId, {
      version_number: newVersion,
      content: newContent,
      created_by: auth.user().id,
      change_summary: generateAutoSummary(previousContent, newContent),
    });
  }
}
```

**Auto-Generated Summary:**
Based on diff:
- "Added section: Acceptance Criteria"
- "Removed 3 paragraphs"
- "Updated requirements (15 lines added, 8 removed)"
- "Edited title and description"

### Version History Panel

**Location:**
- Collapsible panel in center panel (right side of editor) or modal
- Toggle button: "Version History" or clock icon

**Display:**
```
┌─ Version History ─────────────────────┐
│ Current (unsaved changes)             │
│ [This button appears if unsaved]      │
│                                       │
│ v5  Feb 20, 2:45 PM  (Current)       │
│     by Sarah Chen                     │
│     Updated requirements (12 lines)   │
│     [View] [Restore] [Compare]       │
│                                       │
│ v4  Feb 20, 2:30 PM                  │
│     by John Smith                     │
│     Added section: Acceptance...     │
│     [View] [Restore] [Compare]       │
│                                       │
│ v3  Feb 19, 11:15 AM                 │
│     by Sarah Chen                     │
│     Initial requirements              │
│     [View] [Restore] [Compare]       │
│                                       │
│ [Show All Versions]                  │
└───────────────────────────────────────┘
```

**Per-Version Actions:**
1. **View:** Display that version's content in read-only view
2. **Restore:** Revert document to this version (creates new version noting restoration)
3. **Compare:** Show diff between this version and current/previous

### Version List Modal

Click "Show All Versions" or access from version panel:

```
┌─ Version History: Email Sign-up ──────────────┐
│ Total versions: 12                            │
│                                               │
│ [v12] Feb 20, 3:15 PM - Current             │
│ [v11] Feb 20, 3:00 PM - Sarah Chen         │
│ [v10] Feb 20, 2:45 PM - Sarah Chen         │
│ [v9]  Feb 20, 2:30 PM - John Smith         │
│ [v8]  Feb 19, 5:00 PM - Sarah Chen         │
│                                               │
│ [← Previous] [Page 1 of 3] [Next →]          │
│                                               │
│ [Close]                                       │
└───────────────────────────────────────────────┘
```

### Version Comparison (Diff View)

Click "Compare" on a version to show side-by-side or inline diff:

**Side-by-Side View:**
```
┌─ Compare: v3 → v4 ──────────────────────────┐
│ v3: Feb 19, 11:15 AM  │  v4: Feb 20, 2:30 PM │
│ Sarah Chen            │  John Smith          │
├──────────────────────┼──────────────────────┤
│ Overview             │ Overview             │
│ Describe the feature │ Describe the feature │
│                      │ and its benefits     │ (added)
│                      │                      │
│ Requirements:        │ Requirements:        │
│ - Email validation   │ - Email validation   │
│ - Confirm via email  │ - Confirm via email  │
│ - Resend email option│ - Resend email option│
│                      │                      │
│                      │ Acceptance Criteria: │ (added)
│                      │ - GIVEN valid email… │
└──────────────────────┴──────────────────────┘
```

**Inline Diff View:**
```
Overview
Describe the feature and its benefits [+added]

Requirements:
- Email validation
- Confirm via email
- Resend email option

[+Acceptance Criteria: (new section)
+- GIVEN valid email…
+- WHEN user…
+- THEN user is created…]
```

**Styling:**
- Additions: green background (#dcfce7)
- Deletions: red background with strikethrough (#fee2e2)
- Unchanged: gray (#f3f4f6)

### Restore to Previous Version

**Trigger:**
Click "Restore" on any version.

**Confirmation Dialog:**
```
Restore to version 3?

This will revert the document to:
"Initial requirements" (Feb 19, 11:15 AM by Sarah Chen)

Current changes will be lost unless you save separately.

[Cancel] [Restore]
```

**On Restore:**
1. Set document content to version content
2. Create new version row:
   - `version_number` = latest + 1
   - `content` = restored content
   - `change_summary` = "Restored to v3 (Initial requirements)"
3. Refresh editor with restored content
4. Show toast: "Restored to version 3"
5. Version history updates with new "restored" version

### Version Metadata

Each version stores:
- `version_number` (INT, sequential)
- `content` (TEXT, full content)
- `created_by` (UUID, user who triggered save)
- `created_at` (TIMESTAMP)
- `change_summary` (VARCHAR, auto-generated or user-provided)

### Retention Policy

Keep all versions indefinitely (cost of storage is low). Optional: implement cleanup after 90 days or limit to 50 most recent versions.

## Database Schema

Uses Phase 026 `requirement_versions` table:

```sql
CREATE TABLE IF NOT EXISTS requirement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_doc_id UUID NOT NULL REFERENCES requirements_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_summary VARCHAR(500),
  UNIQUE(requirement_doc_id, version_number)
);
```

## API Routes

### GET /api/requirements-documents/[docId]/versions
Fetch version history for a document.

**Query Parameters:**
- `docId` (required): Document UUID
- `limit` (optional, default 20): Number of versions to fetch
- `offset` (optional, default 0): Pagination offset

**Response (200 OK):**
```json
{
  "total": 12,
  "versions": [
    {
      "id": "version-uuid",
      "version_number": 12,
      "content": "<h1>Email Sign-up</h1>...",
      "created_by": {
        "id": "user-uuid",
        "name": "Sarah Chen",
        "email": "sarah@example.com"
      },
      "created_at": "2025-02-20T14:45:00Z",
      "change_summary": "Updated requirements (15 lines added)"
    }
  ]
}
```

### GET /api/requirements-documents/[docId]/versions/[versionNumber]
Fetch a specific version.

**Response (200 OK):**
```json
{
  "id": "version-uuid",
  "version_number": 3,
  "content": "<h1>Initial requirements</h1>...",
  "created_by": {...},
  "created_at": "2025-02-19T11:15:00Z"
}
```

### POST /api/requirements-documents/[docId]/versions
Create a new version (manual save with summary).

**Body:**
```json
{
  "content": "<h1>Email Sign-up</h1>...",
  "change_summary": "Clarified acceptance criteria"
}
```

**Response (201 Created):**
```json
{
  "id": "version-uuid",
  "version_number": 13,
  "created_at": "2025-02-20T14:50:00Z"
}
```

### POST /api/requirements-documents/[docId]/versions/[versionNumber]/restore
Restore document to specified version.

**Response (200 OK):**
```json
{
  "restored_version": 3,
  "new_version": 13,
  "change_summary": "Restored to v3 (Initial requirements)"
}
```

### GET /api/requirements-documents/versions/compare
Compare two versions.

**Query Parameters:**
- `docId` (required): Document UUID
- `from` (required, int): From version number
- `to` (required, int): To version number
- `format` ('side-by-side', 'inline'): Diff format

**Response (200 OK):**
```json
{
  "from": 3,
  "to": 4,
  "format": "inline",
  "diff": [
    {
      "type": "context",
      "lines": ["Overview", "Describe the feature"]
    },
    {
      "type": "addition",
      "lines": ["and its benefits"]
    },
    {
      "type": "context",
      "lines": ["Requirements:"]
    }
  ]
}
```

## UI Components

### VersionHistoryPanel Component
**Path:** `/components/PatternShop/VersionHistoryPanel.tsx`

Collapsible panel showing recent versions.

```typescript
interface VersionHistoryPanelProps {
  docId: string;
  onRestore: (versionNumber: number) => Promise<void>;
  onCompare: (fromVersion: number, toVersion: number) => void;
}

export default function VersionHistoryPanel({
  docId,
  onRestore,
  onCompare,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      fetchVersionHistory(docId, 5).then(setVersions).finally(() => setLoading(false));
    }
  }, [expanded, docId]);

  return (
    <div className="border-t border-gray-200 pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 font-semibold text-gray-900 mb-2"
      >
        <Clock size={16} />
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Version History
      </button>

      {expanded && (
        <div className="space-y-2 text-sm">
          {loading ? (
            <div className="text-gray-500">Loading versions...</div>
          ) : (
            <>
              {versions.map((version, index) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isCurrent={index === 0}
                  onRestore={onRestore}
                  onCompare={onCompare}
                  nextVersion={versions[index + 1]}
                />
              ))}

              {versions.length >= 5 && (
                <button
                  onClick={() => {
                    /* Show all versions modal */
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Show All Versions
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

### VersionItem Component
**Path:** `/components/PatternShop/VersionItem.tsx`

Individual version in history list.

```typescript
interface VersionItemProps {
  version: Version;
  isCurrent: boolean;
  onRestore: (versionNumber: number) => Promise<void>;
  onCompare: (fromVersion: number, toVersion: number) => void;
  nextVersion?: Version;
}

export default function VersionItem({
  version,
  isCurrent,
  onRestore,
  onCompare,
  nextVersion,
}: VersionItemProps) {
  const [expanding, setExpanding] = useState(false);

  return (
    <div className={`p-3 rounded border ${isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            v{version.version_number}
            {isCurrent && <span className="ml-2 text-xs text-blue-600">(Current)</span>}
          </p>
          <p className="text-xs text-gray-500">
            {formatTime(version.created_at)} by {version.created_by.name}
          </p>
          {version.change_summary && (
            <p className="text-xs text-gray-600 mt-1">{version.change_summary}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            /* Show version content modal */
          }}
          className="text-xs px-2 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
        >
          View
        </button>

        {!isCurrent && (
          <button
            onClick={() => onRestore(version.version_number)}
            disabled={expanding}
            className="text-xs px-2 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
          >
            Restore
          </button>
        )}

        {nextVersion && (
          <button
            onClick={() => onCompare(nextVersion.version_number, version.version_number)}
            className="text-xs px-2 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
          >
            Compare
          </button>
        )}
      </div>
    </div>
  );
}
```

### VersionCompareModal Component
**Path:** `/components/PatternShop/VersionCompareModal.tsx`

Side-by-side or inline diff view.

## File Structure
```
components/PatternShop/
  VersionHistoryPanel.tsx     (version history panel)
  VersionItem.tsx             (individual version)
  VersionCompareModal.tsx     (diff view)
  VersionListModal.tsx        (all versions list)

lib/
  versioning/
    diff.ts                   (diff generation)
    summary.ts                (auto-summary generation)
  api/
    versions.ts               (API client)

app/api/requirements-documents/
  [docId]/
    versions/
      route.ts                (GET versions, POST create)
      [versionNumber]/
        route.ts              (GET specific version)
        restore/
          route.ts            (POST restore)
  versions/
    compare/
      route.ts                (GET diff)
```

## Acceptance Criteria
- [ ] Version created automatically on significant content change (>10 characters)
- [ ] Version number sequential (1, 2, 3...)
- [ ] Version metadata (user, timestamp, summary) captured
- [ ] Version History panel displays 5 most recent versions
- [ ] Click "View" shows version content in read-only modal
- [ ] Click "Restore" restores document and creates new version
- [ ] Restore confirmation dialog shown
- [ ] Click "Compare" shows side-by-side diff
- [ ] Diff clearly highlights additions (green) and deletions (red)
- [ ] "Show All Versions" opens paginated list
- [ ] GET /api/requirements-documents/[docId]/versions returns versions
- [ ] POST /api/requirements-documents/[docId]/versions/[versionNumber]/restore works
- [ ] GET /api/requirements-documents/versions/compare returns diff

## Testing Instructions

1. **Test auto-version creation:**
   - Edit FRD, add 20+ characters
   - Wait 30 seconds for auto-save
   - Check database: new version_row created
   - Verify version_number incremented

2. **Test version history panel:**
   - Create 5+ versions
   - Click "Version History" to expand
   - Verify 5 most recent shown
   - Verify timestamp, user, summary visible

3. **Test view version:**
   - Click "View" on a version
   - Verify modal shows that version's content
   - Verify content is read-only

4. **Test restore:**
   - Click "Restore" on version 3
   - Confirm dialog appears
   - Click Restore
   - Verify document reverts to v3
   - Verify new version created (v5 or next)
   - Verify summary says "Restored to v3"

5. **Test compare:**
   - Click "Compare" between v3 and v4
   - Verify side-by-side diff shows
   - Verify additions highlighted in green
   - Verify deletions highlighted in red

6. **Test API:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/requirements-documents/doc-id/versions"
   ```
   Verify returns version list.

## Dependencies
- Phase 026: Database schema (requirement_versions table)
- Phase 033: Feature Requirements Document
- Phase 034: Requirements editor
