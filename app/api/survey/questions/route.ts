import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get active questions for the latest version
    const { data: versionData } = await supabase
      .from('survey_questions')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const latestVersion = versionData?.version || 1

    const { data, error } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('active', true)
      .eq('version', latestVersion)
      .order('question_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
