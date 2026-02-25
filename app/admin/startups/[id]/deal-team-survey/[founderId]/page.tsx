'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  dimension: string
  statement_text: string
  question_order: number
}

export default function DealTeamSurveyPage() {
  const params = useParams()
  const router = useRouter()
  const startupId = params?.id as string
  const founderId = params?.founderId as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [startupIdFromApi, setStartupIdFromApi] = useState<string | null>(null)

  useEffect(() => {
    if (founderId) {
      fetchData()
    }
  }, [founderId])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/founders/${founderId}/deal-team-survey`)
      if (!res.ok) {
        const err = await res.json()
        setErrorMessage(err.error || 'Failed to load survey')
        setShowErrorModal(true)
        setLoading(false)
        return
      }
      const data = await res.json()
      setQuestions(data.questions || [])
      setStartupIdFromApi(data.startup_id || startupId)
      const defaultResponses: Record<string, number> = {}
      ;(data.questions || []).forEach((q: Question) => {
        defaultResponses[q.id] = data.responses?.[q.id] ?? 5
      })
      setResponses(defaultResponses)
    } catch {
      setErrorMessage('Failed to load survey')
      setShowErrorModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleResponseChange = (questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const responseArray = questions.map((q) => ({
      question_id: q.id,
      response_value: responses[q.id] ?? 5,
    }))

    setSubmitting(true)
    try {
      const res = await fetch(`/api/founders/${founderId}/deal-team-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: responseArray }),
      })
      const data = await res.json()

      if (res.ok && data.redirect) {
        router.push(data.redirect)
        return
      }
      setErrorMessage(data.error || 'Failed to submit survey')
      setShowErrorModal(true)
    } catch {
      setErrorMessage('Failed to submit survey')
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDimension = (d: string) =>
    d
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' & ')

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-text-secondary">Loading survey...</div>
      </div>
    )
  }

  const redirectBack = startupIdFromApi || startupId

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={redirectBack ? `/admin/startups/${redirectBack}` : '/admin/startups'}
            className="text-sm font-medium text-accent-magenta hover:underline"
          >
            ← Back to startup
          </Link>
        </div>

        <div className="rounded-lg bg-white p-8 shadow">
          <h1 className="mb-2 text-3xl font-bold text-text-primary">
            Deal team de-biasing survey
          </h1>
          <p className="mb-6 text-gray-600">
            Rate the founder on each statement. Your answers are saved when you submit; you can
            return later to change them.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-8 space-y-8">
              {questions.map((question, idx) => (
                <div key={question.id} className="border-b pb-6">
                  <div className="mb-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {formatDimension(question.dimension)}
                    </p>
                    <label className="block text-lg font-semibold">
                      {idx + 1}. {question.statement_text}
                    </label>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          Strongly Disagree
                        </span>
                        <span className="min-w-[3rem] text-center text-2xl font-bold text-accent-magenta">
                          {responses[question.id] ?? '—'}
                        </span>
                        <span className="text-sm font-medium text-gray-600">
                          Strongly Agree
                        </span>
                      </div>
                      <div className="relative px-2">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={responses[question.id] ?? 5}
                          onChange={(e) =>
                            handleResponseChange(question.id, parseInt(e.target.value, 10))
                          }
                          className="survey-slider"
                          style={{
                            background: `linear-gradient(to right, #931E76 0%, #931E76 ${((responses[question.id] ?? 5) - 1) * 11.11}%, #E5E7EB ${((responses[question.id] ?? 5) - 1) * 11.11}%, #E5E7EB 100%)`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between px-3 text-xs text-gray-500">
                        <span>1</span>
                        <span>5</span>
                        <span>10</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-magenta px-6 py-2.5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit and return to startup'}
              </button>
              <Link
                href={redirectBack ? `/admin/startups/${redirectBack}` : '/admin/startups'}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>

      {showErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowErrorModal(false)
          }}
        >
          <div className="relative max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <svg
                  className="h-6 w-6 text-rose-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Error</h2>
            </div>
            <p className="mb-6 text-slate-600">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="w-full rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
