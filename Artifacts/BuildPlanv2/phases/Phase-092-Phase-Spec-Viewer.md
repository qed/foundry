# Phase 092 — Phase Spec Viewer

## Objective
Build a rich markdown viewer component that renders phase specification files with syntax highlighting, code block utilities, and navigable table of contents. This enables Claude Code to preview and reference phase specs directly within the Helix UI, improving developer experience during build execution.

## Prerequisites
- Phase 091 — Build Phase Management Foundation — establishes helix_build_phases table and tracking infrastructure
- Phase 087 — Build Plan Editor UI — provides context on document rendering patterns in Helix

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 092 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Phase specifications are markdown files containing structured requirements, acceptance criteria, and technical guidance for individual build phases. Currently, these files exist in the repository but lack a dedicated viewer UI. Engineers must manually open files in external editors or read them in terminal, breaking the flow of the build UI.

This phase introduces PhaseSpecViewer.tsx, a component that renders markdown with full TypeScript/SQL/CSS code block highlighting, a dynamic table of contents, and copy-to-clipboard functionality for code blocks. The viewer integrates into the Build Dashboard, allowing seamless navigation between phase specs without leaving the Helix interface.

---

## Detailed Requirements

### 1. Core Markdown Rendering
#### File: `components/helix/build/PhaseSpecViewer.tsx` (NEW)
Render markdown content with proper structure preservation. Use remark + rehype plugins for robust markdown parsing.

```typescript
import React, { useMemo } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';

interface PhaseSpecViewerProps {
  content: string;
  phaseNumber: number;
  phaseTitle: string;
}

export const PhaseSpecViewer: React.FC<PhaseSpecViewerProps> = ({
  content,
  phaseNumber,
  phaseTitle,
}) => {
  const htmlContent = useMemo(() => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeHighlight, { prefix: 'hljs-' })
      .use(rehypeStringify);

    const ast = processor.parse(content);
    const result = processor.runSync(ast);
    return processor.stringify(result);
  }, [content]);

  return (
    <div className="phase-spec-viewer max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Phase {phaseNumber} — {phaseTitle}</h1>
      </header>
      <div
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
```

### 2. Syntax Highlighting for Code Blocks
#### File: `components/helix/build/CodeBlockHighlighter.tsx` (NEW)
Extract code blocks and apply language-specific syntax highlighting using highlight.js.

```typescript
import React from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import hljs from 'highlight.js';

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}

export const CodeBlockHighlighter: React.FC<CodeBlockProps> = ({
  code,
  language,
  showLineNumbers = true,
}) => {
  const highlightedCode = hljs.highlight(code, {
    language: language || 'plaintext',
    ignoreIllegals: true,
  }).value;

  return (
    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
      <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
    </pre>
  );
};
```

### 3. Dynamic Table of Contents
#### File: `components/helix/build/TableOfContents.tsx` (NEW)
Parse headings from markdown and generate a navigable TOC sidebar.

```typescript
import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  content: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
  const headings = useMemo(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headingsList: Heading[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2];
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      headingsList.push({ level, text, id });
    }

    return headingsList;
  }, [content]);

  const handleNavigate = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-4 w-64 bg-slate-800 p-4 rounded-lg">
      <h3 className="text-sm font-semibold text-white mb-4">Contents</h3>
      <ul className="space-y-2 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}>
            <button
              onClick={() => handleNavigate(heading.id)}
              className="text-blue-400 hover:underline text-left truncate"
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
```

### 4. Copy Code Block Button
#### File: `components/helix/build/CopyCodeBlock.tsx` (NEW)
Add copy-to-clipboard functionality for each code block.

```typescript
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyCodeBlockProps {
  code: string;
}

export const CopyCodeBlock: React.FC<CopyCodeBlockProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
      title="Copy code block"
    >
      {copied ? (
        <>
          <Check size={14} />
          Copied
        </>
      ) : (
        <>
          <Copy size={14} />
          Copy
        </>
      )}
    </button>
  );
};
```

### 5. Section Navigation
#### File: `components/helix/build/SectionNav.tsx` (NEW)
Highlight and navigate to major sections: Objective, Prerequisites, Requirements, Acceptance Criteria, Testing Instructions.

```typescript
import React from 'react';

interface SectionNavProps {
  sections: string[];
  currentSection: string;
  onNavigate: (section: string) => void;
}

export const SectionNav: React.FC<SectionNavProps> = ({
  sections,
  currentSection,
  onNavigate,
}) => {
  const majorSections = [
    'Objective',
    'Prerequisites',
    'Requirements',
    'Acceptance Criteria',
    'Testing Instructions',
    'Notes for the AI Agent',
  ];

  const availableSections = majorSections.filter((s) =>
    sections.some((section) => section.toLowerCase().includes(s.toLowerCase()))
  );

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {availableSections.map((section) => (
        <button
          key={section}
          onClick={() => onNavigate(section)}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            currentSection === section
              ? 'bg-cyan-500 text-slate-900 font-semibold'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
        >
          {section}
        </button>
      ))}
    </div>
  );
};
```

---

## File Structure
```
components/helix/build/
├── PhaseSpecViewer.tsx (NEW)
├── CodeBlockHighlighter.tsx (NEW)
├── TableOfContents.tsx (NEW)
├── CopyCodeBlock.tsx (NEW)
└── SectionNav.tsx (NEW)

lib/helix/
├── phase-specs.ts (NEW) — utility functions for loading/parsing phase specs
└── highlight-config.ts (NEW) — highlight.js configuration
```

---

## Dependencies
- unified (for markdown AST)
- remark, rehype (markdown to HTML pipeline)
- rehype-highlight (syntax highlighting)
- highlight.js (code block syntax highlighting)
- lucide-react (icons)
- Tailwind CSS v4

---

## Tech Stack for This Phase
- TypeScript
- React
- Remark/Rehype
- Highlight.js
- Tailwind CSS v4

---

## Acceptance Criteria
1. PhaseSpecViewer component renders markdown content without errors
2. Syntax highlighting applies to TypeScript, SQL, CSS, and bash code blocks
3. Table of Contents sidebar generates correctly from h1-h6 headings and is sticky
4. Section navigation buttons scroll to respective sections smoothly
5. Copy button successfully copies code block content to clipboard and shows feedback
6. Headings are assigned unique IDs for anchor navigation
7. Code blocks display language labels above them
8. Prose styling matches Helix dark theme with proper contrast
9. Component accepts content, phaseNumber, and phaseTitle as props
10. All code blocks render with proper padding and overflow handling

---

## Testing Instructions
1. Render PhaseSpecViewer with a sample phase spec markdown file
2. Verify all headings are parsed and appear in Table of Contents
3. Test section navigation by clicking buttons and confirming smooth scroll
4. Copy a code block and paste in a text editor, confirming content accuracy
5. Test syntax highlighting on TypeScript, SQL, CSS, and bash blocks
6. Verify line numbers display correctly (if enabled)
7. Test that language labels appear above code blocks
8. Verify table of contents is sticky when scrolling main content
9. Test on mobile viewport to confirm responsive layout
10. Test with very long markdown files (1000+ lines) for performance

---

## Notes for the AI Agent
- Ensure heading IDs are URL-safe (no special characters except hyphens)
- Use rehype-toc plugin for automatic TOC generation if available
- Consider lazy-loading syntax highlighting for very large code blocks
- Integrate with the Build Dashboard route to lazy-load phase specs from disk
- Phase specs should be fetched from `/mnt/Foundryv2/BuildPlan/phases/` directory
