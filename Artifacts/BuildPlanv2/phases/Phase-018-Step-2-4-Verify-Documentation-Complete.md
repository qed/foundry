# Phase 018: Step 2.4 — Verify Documentation is Complete

## Phase Overview
**Stage:** Epic 3: Documentation Stage (Step 2.4)
**Phase:** 018
**Route:** `/org/[orgSlug]/project/[projectId]/helix/step/2-4/`
**Time Estimate:** 1-2 hours
**Complexity:** Medium-High

## Objective
Provide a structured review process to verify that all documentation identified in Step 2.1 has been gathered and uploaded in Step 2.3. This quality gate ensures complete documentation before proceeding to build planning, while allowing acknowledgment of intentional gaps.

## Prerequisites
- Phase 015 (Step 2.1) complete: Documentation inventory exists
- Phase 016 (Step 2.2) complete or in progress
- Phase 017 (Step 2.3) complete: Documentation files uploaded
- Supabase queries available to fetch inventory and file list

## Epic Context
Step 2.4 is the final step of Epic 3 (Documentation Stage). It completes the documentation gathering cycle by verifying that the inventory from step 2.1 has corresponding uploads in step 2.3. This prevents the build team from starting with incomplete documentation and identifies gaps early.

## Context
Documentation can fall through cracks:
- Some inventory categories identified but nothing uploaded
- Some categories marked as complete in inventory but files never gathered
- Partial uploads where only 1-2 files collected instead of all identified items
- Gaps that are intentional (will be provided later) vs. forgotten

Step 2.4 provides visual mapping between inventory and actual uploads, highlighting gaps, and requiring explicit acknowledgment of any gaps before the stage is considered complete.

## Detailed Requirements

### 1. Two-Column Review Layout
Create a side-by-side comparison:

**Left Column: Inventory from Step 2.1**
- Shows all 10 standard categories from inventory
- Shows all custom categories created in step 2.1
- For each category, displays:
  - Category name
  - Status from inventory: "Exists", "In Progress", "Unknown"
  - Location/notes from inventory
  - File count estimate from inventory

**Right Column: Actual Uploads from Step 2.3**
- Shows files organized by category
- For each category, displays:
  - File count actually uploaded
  - File names (list or count)
  - Total file size for category
  - Icons for each file type
- "No files uploaded" message for categories with 0 uploads

### 2. Gap Analysis Visualization
For each category, calculate and display gap status:
- **Green (Complete):** Inventory marked as exists AND files uploaded
- **Yellow (Partial):** Inventory marked as exists but fewer files than estimate
- **Red (Missing):** Inventory marked as exists but NO files uploaded
- **Gray (Not Checked):** Inventory marked as not exists or unknown (no action needed)

Each gap indicator is clickable to reveal "Acknowledge Gap" section.

### 3. Gap Acknowledgment
For each red or yellow gap, user must acknowledge with:
- **Checkbox:** "I acknowledge this gap"
- **Reason dropdown** with options:
  - "Will be resolved during planning"
  - "Not critical for build"
  - "Will be provided later"
  - "Was intentionally excluded"
  - "Other (please specify)"
- **Optional notes field** (100 chars) for custom reason
- Show reason selection alongside gap for quick review

All critical gaps (red/yellow) must be acknowledged before completing step.

