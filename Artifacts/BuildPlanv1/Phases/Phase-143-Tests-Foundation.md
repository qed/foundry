# Phase 143: Unit Tests - Foundation & Auth

## Objective
Implement comprehensive unit tests for authentication, session management, permissions, and tenant isolation using Jest and React Testing Library.

## Prerequisites
- Jest configuration
- React Testing Library setup
- All auth-related code from Phases 004, 005, 009
- Test database or mocked Supabase

## Context
Auth and permissions are critical to security. Thorough testing ensures these systems work correctly and prevent security regressions.

## Detailed Requirements

### Testing Setup

**Jest Configuration:**
```js
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/app'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'app/lib/auth/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
```

**Test Database Setup:**
```ts
// lib/__tests__/setup.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseTest = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_ANON_KEY!
);

// Or mock:
jest.mock('@supabase/supabase-js');
```

### Auth Middleware Tests

```ts
// lib/auth/__tests__/middleware.test.ts
import { withAuth } from '@/lib/auth/middleware';
import { NextRequest } from 'next/server';

describe('withAuth Middleware', () => {
  it('should allow authenticated users', () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/ideas'));
    req.headers.set('authorization', 'Bearer valid-token');

    const response = withAuth(req);
    expect(response.status).not.toBe(401);
  });

  it('should reject unauthenticated users', () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/ideas'));
    const response = withAuth(req);
    expect(response.status).toBe(401);
  });

  it('should reject invalid tokens', () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/ideas'));
    req.headers.set('authorization', 'Bearer invalid-token');

    const response = withAuth(req);
    expect(response.status).toBe(401);
  });

  it('should pass user context to handler', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/api/ideas'));
    req.headers.set('authorization', 'Bearer valid-token');

    const handler = jest.fn();
    await withAuth(handler)(req);

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].user).toBeDefined();
  });
});
```

### Session Management Tests

```ts
// lib/auth/__tests__/session.test.ts
import { getSession, createSession, destroySession } from '@/lib/auth/session';

describe('Session Management', () => {
  it('should create a session', async () => {
    const userId = 'test-user-id';
    const session = await createSession(userId);

    expect(session).toBeDefined();
    expect(session.user_id).toBe(userId);
    expect(session.expires_at).toBeGreaterThan(Date.now());
  });

  it('should retrieve a valid session', async () => {
    const sessionId = 'valid-session-id';
    const session = await getSession(sessionId);

    expect(session).toBeDefined();
    expect(session.user_id).toBeDefined();
  });

  it('should reject expired sessions', async () => {
    const expiredSessionId = 'expired-session-id';
    const session = await getSession(expiredSessionId);

    expect(session).toBeNull();
  });

  it('should destroy a session', async () => {
    const sessionId = 'session-to-destroy';
    await destroySession(sessionId);

    const session = await getSession(sessionId);
    expect(session).toBeNull();
  });

  it('should handle concurrent session requests', async () => {
    const userId = 'test-user';
    const sessions = await Promise.all([
      createSession(userId),
      createSession(userId),
      createSession(userId),
    ]);

    expect(sessions).toHaveLength(3);
    expect(sessions.every((s) => s.user_id === userId)).toBe(true);
  });
});
```

### Permission Tests

```ts
// lib/auth/__tests__/permissions.test.ts
import { canUserEditProject, canUserViewIdea, canUserDeleteWorkOrder } from '@/lib/auth/permissions';

describe('Permission Checks', () => {
  describe('Project Permissions', () => {
    it('should allow project owner to edit', async () => {
      const userId = 'owner-user';
      const projectId = 'test-project';

      const result = await canUserEditProject(userId, projectId);
      expect(result).toBe(true);
    });

    it('should allow project member with editor role', async () => {
      const userId = 'editor-user';
      const projectId = 'test-project';

      const result = await canUserEditProject(userId, projectId);
      expect(result).toBe(true);
    });

    it('should deny viewer from editing', async () => {
      const userId = 'viewer-user';
      const projectId = 'test-project';

      const result = await canUserEditProject(userId, projectId);
      expect(result).toBe(false);
    });

    it('should deny non-member access', async () => {
      const userId = 'other-user';
      const projectId = 'test-project';

      const result = await canUserEditProject(userId, projectId);
      expect(result).toBe(false);
    });
  });

  describe('Idea Permissions', () => {
    it('should allow org member to view idea', async () => {
      const userId = 'member-user';
      const ideaId = 'test-idea';

      const result = await canUserViewIdea(userId, ideaId);
      expect(result).toBe(true);
    });

    it('should deny non-org-member to view idea', async () => {
      const userId = 'other-user';
      const ideaId = 'test-idea';

      const result = await canUserViewIdea(userId, ideaId);
      expect(result).toBe(false);
    });
  });

  describe('Work Order Permissions', () => {
    it('should allow project member to delete draft work order', async () => {
      const userId = 'member-user';
      const woId = 'draft-work-order';

      const result = await canUserDeleteWorkOrder(userId, woId);
      expect(result).toBe(true);
    });

    it('should deny deletion of in-progress work order', async () => {
      const userId = 'member-user';
      const woId = 'active-work-order';

      const result = await canUserDeleteWorkOrder(userId, woId);
      expect(result).toBe(false);
    });
  });
});
```

