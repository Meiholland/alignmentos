import { z } from 'zod'

export const startupSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  industry: z.string().optional(),
  stage: z.string().optional(),
  geography: z.string().optional(),
  raise_amount: z.coerce.number().positive().optional().nullable(),
  planned_close_date: z.string().optional().nullable(),
  board_structure_description: z.string().optional().nullable(),
  deal_partner: z.string().optional().nullable(),
})

export type StartupInput = z.infer<typeof startupSchema>
