# Phase 129: Assembly Floor - MCP Implementation

## Objective
Implement full MCP (Model Context Protocol) integration enabling coding agents (Cursor, Claude Code) to connect to Helix Foundry and interact with work orders, requirements, and blueprints.

## Prerequisites
- Phase 080: Assembly Floor - External Tool Integration (tool setup)
- Work order, blueprint, and requirement data models
- Authentication and API structure
- Basic MCP understanding

## Context
Developers using MCP-compatible tools (Cursor, Claude Code, VS Code extensions) can now connect directly to Helix Foundry's data. The MCP server exposes work orders, blueprints, and requirements, allowing agents to read task details, implementation plans, and linked documentation without leaving their IDE.

## Detailed Requirements

### MCP Server Endpoint
- Expose MCP server at: `https://helix-foundry.example.com/mcp`
- Implements MCP specification for:
  - Resource listing and retrieval
  - Tool invocation
  - Prompt composition

### MCP Resources Available
1. **Work Orders:**
   - URI: `work-order://{projectId}/{workOrderId}`
   - Properties:
     - id, title, description
     - status (Draft, Proposed, In Progress, In Review, Complete)
     - assigned_to (user info)
     - implementation_plan
     - linked_blueprints (list)
     - linked_requirements (list)
     - acceptance_criteria
     - created_at, updated_at

2. **Blueprints:**
   - URI: `blueprint://{projectId}/{blueprintId}`
   - Properties:
     - id, name, description
     - content (full markdown)
     - status
     - linked_features
     - linked_work_orders
     - created_at, updated_at

3. **Requirements:**
   - URI: `requirement://{projectId}/{requirementId}`
   - Properties:
     - id, description
     - acceptance_criteria
     - status
     - linked_features
     - linked_blueprints
     - created_at, updated_at

4. **Project Context:**
   - URI: `project://{projectId}`
   - Properties:
     - name, description
     - all_work_orders (summary)
     - all_blueprints (summary)
     - all_requirements (summary)

