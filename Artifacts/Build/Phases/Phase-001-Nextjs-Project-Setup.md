# Phase 001 - Next.js Project Setup

## Objective
Initialize a production-ready Next.js 14+ project with App Router, TypeScript strict mode, Tailwind CSS, and essential dependencies. This phase establishes the foundational project structure and configuration that all subsequent phases build upon.

## Prerequisites
None

## Context
The Helix Foundry application is being rebuilt on modern Next.js (App Router) instead of the existing Vite+React prototype. This phase sets up the development environment, tooling, and base configuration that ensures code quality, type safety, and consistent styling across the entire application.

## Detailed Requirements

### 1. Initialize Next.js 14+ Project
- Use `create-next-app` with the following configuration:
  - TypeScript: enabled
  - ESLint: enabled
  - Tailwind CSS: enabled
  - App Router: use default (app/)
  - Source directory: use root (not src/)
  - Turbopack: enable for faster development
- Next.js version: 14.0 or higher
- Node.js: 18.17 or later

### 2. TypeScript Configuration
- Strict mode enabled in `tsconfig.json`:
  - `"strict": true`
  - `"noImplicitAny": true`
  - `"strictNullChecks": true`
  - `"strictFunctionTypes": true`
  - `"esModuleInterop": true`
  - `"skipLibCheck": true`
  - `"forceConsistentCasingInFileNames": true`
- Path aliases configured:
  - `@/*` maps to `./` (root directory for all imports)
  - `@/app/*` maps to `./app/`
  - `@/components/*` maps to `./components/`
  - `@/lib/*` maps to `./lib/`
  - `@/types/*` maps to `./types/`
  - `@/utils/*` maps to `./utils/`
  - `@/hooks/*` maps to `./hooks/`
  - `@/store/*` maps to `./store/`
  - `@/styles/*` maps to `./styles/`

### 3. Tailwind CSS Configuration
- Configure `tailwind.config.ts`:
  - Dark theme as default (class-based)
  - Theme colors: extend with custom Foundry brand colors (industrial grays, accent colors for module differentiation)
  - Font configuration: include system fonts stack (Inter or Geist recommended)
  - Border radius: 0.375rem (6px) as base
  - Spacing scale: use Tailwind defaults
- Configure `postcss.config.js` for Tailwind processing
- Create `app/globals.css` with:
  - Base Tailwind directives (@tailwind, @layer)
  - Custom CSS variables for brand colors
  - Global styles (reset, scrollbar styling)
  - Dark mode as default background (dark bg-slate-950, text-slate-50)

### 4. Dependencies Installation
Install the following core dependencies:
```
npm install @supabase/supabase-js @supabase/ssr lucide-react zustand next-themes clsx tailwind-merge
npm install -D @types/node @types/react @types/react-dom typescript eslint eslint-config-next
```

**Dependency Details:**
- `@supabase/supabase-js`: Supabase JavaScript client for browser operations
- `@supabase/ssr`: Supabase SSR utilities for Next.js server components and middleware
- `lucide-react`: Icon library (5+ icons needed for module navigation)
- `zustand`: Lightweight state management for client-side state (alternative to Context API for complex state)
- `next-themes`: Dark mode theme management (for future light mode support)
- `clsx`: Utility for conditional className concatenation
- `tailwind-merge`: Utility to merge Tailwind classes without conflicts

### 5. Project Directory Structure
Create the following folder structure:
```
project-root/
├── app/                          # Next.js App Router directory
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home/landing page
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts
│   ├── org/
│   │   └── [orgSlug]/
│   │       ├── layout.tsx
│   │       └── project/
│   │           └── [projectId]/
│   │               ├── layout.tsx
│   │               ├── page.tsx
│   │               ├── hall/
│   │               ├── shop/
│   │               ├── room/
│   │               ├── floor/
│   │               └── lab/
│   ├── api/                      # API routes (Phase 003 onwards)
│   │   ├── auth/
│   │   ├── orgs/
│   │   ├── projects/
│   │   └── members/
│   └── globals.css               # Global Tailwind styles
├── components/                   # Reusable React components
│   ├── ui/                       # Generic UI components (button, input, etc.)
│   ├── layout/                   # Layout components (sidebar, header, etc.)
│   ├── modules/                  # Module-specific components (hall, shop, etc.)
│   └── common/                   # Common components (modals, spinners, etc.)
├── lib/                          # Utility functions and helpers
│   ├── supabase/                 # Supabase client setup
│   │   ├── client.ts             # Browser-side Supabase client
│   │   └── server.ts             # Server-side Supabase client
│   ├── permissions.ts            # Permission checking logic (Phase 009)
│   ├── auth.ts                   # Auth helper functions
│   └── utils.ts                  # General utility functions
├── types/                        # TypeScript type definitions
│   ├── database.ts               # Database schema types (generated from Supabase)
│   ├── auth.ts                   # Auth-related types
│   └── index.ts                  # Exported type definitions
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Auth hook
│   ├── useOrg.ts                 # Organization context hook (Phase 005)
│   ├── useProject.ts             # Project context hook (Phase 005)
│   └── usePermission.ts          # Permission checking hook (Phase 009)
├── store/                        # Zustand state stores
│   ├── authStore.ts              # Global auth state
│   ├── uiStore.ts                # UI state (sidebar open/closed, theme, etc.)
│   └── notificationStore.ts      # Toast/notification state
├── middleware.ts                 # Next.js middleware for auth/routing (Phase 004)
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.js             # PostCSS configuration
├── .env.local.example            # Environment variables template
├── package.json                  # Project dependencies
└── README.md                     # Project documentation
```

