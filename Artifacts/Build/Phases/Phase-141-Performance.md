# Phase 141: Performance Optimization

## Objective
Optimize Helix Foundry for speed: reduce bundle size, lazy load components, optimize images, memoize expensive computations, and implement code splitting.

## Prerequisites
- All pages from Phases 001-140
- Next.js 14+ with built-in optimizations
- Bundle analyzer capability
- Performance monitoring

## Context
Slow applications frustrate users and hurt engagement. Performance optimization improves user experience, reduces load times, and improves SEO.

## Detailed Requirements

### Performance Goals
- **Lighthouse Score:** ≥90 (Performance)
- **First Contentful Paint (FCP):** <1.5s
- **Largest Contentful Paint (LCP):** <2.5s
- **Cumulative Layout Shift (CLS):** <0.1
- **Time to Interactive (TTI):** <3.5s

### Bundle Size Optimization
- **Analyze Bundle:**
  ```bash
  npm install --save-dev @next/bundle-analyzer
  ```

- **Next.js Config:**
  ```js
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });

  module.exports = withBundleAnalyzer({
    // ... config
  });
  ```

- **Run Analysis:**
  ```bash
  ANALYZE=true npm run build
  ```

- **Targets:**
  - Main bundle: <200KB (gzipped)
  - Per-route bundle: <100KB
  - Vendor bundle (deps): separate caching

### Code Splitting
- **Route-Based Splitting (Automatic):**
  - Each route gets its own bundle
  - Shared code extracted to common chunk
  - Next.js handles automatically

- **Component-Based Splitting:**
  ```tsx
  // Lazy load heavy components
  import dynamic from 'next/dynamic';

  const HeavyEditor = dynamic(() => import('@/components/editors/CodeEditor'), {
    loading: () => <EditorSkeleton />,
    ssr: false, // Don't render on server if not needed
  });

  export function EditorPage() {
    return <HeavyEditor />;
  }
  ```

- **Libraries to Code-Split:**
  - Rich text editors (Monaco, TipTap)
  - Chart libraries (Recharts, Chart.js)
  - PDF exporters
  - Markdown processors
  - Image editors
  - AI agent integrations

### Image Optimization
- **Use Next.js Image Component:**
  ```tsx
  import Image from 'next/image';

  <Image
    src="/blueprint-diagram.png"
    alt="Blueprint diagram"
    width={800}
    height={600}
    priority={false} // set true for above-fold images
    quality={80} // balance quality/size
    placeholder="blur" // blur while loading
  />
  ```

- **Image Formats:**
  - Use WebP for modern browsers (next/image handles)
  - JPEG for photos
  - PNG for graphics (if transparency not needed)
  - SVG for icons

- **Responsive Images:**
  - Provide multiple sizes via srcSet
  - Let browser choose best size
  - Use `sizes` prop for layout hints

- **Image Hosting:**
  - Store large images in Supabase Storage
  - Serve via CDN (fast delivery)
  - Optimize on upload

### Lazy Loading
- **Intersection Observer:**
  ```tsx
  import { useEffect, useRef, useState } from 'react';

  export function LazyImage({ src, alt }) {
    const ref = useRef(null);
    const [imageSrc, setImageSrc] = useState(null);

    useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setImageSrc(src);
          observer.unobserve(ref.current);
        }
      });

      observer.observe(ref.current);
      return () => observer.disconnect();
    }, [src]);

    return (
      <img
        ref={ref}
        src={imageSrc}
        alt={alt}
        style={{ width: '100%', height: 'auto' }}
      />
    );
  }
  ```

### Memoization
- **React.memo for Components:**
  ```tsx
  const IdeaCard = React.memo(({ idea }) => {
    return <div>{idea.title}</div>;
  });
  ```

- **useMemo for Expensive Calculations:**
  ```tsx
  const sortedIdeas = useMemo(() => {
    console.log('Computing sort');
    return ideas.sort((a, b) => b.maturity - a.maturity);
  }, [ideas]);
  ```

- **useCallback for Callbacks:**
  ```tsx
  const handleEdit = useCallback((id) => {
    // update logic
  }, []); // deps array
  ```

- **When to Memoize:**
  - Component renders in multiple places
  - Expensive computation (sort, filter, transform large array)
  - Callback passed to memoized child
  - NOT for simple components (overhead > benefit)

### Database Query Optimization
- **Indexes:**
  - All foreign keys have indexes
  - Frequently filtered columns (status, created_at)
  - Full-text search columns
  - Check with: `EXPLAIN ANALYZE`

- **Query Optimization:**
  ```sql
  -- Good: only select needed columns
  SELECT id, title, status FROM ideas WHERE project_id = $1;

  -- Bad: select all columns
  SELECT * FROM ideas WHERE project_id = $1;

  -- Good: use JOIN for related data
  SELECT ideas.*, COUNT(comments.id) as comment_count
  FROM ideas
  LEFT JOIN comments ON ideas.id = comments.idea_id
  GROUP BY ideas.id;

  -- Avoid N+1 queries
  ```

- **Connection Pooling:**
  - Use Supabase connection pooling
  - Max connections: 20-50 depending on load
  - Reuse connections across requests

### Caching Strategies
- **Browser Cache:**
  - Static assets: cache forever
  - Dynamic pages: cache 1-5 minutes
  - API responses: cache 5-60 minutes (strategy dependent)

- **Supabase Cache:**
  - Use single query instead of multiple (batch)
  - Cache frequently-accessed reference data
  - Invalidate on updates

