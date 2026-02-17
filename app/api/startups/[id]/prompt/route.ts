import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prepareAnalysisInput } from '@/lib/ai/analysis-engine'

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

    // Prepare the analysis input (same as what's used for generation)
    const analysisInput = await prepareAnalysisInput(startupId)

    // Generate the exact prompts that would be sent to Azure
    const systemPrompt = `You are an expert venture capital analyst specializing in founding team assessment. 
Analyze the provided data about a startup's founding team and generate a comprehensive diagnostic report.

Focus on:
1. Team alignment and cohesion
2. Commitment levels and asymmetry
3. Decision-making architecture and centralization risks
4. Functional gaps in the team
5. Conflict patterns and productivity
6. Red flags that could impact investment
7. Contradictions between founders' responses
8. Ownership and equity concerns
9. Fragile dependencies (single points of failure)

Be objective, data-driven, and specific. Provide actionable insights.`

    const userPrompt = `Analyze this founding team:

STARTUP:
- Company: ${analysisInput.startup.company_name}
- Industry: ${analysisInput.startup.industry || 'N/A'}
- Stage: ${analysisInput.startup.stage || 'N/A'}
- Raise Amount: ${analysisInput.startup.raise_amount ? `$${analysisInput.startup.raise_amount}` : 'N/A'}

FOUNDERS:
${analysisInput.founders
  .map(
    (f) => `
- ${f.full_name} (${f.role || 'N/A'})
  - Email: ${f.email}
  - Equity: ${f.equity_percentage || 'N/A'}%
  - Full-time: ${f.full_time_status ? 'Yes' : 'No'}
  - CEO: ${f.is_ceo ? 'Yes' : 'No'}
  - Years known co-founders: ${f.years_known_cofounders || 'N/A'}
  - Prior startup experience: ${f.prior_startup_experience ? 'Yes' : 'No'}
  - Previously worked together: ${f.previously_worked_together ? 'Yes' : 'No'}`
  )
  .join('\n')}

SURVEY RESPONSES:
${analysisInput.survey_responses.length > 0
  ? analysisInput.survey_responses
      .map(
        (r) => `- ${r.founder_name} | ${r.dimension} | "${r.question_text}": ${r.response_value}/10`
      )
      .join('\n')
  : '(No survey responses available)'}

INTERVIEW TRANSCRIPTS:
${analysisInput.interview_transcripts.length > 0
  ? analysisInput.interview_transcripts
      .map((t) => `\n${t.founder_name}:\n${t.text.substring(0, 1000)}...`)
      .join('\n\n---\n\n')
  : '(No interview transcripts available)'}

Generate a JSON response with this exact structure. You MUST return valid JSON only - no text outside the JSON object:
{
  "team_strength_index": <number 0-100>,
  "functional_gap_analysis": {
    "gaps": [<array of gap descriptions>],
    "severity": "<low|medium|high>"
  },
  "decision_architecture_risk": {
    "score": <number 0-100>,
    "centralization_level": "<high|medium|low>",
    "issues": [<array of issues>]
  },
  "commitment_asymmetry_score": <number 0-100>,
  "leadership_centralization_risk": {
    "score": <number 0-100>,
    "concerns": [<array of concerns>]
  },
  "conflict_productivity_assessment": {
    "score": <number 0-100>,
    "patterns": [<array of patterns>]
  },
  "red_flags": [
    {
      "severity": "<critical|high|medium|low>",
      "description": "<description>",
      "evidence": [<array of evidence points>]
    }
  ],
  "investment_implications": {
    "overall_risk": "<low|medium|high|critical>",
    "recommendation": "<proceed|proceed_with_conditions|reconsider|decline>",
    "rationale": "<detailed rationale>"
  },
  "suggested_interventions": [<array of intervention suggestions>],
  "contradictions_detected": [
    {
      "founders_involved": [<array of founder names>],
      "issue": "<description>",
      "evidence": "<evidence>"
    }
  ],
  "ownership_overlaps": [
    {
      "description": "<description>",
      "risk_level": "<low|medium|high>"
    }
  ],
  "fragile_dependencies": [
    {
      "description": "<description>",
      "impact": "<impact description>"
    }
  ],
  "executive_summary": "<2-3 paragraph executive summary synthesizing key findings>"
}

Return ONLY the JSON object. Do not include any text before or after the JSON.`

    // Format the messages array as it would be sent to Azure
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    return NextResponse.json({
      startup_id: startupId,
      startup_name: analysisInput.startup.company_name,
      messages,
      systemPrompt,
      userPrompt,
      promptLength: systemPrompt.length + userPrompt.length,
      dataSummary: {
        founders: analysisInput.founders.length,
        survey_responses: analysisInput.survey_responses.length,
        interview_transcripts: analysisInput.interview_transcripts.length,
      },
    })
  } catch (error: any) {
    console.error('Prompt generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}
