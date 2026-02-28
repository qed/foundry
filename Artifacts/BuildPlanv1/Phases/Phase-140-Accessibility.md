# Phase 140: Accessibility Audit

## Objective
Ensure full keyboard navigation, ARIA labels, focus management, and WCAG AA color contrast across the entire application.

## Prerequisites
- All pages from Phases 001-139
- Tailwind CSS classes for focus states
- ARIA label support in components
- Screen reader (NVDA, JAWS, VoiceOver) for testing

## Context
Approximately 15% of users have disabilities. Accessible applications work for everyone, including those using keyboard navigation, screen readers, or voice controls. WCAG AA is the standard for accessible web applications.

## Detailed Requirements

### Keyboard Navigation
- **Tab Navigation:**
  - Tab key moves focus forward through interactive elements
  - Shift+Tab moves backward
  - Logical tab order (left-to-right, top-to-bottom)
  - Skip links or quick navigation for long pages
  - Focus visible at all times (focus ring/outline)

- **Enter/Space:**
  - Buttons respond to Space key
  - Checkboxes toggle with Space
  - Select dropdowns activate with Enter

- **Arrow Keys:**
  - Dropdowns: Arrow Up/Down to navigate options
  - Radio groups: Arrow Up/Down to switch selection
  - Lists: Arrow Up/Down to navigate items
  - Modals: Tab within modal only (focus trap)

- **Escape Key:**
  - Close modals/popovers
  - Cancel edit mode
  - Exit fullscreen

### Focus Management
- **Visual Focus Indicator:**
  - All interactive elements show focus ring
  - Focus ring color contrasts with background (WCAG AA)
  - Focus ring thickness ≥2px
  - Cannot be removed without alternative

```css
button:focus,
a:focus,
input:focus {
  outline: 2px solid #3b82f6; /* blue focus ring */
  outline-offset: 2px;
}
```

- **Focus Trap:**
  - Modals trap focus (Tab stays within modal)
  - Last element's Tab goes to first element
  - Only top-most modal is focusable

- **Focus Restoration:**
  - When modal closes, focus returns to triggering element
  - When navigation occurs, focus moves to main content

### ARIA Labels
- **Required ARIA Labels:**
  - Icon buttons: `aria-label="Button description"`
  - Form inputs: `<label htmlFor="inputId">`
  - Dynamic content regions: `aria-live="polite"` or `"assertive"`
  - Buttons with only icons: must have aria-label

- **Examples:**
  ```tsx
  // Icon button needs label
  <button aria-label="Delete idea">
    <TrashIcon />
  </button>

  // Form input needs label
  <label htmlFor="email">Email</label>
  <input id="email" type="email" />

  // Loading indicator
  <div aria-live="polite" aria-label="Loading ideas...">
    {isLoading ? <Spinner /> : null}
  </div>

  // Modal needs focus management
  <dialog
    ref={dialogRef}
    aria-labelledby="modalTitle"
    role="dialog"
    aria-modal="true"
  >
    <h2 id="modalTitle">Delete Idea</h2>
    {/* content */}
  </dialog>
  ```

### Semantic HTML
- Use semantic elements: `<button>`, `<a>`, `<form>`, `<nav>`, `<main>`, `<section>`
- Not `<div onclick="...">` for buttons
- Not `<span role="button">` unless necessary
- Tables use `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`

### Color Contrast (WCAG AA)
- **Standard Text:** min 4.5:1 contrast ratio
- **Large Text (18pt+):** min 3:1 contrast ratio
- **Non-text (icons, borders):** min 3:1 contrast ratio
- **Focus indicators:** min 3:1 contrast

- **Test Contrast:**
  - Chrome DevTools > Inspect > Color Picker
  - Or use online tools: WebAIM Contrast Checker

### Screen Reader Testing
- **Elements that need description:**
  - Images: `alt="descriptive text"`
  - Icon buttons: `aria-label="action"`
  - Form groups: `<fieldset>` + `<legend>`
  - Dynamic lists: `aria-live` regions
  - Error messages: associated with fields

