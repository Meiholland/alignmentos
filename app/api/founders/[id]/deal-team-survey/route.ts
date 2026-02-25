import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dealTeamSurveySubmissionSchema } from '@/lib/schemas/deal-team-survey'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const founderId = resolvedParams.id
    if (!founderId) {
      return NextResponse.json({ error: 'Founder ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    const { data: founder, error: founderError } = await adminSupabase
      .from('founders')
      .select('id, startup_id')
      .eq('id', founderId)
      .single()

    if (founderError || !founder) {
      return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
    }

    const { data: questions } = await adminSupabase
      .from('deal_team_survey_questions')
      .select('id, dimension, statement_text, question_order')
      .eq('active', true)
      .order('question_order', { ascending: true })

    const { data: existingResponses } = await adminSupabase
      .from('deal_team_survey_responses')
      .select('question_id, response_value')
      .eq('founder_id', founderId)

    const responses: Record<string, number> = {}
    if (existingResponses) {
      existingResponses.forEach((r: { question_id: string; response_value: number }) => {
        responses[r.question_id] = r.response_value
      })
    }

    return NextResponse.json({
      questions: questions || [],
      responses,
      startup_id: founder.startup_id,
    })
  } catch (error: unknown) {
    console.error('Deal team survey GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const founderId = resolvedParams.id
    if (!founderId) {
      return NextResponse.json({ error: 'Founder ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = dealTeamSurveySubmissionSchema.parse(body)

    const adminSupabase = createAdminClient()

    const { data: founder, error: founderError } = await adminSupabase
      .from('founders')
      .select('id, startup_id')
      .eq('id', founderId)
      .single()

    if (founderError || !founder) {
      return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
    }

    const rows = validated.responses.map((r) => ({
      founder_id: founderId,
      question_id: r.question_id,
      response_value: r.response_value,
    }))

    const { error: upsertError } = await adminSupabase
      .from('deal_team_survey_responses')
      .upsert(rows, { onConflict: 'founder_id,question_id' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      redirect: `/admin/startups/${founder.startup_id}`,
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    console.error('Deal team survey POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
