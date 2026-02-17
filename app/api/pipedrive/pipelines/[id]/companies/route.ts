import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig, getCompaniesFromPipeline } from '@/lib/pipedrive/client'

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
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const start = searchParams.get('start') ? parseInt(searchParams.get('start')!) : undefined
    const status = searchParams.get('status') as 'all_not_deleted' | 'open' | 'won' | 'lost' | undefined

    const companies = await getCompaniesFromPipeline(pipelineId, config, {
      limit,
      start,
      status: status || 'all_not_deleted',
    })

    return NextResponse.json({ companies, count: companies.length })
  } catch (error: any) {
    console.error('Pipedrive pipeline companies error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch companies from pipeline' },
      { status: 500 }
    )
  }
}
