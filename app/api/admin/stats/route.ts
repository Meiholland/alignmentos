import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const adminSupabase = createAdminClient()

    // Get total startups
    const { count: totalStartups } = await adminSupabase
      .from('startups')
      .select('*', { count: 'exact', head: true })

    // Get total founders
    const { count: totalFounders } = await adminSupabase
      .from('founders')
      .select('*', { count: 'exact', head: true })

    // Get completed surveys
    const { count: completedSurveys } = await adminSupabase
      .from('founders')
      .select('*', { count: 'exact', head: true })
      .eq('survey_status', 'completed')

    // Get pending surveys
    const { count: pendingSurveys } = await adminSupabase
      .from('founders')
      .select('*', { count: 'exact', head: true })
      .in('survey_status', ['pending', 'sent'])

    return NextResponse.json({
      total_startups: totalStartups || 0,
      total_founders: totalFounders || 0,
      completed_surveys: completedSurveys || 0,
      pending_surveys: pendingSurveys || 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
