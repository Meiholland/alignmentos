/**
 * Pipedrive API Client
 * Handles communication with Pipedrive API
 */

export interface PipedriveConfig {
  apiToken: string
  companyDomain: string
}

export interface PipedriveCompany {
  id: number
  name: string
  owner_id?: number
  visible_to?: string
  add_time?: string
  update_time?: string
  [key: string]: any // Pipedrive returns many custom fields
}

export interface PipedriveDeal {
  id: number
  title: string
  value?: number
  currency?: string
  stage_id?: number
  status?: string
  probability?: number
  add_time?: string
  update_time?: string
  [key: string]: any
}

export interface PipedrivePerson {
  id: number
  name: string
  email?: Array<{ value: string; primary?: boolean }>
  phone?: Array<{ value: string; primary?: boolean }>
  [key: string]: any
}

export interface PipedrivePipeline {
  id: number
  name: string
  order_nr?: number
  active?: boolean
  [key: string]: any
}

export interface PipedriveStage {
  id: number
  name: string
  pipeline_id: number
  order_nr?: number
  deal_probability?: number
  [key: string]: any
}

/**
 * Get Pipedrive configuration from environment variables
 */
export function getPipedriveConfig(): PipedriveConfig {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN
  const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN

  if (!apiToken) {
    throw new Error(
      'PIPEDRIVE_API_TOKEN is not set. Please add it to your .env.local file.'
    )
  }

  if (!companyDomain || companyDomain === 'your-company-domain') {
    throw new Error(
      'PIPEDRIVE_COMPANY_DOMAIN is not set. Please add your Pipedrive company domain to .env.local (e.g., "yourcompany" for yourcompany.pipedrive.com).'
    )
  }

  return {
    apiToken,
    companyDomain,
  }
}

/**
 * Make a request to Pipedrive API
 */
async function pipedriveRequest<T>(
  endpoint: string,
  config: PipedriveConfig,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = `https://${config.companyDomain}.pipedrive.com/api/v1`
  const url = `${baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_token=${config.apiToken}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Pipedrive API error: ${response.status} ${response.statusText}`
    
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error) {
        errorMessage = errorJson.error
      } else if (errorJson.error_info) {
        errorMessage = errorJson.error_info
      }
    } catch {
      if (errorText) {
        errorMessage += `. ${errorText}`
      }
    }
    
    throw new Error(errorMessage)
  }

  const data = await response.json()
  
  // Pipedrive wraps responses in a data object
  if (data.success === false) {
    throw new Error(data.error || 'Pipedrive API request failed')
  }

  return data.data as T
}

/**
 * Get all companies/organizations
 */
export async function getCompanies(
  config: PipedriveConfig,
  options?: {
    limit?: number
    start?: number
    filter_id?: number
  }
): Promise<PipedriveCompany[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.start) params.append('start', options.start.toString())
  if (options?.filter_id) params.append('filter_id', options.filter_id.toString())

  const queryString = params.toString()
  return pipedriveRequest<PipedriveCompany[]>(
    `/organizations${queryString ? '?' + queryString : ''}`,
    config
  )
}

/**
 * Get a specific company by ID
 */
export async function getCompany(
  companyId: number,
  config: PipedriveConfig
): Promise<PipedriveCompany> {
  return pipedriveRequest<PipedriveCompany>(`/organizations/${companyId}`, config)
}

/**
 * Search for companies
 */
export async function searchCompanies(
  term: string,
  config: PipedriveConfig,
  options?: {
    limit?: number
    start?: number
  }
): Promise<PipedriveCompany[]> {
  const params = new URLSearchParams()
  params.append('term', term)
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.start) params.append('start', options.start.toString())

  return pipedriveRequest<PipedriveCompany[]>(
    `/organizations/search?${params.toString()}`,
    config
  )
}

/**
 * Get deals for a specific company
 */
export async function getCompanyDeals(
  companyId: number,
  config: PipedriveConfig,
  options?: {
    limit?: number
    start?: number
  }
): Promise<PipedriveDeal[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.start) params.append('start', options.start.toString())

  const queryString = params.toString()
  return pipedriveRequest<PipedriveDeal[]>(
    `/organizations/${companyId}/deals${queryString ? '?' + queryString : ''}`,
    config
  )
}

/**
 * Get persons associated with a company
 */
