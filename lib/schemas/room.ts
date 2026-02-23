import { z } from 'zod'

export const createBlueprintSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title is too long'),
  blueprint_type: z.enum(['foundation', 'system_diagram', 'feature']),
  feature_node_id: z.string().uuid().optional().nullable(),
})

export type CreateBlueprintInput = z.infer<typeof createBlueprintSchema>
