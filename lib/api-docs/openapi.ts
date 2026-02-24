/**
 * OpenAPI 3.0 specification for Helix Foundry API.
 * Auto-serves at /api/docs as JSON.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Helix Foundry API',
    version: '1.0.0',
    description:
      'API for Helix Foundry — a product development platform with five modules: Hall (ideas), Pattern Shop (features & requirements), Control Room (blueprints), Assembly Floor (work orders), and Insights Lab (feedback).',
    contact: { name: 'Helix Foundry', email: 'support@helix-foundry.com' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://helix-foundry.vercel.app', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sb-access-token' },
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'MCP / external app key' },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          issues: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
      },
      Idea: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          body: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['raw', 'developing', 'mature', 'promoted', 'archived'] },
          maturity_score: { type: 'integer' },
          maturity_tier: { type: 'string', enum: ['raw', 'developing', 'mature'] },
          view_count: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      FeatureNode: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          parent_id: { type: 'string', format: 'uuid', nullable: true },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['draft', 'in_progress', 'done', 'blocked'] },
          position: { type: 'integer' },
        },
      },
      Blueprint: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          blueprint_type: { type: 'string', enum: ['foundation', 'feature', 'system'] },
          status: { type: 'string', enum: ['draft', 'review', 'approved', 'archived'] },
          content: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      WorkOrder: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'] },
          priority: { type: 'integer' },
          assignee_id: { type: 'string', format: 'uuid', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      FeedbackSubmission: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          category: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['new', 'reviewed', 'accepted', 'rejected', 'converted'] },
          priority_score: { type: 'number', nullable: true },
          submitter_email: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Hall', description: 'Idea management (The Hall)' },
    { name: 'Shop', description: 'Feature tree & requirements (Pattern Shop)' },
    { name: 'Room', description: 'Blueprints (Control Room)' },
    { name: 'Floor', description: 'Work orders & phases (Assembly Floor)' },
    { name: 'Lab', description: 'Feedback & analytics (Insights Lab)' },
    { name: 'Artifacts', description: 'File uploads & management' },
    { name: 'Comments', description: 'Threaded comments & mentions' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Admin', description: 'Organization & project management' },
    { name: 'MCP', description: 'External integrations (v1 API)' },
  ],
  paths: {
    '/api/auth/status': {
      get: { tags: ['Auth'], summary: 'Get current auth status', responses: { 200: { description: 'Auth status' } } },
    },
    '/api/auth/logout': {
      post: { tags: ['Auth'], summary: 'Sign out current user', responses: { 200: { description: 'Logged out' } } },
    },
    '/api/hall/ideas': {
      get: { tags: ['Hall'], summary: 'List ideas for current project', security: [{ cookieAuth: [] }], responses: { 200: { description: 'List of ideas' } } },
      post: { tags: ['Hall'], summary: 'Create a new idea', security: [{ cookieAuth: [] }], responses: { 201: { description: 'Idea created' }, 400: { description: 'Validation error' } } },
    },
    '/api/hall/ideas/{ideaId}': {
      get: { tags: ['Hall'], summary: 'Get idea details', parameters: [{ name: 'ideaId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Idea details' } } },
      put: { tags: ['Hall'], summary: 'Update an idea', parameters: [{ name: 'ideaId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Idea updated' } } },
      delete: { tags: ['Hall'], summary: 'Archive/delete an idea', parameters: [{ name: 'ideaId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Idea archived' } } },
    },
    '/api/hall/tags': {
      get: { tags: ['Hall'], summary: 'List tags', responses: { 200: { description: 'Tag list' } } },
      post: { tags: ['Hall'], summary: 'Create a tag', responses: { 201: { description: 'Tag created' } } },
    },
    '/api/projects/{projectId}/feature-tree': {
      get: { tags: ['Shop'], summary: 'Get full feature tree', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Feature tree' } } },
    },
    '/api/projects/{projectId}/feature-nodes': {
      post: { tags: ['Shop'], summary: 'Create a feature node', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Node created' } } },
    },
    '/api/projects/{projectId}/blueprints': {
      get: { tags: ['Room'], summary: 'List blueprints', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Blueprint list' } } },
      post: { tags: ['Room'], summary: 'Create a blueprint', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Blueprint created' } } },
    },
    '/api/projects/{projectId}/work-orders': {
      get: { tags: ['Floor'], summary: 'List work orders', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Work order list' } } },
      post: { tags: ['Floor'], summary: 'Create a work order', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Work order created' } } },
    },
    '/api/projects/{projectId}/feedback': {
      get: { tags: ['Lab'], summary: 'List feedback submissions', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Feedback list' } } },
    },
    '/api/insights/feedback': {
      post: { tags: ['Lab'], summary: 'Submit feedback (public/app-key)', security: [{ apiKey: [] }], responses: { 201: { description: 'Feedback submitted' } } },
    },
    '/api/projects/{projectId}/artifacts': {
      get: { tags: ['Artifacts'], summary: 'List artifacts', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Artifact list' } } },
      post: { tags: ['Artifacts'], summary: 'Upload an artifact', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Artifact uploaded' } } },
    },
    '/api/projects/{projectId}/comments': {
      get: { tags: ['Comments'], summary: 'List comments for an entity', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Comment list' } } },
      post: { tags: ['Comments'], summary: 'Create a comment', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Comment created' } } },
    },
    '/api/notifications': {
      get: { tags: ['Notifications'], summary: 'List user notifications', responses: { 200: { description: 'Notification list' } } },
    },
    '/api/orgs': {
      post: { tags: ['Admin'], summary: 'Create an organization', responses: { 201: { description: 'Org created' } } },
    },
    '/api/orgs/{orgId}/members': {
      get: { tags: ['Admin'], summary: 'List org members', parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Member list' } } },
    },
    '/api/v1/projects/{projectId}/work-orders': {
      get: { tags: ['MCP'], summary: 'List work orders (v1 API)', security: [{ apiKey: [] }], parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Work order list' } } },
      post: { tags: ['MCP'], summary: 'Create work order (v1 API)', security: [{ apiKey: [] }], parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Work order created' } } },
    },
  },
}
