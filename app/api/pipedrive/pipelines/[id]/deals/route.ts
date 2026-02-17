import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig, getDeals } from '@/lib/pipedrive/client'

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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 500
    const start = searchParams.get('start') ? parseInt(searchParams.get('start')!) : undefined
    const status = searchParams.get('status') as 'all_not_deleted' | 'open' | 'won' | 'lost' | undefined

    // Fetch all deals in the pipeline (with pagination)
    const allDeals: any[] = []
    let currentStart = start || 0
    let hasMore = true

    while (hasMore) {
      const deals = await getDeals(config, {
        pipeline_id: pipelineId,
        limit,
        start: currentStart,
        status: status || 'all_not_deleted',
      })

      if (deals.length > 0) {
        // Filter out "lost" and "won" deals - only show deals in progress
        const activeDeals = deals.filter(deal => {
          const dealStatus = deal.status?.toLowerCase() || ''
          return dealStatus !== 'lost' && dealStatus !== 'won'
        })
        allDeals.push(...activeDeals)
      }

      // If we got fewer deals than the limit, we've reached the end
      if (deals.length < limit) {
        hasMore = false
      } else {
        currentStart += limit
      }
    }

    return NextResponse.json({ deals: allDeals, count: allDeals.length })
  } catch (error: any) {
    console.error('Pipedrive pipeline deals error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deals from pipeline' },
      { status: 500 }
    )
  }
}
