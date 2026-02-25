import { z } from 'zod'

export const dealTeamSurveyResponseSchema = z.object({
  question_id: z.string().uuid(),
  response_value: z.number().int().min(1).max(10),
})

export const dealTeamSurveySubmissionSchema = z.object({
  responses: z.array(dealTeamSurveyResponseSchema).min(1),
})

export type DealTeamSurveyResponseInput = z.infer<typeof dealTeamSurveyResponseSchema>
export type DealTeamSurveySubmissionInput = z.infer<typeof dealTeamSurveySubmissionSchema>