- **Test with Screen Reader:**
  - Use NVDA (Windows, free)
  - Use JAWS (Windows, paid)
  - Use VoiceOver (Mac, free)
  - Use TalkBack (Android, free)
  - Use VoiceOver (iOS, free)

- **Screen Reader Experience:**
  - Read page top to bottom
  - Read all headings and list structure
  - Read form labels
  - Announce buttons and their state
  - Announce loading/error states
  - Read all table content with headers

### Form Accessibility
```tsx
export function AccessibleForm() {
  return (
    <form>
      {/* Fieldset for related inputs */}
      <fieldset>
        <legend>Project Visibility</legend>

        <div>
          <input
            id="private"
            type="radio"
            name="visibility"
            value="private"
          />
          <label htmlFor="private">Private</label>
        </div>

        <div>
          <input
            id="public"
            type="radio"
            name="visibility"
            value="public"
          />
          <label htmlFor="public">Public</label>
        </div>
      </fieldset>

      {/* Error message linked to field */}
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          aria-describedby="email-error"
        />
        {error && (
          <p id="email-error" className="text-red-600">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
```

### Dynamic Content
```tsx
// Loading state announcements
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {isLoading && 'Loading ideas...'}
  {error && 'Error loading ideas'}
</div>

// Toast notifications
<div
  role="status"
  aria-live="assertive"
  aria-atomic="true"
  className="toast"
>
  {message}
</div>

// List of items with aria-current
<nav>
  <a href="/hall" aria-current="page">Hall</a>
  <a href="/pattern-shop">Pattern Shop</a>
</nav>
```

### Page Structure
- **One Main Landmark:** `<main>` element
- **Navigation Landmark:** `<nav>` for main navigation
- **Headings Hierarchy:**
  - One H1 per page (page title)
  - H2 for major sections
  - H3 for subsections
  - Don't skip levels (H1 → H3 is wrong)

```tsx
export default function IdeasPage() {
  return (
    <main>
      <h1>Ideas</h1>

      <section>
        <h2>Filters</h2>
        {/* filters */}
      </section>

      <section>
        <h2>Ideas List</h2>
        {/* ideas */}
      </section>
    </main>
  );
}
```

### Images & Icons
- All images need alt text: `alt="descriptive text"`
- Decorative images: `alt=""` (empty)
- Icon buttons need aria-label
- SVG icons need `<title>` or aria-label

```tsx
// Good: descriptive alt text
<img
  src="architecture-diagram.png"
  alt="System architecture showing API layer, database, and frontend"
/>

// Good: decorative image with empty alt
<img src="decorative-spacer.png" alt="" />

// Good: icon button with label
<button aria-label="Download blueprint">
  <DownloadIcon />
</button>
```

### Links & Buttons
- Link text descriptive: "Learn more" bad, "Learn more about authentication" good
- Don't use "click here"
- Distinguish links from buttons (stylistically)
- Link href points to actual resource

```tsx
// Bad: non-descriptive link text
<a href="/docs">Click here</a>

// Good: descriptive link text
<a href="/docs/authentication">Read about authentication</a>

// Bad: button that looks like link
<a href="#" onclick="handleClick()" style={{ color: 'blue' }}>
  Submit
</a>

// Good: actual button
<button onClick={handleClick}>Submit</button>
```

### Testing Checklist
- [ ] Tab through entire app: all interactive elements accessible
- [ ] Shift+Tab works: goes backward through elements
- [ ] Tab order logical: left-to-right, top-to-bottom
- [ ] Focus ring visible on all interactive elements
- [ ] Modals trap focus
- [ ] All icon buttons have aria-labels
- [ ] All form inputs have labels
- [ ] All images have alt text
- [ ] Headings in proper hierarchy (no skipped levels)
- [ ] One <main> element per page
- [ ] All color contrast ≥4.5:1 (WCAG AA)
- [ ] Screen reader reads page correctly
- [ ] Loading states announced
- [ ] Error messages linked to fields
- [ ] Keyboard shortcuts documented (if any)
- [ ] Tables have headers and row associations
- [ ] Skip links present on pages

