# Phase 145: E2E Tests - Critical Workflows

## Objective
Implement Playwright end-to-end tests for critical user workflows, ensuring functionality across browsers and environments.

## Prerequisites
- Playwright installed (`npm install -D @playwright/test`)
- Test environment with live/staging database
- All prior features implemented (Phases 001-144)

## Context
End-to-end tests verify complete workflows from user perspective, catching integration issues that unit tests miss. Critical workflows ensure core functionality works in production.

## Detailed Requirements

### Playwright Setup

**playwright.config.ts:**
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './app/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Critical Workflow Tests

**Workflow 1: Complete Project Setup**
```ts
// app/__tests__/e2e/complete-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('complete workflow: signup -> create org -> create project -> create idea -> promote to feature', async ({ page }) => {
  // 1. Signup
  await page.goto('/auth/signup');
  await page.fill('input[name="email"]', `user-${Date.now()}@example.com`);
  await page.fill('input[name="password"]', 'TestPassword123');
  await page.fill('input[name="name"]', 'Test User');
  await page.click('button:has-text("Sign Up")');
  await page.waitForURL('/auth/verify-email');

  // 2. Create Organization
  await page.goto('/organizations/new');
  await page.fill('input[name="name"]', 'Test Org');
  await page.click('button:has-text("Create Organization")');
  await page.waitForURL('/organizations/*');

  // 3. Create Project
  await page.click('button:has-text("New Project")');
  await page.fill('input[name="name"]', 'Test Project');
  await page.click('button:has-text("Create Project")');
  await page.waitForURL('/projects/*');

  // 4. Navigate to Hall and Create Idea
  await page.click('a:has-text("Hall")');
  await page.click('button:has-text("New Idea")');
  await page.fill('input[name="title"]', 'Test Feature Idea');
  await page.fill('textarea[name="description"]', 'A feature that needs to be built');
  await page.click('button:has-text("Create Idea")');

  // 5. Verify Idea Created
  await expect(page.locator('text=Test Feature Idea')).toBeVisible();

  // 6. Promote to Feature
  await page.click('button[aria-label="Promote to Feature"]');
  await page.fill('input[name="featureName"]', 'Test Feature');
  await page.click('button:has-text("Promote")');

  // 7. Verify Feature Created
  await page.click('a:has-text("Pattern Shop")');
  await expect(page.locator('text=Test Feature')).toBeVisible();
});
```

**Workflow 2: Feature Development to Work Order**
```ts
// app/__tests__/e2e/feature-to-workorder.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Development Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('/');
  });

  test('create feature -> write blueprint -> extract work orders -> complete workflow', async ({ page }) => {
    // 1. Go to Pattern Shop
    await page.goto('/projects/test-project/pattern-shop');

    // 2. Create Feature
    await page.click('button:has-text("New Feature")');
    await page.fill('input[name="name"]', 'User Authentication');
    await page.click('button:has-text("Create")');
    await page.waitForURL('**/features/*');

    // 3. Add Requirement
    await page.click('button:has-text("Add Requirement")');
    await page.fill('textarea[name="description"]', 'Users can log in with email/password');
    await page.fill('textarea[name="acceptanceCriteria"]', 'Login form displays\nUser can enter credentials\nSystem validates and logs in');
    await page.click('button:has-text("Save Requirement")');

    // 4. Go to Control Room to Create Blueprint
    await page.click('a:has-text("Control Room")');
    await page.click('button:has-text("New Blueprint")');
    await page.selectOption('select[name="featureId"]', 'Feature: User Authentication');
    await page.fill('textarea[name="content"]', '# Authentication Blueprint\n## Implementation Plan\n1. Create login form\n2. Add validation\n3. Integrate with auth service');
    await page.click('button:has-text("Create Blueprint")');

    // 5. Extract Work Orders
    await page.click('button:has-text("Extract Work Orders")');
    await page.waitForSelector('text=Work orders extracted');
    const workOrderCount = await page.locator('[data-testid="work-order-item"]').count();
    expect(workOrderCount).toBeGreaterThan(0);

    // 6. Go to Assembly Floor
    await page.click('a:has-text("Assembly Floor")');

    // 7. Complete First Work Order
    const firstWO = await page.locator('[data-testid="work-order-card"]').first();
    await firstWO.click();
    await page.click('button:has-text("Mark In Progress")');
    await page.fill('textarea[name="update"]', 'Started implementation');
    await page.click('button:has-text("Update Status")');

    // 8. Verify Phase Progress
    const phaseProgress = await page.locator('[data-testid="phase-progress"]');
    await expect(phaseProgress).toContainText('1/');
  });
});
```

**Workflow 3: Feedback to Work Order**
```ts
// app/__tests__/e2e/feedback-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('feedback submission -> inbox display -> convert to work order', async ({ page }) => {
  // 1. Navigate to feedback submission (public page or internal)
  await page.goto('/projects/test-project/insights-lab/submit');

  // 2. Submit Feedback
  await page.fill('input[name="title"]', 'Login button not clickable on mobile');
  await page.fill('textarea[name="description"]', 'On mobile devices, the login button is too small and hard to click');
  await page.selectOption('select[name="category"]', 'Bug');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.click('button:has-text("Submit Feedback")');
  await expect(page.locator('text=Thank you for your feedback')).toBeVisible();

  // 3. Login and Check Inbox
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL!);
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD!);
  await page.click('button:has-text("Sign In")');

  // 4. Go to Insights Lab
  await page.goto('/projects/test-project/insights-lab');
  await expect(page.locator('text=Login button not clickable')).toBeVisible();

  // 5. View Feedback Details
  await page.click('text=Login button not clickable');
  await expect(page.locator('text=Bug')).toBeVisible();

  // 6. Convert to Work Order
  await page.click('button:has-text("Convert to Work Order")');
  await page.fill('input[name="workOrderTitle"]', 'Fix mobile login button size');
  await page.selectOption('select[name="blueprintId"]', 'Authentication');
  await page.click('button:has-text("Create Work Order")');

  // 7. Verify Work Order Created
  await page.goto('/projects/test-project/assembly-floor');
  await expect(page.locator('text=Fix mobile login button size')).toBeVisible();
});
```

