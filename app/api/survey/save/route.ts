import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { surveySubmissionSchema } from '@/lib/schemas/survey'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { token, responses } = body

    if (!token) {
      return NextResponse.json({ error: 'Survey token is required' }, { status: 400 })
    }

    // Validate token and get founder
    const { data: founder, error: founderError } = await supabase
      .from('founders')
      .select('id, survey_status')
      .eq('survey_token', token)
      .single()

    if (founderError || !founder) {
      return NextResponse.json({ error: 'Invalid survey token' }, { status: 404 })
    }

    if (founder.survey_status === 'completed') {
      return NextResponse.json({ error: 'Survey already completed' }, { status: 410 })
    }

    // Validate responses
    const validated = surveySubmissionSchema.parse({ responses })

    // Upsert responses (auto-save)
    const responseData = validated.responses.map((r) => ({
      founder_id: founder.id,
      question_id: r.question_id,
      response_value: r.response_value,
    }))

    const { error: insertError } = await supabase
      .from('survey_responses')
      .upsert(responseData, {
        onConflict: 'founder_id,question_id',
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Progress saved' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
