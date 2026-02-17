'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Question {
  id: string
  dimension: string
  question_text: string
  question_order: number
}

interface FounderInfo {
  founder_id: string
  founder_name: string
  survey_status: string
}

export default function SurveyPage() {
  const params = useParams()
  const [founderInfo, setFounderInfo] = useState<FounderInfo | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchSurveyData()
  }, [params.token])

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showErrorModal) {
          setShowErrorModal(false)
        }
      }
    }
    if (showErrorModal) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showErrorModal])

  const fetchSurveyData = async () => {
    try {
      // Fetch founder info
      const founderRes = await fetch(`/api/survey/token/${params.token}`)
      if (!founderRes.ok) {
        const error = await founderRes.json()
        setErrorMessage(error.error || 'Failed to load survey')
        setShowErrorModal(true)
        return
      }
      const founderData = await founderRes.json()
      setFounderInfo(founderData)

      // Fetch questions
      const questionsRes = await fetch('/api/survey/questions')
      if (questionsRes.ok) {
        const questionsData = await questionsRes.json()
        setQuestions(questionsData)

        // Initialize all responses to 5 (default slider value)
        // This way users don't need to interact with every slider
        const defaultResponses: Record<string, number> = {}
        questionsData.forEach((q: Question) => {
          defaultResponses[q.id] = 5
        })
        setResponses(defaultResponses)

        // Load saved responses if any (will override defaults)
        // Note: In a full implementation, you'd fetch saved responses here
      }
    } catch (error) {
      console.error('Failed to fetch survey data:', error)
      setErrorMessage('Failed to load survey')
      setShowErrorModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleResponseChange = (questionId: string, value: number) => {
    setResponses({ ...responses, [questionId]: value })
    setSaved(false)
  }

  const handleSave = async () => {
    const responseArray = Object.entries(responses).map(([question_id, response_value]) => ({
      question_id,
      response_value,
    }))

    if (responseArray.length === 0) {
      setErrorMessage('Please answer at least one question before saving')
      setShowErrorModal(true)
      return
    }

    try {
      const res = await fetch('/api/survey/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          responses: responseArray,
        }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const error = await res.json()
        setErrorMessage(error.error || 'Failed to save progress')
        setShowErrorModal(true)
      }
    } catch (error) {
      setErrorMessage('Failed to save progress')
      setShowErrorModal(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Since sliders default to 5, all questions are considered answered
    // Map all questions to responses (use 5 as default if somehow missing)
    const responseArray = questions.map((q) => ({
      question_id: q.id,
      response_value: responses[q.id] || 5,
    }))

    setSubmitting(true)
    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          responses: responseArray,
        }),
      })

      if (res.ok) {
        window.location.href = '/survey/thank-you'
      } else {
        const error = await res.json()
        setErrorMessage(error.error || 'Failed to submit survey')
        setShowErrorModal(true)
        setSubmitting(false)
      }
    } catch (error) {
      setErrorMessage('Failed to submit survey')
      setShowErrorModal(true)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading survey...</div>
      </div>
    )
  }

  if (!founderInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Invalid or expired survey link</div>
      </div>
    )
  }

  // Since sliders default to 5, all questions are considered answered
  // Progress is always 100% (or based on questions that have been explicitly changed from default)
  const answeredCount = questions.length
  const progress = 100

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-4">Founder Survey</h1>
          <p className="text-gray-600 mb-6">
            Hello {founderInfo.founder_name}, please answer the following questions. Your
            responses will help assess team alignment and strength.
          </p>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>
                Progress: {answeredCount} / {questions.length} questions answered
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-accent-magenta h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-8 mb-8">
              {questions.map((question, idx) => (
                <div key={question.id} className="border-b pb-6">
                  <div className="mb-4">
                    <label className="block text-lg font-semibold mb-4">
                      {idx + 1}. {question.question_text}
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Strongly Disagree</span>
                        <span className="text-2xl font-bold text-accent-magenta min-w-[3rem] text-center">
                          {responses[question.id] || '—'}
                        </span>
                        <span className="text-sm text-gray-600 font-medium">Strongly Agree</span>
                      </div>
                      <div className="relative px-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={responses[question.id] || 5}
                          onChange={(e) => handleResponseChange(question.id, parseInt(e.target.value))}
                          className="survey-slider"
                          style={{
                            background: `linear-gradient(to right, #931E76 0%, #931E76 ${((responses[question.id] || 5) - 1) * 11.11}%, #E5E7EB ${((responses[question.id] || 5) - 1) * 11.11}%, #E5E7EB 100%)`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 px-3">
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
                type="button"
                onClick={handleSave}
                className="px-6 py-2 border rounded hover:bg-gray-100"
              >
                {saved ? '✓ Saved' : 'Save Progress'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-accent-magenta text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Survey'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowErrorModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
