'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Startup {
  id: string
  company_name: string
  industry: string | null
  stage: string | null
  created_at: string
  pipedrive_deal_id?: number | null
  pipedrive_stage_id?: number | null
}

interface PipedriveDeal {
  id: number
  title: string
  stage_id: number
  value?: number
  currency?: string
  status?: string
  org_id?: number
}

interface Stage {
  id: number
  name: string
  order_nr: number
}

export default function StartupsListPage() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [pipedriveDeals, setPipedriveDeals] = useState<PipedriveDeal[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [importingDealId, setImportingDealId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedPipelineId) {
      fetchStagesAndDeals()
    }
  }, [selectedPipelineId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch startups
      const startupsRes = await fetch('/api/startups')
      if (startupsRes.ok) {
        const startupsData = await startupsRes.json()
        setStartups(startupsData)
      }

      // Fetch pipelines
      const pipelinesRes = await fetch('/api/pipedrive/pipelines')
      if (pipelinesRes.ok) {
        const pipelinesData = await pipelinesRes.json()
        setPipelines(pipelinesData.pipelines || [])
        // Auto-select first pipeline (likely "Deals")
        if (pipelinesData.pipelines && pipelinesData.pipelines.length > 0) {
          setSelectedPipelineId(pipelinesData.pipelines[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStagesAndDeals = async () => {
    if (!selectedPipelineId) return

    try {
      // Fetch stages
      const stagesRes = await fetch(`/api/pipedrive/pipelines/${selectedPipelineId}/stages`)
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json()
        const sortedStages = (stagesData.stages || []).sort((a: Stage, b: Stage) => 
          (b.order_nr || 0) - (a.order_nr || 0) // Right to left (highest order_nr first)
        )
        setStages(sortedStages)
      }

      // Fetch deals
      const dealsRes = await fetch(`/api/pipedrive/pipelines/${selectedPipelineId}/deals`)
      if (dealsRes.ok) {
        const dealsData = await dealsRes.json()
        setPipedriveDeals(dealsData.deals || [])
      }
    } catch (error) {
      console.error('Failed to fetch stages/deals:', error)
    }
  }

  const handleImportDeal = async (dealId: number) => {
    setImportingDealId(dealId)
    try {
      const res = await fetch('/api/startups/import-pipedrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          pipelineId: selectedPipelineId,
          stageId: pipedriveDeals.find(d => d.id === dealId)?.stage_id,
        }),
      })

      if (res.ok) {
        const newStartup = await res.json()
        setStartups([newStartup, ...startups])
        // Remove from pipedrive deals list
        setPipedriveDeals(pipedriveDeals.filter(d => d.id !== dealId))
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to import deal')
      }
    } catch (error) {
      console.error('Failed to import deal:', error)
      alert('Failed to import deal')
    } finally {
      setImportingDealId(null)
    }
  }

  // Combine startups and deals, filter, and sort
  const getDisplayItems = () => {
    // Get deals filtered by stage
    let filteredDeals = pipedriveDeals
    if (selectedStageId) {
      filteredDeals = pipedriveDeals.filter(d => d.stage_id === selectedStageId)
    }

    // Create display items from deals (not yet imported)
    const dealItems = filteredDeals
      .filter(deal => !startups.some(s => s.pipedrive_deal_id === deal.id))
      .map(deal => ({
        id: `deal-${deal.id}`,
        company_name: deal.title || 'Unknown Company',
        stage: stages.find(s => s.id === deal.stage_id)?.name || null,
        stageOrder: stages.find(s => s.id === deal.stage_id)?.order_nr || 0,
        isDeal: true,
        dealId: deal.id,
        created_at: new Date().toISOString(), // Use current date for sorting
      }))

    // Create display items from startups
    const startupItems = startups.map(startup => ({
      ...startup,
      company_name: startup.company_name,
      stage: startup.stage || (startup.pipedrive_stage_id 
        ? stages.find(s => s.id === startup.pipedrive_stage_id)?.name || null
        : null),
      stageOrder: startup.pipedrive_stage_id 
        ? stages.find(s => s.id === startup.pipedrive_stage_id)?.order_nr || 0
        : 9999, // Manual startups go to end
      isDeal: false,
      pipedrive_deal_id: startup.pipedrive_deal_id, // Include for sorting
    }))

    // Combine and filter by search
    let combined = [...dealItems, ...startupItems]
    
    if (searchQuery) {
      combined = combined.filter(item =>
        item.company_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort: imported deals first, then by stage order (right to left), then by created_at
    combined.sort((a, b) => {
      // First priority: imported deals (have pipedrive_deal_id) come first
      const aIsImported = a.pipedrive_deal_id ? 1 : 0
      const bIsImported = b.pipedrive_deal_id ? 1 : 0
      if (aIsImported !== bIsImported) {
        return bIsImported - aIsImported // Imported (1) comes before non-imported (0)
      }
      
      // Second priority: stage order (right to left, highest order_nr first)
      if (b.stageOrder !== a.stageOrder) {
        return b.stageOrder - a.stageOrder
      }
      
      // Third priority: created_at (most recent first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Limit to 20
    return combined.slice(0, 20)
  }

  const displayItems = getDisplayItems()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Startups</h1>
          <p className="text-text-secondary">Manage your portfolio companies</p>
        </div>
        <Link href="/admin/startups/new" className="btn-primary">
          Create New Startup
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search startups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-light"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Pipeline and Stage Filters */}
        {pipelines.length > 0 && (
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pipeline:
              </label>
              <select
                value={selectedPipelineId || ''}
                onChange={(e) => setSelectedPipelineId(parseInt(e.target.value))}
                className="input-field"
              >
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </div>

            {stages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stage:
                </label>
                <select
                  value={selectedStageId || ''}
                  onChange={(e) => setSelectedStageId(e.target.value ? parseInt(e.target.value) : null)}
                  className="input-field"
                >
                  <option value="">All Stages</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Startups Grid */}
      {displayItems.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary mb-4">
            {searchQuery || selectedStageId
              ? 'No startups match your filters'
              : 'No startups found'}
          </p>
          {!searchQuery && (
            <Link href="/admin/startups/new" className="btn-primary inline-block">
              Create your first startup
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-text-secondary">
            Showing {displayItems.length} {displayItems.length === 1 ? 'startup' : 'startups'}
            {displayItems.length >= 20 && ' (limited to 20 most recent)'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className={`card card-hover group ${
                  item.isDeal ? 'border-2 border-accent-ice' : ''
                }`}
              >
                {item.isDeal ? (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-accent-ice/20 flex items-center justify-center">
                        <span className="text-accent-ice font-bold text-lg">
                          {item.company_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleImportDeal(item.dealId!)}
                        disabled={importingDealId === item.dealId}
                        className="px-3 py-1 bg-accent-magenta text-white text-sm rounded hover:opacity-90 disabled:opacity-50"
                      >
                        {importingDealId === item.dealId ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {item.company_name}
                    </h3>
                    <div className="space-y-2">
                      {item.stage && (
                        <div className="flex items-center gap-2">
                          <span className="text-text-secondary text-sm">Stage:</span>
                          <span className="tag bg-accent-ice/20 text-accent-ice text-xs">
                            {item.stage}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-text-light mt-3">
                        From Pipedrive
                      </div>
                    </div>
                  </>
                ) : (
                  <Link href={`/admin/startups/${item.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-accent-magenta transition-colors">
                        <span className="text-accent-magenta group-hover:text-white font-bold text-lg transition-colors">
                          {item.company_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <svg
                        className="w-5 h-5 text-text-light group-hover:text-accent-magenta transition-colors"
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
                    <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-magenta transition-colors">
                      {item.company_name}
                    </h3>
                    <div className="space-y-2">
                      {item.industry && (
                        <div className="flex items-center gap-2">
                          <span className="text-text-secondary text-sm">Industry:</span>
                          <span className="text-text-primary text-sm font-medium">{item.industry}</span>
                        </div>
                      )}
                      {item.stage && (
                        <div className="flex items-center gap-2">
                          <span className="text-text-secondary text-sm">Stage:</span>
                          <span className="tag bg-gray-100 text-accent-magenta text-xs">
                            {item.stage}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-text-light mt-3">
                        Created {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
