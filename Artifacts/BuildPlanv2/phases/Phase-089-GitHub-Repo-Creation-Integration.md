# Phase 089 — GitHub Repo Creation Integration
## Objective
Implement optional GitHub API integration to automate repository creation. Users provide a Personal Access Token and the system creates the repo, sets branch protection, creates a dev branch, and pushes the initial commit.

## Prerequisites
- Phase 087 — Downloadable Ready-Made Project Folder — Project folder with initial commit
- Phase 088 — Git Initialization Guide Generator — Git workflow understanding

## Epic Context
**Epic:** 10 — Repo Setup Automation — Steps 4.1-4.4
**Phase:** 89 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Phase 088 provides manual git initialization instructions. This phase automates the GitHub repository creation step for users who want the full zero-touch setup experience. It's optional—users can still initialize manually if preferred.

The integration handles: creating the repository, setting up branch protection on main, creating a dev branch, and pushing the initial commit. All via the GitHub API with user-provided credentials.

---
## Detailed Requirements

### 1. GitHub Integration Service
#### File: `lib/helix/repo-setup/github.ts` (NEW)
GitHub API integration for automated repo setup:

```typescript
export interface GitHubRepoConfig {
  repoName: string;
  description: string;
  isPrivate: boolean;
  personalAccessToken: string;
  owner?: string; // Defaults to authenticated user
}

export interface GitHubRepoCreationResult {
  success: boolean;
  repoUrl?: string;
  cloneUrl?: string;
  steps: GitHubSetupStep[];
  errors?: string[];
}

export interface GitHubSetupStep {
  step: number;
  action: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  message: string;
  details?: Record<string, any>;
}

export class GitHubClient {
  private token: string;
  private baseUrl = "https://api.github.com";
  private owner: string = "";

  constructor(personalAccessToken: string) {
    this.token = personalAccessToken;
  }

  async authenticateUser(): Promise<{ login: string; id: number }> {
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: {
        Authorization: `token ${this.token}`,
        "Accept": "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Authentication failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    this.owner = data.login;
    return { login: data.login, id: data.id };
  }

  async createRepository(
    config: GitHubRepoConfig
  ): Promise<{ id: number; name: string; html_url: string }> {
    const response = await fetch(`${this.baseUrl}/user/repos`, {
      method: "POST",
      headers: {
        Authorization: `token ${this.token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: config.repoName,
        description: config.description,
        private: config.isPrivate,
        auto_init: false, // We'll push our own initial commit
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Repository creation failed: ${error.message}`
      );
    }

    const repo = await response.json();
    return {
      id: repo.id,
      name: repo.name,
      html_url: repo.html_url,
    };
  }

  async createBranch(
    repoName: string,
    branchName: string,
    fromSha: string
  ): Promise<{ name: string; sha: string }> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.owner}/${repoName}/git/refs`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: fromSha,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Branch creation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { name: branchName, sha: data.object.sha };
  }

  async setBranchProtection(
    repoName: string,
    branchName: string = "main"
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.owner}/${repoName}/branches/${branchName}/protection`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${this.token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          required_status_checks: {
            strict: true,
            contexts: [],
          },
          enforce_admins: false,
          required_pull_request_reviews: null,
          restrictions: null,
          allow_force_pushes: false,
          allow_deletions: false,
        }),
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(
        `Branch protection setup failed: ${response.statusText}`
      );
    }
  }

  async getDefaultBranchSha(repoName: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.owner}/${repoName}`,
      {
        headers: {
          Authorization: `token ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get repo info: ${response.statusText}`);
    }

    const data = await response.json();
    return data.default_branch || "main";
  }
}

export async function createGitHubRepositoryAutomated(
  config: GitHubRepoConfig,
  onStepUpdate: (step: GitHubSetupStep) => void
): Promise<GitHubRepoCreationResult> {
  const steps: GitHubSetupStep[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Authenticate
    const step1: GitHubSetupStep = {
      step: 1,
      action: "Authenticate with GitHub",
      status: "in-progress",
      message: "Verifying GitHub credentials...",
    };
    steps.push(step1);
    onStepUpdate(step1);

    const client = new GitHubClient(config.personalAccessToken);
    const user = await client.authenticateUser();

    step1.status = "completed";
    step1.message = `Authenticated as ${user.login}`;
    step1.details = user;
    onStepUpdate(step1);

    // Step 2: Create Repository
    const step2: GitHubSetupStep = {
      step: 2,
      action: "Create Repository",
      status: "in-progress",
      message: `Creating repository: ${config.repoName}...`,
    };
    steps.push(step2);
    onStepUpdate(step2);

    const repo = await client.createRepository(config);

    step2.status = "completed";
    step2.message = `Repository created: ${repo.html_url}`;
    step2.details = repo;
    onStepUpdate(step2);

    // Step 3: Create dev Branch (optional)
    const step3: GitHubSetupStep = {
      step: 3,
      action: "Create develop branch",
      status: "in-progress",
      message: "Creating develop branch...",
    };
    steps.push(step3);
    onStepUpdate(step3);

    try {
      const mainBranchSha = await client.getDefaultBranchSha(
        config.repoName
      );
      const devBranch = await client.createBranch(
        config.repoName,
        "develop",
        mainBranchSha
      );

      step3.status = "completed";
      step3.message = "Develop branch created";
      step3.details = devBranch;
    } catch (e) {
      step3.status = "failed";
      step3.message = "Develop branch creation skipped (may already exist)";
      errors.push((e as Error).message);
    }
    onStepUpdate(step3);

    // Step 4: Set Branch Protection
    const step4: GitHubSetupStep = {
      step: 4,
      action: "Set branch protection",
      status: "in-progress",
      message: "Configuring branch protection on main...",
    };
    steps.push(step4);
    onStepUpdate(step4);

    try {
      await client.setBranchProtection(config.repoName, "main");
      step4.status = "completed";
      step4.message = "Branch protection configured";
    } catch (e) {
      step4.status = "failed";
      step4.message = "Branch protection setup failed (may require admin)";
      errors.push((e as Error).message);
    }
    onStepUpdate(step4);

    // Step 5: Summary
    const step5: GitHubSetupStep = {
      step: 5,
      action: "Repository setup complete",
      status: "completed",
      message: `Repository is ready. Clone with: git clone ${repo.html_url}`,
      details: {
        repoUrl: repo.html_url,
        cloneUrl: `${repo.html_url}.git`,
      },
    };
    steps.push(step5);
    onStepUpdate(step5);

    return {
      success: true,
      repoUrl: repo.html_url,
      cloneUrl: `${repo.html_url}.git`,
      steps,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);

    return {
      success: false,
      steps,
      errors,
    };
  }
}

export async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    const client = new GitHubClient(token);
    await client.authenticateUser();
    return true;
  } catch {
    return false;
  }
}
