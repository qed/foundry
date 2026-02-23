import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name is too long'),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional(),
})

export const projectSettingsSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name is too long'),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional()
    .nullable(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type ProjectSettingsInput = z.infer<typeof projectSettingsSchema>
