# PHASE 050 — Mobile Responsive Helix Mode

## Objective
Implement mobile-responsive design across all Helix Mode components and pages using Tailwind CSS breakpoints. Ensure full functionality and usability on mobile (<768px), tablet (768-1024px), and desktop (>1024px) devices.

## Prerequisites
- Phase 001-049 completed (all Helix MVP + polish)
- Tailwind CSS v4 with breakpoint system configured
- v1 mobile patterns available as reference
- Touch-friendly UI guidelines understood

## Epic Context
**Epic 6 — MVP Polish & Cross-Cutting**
Phase 050 delivers mobile responsiveness across Helix. This cross-cutting concern ensures Helix Mode is accessible to all users regardless of device, expanding usability for on-the-go project management.

## Context
The Helix MVP was built with desktop-first design. Mobile users face usability issues:
- Sidebar too wide on small screens
- Multi-column layouts don't fit mobile viewports
- Tables and complex layouts not mobile-optimized
- Buttons and touch targets too small (<44px)
- Evidence panels and modals need mobile adaptation

This phase delivers full mobile responsiveness using:
- Tailwind breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Collapsible sidebars
- Single-column stacking
- Touch-friendly tap targets (min 44px)
- Mobile-optimized layouts for all views

## Detailed Requirements

### 1. Responsive Sidebar Component
```typescript
// components/helix/Helix Sidebar.tsx (UPDATED)
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useHelix } from '@/hooks/helix/useHelix';

interface HelixSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const HelixSidebar: React.FC<HelixSidebarProps> = ({
  isOpen = true,
  onClose,
}) => {
  const { stages, currentStage, navigateToStep } = useHelix();

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static
          top-0 left-0 h-screen
          w-64 lg:w-80
          bg-[#1a1d27] border-r border-gray-800
          transition-transform duration-300 ease-in-out
          z-50 lg:z-auto
          overflow-y-auto

          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Close button (mobile only) */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-gray-800">
          <h2 className="font-semibold text-white">Helix Stages</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Sidebar content */}
        <nav className="p-4 space-y-2">
          {stages.map((stage) => (
            <div key={stage.key}>
              <button
                onClick={() => {
                  navigateToStep(stage.steps?.[0]?.key || '');
                  onClose?.();
                }}
                className={`
                  w-full text-left px-4 py-3 rounded font-semibold
                  transition-colors touch-target
                  ${
                    stage.key === currentStage?.key
                      ? 'bg-[#00d4ff] bg-opacity-20 border border-[#00d4ff] text-[#00d4ff]'
                      : 'hover:bg-gray-800 text-gray-300'
                  }
                `}
              >
                {stage.name}
              </button>

              {/* Mobile: Show steps when stage is current */}
              {stage.key === currentStage?.key && (
                <div className="lg:hidden ml-4 mt-2 space-y-1 border-l border-gray-700 pl-4">
                  {(stage.steps || []).map((step) => (
                    <button
                      key={step.key}
                      onClick={() => {
                        navigateToStep(step.key);
                        onClose?.();
                      }}
                      className="w-full text-left text-sm py-2 px-2 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {step.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default HelixSidebar;
```

### 2. Responsive Layout Wrapper
```typescript
// components/helix/ResponsiveHelixLayout.tsx
'use client';

import React, { useState } from 'react';
import HelixSidebar from './HelixSidebar';

interface ResponsiveHelixLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export const ResponsiveHelixLayout: React.FC<ResponsiveHelixLayoutProps> = ({
  children,
  title,
  actions,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">
      {/* Sidebar */}
      <HelixSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 bg-[#1a1d27] border-b border-gray-800 p-4 flex items-center justify-between z-30">
          <div className="flex-1">
            {title && <h1 className="font-semibold text-white text-lg">{title}</h1>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        </header>

        {/* Content area */}
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ResponsiveHelixLayout;
```

### 3. Responsive Dashboard
```typescript
// components/helix/HelixDashboard.tsx (UPDATED for responsive)
'use client';

import React from 'react';
import StageCard from './StageCard';
import { useHelix } from '@/hooks/helix/useHelix';

export const HelixDashboard: React.FC = () => {
  const { stages, isLoading } = useHelix();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Title section */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
          Helix Mode
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          Complete your development process through structured stages
        </p>
      </div>

      {/* Progress indicator */}
      <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-sm md:text-base font-semibold text-gray-300 mb-3">
          Process Progress
        </h2>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#00d4ff] transition-all duration-300"
              style={{
                width: `${
                  (stages.filter(s => s.completedAt).length / stages.length) * 100
                }%`,
              }}
            />
          </div>
          <span className="text-xs md:text-sm text-gray-400 whitespace-nowrap">
            {stages.filter(s => s.completedAt).length} / {stages.length}
          </span>
        </div>
      </div>

      {/* Stages grid - responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {stages.map((stage) => (
          <StageCard key={stage.key} stage={stage} />
        ))}
      </div>
    </div>
  );
};

export default HelixDashboard;
```