- **Application Cache (React Query or SWR):**
  ```tsx
  import { useQuery } from '@tanstack/react-query';

  function useIdeas(projectId) {
    return useQuery({
      queryKey: ['ideas', projectId],
      queryFn: async () => {
        const res = await fetch(`/api/ideas?projectId=${projectId}`);
        return res.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    });
  }
  ```

### Web Vitals Monitoring
```tsx
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric) {
  // Send to analytics service
  console.log(metric);
}

getCLS(reportWebVitals);
getFCP(reportWebVitals);
getFID(reportWebVitals);
getLCP(reportWebVitals);
getTTFB(reportWebVitals);
```

### Font Optimization
- **Self-hosted fonts:**
  ```tsx
  import localFont from 'next/font/local';

  const inter = localFont({
    src: [
      { path: './fonts/inter-regular.woff2', weight: '400' },
      { path: './fonts/inter-bold.woff2', weight: '700' },
    ],
  });

  export default function App() {
    return <div className={inter.className}>...</div>;
  }
  ```

- **Font-display: swap** (show fallback while loading)
- **Subset fonts** (only Latin characters if applicable)
- **Limit font files** (max 2-3 families)

### Script Optimization
- **Third-party Scripts (Analytics, Tracking):**
  ```tsx
  import Script from 'next/script';

  <Script
    src="https://analytics.example.com/script.js"
    strategy="lazyOnload"
    onLoad={() => {
      // Track page view
    }}
  />
  ```

- **Strategy Options:**
  - `beforeInteractive`: Load first (critical scripts only)
  - `afterInteractive`: Default (Posthog, analytics)
  - `lazyOnload`: Load when idle

### Performance Testing
- **Lighthouse (Chrome DevTools):**
  - Run performance audit
  - Target score ≥90
  - Identify slow components

- **Web Vitals:**
  - Monitor FCP, LCP, CLS, FID, TTI
  - Alert if exceeding thresholds

- **Real User Monitoring (RUM):**
  - Collect metrics from production users
  - Identify real-world performance issues
  - Use Posthog, LogRocket, Sentry, or custom

- **Load Testing:**
  - Simulate 100+ concurrent users
  - Identify server bottlenecks
  - Test query performance under load

## File Structure
```
/app/components/Layout/LazyImage.tsx
/app/lib/performance/monitoring.ts
/app/lib/performance/caching.ts
/app/pages/_app.tsx (web vitals tracking)
/next.config.js (bundle analyzer, optimizations)
/app/styles/fonts.css (self-hosted fonts)
```

## Acceptance Criteria
- [ ] Lighthouse Performance score ≥90
- [ ] FCP <1.5s
- [ ] LCP <2.5s
- [ ] CLS <0.1
- [ ] TTI <3.5s
- [ ] Main bundle <200KB (gzipped)
- [ ] Per-route bundle <100KB
- [ ] Heavy components lazy loaded (editors, charts)
- [ ] Images optimized (WebP, responsive sizes)
- [ ] No unused code in main bundle
- [ ] Critical CSS inlined
- [ ] Fonts optimized (self-hosted, subset)
- [ ] Database queries optimized with indexes
- [ ] Connection pooling configured
- [ ] Caching strategy in place (browser, app, server)
- [ ] Web vitals monitoring active
- [ ] No layout shifts (CLS <0.1)
- [ ] All pages meet performance targets

## Testing Instructions
1. **Run Lighthouse Audit:**
   - Open DevTools
   - Go to Lighthouse tab
   - Run Performance audit
   - Target score ≥90
   - Review any warnings

2. **Bundle Analysis:**
   ```bash
   ANALYZE=true npm run build
   ```
   - Review bundle size report
   - Identify large dependencies
   - Consider removing/replacing

3. **Lazy Load Components:**
   - Check heavy components are lazy loaded
   - Editor components: shouldn't be in main bundle
   - Chart libraries: shouldn't be in main bundle
   - Verify lazy loading with DevTools Network tab

4. **Image Optimization:**
   - Right-click image > Open in New Tab
   - Check file size
   - Should be WebP for modern browsers
   - Should be reasonably small (<100KB)

5. **Core Web Vitals:**
   - Install Chrome Web Vitals extension
   - Reload page
   - Check FCP, LCP, CLS values
   - Should meet targets

6. **Query Performance:**
   - In Supabase dashboard, check slow queries
   - Optimize queries with EXPLAIN ANALYZE
   - Add indexes for frequently filtered columns

7. **Caching Test:**
   - Open DevTools Network tab
   - Hard refresh (Ctrl+Shift+R)
   - Note load time
   - Reload normally (Ctrl+R)
   - Should be faster (from cache)

8. **Font Loading:**
   - DevTools Network tab
   - Filter by Font
   - Verify fonts are .woff2 format
   - Verify sizes reasonable (<50KB per font)

9. **Real User Monitoring:**
   - Check Posthog or analytics
   - View real-world performance metrics
   - Identify slow pages/features
   - Prioritize optimization

10. **Load Test (Optional):**
    - Use artillery or Apache JMeter
    - Simulate 100+ concurrent users
    - Monitor response times
    - Identify bottlenecks

11. **Mobile Performance:**
    - Throttle network (DevTools > Network > Slow 3G)
    - Reload page
    - Verify still performs well
    - Target: LCP <2.5s on 3G

12. **Code Splitting Verification:**
    - DevTools Network tab
    - Filter by JS
    - Should see multiple chunks (not one large bundle)
    - Verify chunk sizes reasonable
