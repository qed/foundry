import { openApiSpec } from '@/lib/api-docs/openapi'

export async function GET() {
  return Response.json(openApiSpec)
}
