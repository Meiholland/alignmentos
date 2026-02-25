import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { founderSchema } from '@/lib/schemas/founder'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = founderSchema.parse(body)

    // Generate survey token and set expiration (30 days)
    const surveyToken = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data, error } = await supabase
      .from('founders')
      .insert({
        ...validated,
        survey_token: surveyToken,
        survey_token_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startupId = searchParams.get('startup_id')

    let query = supabase.from('founders').select('*')

    if (startupId) {
      query = query.eq('startup_id', startupId)
    }

    const { data: founders, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!startupId || !founders?.length) {
      return NextResponse.json(founders ?? [])
    }

    const founderIds = founders.map((f: { id: string }) => f.id)
    const adminSupabase = createAdminClient()
    const { data: dealTeamRows } = await adminSupabase
      .from('deal_team_survey_responses')
      .select('founder_id')
      .in('founder_id', founderIds)

    const founderIdsWithDealTeamSurvey = new Set(
      (dealTeamRows || []).map((r: { founder_id: string }) => r.founder_id)
    )

    const result = founders.map((f: { id: string; [key: string]: unknown }) => ({
      ...f,
      has_deal_team_survey: founderIdsWithDealTeamSurvey.has(f.id),
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
