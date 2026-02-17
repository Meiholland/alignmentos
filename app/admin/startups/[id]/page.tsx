'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Startup {
  id: string
  company_name: string
  industry: string | null
  stage: string | null
  geography: string | null
  raise_amount: number | null
  planned_close_date: string | null
  board_structure_description: string | null
  deal_partner: string | null
  pipedrive_deal_created_at: string | null
  pipedrive_deal_updated_at: string | null
  created_at: string
}

interface Founder {
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
  survey_status: string
  interview_status: string
  survey_token: string
}

export default function StartupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [startup, setStartup] = useState<Startup | null>(null)
  const [founders, setFounders] = useState<Founder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddFounder, setShowAddFounder] = useState(false)
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [surveyUrl, setSurveyUrl] = useState<string>('')
  const [surveyHasExistingResponses, setSurveyHasExistingResponses] = useState(false)
  const [surveyFounderId, setSurveyFounderId] = useState<string | null>(null)
  const [resettingSurvey, setResettingSurvey] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [founderToDelete, setFounderToDelete] = useState<{ id: string; name: string } | null>(null)
  const [showDeleteStartupModal, setShowDeleteStartupModal] = useState(false)
  const [founderToEdit, setFounderToEdit] = useState<Founder | null>(null)
  const [showAnalysisErrorModal, setShowAnalysisErrorModal] = useState(false)
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState('')
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false)
  const [showAnalysisLoadingModal, setShowAnalysisLoadingModal] = useState(false)
  const [analysisAbortController, setAnalysisAbortController] = useState<AbortController | null>(null)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [promptData, setPromptData] = useState<{
    systemPrompt: string
    userPrompt: string
    startupName: string
  } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showSyncSuccessModal, setShowSyncSuccessModal] = useState(false)
  const [showSyncErrorModal, setShowSyncErrorModal] = useState(false)
  const [syncErrorMessage, setSyncErrorMessage] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFounderId, setUploadFounderId] = useState<string | null>(null)
  const [uploadFiles, setUploadFiles] = useState<Array<{ file: File; status: 'pending' | 'uploading' | 'success' | 'error'; error?: string }>>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0)
  const [uploadFailedCount, setUploadFailedCount] = useState(0)
  const [showUploadSuccessModal, setShowUploadSuccessModal] = useState(false)
  const [showUploadErrorModal, setShowUploadErrorModal] = useState(false)
  const [uploadErrorMessage, setUploadErrorMessage] = useState('')
  const [existingTranscripts, setExistingTranscripts] = useState<Array<{ id: string; file_name: string | null; uploaded_at: string }>>([])
  const [loadingTranscripts, setLoadingTranscripts] = useState(false)
  const [deletingTranscriptId, setDeletingTranscriptId] = useState<string | null>(null)
  const [showDeleteTranscriptModal, setShowDeleteTranscriptModal] = useState(false)
  const [transcriptToDelete, setTranscriptToDelete] = useState<{ id: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const startupId = params?.id as string
    if (startupId) {
      fetchStartup()
      fetchFounders()
    } else {
      console.error('No startup ID in params:', params)
      setLoading(false)
    }
  }, [params])

  // Cleanup: abort any pending analysis requests on unmount
  useEffect(() => {
    return () => {
      if (analysisAbortController) {
        analysisAbortController.abort()
      }
    }
  }, [analysisAbortController])

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSurveyModal) {
          setShowSurveyModal(false)
        }
        if (showDeleteModal) {
          setShowDeleteModal(false)
          setFounderToDelete(null)
        }
        if (showDeleteStartupModal) {
          setShowDeleteStartupModal(false)
        }
        if (showSyncSuccessModal) {
          setShowSyncSuccessModal(false)
        }
        if (showSyncErrorModal) {
          setShowSyncErrorModal(false)
        }
        if (showAnalysisErrorModal) {
          setShowAnalysisErrorModal(false)
        }
        if (showUploadModal && !uploadLoading) {
          setShowUploadModal(false)
          setUploadFounderId(null)
          setUploadFiles([])
          setExistingTranscripts([])
        }
        if (showUploadSuccessModal) {
          setShowUploadSuccessModal(false)
        }
        if (showUploadErrorModal) {
          setShowUploadErrorModal(false)
        }
        if (showDeleteTranscriptModal) {
          setShowDeleteTranscriptModal(false)
          setTranscriptToDelete(null)
        }
      }
    }
    if (showSurveyModal || showDeleteModal || showDeleteStartupModal || showSyncSuccessModal || showSyncErrorModal || showAnalysisErrorModal || showUploadModal || showUploadSuccessModal || showUploadErrorModal || showDeleteTranscriptModal) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showSurveyModal, showDeleteModal, showDeleteStartupModal, showSyncSuccessModal, showSyncErrorModal, showAnalysisErrorModal, showUploadModal, showUploadSuccessModal, showUploadErrorModal, showDeleteTranscriptModal, uploadLoading])

  const fetchStartup = async () => {
    const startupId = params?.id as string
    if (!startupId) {
      console.error('No startup ID available')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/startups/${startupId}`)
      if (res.ok) {
        const data = await res.json()
        setStartup(data)
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch startup' }))
        console.error('Failed to fetch startup:', res.status, errorData)
        // If 404, the startup doesn't exist
        if (res.status === 404 || res.status === 400) {
          setStartup(null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch startup:', error)
      setStartup(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchFounders = async () => {
    const startupId = params?.id as string
    if (!startupId) return

    try {
      const res = await fetch(`/api/founders?startup_id=${startupId}`)
      if (res.ok) {
        const data = await res.json()
        setFounders(data)
      } else {
        console.error('Failed to fetch founders:', res.status)
      }
    } catch (error) {
      console.error('Failed to fetch founders:', error)
    }
  }

  const handleSendSurvey = async (founderId: string) => {
    try {
      const res = await fetch(`/api/founders/${founderId}/send-survey`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setSurveyUrl(data.survey_url)
        setSurveyHasExistingResponses(data.has_existing_responses || false)
        setSurveyFounderId(founderId)
        setShowSurveyModal(true)
        fetchFounders()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to send survey')
    }
  }

  const handleResetSurvey = async () => {
    if (!surveyFounderId) return

    if (!confirm('Are you sure you want to reset all survey answers? This action cannot be undone.')) {
      return
    }

    setResettingSurvey(true)
    try {
      const res = await fetch(`/api/founders/${surveyFounderId}/reset-survey`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setSurveyUrl(data.survey_url)
        setSurveyHasExistingResponses(false)
        fetchFounders()
        alert('Survey answers have been reset. A new survey link has been generated.')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to reset survey')
    } finally {
      setResettingSurvey(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl)
      // Optionally show a brief success message
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleDeleteClick = (founderId: string, founderName: string) => {
    setFounderToDelete({ id: founderId, name: founderName })
    setShowDeleteModal(true)
  }

  const handleDeleteStartup = async () => {
    if (!startup) return

    try {
      const res = await fetch(`/api/startups/${startup.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Redirect to startups list after successful deletion
        router.push('/admin/startups')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete startup')
      }
    } catch (error) {
      console.error('Failed to delete startup:', error)
      alert('Failed to delete startup')
    }
  }

  const handleSyncPipedrive = async () => {
    if (!startup || !startup.pipedrive_deal_id) return

    setSyncing(true)
    try {
      const res = await fetch(`/api/startups/${startup.id}/sync-pipedrive`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        // Refresh the startup data
        await fetchStartup()
        setShowSyncSuccessModal(true)
      } else {
        const error = await res.json()
        setSyncErrorMessage(error.error || 'Failed to sync with Pipedrive')
        setShowSyncErrorModal(true)
      }
    } catch (error) {
      console.error('Failed to sync startup:', error)
      setSyncErrorMessage('Failed to sync with Pipedrive')
      setShowSyncErrorModal(true)
    } finally {
      setSyncing(false)
    }
  }

  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const newFiles = selectedFiles.map((file) => ({
      file,
      status: 'pending' as const,
    }))
    setUploadFiles((prev) => [...prev, ...newFiles])
    // Reset the input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const fetchExistingTranscripts = async (founderId: string) => {
    setLoadingTranscripts(true)
    try {
      const res = await fetch(`/api/founders/${founderId}/transcripts`)
      if (res.ok) {
        const data = await res.json()
        setExistingTranscripts(data)
      } else {
        console.error('Failed to fetch transcripts')
        setExistingTranscripts([])
      }
    } catch (error) {
      console.error('Failed to fetch transcripts:', error)
      setExistingTranscripts([])
    } finally {
      setLoadingTranscripts(false)
    }
  }

  const handleOpenUploadModal = (founderId: string) => {
    setUploadFounderId(founderId)
    setShowUploadModal(true)
    setUploadFiles([])
    fetchExistingTranscripts(founderId)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteTranscriptClick = (transcriptId: string, fileName: string | null) => {
    setTranscriptToDelete({ id: transcriptId, name: fileName || 'Untitled' })
    setShowDeleteTranscriptModal(true)
  }

  const handleConfirmDeleteTranscript = async () => {
    if (!transcriptToDelete || !uploadFounderId) return

    setDeletingTranscriptId(transcriptToDelete.id)
    try {
      const res = await fetch(`/api/founders/${uploadFounderId}/transcripts/${transcriptToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Remove from local state
        setExistingTranscripts((prev) => prev.filter((t) => t.id !== transcriptToDelete.id))
        setShowDeleteTranscriptModal(false)
        setTranscriptToDelete(null)
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'Failed to delete transcript'}`)
      }
    } catch (error) {
      console.error('Failed to delete transcript:', error)
      alert('Failed to delete transcript')
    } finally {
      setDeletingTranscriptId(null)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFounderId || uploadFiles.length === 0) {
      setUploadErrorMessage('Please select at least one file')
      setShowUploadErrorModal(true)
      return
    }

    setUploadLoading(true)
    setUploadSuccessCount(0)
    setUploadFailedCount(0)

    let successCount = 0
    let failureCount = 0
    const filesToRemove: number[] = []

    // Upload files sequentially
    for (let i = 0; i < uploadFiles.length; i++) {
      const fileStatus = uploadFiles[i]

      // Update status to uploading
      setUploadFiles((prev) => {
        const updated = [...prev]
        updated[i] = { ...updated[i], status: 'uploading' }
        return updated
      })

      const formData = new FormData()
      formData.append('file', fileStatus.file)
      formData.append('founder_id', uploadFounderId)

      try {
        const res = await fetch('/api/interviews/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          // Update status to success
          setUploadFiles((prev) => {
            const updated = [...prev]
            updated[i] = { ...updated[i], status: 'success' }
            return updated
          })
          successCount++
          setUploadSuccessCount(successCount)
          filesToRemove.push(i)
        } else {
          const error = await res.json()
          // Update status to error
          setUploadFiles((prev) => {
            const updated = [...prev]
            updated[i] = {
              ...updated[i],
              status: 'error',
              error: error.error || 'Failed to upload',
            }
            return updated
          })
          failureCount++
          setUploadFailedCount(failureCount)
        }
      } catch (error) {
        // Update status to error
        setUploadFiles((prev) => {
          const updated = [...prev]
          updated[i] = {
            ...updated[i],
            status: 'error',
            error: 'Failed to upload transcript. Please try again.',
          }
          return updated
        })
        failureCount++
        setUploadFailedCount(failureCount)
      }
    }

    setUploadLoading(false)

    // Remove successfully uploaded files after a short delay
    setTimeout(() => {
      setUploadFiles((prev) => prev.filter((_, i) => !filesToRemove.includes(i)))
    }, 1000)

    // Refresh founders to update interview status and reload transcripts
    if (successCount > 0) {
      fetchFounders()
      if (uploadFounderId) {
        fetchExistingTranscripts(uploadFounderId)
      }
    }

    // Show success modal if at least one file uploaded successfully
    if (successCount > 0) {
      setShowUploadSuccessModal(true)
    } else {
      // All failed
      setUploadErrorMessage('Failed to upload all files. Please try again.')
      setShowUploadErrorModal(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!founderToDelete) return

    try {
      const res = await fetch(`/api/founders/${founderToDelete.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchFounders()
        setShowDeleteModal(false)
        setFounderToDelete(null)
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to delete founder')
    }
  }

  const handleGenerateAnalysis = async () => {
    const startupId = params?.id as string
    if (!startupId) return

    // Cancel any existing request
    if (analysisAbortController) {
      analysisAbortController.abort()
    }

    const abortController = new AbortController()
    setAnalysisAbortController(abortController)
    setGeneratingAnalysis(true)
    setShowAnalysisLoadingModal(true)
    
    try {
      const res = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startup_id: startupId }),
        signal: abortController.signal,
      })
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return
      }
      
      if (res.ok) {
        const data = await res.json()
        setGeneratingAnalysis(false)
        // Close loading modal and navigate immediately
        setShowAnalysisLoadingModal(false)
        setAnalysisAbortController(null)
        // Navigate to report page immediately
        router.push(`/admin/startups/${startupId}/report`)
      } else {
        let errorMessage = 'Failed to generate diagnostic analysis'
        try {
          const error = await res.json()
          errorMessage = error.error || error.message || errorMessage
        } catch {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`
        }
        setGeneratingAnalysis(false)
        setAnalysisErrorMessage(errorMessage)
        setShowAnalysisErrorModal(true)
      }
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        setShowAnalysisLoadingModal(false)
        setGeneratingAnalysis(false)
        setAnalysisAbortController(null)
        return
      }
      
      console.error('Generate analysis error:', error)
      // Ensure loading modal is closed
      setShowAnalysisLoadingModal(false)
      setGeneratingAnalysis(false)
      setAnalysisAbortController(null)
      setAnalysisErrorMessage(
        error?.message || 'Failed to generate diagnostic analysis. Please check the console for details.'
      )
      setShowAnalysisErrorModal(true)
    }
  }

  const handleCancelAnalysis = () => {
    if (analysisAbortController) {
      analysisAbortController.abort()
    }
    setShowAnalysisLoadingModal(false)
    setGeneratingAnalysis(false)
    setAnalysisAbortController(null)
  }

  const handleViewPrompt = async () => {
    const startupId = params?.id as string
    if (!startupId) return

    try {
      const res = await fetch(`/api/startups/${startupId}/prompt`)
      if (res.ok) {
        const data = await res.json()
        setPromptData({
          systemPrompt: data.systemPrompt,
          userPrompt: data.userPrompt,
          startupName: data.startup_name,
        })
        setShowPromptModal(true)
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to fetch prompt')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  if (!startup) {
    return (
      <div className="card max-w-2xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Startup Not Found</h2>
          <p className="text-text-secondary mb-6">
            The startup you're looking for doesn't exist or may have been deleted.
          </p>
          <Link href="/admin/startups" className="btn-primary inline-block">
            Back to Startups
          </Link>
        </div>
      </div>
    )
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">{startup.company_name}</h1>
            <p className="text-text-secondary">Startup details and founder management</p>
          </div>
          <div className="flex gap-2">
            {startup.pipedrive_deal_id && (
              <button
                onClick={handleSyncPipedrive}
                disabled={syncing}
                className="px-4 py-2 bg-accent-ice text-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
                title="Sync with Pipedrive to update stage and other fields"
              >
                <svg 
                  className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {syncing ? 'Syncing...' : 'Sync with Pipedrive'}
              </button>
            )}
            <button
              onClick={() => setShowDeleteStartupModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete Startup
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Company Details</h2>
          <div className="space-y-2">
            {startup.industry && (
              <div>
                <strong>Industry:</strong> {startup.industry}
              </div>
            )}
            {startup.stage && (
              <div>
                <strong>Stage:</strong> {startup.stage}
              </div>
            )}
            {startup.geography && (
              <div>
                <strong>Geography:</strong> {startup.geography}
              </div>
            )}
            {startup.raise_amount && (
              <div>
                <strong>Raise Amount:</strong> ${startup.raise_amount.toLocaleString()}
              </div>
            )}
            {startup.planned_close_date && (
              <div>
                <strong>Planned Close:</strong>{' '}
                {new Date(startup.planned_close_date).toLocaleDateString()}
              </div>
            )}
            {startup.deal_partner && (
              <div>
                <strong>Deal Partner:</strong> {startup.deal_partner}
              </div>
            )}
            {startup.pipedrive_deal_created_at && (
              <div>
                <strong>Created:</strong>{' '}
                {new Date(startup.pipedrive_deal_created_at).toLocaleString()}
              </div>
            )}
            {startup.pipedrive_deal_updated_at && (
              <div>
                <strong>Last Updated:</strong>{' '}
                {new Date(startup.pipedrive_deal_updated_at).toLocaleString()}
              </div>
            )}
            {!startup.industry && !startup.stage && !startup.geography && 
             !startup.raise_amount && !startup.planned_close_date && !startup.deal_partner &&
             !startup.pipedrive_deal_created_at && !startup.pipedrive_deal_updated_at && (
              <p className="text-gray-500 text-sm">No company details available</p>
            )}
          </div>
        </div>
        {startup.board_structure_description && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Board Structure</h2>
            <p className="text-gray-700">
              {startup.board_structure_description}
            </p>
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Founders</h2>
          <div className="space-x-2">
            <button
              onClick={() => setShowAddFounder(true)}
              className="px-4 py-2 bg-accent-pumpkin text-white rounded hover:opacity-90"
            >
              Add Founder
            </button>
            <button
              onClick={handleGenerateAnalysis}
              disabled={generatingAnalysis}
              className="px-4 py-2 bg-accent-magenta text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingAnalysis ? 'Generating...' : 'Generate Diagnostic Report'}
            </button>
            <button
              onClick={handleViewPrompt}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              View AI Prompt
            </button>
          </div>
        </div>

        {showAddFounder && (
          <AddFounderForm
            startupId={startup.id}
            onSuccess={() => {
              setShowAddFounder(false)
              fetchFounders()
            }}
            onCancel={() => setShowAddFounder(false)}
          />
        )}

        {founderToEdit && (
          <EditFounderForm
            founder={founderToEdit}
            onSuccess={() => {
              setFounderToEdit(null)
              fetchFounders()
            }}
            onCancel={() => setFounderToEdit(null)}
          />
        )}

        <div className="border rounded">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Equity</th>
                <th className="p-4 text-left">Survey Status</th>
                <th className="p-4 text-left">Interview Status</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {founders.map((founder) => (
                <tr key={founder.id} className="border-t">
                  <td className="p-4">{founder.full_name}</td>
                  <td className="p-4">{founder.role || 'N/A'}</td>
                  <td className="p-4">{founder.email}</td>
                  <td className="p-4">
                    {founder.equity_percentage ? `${founder.equity_percentage}%` : 'N/A'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        founder.survey_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : founder.survey_status === 'sent'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {founder.survey_status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        founder.interview_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {founder.interview_status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendSurvey(founder.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-magenta text-white transition hover:opacity-90"
                        title="Send Survey"
                        aria-label="Send Survey"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleOpenUploadModal(founder.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-pumpkin text-white transition hover:opacity-90"
                        title="Upload Interview"
                        aria-label="Upload Interview"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setFounderToEdit(founder)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-600 text-white transition hover:bg-yellow-700"
                        title="Edit Founder"
                        aria-label="Edit Founder"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(founder.id, founder.full_name)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-700"
                        title="Delete Founder"
                        aria-label="Delete Founder"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {startup && (
        <div className="card">
          <Link
            href={`/admin/startups/${startup.id}/report`}
            className="text-accent-magenta hover:underline font-medium flex items-center gap-2"
          >
            View Diagnostic Report
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Survey Link Modal */}
      {showSurveyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSurveyModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowSurveyModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-900">Survey Link</h2>
              <p className="mt-2 text-slate-600">
                {surveyHasExistingResponses
                  ? 'This founder has already submitted answers. Copy the link to view or share it again.'
                  : 'Copy this link to send to the founder'}
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="text"
                  value={surveyUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-magenta text-white transition hover:opacity-90"
                  aria-label="Copy link"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              {surveyHasExistingResponses && (
                <button
                  type="button"
                  onClick={handleResetSurvey}
                  disabled={resettingSurvey}
                  className="flex-1 rounded-2xl border border-red-300 bg-white px-4 py-3 text-base font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {resettingSurvey ? 'Resetting...' : 'Reset Answers'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowSurveyModal(false)
                  setSurveyFounderId(null)
                  setSurveyHasExistingResponses(false)
                }}
                className={`${surveyHasExistingResponses ? 'flex-1' : 'w-full'} rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Startup Confirmation Modal */}
      {showDeleteStartupModal && startup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteStartupModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowDeleteStartupModal(false)}
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
              <h2 className="text-2xl font-semibold text-slate-900">Delete Startup</h2>
              <p className="mt-2 text-slate-600">
                Are you sure you want to delete <strong>{startup.company_name}</strong>?
              </p>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will only delete the startup from this application. 
                  The deal in Pipedrive will remain untouched and can be re-imported later if needed.
                </p>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                This action cannot be undone. All founders, surveys, and diagnostic reports associated with this startup will also be deleted.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteStartupModal(false)}
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStartup}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-700"
              >
                Delete Startup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Success Modal */}
      {showSyncSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSyncSuccessModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowSyncSuccessModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Sync Successful</h2>
              <p className="mt-2 text-slate-600">
                Startup has been synced with Pipedrive. Stage and other fields have been updated.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSyncSuccessModal(false)}
                className="flex-1 rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Error Modal */}
      {showSyncErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSyncErrorModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowSyncErrorModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Sync Failed</h2>
              <p className="mt-2 text-slate-600">
                {syncErrorMessage || 'Failed to sync with Pipedrive. Please try again.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSyncErrorModal(false)}
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Founder Confirmation Modal */}
      {showDeleteModal && founderToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false)
              setFounderToDelete(null)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false)
                setFounderToDelete(null)
              }}
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
              <h2 className="text-2xl font-semibold text-slate-900">Delete Founder</h2>
              <p className="mt-2 text-slate-600">
                Are you sure you want to delete <strong>{founderToDelete.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setFounderToDelete(null)
                }}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Loading Modal */}
      {showAnalysisLoadingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={handleCancelAnalysis}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Cancel"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex flex-col items-center gap-4">
              {/* Spinner */}
              <div className="relative h-16 w-16">
                <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-accent-magenta"></div>
              </div>
              
              {/* Message */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900">Working Some AI Magic</h3>
                <p className="mt-2 text-sm text-slate-600">Generating your diagnostic analysis...</p>
                <p className="mt-1 text-xs text-slate-500">This may take a few minutes</p>
              </div>
              
              {/* Progress indicator */}
              <div className="mt-4 flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-accent-magenta" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-accent-magenta" style={{ animationDelay: '150ms' }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-accent-magenta" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt View Modal */}
      {showPromptModal && promptData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPromptModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white p-8 shadow-2xl overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => setShowPromptModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 z-10"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-900">
                AI Prompt for {promptData.startupName}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                This is the exact prompt sent to Azure OpenAI for analysis generation
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {/* System Prompt */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-slate-900">System Prompt</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                    {promptData.systemPrompt}
                  </pre>
                </div>
              </div>

              {/* User Prompt */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-slate-900">User Prompt</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                    {promptData.userPrompt}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={() => {
                  const fullPrompt = `SYSTEM PROMPT:\n\n${promptData.systemPrompt}\n\n\nUSER PROMPT:\n\n${promptData.userPrompt}`
                  navigator.clipboard.writeText(fullPrompt)
                  alert('Prompt copied to clipboard!')
                }}
                className="flex-1 rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
              >
                Copy Full Prompt
              </button>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="px-6 py-3 border rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt View Modal */}
      {showPromptModal && promptData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPromptModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white p-8 shadow-2xl overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => setShowPromptModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 z-10"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-900">
                AI Prompt for {promptData.startupName}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                This is the exact prompt sent to Azure OpenAI for analysis generation
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {/* System Prompt */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-slate-900">System Prompt</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                    {promptData.systemPrompt}
                  </pre>
                </div>
              </div>

              {/* User Prompt */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-slate-900">User Prompt</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                    {promptData.userPrompt}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={() => {
                  const fullPrompt = `SYSTEM PROMPT:\n\n${promptData.systemPrompt}\n\n\nUSER PROMPT:\n\n${promptData.userPrompt}`
                  navigator.clipboard.writeText(fullPrompt)
                  alert('Prompt copied to clipboard!')
                }}
                className="flex-1 rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
              >
                Copy Full Prompt
              </button>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="px-6 py-3 border rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Error Modal */}
      {showAnalysisErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAnalysisErrorModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowAnalysisErrorModal(false)}
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

            <p className="mb-6 text-slate-600">{analysisErrorMessage}</p>

            <button
              type="button"
              onClick={() => setShowAnalysisErrorModal(false)}
              className="w-full rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Upload Interview Modal */}
      {showUploadModal && uploadFounderId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !uploadLoading) {
              setShowUploadModal(false)
              setUploadFounderId(null)
              setUploadFiles([])
              setExistingTranscripts([])
            }
          }}
        >
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                if (!uploadLoading) {
                  setShowUploadModal(false)
                  setUploadFounderId(null)
                  setUploadFiles([])
                  setExistingTranscripts([])
                }
              }}
              disabled={uploadLoading}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 disabled:opacity-50"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">Upload Interview Transcript</h2>
              <p className="text-sm text-slate-600 mt-1">
                Select one or more files to upload (.txt, .pdf, or .docx)
              </p>
            </div>

            {/* Existing Transcripts */}
            {loadingTranscripts ? (
              <div className="mb-4 p-4 border rounded bg-gray-50">
                <p className="text-sm text-gray-600">Loading existing transcripts...</p>
              </div>
            ) : existingTranscripts.length > 0 ? (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold">Previously Uploaded Files ({existingTranscripts.length}):</p>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50">
                  {existingTranscripts.map((transcript) => (
                    <div
                      key={transcript.id}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm truncate flex-1">{transcript.file_name || 'Untitled'}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(transcript.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTranscriptClick(transcript.id, transcript.file_name)}
                        disabled={deletingTranscriptId === transcript.id}
                        className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete transcript"
                        aria-label="Delete transcript"
                      >
                        {deletingTranscriptId === transcript.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-4 border rounded bg-gray-50">
                <p className="text-sm text-gray-600">No transcripts uploaded yet.</p>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold">Select Files</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx"
                  multiple
                  onChange={handleUploadFileChange}
                  className="w-full p-2 border rounded"
                  disabled={uploadLoading}
                />
                <p className="text-sm text-gray-600 mt-1">
                  Supported formats: .txt, .pdf, .docx (You can select multiple files)
                </p>
              </div>

              {/* File List */}
              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Selected Files ({uploadFiles.length}):</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-3">
                    {uploadFiles.map((fileStatus, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {fileStatus.status === 'uploading' && (
                            <div className="animate-spin h-4 w-4 border-2 border-accent-magenta border-t-transparent rounded-full"></div>
                          )}
                          {fileStatus.status === 'success' && (
                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {fileStatus.status === 'error' && (
                            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {fileStatus.status === 'pending' && (
                            <div className="h-4 w-4 rounded-full bg-gray-300"></div>
                          )}
                          <span className="text-sm truncate flex-1">{fileStatus.file.name}</span>
                          <span className="text-xs text-gray-500">
                            {(fileStatus.file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        {!uploadLoading && (
                          <button
                            type="button"
                            onClick={() => handleRemoveUploadFile(index)}
                            className="ml-2 text-red-600 hover:text-red-800"
                            aria-label="Remove file"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        {fileStatus.status === 'error' && fileStatus.error && (
                          <span className="text-xs text-red-600 ml-2 truncate max-w-xs">{fileStatus.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploadLoading || uploadFiles.length === 0}
                  className="flex-1 rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {uploadLoading
                    ? `Uploading... (${uploadSuccessCount + uploadFailedCount}/${uploadFiles.length})`
                    : `Upload ${uploadFiles.length > 0 ? `${uploadFiles.length} File${uploadFiles.length > 1 ? 's' : ''}` : 'Transcript'}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!uploadLoading) {
                      setShowUploadModal(false)
                      setUploadFounderId(null)
                      setUploadFiles([])
                      setExistingTranscripts([])
                    }
                  }}
                  disabled={uploadLoading}
                  className="px-6 py-3 rounded-2xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Success Modal */}
      {showUploadSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadSuccessModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowUploadSuccessModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Success!</h2>
            </div>

            <p className="mb-6 text-slate-600">
              {uploadSuccessCount > 0
                ? `${uploadSuccessCount} transcript${uploadSuccessCount > 1 ? 's' : ''} uploaded successfully!`
                : 'Interview transcript uploaded successfully!'}
              {uploadFailedCount > 0 && (
                <span className="block mt-2 text-amber-600">
                  {uploadFailedCount} file{uploadFailedCount > 1 ? 's' : ''} failed to upload.
                </span>
              )}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowUploadSuccessModal(false)
                  // Modal stays open so user can add more files
                }}
                className="flex-1 rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Error Modal */}
      {showUploadErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadErrorModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowUploadErrorModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Error</h2>
            </div>

            <p className="mb-6 text-slate-600">{uploadErrorMessage}</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUploadErrorModal(false)}
                className="flex-1 rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Transcript Confirmation Modal */}
      {showDeleteTranscriptModal && transcriptToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteTranscriptModal(false)
              setTranscriptToDelete(null)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowDeleteTranscriptModal(false)
                setTranscriptToDelete(null)
              }}
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
              <h2 className="text-2xl font-semibold text-slate-900">Delete Transcript</h2>
              <p className="mt-2 text-slate-600">
                Are you sure you want to delete <strong>{transcriptToDelete.name}</strong>? This action cannot be undone. The file and its extracted text will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteTranscriptModal(false)
                  setTranscriptToDelete(null)
                }}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTranscript}
                disabled={deletingTranscriptId !== null}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deletingTranscriptId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddFounderForm({
  startupId,
  onSuccess,
  onCancel,
}: {
  startupId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    email: '',
    equity_percentage: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/founders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup_id: startupId,
          full_name: formData.full_name,
          role: formData.role || null,
          email: formData.email,
          equity_percentage: formData.equity_percentage
            ? parseFloat(formData.equity_percentage)
            : null,
          // Use defaults for removed fields
          full_time_status: true,
          years_known_cofounders: null,
          prior_startup_experience: false,
          previously_worked_together: false,
          is_ceo: false,
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to create founder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 p-4 border rounded bg-gray-50">
      <h3 className="font-semibold mb-4">Add New Founder</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-semibold">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Role</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Equity %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.equity_percentage}
              onChange={(e) =>
                setFormData({ ...formData, equity_percentage: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-accent-pumpkin text-white rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Founder'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function EditFounderForm({
  founder,
  onSuccess,
  onCancel,
}: {
  founder: Founder
  onSuccess: () => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: founder.full_name,
    role: founder.role || '',
    email: founder.email,
    equity_percentage: founder.equity_percentage?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/founders/${founder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          role: formData.role || null,
          email: formData.email,
          equity_percentage: formData.equity_percentage
            ? parseFloat(formData.equity_percentage)
            : null,
          // Keep existing values for removed fields (don't change them)
          full_time_status: founder.full_time_status,
          years_known_cofounders: founder.years_known_cofounders,
          prior_startup_experience: founder.prior_startup_experience,
          previously_worked_together: founder.previously_worked_together,
          is_ceo: founder.is_ceo,
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to update founder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 p-4 border rounded bg-gray-50">
      <h3 className="font-semibold mb-4">Edit Founder</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-semibold">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Role</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Equity %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.equity_percentage}
              onChange={(e) =>
                setFormData({ ...formData, equity_percentage: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Founder'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
