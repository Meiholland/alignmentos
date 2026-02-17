import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig, getCompany } from '@/lib/pipedrive/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dealId, pipelineId, stageId } = body

    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 })
    }

    // Check if startup already exists for this deal
    const { data: existing } = await supabase
      .from('startups')
      .select('id')
      .eq('pipedrive_deal_id', dealId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Startup already exists for this deal', startupId: existing.id },
        { status: 400 }
      )
    }

    // Fetch deal details from Pipedrive (same as test page)
    const config = getPipedriveConfig()
    const baseUrl = `https://${config.companyDomain}.pipedrive.com/api/v1`
    
    // Fetch deal details
    const dealResponse = await fetch(
      `${baseUrl}/deals/${dealId}?api_token=${config.apiToken}`
    )

    if (!dealResponse.ok) {
      throw new Error('Failed to fetch deal from Pipedrive')
    }

    const dealData = await dealResponse.json()
    if (!dealData.success || !dealData.data) {
      throw new Error('Invalid deal data from Pipedrive')
    }

    const deal = dealData.data

    // Fetch stage name if stage_id exists
    let stageName = null
    if (deal.stage_id) {
      try {
        const stagesResponse = await fetch(
          `${baseUrl}/stages?pipeline_id=${deal.pipeline_id || pipelineId}&api_token=${config.apiToken}`
        )
        if (stagesResponse.ok) {
          const stagesData = await stagesResponse.json()
          if (stagesData.success && stagesData.data) {
            const stage = stagesData.data.find((s: any) => s.id === deal.stage_id)
            if (stage) {
              stageName = stage.name
            }
          }
        }
      } catch (error) {
        console.warn('Could not fetch stage name:', error)
      }
    }

    // Get company name from deal title or organization
    let companyName = deal.title || deal.name || 'Unknown Company'
    
    // Try to get company name from organization if available
    if (deal.org_id) {
      try {
        const company = await getCompany(deal.org_id, config)
        if (company.name) {
          companyName = company.name
        }
      } catch (error) {
        console.warn('Could not fetch company name from organization:', error)
      }
    }

    // Parse deal value (handle both number and string formats)
    let raiseAmount = null
    if (deal.value) {
      const valueStr = typeof deal.value === 'string' ? deal.value : String(deal.value)
      const numericValue = parseFloat(valueStr.replace(/[^\d.-]/g, ''))
      if (!isNaN(numericValue)) {
        raiseAmount = numericValue
      }
    }

    // Parse dates from Pipedrive
    let dealCreatedAt = null
    let dealUpdatedAt = null
    
    if (deal.add_time) {
      try {
        dealCreatedAt = new Date(deal.add_time).toISOString()
      } catch (error) {
        console.warn('Could not parse deal created date:', error)
      }
    }
    
    if (deal.update_time) {
      try {
        dealUpdatedAt = new Date(deal.update_time).toISOString()
      } catch (error) {
        console.warn('Could not parse deal updated date:', error)
      }
    }

    // Create startup from deal with all available fields
    const { data: startup, error: insertError } = await supabase
      .from('startups')
      .insert({
        company_name: companyName,
        pipedrive_deal_id: dealId,
        pipedrive_stage_id: stageId || deal.stage_id || null,
        pipedrive_pipeline_id: pipelineId || deal.pipeline_id || null,
        pipedrive_deal_created_at: dealCreatedAt,
        pipedrive_deal_updated_at: dealUpdatedAt,
        stage: stageName || (deal.stage_id ? `Stage ${deal.stage_id}` : null),
        raise_amount: raiseAmount,
        deal_partner: deal.owner_name || null,
        // Map other fields if available in deal
        // industry: deal.industry || null, // if you have custom fields
        // geography: deal.geography || null, // if you have custom fields
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json(startup, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/startups/import-pipedrive error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