## File Structure
```
/app/components/Accessibility/SkipLinks.tsx
/app/components/Accessibility/FocusOutline.tsx
/app/components/Accessibility/AccessibleButton.tsx
/app/components/Accessibility/AccessibleFormField.tsx
/app/lib/accessibility/a11yUtils.ts
/app/styles/accessibility.css
```

## Acceptance Criteria
- [ ] All pages fully navigable with keyboard (Tab, Shift+Tab)
- [ ] All interactive elements in logical tab order
- [ ] Focus ring visible and sufficient contrast
- [ ] All icon buttons have aria-labels
- [ ] All form inputs have associated labels
- [ ] Dynamic content uses aria-live
- [ ] No color contrast issues (WCAG AA)
- [ ] All images have appropriate alt text
- [ ] Page structure uses semantic HTML
- [ ] One H1 per page, proper heading hierarchy
- [ ] One <main> landmark per page
- [ ] <nav> used for main navigation
- [ ] Modals trap focus and restore on close
- [ ] Screen reader reads all content
- [ ] Forms announce errors
- [ ] Tables have headers
- [ ] Skip links present
- [ ] Lighthouse accessibility audit score ≥95
- [ ] WAVE accessibility audit no errors

## Testing Instructions
1. **Keyboard Navigation:**
   - Press Tab key repeatedly
   - Verify focus moves through elements
   - Verify order is logical
   - Go through entire app with only keyboard
   - Verify all functions accessible

2. **Focus Ring:**
   - Tab to any button
   - Verify blue focus ring visible around button
   - Tab to input field
   - Verify focus ring visible
   - Tab to link
   - Verify focus ring visible

3. **Tab Order:**
   - Inspect page with DevTools
   - Check tab order visually
   - No elements skipped in expected order

4. **Modals:**
   - Open any modal
   - Press Tab repeatedly
   - Verify focus doesn't leave modal
   - Last element's Tab goes to first element
   - Press Escape
   - Verify modal closes
   - Verify focus returns to triggering button

5. **Screen Reader Testing (NVDA on Windows):**
   - Download NVDA (free)
   - Open Helix Foundry
   - Start NVDA (Insert+N or start screen reader)
   - Listen to page read aloud
   - Verify all content readable
   - Verify buttons announced as buttons
   - Verify links announced as links
   - Verify form labels read
   - Press H to navigate by heading
   - Verify headings in proper hierarchy

6. **Image Alt Text:**
   - View page source (Ctrl+U)
   - Search for `<img` tags
   - Verify all have alt attribute
   - Verify alt text descriptive
   - Decorative images should have alt=""

7. **Color Contrast:**
   - In DevTools, Inspect any text
   - Click color swatch
   - Open "Contrast" section
   - Verify ratio ≥4.5:1 (WCAG AA)
   - Check on dark and light themes
   - Check focus ring color

8. **Form Labels:**
   - View any form
   - Click on label
   - Verify input gets focus (label linked)
   - Verify all inputs have labels
   - Check required fields marked with asterisk

9. **Error Messages:**
   - Submit form with validation errors
   - Verify error text appears
   - Verify error linked to field (aria-describedby)
   - Try with screen reader
   - Verify error announced

10. **Heading Hierarchy:**
    - Use DevTools to view page outline
    - View > Developer > Show Page Outline (Firefox)
    - Or use WAVE extension
    - Verify one H1
    - Verify H2s for sections
    - Verify no skipped levels (H1 → H3 is skip)

11. **Lighthouse Audit:**
    - Open DevTools
    - Go to Lighthouse tab
    - Run accessibility audit
    - Target score ≥95
    - Review any issues
    - Fix reported problems

12. **WAVE Browser Extension:**
    - Install WAVE (Web Accessibility Evaluation Tool)
    - Open any page
    - Run WAVE
    - Verify no errors
    - Review warnings
    - Fix any issues

13. **Links and Buttons:**
    - Tab through page
    - Verify links and buttons visually distinct
    - Verify buttons open with Space or Enter
    - Verify links open with Enter

14. **Dynamic Content:**
    - Load page with loading skeleton
    - With screen reader on, wait for content
    - Verify "Loading" message announced
    - Verify content announced when loaded
