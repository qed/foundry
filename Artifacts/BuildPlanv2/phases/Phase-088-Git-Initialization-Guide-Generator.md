# Phase 088 — Git Initialization Guide Generator
## Objective
Generate context-aware git initialization instructions based on project name, repository URL, and branch strategy. Produce copy-paste-ready terminal commands including optional GitHub CLI instructions.

## Prerequisites
- Phase 087 — Downloadable Ready-Made Project Folder — Project folder ready for git init
- Project name and repository URL captured

## Epic Context
**Epic:** 10 — Repo Setup Automation — Steps 4.1-4.4
**Phase:** 88 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
After downloading the project folder, the next step is git initialization. This phase generates step-by-step, copy-paste-ready commands tailored to the project's specifics. It detects if GitHub CLI is available and provides both standard git commands and gh CLI alternatives.

---
## Detailed Requirements

### 1. Git Initialization Guide Service
#### File: `lib/helix/repo-setup/git-init-guide.ts` (NEW)
Generate context-aware git initialization instructions:

```typescript
export interface GitInitConfig {
  projectName: string;
  projectDescription: string;
  repositoryUrl?: string;
  defaultBranch?: "main" | "master" | "develop";
  branchStrategy?: "github-flow" | "git-flow" | "trunk-based";
  hasGitHubCLI?: boolean;
  gitUserName?: string;
  gitUserEmail?: string;
}

export interface GitInitGuide {
  projectName: string;
  strategy: string;
  commands: GitCommand[];
  ghCliCommands?: GitCommand[];
  fullGuide: string;
  estimatedTime: string;
}

export interface GitCommand {
  step: number;
  description: string;
  command: string;
  explanation: string;
  isMandatory: boolean;
  requiresGitHubCLI?: boolean;
}

export function generateGitInitGuide(
  config: GitInitConfig
): GitInitGuide {
  const commands = buildStandardCommands(config);
  const ghCliCommands = config.hasGitHubCLI
    ? buildGitHubCLICommands(config)
    : undefined;

  const fullGuide = buildFullGuide(config, commands, ghCliCommands);

  return {
    projectName: config.projectName,
    strategy: config.branchStrategy || "github-flow",
    commands,
    ghCliCommands,
    fullGuide,
    estimatedTime: "5-10 minutes",
  };
}

function buildStandardCommands(
  config: GitInitConfig
): GitCommand[] {
  const defaultBranch = config.defaultBranch || "main";
  const commands: GitCommand[] = [];

  // Step 1: Navigate to project directory
  commands.push({
    step: 1,
    description: "Navigate to project directory",
    command: `cd ${config.projectName}`,
    explanation:
      "Change into the directory where you extracted the project folder.",
    isMandatory: true,
  });

  // Step 2: Initialize git repository
  commands.push({
    step: 2,
    description: "Initialize git repository",
    command: `git init`,
    explanation: "Creates a new .git directory and initializes the repository.",
    isMandatory: true,
  });

  // Step 3: Configure git user
  commands.push({
    step: 3,
    description: "Configure git user (optional, if not globally set)",
    command: `git config user.name "${config.gitUserName || "Your Name"}" && git config user.email "${config.gitUserEmail || "you@example.com"}"`,
    explanation:
      "Sets the user name and email for commits in this repository.",
    isMandatory: false,
  });

  // Step 4: Set default branch
  commands.push({
    step: 4,
    description: "Set default branch name",
    command: `git branch -M ${defaultBranch}`,
    explanation: `Renames the initial branch to '${defaultBranch}' (modern convention).`,
    isMandatory: true,
  });

  // Step 5: Add all files
  commands.push({
    step: 5,
    description: "Stage all files",
    command: `git add .`,
    explanation: "Stages all files in the directory for the initial commit.",
    isMandatory: true,
  });

  // Step 6: Create initial commit
  commands.push({
    step: 6,
    description: "Create initial commit",
    command: `git commit -m "chore: initial project setup"`,
    explanation: "Creates the initial commit with all project files.",
    isMandatory: true,
  });

  // Step 7: Add remote repository
  if (config.repositoryUrl) {
    commands.push({
      step: 7,
      description: "Add remote repository",
      command: `git remote add origin ${config.repositoryUrl}`,
      explanation: `Connects your local repository to the remote repository at ${config.repositoryUrl}.`,
      isMandatory: true,
    });

    // Step 8: Push to remote
    commands.push({
      step: 8,
      description: "Push to remote repository",
      command: `git push -u origin ${defaultBranch}`,
      explanation:
        "Pushes the initial commit to the remote repository and sets up tracking.",
      isMandatory: true,
    });
  }

  return commands;
}

function buildGitHubCLICommands(
  config: GitInitConfig
): GitCommand[] {
  const commands: GitCommand[] = [];
  const defaultBranch = config.defaultBranch || "main";

  commands.push({
    step: 1,
    description: "Check GitHub CLI is installed",
    command: `gh --version`,
    explanation: "Verifies that GitHub CLI (gh) is installed and ready to use.",
    isMandatory: true,
    requiresGitHubCLI: true,
  });

  commands.push({
    step: 2,
    description: "Authenticate with GitHub",
    command: `gh auth login`,
    explanation:
      "Logs you into GitHub via gh CLI. Follow the prompts to authenticate.",
    isMandatory: false,
    requiresGitHubCLI: true,
  });

  commands.push({
    step: 3,
    description: "Create GitHub repository",
    command: `gh repo create ${config.projectName} --source=. --remote=origin --push`,
    explanation:
      "Creates a new repository on GitHub and pushes your local code.",
    isMandatory: false,
    requiresGitHubCLI: true,
  });

  commands.push({
    step: 4,
    description: "Configure branch protection (optional)",
    command: `gh api repos/:owner/:repo/branches/${defaultBranch}/protection -f required_status_checks='{"strict":true}' -f enforce_admins=true -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false}'`,
    explanation:
      "Sets up branch protection rules for the main branch (requires admin access).",
    isMandatory: false,
    requiresGitHubCLI: true,
  });

  return commands;
}

