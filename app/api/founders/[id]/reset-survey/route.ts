import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Delete all survey responses for this founder
    const { error: deleteError } = await adminSupabase
      .from('survey_responses')
      .delete()
      .eq('founder_id', founderId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    // Generate new survey token and reset status
    // Using crypto.randomUUID() which is available in Node.js 14.17.0+
    const newToken = crypto.randomUUID()

    const { data, error: updateError } = await adminSupabase
      .from('founders')
      .update({
        survey_status: 'pending',
        survey_token: newToken,
        survey_token_expires_at: null,
      })
      .eq('id', founderId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/survey/${data.survey_token}`

    return NextResponse.json({
      ...data,
      survey_url: surveyUrl,
      message: 'Survey responses have been reset. A new survey link has been generated.',
    })
  } catch (error: any) {
    console.error('Reset survey error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
