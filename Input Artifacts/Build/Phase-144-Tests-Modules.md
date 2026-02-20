# Phase 144: Unit Tests - All Modules

## Objective
Implement comprehensive unit tests for components, hooks, and API routes across all modules: Hall, Pattern Shop, Control Room, Assembly Floor, and Insights Lab.

## Prerequisites
- Jest and React Testing Library setup (Phase 143)
- All component code from Phases 010-133
- Mock Supabase client
- Test utilities and fixtures

## Context
Component and integration tests ensure features work correctly, catch regressions, and provide documentation of expected behavior.

## Detailed Requirements

### Component Tests - Hall Module

```ts
// components/Hall/IdeaCard/__tests__/IdeaCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';

describe('IdeaCard Component', () => {
  const mockIdea = {
    id: '1',
    title: 'Test Idea',
    description: 'Test description',
    status: 'published',
    maturity_score: 75,
    maturity_tier: 'developing',
    views: 10,
    tags: ['feature', 'ui'],
    created_at: '2025-01-01',
  };

  it('should render idea title', () => {
    render(<IdeaCard idea={mockIdea} />);
    expect(screen.getByText('Test Idea')).toBeInTheDocument();
  });

  it('should render maturity badge with correct color', () => {
    render(<IdeaCard idea={mockIdea} />);
    const badge = screen.getByText('Developing');
    expect(badge).toHaveClass('bg-yellow-100'); // developing = yellow
  });

  it('should render tags', () => {
    render(<IdeaCard idea={mockIdea} />);
    expect(screen.getByText('feature')).toBeInTheDocument();
    expect(screen.getByText('ui')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(<IdeaCard idea={mockIdea} onEdit={onEdit} />);

    fireEvent.click(screen.getByLabelText('Edit idea'));
    expect(onEdit).toHaveBeenCalledWith(mockIdea.id);
  });

  it('should call onDelete when delete button clicked', () => {
    const onDelete = jest.fn();
    render(<IdeaCard idea={mockIdea} onDelete={onDelete} />);

    fireEvent.click(screen.getByLabelText('Delete idea'));
    expect(onDelete).toHaveBeenCalledWith(mockIdea.id);
  });

  it('should display view count', () => {
    render(<IdeaCard idea={mockIdea} />);
    expect(screen.getByText(/10 views/i)).toBeInTheDocument();
  });

  it('should handle raw ideas (low maturity)', () => {
    const rawIdea = { ...mockIdea, maturity_tier: 'raw' };
    render(<IdeaCard idea={rawIdea} />);
    const badge = screen.getByText('Raw');
    expect(badge).toHaveClass('bg-gray-100'); // raw = gray
  });
});
```

### Component Tests - Pattern Shop

```ts
// components/PatternShop/FeatureTree/__tests__/FeatureTree.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureTree } from '../FeatureTree';

describe('FeatureTree Component', () => {
  const mockFeatures = [
    {
      id: '1',
      name: 'Authentication',
      description: 'User auth system',
      children: [
        { id: '1.1', name: 'Login', description: 'Login form' },
        { id: '1.2', name: 'Signup', description: 'Signup flow' },
      ],
    },
    { id: '2', name: 'Dashboard', description: 'Main dashboard' },
  ];

  it('should render feature tree structure', () => {
    render(<FeatureTree features={mockFeatures} />);
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should expand/collapse parent features', async () => {
    const user = userEvent.setup();
    render(<FeatureTree features={mockFeatures} />);

    const expandButton = screen.getByLabelText('Expand Authentication');
    await user.click(expandButton);

    expect(screen.getByText('Login')).toBeVisible();
    expect(screen.getByText('Signup')).toBeVisible();
  });

  it('should display feature count', () => {
    render(<FeatureTree features={mockFeatures} />);
    expect(screen.getByText(/3 features/i)).toBeInTheDocument();
  });

  it('should render requirements for feature', async () => {
    const user = userEvent.setup();
    render(<FeatureTree features={mockFeatures} />);

    const featureItem = screen.getByText('Authentication');
    await user.click(featureItem);

    expect(screen.getByText('View Requirements')).toBeInTheDocument();
  });
});
```

### Hook Tests

```ts
// hooks/__tests__/useProject.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useProject } from '@/hooks/useProject';

jest.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({
        data: {
          id: 'test-project',
          name: 'Test Project',
        },
      }),
    })),
  }),
}));

describe('useProject Hook', () => {
  it('should fetch project data', async () => {
    const { result } = renderHook(() => useProject('test-project'));

    await waitFor(() => {
      expect(result.current.project).toBeDefined();
    });

    expect(result.current.project.name).toBe('Test Project');
  });

  it('should return loading state while fetching', () => {
    const { result } = renderHook(() => useProject('test-project'));

    expect(result.current.loading).toBe(true);

    waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle fetch error', async () => {
    const { result } = renderHook(() => useProject('nonexistent'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

### Hook Tests - Feature Tree

```ts
// hooks/__tests__/useFeatureTree.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFeatureTree } from '@/hooks/useFeatureTree';