### 4. Evidence Collection
Evidence object saved to helix_steps.evidence_data as jsonb:
```json
{
  "evidence_type": "documentation_verification",
  "created_at": "2026-02-28T18:00:00Z",
  "updated_at": "2026-02-28T18:00:00Z",
  "verification": {
    "total_categories": 12,
    "categories_complete": 8,
    "categories_partial": 2,
    "categories_missing": 2,
    "categories_not_applicable": 0,
    "all_gaps_acknowledged": true,
    "verification_status": "passed"
  },
  "category_gaps": [
    {
      "category_id": "specifications",
      "category_name": "Specifications",
      "inventory_status": "exists",
      "inventory_estimate": 5,
      "files_uploaded": 5,
      "gap_status": "complete",
      "acknowledged": false,
      "gap_reason": null
    },
    {
      "category_id": "mockups_wireframes",
      "category_name": "Mockups/Wireframes",
      "inventory_status": "exists",
      "inventory_estimate": 20,
      "files_uploaded": 5,
      "gap_status": "partial",
      "acknowledged": true,
      "gap_reason": "will_be_resolved_during_planning",
      "gap_notes": "Design team still creating detailed wireframes for dashboard"
    },
    {
      "category_id": "api_documentation",
      "category_name": "API Documentation",
      "inventory_status": "exists",
      "inventory_estimate": 3,
      "files_uploaded": 0,
      "gap_status": "missing",
      "acknowledged": true,
      "gap_reason": "will_be_provided_later",
      "gap_notes": "Backend team will provide API spec next week"
    }
  ],
  "completion_summary": "8 complete, 2 partial with acknowledged gaps, 2 intentional gaps acknowledged"
}
```

### 5. Minimum Viable Gate Requirement
- **Gate Block:** All red and yellow gaps must have "acknowledged" set to true
- Validation: Check all gaps have `acknowledged: true`
- Error message: "Please acknowledge all missing or incomplete documentation categories before completing this step"
- Visual indicator: Shows "X critical gaps remaining" count

### 6. Verification Summary Card
Display summary statistics:
- **Total Categories:** 12
- **Complete:** 8 (67%)
- **Partial:** 2 (with acknowledged gaps)
- **Missing:** 2 (with acknowledged gaps)
- **Overall Status:** "Ready for Build Planning" or "Gaps Acknowledged"
- Visual progress bar

### 7. UI/UX Details
- **Layout:** Two-column on desktop, stacked on mobile
- **Column widths:** 48% each with 4% gap
- **Gap indicators:** Color-coded dots/badges
- **Clickable gaps:** Shows acknowledgment form inline or modal
- **Sticky summary:** Top or bottom of page showing status
- **Export button:** Option to export verification report as PDF
- **Print friendly:** Layout preserves two-column in print

### 8. Component Breakdown

#### Page Component: `app/org/[orgSlug]/project/[projectId]/helix/step/2-4/page.tsx`
```typescript
// Route handler for step 2.4
// Loads evidence from step 2.1 (inventory) and 2.3 (files)
// Calculates gaps
// Renders DocumentationVerification component
// Handles form submission via POST /api/helix/steps/2-4
```

#### Component: `components/helix/DocumentationVerification.tsx`
```typescript
interface CategoryGap {
  category_id: string;
  category_name: string;
  inventory_status: 'exists' | 'in_progress' | 'unknown';
  inventory_estimate: number;
  files_uploaded: number;
  gap_status: 'complete' | 'partial' | 'missing' | 'not_applicable';
  acknowledged: boolean;
  gap_reason: string | null;
  gap_notes: string;
}

interface VerificationState {
  total_categories: number;
  category_gaps: CategoryGap[];
  all_gaps_acknowledged: boolean;
  save_status: 'idle' | 'saving' | 'saved' | 'error';
  verification_passed: boolean;
}

// Features:
// - Render two-column comparison
// - Calculate gap status for each category
// - Show acknowledgment UI for gaps
// - Track acknowledgment state
// - Display verification summary
```

#### Component: `components/helix/CategoryGapRow.tsx`
```typescript
interface CategoryGapRowProps {
  category_gap: CategoryGap;
  onAcknowledge: (category_id: string, acknowledged: boolean, reason: string, notes: string) => void;
}

// Features:
// - Render gap indicator
// - Display inventory info
// - Display upload info
// - Show acknowledgment form
// - Update parent state
```

#### Component: `components/helix/VerificationSummary.tsx`
```typescript
interface VerificationSummaryProps {
  total: number;
  complete: number;
  partial: number;
  missing: number;
  gaps_acknowledged: number;
}

// Features:
// - Display statistics
// - Show progress bar
// - Display overall status
// - Export verification report button
```

