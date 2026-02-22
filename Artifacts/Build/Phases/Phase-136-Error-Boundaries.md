# Phase 136: Error Boundaries & Fallback UI

## Objective
Implement React Error Boundaries for all modules, providing user-friendly error pages instead of raw stack traces.

## Prerequisites
- React 18+ (error boundary support)
- All prior phases (001-135) with components

## Context
Unhandled errors result in blank pages or cryptic error messages. Error boundaries catch these errors and display helpful, user-friendly messages while preserving application stability.

## Detailed Requirements

### Error Boundary Implementation
```tsx
// components/ErrorBoundary.tsx
interface Props {
  children: React.ReactNode;
  moduleName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<Props, { hasError: boolean; error?: Error }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and potentially to external service
    console.error('Error caught:', error, errorInfo);

    // Call optional callback
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback
        error={this.state.error}
        moduleName={this.props.moduleName}
        onReset={() => this.setState({ hasError: false })}
      />;
    }

    return this.props.children;
  }
}
```

### Error Fallback UI
```tsx
interface ErrorFallbackProps {
  error?: Error;
  moduleName?: string;
  onReset: () => void;
}

export function ErrorFallback({ error, moduleName, onReset }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {moduleName && `An error occurred in the ${moduleName}. `}
          We apologize for the inconvenience. Our team has been notified.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="bg-red-50 dark:bg-red-900 p-4 rounded text-left text-sm">
            <summary className="cursor-pointer font-semibold text-red-900 dark:text-red-200">
              Error Details (Development Only)
            </summary>
            <pre className="text-red-700 dark:text-red-300 overflow-auto mt-2">
              {error.toString()}
            </pre>
          </details>
        )}

        <div className="space-y-3">
          <button
            onClick={onReset}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
          <a
            href="/"
            className="block px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300"
          >
            Go to Home
          </a>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Error ID: {generateErrorId()}
        </p>
      </div>
    </div>
  );
}
```

### Error Boundary Placement
- **Root Level:** Wrap entire app (catches global errors)
- **Module Level:** Wrap each major module (Hall, Pattern Shop, etc.)
- **Page Level:** Wrap individual pages or features
- **Component Level:** Optional for high-risk components (editors, modals)

### Error Boundaries Per Module
1. **Hall (Ideas) Error Boundary**
2. **Pattern Shop Error Boundary**
3. **Control Room Error Boundary**
4. **Assembly Floor Error Boundary**
5. **Insights Lab Error Boundary**
6. **Organization Console Error Boundary**

### Error Logging
- Log errors with context:
  - Error message and stack trace
  - Component/module where error occurred
  - User ID and project ID
  - Timestamp
  - User agent / browser info
  - URL and page context
- Send to error tracking service (Sentry, LogRocket, etc.) or DB
- Generate unique error ID for user reference

### Error Tracking Table
```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_id TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  module_name TEXT,
  error_message TEXT,
  error_stack TEXT,
  error_context JSONB,
  browser_info TEXT,
  url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_unresolved ON error_logs(resolved);
```

### Error Recovery Strategies
- **Retry Button:** Attempt to recover from transient errors
- **Refresh Button:** Full page refresh
- **Navigate Home:** Return to home page
- **Report Bug:** Link to submit bug report with error context

### Specific Error Handling
- **Network Errors:**
  - Message: "Network connection lost. Please check your connection and try again."
- **Auth Errors:**
  - Message: "Your session expired. Please log in again."
  - Action: Redirect to login
- **Permission Errors:**
  - Message: "You don't have permission to access this resource."
  - Action: Redirect to previous page or home
- **Not Found Errors:**
  - Message: "This resource could not be found."
  - Action: Suggest related items or go home
- **Database Errors:**
  - Message: "A database error occurred. Our team is investigating."
  - Action: Retry button

### Development vs. Production
- **Development:** Show full error details and stack trace
- **Production:** Hide sensitive error details, show user-friendly message
- Error ID visible in both for debugging

## File Structure
```
/app/components/ErrorBoundary.tsx
/app/components/ErrorFallback.tsx
/app/components/Hall/HallErrorBoundary.tsx
/app/components/PatternShop/PatternShopErrorBoundary.tsx
/app/components/ControlRoom/ControlRoomErrorBoundary.tsx
/app/components/AssemblyFloor/AssemblyFloorErrorBoundary.tsx
/app/components/InsightsLab/InsightsLabErrorBoundary.tsx
/app/lib/error/errorLogger.ts
/app/lib/error/errorHandler.ts
/app/lib/supabase/migrations/create-error-logs.sql
/app/hooks/useErrorHandler.ts
/app/api/errors/log/route.ts
```

## Acceptance Criteria
- [ ] Root ErrorBoundary wraps entire app
- [ ] Each major module has ErrorBoundary
- [ ] Unhandled errors caught and displayed to user
- [ ] Error fallback UI is user-friendly (no stack traces in production)
- [ ] "Try Again" button attempts recovery
- [ ] "Go to Home" link navigates safely
- [ ] Error details visible in development mode only
- [ ] Error ID generated and displayed
- [ ] Error logged to error_logs table
- [ ] Error includes: message, stack, module, user, project, timestamp
- [ ] Network errors handled with specific message
- [ ] Auth errors redirect to login
- [ ] Permission errors show appropriate message
- [ ] Not Found errors handled gracefully
- [ ] Database errors show user-friendly message
- [ ] Error logging includes browser info
- [ ] Multiple errors don't cascade (isolated boundaries)
- [ ] Errors can be marked as resolved in admin panel
- [ ] Error list viewable for debugging

## Testing Instructions
1. **Test Root Error Boundary:**
   - In a component, throw error: `throw new Error("Test error")`
   - Verify error page displays instead of blank screen
   - Verify error message is user-friendly
   - Verify "Try Again" button works
   - Verify "Go to Home" button works

2. **Test Module Error Boundaries:**
   - Go to Hall and cause error in ideas list
   - Verify Hall error page shows
   - Other modules still accessible (error isolated)
   - Go to Pattern Shop and cause different error
   - Verify separate error boundary catches it

3. **Test Error Logging:**
   - Cause an error
   - Go to admin panel or check error_logs table
   - Verify error is logged with:
     - User ID
     - Project ID
     - Module name
     - Error message
     - Stack trace (if available)
     - Timestamp

4. **Test Network Error:**
   - Simulate network outage (DevTools > Network > Offline)
   - Try to load data
   - Verify network error message displays
   - Show different message than generic error

5. **Test Development vs. Production:**
   - Set NODE_ENV=development
   - Cause error
   - Verify error details and stack trace visible
   - Set NODE_ENV=production
   - Cause same error
   - Verify details hidden, user-friendly message shown

6. **Test Error ID:**
   - Cause error and note error ID
   - Search error_logs table for that ID
   - Verify it's stored

7. **Test Retry Mechanism:**
   - Cause error in async operation
   - Click "Try Again"
   - If error was transient, verify recovery
   - If error persists, verify same error page

8. **Test Permission Error:**
   - As user without access, try to access restricted resource
   - Verify appropriate error message
   - Verify no sensitive info leaked

9. **Test Not Found Error:**
   - Try to navigate to non-existent resource ID
   - Verify "not found" error message
   - Verify helpful suggestions or redirect

10. **Test Multiple Concurrent Errors:**
    - Cause errors in multiple modules simultaneously
    - Verify each module shows its own error page
    - Verify errors don't affect each other
