# Phase 011 - Hall Database Schema

## Objective
Establish the foundational PostgreSQL schema for The Hall module, including tables for raw ideas, tags, connections, and supporting metadata. Implement Row-Level Security (RLS) policies to ensure users only access ideas within their authorized projects.

## Prerequisites
- Phase 002: Project & Organization Structure (projects table must exist)
- Supabase project created with PostgreSQL database

## Context
The Hall is a low-friction intake area where product ideas live before formal processing. The schema must support:
- Capturing raw product ideas with minimal metadata
- Flexible tagging system with custom colors
- Idea connections for tracking relationships (related, duplicates, extends)
- Status tracking (raw → developing → mature → promoted → archived)
- Full auditability (who created, when created/updated)
- RLS enforcement so teams only see their own project ideas

## Detailed Requirements

### Database Tables

#### 1. ideas
Core table for capturing raw product ideas.

```sql
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'developing', 'mature', 'promoted', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  promoted_to_seed_id UUID REFERENCES public.pattern_seeds(id) ON DELETE SET NULL
);

CREATE INDEX idx_ideas_project_id ON public.ideas(project_id);
CREATE INDEX idx_ideas_created_by ON public.ideas(created_by);
CREATE INDEX idx_ideas_status ON public.ideas(status);
CREATE INDEX idx_ideas_promoted_to_seed_id ON public.ideas(promoted_to_seed_id);
```

#### 2. tags
Project-scoped tags for organizing ideas.

```sql
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#808080',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_tags_project_id ON public.tags(project_id);
```

#### 3. idea_tags
Junction table for many-to-many relationship between ideas and tags.

```sql
CREATE TABLE public.idea_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(idea_id, tag_id)
);

CREATE INDEX idx_idea_tags_idea_id ON public.idea_tags(idea_id);
CREATE INDEX idx_idea_tags_tag_id ON public.idea_tags(tag_id);
```

#### 4. idea_connections
Tracks relationships between ideas (related, duplicates, extends).

```sql
CREATE TABLE public.idea_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  target_idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'related' CHECK (connection_type IN ('related', 'duplicates', 'extends')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_idea_id, target_idea_id, connection_type)
);

CREATE INDEX idx_idea_connections_source ON public.idea_connections(source_idea_id);
CREATE INDEX idx_idea_connections_target ON public.idea_connections(target_idea_id);
```

#### 5. agent_conversations
Stores Hall Agent chat history and context per project.

```sql
CREATE TABLE public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module TEXT NOT NULL DEFAULT 'hall',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_conversations_project_id ON public.agent_conversations(project_id);
```

### Row-Level Security (RLS) Policies

#### ideas table
Users can only view, insert, update, or delete ideas in projects they belong to.

```sql
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY ideas_select_policy
  ON public.ideas FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ideas_insert_policy
  ON public.ideas FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ideas_update_policy
  ON public.ideas FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ideas_delete_policy
  ON public.ideas FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );
```

#### tags table
Users can only view, insert, or update tags in projects they belong to.

```sql
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select_policy
  ON public.tags FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY tags_insert_policy
  ON public.tags FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY tags_update_policy
  ON public.tags FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY tags_delete_policy
  ON public.tags FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );
```

#### idea_tags table
Inherit project access via idea_id foreign key.

```sql
ALTER TABLE public.idea_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY idea_tags_select_policy
  ON public.idea_tags FOR SELECT
  USING (
    idea_id IN (
      SELECT id FROM public.ideas
      WHERE project_id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY idea_tags_insert_policy
  ON public.idea_tags FOR INSERT
  WITH CHECK (
    idea_id IN (
      SELECT id FROM public.ideas
      WHERE project_id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY idea_tags_delete_policy
  ON public.idea_tags FOR DELETE
  USING (
    idea_id IN (
      SELECT id FROM public.ideas
      WHERE project_id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid()
      )
    )
  );
```

#### idea_connections table
Inherit project access via source_idea_id and target_idea_id.

```sql
ALTER TABLE public.idea_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY idea_connections_select_policy
  ON public.idea_connections FOR SELECT
  USING (
    source_idea_id IN (
      SELECT id FROM public.ideas
      WHERE project_id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY idea_connections_insert_policy
  ON public.idea_connections FOR INSERT
  WITH CHECK (
    source_idea_id IN (
      SELECT id FROM public.ideas
      WHERE project_id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY idea_connections_delete_policy
  ON public.idea_connections FOR DELETE
  USING (
    source_idea_id IN (
      SELECT id FROM public.ideas
      WHERE project_id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid()
      )
    )
  );
```

#### agent_conversations table
Users can only access agent conversations for projects they belong to.

```sql
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_conversations_select_policy
  ON public.agent_conversations FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_conversations_insert_policy
  ON public.agent_conversations FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_conversations_update_policy
  ON public.agent_conversations FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );
```

## File Structure
```
/sessions/sleepy-wizardly-hypatia/mnt/Foundry/Build/
└── Phase-011-Hall-Database-Schema.md (this file)
```

## Acceptance Criteria
1. All tables created with correct column definitions and constraints
2. All indexes exist and function correctly
3. RLS enabled on all tables
4. All RLS policies enforce project-scoped access
5. Foreign key relationships cascade correctly on delete
6. Unique constraints prevent duplicates (e.g., idea_id + tag_id in idea_tags)
7. Timestamps default to `now()` and are properly typed as `TIMESTAMP WITH TIME ZONE`

## Testing Instructions

### Create Test Data
```sql
-- Assuming org, project, and users exist
INSERT INTO public.ideas (project_id, title, body, created_by)
VALUES (
  'your-project-id',
  'Test Idea',
  'This is a test idea body',
  auth.uid()
);

INSERT INTO public.tags (project_id, name, color)
VALUES ('your-project-id', 'Feature', '#FF5733');

-- Get the idea_id and tag_id, then link them
INSERT INTO public.idea_tags (idea_id, tag_id)
VALUES ('idea-uuid', 'tag-uuid');
```

### Test RLS
1. Log in as User A in project A; verify they can only see ideas in project A
2. Log in as User B in project B; verify they cannot see User A's ideas
3. Attempt to directly query ideas table without proper project membership; verify RLS blocks access
4. Create an idea as User A; verify created_by is correctly set to User A's UUID
5. Update an idea; verify updated_at timestamp changes

### Test Cascade Delete
1. Delete a project; verify all associated ideas, tags, and connections are removed
2. Delete an idea; verify all associated idea_tags and connections are removed
3. Delete a tag; verify it's removed from all ideas (idea_tags rows deleted)

### Test Unique Constraints
1. Try to create two idea_tags rows with the same idea_id and tag_id; verify constraint violation
2. Try to create two tags with the same project_id and name; verify constraint violation
3. Try to create two connections with the same source, target, and type; verify constraint violation