## File Structure
```
/app/org/[orgSlug]/project/[projectId]/helix/step/2-4/
  └── page.tsx                          (Step page wrapper)

/components/helix/
  ├── DocumentationVerification.tsx     (Main verification component)
  ├── CategoryGapRow.tsx                (Individual category comparison)
  ├── CategoryGapAcknowledgment.tsx     (Acknowledgment form)
  ├── VerificationSummary.tsx           (Summary statistics)
  └── VerificationExport.tsx            (Export to PDF button)

/lib/helix/
  ├── gap-calculation.ts                (Gap analysis logic)
  ├── gap-reason-config.ts              (Dropdown options)
  └── verification-helpers.ts           (Utility functions)

/api/helix/steps/
  └── 2-4/
      ├── route.ts                      (POST for saving verification)
      └── export.ts                     (GET for PDF export)
```

## Dependencies

### Database
- `helix_steps` table with evidence_data jsonb column (query steps 2.1 and 2.3)
- `helix_stage_gates` table for gate status

### API Endpoints
- `GET /api/helix/steps/2-1` - Retrieve inventory data
- `GET /api/helix/steps/2-3` - Retrieve uploaded files
- `POST /api/helix/steps/2-4` - Save verification evidence
- `GET /api/helix/steps/2-4` - Load existing verification
- `GET /api/helix/steps/2-4/export` - Export verification as PDF

### Libraries
- `jspdf` and `html2canvas` - PDF export
- `lucide-react` - Status icons (checkmark, alert, circle)
- React context or Zustand for state

### Components
- `StepDetailView` (parent container from Epic 2)
- Toast notification system
- Modal for detailed view (optional)

## Tech Stack
- **Frontend:** Next.js 16+ (App Router), TypeScript, React
- **Styling:** Tailwind CSS v4, CSS custom properties
- **Icons:** lucide-react
- **PDF Export:** jspdf, html2canvas
- **Database:** Supabase PostgreSQL
- **API:** Next.js API Routes

## Acceptance Criteria

1. **Two-Column Layout Displays**: Inventory (left) and uploaded files (right) display side-by-side on desktop, stacked on mobile
2. **Gap Analysis Calculates**: Each category shows correct gap status (green/yellow/red/gray) based on inventory vs. uploads
3. **Gap Indicators Show**: Color-coded badges/dots visible for each category, correct status displayed
4. **Acknowledgment Form Works**: Clicking gap shows acknowledgment form with checkbox, reason dropdown, optional notes
5. **All Gaps Blockable**: Form prevents completion until all red/yellow gaps have "acknowledged" checked
6. **Summary Statistics**: Displays correct totals (complete, partial, missing) and progress bar
7. **Evidence Saves Correctly**: Completed verification saves to evidence_data with proper jsonb structure
8. **Export Works**: Click export button generates PDF report with inventory, files, gaps, acknowledgments
9. **Mobile Responsive**: Form stacks properly on mobile, all fields interactive on touch devices
10. **Data Persists**: Existing verification loads on page refresh, all gap acknowledgments preserved

## Testing Instructions

1. **Test Two-Column Display**
   - Open step 2.4 page
   - Verify inventory displays in left column (from step 2.1)
   - Verify files display in right column (from step 2.3)
   - Verify both columns visible on desktop
   - Resize to mobile, verify stacked layout

2. **Test Gap Status Calculation**
   - Verify categories with inventory AND uploaded files show "complete" (green)
   - Verify categories with inventory but fewer files show "partial" (yellow)
   - Verify categories with inventory but NO files show "missing" (red)
   - Verify categories without inventory status show "not applicable" (gray)
   - Test with various file count scenarios

3. **Test Acknowledgment Form**
   - Click on "missing" (red) gap
   - Verify acknowledgment form appears with checkbox, dropdown, notes field
   - Select reason from dropdown
   - Type notes
   - Check acknowledgment checkbox
   - Verify form state updates
   - Refresh page, verify acknowledgment persists

4. **Test All Gaps Must Be Acknowledged**
   - Open verification with 1+ red/yellow gaps unacknowledged
   - Click "Complete Step" button
   - Verify error message: "Please acknowledge all missing or incomplete documentation categories"
   - Acknowledge all gaps
   - Verify error clears and step can complete

