# Phase 146: API Documentation

## Objective
Generate comprehensive OpenAPI/Swagger documentation for all API routes with request/response schemas, examples, and auth requirements.

## Prerequisites
- All API routes from Phases 001-145
- Swagger/OpenAPI tools installed
- API response standardization

## Context
Good API documentation enables external developers to integrate and reduces support burden. Auto-generated documentation from code ensures it stays current.

## Detailed Requirements

### OpenAPI Specification Setup

**Installation:**
```bash
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

**swaggerConfig.ts:**
```ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Helix Foundry API',
      version: '1.0.0',
      description: 'API for Helix Foundry - Product Development Platform',
      contact: {
        name: 'Helix Foundry Support',
        email: 'api@helix-foundry.com',
      },
    },
    servers: [
      {
        url: 'https://api.helix-foundry.com',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  },
  apis: ['./app/api/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

**API Route Setup:**
```ts
// app/api/docs/route.ts
import { swaggerSpec } from '@/lib/swagger/config';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(swaggerSpec);
}
```

### Documented API Endpoints

**Example: Ideas API**
```ts
// app/api/projects/[projectId]/ideas/route.ts

/**
 * @swagger
 * /api/projects/{projectId}/ideas:
 *   get:
 *     summary: Get all ideas for a project
 *     tags:
 *       - Hall (Ideas)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, maturity, views]
 *         description: Sort field
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Max results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: List of ideas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ideas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Idea'
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Project not found
 *   post:
 *     summary: Create a new idea
 *     tags:
 *       - Hall (Ideas)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateIdeaRequest'
 *     responses:
 *       201:
 *         description: Idea created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Idea'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

// Schema definitions
/**
 * @swagger
 * components:
 *   schemas:
 *     Idea:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         project_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *         description:
 *           type: string
 *           minLength: 20
 *         status:
 *           type: string
 *           enum: [draft, published]
 *         maturity_score:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         maturity_tier:
 *           type: string
 *           enum: [raw, developing, mature]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         views:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - project_id
 *         - title
 *         - status
 *     CreateIdeaRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *         description:
 *           type: string
 *           minLength: 20
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *       required:
 *         - title
 *         - description
 *         - tags
 */
```

### Documentation Page

**GET /docs/api:**
```tsx
// app/docs/api/page.tsx
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { swaggerSpec } from '@/lib/swagger/config';

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI
        spec={swaggerSpec}
        url="/api/docs"
        defaultModelsExpandDepth={1}
        presets={[
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset,
        ]}
      />
    </div>
  );
}
```

### Common API Response Schemas

```ts
/**
 * @swagger
 * components:
 *   schemas:
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *         total:
 *           type: integer
 *         limit:
 *           type: integer
 *         offset:
 *           type: integer
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         code:
 *           type: string
 *         details:
 *           type: object
 *     ValidationError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         issues:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               path:
 *                 type: array
 *               message:
 *                 type: string
 */
```

### API Endpoints to Document
1. **Hall Module:** Ideas CRUD, Comments, Engagement
2. **Pattern Shop:** Features, Requirements, Agent Integration, Export
3. **Control Room:** Blueprints CRUD, Comments, Drift Detection
4. **Assembly Floor:** Work Orders CRUD, Status Updates, Phase Management
5. **Insights Lab:** Feedback Submission, Inbox, Analytics, Priority Scoring
6. **Auth:** Login, Signup, Logout, Session Management
7. **Projects:** CRUD, Settings, Members
8. **Organization:** CRUD, Settings, Members, Billing (if applicable)

### API Rate Limiting Documentation

```ts
/**
 * @swagger
 * x-rate-limits:
 *   default:
 *     requests: 100
 *     window: 60000  # 1 minute
 *   authenticated:
 *     requests: 500
 *     window: 60000
 */

// Example response headers
/**
 * x-ratelimit-limit: 100
 * x-ratelimit-remaining: 87
 * x-ratelimit-reset: 1642257600
 */
```

### API Versioning

```ts
// app/api/v1/projects/[projectId]/ideas/route.ts
/**
 * @swagger
 * /api/v1/projects/{projectId}/ideas:
 *   get:
 *     summary: Get ideas (v1)
 *     tags:
 *       - Ideas (v1)
 *     # ...
 */
```

### Security Documentation

```ts
/**
 * @swagger
 * /api/projects/{projectId}/ideas:
 *   get:
 *     security:
 *       - BearerAuth: []  # Required auth
 *     x-permissions:
 *       - read:ideas
 *     # ...
 *   post:
 *     security:
 *       - BearerAuth: []
 *     x-permissions:
 *       - write:ideas
 *       - read:projects
 *     # ...
 */
```

### Generate Static Documentation

```bash
#!/bin/bash
# scripts/generate-api-docs.sh

npx swagger-cli bundle app/api/**/*.ts -o public/api-docs.json
npx swagger-cli validate public/api-docs.json
```

### CI/CD Integration

```yaml
# .github/workflows/api-docs.yml
name: Generate API Docs

on:
  push:
    branches: [main]
    paths:
      - 'app/api/**'

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run docs:generate
      - uses: actions/upload-artifact@v3
        with:
          name: api-docs
          path: public/api-docs.json
```

## File Structure
```
/app/api/docs/route.ts
/app/lib/swagger/config.ts
/app/docs/api/page.tsx
/scripts/generate-api-docs.sh
```

## Acceptance Criteria
- [ ] Swagger UI available at /docs/api
- [ ] All API endpoints documented
- [ ] Request/response schemas defined
- [ ] Error responses documented
- [ ] Auth requirements specified
- [ ] Rate limits documented
- [ ] Examples provided for each endpoint
- [ ] Pagination documented
- [ ] Filtering/sorting options documented
- [ ] Validation errors documented
- [ ] API versioning documented
- [ ] Security requirements documented
- [ ] Generated docs auto-updated on API changes

## Testing Instructions
1. Navigate to `/docs/api`
2. Verify Swagger UI loads
3. Search for endpoint: "Get ideas"
4. Expand endpoint
5. Verify schema displayed
6. Click "Try it out"
7. Verify parameters appear
8. Fill in test values
9. Execute request
10. Verify response displayed
11. Check status code and response body
12. Test error case (invalid project ID)
13. Verify error response documented
14. Download OpenAPI spec
15. Validate with swagger-cli
