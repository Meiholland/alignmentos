import { createAdminClient } from '@/lib/supabase/admin'
import { generateContentWithAzureAI, type AzureAIMessage } from '@/lib/azure-ai'

// Azure OpenAI configuration
const azureEndpoint = process.env.AZURE_AI_ENDPOINT
const azureApiKey = process.env.AZURE_AI_API_KEY
const azureModelName = process.env.AZURE_AI_MODEL_NAME || 'gpt-4o'
const azureApiVersion = process.env.AZURE_AI_API_VERSION || '2025-04-01-preview'

function getAzureConfig() {
  if (!azureEndpoint || !azureApiKey) {
    throw new Error(
      'Azure OpenAI configuration missing. Please set AZURE_AI_ENDPOINT and AZURE_AI_API_KEY environment variables.'
    )
  }

  // Validate endpoint format
  if (azureEndpoint.includes('your-resource') || azureEndpoint.includes('example')) {
    throw new Error(
      'Azure OpenAI endpoint is not configured. Please update AZURE_AI_ENDPOINT in your .env.local file with your actual Azure OpenAI endpoint (e.g., https://your-resource-name.openai.azure.com)'
    )
  }

  return {
    endpoint: azureEndpoint,
    apiKey: azureApiKey,
    modelName: azureModelName,
    apiVersion: azureApiVersion,
  }
}

export interface DiagnosticAnalysis {
  team_strength_index: number // 0-100
  functional_gap_analysis: {
    gaps: string[]
    severity: 'low' | 'medium' | 'high'
  }
  decision_architecture_risk: {
    score: number // 0-100, higher = more risk
    centralization_level: 'high' | 'medium' | 'low'
    issues: string[]
  }
  commitment_asymmetry_score: number // 0-100, higher = more asymmetry
  leadership_centralization_risk: {
    score: number // 0-100
    concerns: string[]
  }
  conflict_productivity_assessment: {
    score: number // 0-100, higher = more productive
    patterns: string[]
  }
  red_flags: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low'
    description: string
    evidence: string[]
  }>
  investment_implications: {
    overall_risk: 'low' | 'medium' | 'high' | 'critical'
    recommendation: 'proceed' | 'proceed_with_conditions' | 'reconsider' | 'decline'
    rationale: string
  }
  suggested_interventions: string[]
  contradictions_detected: Array<{
    founders_involved: string[]
    issue: string
    evidence: string
  }>
  ownership_overlaps: Array<{
    description: string
    risk_level: 'low' | 'medium' | 'high'
  }>
  fragile_dependencies: Array<{
    description: string
    impact: string
  }>
}

export interface AnalysisInput {
  startup: {
    company_name: string
    industry: string | null
    stage: string | null
    raise_amount: number | null
  }
  founders: Array<{
    id: string
    full_name: string
    role: string | null
    email: string
    equity_percentage: number | null
    full_time_status: boolean
    years_known_cofounders: number | null
    prior_startup_experience: boolean
    previously_worked_together: boolean
    is_ceo: boolean
  }>
  survey_responses: Array<{
    founder_name: string
    dimension: string
    question_text: string
    response_value: number
  }>
  interview_transcripts: Array<{
    founder_name: string
    text: string
  }>
}

