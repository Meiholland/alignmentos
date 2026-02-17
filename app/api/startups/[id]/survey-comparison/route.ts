import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const startupId = resolvedParams.id

    const adminSupabase = createAdminClient()

    // Fetch founders for this startup
    const { data: founders, error: foundersError } = await adminSupabase
      .from('founders')
      .select('id, full_name, survey_status')
      .eq('startup_id', startupId)

    if (foundersError || !founders) {
      return NextResponse.json({ error: 'Failed to fetch founders' }, { status: 400 })
    }

    // Filter to only founders who have completed surveys
    const foundersWithSurveys = founders.filter((f) => f.survey_status === 'completed')

    if (foundersWithSurveys.length === 0) {
      return NextResponse.json({ data: [], message: 'No founders have completed surveys yet' })
    }

    // Fetch survey responses with questions for these founders
    const { data: responses, error: responsesError } = await adminSupabase
      .from('survey_responses')
      .select(
        `
        *,
        survey_questions (
          dimension,
          question_text
        ),
        founders (
          full_name
        )
      `
      )
      .in(
        'founder_id',
        foundersWithSurveys.map((f) => f.id)
      )

    if (responsesError) {
      return NextResponse.json({ error: 'Failed to fetch survey responses' }, { status: 400 })
    }

    // Group responses by founder and dimension, calculate averages
    const founderDimensionScores: Record<
      string,
      Record<string, { total: number; count: number; average: number }>
    > = {}

    responses?.forEach((response: any) => {
      const founderId = response.founder_id
      const founderName = response.founders?.full_name || 'Unknown'
      const dimension = response.survey_questions?.dimension || 'unknown'
      const value = response.response_value

      if (!founderDimensionScores[founderId]) {
        founderDimensionScores[founderId] = {}
      }
      if (!founderDimensionScores[founderId][dimension]) {
        founderDimensionScores[founderId][dimension] = { total: 0, count: 0, average: 0 }
      }

      founderDimensionScores[founderId][dimension].total += value
      founderDimensionScores[founderId][dimension].count += 1
    })

    // Calculate averages and format for chart
    const chartData = foundersWithSurveys.map((founder) => {
      const scores = founderDimensionScores[founder.id] || {}
      const dimensionAverages: Record<string, number> = {}

      Object.keys(scores).forEach((dimension) => {
        const { total, count } = scores[dimension]
        dimensionAverages[dimension] = count > 0 ? total / count : 0
      })

      return {
        founderId: founder.id,
        founderName: founder.full_name,
        dimensions: dimensionAverages,
      }
    })

    // Get all unique dimensions across all founders
    const allDimensions = new Set<string>()
    chartData.forEach((founder) => {
      Object.keys(founder.dimensions).forEach((dim) => allDimensions.add(dim))
    })

    return NextResponse.json({
      founders: chartData,
      dimensions: Array.from(allDimensions),
    })
  } catch (error: any) {
    console.error('Survey comparison error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
