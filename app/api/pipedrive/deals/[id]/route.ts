import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig } from '@/lib/pipedrive/client'

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
    const dealId = parseInt(resolvedParams.id)

    if (isNaN(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 })
    }

    const config = getPipedriveConfig()
    const baseUrl = `https://${config.companyDomain}.pipedrive.com/api/v1`
    
    // Fetch deal details
    const dealResponse = await fetch(
      `${baseUrl}/deals/${dealId}?api_token=${config.apiToken}`
    )

    if (!dealResponse.ok) {
      const errorText = await dealResponse.text()
      throw new Error(`Failed to fetch deal: ${dealResponse.status} ${errorText}`)
    }

    const dealData = await dealResponse.json()
    
    if (!dealData.success || !dealData.data) {
      throw new Error('Invalid deal data from Pipedrive')
    }

    const deal = dealData.data

    // Fetch associated organization if available
    let organization = null
    if (deal.org_id) {
      try {
        const orgResponse = await fetch(
          `${baseUrl}/organizations/${deal.org_id}?api_token=${config.apiToken}`
        )
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          if (orgData.success && orgData.data) {
            organization = orgData.data
          }
        }
      } catch (error) {
        console.warn('Failed to fetch organization:', error)
      }
    }

    // Fetch associated persons if available
    let persons: unknown[] = []
    if (deal.person_id) {
      try {
        const personResponse = await fetch(
          `${baseUrl}/persons/${deal.person_id}?api_token=${config.apiToken}`
        )
        if (personResponse.ok) {
          const personData = await personResponse.json()
          if (personData.success && personData.data) {
            persons = [personData.data]
          }
        }
      } catch (error) {
        console.warn('Failed to fetch person:', error)
      }
    }

    return NextResponse.json({
      deal,
      organization,
      persons,
    })
  } catch (error: any) {
    console.error('Pipedrive deal details error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deal details' },
      { status: 500 }
    )
  }
}
