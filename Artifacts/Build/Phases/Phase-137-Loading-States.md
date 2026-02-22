# Phase 137: Loading States & Skeleton Screens

## Objective
Implement comprehensive loading states and skeleton screens for all pages and async operations, ensuring smooth user experience during data fetching.

## Prerequisites
- React 18+ Suspense support
- All prior phases with pages and components
- CSS for skeleton animations
- Next.js App Router

## Context
When data loads, users see blank pages or confusing states. Skeleton screens and loading indicators provide visual feedback, reduce perceived wait time, and improve perceived performance.

## Detailed Requirements

### Skeleton Screen Components
- Skeletal gray boxes matching layout of actual content
- Animated shimmer effect (wave of lighter gray moving across)
- Same width/height as final content
- Removes content preview attack risk

### Skeleton Examples
```tsx
// SidebarSkeleton
export function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-full mt-2"></div>
        </div>
      ))}
    </div>
  );
}

// CardSkeleton
export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 animate-pulse">
      <div className="h-6 bg-gray-300 rounded w-2/3 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-10 bg-gray-300 rounded mt-4"></div>
    </div>
  );
}

// ListSkeleton
export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="border rounded p-4 animate-pulse flex">
          <div className="h-12 w-12 bg-gray-300 rounded mr-4"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-4/5"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Suspense Boundaries
- Wrap each async component with Suspense
- Define fallback UI (skeleton or loading message)
- Granular boundaries (per section, not whole page)

```tsx
// Page with multiple suspense boundaries
export default function IdeasPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<HeaderSkeleton />}>
        <IdeasHeader />
      </Suspense>

      <Suspense fallback={<FiltersSkeleton />}>
        <FiltersPanel />
      </Suspense>

      <Suspense fallback={<ListSkeleton count={10} />}>
        <IdeasList />
      </Suspense>
    </div>
  );
}
```

### Loading Indicators
- **Spinner:** for small async operations (button clicks, form submission)
- **Progress Bar:** for longer operations (file upload, large export)
- **Skeleton:** for data loading (initial page load)

### Spinner Component
```tsx
export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className={`animate-spin rounded-full border-t-blue-600 border-gray-300 ${sizeClasses[size]} ${className}`}></div>
  );
}
```

### Progress Bar Component
```tsx
export function ProgressBar({ progress = 0, label = '' }) {
  return (
    <div className="space-y-2">
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {label && <p className="text-sm text-gray-600">{label}</p>}
    </div>
  );
}
```

### Loading States Per Module

**Hall (Ideas List):**
- Page skeleton: header + filters + list
- Idea card skeleton: title, description, tags, metadata
- Count: 10-15 skeleton cards

**Pattern Shop (Feature Tree):**
- Feature tree skeleton: tree structure with collapsed sections
- Requirement item skeleton: title + excerpt
- Tree loading animation: branch-by-branch reveal

**Control Room (Blueprints):**
- Blueprint skeleton: name + content area + sidebar
- List skeleton: blueprint items with status badge

**Assembly Floor (Work Orders):**
- Board skeleton: columns with card placeholders
- Card skeleton: title + assignee + status
- Kanban column skeleton: 5-10 card placeholders per column

**Insights Lab (Feedback):**
- Inbox skeleton: list of feedback items
- Analytics skeleton: chart area with axis labels
- Chart skeleton: grid lines + placeholder bars/lines

### CSS Animation (Skeleton Shimmer)
```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.animate-pulse {
  animation: shimmer 2s infinite;
  background: linear-gradient(
    90deg,
    #f3f4f6 25%,
    #e5e7eb 50%,
    #f3f4f6 75%
  );
  background-size: 1000px 100%;
}
```

### Progressive Content Loading
- Shell renders first (empty layout)
- Skeletons load next (placeholders)
- Data loads in background
- Content replaces skeletons (smooth transition)
- Fallback to cached data if available

### Async Button Loading State
```tsx
export function LoadingButton({ isLoading, onClick, children, ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="flex items-center gap-2"
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// Usage
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await api.submit(data);
  } finally {
    setIsSubmitting(false);
  }
};

<LoadingButton isLoading={isSubmitting} onClick={handleSubmit}>
  Submit
