import { z } from 'zod'

export const feedbackSubmissionSchema = z.object({
  content: z
    .string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(5000, 'Feedback is too long'),
  submitter_email: z
    .string()
    .email('Please enter a valid email')
    .max(255)
    .optional()
    .nullable(),
  submitter_name: z
    .string()
    .max(255, 'Name is too long')
    .optional()
    .nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type FeedbackSubmissionInput = z.infer<typeof feedbackSubmissionSchema>
