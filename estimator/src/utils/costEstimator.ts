import type { RefEntry } from '../data/referencePrices'
import { REF_MATERIALS, REF_LABOR, REF_OVERHEAD, REF_SUBCONTRACTOR } from '../data/referencePrices'

export interface CostEstimate {
  low: number
  mid: number
  high: number
  unit: string
  keyword: string
  note?: string
}

function score(desc: string, entry: RefEntry): number {
  const d = desc.toLowerCase()
  let hits = 0
  for (const kw of entry.kw) {
    if (d.includes(kw.toLowerCase())) hits++
  }
  return hits
}

function best(desc: string, entries: RefEntry[]): CostEstimate | null {
  if (!desc.trim()) return null
  let top: (RefEntry & { score: number }) | null = null
  for (const e of entries) {
    const s = score(desc, e)
    if (s > 0 && (!top || s > top.score)) top = { ...e, score: s }
  }
  if (!top) return null
  return { low: top.low, mid: top.mid, high: top.high, unit: top.unit, keyword: top.kw[0], note: top.note }
}

export function estimateMaterialCost(name: string): CostEstimate | null {
  return best(name, REF_MATERIALS)
}

export function estimateLaborRate(description: string): CostEstimate | null {
  return best(description, REF_LABOR)
}

export function estimateOverheadCost(description: string): CostEstimate | null {
  return best(description, REF_OVERHEAD)
}

export function estimateSubcontractorCost(trade: string, name?: string): CostEstimate | null {
  const combined = [trade, name].filter(Boolean).join(' ')
  return best(combined, REF_SUBCONTRACTOR)
}

export function fmt2(n: number): string {
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 10) return '$' + n.toFixed(0)
  return '$' + n.toFixed(2)
}
