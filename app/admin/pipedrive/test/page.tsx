'use client'

import { useState, useEffect } from 'react'

export default function PipedriveTestPage() {
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [allDeals, setAllDeals] = useState<any[]>([]) // Store all deals before filtering
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pipelines, setPipelines] = useState<any[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
  const [stages, setStages] = useState<any[]>([])
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'companies' | 'deals'>('deals')
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null)
  const [dealDetails, setDealDetails] = useState<any>(null)
  const [loadingDealDetails, setLoadingDealDetails] = useState(false)

  const fetchCompanies = async (search?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = search
        ? `/api/pipedrive/companies?search=${encodeURIComponent(search)}&limit=10`
        : '/api/pipedrive/companies?limit=10'
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch companies')
      }

      setCompanies(data.companies || [])
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Pipedrive test error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyDetails = async (companyId: number) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/pipedrive/companies/${companyId}?include_deals=true&include_persons=true`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch company details')
      }

      console.log('Company details:', data)
      alert(`Company: ${data.company.name}\nDeals: ${data.deals?.length || 0}\nPersons: ${data.persons?.length || 0}\n\nCheck console for full details.`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Pipedrive test error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/pipedrive/pipelines')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pipelines')
      }

      setPipelines(data.pipelines || [])
    } catch (err: any) {
      console.error('Failed to fetch pipelines:', err)
    }
  }

  const fetchCompaniesFromPipeline = async (pipelineId: number) => {
    setLoading(true)
    setError(null)
    setSelectedPipelineId(pipelineId)
    setCompanies([])
    try {
      const response = await fetch(`/api/pipedrive/pipelines/${pipelineId}/companies`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch companies from pipeline')
      }

      const fetchedCompanies = data.companies || []
      setCompanies(fetchedCompanies)
      
      if (fetchedCompanies.length === 0) {
        setError('No companies found in this pipeline. This might mean deals in this pipeline don\'t have associated organizations, or the companies have been deleted.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Pipedrive test error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStagesForPipeline = async (pipelineId: number) => {
    try {
      const response = await fetch(`/api/pipedrive/pipelines/${pipelineId}/stages`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stages')
      }

      setStages(data.stages || [])
    } catch (err: any) {
      console.error('Failed to fetch stages:', err)
      setStages([])
    }
  }

  const filterDealsByStage = (dealsToFilter: any[], stageId: number | null) => {
    // First filter out "lost" and "won" deals - only show deals in progress
    const activeDeals = dealsToFilter.filter(deal => {
      const dealStatus = deal.status?.toLowerCase() || ''
      return dealStatus !== 'lost' && dealStatus !== 'won'
    })
    
    // Then filter by stage
    if (stageId === null) {
      return activeDeals.filter(deal => deal.stage_id) // Only show deals with a stage
    }
    return activeDeals.filter(deal => deal.stage_id === stageId)
  }

  const fetchDealsFromPipeline = async (pipelineId: number) => {
    setLoading(true)
    setError(null)
    setSelectedPipelineId(pipelineId)
    setSelectedStageId(null) // Reset stage filter
    setDeals([])
    setAllDeals([])
    try {
      // Fetch stages for this pipeline
      await fetchStagesForPipeline(pipelineId)

      // Fetch deals
      const response = await fetch(`/api/pipedrive/pipelines/${pipelineId}/deals`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deals from pipeline')
      }

      const fetchedDeals = data.deals || []
      setAllDeals(fetchedDeals)
      
      // Filter to only show deals with stages (no stage filter selected yet)
      const dealsWithStages = filterDealsByStage(fetchedDeals, null)
      setDeals(dealsWithStages)
      
      if (dealsWithStages.length === 0) {
        setError('No deals with stages found in this pipeline.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Pipedrive test error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStageFilterChange = (stageId: number | null) => {
    setSelectedStageId(stageId)
    const filtered = filterDealsByStage(allDeals, stageId)
    setDeals(filtered)
    
    if (filtered.length === 0 && allDeals.length > 0) {
      setError(`No deals found for the selected stage.`)
    } else {
      setError(null)
    }
  }

  const fetchDealDetails = async (dealId: number) => {
    setLoadingDealDetails(true)
    setSelectedDealId(dealId)
    try {
      const response = await fetch(`/api/pipedrive/deals/${dealId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deal details')
      }

      setDealDetails(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Failed to fetch deal details:', err)
    } finally {
      setLoadingDealDetails(false)
    }
  }

  const closeDealDetails = () => {
    setSelectedDealId(null)
    setDealDetails(null)
  }

  useEffect(() => {
    fetchPipelines()
  }, [])

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-slate-900">Pipedrive API Test</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">Fetch Companies</h2>
          
          {/* Pipeline Selection */}
          {pipelines.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Pipeline:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('deals')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'deals'
                        ? 'bg-accent-magenta text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    View Deals
                  </button>
                  <button
                    onClick={() => setViewMode('companies')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'companies'
                        ? 'bg-accent-magenta text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    View Companies
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {pipelines.map((pipeline) => (
                  <button
                    key={pipeline.id}
                    onClick={() => {
                      if (viewMode === 'deals') {
                        fetchDealsFromPipeline(pipeline.id)
                      } else {
                        fetchCompaniesFromPipeline(pipeline.id)
                      }
                    }}
                    disabled={loading}
                    className={`px-4 py-2 rounded ${
                      selectedPipelineId === pipeline.id
                        ? 'bg-accent-magenta text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pipeline.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => fetchCompanies()}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Fetch All Companies'}
            </button>

            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search companies..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent-magenta"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    fetchCompanies(searchTerm)
                  }
                }}
              />
              <button
                onClick={() => fetchCompanies(searchTerm)}
                disabled={loading || !searchTerm.trim()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Search
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Stage Filter (only show when viewing deals and pipeline is selected) */}
          {viewMode === 'deals' && selectedPipelineId && stages.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Stage:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleStageFilterChange(null)}
                  className={`px-4 py-2 rounded text-sm ${
                    selectedStageId === null
                      ? 'bg-accent-magenta text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All Stages ({allDeals.filter(d => d.stage_id).length})
                </button>
                {stages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageFilterChange(stage.id)}
                    className={`px-4 py-2 rounded text-sm ${
                      selectedStageId === stage.id
                        ? 'bg-accent-magenta text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {stage.name} ({allDeals.filter(d => d.stage_id === stage.id).length})
                  </button>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'deals' && deals.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-3 text-slate-900">
                Showing {deals.length} deal{deals.length !== 1 ? 's' : ''}
                {selectedStageId && stages.find(s => s.id === selectedStageId) && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    in stage: {stages.find(s => s.id === selectedStageId)?.name}
                  </span>
                )}
                {selectedPipelineId && selectedStageId === null && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (all stages)
                  </span>
                )}
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {deals.map((deal) => {
                  // Safely extract values, handling objects
                  const dealValue = typeof deal.value === 'object' && deal.value !== null
                    ? JSON.stringify(deal.value)
                    : deal.value
                  const dealTitle = deal.title || deal.name || `Deal #${deal.id}`
                  const dealCurrency = typeof deal.currency === 'string' ? deal.currency : ''
                  
                  return (
                    <div
                      key={deal.id}
                      onClick={() => fetchDealDetails(deal.id)}
                      className="p-4 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{dealTitle}</h3>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600">Deal ID: {deal.id}</p>
                            {dealValue !== undefined && dealValue !== null && (
                              <p className="text-sm text-gray-600">
                                Value: {String(dealValue)} {dealCurrency}
                              </p>
                            )}
                            {deal.stage_id && (
                              <p className="text-sm text-gray-600">
                                Stage: {stages.find(s => s.id === deal.stage_id)?.name || `Stage ID: ${deal.stage_id}`}
                              </p>
                            )}
                            {deal.probability !== undefined && deal.probability !== null && (
                              <p className="text-sm text-gray-600">Probability: {String(deal.probability)}%</p>
                            )}
                            {deal.status && typeof deal.status === 'string' && (
                              <p className="text-sm text-gray-600">Status: {deal.status}</p>
                            )}
                            {deal.owner_name && typeof deal.owner_name === 'string' && (
                              <p className="text-sm text-gray-600">Owner: {deal.owner_name}</p>
                            )}
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {viewMode === 'companies' && companies.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-3 text-slate-900">
                Found {companies.length} companies
                {selectedPipelineId && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    from pipeline
                  </span>
                )}
              </h2>
              <div className="space-y-2">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="p-4 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => fetchCompanyDetails(company.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-900">{company.name}</h3>
                        <p className="text-sm text-gray-600">ID: {company.id}</p>
                        {company.owner_name && (
                          <p className="text-sm text-gray-600">Owner: {company.owner_name}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          fetchCompanyDetails(company.id)
                        }}
                        className="px-3 py-1 bg-accent-magenta text-white text-sm rounded hover:opacity-90"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && deals.length === 0 && companies.length === 0 && !error && (
            <p className="text-gray-500 text-center py-8">
              Select a pipeline above to view deals or companies
            </p>
          )}
        </div>

        {/* Deal Details Modal */}
        {selectedDealId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeDealDetails()
              }
            }}
          >
            <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white p-8 shadow-2xl overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={closeDealDetails}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 z-10"
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {loadingDealDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-600">Loading deal details...</div>
                </div>
              ) : dealDetails ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                      {dealDetails.deal.title || dealDetails.deal.name || `Deal #${selectedDealId}`}
                    </h2>
                    <p className="text-sm text-slate-600">Deal ID: {selectedDealId}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6">
                    {/* Deal Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-slate-900">Deal Information</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {dealDetails.deal.value && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Value:</span>
                            <span className="text-sm font-medium">
                              {typeof dealDetails.deal.value === 'object'
                                ? JSON.stringify(dealDetails.deal.value)
                                : dealDetails.deal.value}{' '}
                              {dealDetails.deal.currency || ''}
                            </span>
                          </div>
                        )}
                        {dealDetails.deal.stage_id && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Stage:</span>
                            <span className="text-sm font-medium">
                              {stages.find(s => s.id === dealDetails.deal.stage_id)?.name || dealDetails.deal.stage_id}
                            </span>
                          </div>
                        )}
                        {dealDetails.deal.probability !== undefined && dealDetails.deal.probability !== null && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Probability:</span>
                            <span className="text-sm font-medium">{dealDetails.deal.probability}%</span>
                          </div>
                        )}
                        {dealDetails.deal.status && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <span className="text-sm font-medium">{dealDetails.deal.status}</span>
                          </div>
                        )}
                        {dealDetails.deal.owner_name && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Owner:</span>
                            <span className="text-sm font-medium">{dealDetails.deal.owner_name}</span>
                          </div>
                        )}
                        {dealDetails.deal.add_time && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Created:</span>
                            <span className="text-sm font-medium">
                              {new Date(dealDetails.deal.add_time).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {dealDetails.deal.update_time && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Last Updated:</span>
                            <span className="text-sm font-medium">
                              {new Date(dealDetails.deal.update_time).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Organization Information */}
                    {dealDetails.organization && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-slate-900">Organization</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Name:</span>
                            <span className="text-sm font-medium">{dealDetails.organization.name}</span>
                          </div>
                          {dealDetails.organization.address && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Address:</span>
                              <span className="text-sm font-medium">{dealDetails.organization.address}</span>
                            </div>
                          )}
                          {dealDetails.organization.people_count !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">People Count:</span>
                              <span className="text-sm font-medium">{dealDetails.organization.people_count}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Person Information */}
                    {dealDetails.persons && dealDetails.persons.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-slate-900">Associated Person(s)</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          {dealDetails.persons.map((person: any, idx: number) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Name:</span>
                                <span className="text-sm font-medium">{person.name}</span>
                              </div>
                              {person.email && person.email.length > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Email:</span>
                                  <span className="text-sm font-medium">
                                    {person.email.find((e: any) => e.primary)?.value || person.email[0]?.value}
                                  </span>
                                </div>
                              )}
                              {person.phone && person.phone.length > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Phone:</span>
                                  <span className="text-sm font-medium">
                                    {person.phone.find((p: any) => p.primary)?.value || person.phone[0]?.value}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Raw Data (for debugging) */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        View Raw Data
                      </summary>
                      <pre className="mt-2 bg-gray-50 rounded-lg p-4 text-xs overflow-auto max-h-64">
                        {JSON.stringify(dealDetails, null, 2)}
                      </pre>
                    </details>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={closeDealDetails}
                      className="flex-1 rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-600">Failed to load deal details</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-3 text-slate-900">API Endpoints Created</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">GET /api/pipedrive/companies</code>
              <span className="ml-2">- List all companies (supports ?limit=10&start=0)</span>
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">GET /api/pipedrive/companies?search=term</code>
              <span className="ml-2">- Search companies</span>
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">GET /api/pipedrive/companies/[id]</code>
              <span className="ml-2">- Get company details</span>
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">GET /api/pipedrive/companies/[id]?include_deals=true&include_persons=true</code>
              <span className="ml-2">- Get company with deals and persons</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
