import { z } from 'zod'

export const founderSchema = z.object({
  startup_id: z.string().uuid(),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.string().optional(),
  email: z.string().email('Valid email is required'),
  equity_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  full_time_status: z.boolean().default(true),
  years_known_cofounders: z.coerce.number().int().min(0).optional().nullable(),
  prior_startup_experience: z.boolean().default(false),
  previously_worked_together: z.boolean().default(false),
  is_ceo: z.boolean().default(false),
})

export type FounderInput = z.infer<typeof founderSchema>
