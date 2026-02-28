# Phase 015: Step 2.1 — Identify Available Documentation

## Phase Overview
**Stage:** Epic 3: Documentation Stage (Step 2.1)
**Phase:** 015
**Route:** `/org/[orgSlug]/project/[projectId]/helix/step/2-1/`
**Time Estimate:** 1-2 hours
**Complexity:** Medium

## Objective
Enable project champions to create a structured inventory of all existing project documentation. This provides a comprehensive baseline of what documentation exists, where it's located, and what gaps need to be filled during the Documentation Stage.

## Prerequisites
- Epic 1 complete: Mode toggle, helix_steps/helix_stage_gates tables, sidebar
- Epic 2 complete: Step pages for steps 1.1-1.3, StepDetailView component, navigation
- User has access to project in Open Mode
- User role has at least "collaborator" permissions
- Project has been activated in Helix Mode (Stage 1 complete)

## Epic Context
Part of Epic 3: Documentation Stage, which captures all project knowledge and documentation before build planning begins. Step 2.1 starts the inventory process by cataloging what documentation already exists, setting the foundation for steps 2.2-2.4.

## Context
Many projects have scattered documentation across multiple locations and formats. Before the team can effectively plan and build, they need a complete picture of:
- What documentation already exists
- Where it's located
- What format it's in
- Which documentation categories are covered or missing

Step 2.1 provides a structured checklist that guides champions through standard documentation categories and allows custom additions. The inventory becomes the basis for step 2.3 (gathering docs) and step 2.4 (verification).

## Detailed Requirements

### 1. Documentation Inventory Form
Build a comprehensive checklist form with standard documentation categories. Each category has:
- **Checkbox** to mark "exists" or "in progress"
- **Location/Notes field** (text input, 200 chars) to specify where docs are stored or any notes
- **File count estimate** (number input) for rough count of files/items in that category

**Standard Categories (all required to display):**
1. Specifications - Technical specs, feature specs, API contracts
2. Mockups/Wireframes - UI/UX mockups, wireframes, design explorations
3. Meeting Notes - Meeting transcripts, decision logs, sprint reviews
4. Existing Code - Current codebase, reference implementations
5. Prior Prototypes - Proof-of-concept code, prior attempts, experiments
6. User Research - User interviews, feedback, personas, user testing results
7. API Documentation - API specs, endpoints, integration guides
8. Design Files - Figma, Adobe XD, design system files
9. Business Requirements - Product requirements docs, business logic, success metrics
10. Other - Custom/miscellaneous documentation

### 2. Custom Category Addition
- Button: "Add Custom Category"
- Modal or inline form to add custom category with:
  - Category name (text input, max 50 chars)
  - Description (optional, max 100 chars)
  - Can add up to 5 custom categories per project
- Custom categories display below standard categories
- Can delete custom categories (removes associated entries)

### 3. Form Behavior
- All fields optional except the category existence checkbox
- Each category row displays in a card-like layout
- Unchecked categories can still have notes/count added (soft state)
- Visual feedback: green checkmark when checkbox is checked
- Form auto-saves after 2-second debounce on any field change
- Toast notification: "Inventory saved" on successful save
- Save button visible and always enabled for manual save

### 4. Evidence Collection
Evidence object saved to helix_steps.evidence_data as jsonb:
```json
{
  "inventory_type": "documentation_inventory",
  "created_at": "2026-02-28T10:30:00Z",
  "updated_at": "2026-02-28T10:30:00Z",
  "categories": [
    {
      "category_id": "specifications",
      "category_name": "Specifications",
      "exists": true,
      "location_notes": "Stored in Notion workspace under 'Technical Specs' folder",
      "file_count_estimate": 12,
      "is_custom": false
    },
    {
      "category_id": "custom_brand_guidelines",
      "category_name": "Brand Guidelines",
      "exists": true,
      "location_notes": "Design team Figma file + PDF in Google Drive",
      "file_count_estimate": 3,
      "is_custom": true
    }
  ],
  "total_categories_checked": 6,
  "custom_categories_count": 1,
  "completion_percentage": 60
}
```

