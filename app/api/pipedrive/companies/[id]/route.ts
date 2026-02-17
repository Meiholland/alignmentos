import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig, getCompany, getCompanyDeals, getCompanyPersons } from '@/lib/pipedrive/client'

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
    const companyId = parseInt(resolvedParams.id)

    if (isNaN(companyId)) {
      return NextResponse.json({ error: 'Invalid company ID' }, { status: 400 })
    }

    const config = getPipedriveConfig()
    const { searchParams } = new URL(request.url)
    const includeDeals = searchParams.get('include_deals') === 'true'
    const includePersons = searchParams.get('include_persons') === 'true'

    const company = await getCompany(companyId, config)

    const result: any = { company }

    if (includeDeals) {
      result.deals = await getCompanyDeals(companyId, config)
    }

    if (includePersons) {
      result.persons = await getCompanyPersons(companyId, config)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Pipedrive company error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch company from Pipedrive' },
      { status: 500 }
    )
  }
}