### MCP Tools Implemented
1. **list_assigned_work_orders**
   - Returns work orders assigned to authenticated user
   - Params: `projectId` (optional - defaults to user's current project)
   - Returns: array of work order summaries with IDs, titles, status

2. **get_work_order_details**
   - Returns full work order details
   - Params: `workOrderId`, `projectId`
   - Returns: complete work order including implementation plan, linked blueprints/requirements

3. **update_work_order_status**
   - Updates work order status
   - Params: `workOrderId`, `projectId`, `newStatus` (In Progress, In Review, Complete)
   - Returns: updated work order
   - Validation: only allow transitions to valid next states

4. **get_blueprint_content**
   - Returns full blueprint content and metadata
   - Params: `blueprintId`, `projectId`
   - Returns: markdown content, status, linked requirements

5. **get_requirement_details**
   - Returns full requirement details
   - Params: `requirementId`, `projectId`
   - Returns: requirement with acceptance criteria, linked features

6. **search_requirements**
   - Full-text search across requirements
   - Params: `projectId`, `query`
   - Returns: array of matching requirements

### Authentication for MCP
- API token-based auth:
  - User generates API token in Project Settings > "Developer Settings"
  - Token format: `hf_proj_{projectId}_{tokenHash}`
  - Tokens are read-only by default, write tokens available with confirmation
  - Revoke tokens at any time
  - Show created date, last used date, expiration (optional)

- Token Management UI (Project Settings > Developer Settings):
  - "API Tokens" section
  - List existing tokens:
    - Token name (masked: hf_proj_...{last8chars})
    - Permissions (read-only, read-write)
    - Created date
    - Last used date
    - Expires date (if set)
    - Actions: Copy token, Revoke, Edit
  - "Create New Token" button
    - Name field
    - Permissions radio: read-only or read-write
    - Optional expiration date
    - Generate button

### MCP Connection Setup
- "Connect to Helix Foundry" dialog in supported IDEs:
  - Displays connection code (similar to GitHub CLI flow)
  - Instructions: "Paste this code in Helix Foundry Developer Settings"
  - OR: "Create API token and paste below"
  - Project selection dropdown (loaded from user's orgs/projects)
  - "Connect" button
  - Success message with confirmation

### Implementation Details
- MCP server built as Next.js API route (or separate Node server)
- Uses existing auth system (user context from JWT/session)
- Respects project-level permissions (RLS policies)
- Rate limiting: 100 requests/minute per token
- Logging: all MCP access logged with timestamp, user, resource, action
- Error handling: descriptive error messages without exposing sensitive data

### Security Considerations
- Tokens stored as bcrypt hashes, never returned in plain text
- API tokens enforce same RLS policies as UI
- Tokens tied to user account (can be revoked)
- Rate limiting prevents abuse
- Token expiration optional but recommended
- All MCP actions logged to audit table

## File Structure
```
/app/api/mcp/route.ts (MCP server endpoint)
/app/api/projects/[projectId]/mcp/resources/route.ts
/app/api/projects/[projectId]/mcp/tools/route.ts
/app/components/Settings/ProjectSettings/DeveloperSettings.tsx
/app/components/Settings/ProjectSettings/APITokenManagement.tsx
/app/lib/mcp/mcpServer.ts
/app/lib/mcp/resourceProviders.ts
/app/lib/mcp/toolImplementations.ts
/app/lib/supabase/migrations/create-api-tokens.sql
/app/lib/supabase/migrations/create-mcp-audit-log.sql
/app/hooks/useAPITokens.ts
```

### Database Schema
```sql
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  permissions TEXT[] DEFAULT ARRAY['read'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by_user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE mcp_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  token_id UUID REFERENCES api_tokens(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  action TEXT,
  resource_uri TEXT,
  status TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_active ON api_tokens(is_active);
CREATE INDEX idx_mcp_audit_project ON mcp_audit_log(project_id);
```

## Acceptance Criteria
- [ ] MCP server endpoint accessible at /mcp
- [ ] MCP implements resource listing (work orders, blueprints, requirements, projects)
- [ ] list_assigned_work_orders tool works and returns user's assignments
- [ ] get_work_order_details returns complete work order with linked data
- [ ] update_work_order_status changes status and validates transitions
- [ ] get_blueprint_content returns full blueprint markdown
- [ ] get_requirement_details returns requirement with acceptance criteria
- [ ] search_requirements performs full-text search accurately
- [ ] API token creation works in Developer Settings
- [ ] Tokens stored as bcrypt hashes (never plain text)
- [ ] Tokens can be revoked and become invalid immediately
- [ ] Token list shows created date, last used date, expiration
- [ ] MCP enforces same permissions as UI (no unauthorized access)
- [ ] Rate limiting limits requests to 100/minute
- [ ] All MCP access logged to audit table
- [ ] Connection setup flow works in supported IDEs (Cursor, Claude Code)
- [ ] Tokens expire correctly if expiration date set
- [ ] Read-only tokens prevent status updates
- [ ] Read-write tokens allow updates
- [ ] Multiple tokens can be created and managed independently

## Testing Instructions
1. Navigate to Project Settings > Developer Settings
2. Click "Create API Token"
3. Fill in:
   - Name: "IDE Integration"
   - Permissions: Read-only
   - Expiration: 90 days from now
4. Click Generate
5. Verify token created and displayed (masked format)
6. Copy token
7. Test token with curl:
   ```
   curl -H "Authorization: Bearer {token}" \
     https://helix-foundry.example.com/mcp/resources/work-order
   ```
8. Verify response lists work orders assigned to user
9. Create a read-write token
10. Test updating work order status:
    ```
    curl -X POST -H "Authorization: Bearer {token}" \
      https://helix-foundry.example.com/mcp/tools/update_work_order_status \
      -d '{"workOrderId": "...", "newStatus": "In Progress"}'
    ```
11. Verify status updated in UI
12. Test with read-only token - update should fail
13. Revoke token
14. Verify subsequent requests are rejected
15. Check audit log shows all MCP actions
16. Test in IDE (Cursor or Claude Code with MCP support)
17. Follow connection setup flow
18. Verify IDE can list and read work orders
19. Test search_requirements with various queries
20. Verify all returned data respects RLS policies

### MCP Client Configuration Example
```json
{
  "mcp_servers": {
    "helix-foundry": {
      "type": "stdio",
      "url": "https://helix-foundry.example.com/mcp",
      "auth": {
        "type": "bearer",
        "token": "{API_TOKEN}"
      },
      "env": {
        "PROJECT_ID": "{projectId}"
      }
    }
  }
}
```
