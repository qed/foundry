# Phase 100 - Artifact Search & Indexing

## Objective
Implement full-text search across artifact filenames and extracted text content using PostgreSQL's tsvector, enabling users to find artifacts quickly and allowing agents to access artifact content.

## Prerequisites
- Phase 097 (Artifact Upload UI) completed
- Phase 096 (Artifacts Schema) completed
- PostgreSQL full-text search knowledge
- Text extraction libraries configured

## Context
Users need to search through potentially hundreds of uploaded artifacts efficiently. Extracted text from documents enables searching content, not just filenames. Agents should be able to access and query artifacts via tool calls during conversations.

## Detailed Requirements

### Text Extraction on Upload

#### Supported Extraction
- `.pdf` → PDF parser (pdfjs-dist or similar)
- `.docx` → DOCX parser (docx-parser library)
- `.md` → Direct text content
- `.txt` → Direct text content
- `.png`, `.jpg` → Placeholder text (filename + "Image file")
- `.csv` → CSV parser → plain text
- Audio files → Transcription (future enhancement, Phase TBD)

#### Extraction Process
```
1. File uploaded via Phase 097 (UploadZone)
2. Create artifact record with processing_status = 'extracting_text'
3. Queue text extraction job (async)
4. Parse file based on type using appropriate library
5. Truncate extracted text to 500KB max
6. Update artifact.content_text and processing_status = 'complete'
7. Update tsvector index automatically via trigger
```

#### Database Changes
```sql
-- Add processing_status column to artifacts table
ALTER TABLE artifacts
ADD COLUMN processing_status VARCHAR(20) DEFAULT 'complete',
ADD CONSTRAINT processing_status_enum
  CHECK (processing_status IN ('pending', 'extracting_text', 'complete', 'failed'));

-- Create trigger to update tsvector on content_text changes
CREATE OR REPLACE FUNCTION update_artifacts_tsvector()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_text IS NOT NULL THEN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.content_text, ''));
  ELSE
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifacts_tsvector_update
BEFORE INSERT OR UPDATE ON artifacts
FOR EACH ROW
EXECUTE FUNCTION update_artifacts_tsvector();

-- Add GIN index on tsvector for fast full-text search
ALTER TABLE artifacts
ADD COLUMN search_vector TSVECTOR;

CREATE INDEX idx_artifacts_search_vector ON artifacts USING GIN(search_vector);
```

### Search Index Strategy

#### PostgreSQL Full-Text Search
```sql
-- Simple query example
SELECT * FROM artifacts
WHERE search_vector @@ plainto_tsquery('english', 'design system')
ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'design system')) DESC;

-- With ranking weight
SELECT *,
  ts_rank_cd(search_vector, query) as rank
FROM artifacts,
  plainto_tsquery('english', 'brand') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Search UI

#### Search Bar in Artifacts Browser
- Located above artifact list
- Real-time search (debounced 300ms)
- Shows result count: "47 artifacts found"
- Clear button to reset search
- Search terms highlighted in results

#### Advanced Search (Optional Future)
```
- Filter by: file_type, upload_date range, uploaded_by user
- Current implementation: basic text search
```

### Agent Tool Integration

#### SearchArtifacts Tool
Agents can search artifacts via function calling:

```typescript
interface SearchArtifactsInput {
  project_id: string;
  query: string;
  folder_id?: string;
  limit?: number;
}

interface SearchArtifactsResult {
  artifacts: Array<{
    id: string;
    name: string;
    file_type: string;
    file_size: number;
    content_preview: string;  // First 200 chars of content_text
    relevance_score: number;
  }>;
  total_count: number;
  query_execution_time_ms: number;
}
```

#### ReadArtifact Tool
Agents can read full artifact content:

```typescript
interface ReadArtifactInput {
  artifact_id: string;
  project_id: string;
}

interface ReadArtifactResult {
  id: string;
  name: string;
  file_type: string;
  content_text: string;  // Full extracted text (up to 500KB)
  content_preview?: string;  // For binary files without extraction
}
```

## File Structure
```
src/
├── lib/
│   ├── artifacts/
│   │   ├── extraction.ts          (text extraction logic)
│   │   ├── search.ts              (search queries)
│   │   └── parsing/
│   │       ├── pdf-parser.ts
│   │       ├── docx-parser.ts
│   │       ├── csv-parser.ts
│   │       └── text-parser.ts
│   └── agent-tools/
│       └── artifacts.ts           (SearchArtifacts, ReadArtifact tools)
├── components/
│   └── artifacts/
│       └── SearchBar.tsx
├── app/api/
│   └── artifacts/
│       ├── search/
│       │   └── route.ts
│       └── [id]/
│           └── content/
│               └── route.ts
└── jobs/
    └── extraction-worker.ts       (async text extraction queue)
```

### Dependencies
```json
{
  "dependencies": {
    "pdfjs-dist": "^4.0.0",
    "docx-parser": "^2.0.0",
    "papaparse": "^5.4.0",
    "bulkjs": "^1.0.0"
  }
}
```

## API Routes

### POST /api/artifacts/search
Search artifacts by text:

```
Query params:
- project_id: string (required)
- query: string (required, min 2 chars)
- folder_id: string (optional)
- limit: number (optional, default 20, max 100)

