/**
 * Azure OpenAI API client
 * This module handles communication with Azure OpenAI service
 */

export interface AzureAIConfig {
  endpoint: string
  apiKey: string
  modelName?: string
  apiVersion?: string
}

export interface AzureAIResponse {
  choices?: Array<{
    message?: {
      content?: string
      role?: string
    }
    finish_reason?: string
    index?: number
  }>
  error?: {
    message?: string
    code?: string
  }
  id?: string
  created?: number
  model?: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export interface AzureAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Generate content using Azure OpenAI
 */
export async function generateContentWithAzureAI(
  messages: AzureAIMessage[],
  config: AzureAIConfig,
  options?: {
    responseFormat?: 'text' | 'json_object'
    maxTokens?: number
  }
): Promise<string> {
  const {
    endpoint,
    apiKey,
    modelName = 'gpt-4o',
    apiVersion = '2025-04-01-preview',
  } = config

  // Azure OpenAI endpoint format:
  // https://{resource}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions
  // OR if endpoint already includes the full path, use it directly
  let apiUrl: string

  // Clean endpoint (remove trailing slash)
  const cleanEndpoint = endpoint.replace(/\/$/, '')

  if (cleanEndpoint.includes('/openai/deployments/')) {
    // Endpoint already includes the full path
    apiUrl = `${cleanEndpoint}/chat/completions?api-version=${apiVersion}`
  } else if (cleanEndpoint.includes('/chat/completions')) {
    // Endpoint already includes chat/completions
    apiUrl = `${cleanEndpoint}?api-version=${apiVersion}`
  } else {
    // Endpoint is just the base URL, need to construct full path
    // Extract resource name from endpoint if it's in format: https://{resource}.openai.azure.com
    const resourceMatch = cleanEndpoint.match(/https:\/\/([^.]+)\.openai\.azure\.com/)
    if (resourceMatch) {
      // Standard Azure OpenAI format
      apiUrl = `${cleanEndpoint}/openai/deployments/${modelName}/chat/completions?api-version=${apiVersion}`
    } else {
      // Assume it's already a full endpoint or use as-is
      apiUrl = `${cleanEndpoint}/chat/completions?api-version=${apiVersion}`
    }
  }
  
  console.log('[Azure AI] Constructed API URL:', apiUrl.replace(apiKey, '***'))

  // Build request body following the proven LumoMapper pattern
  const requestBody: any = {
    messages: messages,
    max_completion_tokens: options?.maxTokens || 16000, // Always set a token limit
  }

  // Add response format if JSON mode is requested
  if (options?.responseFormat === 'json_object') {
    requestBody.response_format = { type: 'json_object' }
  }

  console.log('[Azure AI] Making request to:', apiUrl.replace(apiKey, '***'))
  console.log('[Azure AI] Request body size:', JSON.stringify(requestBody).length, 'bytes')
  console.log('[Azure AI] Messages count:', messages.length)
  console.log('[Azure AI] Model name:', modelName)
  console.log('[Azure AI] API version:', apiVersion)
  
  // Create an AbortController for timeout (reduced to 2 minutes for faster failure)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.error('[Azure AI] Timeout reached, aborting request')
    controller.abort()
  }, 120000) // 2 minutes timeout for faster debugging

  const fetchStartTime = Date.now()
  let response: Response
  try {
    console.log('[Azure AI] Sending fetch request at', new Date().toISOString())
    console.log('[Azure AI] Request headers:', {
      'Content-Type': 'application/json',
      'api-key': apiKey ? '***' + apiKey.slice(-4) : 'MISSING',
    })
    
    // Add a heartbeat to see if we're stuck
    const heartbeat = setInterval(() => {
      const elapsed = Date.now() - fetchStartTime
      console.log(`[Azure AI] Still waiting... ${elapsed}ms elapsed`)
      if (elapsed > 60000) {
        console.log('[Azure AI] Request taking longer than 1 minute - this may indicate a connectivity issue')
      }
    }, 10000) // Log every 10 seconds
    
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        // Add keepalive for long requests
        keepalive: true,
      })
    } finally {
      clearInterval(heartbeat)
    }
    clearTimeout(timeoutId)
    console.log(`[Azure AI] Response received in ${Date.now() - fetchStartTime}ms, status:`, response.status)
  } catch (error: any) {
    clearTimeout(timeoutId)
    const elapsed = Date.now() - fetchStartTime
    console.error(`[Azure AI] Fetch error after ${elapsed}ms:`, error)
    console.error('[Azure AI] Error name:', error.name)
    console.error('[Azure AI] Error message:', error.message)
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${elapsed}ms. The AI service is taking longer than expected. Please check your Azure OpenAI endpoint and network connectivity.`)
    }
    throw error
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Azure AI API error: ${response.status} ${response.statusText}`
    
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message
      } else if (errorJson.error) {
        errorMessage = String(errorJson.error)
      }
    } catch {
      // If error text is not JSON, use it as-is
      if (errorText) {
        errorMessage += `. ${errorText}`
      }
    }
    
    throw new Error(errorMessage)
  }

  console.log('[Azure AI] Reading response text...')
  const responseTextStartTime = Date.now()
  const responseText = await response.text()
  console.log(`[Azure AI] Response text read in ${Date.now() - responseTextStartTime}ms, length:`, responseText.length)
  
  let data: AzureAIResponse

  try {
    console.log('[Azure AI] Parsing JSON response...')
    data = JSON.parse(responseText) as AzureAIResponse
    console.log('[Azure AI] JSON parsed successfully')
  } catch (parseError) {
    console.error('[Azure AI] Failed to parse response:', responseText.substring(0, 500))
    throw new Error(`Invalid JSON response from Azure AI: ${responseText.substring(0, 200)}`)
  }

  // Log the full response for debugging (truncated for large responses)
  const responsePreview = JSON.stringify(data, null, 2)
  console.log('[Azure AI] Response preview:', responsePreview.substring(0, 1000))
  if (responsePreview.length > 1000) {
    console.log('[Azure AI] ... (response truncated, full length:', responsePreview.length, ')')
  }

  if (!data.choices || data.choices.length === 0) {
    console.error('Azure AI response structure:', JSON.stringify(data, null, 2))
    throw new Error('Azure AI API returned no choices. The model may have failed to generate a response.')
  }

  const choice = data.choices[0]
  const finishReason = choice?.finish_reason
  const content = choice?.message?.content
  
  console.log('[Azure AI] Finish reason:', finishReason)
  console.log('[Azure AI] Content length:', content?.length || 0)
  
  // Check finish reason and content
  if (finishReason === 'length') {
    if (!content || content.trim().length === 0) {
      throw new Error(
        'Response was truncated due to token limit and returned empty content. ' +
        'The prompt may be too long or the model hit its maximum output limit. ' +
        'Try reducing the input data size or splitting the analysis into smaller parts.'
      )
    } else {
      // Content exists but was truncated - warn but continue
      console.warn('[Azure AI] Response was truncated but has content. Length:', content.length)
      // We'll use what we got, but this is not ideal
    }
  } else if (finishReason === 'content_filter') {
    throw new Error('Response was filtered by content filter. Please adjust your prompt.')
  } else if (finishReason === 'stop' && (!content || content.trim().length === 0)) {
    throw new Error('Model stopped generating but returned no content. This may indicate a model configuration issue.')
  }

  if (!content || content.trim().length === 0) {
    console.error('[Azure AI] Full response data:', JSON.stringify(data, null, 2))
    throw new Error(
      `Azure AI API returned empty content. Finish reason: ${finishReason || 'unknown'}. ` +
      'Please check your model deployment, token limits, and prompt content. ' +
      'The model may have hit its maximum output tokens.'
    )
  }

  return content
}