### 5. Minimum Viable Gate Requirement
- **Gate Block:** At least 1 category must be marked as "exists"
- Error message: "Please identify at least one existing documentation category before advancing"
- Prevents submission of completely empty inventory (ensures user has explored project)

### 6. UI/UX Details
- Layout: Two-column responsive (single column on mobile)
- Left column: category list with checkboxes
- Right column: location/count fields for selected category (form builder pattern)
- Use CSS variables: bg-primary, bg-secondary, accent-cyan for borders on "checked" categories
- Icon support: Use document/folder icons from lucide-react for each category
- Toast messages with 4-second duration
- Sticky header with step title, progress indicator, save status

### 7. Component Breakdown

#### Page Component: `app/org/[orgSlug]/project/[projectId]/helix/step/2-1/page.tsx`
```typescript
// Route handler for step 2.1
// Loads existing evidence from helix_steps
// Renders DocumentationInventory component
// Handles form submission via POST /api/helix/steps/2-1
```

#### Component: `components/helix/DocumentationInventory.tsx`
```typescript
interface DocumentationCategory {
  category_id: string;
  category_name: string;
  exists: boolean;
  location_notes: string;
  file_count_estimate: number;
  is_custom: boolean;
}

interface InventoryState {
  categories: DocumentationCategory[];
  custom_categories: DocumentationCategory[];
  save_status: 'idle' | 'saving' | 'saved' | 'error';
}

// Features:
// - Render 10 standard categories
// - Add/remove custom categories
// - Auto-save with debounce
// - Real-time validation
// - Visual feedback for each category
```

## File Structure
```
/app/org/[orgSlug]/project/[projectId]/helix/step/2-1/
  └── page.tsx                          (Step page wrapper, data fetching)

/components/helix/
  ├── DocumentationInventory.tsx         (Main form component)
  ├── CategoryChecklistItem.tsx          (Individual category row)
  └── AddCustomCategoryModal.tsx         (Modal for custom categories)

/lib/helix/
  └── documentation-inventory.ts        (Utility functions for category data)

/api/helix/steps/
  └── 2-1/
      └── route.ts                       (POST endpoint for saving inventory)
```

## Dependencies

### Database
- `helix_steps` table with evidence_data jsonb column
- `helix_stage_gates` table for gate status tracking

### API Endpoints
- `POST /api/helix/steps/2-1` - Save inventory data
- `GET /api/helix/steps/2-1` - Retrieve existing inventory (auto-load on page)

### UI Components
- `StepDetailView` (parent container from Epic 2)
- Form input components (text, number, checkbox)
- Modal system (for custom categories)
- Toast notification system

### Libraries
- `lucide-react` - Icons for categories
- `react-hook-form` or native state management for form
- `zustand` or React context for Helix state

## Tech Stack
- **Frontend:** Next.js 16+ (App Router), TypeScript, React
- **Styling:** Tailwind CSS v4, CSS custom properties
- **Icons:** lucide-react
- **Database:** Supabase PostgreSQL (helix_steps, helix_stage_gates)
- **Form State:** React Hook Form or native useState
- **API:** Next.js API Routes

## Acceptance Criteria

1. **Inventory Form Displays**: All 10 standard documentation categories display in a structured list with checkbox, location field, and file count input
2. **Custom Categories Work**: User can add up to 5 custom categories, each displays in same format as standard categories, custom categories can be deleted
3. **Form Auto-saves**: Changes to any field trigger auto-save after 2-second debounce, "Inventory saved" toast appears on success
4. **Evidence Structure**: Completed inventory saves to helix_steps.evidence_data as properly formatted jsonb with all fields
5. **Minimum Gate Check**: Form blocks submission if no categories are marked as "exists", shows appropriate error message
6. **Visual Feedback**: Checked categories show visual indicator (green checkmark, highlight, or border), unchecked categories appear neutral
7. **Responsive Design**: Form displays properly on mobile (single column), tablet (stacked), and desktop (two columns)
8. **Data Persistence**: Existing inventory loads on page refresh, manual save button works if auto-save disabled
9. **Field Validation**: Location field limits to 200 chars with counter, file count accepts only positive numbers
10. **User Guidance**: Each category has hover tooltip or small icon explaining what docs belong in that category

