import type { Estimate, CalculatedTotals } from '../types'

export function calcTotals(estimate: Estimate): CalculatedTotals {
  const { materials, labor, overhead, settings } = estimate

  const materialsCost = materials.reduce(
    (sum, m) => sum + m.quantity * m.unitCost,
    0
  )

  const materialsWithMarkup = materials.reduce(
    (sum, m) => sum + m.quantity * m.unitCost * (1 + m.markup / 100),
    0
  )

  const laborCost = labor.reduce(
    (sum, l) => sum + l.workers * l.hours * l.ratePerHour,
    0
  )

  const overheadCost = overhead.reduce((sum, o) => sum + o.cost, 0)

  const hardCost = materialsCost + laborCost + overheadCost

  const { marginMin, marginMid, marginMax, includeTax, taxRate } = settings

  // Quote = hardCost / (1 - margin)
  const conservativeQuote = marginMin < 100 ? hardCost / (1 - marginMin / 100) : hardCost * 2
  const standardQuote = marginMid < 100 ? hardCost / (1 - marginMid / 100) : hardCost * 2.5
  const premiumQuote = marginMax < 100 ? hardCost / (1 - marginMax / 100) : hardCost * 3

  const calcMargin = (quote: number) =>
    quote > 0 ? ((quote - hardCost) / quote) * 100 : 0

  const conservativeMargin = calcMargin(conservativeQuote)
  const standardMargin = calcMargin(standardQuote)
  const premiumMargin = calcMargin(premiumQuote)

  const conservativeProfit = conservativeQuote - hardCost
  const standardProfit = standardQuote - hardCost
  const premiumProfit = premiumQuote - hardCost

  const tierMap = {
    conservative: { quote: conservativeQuote, profit: conservativeProfit, margin: conservativeMargin },
    standard: { quote: standardQuote, profit: standardProfit, margin: standardMargin },
    premium: { quote: premiumQuote, profit: premiumProfit, margin: premiumMargin },
  }

  const selected = tierMap[settings.selectedTier]

  const taxAmount = includeTax ? selected.quote * (taxRate / 100) : 0

  return {
    materialsCost,
    materialsWithMarkup,
    laborCost,
    overheadCost,
    hardCost,
    taxAmount,
    conservativeQuote,
    standardQuote,
    premiumQuote,
    conservativeMargin,
    standardMargin,
    premiumMargin,
    conservativeProfit,
    standardProfit,
    premiumProfit,
    selectedQuote: selected.quote,
    selectedProfit: selected.profit,
    selectedMargin: selected.margin,
  }
}

export function evalFormula(formula: string, vars: Record<string, number>): number {
  try {
    const args = Object.keys(vars)
    const vals = Object.values(vars)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...args, `return (${formula})`)
    const result = fn(...vals)
    return typeof result === 'number' && isFinite(result) ? Math.max(0, result) : 0
  } catch {
    return 0
  }
}

export function fmt(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

export function generateEstimateNumber(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 900) + 100
  return `EST-${y}${m}${d}-${rand}`
}