export async function generateDiagnosticAnalysis(
  input: AnalysisInput
): Promise<{ analysis: DiagnosticAnalysis; executive_summary: string }> {
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
- Company: ${input.startup.company_name}
- Industry: ${input.startup.industry || 'N/A'}
- Stage: ${input.startup.stage || 'N/A'}
- Raise Amount: ${input.startup.raise_amount ? `$${input.startup.raise_amount}` : 'N/A'}

FOUNDERS:
${input.founders
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
${input.survey_responses
  .map(
    (r) => `- ${r.founder_name} | ${r.dimension} | "${r.question_text}": ${r.response_value}/10`
  )
  .join('\n')}

INTERVIEW TRANSCRIPTS:
${input.interview_transcripts
  .map((t) => `\n${t.founder_name}:\n${t.text.substring(0, 1000)}...`)
  .join('\n\n---\n\n')}

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

  try {
    console.log('[Analysis Engine] Getting Azure config...')
    const config = getAzureConfig()
    console.log('[Analysis Engine] Config obtained, endpoint:', config.endpoint.replace(config.apiKey, '***'))
    
    const messages: AzureAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    console.log('[Analysis Engine] System prompt length:', systemPrompt.length)
    console.log('[Analysis Engine] User prompt length:', userPrompt.length)
    console.log('[Analysis Engine] Calling Azure AI for main analysis...')
    const aiCallStartTime = Date.now()
    
    // Use the proven pattern: set maxTokens explicitly
    const responseContent = await generateContentWithAzureAI(messages, config, {
      responseFormat: 'json_object',
      maxTokens: 16000, // Set explicit token limit as per LumoMapper pattern
    })
    
    console.log(`[Analysis Engine] Main analysis received in ${Date.now() - aiCallStartTime}ms`)
    console.log('[Analysis Engine] Response content length:', responseContent.length)
    console.log('[Analysis Engine] Response preview:', responseContent.substring(0, 300))
    
    if (!responseContent || responseContent.trim().length === 0) {
      throw new Error('No response from AI. The model returned an empty response. Please check your Azure OpenAI configuration and model deployment.')
    }
    
    // Check if the response is an error message
    const trimmedContent = responseContent.trim()
    if (trimmedContent.startsWith('{') && trimmedContent.includes('"error"')) {
      try {
        const errorObj = JSON.parse(trimmedContent)
        if (errorObj.error) {
          throw new Error(`AI returned an error instead of analysis: ${errorObj.error}. The model may be confused by the prompt format.`)
        }
      } catch (e) {
        // If it's not parseable as error JSON, continue with normal parsing
        if (e instanceof Error && e.message.includes('AI returned an error')) {
          throw e
        }
      }
    }

    console.log('[Analysis Engine] Parsing JSON response...')
    let parsed: any
    try {
      parsed = JSON.parse(responseContent)
      console.log('[Analysis Engine] JSON parsed successfully')
    } catch (parseError) {
      console.error('[Analysis Engine] Failed to parse JSON:', responseContent.substring(0, 500))
      throw new Error(`Failed to parse AI response as JSON. The model may not have returned valid JSON. Response preview: ${responseContent.substring(0, 200)}`)
    }
    
    // Validate that we got the expected structure
    if (!parsed.decision_architecture_risk || typeof parsed.decision_architecture_risk.score !== 'number') {
      console.error('[Analysis Engine] Invalid response structure. Received:', JSON.stringify(parsed, null, 2).substring(0, 1000))
      throw new Error(`AI returned an invalid response structure. Expected decision_architecture_risk.score but got: ${JSON.stringify(parsed).substring(0, 500)}`)
    }
    
    // Extract executive summary if it's in the JSON, otherwise generate separately
    let executiveSummary = parsed.executive_summary || ''
    console.log('[Analysis Engine] Executive summary in response:', !!executiveSummary)
    
    if (!executiveSummary) {
      console.log('[Analysis Engine] Generating executive summary separately...')
      // Generate executive summary separately
      const summaryMessages: AzureAIMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Based on the analysis above, provide a concise 2-3 paragraph executive summary highlighting:
1. Overall team strength assessment
2. Key risks and concerns
3. Investment recommendation and rationale`,
        },
      ]
      
      const summaryStartTime = Date.now()
      executiveSummary = await generateContentWithAzureAI(summaryMessages, config, {
        maxTokens: 16000, // Use consistent token limit as per LumoMapper pattern
      })
      console.log(`[Analysis Engine] Executive summary generated in ${Date.now() - summaryStartTime}ms`)
    }

    // Remove executive_summary from parsed if it exists there
    const { executive_summary: _, ...analysis } = parsed

    return {
      analysis: analysis as DiagnosticAnalysis,
      executive_summary: executiveSummary,
    }
  } catch (error: any) {
    console.error('AI Analysis Error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate diagnostic analysis'
    
    if (error?.message) {
      errorMessage = error.message
    } else if (error?.error?.message) {
      errorMessage = error.error.message
    } else if (error?.toString) {
      errorMessage = error.toString()
    }
    
    // Check for common connection issues
    if (errorMessage.toLowerCase().includes('connection') || errorMessage.toLowerCase().includes('network')) {
      errorMessage = `Connection error: Unable to reach Azure OpenAI. Please verify:
- AZURE_AI_ENDPOINT is correct (e.g., https://your-resource.openai.azure.com)
- AZURE_AI_API_KEY is valid
- Network connectivity is available
- Model name "${azureModelName}" exists in your Azure OpenAI deployment`
    } else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('401')) {
      errorMessage = 'Authentication failed: Invalid Azure OpenAI API key. Please check AZURE_AI_API_KEY in your .env.local file.'
    } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('404')) {
      errorMessage = `Model not found: "${azureModelName}" does not exist in your Azure OpenAI deployment. Please check AZURE_AI_MODEL_NAME in your .env.local file.`
    }
    
    throw new Error(errorMessage)
  }
}

export async function prepareAnalysisInput(startupId: string): Promise<AnalysisInput> {
  console.log('[Prepare Input] Starting for startup:', startupId)
  const supabase = createAdminClient()

  // Fetch startup
  console.log('[Prepare Input] Fetching startup data...')
  const startupStartTime = Date.now()
  const { data: startup, error: startupError } = await supabase
    .from('startups')
    .select('*')
    .eq('id', startupId)
    .single()
  console.log(`[Prepare Input] Startup fetched in ${Date.now() - startupStartTime}ms`)

  if (startupError || !startup) {
    console.error('[Prepare Input] Startup error:', startupError)
    throw new Error('Startup not found')
  }
  console.log('[Prepare Input] Startup found:', startup.company_name)

  // Fetch founders
  console.log('[Prepare Input] Fetching founders...')
  const foundersStartTime = Date.now()
  const { data: founders, error: foundersError } = await supabase
    .from('founders')
    .select('*')
    .eq('startup_id', startupId)

  if (foundersError) {
    console.error('[Prepare Input] Founders error:', foundersError)
    throw new Error('Failed to fetch founders')
  }
  console.log(`[Prepare Input] Founders fetched in ${Date.now() - foundersStartTime}ms, count:`, founders?.length || 0)

  if (!founders || founders.length === 0) {
    console.error('[Prepare Input] No founders found')
    throw new Error('No founders found for this startup')
  }

  // Fetch survey responses with questions
  console.log('[Prepare Input] Fetching survey responses...')
  const responsesStartTime = Date.now()
  const { data: responses, error: responsesError } = await supabase
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
      founders.map((f) => f.id)
    )
  console.log(`[Prepare Input] Survey responses fetched in ${Date.now() - responsesStartTime}ms, count:`, responses?.length || 0)

  if (responsesError) {
    console.error('[Prepare Input] Survey responses error:', responsesError)
    throw new Error('Failed to fetch survey responses')
  }

  // Fetch interview transcripts
  console.log('[Prepare Input] Fetching interview transcripts...')
  const transcriptsStartTime = Date.now()
  const { data: transcripts, error: transcriptsError } = await supabase
    .from('interview_transcripts')
    .select(
      `
      *,
      founders (
        full_name
      )
    `
    )
    .in(
      'founder_id',
      founders.map((f) => f.id)
    )
  console.log(`[Prepare Input] Interview transcripts fetched in ${Date.now() - transcriptsStartTime}ms, count:`, transcripts?.length || 0)

  if (transcriptsError) {
    console.error('[Prepare Input] Interview transcripts error:', transcriptsError)
    throw new Error('Failed to fetch interview transcripts')
  }

  console.log('[Prepare Input] Transforming data...')

  // Transform data
  const surveyResponses = (responses || []).map((r: any) => ({
    founder_name: r.founders?.full_name || 'Unknown',
    dimension: r.survey_questions?.dimension || 'unknown',
    question_text: r.survey_questions?.question_text || '',
    response_value: r.response_value,
  }))

  const interviewTranscripts = (transcripts || []).map((t: any) => ({
    founder_name: t.founders?.full_name || 'Unknown',
    text: t.raw_text,
  }))

  const result = {
    startup: {
      company_name: startup.company_name,
      industry: startup.industry,
      stage: startup.stage,
      raise_amount: startup.raise_amount,
    },
    founders: founders.map((f) => ({
      id: f.id,
      full_name: f.full_name,
      role: f.role,
      email: f.email,
      equity_percentage: f.equity_percentage,
      full_time_status: f.full_time_status,
      years_known_cofounders: f.years_known_cofounders,
      prior_startup_experience: f.prior_startup_experience,
      previously_worked_together: f.previously_worked_together,
      is_ceo: f.is_ceo,
    })),
    survey_responses: surveyResponses,
    interview_transcripts: interviewTranscripts,
  }
  
  console.log('[Prepare Input] Data transformation complete')
  console.log('[Prepare Input] Final data summary:', {
    founders: result.founders.length,
    survey_responses: result.survey_responses.length,
    interview_transcripts: result.interview_transcripts.length,
  })
  
  return result
}
