# Phase 080 - MCP Connection Schema & API

## Objective
Establish schema and API routes for Model Context Protocol (MCP) connections, enabling external AI agents and tools to access and update work order data programmatically.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 010: Supabase Auth Integration
- Understanding of API key management and rate limiting

## Context
MCP connections allow external AI agents, GitHub Actions, and developer tools to integrate with Helix Foundry's Assembly Floor. An AI code assistant could update work order status as it completes implementation. A CI/CD pipeline could create work orders for failed tests. This extensibility enables ecosystem development.

## Detailed Requirements

### MCP Connections

#### Database Schema
```sql
CREATE TABLE mcp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  api_key_hash VARCHAR(255) NOT NULL UNIQUE, -- bcrypt hash of actual key
  api_key_preview VARCHAR(8), -- last 8 chars for display
  agent_type VARCHAR(100) NOT NULL, -- "code_assistant", "ci_cd", "github_action", etc.
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  rate_limit INT DEFAULT 100, -- requests per minute
  scopes TEXT[], -- ["read:work-orders", "write:status", "read:features"]
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mcp_connections_project_id ON mcp_connections(project_id);
CREATE INDEX idx_mcp_connections_user_id ON mcp_connections(user_id);
CREATE INDEX idx_mcp_connections_api_key_hash ON mcp_connections(api_key_hash);
CREATE INDEX idx_mcp_connections_status ON mcp_connections(status);

-- RLS: project members can create/read connections for their project
-- Only creator can revoke
```

#### API Key Management
- Generate random 32-char alphanumeric key on creation
- Display only once (on creation)
- Hash for storage (bcrypt with cost factor 10)
- Return preview (last 8 chars) for identification
- No retrieval endpoint for security

#### Key Format
```
fnd_proj_[projectId]_[randomChars]
Example: fnd_proj_550e8400_e29b_41d4_a716_446655440000_aBcD1234eFgH5678
```

### Scopes
- `read:work-orders` - List and view work orders
- `write:status` - Update work order status
- `write:assignment` - Assign/unassign work orders
- `write:priority` - Update priority
- `read:features` - View feature tree
- `read:phases` - View phases
- `write:create-work-orders` - Create new work orders
- `admin:project` - Full access (if needed)

### Rate Limiting
- Default: 100 requests per minute per API key
- Configurable per connection
- Rate limit headers in response:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 87`
  - `X-RateLimit-Reset: 1645564800` (Unix timestamp)
- 429 response if limit exceeded

## API Routes for MCP

### Work Order Endpoints (via API Key Auth)

#### List Work Orders
```
GET /api/v1/projects/[projectId]/work-orders
  Auth: Bearer [API_KEY]
  Query params: ?status=in_progress&assignee=[userId]&limit=50&offset=0
  Response: {
    data: [ { id, title, status, priority, assignee, phase, ... } ],
    pagination: { total, limit, offset }
  }
  Status: 200
  Rate limit: counted
```

#### Get Work Order Detail
```
GET /api/v1/projects/[projectId]/work-orders/[workOrderId]
  Auth: Bearer [API_KEY]
  Response: {
    id, title, description, status, priority, assignee, phase,
    feature_node, acceptance_criteria, implementation_plan,
    created_at, updated_at, activity: []
  }
  Status: 200
```

#### Update Work Order Status
```
PATCH /api/v1/projects/[projectId]/work-orders/[workOrderId]/status
  Auth: Bearer [API_KEY]
  Request: { status: "in_progress" | "in_review" | "done", comment?: "message" }
  Response: Updated work order
  Status: 200
  Requires scope: write:status
  Creates activity entry: "[API Client] changed status via API"
```

#### Update Work Order Assignment
```
PATCH /api/v1/projects/[projectId]/work-orders/[workOrderId]/assign
  Auth: Bearer [API_KEY]
  Request: { assignee_id: "uuid" | null }
  Response: Updated work order
  Status: 200
  Requires scope: write:assignment
```

#### Update Work Order Priority
```
PATCH /api/v1/projects/[projectId]/work-orders/[workOrderId]/priority
  Auth: Bearer [API_KEY]
  Request: { priority: "critical" | "high" | "medium" | "low" }
  Response: Updated work order
  Status: 200
  Requires scope: write:priority
```

#### Create Work Order
```
POST /api/v1/projects/[projectId]/work-orders
  Auth: Bearer [API_KEY]
  Request: {
    title: "string",
    description?: "string",
    acceptance_criteria?: "string",
    priority?: "critical" | "high" | "medium" | "low",
    assignee_id?: "uuid",
    phase_id?: "uuid",
    feature_node_id?: "uuid"
  }
  Response: Created work order
  Status: 201
  Requires scope: write:create-work-orders
  Activity: "[API Client] created work order via API"