### 4. Responsive Step Detail View
```typescript
// components/helix/StepDetailView.tsx (UPDATED for responsive)
'use client';

import React, { useState } from 'react';
import { Step, Stage, Evidence } from '@/types/helix';

interface StepDetailViewProps {
  step: Step;
  stage: Stage;
  onSave?: (evidence: Evidence[]) => Promise<void>;
}

export const StepDetailView: React.FC<StepDetailViewProps> = ({
  step,
  stage,
  onSave,
}) => {
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm md:text-base text-gray-400 mb-6 overflow-x-auto">
          <span className="whitespace-nowrap">{stage.name}</span>
          <span>/</span>
          <span className="whitespace-nowrap">{step.name}</span>
        </div>

        {/* Content grid - responsive columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Main content - full width on mobile, 2/3 on desktop */}
          <div className="lg:col-span-2">
            <div className="bg-[#1a1d27] border border-gray-800 rounded-lg p-4 md:p-6 lg:p-8">
              {/* Header */}
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {step.name}
              </h1>
              {step.description && (
                <p className="text-gray-400 text-sm md:text-base mb-6">
                  {step.description}
                </p>
              )}

              {/* Step content sections */}
              <div className="space-y-6 md:space-y-8">
                {/* Objectives section */}
                <section>
                  <h2 className="text-lg md:text-xl font-semibold text-[#00d4ff] mb-3 md:mb-4">
                    Objectives
                  </h2>
                  <div className="text-gray-300 text-sm md:text-base space-y-2">
                    {step.objectives?.map((obj, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-[#00d4ff] flex-shrink-0">✓</span>
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Deliverables section */}
                <section>
                  <h2 className="text-lg md:text-xl font-semibold text-[#00d4ff] mb-3 md:mb-4">
                    Deliverables
                  </h2>
                  <div className="text-gray-300 text-sm md:text-base space-y-2">
                    {step.deliverables?.map((del, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-green-400 flex-shrink-0">📦</span>
                        <span>{del}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Evidence sidebar - stacked on mobile */}
          <div className="lg:col-span-1">
            {/* Mobile toggle button */}
            <button
              onClick={() => setEvidencePanelOpen(!evidencePanelOpen)}
              className="lg:hidden w-full px-4 py-3 mb-4 bg-[#1a1d27] hover:bg-gray-800 border border-gray-800 text-white rounded font-semibold transition-colors"
            >
              {evidencePanelOpen ? '▼' : '▶'} Evidence ({step.evidence?.length || 0})
            </button>

            {/* Evidence panel */}
            <div
              className={`
                lg:block
                bg-[#1a1d27] border border-gray-800 rounded-lg p-4 md:p-6
                ${evidencePanelOpen ? 'block' : 'hidden lg:block'}
              `}
            >
              <h2 className="text-lg md:text-xl font-semibold text-white mb-4">
                Evidence
              </h2>

              <div className="space-y-3 mb-6">
                {(step.evidence || []).map((ev, i) => (
                  <div key={i} className="bg-gray-900 rounded p-3 md:p-4">
                    <div className="text-xs md:text-sm font-semibold text-[#00d4ff]">
                      {ev.type}
                    </div>
                    <div className="text-sm md:text-base text-gray-300 mt-1 break-words">
                      {ev.title}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons - stacked on mobile */}
              <div className="space-y-2">
                <button className="w-full px-4 py-2 md:py-3 bg-[#00d4ff] hover:bg-[#00a8cc] text-[#0f1117] rounded font-semibold transition-colors text-sm md:text-base">
                  Add Evidence
                </button>
                <button className="w-full px-4 py-2 md:py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors text-sm md:text-base">
                  Complete Step
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepDetailView;
```

### 5. Responsive Build Tracker
```typescript
// components/helix/BuildPhaseTracker.tsx (UPDATED for responsive)
<div className="p-4 md:p-6 lg:p-8">
  {/* Grid layout - single column on mobile, changes on larger screens */}
  <div className="space-y-2 md:space-y-3 lg:space-y-4">
    {phases.map((phase) => (
      <div
        key={phase.key}
        className="bg-[#1a1d27] border border-gray-800 rounded-lg p-3 md:p-4 lg:p-6"
      >
        {/* Card content - flexible layout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
          {/* Status and name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-xl md:text-2xl flex-shrink-0">
              {phase.status === 'completed' ? '✓' : '○'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-sm md:text-base truncate">
                {phase.name}
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                {phase.description}
              </p>
            </div>
          </div>

          {/* Action button - full width on mobile, fixed on desktop */}
          <button className="w-full sm:w-auto px-3 md:px-4 py-2 md:py-3 bg-[#00d4ff] hover:bg-[#00a8cc] text-[#0f1117] rounded font-semibold transition-colors text-sm md:text-base touch-target">
            Start
          </button>
        </div>
      </div>
    ))}
  </div>
</div>
```

### 6. Responsive Testing Matrix
```typescript
// components/helix/TestingMatrix.tsx (UPDATED for responsive)
<div className="p-4 md:p-6 lg:p-8 overflow-x-auto">
  {/* Mobile card view, desktop table */}
  <div className="hidden lg:block">
    {/* Desktop table view */}
    <table className="w-full">
      {/* Table header and body */}
    </table>
  </div>

  {/* Mobile card view */}
  <div className="lg:hidden space-y-3">
    {tests.map((test) => (
      <div key={test.key} className="bg-[#1a1d27] border border-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-start gap-2 mb-3">
          <h3 className="font-semibold text-white text-sm flex-1">{test.name}</h3>
          <span className="px-2 py-1 bg-gray-800 text-xs rounded whitespace-nowrap">
            {test.status}
          </span>
        </div>
        <div className="space-y-2 text-xs text-gray-400">
          <div><strong>Type:</strong> {test.type}</div>
          <div><strong>Duration:</strong> {test.duration}</div>
        </div>
      </div>
    ))}
  </div>
</div>
```

### 7. Touch-Friendly Buttons and Inputs
```typescript
// Tailwind CSS class for touch targets (44px minimum)
// Add to globals.css or Tailwind config
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

// Usage in components
<button className="px-4 py-2 touch-target rounded font-semibold">
  Click me
</button>

<input
  type="text"
  className="px-4 py-3 touch-target rounded border border-gray-700"
  placeholder="Enter text"
/>
```

### 8. Responsive Typography
```typescript
// Use Tailwind responsive text sizes
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Heading
</h1>

<p className="text-sm md:text-base lg:text-lg text-gray-400">
  Paragraph
</p>

<span className="text-xs md:text-sm text-gray-500">
  Small text
</span>
```

### 9. Mobile Menu for Navigation
```typescript
// components/helix/MobileNav.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1d27] border-t border-gray-800">
      <div className="flex items-center justify-around h-16">
        <Link
          href="/helix/dashboard"
          className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:text-[#00d4ff]"
        >
          <span>📊</span>
          <span>Dashboard</span>
        </Link>
        <Link
          href="/helix/timeline"
          className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:text-[#00d4ff]"
        >
          <span>📈</span>
          <span>Timeline</span>
        </Link>
        <Link
          href="/helix/tracker"
          className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:text-[#00d4ff]"
        >
          <span>✓</span>
          <span>Tracker</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileNav;
```

## File Structure
```
components/helix/
├── Helix Sidebar.tsx            (UPDATED with mobile)
├── ResponsiveHelixLayout.tsx    (NEW responsive wrapper)
├── HelixDashboard.tsx           (UPDATED responsive)
├── StepDetailView.tsx           (UPDATED responsive)
├── BuildPhaseTracker.tsx        (UPDATED responsive)
├── TestingMatrix.tsx            (UPDATED responsive)
└── MobileNav.tsx                (NEW mobile navigation)
```

## Dependencies
- React 19+
- Next.js 16+
- Tailwind CSS v4 (breakpoint system)
- TypeScript

## Tech Stack
- Next.js 16 App Router
- Tailwind CSS v4 with responsive utilities
- React hooks for state management
- Mobile-first design approach

## Acceptance Criteria
1. Dashboard displays 1 column on mobile, 2 on tablet, 4 on desktop (responsive grid)
2. Step detail shows stacked panels on mobile, split panels on desktop
3. Sidebar collapses to hamburger menu on mobile, shows full on desktop
4. All buttons and inputs are minimum 44px touch targets
5. Build tracker cards stack vertically on mobile, responsive on tablet/desktop
6. Testing matrix shows card view on mobile, table view on desktop
7. Timeline simplified to list view on mobile, full vertical timeline on desktop
8. Typography scales: mobile (smaller) → tablet (medium) → desktop (larger)
9. No horizontal scrolling required on mobile (except tables, which are horizontally scrollable)
10. Mobile menu navigation bar appears at bottom for quick access

## Testing Instructions
1. **Mobile dashboard**: Resize to <768px, verify 1-column grid, hamburger menu appears
2. **Tablet dashboard**: Resize to 768-1024px, verify 2-column grid, proper spacing
3. **Desktop dashboard**: Verify 4-column grid with optimal spacing
4. **Step detail on mobile**: Verify stacked layout, evidence panel toggleable
5. **Sidebar on mobile**: Click hamburger, verify sidebar slides in, clicking item closes it
6. **Touch targets**: Use DevTools, verify all buttons/inputs are 44px+ tall
7. **Typography scaling**: Check text sizes at different breakpoints
8. **Build tracker mobile**: Verify cards stack with full-width buttons
9. **Testing matrix mobile**: Verify card view displays (not table), tap target for each card
10. **Responsive images**: Verify images scale properly, no distortion on mobile

## Notes for AI Agent
- Mobile-first approach: design mobile experience first, enhance for larger screens
- Use Tailwind breakpoints consistently: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- 44px minimum touch target ensures accessibility for all users
- Collapsible sidebars on mobile prevent taking up valuable screen space
- Test on actual devices, not just browser DevTools (DevTools doesn't always match real devices)
- Safe area support for notched devices: use safe-area-inset CSS variables if needed
- Bottom navigation bar improves mobile UX for frequent actions
- Card-based layouts work better on mobile than tables—use conditionally
- Test with actual slow networks and real devices, not just fast connections
- Future enhancement: add pull-to-refresh for mobile (for step completion, etc.)