</LoadingButton>
```

### Loading States for Forms
```tsx
export function FormLoading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
      <div className="animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}
```

### Performance Optimization
- Use CSS animations (faster than JS)
- Skeleton count matches expected content count
- Suspend per-section (not whole page)
- Cache previous state while loading (show old data until new arrives)
- Stream responses if possible (progressive rendering)

### Database Queries
- Optimize query performance to minimize loading time
- Fetch only visible items initially (pagination)
- Prefetch related data to reduce waterfalls
- Use indexes for fast queries

## File Structure
```
/app/components/Loading/Skeleton.tsx
/app/components/Loading/Spinner.tsx
/app/components/Loading/ProgressBar.tsx
/app/components/Loading/CardSkeleton.tsx
/app/components/Loading/ListSkeleton.tsx
/app/components/Loading/TableSkeleton.tsx
/app/components/Hall/IdeasSkeleton.tsx
/app/components/PatternShop/FeatureTreeSkeleton.tsx
/app/components/ControlRoom/BlueprintListSkeleton.tsx
/app/components/AssemblyFloor/KanbanBoardSkeleton.tsx
/app/components/InsightsLab/FeedbackListSkeleton.tsx
/app/components/InsightsLab/AnalyticsSkeleton.tsx
```

## Acceptance Criteria
- [ ] All pages show skeleton/loading state while data loads
- [ ] Skeleton layout matches final content layout
- [ ] Shimmer animation smooth and not distracting
- [ ] Suspense boundaries placed per section (not whole page)
- [ ] Async buttons show spinner while loading
- [ ] Forms show loading state during submission
- [ ] Modals show loading state for async operations
- [ ] Progress bar displays for long operations
- [ ] Loading indicators don't block user interaction where possible
- [ ] Cached data shown while fresh data loads
- [ ] Mobile: loading states responsive at all breakpoints
- [ ] Dark theme: loading skeleton colors appropriate
- [ ] Multiple concurrent loading states handle correctly
- [ ] Loading states clear when data arrives
- [ ] Error state transitions smoothly from loading

## Testing Instructions
1. **Test Page Loading:**
   - Navigate to Hall > Ideas
   - Verify skeleton screens display immediately
   - Verify actual content loads and replaces skeletons
   - No flash of blank page or unformatted content

2. **Test Skeleton Layout:**
   - While skeletons showing, check dimensions
   - Verify skeleton height/width matches final content
   - No layout shift when transitioning to content

3. **Test Suspense Boundaries:**
   - Slow down network (DevTools > Network > Slow 3G)
   - Navigate to page with multiple sections
   - Verify each section loads independently
   - One slow section doesn't block others

4. **Test Async Button:**
   - Click submit button on a form
   - Verify spinner appears in button
   - Verify button disabled during submission
   - Verify spinner disappears when complete

5. **Test Progress Bar:**
   - Trigger long-running operation (file upload, large export)
   - Verify progress bar displays
   - Verify progress advances
   - Verify bar completes when operation done

6. **Test Shimmer Animation:**
   - Watch skeleton screens
   - Verify shimmer effect smooth (not janky)
   - Verify animation speed reasonable (not too fast/slow)

7. **Test Mobile Loading:**
   - Resize to mobile (375px width)
   - Navigate to page
   - Verify skeletons render correctly
   - Verify layout adapts properly

8. **Test Dark Theme Loading:**
   - Set theme to dark
   - Navigate to page with loading state
   - Verify skeleton colors visible in dark theme
   - Verify shimmer effect works in dark

9. **Test Error Handling:**
   - Slow down network significantly
   - Navigate to page
   - Trigger error (disconnect network)
   - Verify error boundary shows (not stuck on skeleton)

10. **Test Cached Data:**
    - Navigate to page, wait for load
    - Go back and navigate again
    - Verify cached data shows immediately
    - Verify fresh data loads in background
    - No re-skeleton if data already cached

11. **Test Form Submission:**
    - Fill form with fields showing loading state
    - Submit
    - Verify form shows loading spinner/disabled state
    - Verify fields are disabled during submission

12. **Test Multiple Concurrent Loads:**
    - Open page with multiple async sections
    - Verify all skeletons show simultaneously
    - Verify each loads independently
    - Verify no race conditions
