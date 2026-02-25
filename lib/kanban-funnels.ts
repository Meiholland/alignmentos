/**
 * Maps Pipedrive stages into 3 merged funnel columns for the dashboard Kanban.
 * We do not change anything in Pipedrive; this is display-only grouping.
 *
 * Funnel 1: Prospect up to Initial Assessment
 * Funnel 2: Full Assessment to Termsheet
 * Funnel 3: DD, Signing and Legal
 */

export interface StageForFunnel {
  id: number
  name: string
  order_nr: number
}

export type FunnelKey = 1 | 2 | 3

export const FUNNEL_LABELS: Record<FunnelKey, string> = {
  1: 'Prospect → Initial Assessment',
  2: 'Full Assessment → Termsheet',
  3: 'DD, Signing & Legal',
}

/**
 * Find funnel boundaries from Pipedrive stages (sorted by order_nr ascending).
 * Uses stage name matching (case-insensitive) to identify boundaries.
 */
function getFunnelBoundaries(stages: StageForFunnel[]) {
  const sorted = [...stages].sort((a, b) => a.order_nr - b.order_nr)
  const lower = (s: string) => s.toLowerCase()

  let funnel1MaxOrder = -1
  let funnel2MinOrder = -1
  let funnel2MaxOrder = -1

  for (const stage of sorted) {
    const name = lower(stage.name)
    if (name.includes('initial assessment')) {
      funnel1MaxOrder = Math.max(funnel1MaxOrder, stage.order_nr)
    }
    if (name.includes('full assessment')) {
      if (funnel2MinOrder === -1) funnel2MinOrder = stage.order_nr
      funnel2MinOrder = Math.min(funnel2MinOrder, stage.order_nr)
    }
    if (name.includes('termsheet') || name.includes('term sheet')) {
      funnel2MaxOrder = Math.max(funnel2MaxOrder, stage.order_nr)
    }
  }

  // If we didn't find "termsheet", treat the last stage before DD/Signing/Legal as end of funnel 2
  if (funnel2MaxOrder === -1 && funnel2MinOrder !== -1) {
    const ddOrLater = sorted.find(s => {
      const n = lower(s.name)
      return n.includes('dd') || n.includes('signing') || n.includes('legal')
    })
    funnel2MaxOrder = ddOrLater ? ddOrLater.order_nr - 1 : sorted[sorted.length - 1]?.order_nr ?? 999
  }

  return { funnel1MaxOrder, funnel2MinOrder, funnel2MaxOrder }
}

/**
 * Return which funnel (1, 2, or 3) a stage belongs to based on its order_nr and the pipeline's stages.
 * Returns 1 for "no stage" or unknown (e.g. manual startups).
 */
export function getFunnelForStage(
  stageOrder: number | null | undefined,
  stageName: string | null | undefined,
  allStages: StageForFunnel[]
): FunnelKey {
  if (allStages.length === 0) return 1

  const { funnel1MaxOrder, funnel2MinOrder, funnel2MaxOrder } = getFunnelBoundaries(allStages)

  // If we have stage name, we can also match by name for funnel 3 (DD, Signing, Legal)
  const name = (stageName || '').toLowerCase()
  if (name.includes('dd') || name.includes('signing') || name.includes('legal')) {
    return 3
  }

  const order = stageOrder ?? -1

  if (funnel1MaxOrder >= 0 && order <= funnel1MaxOrder) return 1
  if (funnel2MinOrder >= 0 && funnel2MaxOrder >= 0 && order >= funnel2MinOrder && order <= funnel2MaxOrder) return 2
  if (funnel2MaxOrder >= 0 && order > funnel2MaxOrder) return 3
  if (funnel2MinOrder >= 0 && order >= funnel2MinOrder) return 2

  // No boundaries found or stage not in range: default to funnel 1 (e.g. manual startups)
  return 1
}
