# Phase 142: Database Indexing & Query Tuning

## Objective
Optimize PostgreSQL/Supabase database performance by adding strategic indexes, tuning RLS policies, configuring connection pooling, and monitoring slow queries.

## Prerequisites
- All database tables from Phases 001-141
- PostgreSQL/Supabase database
- Query analysis tools (EXPLAIN ANALYZE)
- Monitoring access to database

## Context
Slow queries degrade application performance. Proper indexing, query optimization, and connection pooling ensure database performance scales with user growth.

## Detailed Requirements

### Index Strategy

**Indexes to Add:**
1. **Foreign Key Indexes (if not auto-created):**
   ```sql
   CREATE INDEX idx_ideas_project_id ON ideas(project_id);
   CREATE INDEX idx_features_project_id ON features(project_id);
   CREATE INDEX idx_blueprints_project_id ON blueprints(project_id);
   CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);
   CREATE INDEX idx_feedback_project_id ON feedback(project_id);
   ```

2. **Status/State Indexes:**
   ```sql
   CREATE INDEX idx_ideas_status ON ideas(status);
   CREATE INDEX idx_work_orders_status ON work_orders(status);
   CREATE INDEX idx_blueprints_status ON blueprints(status);
   CREATE INDEX idx_feedback_status ON feedback(status);
   ```

3. **Timestamp Indexes:**
   ```sql
   CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);
   CREATE INDEX idx_work_orders_created_at ON work_orders(created_at DESC);
   CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
   ```

4. **Full-Text Search Indexes:**
   ```sql
   CREATE INDEX idx_ideas_fulltext ON ideas
     USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
   ```

5. **Composite Indexes (Multiple Columns):**
   ```sql
   -- For queries filtering on project_id AND status
   CREATE INDEX idx_ideas_project_status ON ideas(project_id, status);

   -- For sorting by created_at within project
   CREATE INDEX idx_work_orders_project_date ON work_orders(project_id, created_at DESC);
   ```

6. **Partial Indexes (Conditional):**
   ```sql
   -- Only index active items
   CREATE INDEX idx_active_ideas ON ideas(project_id)
     WHERE status != 'archived';
   ```

### Index Monitoring
- Check existing indexes:
  ```sql
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ideas';
  ```

- Find unused indexes:
  ```sql
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  ORDER BY idx_scan ASC
  LIMIT 10;
  ```

- Find missing indexes:
  ```sql
  SELECT schemaname, tablename, attname, n_distinct, correlation
  FROM pg_stats
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY ABS(correlation) DESC;
  ```

### Query Optimization

**EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT ideas.*, COUNT(comments.id) as comment_count
FROM ideas
LEFT JOIN comments ON ideas.id = comments.idea_id
WHERE ideas.project_id = '12345'
GROUP BY ideas.id
ORDER BY ideas.created_at DESC
LIMIT 20;
```

- Look for: Sequential Scans (should be Index Scans)
- Look for: Nested Loops (consider JOIN strategy)
- Look for: Full table scans on large tables

**Query Anti-Patterns to Avoid:**
```sql
-- Bad: Function on indexed column (prevents index use)
WHERE LOWER(title) = 'test'
-- Better:
WHERE title = 'Test' -- case-sensitive

-- Bad: OR with different columns (inefficient)
WHERE project_id = $1 OR user_id = $2
-- Better (if possible): use UNION or IN clause
WHERE project_id IN ($1) UNION SELECT ... WHERE user_id = $2

-- Bad: NOT IN with subquery (slow)
WHERE id NOT IN (SELECT idea_id FROM favorites)
-- Better: use NOT EXISTS
WHERE NOT EXISTS (SELECT 1 FROM favorites WHERE favorites.idea_id = ideas.id)

-- Bad: Selecting unnecessary columns
SELECT * FROM ideas
-- Better: select only needed columns
SELECT id, title, status, created_at FROM ideas

-- Bad: Multiple JOINs without indexes
SELECT * FROM ideas JOIN comments JOIN tags ...
-- Better: ensure all foreign keys indexed
```

### RLS Policy Optimization

**Current Issue:** RLS policies can be slow if they contain expensive subqueries.

**Optimize RLS:**
```sql
-- Bad: expensive subquery in RLS
CREATE POLICY "users can see their org ideas"
  ON ideas FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM projects
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Better: cache org_id in user metadata or separate table
-- Or: ensure indexes on all foreign keys in subquery
```

### Connection Pooling

**Supabase Connection Pooling:**
- Enable in Supabase dashboard: Database > Connection Pooling
- Set pool mode: `Transaction` (for FaaS/serverless)
- Pool size: 20-50 connections
- Max clients: 100

**Connection Pooling in Application:**
```ts
// If using direct connection (not Supabase client)
import { Pool } from 'pg';

