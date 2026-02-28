# Phase 087 — Downloadable Ready-Made Project Folder
## Objective
Generate a complete, downloadable zip file containing the entire project structure with customized files, complete BuildPlan, and all ready-to-use assets. All placeholders replaced, all documentation included.

## Prerequisites
- Phase 084 — Repo Template Customization Engine — Customized template files
- Phase 085 — Auto Find-and-Replace Placeholders — All placeholders replaced
- Phase 086 — Build Plan to Repo Structure Generator — Complete BuildPlan structure

## Epic Context
**Epic:** 10 — Repo Setup Automation — Steps 4.1-4.4
**Phase:** 87 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
After customization is complete, users need a way to download everything: customized files, BuildPlan, folder structure, all at once. This phase generates a downloadable zip that's ready to extract and start developing in.

The zip contains the complete project scaffold with no manual work needed—all placeholders replaced, all documentation included, all folder structure created.

---
## Detailed Requirements

### 1. Project Package Generator
#### File: `lib/helix/repo-setup/package-generator.ts` (NEW)
Generate downloadable project archive:

```typescript
import JSZip from "jszip";

export interface ProjectPackageConfig {
  projectName: string;
  projectDescription: string;
  authorName: string;
  authorEmail: string;
  repoUrl?: string;
  techStack: string[];
  customizedFiles: Array<{
    path: string;
    content: string;
  }>;
  buildPlanFiles: Array<{
    path: string;
    content: string;
  }>;
  includedFolders: string[];
}

export interface GeneratedPackage {
  fileName: string;
  fileSize: number;
  fileCount: number;
  contents: PackageItem[];
}

export interface PackageItem {
  path: string;
  type: "file" | "folder";
  size?: number;
}

export async function generateProjectPackage(
  config: ProjectPackageConfig
): Promise<Blob> {
  const zip = new JSZip();
  let fileCount = 0;

  // Add root configuration files
  const rootFiles: Record<string, string> = {
    "CLAUDE.md": generateClaudeInstructions(config),
    ".gitignore": generateGitignore(),
    "README.md": generateReadme(config),
    ".nvmrc": "20", // Node version
    "package.json": generatePackageJson(config),
  };

  Object.entries(rootFiles).forEach(([fileName, content]) => {
    zip.file(fileName, content);
    fileCount++;
  });

  // Add .claude/commands/ directory
  const commandsFolder = zip.folder(".claude/commands");
  if (commandsFolder) {
    commandsFolder.file("build.sh", generateBuildScript(config));
    commandsFolder.file("test.sh", generateTestScript(config));
    commandsFolder.file("dev.sh", generateDevScript(config));
    commandsFolder.file("deploy.sh", generateDeployScript(config));
    fileCount += 4;
  }

  // Add customized template files
  config.customizedFiles.forEach((file) => {
    const filePath = file.path;
    zip.file(filePath, file.content);
    fileCount++;
  });

  // Add BuildPlan folder structure
  const buildPlanFolder = zip.folder("BuildPlan");
  if (buildPlanFolder) {
    config.buildPlanFiles.forEach((file) => {
      const relativePath = file.path.replace("BuildPlan/", "");
      buildPlanFolder.file(relativePath, file.content);
      fileCount++;
    });

    // Create Phases subfolder
    const phasesFolder = buildPlanFolder.folder("Phases");
    if (phasesFolder) {
      // Phases will be added by caller
    }

    // Create PhaseHistory subfolder
    const historyFolder = buildPlanFolder.folder("PhaseHistory");
    if (historyFolder) {
      historyFolder.file(
        "README.md",
        "# Phase History\n\nCompleted phases are archived here with their completion dates and learnings.\n"
      );
      fileCount++;
    }
  }

  // Add docs folder structure (empty, for user content)
  const docsFolder = zip.folder("docs");
  if (docsFolder) {
    docsFolder.file(
      "README.md",
      "# Project Documentation\n\nAdd project documentation here.\n"
    );
    fileCount++;
  }

  // Add src folder structure (empty, for code)
  const srcFolder = zip.folder("src");
  if (srcFolder) {
    srcFolder.file(
      "README.md",
      "# Source Code\n\nProject source code goes here.\n"
    );
    fileCount++;
  }

  // Generate the zip file
  const blob = await zip.generateAsync({ type: "blob" });

  return blob;
}

function generateClaudeInstructions(config: ProjectPackageConfig): string {
  return `# ${config.projectName} — Claude Development Guide

