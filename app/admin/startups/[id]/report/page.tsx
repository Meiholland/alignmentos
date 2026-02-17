'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { DiagnosticAnalysis } from '@/lib/ai/analysis-engine'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Report {
  id: string
  startup_id: string
  analysis_json: DiagnosticAnalysis
  executive_summary: string
  created_at: string
}

interface FounderComparisonData {
  founders: Array<{
    founderId: string
    founderName: string
    dimensions: Record<string, number>
  }>
  dimensions: string[]
}

export default function DiagnosticReportPage() {
  const params = useParams()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [comparisonData, setComparisonData] = useState<FounderComparisonData | null>(null)

  useEffect(() => {
    fetchReport()
    fetchComparisonData()
  }, [params.id])

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/reports/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      } else {
        // Handle 404 gracefully - no report exists yet
        if (res.status === 404) {
          setReport(null)
        } else {
          const error = await res.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Failed to fetch report:', error)
        }
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComparisonData = async () => {
    try {
      const res = await fetch(`/api/startups/${params.id}/survey-comparison`)
      if (res.ok) {
        const data = await res.json()
        setComparisonData(data)
      } else {
        // Silently fail - comparison is optional
        console.log('No survey comparison data available')
      }
    } catch (error) {
      console.error('Failed to fetch comparison data:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!report) {
    return (
      <div>
        <p>No diagnostic report found. Generate one from the startup details page.</p>
        <Link href={`/admin/startups/${params.id}`} className="text-blue-600 hover:underline">
          ← Back to Startup
        </Link>
      </div>
    )
  }

  const analysis = report.analysis_json

  const getRiskColor = (score: number) => {
    if (score >= 75) return 'bg-red-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white'
      case 'high':
        return 'bg-red-400 text-white'
      case 'medium':
        return 'bg-yellow-400 text-black'
      case 'low':
        return 'bg-green-400 text-black'
      default:
        return 'bg-gray-400'
    }
  }

  const prepareRadarChartData = (data: FounderComparisonData) => {
    // Transform data for radar chart format
    // Each dimension becomes a data point with values for each founder
    return data.dimensions.map((dimension) => {
      const dataPoint: Record<string, string | number> = {
        dimension: dimension,
      }
      data.founders.forEach((founder) => {
        dataPoint[founder.founderId] = founder.dimensions[dimension] || 0
      })
      return dataPoint
    })
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/admin/startups/${params.id}`}
          className="text-blue-600 hover:underline"
        >
          ← Back to Startup
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-8">Diagnostic Report</h1>
      <div className="text-sm text-gray-600 mb-8">
        Generated: {new Date(report.created_at).toLocaleString()}
      </div>

      {/* Executive Summary */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Executive Summary</h2>
        <div className="whitespace-pre-wrap">{report.executive_summary}</div>
      </div>

      {/* Key Metrics and Founder Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Key Metrics - Left Side */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Key Metrics</h2>
          <div className="p-4 border rounded">
            <div className="text-sm text-gray-600 mb-2">Team Strength Index</div>
            <div className="text-3xl font-bold">{analysis.team_strength_index ?? 'N/A'}/100</div>
            {analysis.team_strength_index !== undefined && (
              <div
                className={`h-2 mt-2 rounded ${getRiskColor(
                  100 - analysis.team_strength_index
                )}`}
                style={{ width: `${analysis.team_strength_index}%` }}
              />
            )}
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-gray-600 mb-2">Decision Architecture Risk</div>
            <div className="text-3xl font-bold">
              {analysis.decision_architecture_risk?.score ?? 'N/A'}/100
            </div>
            {analysis.decision_architecture_risk?.score !== undefined && (
              <div
                className={`h-2 mt-2 rounded ${getRiskColor(
                  analysis.decision_architecture_risk.score
                )}`}
                style={{ width: `${analysis.decision_architecture_risk.score}%` }}
              />
            )}
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-gray-600 mb-2">Commitment Asymmetry</div>
            <div className="text-3xl font-bold">{analysis.commitment_asymmetry_score ?? 'N/A'}/100</div>
            {analysis.commitment_asymmetry_score !== undefined && (
              <div
                className={`h-2 mt-2 rounded ${getRiskColor(
                  analysis.commitment_asymmetry_score
                )}`}
                style={{ width: `${analysis.commitment_asymmetry_score}%` }}
              />
            )}
          </div>
        </div>

        {/* Founder Comparison Radar Chart - Right Side */}
        {comparisonData && comparisonData.founders.length > 0 && comparisonData.dimensions.length > 0 && (
          <div className="p-6 border rounded">
            <h2 className="text-2xl font-semibold mb-4">Founder Survey Comparison</h2>
            <p className="text-sm text-gray-600 mb-4">
              Comparing survey responses across dimensions for founders who have completed surveys
            </p>
            <div className="w-full" style={{ height: '500px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={prepareRadarChartData(comparisonData)}>
                  <PolarGrid />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickFormatter={(value) => value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#666', fontSize: 10 }} />
                  {comparisonData.founders.map((founder, idx) => {
                    const colors = ['#931E76', '#42F5E7', '#F5853F', '#0E1951', '#B33C86']
                    const color = colors[idx % colors.length]
                    return (
                      <Radar
                        key={founder.founderId}
                        name={founder.founderName}
                        dataKey={founder.founderId}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    )
                  })}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Investment Implications */}
      <div className="mb-8 p-6 border rounded">
        <h2 className="text-2xl font-semibold mb-4">Investment Implications</h2>
        <div className="space-y-2">
          <div>
            <strong>Overall Risk:</strong>{' '}
            <span
              className={`px-2 py-1 rounded ${getSeverityColor(
                analysis.investment_implications.overall_risk
              )}`}
            >
              {analysis.investment_implications.overall_risk.toUpperCase()}
            </span>
          </div>
          <div>
            <strong>Recommendation:</strong>{' '}
            <span className="font-semibold">
              {analysis.investment_implications.recommendation.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div className="mt-4">
            <strong>Rationale:</strong>
            <p className="mt-2">{analysis.investment_implications.rationale}</p>
          </div>
        </div>
      </div>

      {/* Red Flags */}
      {analysis.red_flags.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Red Flags</h2>
          <div className="space-y-4">
            {analysis.red_flags.map((flag, idx) => (
              <div key={idx} className="p-4 border-l-4 border-red-500 bg-red-50 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${getSeverityColor(flag.severity)}`}
                  >
                    {flag.severity.toUpperCase()}
                  </span>
                </div>
                <p className="font-semibold mb-2">{flag.description}</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {flag.evidence.map((evidence, eIdx) => (
                    <li key={eIdx}>{evidence}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Functional Gap Analysis */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Functional Gap Analysis</h2>
        <div className="p-4 border rounded">
          <div className="mb-2">
            <strong>Severity:</strong>{' '}
            <span
              className={`px-2 py-1 rounded ${getSeverityColor(
                analysis.functional_gap_analysis.severity
              )}`}
            >
              {analysis.functional_gap_analysis.severity.toUpperCase()}
            </span>
          </div>
          <ul className="list-disc list-inside mt-2">
            {analysis.functional_gap_analysis.gaps.map((gap, idx) => (
              <li key={idx}>{gap}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Contradictions */}
      {analysis.contradictions_detected.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contradictions Detected</h2>
          <div className="space-y-4">
            {analysis.contradictions_detected.map((contradiction, idx) => (
              <div key={idx} className="p-4 border rounded">
                <div className="font-semibold mb-2">
                  Founders: {contradiction.founders_involved.join(', ')}
                </div>
                <div className="mb-2">{contradiction.issue}</div>
                <div className="text-sm text-gray-600">Evidence: {contradiction.evidence}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Interventions */}
      {analysis.suggested_interventions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Suggested Interventions</h2>
          <ul className="list-disc list-inside space-y-2">
            {analysis.suggested_interventions.map((intervention, idx) => (
              <li key={idx} className="p-2 border rounded">
                {intervention}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Additional Details */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Leadership Centralization Risk</h3>
          <div className="p-4 border rounded">
            <div className="mb-2">
              Score: {analysis.leadership_centralization_risk?.score ?? 'N/A'}/100
            </div>
            <ul className="list-disc list-inside">
              {analysis.leadership_centralization_risk?.concerns?.map((concern, idx) => (
                <li key={idx}>{concern}</li>
              )) ?? <li>No concerns identified</li>}
            </ul>
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4">Conflict Productivity Assessment</h3>
          <div className="p-4 border rounded">
            <div className="mb-2">Score: {analysis.conflict_productivity_assessment?.score ?? 'N/A'}/100</div>
            <ul className="list-disc list-inside">
              {analysis.conflict_productivity_assessment?.patterns?.map((pattern, idx) => (
                <li key={idx}>{pattern}</li>
              )) ?? <li>No patterns identified</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