**Workflow 4: Blueprint Collaboration**
```ts
// app/__tests__/e2e/collaboration.spec.ts
import { test, expect } from '@playwright/test';

test('multiple users collaborating on blueprint', async ({ browser }) => {
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();

  const context2 = await browser.newContext();
  const page2 = await context2.newPage();

  // User 1 creates blueprint
  await page1.goto('/auth/login');
  // ... login user1
  await page1.goto('/projects/test-project/control-room');
  await page1.click('button:has-text("New Blueprint")');
  await page1.fill('textarea[name="content"]', '# API Design\n## Endpoints\n- POST /auth/login');
  await page1.click('button:has-text("Create")');

  // User 2 opens same blueprint
  await page2.goto('/auth/login');
  // ... login user2
  await page2.goto('/projects/test-project/control-room');
  await page2.click('text=API Design');

  // User 2 makes comment
  await page2.click('button:has-text("Add Comment")');
  await page2.fill('textarea[name="comment"]', 'Should we include error codes?');
  await page2.click('button:has-text("Post Comment")');

  // User 1 sees comment in real-time
  await expect(page1.locator('text=Should we include error codes?')).toBeVisible();

  // User 1 replies
  await page1.click('button:has-text("Reply")');
  await page1.fill('textarea[name="reply"]', 'Good point, let me add that');
  await page1.click('button:has-text("Post")');

  // User 2 sees reply
  await expect(page2.locator('text=Good point, let me add that')).toBeVisible();

  await context1.close();
  await context2.close();
});
```

**Workflow 5: Phase Tracking**
```ts
// app/__tests__/e2e/phase-tracking.spec.ts
import { test, expect } from '@playwright/test';

test('phase progress tracking and burndown', async ({ page }) => {
  await page.goto('/auth/login');
  // ... login

  await page.goto('/projects/test-project/assembly-floor');

  // 1. Check initial phase status
  await expect(page.locator('[data-testid="phase-progress"]')).toContainText('0/10 complete');

  // 2. Get work orders
  const workOrders = await page.locator('[data-testid="work-order-card"]');
  const count = await workOrders.count();

  // 3. Complete half of them
  for (let i = 0; i < Math.floor(count / 2); i++) {
    await workOrders.nth(i).click();
    await page.click('button:has-text("Mark Complete")');
    await page.click('button[aria-label="Close"]');
  }

  // 4. Check phase progress updated
  const expectedComplete = Math.floor(count / 2);
  await expect(page.locator('[data-testid="phase-progress"]')).toContainText(`${expectedComplete}/${count} complete`);

  // 5. View burndown chart
  await page.click('a:has-text("Burndown")');
  const chart = page.locator('canvas'); // Recharts renders to canvas
  await expect(chart).toBeVisible();

  // 6. Verify velocity displayed
  await expect(page.locator('text=Daily velocity:')).toBeVisible();
});
```

### Test Utilities

```ts
// app/__tests__/e2e/fixtures/auth.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: any;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('/');

    // Use authenticated page in test
    await use(page);
  },
});
```

### Test Data Setup

```bash
# scripts/setup-test-data.sh
npm run seed:test-db

# Creates:
# - Test organization
# - Test project
# - Sample ideas, features, blueprints, work orders
# - Test users with different roles
```

## File Structure
```
/app/__tests__/e2e/
  /complete-workflow.spec.ts
  /feature-to-workorder.spec.ts
  /feedback-workflow.spec.ts
  /collaboration.spec.ts
  /phase-tracking.spec.ts
  /fixtures/auth.ts
/playwright.config.ts
```

## Acceptance Criteria
- [ ] Complete signup → org → project → feature workflow tests
- [ ] Feature development workflow end-to-end
- [ ] Feedback submission → conversion workflow
- [ ] Collaboration features tested across users
- [ ] Phase tracking and burndown verified
- [ ] Tests run in Chrome, Firefox, Safari
- [ ] Tests run on mobile viewport
- [ ] All tests pass on CI/CD
- [ ] Screenshots captured on failure
- [ ] Test execution <5 minutes
- [ ] Retry mechanism for flaky tests

## Testing Instructions
1. Set up test data: `npm run seed:test-db`
2. Start dev server: `npm run dev`
3. Run all E2E tests: `npx playwright test`
4. Run specific test: `npx playwright test complete-workflow`
5. Run in headed mode: `npx playwright test --headed`
6. View test report: `npx playwright show-report`
7. Debug test: `npx playwright test complete-workflow --debug`
8. Run on specific browser: `npx playwright test --project=chromium`
9. Run on mobile: `npx playwright test --project="mobile chrome"`
10. Before deployment, run all E2E tests to verify production readiness