### Tenant Isolation Tests

```ts
// lib/auth/__tests__/tenantIsolation.test.ts
import { getUserOrganizations, getProjectsByOrg } from '@/lib/auth/tenant';

describe('Tenant Isolation', () => {
  it('should only return orgs user belongs to', async () => {
    const userId = 'test-user';
    const orgs = await getUserOrganizations(userId);

    expect(orgs).toHaveLength(1); // user belongs to 1 org
    expect(orgs[0].name).toBe('Test Org');
  });

  it('should not return orgs user does not belong to', async () => {
    const userId = 'test-user';
    const orgs = await getUserOrganizations(userId);

    expect(orgs).not.toContainEqual(
      expect.objectContaining({ name: 'Other Org' })
    );
  });

  it('should only return projects in org', async () => {
    const orgId = 'test-org';
    const projects = await getProjectsByOrg(orgId);

    expect(projects).toHaveLength(2);
    expect(projects.every((p) => p.organization_id === orgId)).toBe(true);
  });

  it('should prevent access to projects from other orgs', async () => {
    const userId = 'test-user';
    const projectIdFromOtherOrg = 'other-org-project';

    const canAccess = await canUserViewProject(userId, projectIdFromOtherOrg);
    expect(canAccess).toBe(false);
  });

  it('should enforce RLS in queries', async () => {
    // Test that RLS is applied in database queries
    const userId = 'test-user';

    const ideas = await supabaseTest
      .from('ideas')
      .select('*')
      .eq('organization_id', '!=test-org'); // should not return any

    expect(ideas.data).toEqual([]);
    expect(ideas.error).toBeNull();
  });

  it('should handle cross-org data leakage attempts', async () => {
    // Try to access data from different org directly
    const result = await supabaseTest
      .from('ideas')
      .select('*')
      .eq('project_id', 'project-from-other-org');

    // RLS should prevent access
    expect(result.data).toEqual([]);
  });
});
```

### RLS Policy Tests

```ts
// lib/auth/__tests__/rls.test.ts
describe('Row-Level Security Policies', () => {
  it('should allow users to select their own org data', async () => {
    const { data, error } = await supabaseTest
      .from('ideas')
      .select('*')
      .eq('project_id', 'test-project');

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should prevent select of other org data', async () => {
    // Attempt to query org we don't belong to
    const { data, error } = await supabaseTest
      .from('ideas')
      .select('*')
      .eq('project_id', 'other-org-project');

    // RLS should prevent any results
    expect(data).toEqual([]);
  });

  it('should allow insert with correct tenant context', async () => {
    const { data, error } = await supabaseTest
      .from('ideas')
      .insert([{
        project_id: 'test-project',
        title: 'Test Idea',
        description: 'Test',
      }]);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should prevent insert for unauthorized user', async () => {
    // Create unauthenticated client
    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { error } = await anonClient
      .from('ideas')
      .insert([{
        project_id: 'test-project',
        title: 'Unauthorized Idea',
      }]);

    expect(error).toBeDefined();
    expect(error?.code).toBe('PGRST301'); // policy violation
  });
});
```

### Test Coverage Goals
- **Auth Middleware:** 95%+
- **Session Management:** 95%+
- **Permissions:** 95%+
- **Tenant Isolation:** 95%+
- **RLS Policies:** 90%+
- **Overall:** 80%+

### Running Tests
```bash
npm test -- --coverage --testPathPattern="auth|permission"
```

## File Structure
```
/app/lib/auth/__tests__/middleware.test.ts
/app/lib/auth/__tests__/session.test.ts
/app/lib/auth/__tests__/permissions.test.ts
/app/lib/auth/__tests__/tenantIsolation.test.ts
/app/lib/auth/__tests__/rls.test.ts
/jest.config.js
```

## Acceptance Criteria
- [ ] All auth middleware tested
- [ ] Session creation/validation/destruction tested
- [ ] All permission checks have test cases
- [ ] Tenant isolation tested thoroughly
- [ ] RLS policies tested directly against Supabase
- [ ] Permission denial cases tested
- [ ] Concurrent operations tested
- [ ] Coverage ≥95% for auth-critical code
- [ ] All tests pass in CI/CD pipeline
- [ ] Test database seeded with test data
- [ ] Security edge cases covered

## Testing Instructions
1. Create test data (test users, orgs, projects)
2. Run test suite: `npm test`
3. Check coverage: `npm test -- --coverage`
4. Verify auth tests: `npm test -- --testPathPattern="auth"`
5. Verify permission tests: `npm test -- --testPathPattern="permission"`
6. Test RLS directly: run RLS test queries in Supabase SQL editor
7. Simulate concurrent requests: use Promise.all() in tests
8. Review coverage report for gaps
9. Add tests for edge cases discovered
10. Ensure all tests pass before merging
