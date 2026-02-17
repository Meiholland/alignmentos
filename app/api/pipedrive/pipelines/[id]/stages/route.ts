import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig, getPipelineStages } from '@/lib/pipedrive/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const pipelineId = parseInt(resolvedParams.id)

    if (isNaN(pipelineId)) {
      return NextResponse.json({ error: 'Invalid pipeline ID' }, { status: 400 })
    }

    const config = getPipedriveConfig()
    const stages = await getPipelineStages(pipelineId, config)

    return NextResponse.json({ stages })
  } catch (error: any) {
    console.error('Pipedrive pipeline stages error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stages from pipeline' },
      { status: 500 }
    )
  }
}