```

### MCP Connection Management

#### Create Connection
```
POST /api/projects/[projectId]/mcp/connections
  Auth: User session (not API key)
  Request: {
    name: "GitHub CI/CD Bot",
    description?: "Auto-create work orders from failed tests",
    agent_type: "github_action",
    scopes: ["read:work-orders", "write:status"],
    rate_limit?: 200
  }
  Response: {
    id: "uuid",
    api_key: "fnd_proj_...", -- displayed once only
    api_key_preview: "...eFgH5678",
    name, description, agent_type, scopes, rate_limit,
    created_at, status
  }
  Status: 201
  Auth: user session only (not API key)
```

#### List Connections
```
GET /api/projects/[projectId]/mcp/connections
  Auth: User session
  Response: [ {
    id, name, agent_type, scopes, rate_limit,
    last_used_at, status, created_at, created_by
    api_key_preview
  } ]
  Status: 200
  Note: API key not returned (only preview)
```

#### Revoke Connection
```
POST /api/projects/[projectId]/mcp/connections/[connectionId]/revoke
  Auth: User session
  Request: { reason?: "string" }
  Response: { success: true, revoked_at }
  Status: 200
  Invalidates API key immediately
```

#### Validate API Key
```
POST /api/v1/auth/validate
  Auth: Bearer [API_KEY]
  Response: {
    valid: true,
    project_id: "uuid",
    scopes: ["read:work-orders", "write:status"],
    rate_limit: 100,
    remaining: 87,
    connection_name: "GitHub CI/CD Bot"
  }
  Status: 200 (valid) or 401 (invalid)
```

## Middleware & Auth

### API Key Authentication Middleware
```typescript
async function authenticateApiKey(req: Request): Promise<{
  connectionId: string;
  projectId: string;
  scopes: string[];
  rateLimit: number;
} | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const apiKey = authHeader.substring(7);
  const keyHash = await bcrypt.hash(apiKey, 10); // or lookup by hash

  const connection = await db.query(
    'SELECT * FROM mcp_connections WHERE api_key_hash = $1 AND status = $2',
    [keyHash, 'active']
  );

  if (!connection) return null;

  // Update last_used_at
  await db.query(
    'UPDATE mcp_connections SET last_used_at = NOW() WHERE id = $1',
    [connection.id]
  );

  return {
    connectionId: connection.id,
    projectId: connection.project_id,
    scopes: connection.scopes,
    rateLimit: connection.rate_limit
  };
}
```

### Scope Validation
```typescript
function validateScope(requiredScope: string, grantedScopes: string[]): boolean {
  return grantedScopes.includes(requiredScope);
}
```

### Rate Limiting
```typescript
async function checkRateLimit(
  connectionId: string,
  limit: number
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  // Use Redis or similar for sliding window rate limiting
  // Return remaining requests and reset timestamp
}
```

## File Structure
```
app/
  api/
    v1/
      auth/
        validate/
          route.ts                        # Validate API key
      projects/
        [projectId]/
          work-orders/
            route.ts                      # GET list (modify for API key auth)
            [workOrderId]/
              route.ts                    # GET detail (modify for API key auth)
              status/
                route.ts                  # PATCH status (API key auth)
              assign/
                route.ts                  # PATCH assignee (API key auth)
              priority/
                route.ts                  # PATCH priority (API key auth)
          mcp/
            connections/
              route.ts                    # POST create, GET list (user auth)
              [connectionId]/
                revoke/
                  route.ts                # POST revoke (user auth)
  middleware/
    apiKeyAuth.ts                         # API key authentication middleware
    rateLimit.ts                          # Rate limiting middleware
  lib/
    mcp/
      keyGeneration.ts                    # Generate API keys
      keyValidation.ts                    # Validate API keys
      rateLimit.ts                        # Rate limit logic
