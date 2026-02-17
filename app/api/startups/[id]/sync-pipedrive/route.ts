import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPipedriveConfig, getCompany } from '@/lib/pipedrive/client'

export async function POST(
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
    const startupId = resolvedParams.id

    // Fetch the startup to get its pipedrive_deal_id
    const { data: startup, error: startupError } = await supabase
      .from('startups')
      .select('*')
      .eq('id', startupId)
      .single()

    if (startupError || !startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
    }

    if (!startup.pipedrive_deal_id) {
      return NextResponse.json(
        { error: 'This startup was not imported from Pipedrive' },
        { status: 400 }
      )
    }

    // Fetch latest deal data from Pipedrive
    const config = getPipedriveConfig()
    const baseUrl = `https://${config.companyDomain}.pipedrive.com/api/v1`
    
    const dealResponse = await fetch(
      `${baseUrl}/deals/${startup.pipedrive_deal_id}?api_token=${config.apiToken}`
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
          `${baseUrl}/stages?pipeline_id=${deal.pipeline_id || startup.pipedrive_pipeline_id}&api_token=${config.apiToken}`
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

    // Parse deal value
    let raiseAmount = null
    if (deal.value) {
      const valueStr = typeof deal.value === 'string' ? deal.value : String(deal.value)
      const numericValue = parseFloat(valueStr.replace(/[^\d.-]/g, ''))
      if (!isNaN(numericValue)) {
        raiseAmount = numericValue
      }
    }

    // Parse dates
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

    // Update startup with latest Pipedrive data
    const { data: updatedStartup, error: updateError } = await supabase
      .from('startups')
      .update({
        pipedrive_stage_id: deal.stage_id || startup.pipedrive_stage_id,
        pipedrive_pipeline_id: deal.pipeline_id || startup.pipedrive_pipeline_id,
        pipedrive_deal_created_at: dealCreatedAt || startup.pipedrive_deal_created_at,
        pipedrive_deal_updated_at: dealUpdatedAt || startup.pipedrive_deal_updated_at,
        stage: stageName || startup.stage,
        raise_amount: raiseAmount !== null ? raiseAmount : startup.raise_amount,
        deal_partner: deal.owner_name || startup.deal_partner,
      })
      .eq('id', startupId)
      .select()
      .single()

    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      startup: updatedStartup,
      message: 'Startup synced with Pipedrive successfully',
    })
  } catch (error: any) {
    console.error('POST /api/startups/[id]/sync-pipedrive error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