## Project Overview
${config.projectDescription}

## Quick Start
1. Read CLAUDE.md (this file) for development guidelines
2. Review BuildPlan/ for the phase-based build plan
3. Check .claude/commands/ for available commands
4. See README.md for project overview

## Project Details
- **Author:** ${config.authorName} (${config.authorEmail})
- **Repository:** ${config.repoUrl || "[Add repository URL]"}
- **Tech Stack:** ${config.techStack.join(", ")}

## Build Commands
All commands are in .claude/commands/:

\`\`\`bash
# Development
./build.sh      # Build the project
./dev.sh        # Start development server
./test.sh       # Run tests
./deploy.sh     # Deploy to production
\`\`\`

## Phase-Based Development
This project uses a structured build plan with ${config.techStack.length} phases across multiple epics. See BuildPlan/ for:
- roadmap.md — Timeline and phase overview
- Phases/ — Detailed specifications for each phase
- alignment.md — How the plan addresses requirements

## Development Workflow
1. Review the current phase specification in BuildPlan/Phases/
2. Implement the phase requirements
3. Follow the testing instructions
4. Update PhaseHistory/ when complete
5. Move to next phase

## Key Artifacts
- BuildPlan/ — Complete build plan with phases
- docs/ — Project documentation
- src/ — Source code
- .claude/commands/ — Predefined development commands

## Notes
- All placeholders have been replaced with project-specific values
- The build plan is generated from your project brief
- Customize as needed to match your team's process`;
}

function generateReadme(config: ProjectPackageConfig): string {
  return `# ${config.projectName}

${config.projectDescription}

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation
\`\`\`bash
git clone ${config.repoUrl || "[repository-url]"}
cd ${config.projectName}
npm install
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

### Testing
\`\`\`bash
npm test
\`\`\`

### Deployment
\`\`\`bash
npm run deploy
\`\`\`

## Architecture

See BuildPlan/ for detailed architecture and build plan.

## Tech Stack
- ${config.techStack.join("\n- ")}

## Project Structure
\`\`\`
${config.projectName}/
├── BuildPlan/          # Phase-based build plan
├── docs/               # Project documentation
├── src/                # Source code
├── .claude/            # Claude development tools
├── CLAUDE.md           # Development guide
└── README.md           # This file
\`\`\`

## Development Guidelines

See CLAUDE.md for detailed development guidelines and build commands.

## Contributing

[Add contribution guidelines]

## License

[Add license information]

## Support

Author: ${config.authorName} (${config.authorEmail})`;
}

function generatePackageJson(config: ProjectPackageConfig): string {
  return `{
  "name": "${config.projectName.toLowerCase().replace(/\\s+/g, "-")}",
  "version": "0.1.0",
  "description": "${config.projectDescription}",
  "author": "${config.authorName} <${config.authorEmail}>",
  "scripts": {
    "dev": "bash .claude/commands/dev.sh",
    "build": "bash .claude/commands/build.sh",
    "test": "bash .claude/commands/test.sh",
    "deploy": "bash .claude/commands/deploy.sh"
  },
  "keywords": [
    "${config.projectName.toLowerCase()}"
  ],
  "license": "MIT"
}`;
}

function generateGitignore(): string {
  return `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production
dist/
build/
out/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*`;
}

function generateBuildScript(config: ProjectPackageConfig): string {
  return `#!/bin/bash
# Build script for ${config.projectName}
set -e

echo "Building ${config.projectName}..."

# Add your build steps here
# Example: npm run build

echo "Build complete!"`;
}

function generateTestScript(config: ProjectPackageConfig): string {
  return `#!/bin/bash
# Test script for ${config.projectName}
set -e

echo "Testing ${config.projectName}..."

# Add your test steps here
# Example: npm test

echo "Tests complete!"`;
}

function generateDevScript(config: ProjectPackageConfig): string {
  return `#!/bin/bash
# Development script for ${config.projectName}
set -e

echo "Starting ${config.projectName} development server..."

# Add your dev server startup here
# Example: npm run dev

echo "Dev server ready!"`;
}

function generateDeployScript(config: ProjectPackageConfig): string {
  return `#!/bin/bash
# Deployment script for ${config.projectName}
set -e

echo "Deploying ${config.projectName}..."

# Add your deployment steps here
# Example: Build, push to registry, deploy to servers

echo "Deployment complete!"`;
}
