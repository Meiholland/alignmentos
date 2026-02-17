'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Startup {
  id: string
  company_name: string
  created_at: string
}

interface DashboardStats {
  total_startups: number
  total_founders: number
  completed_surveys: number
  pending_surveys: number
}

export default function AdminDashboard() {
  const [startups, setStartups] = useState<Startup[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStartups()
    fetchStats()
  }, [])

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
    </div>
  )
}
