'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getFunnelForStage,
  FUNNEL_LABELS,
  type FunnelKey,
  type StageForFunnel,
} from '@/lib/kanban-funnels'

interface Startup {
  id: string
  company_name: string
  created_at: string
  stage?: string | null
  pipedrive_stage_id?: number | null
}

interface DashboardStats {
  total_startups: number
  total_founders: number
  completed_surveys: number
  pending_surveys: number
}

type TabId = 'overview' | 'kanban'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('kanban')
  const [startups, setStartups] = useState<Startup[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Kanban data
  const [pipelines, setPipelines] = useState<{ id: number; name: string }[]>([])
  const [stages, setStages] = useState<StageForFunnel[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
  const [kanbanLoading, setKanbanLoading] = useState(false)

  useEffect(() => {
    fetchStartups()
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'kanban') {
      fetchPipelines()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'kanban' && selectedPipelineId) {
      fetchStages()
    }
  }, [activeTab, selectedPipelineId])

  const fetchStartups = async () => {
    try {
      const res = await fetch('/api/startups')
      if (res.ok) {
        const data = await res.json()
        setStartups(data)
      }
    } catch (error) {
      console.error('Failed to fetch startups:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchPipelines = async () => {
    setKanbanLoading(true)
    try {
      const res = await fetch('/api/pipedrive/pipelines')
      if (res.ok) {
        const data = await res.json()
        const list = data.pipelines || []
        setPipelines(list)
        if (list.length > 0 && !selectedPipelineId) {
          setSelectedPipelineId(list[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error)
    } finally {
      setKanbanLoading(false)
    }
  }

  const fetchStages = async () => {
    if (!selectedPipelineId) return
    setKanbanLoading(true)
    try {
      const res = await fetch(`/api/pipedrive/pipelines/${selectedPipelineId}/stages`)
      if (res.ok) {
        const data = await res.json()
        const list = (data.stages || []).sort(
          (a: StageForFunnel, b: StageForFunnel) => (a.order_nr || 0) - (b.order_nr || 0)
        )
        setStages(list)
      }
    } catch (error) {
      console.error('Failed to fetch stages:', error)
    } finally {
      setKanbanLoading(false)
    }
  }

  // Group startups by funnel for Kanban (only imported ones with stage go by stage; others go to funnel 1)
  const getStartupsByFunnel = (): Record<FunnelKey, Startup[]> => {
    const groups: Record<FunnelKey, Startup[]> = {
      1: [],
      2: [],
      3: [],
    }
    for (const startup of startups) {
      const stageOrder = startup.pipedrive_stage_id
        ? stages.find((s) => s.id === startup.pipedrive_stage_id)?.order_nr ?? null
        : null
      const funnel = getFunnelForStage(stageOrder, startup.stage ?? null, stages)
      groups[funnel].push(startup)
    }
    return groups
  }

  const byFunnel = activeTab === 'kanban' ? getStartupsByFunnel() : null

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
          <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
          <p className="text-text-secondary">Overview of your startups and founders</p>
        </div>
        <Link href="/admin/startups/new" className="btn-primary">
          Create New Startup
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 mb-8 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('kanban')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'kanban'
              ? 'bg-white text-accent-magenta shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Stage overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-accent-magenta shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Total overview
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">Total Startups</span>
                </div>
                <div className="text-3xl font-bold text-text-primary">{stats.total_startups}</div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">Total Founders</span>
                </div>
                <div className="text-3xl font-bold text-text-primary">{stats.total_founders}</div>
              </div>
              <div className="card border-l-4 border-success">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">Completed Surveys</span>
                </div>
                <div className="text-3xl font-bold text-success">{stats.completed_surveys}</div>
              </div>
              <div className="card border-l-4 border-warning">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm">Pending Surveys</span>
                </div>
                <div className="text-3xl font-bold text-warning">{stats.pending_surveys}</div>
              </div>
            </div>
          )}

          {/* Recent Startups */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary">Recent Startups</h2>
              <Link
                href="/admin/startups"
                className="text-accent-magenta hover:underline text-sm font-medium"
              >
                View all
              </Link>
            </div>

            {startups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary mb-4">No startups yet</p>
                <Link href="/admin/startups/new" className="btn-primary inline-block">
                  Create your first startup
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {startups.slice(0, 5).map((startup) => (
                  <Link
                    key={startup.id}
                    href={`/admin/startups/${startup.id}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-accent-magenta hover:bg-gray-100/50 transition-all duration-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-text-primary mb-1">
                          {startup.company_name}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Created {new Date(startup.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <svg
                        className="w-5 h-5 text-text-light"
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
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'kanban' && (
        <div className="space-y-6">
          {pipelines.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-text-primary">Pipeline:</label>
              <select
                value={selectedPipelineId ?? ''}
                onChange={(e) => setSelectedPipelineId(parseInt(e.target.value) || null)}
                className="input-field w-auto min-w-[200px]"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {kanbanLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-text-secondary">Loading pipeline stages...</div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Startups are grouped into three funnel columns by their Pipedrive stage. Stages are
              merged for display only; nothing is changed in Pipedrive.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([1, 2, 3] as const).map((funnelKey) => (
              <div key={funnelKey} className="card flex flex-col min-h-[320px]">
                <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-gray-200">
                  {FUNNEL_LABELS[funnelKey]}
                </h3>
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {byFunnel && byFunnel[funnelKey].length === 0 ? (
                    <p className="text-sm text-text-secondary">No startups</p>
                  ) : (
                    byFunnel &&
                    byFunnel[funnelKey].map((startup) => (
                      <Link
                        key={startup.id}
                        href={`/admin/startups/${startup.id}`}
                        className="block p-3 rounded-lg border border-gray-200 hover:border-accent-magenta hover:bg-gray-50 transition-all"
                      >
                        <div className="font-medium text-text-primary truncate">
                          {startup.company_name}
                        </div>
                        {startup.stage && (
                          <div className="text-xs text-text-secondary mt-1 truncate">
                            {startup.stage}
                          </div>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