### 6. Environment Variables Configuration
Create `.env.local.example` file (template for developers to copy and fill in):
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_NAME=Helix Foundry
NEXT_PUBLIC_APP_ENVIRONMENT=development
```

**Note:** `NEXT_PUBLIC_` prefix indicates variables exposed to the browser. Service role keys are server-only.

### 7. Root Layout Component
Create `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Helix Foundry',
  description: 'Build, test, and deploy software requirements with industrial precision.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-50`}>
        {children}
      </body>
    </html>
  )
}
```

- Use Next.js font optimization (Inter recommended)
- Set dark theme as default class
- Apply global styles through globals.css

### 8. Home Page
Create `app/page.tsx`:
```typescript
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Helix Foundry</h1>
        <p className="text-lg text-slate-300 mb-8">
          Build, test, and deploy software requirements with industrial precision.
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Login
          </a>
          <a
            href="/signup"
            className="inline-block px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Sign Up
          </a>
        </div>
      </div>
    </main>
  )
}
```

- Landing page with clear CTAs to login/signup
- Responsive layout
- Dark theme styling

### 9. ESLint Configuration
Configure ESLint with Next.js recommended rules:
- `.eslintrc.json` should extend `next/core-web-vitals`
- Add rules to enforce:
  - No unused variables
  - Consistent naming conventions
  - No console.log in production
  - React Hook rules
- Run linter before commits (via husky + lint-staged in future phases)

### 10. Basic Global Styles
Create foundational CSS in `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: dark;
  }

  body {
    @apply bg-slate-950 text-slate-50;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-slate-900;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-slate-700 rounded hover:bg-slate-600;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors;
  }

  .btn-secondary {
    @apply px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-medium transition-colors;
  }

  .text-truncate {
    @apply overflow-hidden text-ellipsis whitespace-nowrap;
  }
}
```

## File Structure
All files created by this phase:
```
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts (placeholder)
│   ├── login/
│   │   └── page.tsx (placeholder)
│   ├── signup/
│   │   └── page.tsx (placeholder)
│   └── org/
│       └── [orgSlug]/
│           └── project/
│               └── [projectId]/
│                   └── layout.tsx (placeholder)
├── components/
│   ├── ui/ (empty)
│   ├── layout/ (empty)
│   └── common/ (empty)
├── lib/
│   ├── supabase/
│   │   ├── client.ts (placeholder)
│   │   └── server.ts (placeholder)
│   └── utils.ts
├── types/
│   └── index.ts (empty)
├── hooks/ (empty)
├── store/ (empty)
├── middleware.ts (placeholder)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
├── .env.local.example
├── .eslintrc.json
├── package.json
└── README.md
```

## Acceptance Criteria

1. **Project Initialization**: `npm run dev` starts development server on http://localhost:3000 without errors
2. **TypeScript Compilation**: `npm run build` completes successfully with strict mode enabled
3. **Path Aliases**: Imports using `@/` prefix resolve correctly
4. **Tailwind CSS**: Dark theme applied globally, custom colors available
5. **Home Page**: Landing page renders correctly with login/signup links
6. **Dependencies**: All required packages installed and no version conflicts
7. **ESLint**: Running `npm run lint` shows no errors in app/page.tsx and app/layout.tsx
8. **Environment Template**: `.env.local.example` exists with all required variables documented
9. **No TypeScript Errors**: No type errors in initial project files
10. **Folder Structure**: All required directories exist as specified above

## Testing Instructions

1. **Verify Project Setup**:
   ```bash
   npm run dev
   # Navigate to http://localhost:3000
   # Should see Helix Foundry landing page with dark theme
   ```

2. **Test TypeScript Compilation**:
   ```bash
   npm run build
   # Should complete without errors
   ```

3. **Verify Path Aliases**:
   - In any component, import using `@/components/Button` (even if Button doesn't exist)
   - TypeScript should recognize the path without errors in the editor

4. **Check Tailwind CSS**:
   - Open DevTools
   - Verify background is dark (bg-slate-950)
   - Verify text color is light (text-slate-50)
   - Click buttons, they should have hover states

5. **Run ESLint**:
   ```bash
   npm run lint
   # Should pass without errors in root files
   ```

6. **Test Environment Variables**:
   - Copy `.env.local.example` to `.env.local`
   - Add placeholder Supabase values (can be fake for this phase)
   - Verify app still starts with `npm run dev`

7. **Folder Structure Validation**:
   ```bash
   # Verify the following exist:
   ls -la app/layout.tsx
   ls -la components/
   ls -la lib/
   ls -la types/
   ls -la hooks/
   # All should exist without errors
   ```
