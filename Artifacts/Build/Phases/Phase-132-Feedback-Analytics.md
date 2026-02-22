# Phase 132: Insights Lab - Feedback Analytics

## Objective
Build an analytics dashboard in Insights Lab displaying feedback trends, category distribution, and feature popularity metrics.

## Prerequisites
- Phase 081: Insights Lab - Feedback Inbox (feedback collection)
- Chart visualization library (Recharts or Chart.js)
- Historical feedback data

## Context
Product teams need data-driven insights into feedback patterns. Analytics dashboard reveals trends over time, identifies most-discussed features, and highlights emerging issues. This enables product decisions based on aggregate feedback signals.

## Detailed Requirements

### Analytics Dashboard Layout
- Dashboard tab in Insights Lab alongside Inbox
- Responsive grid layout with 4-6 widgets
- Configurable date range (selector at top)
- "Export data" button (CSV/JSON format)

### Chart Widgets

**1. Feedback Volume Over Time (Line Chart)**
- X-axis: Date (daily or weekly granularity)
- Y-axis: Count of feedback items
- Show trend line (7-day moving average)
- Filters: by status (Open, Reviewed, Addressed)
- Hover shows count and date
- Click on point to drill down to that day's feedback

**2. Category Distribution (Pie Chart)**
- Segments: one per feedback category
- Color-coded by category
- Show percentage and count
- Legend with sort: by name or by count
- Click segment to filter Inbox by category
- Hover shows count and percentage

**3. Top Mentioned Features (Horizontal Bar Chart)**
- X-axis: count of mentions
- Y-axis: feature names
- Top 10 features by mention count
- Sort: by count or alphabetically
- Color gradient (red for high mention = high impact area)
- Click bar to filter Inbox by feature
- Show feature icon/tag

**4. Score Distribution (Histogram)**
- X-axis: score ranges (0-20, 21-40, 41-60, 61-80, 81-100)
- Y-axis: count of feedback items in range
- Color-code: low scores red, high scores green
- Hover shows count and percentage
- Drag range selector to zoom/filter

**5. Feedback Status Summary (Donut Chart)**
- Segments: Open, Reviewed, Addressed
- Show count and percentage per status
- Click segment to filter
- Center shows total count

**6. Average Score Trend (Line Chart)**
- X-axis: Date
- Y-axis: Average feedback score
- Show trend line with confidence band
- Indicates if sentiment improving/declining
- Hover shows average and count of feedback on date

### Date Range Picker
- Preset buttons: Last 7 days, Last 30 days, Last 90 days, All time
- Custom date range: calendar date pickers
- Apply button
- All charts update when range changes

### Data Export
- "Export" button in top-right
- Format options: CSV, JSON
- Includes: feedback items, scores, categories, features, timestamps
- File naming: `feedback-analytics-{startDate}-{endDate}.{format}`

### Data Aggregation Queries
- Queries should use pre-aggregated data if available (materialized views or nightly jobs)
- Fallback to real-time queries if data volume small
- Cache results for 1 hour

### Database Schema
```sql
CREATE TABLE feedback_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  snapshot_date DATE NOT NULL,
  total_feedback_count INTEGER,
  avg_score FLOAT,
  by_status JSONB, -- { "open": count, "reviewed": count, "addressed": count }
  by_category JSONB, -- { "category_name": count, ... }
  top_features JSONB, -- { "feature_id": { "name": "...", "count": count }, ... }
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(project_id, snapshot_date)
);

CREATE INDEX idx_feedback_analytics_project ON feedback_analytics_snapshots(project_id);
```

### Real-Time Analytics (Alternative)
- If using real-time approach, queries on feedback table with WHERE filters
- Optimize with indexes on: project_id, created_at, status, category, score
- Use database window functions and aggregations

### Performance Optimization
- Pre-calculate daily snapshots (nightly batch job)
- Cache query results for 1 hour
- Lazy load charts (load visible ones first)
- Pagination: show top 10 features, allow "Load more"
- Debounce date range updates (wait 500ms after user stops typing)

