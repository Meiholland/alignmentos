import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateDiagnosticAnalysis,
  prepareAnalysisInput,
} from '@/lib/ai/analysis-engine'
import type { Json } from '@/types/database.types'

// Increase timeout for long-running AI requests
export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[API] Analysis generation started')
  
  try {
    console.log('[API] Step 1: Creating Supabase client...')
    const supabase = await createClient()

    console.log('[API] Step 2: Checking authentication...')
    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.log('[API] Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[API] Authenticated as:', user.email)

    console.log('[API] Step 3: Parsing request body...')
    const body = await request.json()
    const { startup_id } = body

    if (!startup_id) {
      console.log('[API] Missing startup_id')
      return NextResponse.json({ error: 'startup_id is required' }, { status: 400 })
    }
    console.log('[API] Startup ID:', startup_id)

    console.log('[API] Step 4: Preparing analysis input...')
    const prepStartTime = Date.now()
    const analysisInput = await prepareAnalysisInput(startup_id)
    console.log(`[API] Analysis input prepared in ${Date.now() - prepStartTime}ms`)
    console.log('[API] Founders:', analysisInput.founders.length)
    console.log('[API] Survey responses:', analysisInput.survey_responses.length)
    console.log('[API] Interview transcripts:', analysisInput.interview_transcripts.length)

    console.log('[API] Step 5: Generating diagnostic analysis...')
    const genStartTime = Date.now()
    const { analysis, executive_summary } = await generateDiagnosticAnalysis(analysisInput)
    console.log(`[API] Analysis generated in ${Date.now() - genStartTime}ms`)

    console.log('[API] Step 6: Saving to database...')
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('diagnostic_reports')
      .insert({
        startup_id,
        analysis_json: analysis as Json, // Cast to Json type for Supabase
        executive_summary,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[API] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log(`[API] Analysis generation completed successfully in ${Date.now() - startTime}ms`)
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error(`[API] Analysis generation error after ${Date.now() - startTime}ms:`, error)
    console.error('[API] Error stack:', error.stack)
    const errorMessage =
      error?.message ||
      error?.error?.message ||
      error?.toString() ||
      'Failed to generate diagnostic analysis. Please check your Azure OpenAI configuration and ensure all required data is available.'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
