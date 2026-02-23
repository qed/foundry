import { z } from 'zod'

export const createFeatureNodeSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title is too long'),
  description: z
    .string()
    .max(5000, 'Description is too long')
    .optional()
    .nullable(),
  level: z.enum(['epic', 'feature', 'sub_feature', 'task']),
  parent_id: z.string().uuid().optional().nullable(),
})

export type CreateFeatureNodeInput = z.infer<typeof createFeatureNodeSchema>