describe('useFeatureTree Hook', () => {
  it('should expand/collapse nodes', () => {
    const { result } = renderHook(() => useFeatureTree(['1', '2']));

    expect(result.current.expandedNodes).toContain('1');

    act(() => {
      result.current.toggleNode('1');
    });

    expect(result.current.expandedNodes).not.toContain('1');
  });

  it('should handle expand all', () => {
    const { result } = renderHook(() => useFeatureTree(['1', '2', '3']));

    act(() => {
      result.current.expandAll();
    });

    expect(result.current.expandedNodes).toEqual(['1', '2', '3']);
  });

  it('should handle collapse all', () => {
    const { result } = renderHook(() => useFeatureTree(['1', '2', '3']));

    act(() => {
      result.current.collapseAll();
    });

    expect(result.current.expandedNodes).toEqual([]);
  });
});
```

### API Route Tests

```ts
// app/api/projects/[projectId]/ideas/__tests__/route.test.ts
import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: Function) => handler,
}));

jest.mock('@/lib/supabase/client');

describe('GET /api/projects/:projectId/ideas', () => {
  it('should return ideas for project', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/projects/test-project/ideas')
    );

    const response = await GET(req, { params: { projectId: 'test-project' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ideas).toBeDefined();
    expect(Array.isArray(data.ideas)).toBe(true);
  });

  it('should return 404 if project not found', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/projects/nonexistent/ideas')
    );

    const response = await GET(req, { params: { projectId: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('should return 401 if unauthorized', async () => {
    // Mock auth failure
    const response = await GET(
      new NextRequest(new URL('http://localhost:3000/api/projects/test-project/ideas')),
      { params: { projectId: 'test-project' } }
    );

    expect(response.status).toBe(401);
  });
});

describe('POST /api/projects/:projectId/ideas', () => {
  it('should create new idea', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/projects/test-project/ideas'),
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Idea',
          description: 'Test idea',
          tags: ['test'],
        }),
      }
    );

    const response = await POST(req, { params: { projectId: 'test-project' } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.idea.id).toBeDefined();
    expect(data.idea.title).toBe('New Idea');
  });

  it('should validate required fields', async () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/api/projects/test-project/ideas'),
      {
        method: 'POST',
        body: JSON.stringify({ title: '' }), // missing required field
      }
    );

    const response = await POST(req, { params: { projectId: 'test-project' } });

    expect(response.status).toBe(400);
  });
});
```

### Mock Supabase Client

```ts
// lib/__tests__/mockSupabase.ts
export const mockSupabaseClient = {
  from: jest.fn((table) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
  })),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: {} } }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
};
```

### Test Data Fixtures

```ts
// __tests__/fixtures/ideas.ts
export const mockIdeas = [
  {
    id: '1',
    project_id: 'test-project',
    title: 'Authentication System',
    description: 'Multi-factor authentication',
    status: 'published',
    created_at: '2025-01-01',
    maturity_score: 85,
    views: 15,
  },
  {
    id: '2',
    project_id: 'test-project',
    title: 'Dashboard',
    description: 'Main dashboard view',
    status: 'draft',
    created_at: '2025-01-02',
    maturity_score: 45,
    views: 3,
  },
];

// __tests__/fixtures/features.ts
export const mockFeatures = [
  {
    id: '1',
    project_id: 'test-project',
    name: 'User Authentication',
    description: 'Auth system',
    status: 'in-progress',
    parent_id: null,
  },
  {
    id: '1.1',
    project_id: 'test-project',
    name: 'Multi-factor Auth',
    description: 'MFA implementation',
    status: 'draft',
    parent_id: '1',
  },
];
```

### Test Coverage Targets
- Hall Module: 85%+
- Pattern Shop Module: 85%+
- Control Room Module: 85%+
- Assembly Floor Module: 85%+
- Insights Lab Module: 85%+
- Common Hooks: 90%+
- API Routes: 85%+
- Overall: 80%+

## File Structure
```
/app/components/Hall/__tests__/
/app/components/PatternShop/__tests__/
/app/components/ControlRoom/__tests__/
/app/components/AssemblyFloor/__tests__/
/app/components/InsightsLab/__tests__/
/app/hooks/__tests__/
/app/api/**/__tests__/
/app/__tests__/fixtures/
/app/__tests__/mockSupabase.ts
```

## Acceptance Criteria
- [ ] All component tests pass
- [ ] All hook tests pass
- [ ] All API route tests pass
- [ ] Mock Supabase set up correctly
- [ ] Test fixtures available
- [ ] Coverage ≥85% for all modules
- [ ] Test utilities created (render, mock)
- [ ] Snapshot tests for static components (optional)
- [ ] Integration tests for related components
- [ ] Tests run in CI/CD
- [ ] Fast test execution (<30 seconds for unit tests)

## Testing Instructions
1. `npm test -- --coverage` - Run all tests and show coverage
2. `npm test -- Hall` - Run Hall module tests only
3. `npm test -- --watch` - Run tests in watch mode
4. Review coverage report for gaps
5. Add tests for uncovered code paths
6. Test user interactions with userEvent
7. Test async operations with waitFor
8. Mock external dependencies appropriately
9. Keep tests focused and isolated
10. Run before each commit