function buildFullGuide(
  config: GitInitConfig,
  standardCommands: GitCommand[],
  ghCommands?: GitCommand[]
): string {
  let guide = `# Git Initialization Guide for ${config.projectName}

## Quick Start

Follow these steps to initialize your repository:

\`\`\`bash
# Navigate to project directory
cd ${config.projectName}

# Initialize git
git init

# Set user config (if needed)
git config user.name "Your Name"
git config user.email "your@email.com"

# Use main as default branch
git branch -M main

# Stage all files
git add .

# Create initial commit
git commit -m "chore: initial project setup"
`;

  if (config.repositoryUrl) {
    guide += `
# Add remote and push
git remote add origin ${config.repositoryUrl}
git push -u origin main
`;
  }

  guide += `\`\`\`

## Step-by-Step Instructions

`;

  standardCommands.forEach((cmd) => {
    guide += `### Step ${cmd.step}: ${cmd.description}

\`\`\`bash
${cmd.command}
\`\`\`

${cmd.explanation}

`;
  });

  if (ghCommands) {
    guide += `## GitHub CLI Alternative

If you have GitHub CLI installed, you can automate repository creation:

\`\`\`bash
# Check GitHub CLI
gh --version

# Create repository on GitHub
gh repo create ${config.projectName} --source=. --remote=origin --push
\`\`\`

### GitHub CLI Steps

`;

    ghCommands.forEach((cmd) => {
      guide += `#### Step ${cmd.step}: ${cmd.description}

\`\`\`bash
${cmd.command}
\`\`\`

${cmd.explanation}

`;
    });
  }

  guide += `
## Branching Strategy

This project uses the **${config.branchStrategy || "GitHub Flow"}** branching strategy:

- **main** — Production-ready code
- **develop** (optional) — Development branch
- **feature/\*** — Feature branches
- **bugfix/\*** — Bug fix branches

## Next Steps

1. Create your first feature branch: \`git checkout -b feature/your-feature\`
2. Make changes and commit: \`git add . && git commit -m "feat: your message"\`
3. Push to remote: \`git push origin feature/your-feature\`
4. Create a pull request on GitHub

## Useful Git Commands

\`\`\`bash
# View status
git status

# View log
git log --oneline

# Create a branch
git checkout -b branch-name

# Switch branches
git checkout branch-name

# View branches
git branch -a

# Delete a branch
git branch -d branch-name
\`\`\`

## Troubleshooting

### "fatal: not a git repository"
Make sure you've run \`git init\` in the project directory.

### "Permission denied (publickey)"
Check your SSH keys are set up correctly: \`ssh -T git@github.com\`

### "Everything up-to-date"
You might be on the wrong branch. Check with \`git branch\`.

For more help, see [Git Documentation](https://git-scm.com/doc)`;

  return guide;
}

export function formatGuidForMarkdown(guide: GitInitGuide): string {
  return guide.fullGuide;
}

export function formatGuidForTerminal(commands: GitCommand[]): string {
  return commands
    .map((cmd) => `# ${cmd.description}\n${cmd.command}`)
    .join("\n\n");
}
