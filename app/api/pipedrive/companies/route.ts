import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig, getCompanies, searchCompanies } from '@/lib/pipedrive/client'

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
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const start = searchParams.get('start') ? parseInt(searchParams.get('start')!) : undefined

    let companies
    if (searchTerm) {
      companies = await searchCompanies(searchTerm, config, { limit, start })
    } else {
      companies = await getCompanies(config, { limit, start })
    }

    return NextResponse.json({ companies })
  } catch (error: any) {
    console.error('Pipedrive companies error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch companies from Pipedrive' },
      { status: 500 }
    )
  }
}
