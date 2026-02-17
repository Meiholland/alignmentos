'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface FileUploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function UploadInterviewPage() {
  const params = useParams()
  const router = useRouter()
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadedCount, setUploadedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showErrorModal) {
          setShowErrorModal(false)
        }
        // Don't close success modal with Escape as it redirects anyway
      }
    }
    if (showErrorModal) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showErrorModal])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const newFiles: FileUploadStatus[] = selectedFiles.map((file) => ({
      file,
      status: 'pending' as const,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      setErrorMessage('Please select at least one file')
      setShowErrorModal(true)
      return
    }

    setLoading(true)
    setUploadedCount(0)
    setFailedCount(0)

    let successCount = 0
    let failureCount = 0

    // Upload files sequentially
    for (let i = 0; i < files.length; i++) {
      const fileStatus = files[i]
      
      // Update status to uploading
      setFiles((prev) => {
        const updated = [...prev]
        updated[i] = { ...updated[i], status: 'uploading' }
        return updated
      })

      const formData = new FormData()
      formData.append('file', fileStatus.file)
      formData.append('founder_id', params.id as string)

      try {
        const res = await fetch('/api/interviews/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          // Update status to success
          setFiles((prev) => {
            const updated = [...prev]
            updated[i] = { ...updated[i], status: 'success' }
            return updated
          })
          successCount++
          setUploadedCount(successCount)
        } else {
          const error = await res.json()
          // Update status to error
          setFiles((prev) => {
            const updated = [...prev]
            updated[i] = {
              ...updated[i],
              status: 'error',
              error: error.error || 'Failed to upload',
            }
            return updated
          })
          failureCount++
          setFailedCount(failureCount)
        }
      } catch (error) {
        // Update status to error
        setFiles((prev) => {
          const updated = [...prev]
          updated[i] = {
            ...updated[i],
            status: 'error',
            error: 'Failed to upload transcript. Please try again.',
          }
          return updated
        })
        failureCount++
        setFailedCount(failureCount)
      }
    }

    setLoading(false)

    // Show success modal if at least one file uploaded successfully
    if (successCount > 0) {
      setShowSuccessModal(true)
    } else {
      // All failed
      setErrorMessage('Failed to upload all files. Please try again.')
      setShowErrorModal(true)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Upload Interview Transcript</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className="block mb-2 font-semibold">Select Files (.txt, .pdf, or .docx)</label>
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            multiple
            onChange={handleFileChange}
            className="w-full p-2 border rounded"
            disabled={loading}
          />
          <p className="text-sm text-gray-600 mt-1">
            Supported formats: .txt, .pdf, .docx (You can select multiple files)
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Selected Files ({files.length}):</p>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-3">
              {files.map((fileStatus, index) => (
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
                    <span className="text-sm truncate flex-1">{fileStatus.file.name}</span>
                    <span className="text-xs text-gray-500">
                      {(fileStatus.file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {!loading && (
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                      aria-label="Remove file"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {fileStatus.status === 'error' && fileStatus.error && (
                    <span className="text-xs text-red-600 ml-2">{fileStatus.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || files.length === 0}
            className="px-6 py-2 bg-accent-magenta text-white rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? `Uploading... (${uploadedCount + failedCount}/${files.length})`
              : `Upload ${files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Transcript'}`}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Success!</h2>
            </div>

            <p className="mb-6 text-slate-600">
              {uploadedCount > 0
                ? `${uploadedCount} transcript${uploadedCount > 1 ? 's' : ''} uploaded successfully!`
                : 'Interview transcript uploaded successfully!'}
              {failedCount > 0 && (
                <span className="block mt-2 text-amber-600">
                  {failedCount} file{failedCount > 1 ? 's' : ''} failed to upload.
                </span>
              )}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false)
                router.back()
              }}
              className="w-full rounded-2xl bg-accent-magenta px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

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
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
