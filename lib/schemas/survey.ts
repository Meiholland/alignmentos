import { z } from 'zod'

export const surveyResponseSchema = z.object({
  question_id: z.string().uuid(),
  response_value: z.number().int().min(1).max(10),
})

export const surveySubmissionSchema = z.object({
  responses: z.array(surveyResponseSchema).min(1),
})

export type SurveyResponseInput = z.infer<typeof surveyResponseSchema>
export type SurveySubmissionInput = z.infer<typeof surveySubmissionSchema>