## File Structure
```
/app/components/InsightsLab/Analytics/AnalyticsDashboard.tsx
/app/components/InsightsLab/Analytics/VolumeChart.tsx
/app/components/InsightsLab/Analytics/CategoryDistribution.tsx
/app/components/InsightsLab/Analytics/TopFeaturesChart.tsx
/app/components/InsightsLab/Analytics/ScoreDistribution.tsx
/app/components/InsightsLab/Analytics/StatusSummary.tsx
/app/components/InsightsLab/Analytics/AverageScoreTrend.tsx
/app/components/InsightsLab/Analytics/DateRangePicker.tsx
/app/api/projects/[projectId]/insights-lab/analytics/route.ts
/app/lib/supabase/migrations/create-feedback-analytics.sql
/app/lib/jobs/feedbackAnalyticsSnapshot.ts
/app/hooks/useFeedbackAnalytics.ts
```

## Acceptance Criteria
- [ ] Analytics tab available in Insights Lab
- [ ] Feedback Volume Over Time line chart displays correctly
- [ ] Volume chart shows 7-day moving average trend line
- [ ] Category Distribution pie chart shows all categories
- [ ] Category chart pie segments are color-coded and labeled
- [ ] Top Mentioned Features bar chart shows top 10 features
- [ ] Feature chart is sorted by count (highest first)
- [ ] Score Distribution histogram shows score ranges
- [ ] Histogram colors gradient from red (low) to green (high)
- [ ] Feedback Status Summary donut chart displays
- [ ] Average Score Trend line chart shows sentiment trend
- [ ] Date range picker has preset buttons (7d, 30d, 90d, all)
- [ ] Custom date range picker works
- [ ] All charts update when date range changes
- [ ] Export button downloads CSV file with correct data
- [ ] Export button downloads JSON file with correct data
- [ ] Charts handle large data sets without lag
- [ ] Drill-down: clicking chart element filters Inbox
- [ ] Responsive: dashboard works on mobile/tablet/desktop
- [ ] Performance: charts render in <2 seconds
- [ ] Test with 1000+ feedback items
- [ ] Cache prevents repeated queries within 1 hour

## Testing Instructions
1. Navigate to Insights Lab > Analytics tab
2. Verify all 6 charts visible and loading
3. **Test Feedback Volume Chart:**
   - Verify line chart shows feedback count over time
   - Hover on data point, see count and date
   - Verify 7-day trend line smooth
4. **Test Category Distribution:**
   - Pie chart shows categories with percentages
   - Hover shows count and percentage
   - Click category segment
   - Verify Inbox filters to that category
5. **Test Top Features Chart:**
   - Bar chart shows features by mention count
   - Top feature has longest bar
   - Click bar
   - Verify Inbox filters by feature
6. **Test Score Distribution:**
   - Histogram shows score ranges (0-20, 21-40, etc.)
   - Colors gradient from red to green
   - Hover shows count
7. **Test Status Summary:**
   - Donut shows Open, Reviewed, Addressed segments
   - Percentages add to 100%
8. **Test Score Trend:**
   - Line chart shows average score over time
   - Upward trend indicates improving sentiment
   - Downward trend indicates declining sentiment
9. **Test Date Range Picker:**
   - Click "Last 7 days" preset
   - All charts update to show only last 7 days data
   - Try "Last 30 days", "Last 90 days", "All time"
10. **Test Custom Date Range:**
    - Click calendar icons
    - Select start and end dates
    - Click "Apply"
    - Verify charts update
11. **Test Export:**
    - Click "Export"
    - Select "CSV"
    - Verify file downloads with correct name
    - Open CSV and spot-check data accuracy
    - Repeat with JSON format
12. **Performance Test:**
    - Create 500+ feedback items
    - Open Analytics dashboard
    - Measure load time (should be <2 seconds)
    - Verify charts render correctly
    - Change date range multiple times
    - Verify responsiveness
13. **Responsive Test:**
    - Resize browser to mobile width (375px)
    - Verify dashboard layout adapts
    - Charts stack vertically
    - All interactive elements accessible
14. **Caching Test:**
    - Load analytics at time T
    - Note load time
    - Reload at time T+10 seconds
    - Should load faster (from cache)
    - Wait 1+ hour, reload again
    - Should fetch fresh data
