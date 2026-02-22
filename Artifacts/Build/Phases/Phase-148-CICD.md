# Phase 148: CI/CD Pipeline

## Objective
Implement GitHub Actions workflow for automated linting, type checking, testing, building, and deployment to Vercel.

## Prerequisites
- GitHub repository configured
- Vercel account and project setup
- Environment variables configured

## Context
CI/CD automation ensures code quality, catches errors early, and enables rapid deployment with confidence.

## Detailed Requirements

### GitHub Actions Workflow

**.github/workflows/main.yml:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint code
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/helix_test

      - name: Run unit tests
        run: npm run test:unit -- --coverage
        env:
          NODE_ENV: test

      - name: Run integration tests
        run: npm run test:integration
        env:
          NODE_ENV: test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          fail_ci_if_error: true

  e2e:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Setup test database
        run: npm run db:seed:test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Analyze bundle
        run: npm run analyze:build

      - name: Check bundle size
        run: |
          SIZE=$(du -b .next/static/chunks/ | tail -1 | cut -f1)
          THRESHOLD=$((5 * 1024 * 1024))  # 5MB threshold
          if [ $SIZE -gt $THRESHOLD ]; then
            echo "Bundle size exceeds threshold: $SIZE bytes"
            exit 1
          fi

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: next-build
          path: .next

  deploy-preview:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3

      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

      - name: Comment PR with preview URL
        uses: actions/github-script@v6
        with:
          script: |
            const preview_url = ${{ steps.deploy.outputs.preview-url }};
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview ready: ${preview_url}`
            });

  deploy-production:
    runs-on: ubuntu-latest
    needs: [build, e2e]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3

      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}

      - name: Notify deployment
        run: |
          echo "Deployed to production at $(date)"

  notify:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test, build, deploy-production]
    if: always()
    steps:
      - name: Slack notification
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*${{ github.event.repository.name }}* - ${{ github.ref_name }}\n${{ job.status | upper }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:unit": "jest --testPathPattern=__tests__",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:migrate": "supabase migration up",
    "db:migrate:test": "supabase migration up --db-url $DATABASE_URL",
    "db:seed": "tsx scripts/seed.ts",
    "db:seed:test": "tsx scripts/seed-test.ts",
    "analyze:build": "ANALYZE=true npm run build",
    "analyze:bundle": "next-bundle-analyzer",
    "security:audit": "npm audit",
    "security:snyk": "snyk test",
    "precommit": "npm run lint && npm run type-check && npm run test:unit"
  }
}
```

### Environment Variables

**.env.example:**
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth
JWT_SECRET=your-secret-key

# Vercel
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=

# Slack
SLACK_WEBHOOK_URL=

# Testing
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=
```

### Pre-commit Hooks

**.husky/pre-commit:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run type-check
npm run test:unit
```

Install husky:
```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run precommit"
```

### Code Coverage Requirements

**jest.config.js:**
```js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './app/lib/auth/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
```

### Deployment Configuration

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ],
  "secrets": [
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET"
  ],
  "regions": ["sfo1"],
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  }
}
```

### Monitoring & Alerts

**Sentry Integration:**
```ts
// app/sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV,
});
```

## File Structure
```
/.github/workflows/main.yml
/.husky/pre-commit
/vercel.json
/.env.example
/jest.config.js
/playwright.config.ts
/scripts/seed.ts
/scripts/seed-test.ts
```

## Acceptance Criteria
- [ ] Lint job passes without errors or warnings
- [ ] Type check completes successfully
- [ ] Unit tests pass with ≥80% coverage
- [ ] Integration tests pass
- [ ] Bundle builds successfully
- [ ] Bundle size <5MB
- [ ] E2E tests pass on main
- [ ] Preview deployment on PR
- [ ] Production deployment on main merge
- [ ] All environment variables configured
- [ ] Pre-commit hooks configured
- [ ] Slack notifications working
- [ ] Test database setup and seeding works

## Testing Instructions
1. Create a feature branch: `git checkout -b test-branch`
2. Make a change
3. Stage changes: `git add .`
4. Verify pre-commit hooks run: `git commit -m "test"`
5. If hooks pass, go to GitHub
6. Create pull request
7. Wait for CI/CD pipeline
8. Verify all checks pass (lint, type, test, build)
9. Verify preview deployment created
10. Review preview URL in PR comment
11. Merge PR
12. Verify production deployment triggered
13. Check Slack for deployment notification
14. Verify app live on production
15. Check Sentry for any errors