Response:
{
  artifacts: [
    {
      id: string,
      name: string,
      file_type: string,
      file_size: number,
      content_preview: string,
      relevance_score: number,
      search_context: string  // sentence containing match
    }
  ],
  total_count: number,
  query_execution_time_ms: number
}

Errors:
- 400: Query too short or empty
- 401: Unauthorized
```

### GET /api/artifacts/[id]/content
Retrieve full extracted text content:

```
Response:
{
  id: string,
  name: string,
  file_type: string,
  content_text: string,
  processing_status: string,
  content_length: number
}

Errors:
- 404: Artifact not found
- 403: User not authorized
- 202: Content still extracting (no content_text yet)
```

## Text Extraction Implementation

### PDF Parser
```typescript
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument(buffer).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map((item: any) => item.str)
      .join(' ');
    text += '\n';
  }

  return text;
}
```

### DOCX Parser
```typescript
import { Document, Packer } from 'docx';
import mammoth from 'mammoth';

export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}
```

### CSV Parser
```typescript
import Papa from 'papaparse';

export async function extractCsvText(buffer: ArrayBuffer): Promise<string> {
  const csv = new TextDecoder().decode(buffer);
  const parsed = Papa.parse(csv);

  return parsed.data
    .map((row: any[]) => row.join(' | '))
    .join('\n');
}
```

## Acceptance Criteria
- [ ] Text extraction implemented for all supported file types
- [ ] PostgreSQL tsvector search_vector column created
- [ ] GIN index on search_vector for performance
- [ ] Trigger automatically updates tsvector on content change
- [ ] Search API returns results ordered by relevance
- [ ] Search results include content_preview (first 200 chars of match context)
- [ ] Search bar in artifacts browser functional
- [ ] Search debounced to 300ms for performance
- [ ] Advanced filters functional (folder, file_type)
- [ ] SearchArtifacts tool available to agents
- [ ] ReadArtifact tool available to agents
- [ ] Agents can search across project artifacts
- [ ] Agents can read full artifact content
- [ ] Text extraction handles files up to 50MB
- [ ] Extracted text truncated to 500KB max
- [ ] Processing status indicator shown during extraction
- [ ] Search with special characters doesn't break (SQL injection protection)
- [ ] Full-text search handles stemming and synonyms
- [ ] Performance: search queries complete in < 100ms
- [ ] All 5 modules can access search functionality

## Testing Instructions

### Text Extraction Tests
```typescript
// extraction.test.ts
describe('Text Extraction', () => {
  it('extracts text from PDF', async () => {
    const pdf = fs.readFileSync('test-files/sample.pdf');
    const text = await extractPdfText(pdf);
    expect(text).toContain('expected text from document');
  });

  it('extracts text from DOCX', async () => {
    const docx = fs.readFileSync('test-files/sample.docx');
    const text = await extractDocxText(docx);
    expect(text).toContain('expected text from document');
  });

  it('extracts text from CSV', async () => {
    const csv = fs.readFileSync('test-files/sample.csv');
    const text = await extractCsvText(csv);
    expect(text).toContain('|'); // CSV columns separated by pipes
  });

  it('handles text files directly', async () => {
    const txt = fs.readFileSync('test-files/sample.txt');
    const text = await extractTextFile(txt);
    expect(text.length).toBeGreaterThan(0);
  });
});
```

### Search Tests
```typescript
// search.test.ts
describe('Artifact Search', () => {
  it('searches by filename', async () => {
    const results = await searchArtifacts(projectId, 'brand');
    expect(results.artifacts.some(a => a.name.includes('brand'))).toBe(true);
  });

  it('searches by content_text', async () => {
    const results = await searchArtifacts(projectId, 'design system');
    expect(results.total_count).toBeGreaterThan(0);
  });

  it('ranks results by relevance', async () => {
    const results = await searchArtifacts(projectId, 'color');
    expect(results.artifacts[0].relevance_score).toBeGreaterThan(
      results.artifacts[1].relevance_score
    );
  });

  it('filters by folder', async () => {
    const results = await searchArtifacts(projectId, 'design', folderId);
    results.artifacts.forEach(a => {
      expect(a.folder_id).toBe(folderId);
    });
  });
});
```

### Integration Tests
```bash
# Search artifacts
curl "http://localhost:3000/api/artifacts/search?project_id={project-id}&query=brand"

# Get artifact content
curl http://localhost:3000/api/artifacts/{artifact-id}/content

# Test with special characters (SQL injection prevention)
curl "http://localhost:3000/api/artifacts/search?project_id={project-id}&query=test'; DROP TABLE artifacts;--"
```

### Manual Testing
1. Upload PDF with text content
2. Wait for extraction to complete (check processing_status)
3. Open artifacts browser, search for word in document
4. Verify artifact appears in results with preview
5. Upload DOCX file and test search
6. Upload CSV file and test search
7. Search for phrase across multiple artifacts
8. Verify result ranking by relevance
9. Test search in all modules' artifact browsers
10. Test agent SearchArtifacts tool in chat
11. Test agent ReadArtifact tool to get full content
12. Verify SQL injection prevention with special characters search
