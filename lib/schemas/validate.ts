import { z } from 'zod'

/**
 * Validate request body against a Zod schema.
 * Returns parsed data on success, or a 400 Response on failure.
 */
export async function validateRequest<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T> } | { error: Response }> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return {
      error: Response.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      ),
    }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      error: Response.json(
        {
          error: 'Validation failed',
          issues: result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    }
  }

  return { data: result.data }
}
