import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    // Handle params as Promise (Next.js 15+) or object (older versions)
    const resolvedParams = await Promise.resolve(params)
    const token = resolvedParams.token

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('founders')
      .select('id, full_name, email, survey_status, survey_token_expires_at')
      .eq('survey_token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid survey token' }, { status: 404 })
    }

    // Check if token is expired
    if (data.survey_token_expires_at) {
      const expiresAt = new Date(data.survey_token_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Survey token has expired' }, { status: 410 })
      }
    }

    // Check if already completed
    if (data.survey_status === 'completed') {
      return NextResponse.json({ error: 'Survey already completed' }, { status: 410 })
    }

    return NextResponse.json({
      founder_id: data.id,
      founder_name: data.full_name,
      survey_status: data.survey_status,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
