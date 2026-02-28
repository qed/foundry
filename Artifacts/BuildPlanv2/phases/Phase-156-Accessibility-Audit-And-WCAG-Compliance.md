# Phase 156 — Accessibility Audit and WCAG Compliance

## Objective
Full accessibility review of all Helix Mode UI. Ensure keyboard navigation, screen reader support (ARIA labels, roles, live regions), color contrast, focus management, tab order, skip links, and dynamic content announcements.

## Prerequisites
- Phase 135 — Core Helix Process Engine — Helix UI foundation

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 156 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Accessibility is not optional. Teams using Foundry include members with disabilities. All Helix UI must be keyboard navigable, screen reader compatible, and visually accessible. This phase ensures WCAG 2.1 AA compliance across the entire Helix Mode interface.

---

## Detailed Requirements

### 1. Accessibility Standards Checklist
- WCAG 2.1 Level AA compliance
- Keyboard navigation without mouse
- Screen reader support (tested with NVDA, JAWS)
- Color contrast ratio >= 4.5:1 for text
- Focus visible and managed correctly
- Tab order logical and intuitive
- Skip links to main content
- Form labels properly associated
- Error messages clear and associated with fields
- Dynamic content announces to screen readers

### 2. Implementation Tasks

#### Keyboard Navigation
- All interactive elements reachable via Tab
- Focus trap in modals
- Escape closes modals
- Arrow keys for list navigation
- Enter/Space activates buttons

#### Screen Reader Support
- ARIA labels on icon buttons
- ARIA roles for custom components
- ARIA live regions for status updates
- ARIA-expanded for disclosure widgets
- ARIA-selected for tabs/selections

#### Visual Accessibility
- Minimum contrast 4.5:1 for normal text
- Minimum contrast 3:1 for large text
- Color not sole means of conveying information
- Text resizable to 200%
- No flickering or flashing content

#### Focus Management
- Focus indicator visible on all focusable elements
- Focus moves logically through page
- Focus restored when closing modals
- Focus management on page transitions

#### Dynamic Content
- Live regions announce new content
- Role="alert" for important messages
- Role="status" for status updates
- Aria-live="polite" for non-urgent updates

### 3. Accessible Component Patterns
#### File: `lib/a11y/accessibilityPatterns.ts` (NEW)
```typescript
// WCAG-compliant component patterns and utilities

export function getAriaLabel(context: string): string {
  // Generate ARIA labels based on context
  const labels: Record<string, string> = {
    'close-button': 'Close dialog',
    'next-phase': 'Go to next phase',
    'previous-phase': 'Go to previous phase',
    'save-button': 'Save changes',
    'delete-button': 'Delete item',
  };
  return labels[context] || context;
}

export function createAccessibleAlert(
  message: string,
  level: 'error' | 'warning' | 'success' | 'info' = 'info'
): { role: string; ariaLive: 'assertive' | 'polite'; className: string } {
  return {
    role: level === 'error' ? 'alert' : 'status',
    ariaLive: level === 'error' ? 'assertive' : 'polite',
    className: `alert alert-${level}`,
  };
}

export function ensureMinimumContrast(
  foreground: string,
  background: string
): boolean {
  // Calculate contrast ratio (simplified)
  // In production, use actual WCAG formula
  return true; // Placeholder
}

export const a11yKeyBindings = {
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
};
```

#### File: `components/a11y/AccessibleModal.tsx` (NEW)
```typescript
'use client';

import React, { useEffect, useRef } from 'react';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
}: AccessibleModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus dialog
      if (dialogRef.current) {
        dialogRef.current.focus();
      }

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    } else {
      // Restore focus
      previousActiveElement.current?.focus();
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4"
        tabIndex={-1}
      >
        <div className="border-b p-6 flex items-center justify-between">
          <h2 id="modal-title" className="text-xl font-bold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
```

#### File: `components/a11y/AccessibleButton.tsx` (NEW)
```typescript
'use client';

import React from 'react';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function AccessibleButton({
  ariaLabel,
  isLoading,
  children,
  className,
  ...props
}: AccessibleButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      aria-busy={isLoading}
      disabled={isLoading || props.disabled}
      className={`px-4 py-2 rounded-lg transition ${
        className ||
        'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### 4. Accessibility Testing Instructions

- Keyboard Navigation Test
  1. Start Helix Mode interface
  2. Press Tab repeatedly, navigate entire UI
  3. Verify focus visible on all interactive elements
  4. Test Escape closes modals
  5. Verify logical tab order

- Screen Reader Test
  1. Enable VoiceOver (Mac) / NVDA (Windows)
  2. Navigate with reader
  3. Verify all content announced
  4. Test form labels announced with fields
  5. Test status updates announced

- Color Contrast Test
  1. Use WebAIM or similar tool
  2. Test all text and backgrounds
  3. Verify >= 4.5:1 ratio
  4. Test buttons and links
  5. Test error/warning states

- Mobile Accessibility Test
  1. Test touch targets >= 44px
  2. Test pinch-to-zoom works
  3. Test VoiceOver on iOS
  4. Test TalkBack on Android

---

## Acceptance Criteria
1. All interactive elements keyboard accessible
2. Focus visible on tab navigation
3. Escape closes modals/dropdowns
4. ARIA labels on icon buttons
5. Form labels properly associated
6. Color contrast >= 4.5:1 for all text
7. Live regions announce dynamic updates
8. Skip links present
9. Tab order logical throughout
10. WCAG 2.1 AA compliance verified via automated + manual testing

---

## Testing Instructions
1. Disable mouse, navigate with Tab only
2. Verify every button, link, input reachable
3. Test with NVDA or VoiceOver
4. Verify page structure announced correctly
5. Use color contrast checker on every color
6. Test form submission with screen reader
7. Verify error messages announced
8. Test modal focus management
9. Test skip links functional
10. Run automated a11y tools (axe, lighthouse)

---

## Notes for the AI Agent
- Accessibility is not optional, it's required
- Test with actual assistive tech, not just automated tools
- Focus indicators must be visible (not removed with CSS)
- ARIA only fixes semantic issues, not code issues
- Consider accessibility from start, don't retrofit
- Document accessible patterns for future development