const pool = new Pool({
  max: 20, // max pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text, params) {
  return pool.query(text, params);
}
```

### Slow Query Monitoring

**Enable Slow Query Logging:**
```sql
-- In Supabase SQL Editor
ALTER SYSTEM SET log_min_duration_statement = 1000; -- log queries >1s
SELECT pg_reload_conf();
```

**Check Slow Queries in Supabase:**
- Dashboard > Logs > Slow Queries
- Review queries taking >1 second
- Identify patterns
- Optimize or add indexes

**Application-Level Monitoring:**
```ts
// Log query times in API routes
const startTime = Date.now();
const result = await supabase.from('ideas').select('*');
const duration = Date.now() - startTime;

if (duration > 500) {
  console.warn(`Slow query: ${duration}ms`);
}
```

### Database Maintenance

**Regular Tasks:**
1. **Vacuum & Analyze:**
   ```sql
   VACUUM ANALYZE; -- reclaim space, update statistics
   ```
   - Run daily or weekly on Supabase (automatic)
   - Updates table statistics for better query planning

2. **Reindex:**
   ```sql
   REINDEX TABLE ideas; -- rebuild indexes
   ```
   - Do this after bulk deletes
   - Or when indexes become fragmented
   - Usually quarterly

3. **Check Table Size:**
   ```sql
   SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

### Partitioning (For Large Tables)

If table grows very large (>1GB):
```sql
-- Partition feedback table by date (monthly)
ALTER TABLE feedback
  PARTITION BY RANGE (DATE_TRUNC('month', created_at));

CREATE TABLE feedback_2025_01 PARTITION OF feedback
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### N+1 Query Prevention

**Problem:**
```tsx
// Bad: N+1 query (one per item)
const ideas = await getIdeas();
const ideasWithComments = await Promise.all(
  ideas.map(async (idea) => {
    const comments = await getComments(idea.id); // N queries!
    return { ...idea, comments };
  })
);
```

**Solution: Use JOIN or Batch Query:**
```sql
-- Good: single query with JOIN
SELECT
  ideas.*,
  json_agg(json_build_object('id', comments.id, 'text', comments.text)) as comments
FROM ideas
LEFT JOIN comments ON ideas.id = comments.idea_id
WHERE ideas.project_id = $1
GROUP BY ideas.id;
```

### Caching Hot Data

**Frequently Accessed Data:**
- Project metadata (cached in user session)
- Organization metadata (cached in memory)
- User preferences (cached 1 hour)
- Feature list (cached 5 minutes)

Use application caching (Redis or in-memory) for:
```ts
import cache from '@/lib/cache';

async function getFeatures(projectId) {
  const key = `features:${projectId}`;
  const cached = cache.get(key);

  if (cached) return cached;

  const features = await supabase
    .from('features')
    .select('*')
    .eq('project_id', projectId);

  cache.set(key, features, 5 * 60 * 1000); // 5 min TTL
  return features;
}
```

## File Structure
```
/app/lib/supabase/migrations/add-indexes.sql
/app/lib/supabase/migrations/optimize-rls.sql
/app/lib/database/monitoring.ts
/app/lib/database/queryCache.ts
```

## Acceptance Criteria
- [ ] All foreign key columns indexed
- [ ] All frequently-filtered columns indexed (status, created_at)
- [ ] Full-text search indexes created
- [ ] Composite indexes for common query patterns
- [ ] RLS policies optimized (no expensive subqueries)
- [ ] Connection pooling configured
- [ ] Slow query logging enabled
- [ ] EXPLAIN ANALYZE shows index scans (not seq scans)
- [ ] No N+1 query patterns
- [ ] Query response times <100ms for common queries
- [ ] Maintenance jobs scheduled (VACUUM, ANALYZE)
- [ ] Large tables have partial indexes if applicable
- [ ] Index bloat <20% (indexes efficiently sized)
- [ ] Unused indexes removed
- [ ] Hot data cached appropriately

## Testing Instructions
1. **Check Existing Indexes:**
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'ideas'
   ORDER BY indexname;
   ```
   - Verify all foreign keys indexed
   - Verify status columns indexed
   - Verify created_at indexed

2. **Add Missing Indexes:**
   - Review migration file
   - Run migration
   - Verify indexes created

3. **Test Query Performance:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM ideas WHERE project_id = '12345'
   ORDER BY created_at DESC LIMIT 20;
   ```
   - Should show "Index Scan" not "Sequential Scan"
   - Execution time should be <100ms

4. **Monitor Slow Queries:**
   - Go to Supabase Dashboard > Logs > Slow Queries
   - Look for queries taking >1 second
   - Note which queries are slow
   - Optimize or add indexes

5. **Test RLS Performance:**
   - Query table with RLS enabled
   - Check EXPLAIN ANALYZE
   - Should not show expensive subqueries in planning

6. **Test Connection Pooling:**
   - Check Supabase > Database > Connection Pooling
   - Verify pooling enabled
   - Pool size: 20-50
   - Create 10+ concurrent connections
   - Verify no "too many connections" errors

7. **Test Caching:**
   - Call expensive query twice
   - Second call should be much faster (from cache)
   - Verify cache invalidated after timeout

8. **Table Size Check:**
   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('ideas')) as ideas_size;
   ```
   - Verify reasonable size
   - If >1GB, consider partitioning

9. **Index Size Check:**
   ```sql
   SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
   FROM pg_stat_user_indexes
   WHERE relname = 'ideas'
   ORDER BY pg_relation_size(indexrelid) DESC;
   ```
   - Verify indexes not too large
   - Unused indexes should be small (<10MB)

10. **Vacuum & Analyze:**
    - Run `VACUUM ANALYZE` on Supabase
    - Verify no errors
    - Check logs for completion

11. **Load Test Query Performance:**
    - Simulate 100+ concurrent queries
    - Monitor response times
    - Should remain <100ms at 100 concurrent
    - If slower, need more indexes or caching