export async function getCompanyPersons(
  companyId: number,
  config: PipedriveConfig,
  options?: {
    limit?: number
    start?: number
  }
): Promise<PipedrivePerson[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.start) params.append('start', options.start.toString())

  const queryString = params.toString()
  return pipedriveRequest<PipedrivePerson[]>(
    `/organizations/${companyId}/persons${queryString ? '?' + queryString : ''}`,
    config
  )
}

/**
 * Get all deals
 */
export async function getDeals(
  config: PipedriveConfig,
  options?: {
    limit?: number
    start?: number
    filter_id?: number
    status?: 'all_not_deleted' | 'open' | 'won' | 'lost'
    pipeline_id?: number
    stage_id?: number
  }
): Promise<PipedriveDeal[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.start) params.append('start', options.start.toString())
  if (options?.filter_id) params.append('filter_id', options.filter_id.toString())
  if (options?.status) params.append('status', options.status)
  if (options?.pipeline_id) params.append('pipeline_id', options.pipeline_id.toString())
  if (options?.stage_id) params.append('stage_id', options.stage_id.toString())

  const queryString = params.toString()
  return pipedriveRequest<PipedriveDeal[]>(
    `/deals${queryString ? '?' + queryString : ''}`,
    config
  )
}

/**
 * Get all pipelines
 */
export async function getPipelines(
  config: PipedriveConfig
): Promise<PipedrivePipeline[]> {
  return pipedriveRequest<PipedrivePipeline[]>('/pipelines', config)
}

/**
 * Get stages for a specific pipeline
 */
export async function getPipelineStages(
  pipelineId: number,
  config: PipedriveConfig
): Promise<PipedriveStage[]> {
  return pipedriveRequest<PipedriveStage[]>(`/stages?pipeline_id=${pipelineId}`, config)
}

/**
 * Get companies from deals in a specific pipeline
 * This fetches all deals in the pipeline and extracts unique companies
 */
export async function getCompaniesFromPipeline(
  pipelineId: number,
  config: PipedriveConfig,
  options?: {
    limit?: number
    start?: number
    status?: 'all_not_deleted' | 'open' | 'won' | 'lost'
  }
): Promise<PipedriveCompany[]> {
  // Fetch all deals in the pipeline (with pagination)
  const allDeals: PipedriveDeal[] = []
  let start = options?.start || 0
  const limit = options?.limit || 500
  let hasMore = true

  while (hasMore) {
    const deals = await getDeals(config, {
      pipeline_id: pipelineId,
      limit,
      start,
      status: options?.status || 'all_not_deleted',
    })

    if (deals.length > 0) {
      // Log first deal structure for debugging
      if (allDeals.length === 0 && deals[0]) {
        console.log('Sample deal structure:', {
          id: deals[0].id,
          title: deals[0].title,
          org_id: deals[0].org_id,
          organization_id: deals[0].organization_id,
          keys: Object.keys(deals[0]).slice(0, 10),
        })
      }
      allDeals.push(...deals)
    }
    
    // If we got fewer deals than the limit, we've reached the end
    if (deals.length < limit) {
      hasMore = false
    } else {
      start += limit
    }
  }

  // Extract unique company IDs from deals
  const companyIds = new Set<number>()
  for (const deal of allDeals) {
    // Check multiple possible field names for organization ID
    const orgId = deal.org_id || deal.organization_id || deal.orgId
    if (orgId && typeof orgId === 'number' && orgId > 0) {
      companyIds.add(orgId)
    }
  }

  console.log(`Found ${allDeals.length} deals, ${companyIds.size} unique companies`)

  // Fetch company details for each unique company
  const companies: PipedriveCompany[] = []
  const failedIds: number[] = []
  
  for (const companyId of companyIds) {
    try {
      const company = await getCompany(companyId, config)
      if (company && company.id) {
        companies.push(company)
      }
    } catch (error: any) {
      failedIds.push(companyId)
      const errorMsg = error?.message || String(error)
      console.warn(`Failed to fetch company ${companyId}: ${errorMsg}`)
      // Continue with other companies instead of throwing
    }
  }

  if (failedIds.length > 0) {
    console.log(`Successfully fetched ${companies.length} companies, ${failedIds.length} failed (likely deleted):`, failedIds.slice(0, 10))
  }

  return companies
}
