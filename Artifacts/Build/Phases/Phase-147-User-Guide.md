# Phase 147: User Guide & Onboarding Tooltips

## Objective
Create in-app "Getting Started" flows, tooltip tours for first-time users, comprehensive help documentation, and keyboard shortcuts reference.

## Prerequisites
- All modules implemented (Phases 001-145)
- Tooltip library (driver.js, Shepherd.js, or custom)
- Help page framework

## Context
New users need guidance to understand how to use Helix Foundry effectively. In-app onboarding reduces learning curve and increases engagement.

## Detailed Requirements

### Getting Started Flows

**Per-Module Getting Started:**
1. **Hall (Ideas) Getting Started**
   - Step 1: "Welcome to Hall - where ideas live"
   - Step 2: "Create your first idea using the + button"
   - Step 3: "Ideas grow through engagement - add comments, tags, and connections"
   - Step 4: "When an idea matures, promote it to a feature"

2. **Pattern Shop Getting Started**
   - Step 1: "Pattern Shop is where features become detailed requirements"
   - Step 2: "Create a feature from your promoted idea"
   - Step 3: "Use the agent to generate requirements automatically"
   - Step 4: "Requirements guide your implementation"

3. **Control Room Getting Started**
   - Step 1: "Control Room holds the detailed blueprints for implementation"
   - Step 2: "Create a blueprint linked to your requirements"
   - Step 3: "Blueprints align your team on technical approach"
   - Step 4: "Extract work orders when ready to build"

4. **Assembly Floor Getting Started**
   - Step 1: "Assembly Floor is your work tracking dashboard"
   - Step 2: "Work orders are extracted from blueprints"
   - Step 3: "Track progress through phases"
   - Step 4: "Mark work orders complete as you build"

5. **Insights Lab Getting Started**
   - Step 1: "Insights Lab collects feedback from users"
   - Step 2: "Review and prioritize feedback in your inbox"
   - Step 3: "Convert high-value feedback to work orders"
   - Step 4: "View analytics to understand user sentiment"

### Tooltip Tour Implementation

**Using Driver.js:**
```tsx
// lib/onboarding/hallTour.ts
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function startHallTour() {
  const driverObj = driver({
    showProgress: true,
    steps: [
      {
        element: 'h1',
        popover: {
          title: 'Welcome to Hall',
          description: 'Hall is where your ideas begin. Create, discuss, and develop ideas here.',
          side: 'bottom',
        },
      },
      {
        element: 'button[aria-label="New Idea"]',
        popover: {
          title: 'Create Your First Idea',
          description: 'Click here to create a new idea. Include a title, description, and tags.',
          side: 'right',
        },
      },
      {
        element: '[data-testid="idea-card"]',
        popover: {
          title: 'Idea Cards',
          description: 'Each card shows your idea and its maturity score. Click to view details.',
          side: 'right',
        },
      },
      {
        element: '[data-testid="maturity-badge"]',
        popover: {
          title: 'Maturity Scoring',
          description: 'Ideas are scored on completeness, engagement, and age. Green means ready for features!',
          side: 'top',
        },
      },
    ],
    allowClose: true,
    doneBtnText: 'Got it!',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
  });

  driverObj.drive();
}
```

### Getting Started Modal

