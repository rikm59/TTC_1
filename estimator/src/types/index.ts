export type ProjectType =
  | 'paint'
  | 'cabinets'
  | 'fencing'
  | 'remodeling'
  | 'framing-drywall'
  | 'outdoor-patio'
  | 'concrete'
  | 'windows'
  | 'flooring'
  | 'landscaping'
  | 'sprinklers'
  | 'roofing'
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'tile'
  | 'insulation'
  | 'gutters'
  | 'pool'
  | 'pool-tile'
  | 'house-cleaning'

export type ContractorTier = 'contractor' | 'subcontractor' | 'labor-only'

export interface ProjectSubType {
  id: string
  label: string
  measurements: MeasurementField[]
  defaultMaterials: DefaultMaterial[]
  defaultLabor: DefaultLabor[]
  defaultOverhead: DefaultOverhead[]
}

export interface MeasurementField {
  id: string
  label: string
  unit: string
  placeholder?: string
  required: boolean
}

export interface DefaultMaterial {
  name: string
  category: string
  unit: string
  baseUnitCost: number
  quantityFormula: string // JS expression using measurement variables
  notes?: string
}

export interface DefaultLabor {
  description: string
  workers: number
  hoursFormula: string // JS expression using measurement variables
  ratePerHour: number
}

export interface DefaultOverhead {
  description: string
  costFormula: string // JS expression using measurement variables
}

export interface ProjectTypeConfig {
  id: ProjectType
  label: string
  icon: string
  subTypes: ProjectSubType[]
}

export interface ClientInfo {
  name: string
  company: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

export interface Measurement {
  id: string
  label: string
  value: number
  unit: string
}

export interface MaterialItem {
  id: string
  category: string
  name: string
  quantity: number
  unit: string
  unitCost: number
  markup: number
  notes: string
  wastePct?: number
}

export interface LaborItem {
  id: string
  description: string
  workers: number
  hours: number
  ratePerHour: number
  notes: string
}

export interface OverheadItem {
  id: string
  description: string
  cost: number
}

export interface SubcontractorItem {
  id: string
  name: string
  trade: string
  cost: number
}

export interface CompanySettings {
  companyName: string
  ownerName: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  website: string
  license: string
  insurance: string
  logoUrl: string
  defaultMaterialMarkup: number
  defaultMarginMin: number
  defaultMarginMid: number
  defaultMarginMax: number
  defaultPaymentTerms: string
  defaultWarranty: string
  defaultValidityDays: number
  taxRate: number
  currency: string
}

export interface EstimateSettings {
  materialMarkupPercent: number
  marginMin: number
  marginMid: number
  marginMax: number
  includeTax: boolean
  taxRate: number
  selectedTier: 'conservative' | 'standard' | 'premium' | 'custom'
  customQuote?: number
  paymentTerms: string
  warranty: string
  validityDays: number
  contractorTier: ContractorTier
  locationZip: string
  locationLabel: string
  materialLocationMultiplier: number
  laborLocationMultiplier: number
  estimateDate: string
  projectStartDate: string
  projectEndDate: string
  discountType: 'none' | 'percent' | 'flat'
  discountValue: number
}

export interface PaymentMilestone {
  id: string
  label: string
  percent: number
  dueOn: string
  paid?: boolean
  paidAt?: string
  paidMethod?: string
}

export interface ActualMaterialItem {
  id: string
  name: string
  actualCost: number
}

export interface ActualLaborItem {
  id: string
  description: string
  actualHours: number
}

export interface JobActuals {
  materialActuals: ActualMaterialItem[]
  laborActuals: ActualLaborItem[]
  completedDate?: string
  notes?: string
}

export interface Estimate {
  id: string
  estimateNumber: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  type: 'estimate' | 'invoice'
  projectType: ProjectType | ''
  projectSubType: string
  crmClientId?: string
  client: ClientInfo
  projectDescription: string
  jobAddress: string
  measurements: Measurement[]
  materials: MaterialItem[]
  labor: LaborItem[]
  overhead: OverheadItem[]
  subcontractors: SubcontractorItem[]
  settings: EstimateSettings
  scopeOfWork: string
  exclusions: string
  internalNotes: string
  coverLetter: string
  milestones: PaymentMilestone[]
  photos: string[]
  actuals?: JobActuals
  shareUrl?: string
}

export interface CalculatedTotals {
  materialsCost: number
  materialsWithMarkup: number
  laborCost: number
  overheadCost: number
  subcontractorCost: number
  hardCost: number
  discountAmount: number
  taxAmount: number
  conservativeQuote: number
  standardQuote: number
  premiumQuote: number
  conservativeMargin: number
  standardMargin: number
  premiumMargin: number
  conservativeProfit: number
  standardProfit: number
  premiumProfit: number
  selectedQuote: number
  selectedProfit: number
  selectedMargin: number
}

export interface SavedEstimate {
  id: string
  estimateNumber: string
  clientName: string
  projectType: string
  totalQuote: number
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  createdAt: string
  data: Estimate
  internalNote?: string
}

export interface EstimateTemplate {
  id: string
  name: string
  projectType: string
  projectSubType: string
  materials: MaterialItem[]
  labor: LaborItem[]
  overhead: OverheadItem[]
  scopeOfWork: string
  exclusions: string
  createdAt: string
}

export interface PriceEntry {
  id: string
  name: string
  unit: string
  cost: number
  lastUpdated: string
  source: string
}

export interface PriceBookItem {
  id: string
  type: 'material' | 'labor'
  name: string
  category: string
  unit: string
  cost: number          // unitCost for material, ratePerHour for labor
  defaultMarkup: number // materials only; ignored for labor
  lastUpdated: string
}
