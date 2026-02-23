import { z } from 'zod'

export const createWorkOrderSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title is too long'),
  description: z
    .string()
    .max(10000, 'Description is too long')
    .optional()
    .nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export const updateWorkOrderSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title is too long')
    .optional(),
  description: z
    .string()
    .max(10000, 'Description is too long')
    .optional()
    .nullable(),
  status: z.enum(['backlog', 'ready', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>