```tsx
// components/Onboarding/GettingStartedModal.tsx
import { useState } from 'react';
import { startHallTour } from '@/lib/onboarding/hallTour';

export function GettingStartedModal({ module, onClose }: {
  module: 'hall' | 'pattern-shop' | 'control-room' | 'assembly-floor' | 'insights-lab',
  onClose: () => void,
}) {
  const [step, setStep] = useState(0);

  const content = {
    hall: [
      { title: 'Welcome to Hall', description: 'Hall is where your ideas live. Create, discuss, and mature ideas here.' },
      { title: 'Create an Idea', description: 'Click the + button to create a new idea with title, description, and tags.' },
      { title: 'Engage', description: 'Add comments, connect related ideas, and watch your idea mature.' },
      { title: 'Promote', description: 'When your idea is mature, promote it to become a feature.' },
    ],
    'pattern-shop': [
      { title: 'Welcome to Pattern Shop', description: 'Transform features into detailed, actionable requirements.' },
      { title: 'Create Features', description: 'Features become the foundation for your development.' },
      { title: 'Write Requirements', description: 'Add detailed requirements with acceptance criteria.' },
      { title: 'AI-Powered Help', description: 'Let our agent help generate requirements automatically.' },
    ],
    // ... other modules
  };

  const steps = content[module] || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{steps[step]?.title}</h2>
          <p className="text-gray-600">{steps[step]?.description}</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded ${i <= step ? 'bg-blue-600' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            ← Back
          </button>

          {step === steps.length - 1 ? (
            <>
              <button
                onClick={() => {
                  startHallTour(); // or module-specific tour
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Take the Tour
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
              >
                Skip
              </button>
            </>
          ) : (
            <button
              onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Help Page Structure

```tsx
// app/help/page.tsx
export default function HelpPage() {
  return (
    <main className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Helix Foundry Help</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <HelpModule
          title="Hall"
          description="Manage and develop your product ideas"
          icon="💡"
          sections={[
            { title: 'Creating Ideas', id: 'creating-ideas' },
            { title: 'Idea Maturity', id: 'idea-maturity' },
            { title: 'Promoting to Features', id: 'promoting' },
          ]}
        />
        <HelpModule
          title="Pattern Shop"
          description="Define detailed requirements"
          icon="📋"
          sections={[
            { title: 'Feature Trees', id: 'feature-trees' },
            { title: 'Writing Requirements', id: 'requirements' },
            { title: 'Using the Agent', id: 'agent' },
          ]}
        />
        {/* ... other modules */}
      </div>

      {/* Detailed sections */}
      <div className="space-y-12">
        <HelpSection id="creating-ideas" title="Creating Ideas">
          <p>Ideas are the foundation of your product development process...</p>
          <img src="/help/create-idea.png" alt="Creating an idea" />
        </HelpSection>
        {/* ... more sections */}
      </div>
    </main>
  );
}
```

### Keyboard Shortcuts Reference

```tsx
// components/Help/KeyboardShortcuts.tsx
export function KeyboardShortcuts() {
  const shortcuts = [
    { key: 'Cmd/Ctrl + K', action: 'Global search' },
    { key: 'Cmd/Ctrl + /', action: 'Show shortcuts' },
    { key: 'Cmd/Ctrl + N', action: 'Create new (context-dependent)' },
    { key: 'Tab', action: 'Navigate form fields' },
    { key: 'Esc', action: 'Close modal/popup' },
    { key: '?', action: 'Open help' },
  ];

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Shortcut</th>
            <th className="text-left py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {shortcuts.map(({ key, action }) => (
            <tr key={key} className="border-b hover:bg-gray-50">
              <td className="py-3 font-mono text-sm">{key}</td>
              <td className="py-3">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### First-Time User Detection

```tsx
// hooks/useFirstTimeUser.ts
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useFirstTimeUser() {
  const { user } = useAuth();
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if user has completed onboarding
    const key = `onboarding_completed_${user.id}`;
    const completed = localStorage.getItem(key);

    if (!completed) {
      setIsFirstTime(true);
    }
  }, [user]);

  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      setIsFirstTime(false);
    }
  };

  return { isFirstTime, completeOnboarding };
}
```

### In-App Help Widget

```tsx
// components/Help/HelpWidget.tsx
import { useState } from 'react';

export function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4">
      {isOpen && (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4 max-w-xs">
          <h3 className="font-bold mb-2">Need help?</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/help" className="text-blue-600 hover:underline">View documentation</a></li>
            <li><button onClick={() => startContextualTour()} className="text-blue-600 hover:underline">Take a tour</button></li>
            <li><a href="mailto:support@helix-foundry.com" className="text-blue-600 hover:underline">Contact support</a></li>
          </ul>
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 text-2xl"
        aria-label="Help"
      >
        ?
      </button>
    </div>
  );
}
```

### Contextual Help Tooltips

```tsx
// components/Help/Tooltip.tsx
export function Tooltip({ text, children }: {
  text: string,
  children: React.ReactNode,
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block group">
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-50">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-block"
      >
        <span className="text-gray-400 hover:text-gray-600 cursor-help">?</span>
      </div>
    </div>
  );
}
```

## File Structure
```
/app/help/page.tsx
/app/help/[topic]/page.tsx
/components/Onboarding/GettingStartedModal.tsx
/components/Help/HelpWidget.tsx
/components/Help/Tooltip.tsx
/components/Help/KeyboardShortcuts.tsx
/lib/onboarding/hallTour.ts
/lib/onboarding/patternShopTour.ts
/lib/onboarding/controlRoomTour.ts
/lib/onboarding/assemblyFloorTour.ts
/lib/onboarding/insightsLabTour.ts
/hooks/useFirstTimeUser.ts
```

## Acceptance Criteria
- [ ] Getting Started modal displays on first module visit
- [ ] Tooltip tour guides users through key features
- [ ] Help page accessible from navigation
- [ ] All modules have dedicated help sections
- [ ] Keyboard shortcuts documented and functional
- [ ] First-time user detection works
- [ ] Tooltips appear contextually
- [ ] Tours skip if user already completed
- [ ] Help widget accessible from all pages
- [ ] Keyboard shortcuts in-app reference accessible
- [ ] Links to support/contact work
- [ ] Help content searchable

## Testing Instructions
1. Create new account
2. Navigate to Hall module
3. Verify Getting Started modal appears
4. Click "Take the Tour"
5. Verify tooltip tour starts
6. Step through tour
7. Verify each tooltip highlights correct element
8. Complete tour
9. Go to Help page (? icon)
10. Verify help documentation displays
11. Search help for "ideas"
12. Verify relevant results show
13. Click keyboard shortcuts
14. Verify shortcuts list displays
15. Try keyboard shortcut: Cmd/Ctrl+K
16. Verify global search opens
17. Check local storage for onboarding flag
18. Reload page
19. Verify Getting Started doesn't show again (already completed)
20. For new user, verify all onboarding flows
