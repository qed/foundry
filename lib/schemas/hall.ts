import { z } from 'zod'

export const createIdeaSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title is too long'),
  body: z
    .string()
    .max(10000, 'Body is too long')
    .optional()
    .nullable(),
  tag_ids: z.array(z.string().uuid()).optional(),
})

export const updateIdeaSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title is too long')
    .optional(),
  body: z
    .string()
    .max(10000, 'Body is too long')
    .optional()
    .nullable(),
  status: z.enum(['raw', 'developing', 'mature', 'promoted', 'archived']).optional(),
})

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>
