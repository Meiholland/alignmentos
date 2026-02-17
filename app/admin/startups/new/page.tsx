'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startupSchema } from '@/lib/schemas/startup'

export default function NewStartupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    stage: '',
    geography: '',
    raise_amount: '',
    planned_close_date: '',
    board_structure_description: '',
    deal_partner: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Convert empty strings to null for optional fields
      const cleanedData = {
        company_name: formData.company_name,
        industry: formData.industry || null,
        stage: formData.stage || null,
        geography: formData.geography || null,
        raise_amount: formData.raise_amount ? parseFloat(formData.raise_amount) : null,
        planned_close_date: formData.planned_close_date || null,
        board_structure_description: formData.board_structure_description || null,
        deal_partner: formData.deal_partner || null,
      }
      
      const validated = startupSchema.parse(cleanedData)

      const res = await fetch('/api/startups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/admin/startups/${data.id}`)
      } else {
        let errorMessage = 'Unknown error occurred'
        try {
          const error = await res.json()
          errorMessage = error.error || JSON.stringify(error)
        } catch {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`
        }
        alert(`Error: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      alert(`Error: ${error.message || 'Failed to create startup'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Create New Startup</h1>
        <p className="text-text-secondary">Add a new company to your portfolio</p>
      </div>

      {/* Form */}
      <div className="card max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block mb-2 font-semibold text-text-primary">
                Company Name <span className="text-warning-red">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                className="input-field"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-text-primary">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                className="input-field"
                placeholder="e.g., SaaS, Fintech"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-text-primary">Stage</label>
              <input
                type="text"
                value={formData.stage}
                onChange={(e) =>
                  setFormData({ ...formData, stage: e.target.value })
                }
                className="input-field"
                placeholder="e.g., Seed, Series A"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-text-primary">Geography</label>
              <input
                type="text"
                value={formData.geography}
                onChange={(e) =>
                  setFormData({ ...formData, geography: e.target.value })
                }
                className="input-field"
                placeholder="e.g., US, Europe"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-text-primary">Raise Amount ($)</label>
              <input
                type="number"
                value={formData.raise_amount}
                onChange={(e) =>
                  setFormData({ ...formData, raise_amount: e.target.value })
                }
                className="input-field"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-text-primary">Planned Close Date</label>
              <input
                type="date"
                value={formData.planned_close_date}
                onChange={(e) =>
                  setFormData({ ...formData, planned_close_date: e.target.value })
                }
                className="input-field"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 font-semibold text-text-primary">Deal Partner</label>
              <input
                type="text"
                value={formData.deal_partner}
                onChange={(e) =>
                  setFormData({ ...formData, deal_partner: e.target.value })
                }
                className="input-field"
                placeholder="Partner name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 font-semibold text-text-primary">
                Board Structure Description
              </label>
              <textarea
                value={formData.board_structure_description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    board_structure_description: e.target.value,
                  })
                }
                className="input-field"
                rows={4}
                placeholder="Describe the board structure..."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Startup'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
