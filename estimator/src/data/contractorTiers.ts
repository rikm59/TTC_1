import type { ContractorTier } from '../types'

export interface TierConfig {
  id: ContractorTier
  label: string
  icon: string
  color: 'blue' | 'amber' | 'green'
  tagline: string
  description: string
  bullets: string[]
  defaultMaterialMarkup: number
  defaultMarginMin: number
  defaultMarginMid: number
  defaultMarginMax: number
  defaultPaymentTerms: string
  clientQuoteNote: string
  autoOverhead: Array<{ description: string }>
}

export const CONTRACTOR_TIERS: TierConfig[] = [
  {
    id: 'contractor',
    label: 'Contractor',
    icon: '🏗️',
    color: 'blue',
    tagline: 'General Contractor — Full Bid',
    description: 'You are the primary contractor. You manage all subcontractors, carry full liability, and are responsible for the complete scope.',
    bullets: [
      'Full materials + labor + overhead',
      'GC supervision & project management costs',
      'General liability insurance & bond included',
      'Highest margins reflect full accountability',
    ],
    defaultMaterialMarkup: 30,
    defaultMarginMin: 55,
    defaultMarginMid: 62,
    defaultMarginMax: 68,
    defaultPaymentTerms: '50% deposit required to schedule. Balance due upon project completion.',
    clientQuoteNote: 'Includes all materials, labor, project management, permits, and general contractor overhead.',
    autoOverhead: [
      { description: '🏗️ GC Project Management & Supervision' },
      { description: '🔒 General Liability Insurance & Bond' },
    ],
  },
  {
    id: 'subcontractor',
    label: 'Sub-Contractor',
    icon: '🔧',
    color: 'amber',
    tagline: 'Sub-Contractor — Working Under a GC',
    description: 'You are bidding to a General Contractor who will add their own markup on top. Price lower than retail GC rates — the GC absorbs supervision, bond, and client-facing overhead.',
    bullets: [
      'Full materials + labor for your scope only',
      'Reduced markup — GC adds their margin',
      'Sub liability insurance allocated',
      'Net-30 terms to GC standard',
    ],
    defaultMaterialMarkup: 15,
    defaultMarginMin: 42,
    defaultMarginMid: 48,
    defaultMarginMax: 54,
    defaultPaymentTerms: 'Net 30 from invoice date to General Contractor.',
    clientQuoteNote: 'Sub-contractor bid. Materials and labor as specified per scope.',
    autoOverhead: [
      { description: '🔒 Sub-Contractor Liability Insurance Allocation' },
    ],
  },
  {
    id: 'labor-only',
    label: 'Labor Only',
    icon: '👷',
    color: 'green',
    tagline: 'Labor Only — Client/GC Supplies Materials',
    description: 'You are bidding labor only. All materials are provided by the client or GC. Your quote covers labor, tools, and direct job costs — not materials.',
    bullets: [
      'Labor and direct job costs only',
      'No material markup (materials not in scope)',
      'Client or GC provides all materials',
      'Lowest price point — pure labor value',
    ],
    defaultMaterialMarkup: 0,
    defaultMarginMin: 35,
    defaultMarginMid: 40,
    defaultMarginMax: 45,
    defaultPaymentTerms: 'Net 15 upon completion of work.',
    clientQuoteNote: 'Labor only. All materials supplied by client. Quote covers labor, tools, and direct job costs only.',
    autoOverhead: [
      { description: '📋 Labor Only — Materials supplied by client/GC (reference only, not billed)' },
    ],
  },
]

export const getTierConfig = (tier: ContractorTier): TierConfig =>
  CONTRACTOR_TIERS.find(t => t.id === tier) ?? CONTRACTOR_TIERS[0]