```

## Acceptance Criteria
- mcp_connections table created with correct schema
- API keys generated on connection creation
- API key preview displayed to user (once)
- API key hashed for storage (not plain text)
- Create connection via POST /api/projects/[id]/mcp/connections
- List connections via GET /api/projects/[id]/mcp/connections
- Revoke connection invalidates API key immediately
- v1 API routes accept Bearer token authentication
- GET /api/v1/projects/[id]/work-orders works with API key
- PATCH status/assign/priority work with API key
- Scope validation enforced (e.g., write:status required for status update)
- Rate limiting applied per connection
- Rate limit headers returned in responses
- API key authentication separate from user auth (session)
- Activity entries track MCP actions (e.g., "[API Client] changed status")
- Rate limit reset time calculated correctly
- 401 for invalid/revoked keys
- 403 for insufficient scopes

## Testing Instructions

1. **Connection Creation**
   - POST /api/projects/[id]/mcp/connections with name, agent_type, scopes
   - Verify connection created
   - Verify API key returned (long random string)
   - Verify API key preview shows last 8 chars
   - Verify key not returned on subsequent API calls

2. **API Key Storage**
   - Create connection
   - Query database directly
   - Verify api_key_hash is bcrypt hash (not plain text)
   - Verify api_key_preview matches last 8 chars of generated key

3. **List Connections**
   - Create 2 connections
   - GET /api/projects/[id]/mcp/connections
   - Verify both listed
   - Verify api_key_preview visible but not full key
   - Verify metadata: name, agent_type, scopes, rate_limit

4. **Revoke Connection**
   - Create connection
   - POST /api/projects/[id]/mcp/connections/[id]/revoke
   - Verify status changed to "revoked"
   - Verify API key now invalid
   - Try using key: GET /api/v1/projects/[id]/work-orders with revoked key
   - Verify 401 Unauthorized

5. **API Key Authentication**
   - Create connection with scopes: ["read:work-orders"]
   - GET /api/v1/projects/[id]/work-orders with header: "Authorization: Bearer [key]"
   - Verify 200 success
   - Verify work orders returned

6. **Scope Validation**
   - Create connection with scopes: ["read:work-orders"] (no write)
   - Try PATCH /api/v1/projects/[id]/work-orders/[id]/status with key
   - Verify 403 Forbidden (insufficient scope)
   - Create connection with scopes: ["write:status"]
   - Try same PATCH
   - Verify 200 success

7. **Work Order List via API**
   - Create work orders with various statuses
   - GET /api/v1/projects/[id]/work-orders?status=in_progress
   - Verify only in_progress work orders returned
   - Verify pagination: limit, offset, total

8. **Work Order Detail via API**
   - GET /api/v1/projects/[id]/work-orders/[id] with API key
   - Verify full work order returned
   - Verify includes: title, description, status, priority, assignee, activity

9. **Update Status via API**
   - PATCH /api/v1/projects/[id]/work-orders/[id]/status
   - Body: { status: "in_review" }
   - Verify status updated
   - Navigate to UI, verify status changed
   - Verify activity entry shows "[API Client] changed status"

10. **Update Assignment via API**
    - PATCH /api/v1/projects/[id]/work-orders/[id]/assign
    - Body: { assignee_id: "[userId]" }
    - Verify assignee updated
    - Verify activity entry created

11. **Create Work Order via API**
    - POST /api/v1/projects/[id]/work-orders
    - Body: { title: "New WO via API", priority: "high", description: "..." }
    - Verify work order created
    - Verify appears in UI
    - Verify activity shows "[API Client] created work order via API"

12. **Rate Limiting**
    - Create connection with rate_limit: 5
    - Make 5 requests
    - Verify all succeed
    - Make 6th request
    - Verify 429 Too Many Requests
    - Verify headers: X-RateLimit-Limit: 5, X-RateLimit-Remaining: 0
    - Verify X-RateLimit-Reset timestamp

13. **Rate Limit Headers**
    - Make request with API key
    - Verify response headers:
      - X-RateLimit-Limit: 100
      - X-RateLimit-Remaining: 99
      - X-RateLimit-Reset: [timestamp]

14. **Invalid API Key**
    - Create request with invalid/malformed key: "Bearer invalid_key"
    - Verify 401 Unauthorized

15. **Missing Authorization Header**
    - Request without Authorization header
    - Verify 401 Unauthorized

16. **Last Used At Tracking**
    - Create connection
    - Make request with key
    - Verify last_used_at updated
    - Wait 1 minute
    - Make another request
    - Verify last_used_at more recent

17. **API Key Uniqueness**
    - Create 2 connections
    - Verify each has unique API key
    - No key collisions

18. **Concurrent API Calls**
    - Multiple requests simultaneously with same API key
    - Verify all processed correctly
    - Rate limiting counted accurately

19. **Activity Tracking**
    - Create work order via API
    - Update status via API
    - Navigate to activity feed in UI
    - Verify entries show "[API Client]" or connection name
    - Timestamp accurate

20. **Permission Enforcement**
    - API key for Project A
    - Try to access Project B work orders
    - Verify 403 Forbidden (not authorized)

21. **Performance**
    - List 500 work orders via API
    - Verify < 1s response time
    - No N+1 queries

22. **Documentation**
    - OpenAPI/Swagger doc for v1 API endpoints
    - Includes all routes, parameters, examples
    - Explains scopes and rate limiting
