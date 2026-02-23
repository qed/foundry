-- Phase 080: MCP Connection Schema
-- Enables external AI agents and tools to access work order data via API keys

CREATE TABLE mcp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  api_key_hash VARCHAR(255) NOT NULL UNIQUE,
  api_key_preview VARCHAR(8) NOT NULL,
  agent_type VARCHAR(100) NOT NULL CHECK (agent_type IN ('code_assistant', 'ci_cd', 'github_action', 'custom')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  rate_limit INT NOT NULL DEFAULT 100,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mcp_connections_project_id ON mcp_connections(project_id);
CREATE INDEX idx_mcp_connections_api_key_hash ON mcp_connections(api_key_hash);
CREATE INDEX idx_mcp_connections_status ON mcp_connections(status);

-- RLS: project members can manage connections for their projects
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view connections"
  ON mcp_connections FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Project members can create connections"
  ON mcp_connections FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Project members can update connections"
  ON mcp_connections FOR UPDATE
  USING (is_project_member(project_id));
