import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle params as Promise (Next.js 15+) or object (older versions)
    const resolvedParams = await Promise.resolve(params)
    const founderId = resolvedParams.id

    if (!founderId) {
      return NextResponse.json({ error: 'Founder ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if founder already has survey responses
    const adminSupabase = createAdminClient()
    const { data: existingResponses } = await adminSupabase
      .from('survey_responses')
      .select('id')
      .eq('founder_id', founderId)
      .limit(1)

    // If responses exist, just return the URL without changing anything
    if (existingResponses && existingResponses.length > 0) {
      const { data: founder } = await adminSupabase
        .from('founders')
        .select('survey_token')
        .eq('id', founderId)
        .single()

      if (!founder) {
        return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
      }

      const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/survey/${founder.survey_token}`

      return NextResponse.json({
        survey_url: surveyUrl,
        has_existing_responses: true,
      })
    }

    // No existing responses - update founder survey status to 'sent'
    const { data, error } = await supabase
      .from('founders')
      .update({ survey_status: 'sent' })
      .eq('id', founderId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // In production, you would send an email here with the survey link
    const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/survey/${data.survey_token}`

    return NextResponse.json({
      ...data,
      survey_url: surveyUrl,
      has_existing_responses: false,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
