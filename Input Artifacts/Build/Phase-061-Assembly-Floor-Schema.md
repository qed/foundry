# Phase 061 - Assembly Floor Database Schema

## Objective
Establish the complete database schema for work order management, including tables for work orders, phases, and activity tracking with proper relationships, constraints, and Row-Level Security policies.

## Prerequisites
- Phase 002: Supabase Project Setup (database access)
- PostgreSQL knowledge
- Familiarity with Supabase RLS policies

## Context
The Assembly Floor is built on a foundation of structured data. The schema defines how work orders flow through statuses, how they're organized into phases, and how all changes are tracked for audit trails and activity feeds. The design supports kanban boards, table views, progress rollups, and the agent's ability to extract and manage work orders.

## Detailed Requirements

### Tables to Create

#### 1. phases Table
```sql
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, name)
);
```

#### 2. work_orders Table
```sql
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_node_id UUID REFERENCES feature_nodes(id) ON DELETE SET NULL,
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  description_json JSONB,
  acceptance_criteria TEXT,
  implementation_plan TEXT,
  implementation_plan_json JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'ready', 'in_progress', 'in_review', 'done')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX idx_work_orders_phase_id ON work_orders(phase_id);
CREATE INDEX idx_work_orders_assignee_id ON work_orders(assignee_id);
CREATE INDEX idx_work_orders_feature_node_id ON work_orders(feature_node_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_project_phase ON work_orders(project_id, phase_id);
```

#### 3. work_order_activity Table
```sql
CREATE TABLE work_order_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_work_order_activity_work_order_id ON work_order_activity(work_order_id);
CREATE INDEX idx_work_order_activity_user_id ON work_order_activity(user_id);
CREATE INDEX idx_work_order_activity_created_at ON work_order_activity(created_at DESC);
```

### Enums
- `work_order_status`: backlog, ready, in_progress, in_review, done
- `work_order_priority`: critical, high, medium, low
- `phase_status`: planned, active, completed

### Constraints & Validations
- Work order title required (min 3 chars, max 255)
- Position field maintains kanban column ordering
- Status transitions follow workflow rules (enforced in API layer)
- Phase can only contain work orders from same project
- Activity entries immutable (no updates, only inserts)

## Database Schema

See "Detailed Requirements" section above for full SQL schema including:
- phases table with position ordering and status tracking
- work_orders table with comprehensive fields and foreign keys
- work_order_activity table for immutable audit trail
- Appropriate indexes for query performance
- Check constraints for enum values

## Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_activity ENABLE ROW LEVEL SECURITY;

-- phases: users can see phases for projects they're members of
CREATE POLICY phases_project_access ON phases
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- work_orders: same project member access
CREATE POLICY work_orders_project_access ON work_orders
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- work_orders: insert requires project member
CREATE POLICY work_orders_insert ON work_orders
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- work_orders: update requires project member
CREATE POLICY work_orders_update ON work_orders
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- work_order_activity: same project member access
CREATE POLICY work_order_activity_project_access ON work_order_activity
  FOR SELECT USING (
    work_order_id IN (
      SELECT id FROM work_orders WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- work_order_activity: insert requires project member
CREATE POLICY work_order_activity_insert ON work_order_activity
  FOR INSERT WITH CHECK (
    work_order_id IN (
      SELECT id FROM work_orders WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid()
      )
    ) AND user_id = auth.uid()
  );
```

## File Structure
- `/migrations/[timestamp]_create_assembly_floor_schema.sql` - Migration file with all tables, indexes, and RLS policies
- Supabase dashboard verification of created tables

## Acceptance Criteria
- All 3 tables created with correct columns and data types
- Foreign key relationships enforced
- Primary keys and unique constraints in place
- All indexes created and verified
- RLS policies enabled and tested
- Activity table immutability verified (no update/delete policies)
- Check constraints for enum values enforced
- Default values apply correctly (timestamps, positions, status)

## Testing Instructions

1. **Table Creation Verification**
   - Connect to database and verify all 3 tables exist: `\dt`
   - Verify columns for each table: `\d phases`, `\d work_orders`, `\d work_order_activity`

2. **Foreign Key Testing**
   - Attempt to insert work order with invalid project_id (should fail)
   - Attempt to insert work order with valid project_id (should succeed)
   - Delete project and verify cascade deletes work orders

3. **Index Verification**
   - Query `pg_indexes` to confirm all indexes created
   - Run EXPLAIN ANALYZE on common queries to verify index usage

4. **RLS Policy Testing**
   - Create test project with two users
   - User A inserts work order
   - User B (not project member) attempts SELECT (should fail)
   - User B attempts INSERT (should fail)
   - Add User B as project member
   - User B now can SELECT and INSERT

5. **Constraint Testing**
   - Attempt invalid status value (should fail)
   - Attempt invalid priority value (should fail)
   - Attempt to delete work order with activity entries (should cascade and delete)

6. **Activity Table Immutability**
   - Insert activity entry
   - Attempt UPDATE (should fail)
   - Attempt DELETE (should fail)
   - Verify audit trail cannot be tampered with
