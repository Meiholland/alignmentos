import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig, getPipelines } from '@/lib/pipedrive/client'

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

    const config = getPipedriveConfig()
    const pipelines = await getPipelines(config)

    return NextResponse.json({ pipelines })
  } catch (error: any) {
    console.error('Pipedrive pipelines error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pipelines from Pipedrive' },
      { status: 500 }
    )
  }
}