5. **Test Summary Statistics**
   - Verify summary displays correct counts
   - Verify math: complete + partial + missing + not applicable = total
   - Verify progress bar shows correct percentage
   - Verify status message changes based on gaps acknowledged

6. **Test Evidence Structure**
   - Complete step 2.4 with various gaps acknowledged
   - Query helix_steps table, examine evidence_data
   - Verify structure matches expected jsonb schema
   - Verify all acknowledged gaps have reason and notes
   - Verify timestamps correct

7. **Test PDF Export**
   - Click "Export Verification Report" button
   - Verify PDF downloads
   - Open PDF in viewer
   - Verify contains inventory, files, gap analysis, acknowledgments
   - Verify formatting readable in PDF

8. **Test Reason Dropdown Options**
   - Click gap acknowledgment form
   - Verify dropdown shows all 5 options
   - Select each option
   - Verify "Other" option shows notes field for custom reason

9. **Test Category Count Calculations**
   - Complete inventory with 10 standard + 2 custom = 12 categories
   - Upload files to 8 categories only
   - Verify summary shows: "8 complete, 4 missing"
   - Acknowledge 2 critical gaps
   - Verify summary updates

10. **Test Mobile Responsiveness**
    - Resize to mobile (375px width)
    - Verify two columns stack vertically
    - Verify all buttons and forms accessible
    - Verify gap acknowledgment form fits on screen
    - Test touch interactions on acknowledgment dropdowns

## Notes for AI Agent

### Implementation Guidance
- Create gap calculation function in `lib/helix/gap-calculation.ts`
- Compare inventory evidence (step 2.1) with files evidence (step 2.3)
- For each category in inventory, check if files uploaded
- Count files and compare to estimate (if estimate provided)
- Mark as: complete (exists + files), partial (exists + few files), missing (exists + no files)

### Gap Calculation Algorithm
```typescript
function calculateGaps(inventory, uploadedFiles): CategoryGap[] {
  return inventory.categories.map(category => {
    const files = uploadedFiles.filter(f => f.category === category.id);
    const fileCount = files.length;
    const estimated = category.file_count_estimate || 0;

    let status = 'not_applicable';
    if (category.exists) {
      if (fileCount >= estimated && estimated > 0) {
        status = 'complete';
      } else if (fileCount > 0) {
        status = 'partial';
      } else {
        status = 'missing';
      }
    }

    return {
      ...category,
      files_uploaded: fileCount,
      gap_status: status
    };
  });
}
```

### Acknowledgment State Management
- Track acknowledgments separately from categories (allows changes without losing other data)
- Store as map: `{ [category_id]: { acknowledged: boolean, reason: string, notes: string } }`
- Validate before save: all red/yellow gaps must have acknowledgments

### PDF Export
- Use `html2canvas` to capture rendered verification view
- Convert canvas to PDF with `jspdf`
- Include title, date, summary, full verification table
- Add project name and metadata to PDF

### Styling Notes
- Green: `text-green-600` with `bg-green-100`
- Yellow: `text-yellow-600` with `bg-yellow-100`
- Red: `text-red-600` with `bg-red-100`
- Gray: `text-gray-400` with `bg-gray-100`
- Use lucide-react icons: `CheckCircle2` (green), `AlertCircle` (yellow), `XCircle` (red), `Circle` (gray)

### Common Pitfalls
- Don't assume estimate = upload count (partial is OK if some files uploaded)
- Don't allow completion with unacknowledged gaps (strict validation)
- Don't lose acknowledgment data if page refreshed
- Don't show gaps for categories not marked as "exists" in inventory
- Account for categories added in step 2.1 after initial export
- Test with custom categories created in step 2.1

### Future Enhancements
- Gap resolution tracking (when will missing docs be provided)
- Automatic email reminders for missing documentation
- Integration with project timeline (when will gaps be filled by when)
- Risk assessment based on missing documentation
- Template recommendations for missing documentation types
- Batch gap acknowledgment (acknowledge multiple at once)

---

**Phase Author:** Helix Documentation Stage Design Team
**Version:** 1.0
**Last Updated:** 2026-02-28
**Status:** Ready for Implementation