## Testing Instructions

1. **Test Auto-save**
   - Open step 2.1 page
   - Check a category checkbox
   - Wait 2 seconds, verify toast notification appears
   - Refresh page, verify checkbox remains checked

2. **Test Custom Categories**
   - Click "Add Custom Category" button
   - Enter custom name: "API Integration Patterns"
   - Submit modal
   - Verify new category appears below standard categories
   - Add location/count data
   - Delete custom category, verify removed from form and saved state

3. **Test Minimum Gate Check**
   - Open step with empty inventory
   - Click "Next" or "Complete Step" button
   - Verify error message appears: "Please identify at least one existing documentation category before advancing"
   - Check one category
   - Verify error clears and step can be completed

4. **Test Data Persistence**
   - Fill out multiple categories with location notes
   - Click manual save button
   - Refresh page
   - Verify all data persists
   - Check browser localStorage/sessionStorage for any temporary state

5. **Test Evidence Format**
   - Complete inventory with various categories
   - Open browser dev tools and query helix_steps table
   - Verify evidence_data jsonb matches expected structure
   - Verify timestamps included
   - Verify custom_categories_count field accurate

6. **Test Mobile Responsive**
   - Resize browser to mobile width (320px)
   - Verify form stacks to single column
   - Verify all fields visible and interactive
   - Verify custom category button accessible
   - Test touch interactions (checkbox taps, text input focus)

7. **Test Field Constraints**
   - Try to enter 300+ characters in location field
   - Verify cut off at 200 with char counter
   - Try to enter negative number in file count
   - Verify rejected or auto-corrected to 0
   - Try to add 6th custom category
   - Verify button disables or shows error limit reached

8. **Test Category Icons**
   - Verify each category displays appropriate icon (document, folder, meeting, code, etc.)
   - Verify icons match icon names in code
   - Test icon colors match CSS variables (accent-cyan for checked, text-primary for unchecked)

9. **Test Error Handling**
   - Simulate network failure during save (browser dev tools)
   - Verify error toast and retry option appear
   - Disable auto-save and manually save
   - Verify graceful error handling

10. **Test Integration with Step Navigation**
    - Complete step 2.1 with valid inventory
    - Verify "Complete" or "Next" button enables
    - Click next, verify navigation to step 2.2
    - Use back button, verify returning to step 2.1 preserves inventory

## Notes for AI Agent

### Implementation Guidance
- Use TypeScript strictly (no `any` types)
- Leverage React Hook Form for form management with auto-save hook using useCallback + debounce
- Store standard categories in a config file: `lib/helix/inventory-categories.ts`
- Implement debounce utility or use lodash.debounce
- Consider using optimistic UI updates for form fields before server confirmation
- Use Supabase client for database operations

### API Design
- Endpoint should validate inventory object shape before saving
- Return full inventory object on save for UI confirmation
- Include `updated_at` timestamp in response
- Handle concurrent edits gracefully (last-write-wins or merge strategy)

### Styling Notes
- Use `bg-secondary` for category card backgrounds
- Use `accent-cyan` for checkmark and hover states
- Use `text-primary` for labels
- Spacing: 16px between category rows
- Border radius: 8px for cards
- Transition: 200ms for color changes

### Common Pitfalls
- Don't auto-save without debounce (excessive API calls)
- Don't allow missing required fields from standard categories
- Don't allow duplicate custom category names
- Ensure custom categories can be edited after creation, not just deleted
- Test very long location notes text wrap properly

### Future Enhancements
- Link to actual documentation files (auto-detect URLs in location field)
- Integration with document scanning tools
- Bulk import inventory from CSV template
- Share inventory snapshot with team
- Historical tracking of inventory changes

---

**Phase Author:** Helix Documentation Stage Design Team
**Version:** 1.0
**Last Updated:** 2026-02-28
**Status:** Ready for Implementation
