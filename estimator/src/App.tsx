import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format, addDays, differenceInDays } from 'date-fns'
import { useAuth } from './context/AuthContext'
import { useLanguage } from './context/LanguageContext'
import { supabase, SUPABASE_URL } from './lib/supabase'
import type {
  Estimate, CompanySettings, MaterialItem, LaborItem, OverheadItem, SubcontractorItem,
  Measurement, SavedEstimate, ContractorTier, EstimateTemplate, PriceBookItem, ProjectType,
} from './types'
import type { Client } from './lib/supabase'
import { calcTotals, generateEstimateNumber, evalFormula, fmt, fmtPct } from './utils/calculations'
import { generatePDF } from './utils/pdfExport'
import { generateWord } from './utils/wordExport'
import { PROJECT_TYPES, getSubTypeById } from './data/projectTypes'
import { lookupLocation } from './data/locationMultipliers'
import { CONTRACTOR_TIERS, getTierConfig } from './data/contractorTiers'
import { UPGRADE_PLANS } from './data/plans'
import TierSelector from './components/TierSelector'
import Header from './components/Header'
import ClientInfoForm from './components/form/ClientInfoForm'
import ProjectTypeSelector from './components/form/ProjectTypeSelector'
import MeasurementsForm from './components/form/MeasurementsForm'
import ProjectPhotos from './components/form/ProjectPhotos'
import MaterialsTable from './components/form/MaterialsTable'
import LaborTable from './components/form/LaborTable'
import OverheadTable from './components/form/OverheadTable'
import SubcontractorTable from './components/form/SubcontractorTable'
import ContractorResults from './components/results/ContractorResults'
import JobCostingPanel from './components/results/JobCostingPanel'
import ClientQuote from './components/results/ClientQuote'
import ExportBar from './components/results/ExportBar'
import SettingsModal from './components/modals/SettingsModal'
import SavedEstimatesList from './components/modals/SavedEstimatesList'
import ScopeNotes from './components/form/ScopeNotes'
import MilestoneEditor from './components/form/MilestoneEditor'
import EstimateLangModal from './components/modals/EstimateLangModal'
import ChangeOrderModal from './components/modals/ChangeOrderModal'
import TemplatesModal from './components/modals/TemplatesModal'
import PriceBookModal from './components/modals/PriceBookModal'
import QuickPaymentModal from './components/modals/QuickPaymentModal'
import LaborRateModal from './components/modals/LaborRateModal'

const DEFAULT_COMPANY: CompanySettings = {
  companyName: 'Your Company Name',
  ownerName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  email: '',
  website: '',
  license: '',
  insurance: '',
  logoUrl: '',
  defaultMaterialMarkup: 10,
  defaultMarginMin: 15,
  defaultMarginMid: 30,
  defaultMarginMax: 45,
  defaultPaymentTerms: '50% deposit required to schedule. Balance due upon project completion.',
  defaultWarranty: '1-year warranty on all labor. Manufacturer warranty applies to materials.',
  defaultValidityDays: 30,
  taxRate: 0,
  currency: 'USD',
}

function newEstimate(company: CompanySettings): Estimate {
  return {
    id: uuidv4(),
    estimateNumber: generateEstimateNumber(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    type: 'estimate',
    projectType: '',
    projectSubType: '',
    client: { name: '', company: '', address: '', city: '', state: '', zip: '', phone: '', email: '' },
    projectDescription: '',
    jobAddress: '',
    measurements: [],
    materials: [],
    labor: [],
    overhead: [],
    subcontractors: [],
    settings: {
      materialMarkupPercent: company.defaultMaterialMarkup,
      marginMin: company.defaultMarginMin,
      marginMid: company.defaultMarginMid,
      marginMax: company.defaultMarginMax,
      includeTax: company.taxRate > 0,
      taxRate: company.taxRate,
      selectedTier: 'standard',
      paymentTerms: company.defaultPaymentTerms,
      warranty: company.defaultWarranty,
      validityDays: company.defaultValidityDays,
      contractorTier: 'contractor',
      locationZip: '',
      locationLabel: '',
      materialLocationMultiplier: 1.0,
      laborLocationMultiplier: 1.0,
      estimateDate: new Date().toISOString().split('T')[0],
      projectStartDate: '',
      projectEndDate: '',
      discountType: 'none',
      discountValue: 0,
    },
    scopeOfWork: '',
    exclusions: '',
    internalNotes: '',
    coverLetter: '',
    milestones: [],
    photos: [],
  }
}

export default function App() {
  const { profile, user } = useAuth()
  const { t, lang } = useLanguage()
  const [showLaborOnlyMaterials, setShowLaborOnlyMaterials] = useState(false)

  const allowedTiers = useMemo((): ContractorTier[] => {
    const at = profile?.account_type ?? 'contractor'
    if (at === 'subcontractor') return ['subcontractor', 'labor-only']
    if (at === 'labor-only') return ['labor-only']
    return ['contractor', 'subcontractor', 'labor-only']
  }, [profile?.account_type])

  const startCheckout = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else console.error('[checkout]', error)
    } catch (err) {
      console.error('[checkout]', err)
    }
  }, [])

  const openBillingPortal = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else console.error('[portal]', error)
    } catch (err) {
      console.error('[portal]', err)
    }
  }, [])

  const [bannerDismissed, setBannerDismissed] = useState(() =>
    sessionStorage.getItem('trial_banner_dismissed') === '1'
  )
  const dismissBanner = () => {
    sessionStorage.setItem('trial_banner_dismissed', '1')
    setBannerDismissed(true)
  }

  const TrialBanner = () => {
    if (!profile || bannerDismissed) return null
    const status = profile.subscription_status
    const hasSub = !!profile.stripe_subscription_id

    if (status === 'active' || status === 'trialing' && hasSub) {
      if (status !== 'trialing') return null
      const daysLeft = profile.trial_expires_at
        ? Math.max(0, Math.ceil((new Date(profile.trial_expires_at).getTime() - Date.now()) / 86_400_000))
        : null
      if (daysLeft === null || daysLeft > 3) return null
      return (
        <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-amber-800 font-medium">
            {lang === 'es'
              ? `⏳ ${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''} en su prueba gratuita.`
              : `⏳ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial.`}
          </span>
          <div className="flex gap-2 shrink-0">
            <button onClick={startCheckout} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg font-semibold transition-colors">
              {lang === 'es' ? 'Suscribirse' : 'Subscribe'}
            </button>
            <button onClick={dismissBanner} className="text-amber-500 hover:text-amber-700">✕</button>
          </div>
        </div>
      )
    }

    if (status === 'past_due') {
      return (
        <div className="no-print bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-red-700 font-medium">
            {lang === 'es' ? '⚠️ Pago fallido — actualice su método de pago para continuar.' : '⚠️ Payment failed — update your payment method to keep access.'}
          </span>
          <button onClick={startCheckout} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-semibold transition-colors shrink-0">
            {lang === 'es' ? 'Actualizar pago' : 'Update payment'}
          </button>
        </div>
      )
    }

    if (status === 'canceled') {
      return (
        <div className="no-print bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-gray-700 font-medium">
            {lang === 'es' ? 'Su suscripción ha terminado.' : 'Your subscription has ended.'}
          </span>
          <button onClick={startCheckout} className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1 rounded-lg font-semibold transition-colors shrink-0">
            {lang === 'es' ? 'Reactivar' : 'Resubscribe'}
          </button>
        </div>
      )
    }

    if (!hasSub) {
      return (
        <div className="no-print bg-brand-50 border-b border-brand-200 px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-brand-800 font-medium">
            {lang === 'es'
              ? '🎉 Bienvenido — comience su prueba gratuita de 14 días para acceso completo.'
              : '🎉 Welcome — start your 14-day free trial for full access.'}
          </span>
          <div className="flex gap-2 shrink-0">
            <button onClick={startCheckout} className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1 rounded-lg font-semibold transition-colors">
              {lang === 'es' ? 'Comenzar prueba' : 'Start free trial'}
            </button>
            <button onClick={dismissBanner} className="text-brand-400 hover:text-brand-600">✕</button>
          </div>
        </div>
      )
    }

    return null
  }

  const [company, setCompany] = useState<CompanySettings>(() => {
    try {
      const loaded = JSON.parse(localStorage.getItem('ttc_company') || 'null')
      if (!loaded) return DEFAULT_COMPANY
      // Migrate: reset margins if they were set under the old high-margin defaults
      if ((loaded.defaultMarginMax ?? 0) > 45) {
        return { ...loaded, defaultMaterialMarkup: 10, defaultMarginMin: 15, defaultMarginMid: 30, defaultMarginMax: 45 }
      }
      return loaded
    } catch { return DEFAULT_COMPANY }
  })

  useEffect(() => {
    if (!profile) return
    const fromProfile: Partial<CompanySettings> = {
      companyName: profile.company_name ?? company.companyName,
      ownerName: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || company.ownerName,
      address: profile.business_address ?? company.address,
      city: profile.business_city ?? company.city,
      state: profile.business_state ?? company.state,
      zip: profile.business_zip ?? company.zip,
      phone: profile.business_phone ?? company.phone,
      email: profile.business_email ?? company.email,
      logoUrl: profile.business_logo_url ?? company.logoUrl,
      website: profile.website ?? company.website,
      license: profile.license_number ?? company.license,
      insurance: profile.insurance ?? company.insurance,
    }
    const merged = { ...company, ...fromProfile }
    setCompany(merged)
    localStorage.setItem('ttc_company', JSON.stringify(merged))
  }, [profile?.id])

  const [estimate, setEstimate] = useState<Estimate>(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('ttc_draft_estimate') || 'null')
      // Merge with a fresh estimate so any new fields added later are present
      if (draft?.id) return { ...newEstimate(company), ...draft }
    } catch { /* corrupt storage — fall through */ }
    return newEstimate(company)
  })
  const [activeView, setActiveView] = useState<'contractor' | 'client'>('contractor')
  const [showSettings, setShowSettings] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [pendingExport, setPendingExport] = useState<'pdf' | 'word' | 'print' | 'email' | null>(null)
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>(() => {
    try { return JSON.parse(localStorage.getItem('ttc_estimates') || '[]') }
    catch { return [] }
  })
  const [sections, setSections] = useState<Record<string, boolean>>({
    client: true, project: true, timeline: true, measurements: true,
    photos: false, materials: true, labor: true, overhead: true, subcontractors: false, scope: false,
  })
  const [crmClients, setCrmClients] = useState<Client[]>([])
  const [crmSaved, setCrmSaved] = useState(false)
  // Tracks whether client fields were mutated by the user (not just restored from localStorage)
  const clientEditedRef = useRef(false)

  const totals = useMemo(() => calcTotals(estimate), [estimate])

  const readinessHints = useMemo(() => {
    const hints: { key: string; en: string; es: string }[] = []
    if (!estimate.client.name) hints.push({ key: 'name', en: 'Add client name', es: 'Agrega el nombre del cliente' })
    if (!estimate.client.email) hints.push({ key: 'email', en: 'Add client email to send', es: 'Agrega email del cliente para enviar' })
    if (!estimate.projectType) hints.push({ key: 'type', en: 'Select a project type', es: 'Selecciona tipo de proyecto' })
    if (estimate.materials.length === 0 && estimate.labor.length === 0) hints.push({ key: 'items', en: 'Add materials or labor', es: 'Agrega materiales o mano de obra' })
    const mTotal = (estimate.milestones ?? []).reduce((s, m) => s + m.percent, 0)
    if ((estimate.milestones ?? []).length > 0 && Math.abs(mTotal - 100) >= 0.5) hints.push({ key: 'milestones', en: `Milestones = ${mTotal}% (need 100%)`, es: `Pagos = ${mTotal}% (necesitan 100%)` })
    if (totals.selectedQuote > 0 && totals.selectedMargin < estimate.settings.marginMin) {
      hints.push({ key: 'margin', en: `Margin ${totals.selectedMargin.toFixed(1)}% below target ${estimate.settings.marginMin}%`, es: `Margen ${totals.selectedMargin.toFixed(1)}% por debajo de la meta ${estimate.settings.marginMin}%` })
    }
    return hints
  }, [estimate.client.name, estimate.client.email, estimate.projectType, estimate.materials.length, estimate.labor.length, estimate.milestones, totals.selectedQuote, totals.selectedMargin, estimate.settings.marginMin])

  // Load CRM clients once when the user is available
  useEffect(() => {
    if (!user) return
    supabase.from('clients').select('*').eq('user_id', user.id).order('name')
      .then(({ data }) => { if (data) setCrmClients(data as Client[]) })
  }, [user?.id])

  // Debounced CRM sync — write client info to Supabase whenever it changes.
  // Skips the initial render when data is restored from localStorage.
  useEffect(() => {
    if (!user || !estimate.client.name.trim() || !clientEditedRef.current) return
    setCrmSaved(false)
    const timer = setTimeout(async () => {
      const payload = {
        user_id: user.id,
        name: estimate.client.name.trim(),
        company: estimate.client.company || null,
        email: estimate.client.email || null,
        phone: estimate.client.phone || null,
        address: estimate.client.address || null,
        city: estimate.client.city || null,
        state: estimate.client.state || null,
        zip: estimate.client.zip || null,
      }
      let crmId = estimate.crmClientId
      if (!crmId) {
        const match = crmClients.find(
          c => c.name.toLowerCase() === estimate.client.name.trim().toLowerCase()
        )
        crmId = match?.id
      }
      if (crmId) {
        await supabase.from('clients').update(payload).eq('id', crmId)
        setEstimate(e => ({ ...e, crmClientId: crmId }))
      } else {
        const { data: inserted } = await supabase.from('clients').insert({ ...payload, status: 'prospect' }).select().single()
        if (inserted) {
          setEstimate(e => ({ ...e, crmClientId: (inserted as Client).id }))
          setCrmClients(prev => [inserted as Client, ...prev])
        }
      }
      setCrmSaved(true)
      setTimeout(() => setCrmSaved(false), 3000)
    }, 1500)
    return () => clearTimeout(timer)
  }, [estimate.client, user?.id])

  const saveCompany = async (c: CompanySettings): Promise<void> => {
    setCompany(c)
    localStorage.setItem('ttc_company', JSON.stringify(c))
    if (profile?.id) {
      const { error } = await supabase.from('profiles').update({
        company_name: c.companyName,
        business_address: c.address,
        business_city: c.city,
        business_state: c.state,
        business_zip: c.zip,
        business_phone: c.phone,
        business_email: c.email,
        business_logo_url: c.logoUrl,
        website: c.website,
        license_number: c.license,
        insurance: c.insurance,
      }).eq('id', profile.id)
      if (error) throw error
    }
  }

  const isFreePlan = !profile?.plan || profile.plan === 'free'
  const trialExpiresAt = profile?.trial_expires_at ? new Date(profile.trial_expires_at) : null
  const trialExpired = isFreePlan && trialExpiresAt !== null && trialExpiresAt <= new Date()
  const trialDaysLeft = isFreePlan && trialExpiresAt && !trialExpired
    ? Math.ceil((trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const FREE_TRIAL_ESTIMATE_LIMIT = 3
  const freeTrialLimitReached = isFreePlan && !trialExpired && savedEstimates.length >= FREE_TRIAL_ESTIMATE_LIMIT

  const saveCurrentEstimate = useCallback(async () => {
    const now = new Date().toISOString()
    const saved: SavedEstimate = {
      id: estimate.id,
      estimateNumber: estimate.estimateNumber,
      clientName: estimate.client.name || 'Unnamed Client',
      projectType: estimate.projectType,
      totalQuote: totals.selectedQuote,
      status: estimate.status,
      createdAt: estimate.createdAt,
      data: { ...estimate, updatedAt: now },
    }
    setSavedEstimates(prev => {
      const filtered = prev.filter(s => s.id !== estimate.id)
      if (trialExpired) return prev
      // Block adding a brand-new estimate slot beyond the free trial limit
      const isNewEstimate = !prev.some(s => s.id === estimate.id)
      if (isFreePlan && isNewEstimate && filtered.length >= FREE_TRIAL_ESTIMATE_LIMIT) return prev
      const updated = [saved, ...filtered].slice(0, 50)
      localStorage.setItem('ttc_estimates', JSON.stringify(updated))
      return updated
    })
    // Sync to Supabase so the CRM Docs tab can see this estimate
    if (user && estimate.crmClientId) {
      const VALID_STATUSES = ['draft', 'sent', 'accepted', 'declined'] as const
      type DbStatus = typeof VALID_STATUSES[number]
      const status: DbStatus = (VALID_STATUSES as readonly string[]).includes(estimate.status)
        ? estimate.status as DbStatus
        : 'draft'
      await supabase.from('estimates').upsert({
        id: estimate.id,
        user_id: user.id,
        client_id: estimate.crmClientId,
        estimate_number: estimate.estimateNumber,
        project_type: estimate.projectType,
        status,
        total_quote: totals.selectedQuote,
        data: { ...estimate, updatedAt: now } as Record<string, unknown>,
      }, { onConflict: 'id' })
    }
  }, [estimate, totals.selectedQuote, trialExpired, isFreePlan, user])

  const loadEstimate = (saved: SavedEstimate) => {
    setEstimate({ ...saved.data, subcontractors: saved.data.subcontractors ?? [] })
    setShowSaved(false)
  }

  const duplicateEstimate = (saved: SavedEstimate) => {
    saveCurrentEstimate()
    const now = new Date().toISOString()
    const copy: Estimate = {
      ...saved.data,
      id: uuidv4(),
      estimateNumber: generateEstimateNumber(),
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      crmClientId: undefined,
      subcontractors: saved.data.subcontractors ?? [],
    }
    localStorage.setItem('ttc_draft_estimate', JSON.stringify(copy))
    setEstimate(copy)
    setShowSaved(false)
  }

  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false)

  const startNewEstimate = () => {
    if (trialExpired || freeTrialLimitReached) {
      setShowUpgradeNudge(true)
      return
    }
    saveCurrentEstimate()
    const fresh = newEstimate(company)
    localStorage.setItem('ttc_draft_estimate', JSON.stringify(fresh))
    setEstimate(fresh)
  }

  const toggle = (key: string) =>
    setSections(s => ({ ...s, [key]: !s[key] }))

  const updateClient = (field: string, value: string) => {
    clientEditedRef.current = true
    setEstimate(e => ({ ...e, client: { ...e.client, [field]: value } }))
  }

  const handleSelectCRMClient = (crm: Client) => {
    clientEditedRef.current = true
    setEstimate(e => ({
      ...e,
      crmClientId: crm.id,
      client: {
        name: crm.name,
        company: crm.company ?? '',
        email: crm.email ?? '',
        phone: crm.phone ?? '',
        address: crm.address ?? '',
        city: crm.city ?? '',
        state: crm.state ?? '',
        zip: crm.zip ?? '',
      },
    }))
  }

  const clearClientInfo = () => {
    clientEditedRef.current = true
    setEstimate(e => ({
      ...e,
      crmClientId: undefined,
      client: { name: '', company: '', email: '', phone: '', address: '', city: '', state: '', zip: '' },
    }))
    setCrmSaved(false)
  }

  const setProjectType = (typeId: string) => {
    setEstimate(e => ({ ...e, projectType: typeId as ProjectType, projectSubType: '', measurements: [], materials: [], labor: [], overhead: [], subcontractors: [] }))
  }

  const setProjectSubType = (subTypeId: string) => {
    setEstimate(e => {
      const sub = getSubTypeById(e.projectType, subTypeId)
      if (!sub) return { ...e, projectSubType: subTypeId }

      const measurements: Measurement[] = sub.measurements.map(m => ({
        id: m.id, label: m.label, value: 0, unit: m.unit,
      }))

      return { ...e, projectSubType: subTypeId, measurements, materials: [], labor: [], overhead: [], subcontractors: [] }
    })
  }

  const autoPopulate = useCallback((meas: Measurement[]) => {
    const sub = getSubTypeById(estimate.projectType, estimate.projectSubType)
    if (!sub) return

    const vars: Record<string, number> = {}
    meas.forEach(m => { vars[m.id] = m.value })

    const matMult = estimate.settings.materialLocationMultiplier ?? 1.0
    const labMult = estimate.settings.laborLocationMultiplier ?? 1.0

    const materials: MaterialItem[] = sub.defaultMaterials.map(dm => ({
      id: uuidv4(),
      category: dm.category,
      name: dm.name,
      quantity: Math.max(0, evalFormula(dm.quantityFormula, vars)),
      unit: dm.unit,
      unitCost: +(dm.baseUnitCost * matMult).toFixed(2),
      markup: estimate.settings.materialMarkupPercent,
      notes: dm.notes || '',
    }))

    const labor: LaborItem[] = sub.defaultLabor.map(dl => ({
      id: uuidv4(),
      description: dl.description,
      workers: dl.workers,
      hours: Math.max(0, evalFormula(dl.hoursFormula, vars)),
      ratePerHour: +(dl.ratePerHour * labMult).toFixed(2),
      notes: '',
    }))

    const overhead: OverheadItem[] = sub.defaultOverhead
      .map(do_ => ({
        id: uuidv4(),
        description: do_.description,
        cost: Math.max(0, evalFormula(do_.costFormula, vars)),
      }))
      .filter(o => o.cost > 0)

    // Preserve tier-specific overhead items
    const allTierDescriptions = new Set(
      CONTRACTOR_TIERS.flatMap(t => t.autoOverhead.map(o => o.description))
    )
    const tierOverhead = estimate.overhead.filter(o => allTierDescriptions.has(o.description))

    setEstimate(e => ({ ...e, measurements: meas, materials, labor, overhead: [...overhead, ...tierOverhead] }))
  }, [estimate.projectType, estimate.projectSubType, estimate.settings.materialMarkupPercent, estimate.settings.materialLocationMultiplier, estimate.settings.laborLocationMultiplier, estimate.overhead])

  const updateMeasurement = (id: string, value: number) => {
    const updated = estimate.measurements.map(m => m.id === id ? { ...m, value } : m)
    autoPopulate(updated)
  }

  // Re-run formula calculations for template-matched items without wiping manual additions
  const recalculateMeasures = useCallback(() => {
    const sub = getSubTypeById(estimate.projectType, estimate.projectSubType)
    if (!sub) return
    const vars: Record<string, number> = {}
    estimate.measurements.forEach(m => { vars[m.id] = m.value })
    const matMult = estimate.settings.materialLocationMultiplier ?? 1.0
    const labMult = estimate.settings.laborLocationMultiplier ?? 1.0
    setEstimate(e => ({
      ...e,
      materials: e.materials.map(m => {
        const tpl = sub.defaultMaterials.find(dm => dm.name.toLowerCase() === m.name.toLowerCase())
        if (!tpl) return m
        return { ...m, quantity: Math.max(0, evalFormula(tpl.quantityFormula, vars)), unitCost: +(tpl.baseUnitCost * matMult).toFixed(2) }
      }),
      labor: e.labor.map(l => {
        const tpl = sub.defaultLabor.find(dl => dl.description.toLowerCase() === l.description.toLowerCase())
        if (!tpl) return l
        return { ...l, hours: Math.max(0, evalFormula(tpl.hoursFormula, vars)), ratePerHour: +(tpl.ratePerHour * labMult).toFixed(2) }
      }),
      overhead: e.overhead.map(o => {
        const tpl = sub.defaultOverhead.find(do_ => do_.description.toLowerCase() === o.description.toLowerCase())
        if (!tpl) return o
        return { ...o, cost: Math.max(0, evalFormula(tpl.costFormula, vars)) }
      }),
    }))
  }, [estimate.projectType, estimate.projectSubType, estimate.measurements, estimate.settings.materialLocationMultiplier, estimate.settings.laborLocationMultiplier])

  // Materials
  const addMaterial = () => {
    const item: MaterialItem = { id: uuidv4(), category: 'Other', name: '', quantity: 1, unit: 'each', unitCost: 0, markup: estimate.settings.materialMarkupPercent, notes: '' }
    setEstimate(e => ({ ...e, materials: [...e.materials, item] }))
  }

  const addMaterialFromPriceBook = (data: Omit<MaterialItem, 'id'>) => {
    const item: MaterialItem = { id: uuidv4(), ...data }
    setEstimate(e => ({ ...e, materials: [...e.materials, item] }))
  }

  const addLaborFromPriceBook = (data: Omit<LaborItem, 'id'>) => {
    const item: LaborItem = { id: uuidv4(), ...data }
    setEstimate(e => ({ ...e, labor: [...e.labor, item] }))
  }

  const generateScopeFromItems = useCallback((): string => {
    const ptLabel = estimate.projectType
      ? estimate.projectType.charAt(0).toUpperCase() + estimate.projectType.slice(1).replace(/-/g, ' ')
      : ''
    const lines: string[] = []
    if (ptLabel) lines.push(`Scope of Work — ${ptLabel}`, '')
    if (estimate.materials.filter(m => m.name.trim()).length > 0) {
      lines.push(lang === 'es' ? 'Materiales:' : 'Materials:')
      estimate.materials.filter(m => m.name.trim()).forEach(m => {
        lines.push(`• ${m.quantity} ${m.unit} — ${m.name}`)
      })
      lines.push('')
    }
    if (estimate.labor.filter(l => l.description.trim()).length > 0) {
      lines.push(lang === 'es' ? 'Mano de obra:' : 'Labor:')
      estimate.labor.filter(l => l.description.trim()).forEach(l => {
        const hrs = `${l.workers} ${lang === 'es' ? 'trabajador(es)' : 'worker(s)'} × ${l.hours} hrs`
        lines.push(`• ${l.description} (${hrs})`)
      })
      lines.push('')
    }
    lines.push(lang === 'es'
      ? 'Todo el trabajo se realizará de manera profesional conforme a los estándares de la industria.'
      : 'All work to be completed in a professional and workmanlike manner per industry standards.')
    return lines.join('\n').trim()
  }, [estimate.projectType, estimate.materials, estimate.labor, lang])

  const bulkAddMaterials = (items: Array<{ name: string; quantity: number; unit: string; unitCost: number }>) => {
    const newItems: MaterialItem[] = items.map(item => ({
      id: uuidv4(),
      category: 'Other' as const,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      markup: estimate.settings.materialMarkupPercent,
      wastePct: 0,
      notes: '',
    }))
    setEstimate(e => ({ ...e, materials: [...e.materials, ...newItems] }))
  }
  const updateMaterial = (id: string, field: string, value: string | number) =>
    setEstimate(e => ({ ...e, materials: e.materials.map(m => m.id === id ? { ...m, [field]: value } : m) }))
  const removeMaterial = (id: string) =>
    setEstimate(e => ({ ...e, materials: e.materials.filter(m => m.id !== id) }))

  // Labor
  const addLabor = () => {
    const item: LaborItem = { id: uuidv4(), description: '', workers: 1, hours: 1, ratePerHour: defaultLaborRate, notes: '' }
    setEstimate(e => ({ ...e, labor: [...e.labor, item] }))
  }

  const applyLaborRate = (rate: number) => {
    setDefaultLaborRate(rate)
    setEstimate(e => ({
      ...e,
      labor: e.labor.map(l => ({ ...l, ratePerHour: rate })),
    }))
  }
  const updateLabor = (id: string, field: string, value: string | number) =>
    setEstimate(e => ({ ...e, labor: e.labor.map(l => l.id === id ? { ...l, [field]: value } : l) }))
  const removeLabor = (id: string) =>
    setEstimate(e => ({ ...e, labor: e.labor.filter(l => l.id !== id) }))

  // Overhead
  const addOverhead = () => {
    const item: OverheadItem = { id: uuidv4(), description: '', cost: 0 }
    setEstimate(e => ({ ...e, overhead: [...e.overhead, item] }))
  }
  const updateOverhead = (id: string, field: string, value: string | number) =>
    setEstimate(e => ({ ...e, overhead: e.overhead.map(o => o.id === id ? { ...o, [field]: value } : o) }))
  const removeOverhead = (id: string) =>
    setEstimate(e => ({ ...e, overhead: e.overhead.filter(o => o.id !== id) }))

  // Duplicate line items
  const duplicateMaterial = (id: string) =>
    setEstimate(e => {
      const item = e.materials.find(m => m.id === id)
      return item ? { ...e, materials: [...e.materials, { ...item, id: uuidv4() }] } : e
    })
  const duplicateLabor = (id: string) =>
    setEstimate(e => {
      const item = e.labor.find(l => l.id === id)
      return item ? { ...e, labor: [...e.labor, { ...item, id: uuidv4() }] } : e
    })
  const duplicateOverhead = (id: string) =>
    setEstimate(e => {
      const item = e.overhead.find(o => o.id === id)
      return item ? { ...e, overhead: [...e.overhead, { ...item, id: uuidv4() }] } : e
    })
  const duplicateSubcontractor = (id: string) =>
    setEstimate(e => {
      const item = (e.subcontractors ?? []).find(s => s.id === id)
      return item ? { ...e, subcontractors: [...(e.subcontractors ?? []), { ...item, id: uuidv4() }] } : e
    })

  // Subcontractors
  const addSubcontractor = () => {
    const item: SubcontractorItem = { id: uuidv4(), name: '', trade: '', cost: 0 }
    setEstimate(e => ({ ...e, subcontractors: [...(e.subcontractors ?? []), item] }))
  }
  const updateSubcontractor = (id: string, field: string, value: string | number) =>
    setEstimate(e => ({ ...e, subcontractors: (e.subcontractors ?? []).map(s => s.id === id ? { ...s, [field]: value } : s) }))
  const removeSubcontractor = (id: string) =>
    setEstimate(e => ({ ...e, subcontractors: (e.subcontractors ?? []).filter(s => s.id !== id) }))

  // Settings
  const updateSettings = (field: string, value: string | number | boolean) =>
    setEstimate(e => ({ ...e, settings: { ...e.settings, [field]: value } }))

  // Location zip lookup
  const handleLocationZipChange = useCallback((zip: string) => {
    const loc = lookupLocation(zip)
    setEstimate(e => ({
      ...e,
      settings: {
        ...e.settings,
        locationZip: zip,
        locationLabel: loc.label,
        materialLocationMultiplier: loc.materialMult,
        laborLocationMultiplier: loc.laborMult,
      },
    }))
  }, [])

  // Sync client zip → location when location zip not yet set
  useEffect(() => {
    if (estimate.client.zip && !estimate.settings.locationZip) {
      handleLocationZipChange(estimate.client.zip)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.client.zip])

  // When the account type changes (profile loads), ensure the selected tier is allowed
  useEffect(() => {
    if (!profile) return
    const current = estimate.settings.contractorTier ?? 'contractor'
    if (!allowedTiers.includes(current)) {
      changeTier(allowedTiers[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedTiers])

  // Contractor tier change
  const changeTier = useCallback((tier: ContractorTier) => {
    setShowLaborOnlyMaterials(false)
    const config = getTierConfig(tier)
    const allTierDescriptions = new Set(
      CONTRACTOR_TIERS.flatMap(t => t.autoOverhead.map(o => o.description))
    )
    setEstimate(e => {
      const filteredOverhead = e.overhead.filter(
        o => !(allTierDescriptions.has(o.description) && o.cost === 0)
      )
      const newOverhead: OverheadItem[] = config.autoOverhead.map(o => ({
        id: uuidv4(),
        description: o.description,
        cost: 0,
      }))
      return {
        ...e,
        overhead: [...filteredOverhead, ...newOverhead],
        settings: {
          ...e.settings,
          contractorTier: tier,
          materialMarkupPercent: config.defaultMaterialMarkup,
          marginMin: config.defaultMarginMin,
          marginMid: config.defaultMarginMid,
          marginMax: config.defaultMarginMax,
          paymentTerms: config.defaultPaymentTerms,
        },
      }
    })
  }, [])

  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [copySummaryStatus, setCopySummaryStatus] = useState<'idle' | 'copied'>('idle')
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying' | 'copied'>('idle')
  const [showPayment, setShowPayment] = useState(false)
  const [showLaborRateCalc, setShowLaborRateCalc] = useState(false)
  const [defaultLaborRate, setDefaultLaborRate] = useState(38)
  const [showChangeOrders, setShowChangeOrders] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<EstimateTemplate[]>(() => {
    try { return JSON.parse(localStorage.getItem('ttc_templates') || '[]') }
    catch { return [] }
  })

  const [templateSuggestion, setTemplateSuggestion] = useState<EstimateTemplate | null>(null)
  const [dismissedSuggestionType, setDismissedSuggestionType] = useState('')

  useEffect(() => {
    if (!estimate.projectType || templates.length === 0 || estimate.projectType === dismissedSuggestionType) {
      setTemplateSuggestion(null)
      return
    }
    const match = templates.find(t => t.projectType === estimate.projectType)
    setTemplateSuggestion(match ?? null)
  }, [estimate.projectType, templates, dismissedSuggestionType])

  const [showPriceBook, setShowPriceBook] = useState<'material' | 'labor' | null>(null)
  const [priceBook, setPriceBook] = useState<PriceBookItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('ttc_price_book') || '[]') }
    catch { return [] }
  })

  const savePriceBookItem = (item: PriceBookItem) => {
    const updated = [item, ...priceBook.filter(p => p.id !== item.id)]
    setPriceBook(updated)
    localStorage.setItem('ttc_price_book', JSON.stringify(updated))
  }

  const deletePriceBookItem = (id: string) => {
    const updated = priceBook.filter(p => p.id !== id)
    setPriceBook(updated)
    localStorage.setItem('ttc_price_book', JSON.stringify(updated))
  }

  const saveMaterialToPriceBook = (m: MaterialItem) => {
    const item: PriceBookItem = {
      id: uuidv4(),
      type: 'material',
      name: m.name,
      category: m.category,
      unit: m.unit,
      cost: m.unitCost,
      defaultMarkup: m.markup,
      lastUpdated: new Date().toISOString(),
    }
    savePriceBookItem(item)
  }

  const saveLaborToPriceBook = (l: LaborItem) => {
    const item: PriceBookItem = {
      id: uuidv4(),
      type: 'labor',
      name: l.description,
      category: 'Labor',
      unit: 'hr',
      cost: l.ratePerHour,
      defaultMarkup: 0,
      lastUpdated: new Date().toISOString(),
    }
    savePriceBookItem(item)
  }

  const doSendEmail = async (emailLang: 'en' | 'es') => {
    if (!user) return
    setEmailStatus('sending')
    try {
      const pdfBlob = await generatePDF(estimate, totals, company, 'client', emailLang, { returnBlob: true }) as Blob

      const storagePath = `${user.id}/estimate-pdfs/${estimate.id}.pdf`
      const { error: uploadErr } = await supabase.storage
        .from('business-assets')
        .upload(storagePath, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (uploadErr) throw uploadErr

      const { data: signedData, error: signErr } = await supabase.storage
        .from('business-assets')
        .createSignedUrl(storagePath, 86400)
      if (signErr || !signedData?.signedUrl) throw signErr ?? new Error('Failed to create signed URL')

      const docType = estimate.type === 'invoice' ? 'Invoice' : 'Estimate'
      const filename = `${docType}_${estimate.estimateNumber}_${estimate.client.name || 'Client'}.pdf`

      const { error: fnErr } = await supabase.functions.invoke('send-estimate-email', {
        body: {
          to: estimate.client.email,
          clientName: estimate.client.name,
          companyName: company.companyName,
          replyTo: company.email || null,
          estimateNumber: estimate.estimateNumber,
          projectType: estimate.projectType,
          totalQuote: totals.selectedQuote,
          signedUrl: signedData.signedUrl,
          filename,
          lang: emailLang,
        },
      })
      if (fnErr) throw fnErr

      setEstimate(e => ({ ...e, status: 'sent' }))
      if (estimate.crmClientId) {
        await supabase.from('estimates').update({ status: 'sent' }).eq('id', estimate.id)
      }

      setEmailStatus('sent')
      setTimeout(() => setEmailStatus('idle'), 6000)
    } catch (err) {
      console.error('Email send failed:', err)
      setEmailStatus('error')
      setTimeout(() => setEmailStatus('idle'), 6000)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    const prevStatus = estimate.status
    setEstimate(e => ({ ...e, status: newStatus as typeof e.status }))
    if (user && estimate.crmClientId) {
      await supabase.from('estimates').update({ status: newStatus }).eq('id', estimate.id)
      // Recalculate client total_value whenever accepted-status changes
      if (newStatus === 'accepted' || prevStatus === 'accepted') {
        const { data: accepted } = await supabase
          .from('estimates').select('total_quote')
          .eq('client_id', estimate.crmClientId).eq('status', 'accepted')
        if (accepted !== null) {
          const totalValue = accepted.reduce((sum, r) => sum + (Number(r.total_quote) || 0), 0)
          await supabase.from('clients').update({ total_value: totalValue }).eq('id', estimate.crmClientId)
        }
      }
    }
  }

  // Templates
  const saveTemplate = (name: string) => {
    const tmpl: EstimateTemplate = {
      id: uuidv4(),
      name,
      projectType: estimate.projectType,
      projectSubType: estimate.projectSubType,
      materials: estimate.materials,
      labor: estimate.labor,
      overhead: estimate.overhead,
      subcontractors: estimate.subcontractors ?? [],
      scopeOfWork: estimate.scopeOfWork,
      exclusions: estimate.exclusions,
      createdAt: new Date().toISOString(),
    }
    const updated = [tmpl, ...templates]
    setTemplates(updated)
    localStorage.setItem('ttc_templates', JSON.stringify(updated))
  }

  const applyTemplate = (tmpl: EstimateTemplate) => {
    setEstimate(e => ({
      ...e,
      materials: tmpl.materials.map(m => ({ ...m, id: uuidv4() })),
      labor: tmpl.labor.map(l => ({ ...l, id: uuidv4() })),
      overhead: tmpl.overhead.map(o => ({ ...o, id: uuidv4() })),
      subcontractors: (tmpl.subcontractors ?? []).map(s => ({ ...s, id: uuidv4() })),
      scopeOfWork: tmpl.scopeOfWork || e.scopeOfWork,
      exclusions: tmpl.exclusions || e.exclusions,
    }))
    setShowTemplates(false)
  }

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem('ttc_templates', JSON.stringify(updated))
  }

  const handleShare = useCallback(async () => {
    if (!user || shareStatus !== 'idle') return
    setShareStatus('copying')
    try {
      // Generate a fresh UUID token for this share
      const token = uuidv4()
      // Upsert the share_token on the estimate row (create the row if needed)
      const VALID_STATUSES = ['draft', 'sent', 'accepted', 'declined'] as const
      type DbStatus = typeof VALID_STATUSES[number]
      const status: DbStatus = (VALID_STATUSES as readonly string[]).includes(estimate.status)
        ? estimate.status as DbStatus
        : 'draft'
      await supabase.from('estimates').upsert({
        id: estimate.id,
        user_id: user.id,
        client_id: estimate.crmClientId ?? null,
        estimate_number: estimate.estimateNumber,
        project_type: estimate.projectType,
        status,
        total_quote: totals.selectedQuote,
        data: { ...estimate } as Record<string, unknown>,
        share_token: token,
      }, { onConflict: 'id' })

      const url = `https://xpertaisolution.com/estimate/${token}`
      setEstimate(e => ({ ...e, shareUrl: url }))
      await navigator.clipboard.writeText(url).catch(() => {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
      })
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 4000)
    } catch {
      setShareStatus('idle')
    }
  }, [user, estimate, totals.selectedQuote, shareStatus])

  const handlePDF = () => {
    if (trialExpired) { setShowUpgradeNudge(true); return }
    setPendingExport('pdf')
  }
  const handleWord = () => {
    if (trialExpired) { setShowUpgradeNudge(true); return }
    setPendingExport('word')
  }
  const handlePrint = () => {
    if (trialExpired) { setShowUpgradeNudge(true); return }
    setPendingExport('print')
  }
  const handleEmail = () => {
    if (trialExpired) { setShowUpgradeNudge(true); return }
    setPendingExport('email')
  }

  const handleCopySummary = useCallback(() => {
    const docType = estimate.type === 'invoice' ? 'Invoice' : 'Estimate'
    const projectLabel = estimate.projectType
      ? (estimate.projectType.charAt(0).toUpperCase() + estimate.projectType.slice(1)).replace(/-/g, ' ')
      : ''
    const validUntil = estimate.settings.validityDays
      ? format(addDays(new Date(estimate.createdAt), estimate.settings.validityDays), 'MMM d, yyyy')
      : ''
    const lines: string[] = [
      `${company.companyName}`,
      `${docType} #${estimate.estimateNumber}`,
      `─────────────────────`,
    ]
    if (estimate.client.name) lines.push(`Client: ${estimate.client.name}`)
    if (estimate.client.company) lines.push(`Company: ${estimate.client.company}`)
    if (projectLabel) lines.push(`Project: ${projectLabel}`)
    if (estimate.jobAddress) lines.push(`Address: ${estimate.jobAddress}`)
    if (estimate.settings.projectStartDate) {
      const start = format(new Date(estimate.settings.projectStartDate), 'MMM d, yyyy')
      lines.push(`Start: ${start}`)
    }
    lines.push(`─────────────────────`)
    lines.push(`Total: ${fmt(totals.selectedQuote)}`)
    if (estimate.settings.paymentTerms) lines.push(`Payment: ${estimate.settings.paymentTerms}`)
    if (validUntil) lines.push(`Valid until: ${validUntil}`)
    const milestones = estimate.milestones ?? []
    if (milestones.length > 0) {
      lines.push(`─────────────────────`)
      lines.push(`Payment Schedule:`)
      milestones.forEach(m => {
        const amt = fmt(totals.selectedQuote * m.percent / 100)
        lines.push(`  • ${m.label} (${m.percent}%): ${amt}${m.dueOn ? ' — ' + m.dueOn : ''}`)
      })
    }
    if (estimate.shareUrl) {
      lines.push(`─────────────────────`)
      lines.push(`Review & accept online:\n${estimate.shareUrl}`)
    }
    if (company.phone) lines.push(`─────────────────────\n${company.companyName}\n${company.phone}`)

    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopySummaryStatus('copied')
      setTimeout(() => setCopySummaryStatus('idle'), 3000)
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopySummaryStatus('copied')
      setTimeout(() => setCopySummaryStatus('idle'), 3000)
    })
  }, [estimate, totals, company])

  const handleWhatsApp = useCallback(() => {
    const docType = estimate.type === 'invoice' ? 'Invoice' : 'Estimate'
    const projectLabel = estimate.projectType
      ? (estimate.projectType.charAt(0).toUpperCase() + estimate.projectType.slice(1)).replace(/-/g, ' ')
      : ''
    const lines: string[] = [
      `*${company.companyName}*`,
      `${docType} #${estimate.estimateNumber}`,
    ]
    if (estimate.client.name) lines.push(`Client: ${estimate.client.name}`)
    if (projectLabel) lines.push(`Project: ${projectLabel}`)
    if (estimate.jobAddress) lines.push(`Address: ${estimate.jobAddress}`)
    lines.push(`*Total: ${fmt(totals.selectedQuote)}*`)
    if (estimate.settings.paymentTerms) lines.push(`Payment: ${estimate.settings.paymentTerms}`)
    if (estimate.shareUrl) lines.push(`\nReview & accept online:\n${estimate.shareUrl}`)
    if (company.phone) lines.push(`\n${company.companyName} — ${company.phone}`)
    const text = lines.join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }, [estimate, totals, company])

  const handleExportConfirm = async (exportLang: 'en' | 'es') => {
    const type = pendingExport
    setPendingExport(null)
    if (type === 'pdf') await generatePDF(estimate, totals, company, activeView, exportLang)
    else if (type === 'word') await generateWord(estimate, totals, company, activeView, exportLang)
    else if (type === 'print') window.print()
    else if (type === 'email') await doSendEmail(exportLang)
  }

  const convertToInvoice = () =>
    setEstimate(e => ({ ...e, type: 'invoice', status: 'sent' }))

  // Persist the current working estimate on every change so a tab switch or
  // mobile browser kill/reload never loses in-progress work.
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem('ttc_draft_estimate', JSON.stringify(estimate))
    }, 500)
    return () => clearTimeout(t)
  }, [estimate])

  // Auto-save every 30 seconds
  useEffect(() => {
    const t = setInterval(saveCurrentEstimate, 30000)
    return () => clearInterval(t)
  }, [saveCurrentEstimate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Trial countdown banner */}
      {isFreePlan && trialDaysLeft !== null && trialDaysLeft <= 14 && (
        <div className={`no-print flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium ${trialDaysLeft <= 3 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
          <span>{t('app.trial.daysLeft', { n: String(trialDaysLeft), s: trialDaysLeft !== 1 ? 's' : '' })}</span>
          <button onClick={() => setShowUpgradeNudge(true)} className="underline font-bold hover:no-underline">{t('app.trial.upgradeNow')}</button>
        </div>
      )}
      {trialExpired && (
        <div className="no-print flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium bg-red-700 text-white">
          <span>{t('app.trial.expired')}</span>
          <button onClick={() => setShowUpgradeNudge(true)} className="underline font-bold hover:no-underline">{t('app.trial.upgradeBtn')}</button>
        </div>
      )}
      {isFreePlan && !!profile && !trialExpired && (
        <div className={`no-print flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium border-b ${freeTrialLimitReached ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span>Free trial: <strong>{savedEstimates.length} of {FREE_TRIAL_ESTIMATE_LIMIT}</strong> estimates used</span>
          {freeTrialLimitReached && (
            <button onClick={() => setShowUpgradeNudge(true)} className="underline font-semibold hover:no-underline text-amber-700">Upgrade for unlimited →</button>
          )}
        </div>
      )}
      {estimate.status === 'sent' && (() => {
        const expiresAt = addDays(new Date(estimate.createdAt), estimate.settings.validityDays)
        const daysLeft = differenceInDays(expiresAt, new Date())
        if (daysLeft >= 0) return null
        const absD = Math.abs(daysLeft)
        return (
          <div className="no-print flex items-center gap-2 px-4 py-2 text-xs font-medium bg-amber-50 border-b border-amber-200 text-amber-800">
            <span>⚠️</span>
            <span>
              {lang === 'es'
                ? `Este estimado venció hace ${absD} día${absD !== 1 ? 's' : ''}. Considera actualizarlo y reenviarlo al cliente.`
                : `This estimate expired ${absD} day${absD !== 1 ? 's' : ''} ago. Consider updating and re-sending it to the client.`}
            </span>
          </div>
        )
      })()}
      <Header
        company={company}
        estimateNumber={estimate.estimateNumber}
        estimateType={estimate.type}
        status={estimate.status}
        onSettings={() => setShowSettings(true)}
        onSavedEstimates={() => setShowSaved(true)}
        onNew={startNewEstimate}
        onSave={saveCurrentEstimate}
        onConvertInvoice={convertToInvoice}
        onStatusChange={handleStatusChange}
        onChangeOrders={estimate.crmClientId ? () => setShowChangeOrders(true) : undefined}
        onPayment={estimate.crmClientId && estimate.status === 'accepted' ? () => setShowPayment(true) : undefined}
        onShare={user ? handleShare : undefined}
        shareStatus={shareStatus}
      />
      <TrialBanner />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <div className="w-full lg:w-[55%] xl:w-[50%] overflow-y-auto p-4 space-y-4 no-print">
          {/* Tier Selector */}
          <TierSelector
            selected={estimate.settings.contractorTier ?? 'contractor'}
            onChange={changeTier}
            allowedTiers={allowedTiers}
          />

          {/* Template bar + section controls */}
          <div className="flex items-center gap-2 px-1">
            {(templates.length > 0 || estimate.materials.length > 0 || estimate.labor.length > 0) && (
              <button
                onClick={() => setShowTemplates(true)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1.5 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                📋 {t('templates.button')}
                {templates.length > 0 && (
                  <span className="bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    {templates.length}
                  </span>
                )}
              </button>
            )}
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => setSections(s => Object.fromEntries(Object.keys(s).map(k => [k, true])))}
                className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                title={lang === 'es' ? 'Expandir todas las secciones' : 'Expand all sections'}
              >
                ⊞ {lang === 'es' ? 'Todo' : 'All'}
              </button>
              <button
                onClick={() => setSections(s => Object.fromEntries(Object.keys(s).map(k => [k, false])))}
                className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                title={lang === 'es' ? 'Colapsar todas las secciones' : 'Collapse all sections'}
              >
                ⊟ {lang === 'es' ? 'Min' : 'Min'}
              </button>
            </div>
          </div>

          {/* Recent estimates quick-access strip */}
          {savedEstimates.length > 1 && (
            <div className="flex items-center gap-1.5 px-1 overflow-x-auto pb-0.5">
              <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                {lang === 'es' ? 'Recientes:' : 'Recent:'}
              </span>
              {savedEstimates.slice(0, 4).map(saved => (
                <button
                  key={saved.id}
                  onClick={() => { saveCurrentEstimate(); setEstimate({ ...saved.data, subcontractors: saved.data.subcontractors ?? [] }) }}
                  className={`shrink-0 text-[11px] px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 max-w-[120px] ${
                    saved.id === estimate.id
                      ? 'bg-brand-100 border-brand-300 text-brand-700 font-semibold'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  title={saved.clientName}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    saved.status === 'accepted' ? 'bg-green-500' :
                    saved.status === 'sent' ? 'bg-blue-500' :
                    saved.status === 'declined' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                  <span className="truncate">{saved.clientName || saved.estimateNumber}</span>
                </button>
              ))}
            </div>
          )}

          {/* Mobile live quote summary — hidden on lg+ where the right results panel is visible */}
          <div className="lg:hidden">
            <div className={`card border-l-4 p-3 flex items-center justify-between ${
              totals.selectedQuote > 0 && totals.selectedMargin < estimate.settings.marginMin
                ? 'border-l-red-500 bg-red-50/40'
                : 'border-l-brand-500 bg-brand-50/30'
            }`}>
              <div>
                <p className="text-[11px] text-gray-500 capitalize mb-0.5">
                  {estimate.settings.selectedTier !== 'custom'
                    ? estimate.settings.selectedTier
                    : (lang === 'es' ? 'Personalizado' : 'Custom')
                  } {lang === 'es' ? 'cotización' : 'quote'}
                </p>
                <p className={`text-2xl font-bold leading-none ${
                  totals.selectedQuote > 0 && totals.selectedMargin < estimate.settings.marginMin
                    ? 'text-red-700'
                    : 'text-brand-700'
                }`}>
                  {fmt(totals.selectedQuote)}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                {totals.hardCost > 0 ? (
                  <>
                    <p>{lang === 'es' ? 'Costo: ' : 'Hard cost: '}<span className="font-semibold text-gray-700">{fmt(totals.hardCost)}</span></p>
                    <p>{lang === 'es' ? 'Margen: ' : 'Margin: '}<span className={`font-bold ${
                      totals.selectedMargin < estimate.settings.marginMin ? 'text-red-600' : 'text-green-600'
                    }`}>{fmtPct(totals.selectedMargin)}</span></p>
                  </>
                ) : (
                  <p className="text-gray-400 italic">{lang === 'es' ? 'Sin costos aún' : 'No costs yet'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="card border-l-4 border-l-brand-500">
            <div className="section-header bg-brand-50/60 rounded-tl-xl" onClick={() => toggle('client')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">1</span>
                {t('app.section.client')}
              </span>
              <span className="text-gray-400 text-xs">{sections.client ? '▲' : '▼'}</span>
            </div>
            {sections.client && (
              <div className="p-4">
                <ClientInfoForm
                  client={estimate.client}
                  onChange={updateClient}
                  crmClients={crmClients}
                  onSelectClient={handleSelectCRMClient}
                  onClear={clearClientInfo}
                  crmSaved={crmSaved}
                />
              </div>
            )}
          </div>

          {/* Project Type */}
          <div className="card border-l-4 border-l-violet-500">
            <div className="section-header bg-violet-50/60 rounded-tl-xl" onClick={() => toggle('project')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-black shrink-0">2</span>
                {t('app.section.project')}
              </span>
              <span className="text-gray-400 text-xs">{sections.project ? '▲' : '▼'}</span>
            </div>
            {sections.project && (
              <div className="p-4">
                <ProjectTypeSelector
                  projectTypes={PROJECT_TYPES}
                  projectType={estimate.projectType}
                  projectSubType={estimate.projectSubType}
                  projectDescription={estimate.projectDescription}
                  jobAddress={estimate.jobAddress}
                  locationZip={estimate.settings.locationZip ?? ''}
                  locationLabel={estimate.settings.locationLabel ?? ''}
                  materialMult={estimate.settings.materialLocationMultiplier ?? 1.0}
                  laborMult={estimate.settings.laborLocationMultiplier ?? 1.0}
                  onTypeChange={setProjectType}
                  onSubTypeChange={setProjectSubType}
                  onDescriptionChange={v => setEstimate(e => ({ ...e, projectDescription: v }))}
                  onJobAddressChange={v => setEstimate(e => ({ ...e, jobAddress: v }))}
                  onLocationZipChange={handleLocationZipChange}
                />
              </div>
            )}
          </div>

          {/* Template suggestion banner */}
          {templateSuggestion && (
            <div className="card border-l-4 border-l-violet-400 bg-violet-50/40 py-2.5 px-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-violet-500 shrink-0">📋</span>
                <p className="text-xs text-violet-800 min-w-0">
                  <span className="font-semibold">{lang === 'es' ? 'Plantilla guardada:' : 'Saved template found:'}</span>
                  {' '}<span className="font-bold">"{templateSuggestion.name}"</span>
                  {' '}{lang === 'es' ? '— ¿Aplicar?' : '— Apply it?'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { applyTemplate(templateSuggestion); setTemplateSuggestion(null) }}
                  className="btn-primary text-xs"
                >
                  {lang === 'es' ? 'Aplicar' : 'Apply'}
                </button>
                <button
                  onClick={() => { setDismissedSuggestionType(estimate.projectType); setTemplateSuggestion(null) }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 leading-none"
                  title={lang === 'es' ? 'Descartar' : 'Dismiss'}
                >✕</button>
              </div>
            </div>
          )}

          {/* Project Timeline */}
          <div className="card border-l-4 border-l-sky-500">
            <div className="section-header bg-sky-50/60 rounded-tl-xl" onClick={() => toggle('timeline')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-[10px] font-black shrink-0">3</span>
                {t('app.section.timeline')}
              </span>
              <span className="text-gray-400 text-xs">{sections.timeline ? '▲' : '▼'}</span>
            </div>
            {sections.timeline && (
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">{t('app.timeline.estimateDate')}</label>
                    <input type="date" className="form-input text-sm"
                      value={estimate.settings.estimateDate ?? new Date().toISOString().split('T')[0]}
                      onChange={e => updateSettings('estimateDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('app.timeline.startDate')}</label>
                    <input type="date" className="form-input text-sm"
                      value={estimate.settings.projectStartDate ?? ''}
                      onChange={e => updateSettings('projectStartDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('app.timeline.endDate')}</label>
                    <input type="date" className="form-input text-sm"
                      value={estimate.settings.projectEndDate ?? ''}
                      onChange={e => updateSettings('projectEndDate', e.target.value)}
                    />
                  </div>
                </div>
                {estimate.settings.projectStartDate && estimate.settings.projectEndDate && (() => {
                  const start = new Date(estimate.settings.projectStartDate)
                  const end   = new Date(estimate.settings.projectEndDate)
                  const days  = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
                  const weeks = Math.floor(days / 7)
                  const rem   = days % 7
                  const label = weeks > 0
                    ? `${weeks} week${weeks > 1 ? 's' : ''}${rem > 0 ? ` ${rem} day${rem > 1 ? 's' : ''}` : ''}`
                    : `${days} day${days !== 1 ? 's' : ''}`
                  return (
                    <p className="text-xs text-brand-700 font-medium mt-2 flex items-center gap-1">
                      {t('app.timeline.duration')} <strong>{label}</strong>
                    </p>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Measurements */}
          {estimate.measurements.length > 0 && (
            <div className="card border-l-4 border-l-teal-500">
              <div className="section-header bg-teal-50/60 rounded-tl-xl" onClick={() => toggle('measurements')}>
                <span className="font-semibold text-sm flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-[10px] font-black shrink-0">4</span>
                  {t('app.section.measurements')}
                </span>
                <span className="text-gray-400 text-xs">{sections.measurements ? '▲' : '▼'}</span>
              </div>
              {sections.measurements && (
                <div className="p-4">
                  <MeasurementsForm
                    measurements={estimate.measurements}
                    onChange={updateMeasurement}
                  />
                  <div className="mt-3 flex items-center gap-4">
                    <button
                      onClick={() => autoPopulate(estimate.measurements)}
                      className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    >
                      {t('app.recalculate')}
                    </button>
                    <button
                      onClick={() => {
                        const zeroed = estimate.measurements.map(m => ({ ...m, value: 0 }))
                        autoPopulate(zeroed)
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                    >
                      {t('meas.resetAll')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Project Photos */}
          <div className="card border-l-4 border-l-pink-500">
            <div className="section-header bg-pink-50/60 rounded-tl-xl" onClick={() => toggle('photos')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-600 text-white text-[10px] font-black shrink-0">5</span>
                Project Photos
                {(estimate.photos?.length ?? 0) > 0 && (
                  <span className="tag bg-purple-100 text-purple-700">{estimate.photos.length} photo{estimate.photos.length !== 1 ? 's' : ''}</span>
                )}
              </span>
              <span className="text-gray-400 text-xs">{sections.photos ? '▲' : '▼'}</span>
            </div>
            {sections.photos && (
              <div className="p-4">
                <ProjectPhotos
                  estimateId={estimate.id}
                  photos={estimate.photos ?? []}
                  onChange={photos => setEstimate(e => ({ ...e, photos }))}
                />
              </div>
            )}
          </div>

          {/* Materials */}
          <div className="card border-l-4 border-l-blue-500">
            <div className="section-header bg-blue-50/60 rounded-tl-xl" onClick={() => toggle('materials')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black shrink-0">6</span>
                {t('app.section.materials')}
                {estimate.materials.length > 0 && (
                  <span className="tag bg-blue-100 text-blue-700">{t('app.items', { n: String(estimate.materials.length) })}</span>
                )}
              </span>
              <span className="text-gray-400 text-xs">{sections.materials ? '▲' : '▼'}</span>
            </div>
            {sections.materials && (
              <div className="p-4">
                <MaterialsTable
                  materials={estimate.materials}
                  onAdd={addMaterial}
                  onUpdate={updateMaterial}
                  onRemove={removeMaterial}
                  onDuplicate={duplicateMaterial}
                  onSetAllMarkup={(markup) =>
                    setEstimate(e => ({
                      ...e,
                      materials: e.materials.map(m => ({ ...m, markup })),
                    }))
                  }
                  defaultMarkup={estimate.settings.materialMarkupPercent}
                  isLaborOnly={estimate.settings.contractorTier === 'labor-only'}
                  showLaborOnlyMaterials={showLaborOnlyMaterials}
                  onToggleLaborOnlyMaterials={() => setShowLaborOnlyMaterials(v => !v)}
                  onOpenPriceBook={() => setShowPriceBook('material')}
                  onSaveToPriceBook={saveMaterialToPriceBook}
                  priceBook={priceBook}
                  onBulkAdd={bulkAddMaterials}
                  onRecalculate={recalculateMeasures}
                  canRecalc={!!(estimate.projectSubType && estimate.measurements.some(m => m.value > 0))}
                />
              </div>
            )}
          </div>

          {/* Labor */}
          <div className="card border-l-4 border-l-emerald-500">
            <div className="section-header bg-emerald-50/60 rounded-tl-xl" onClick={() => toggle('labor')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-black shrink-0">7</span>
                {t('app.section.labor')}
                {estimate.labor.length > 0 && (
                  <span className="tag bg-green-100 text-green-700">{t('app.items', { n: String(estimate.labor.length) })}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setShowLaborRateCalc(true) }}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-lg transition-colors"
                  title={lang === 'es' ? 'Calculadora de tarifa laboral' : 'Labor rate calculator'}
                >
                  ⚡ {lang === 'es' ? 'Tarifa' : 'Rate'}
                </button>
                <span className="text-gray-400 text-xs">{sections.labor ? '▲' : '▼'}</span>
              </div>
            </div>
            {sections.labor && (
              <div className="p-4">
                <LaborTable
                  labor={estimate.labor}
                  onAdd={addLabor}
                  onUpdate={updateLabor}
                  onRemove={removeLabor}
                  onDuplicate={duplicateLabor}
                  onOpenPriceBook={() => setShowPriceBook('labor')}
                  onSaveToPriceBook={saveLaborToPriceBook}
                  priceBook={priceBook}
                  onRecalculate={recalculateMeasures}
                  canRecalc={!!(estimate.projectSubType && estimate.measurements.some(m => m.value > 0))}
                />
              </div>
            )}
          </div>

          {/* Overhead */}
          <div className="card border-l-4 border-l-amber-500">
            <div className="section-header bg-amber-50/60 rounded-tl-xl" onClick={() => toggle('overhead')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white text-[10px] font-black shrink-0">8</span>
                {t('app.section.overhead')}
                {estimate.overhead.length > 0 && (
                  <span className="tag bg-amber-100 text-amber-700">{t('app.items', { n: String(estimate.overhead.length) })}</span>
                )}
              </span>
              <span className="text-gray-400 text-xs">{sections.overhead ? '▲' : '▼'}</span>
            </div>
            {sections.overhead && (
              <div className="p-4">
                <OverheadTable
                  overhead={estimate.overhead}
                  onAdd={addOverhead}
                  onUpdate={updateOverhead}
                  onRemove={removeOverhead}
                  onDuplicate={duplicateOverhead}
                  onRecalculate={recalculateMeasures}
                  canRecalc={!!(estimate.projectSubType && estimate.measurements.some(m => m.value > 0))}
                />
              </div>
            )}
          </div>

          {/* Subcontractors */}
          <div className="card border-l-4 border-l-purple-500">
            <div className="section-header bg-purple-50/60 rounded-tl-xl" onClick={() => toggle('subcontractors')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-black shrink-0">9</span>
                {t('app.section.subcontractors')}
                {(estimate.subcontractors ?? []).length > 0 && (
                  <span className="tag bg-amber-100 text-amber-700">{t('app.items', { n: String((estimate.subcontractors ?? []).length) })}</span>
                )}
              </span>
              <span className="text-gray-400 text-xs">{sections.subcontractors ? '▲' : '▼'}</span>
            </div>
            {sections.subcontractors && (
              <div className="p-4">
                <SubcontractorTable
                  subcontractors={estimate.subcontractors ?? []}
                  onAdd={addSubcontractor}
                  onUpdate={updateSubcontractor}
                  onRemove={removeSubcontractor}
                  onDuplicate={duplicateSubcontractor}
                />
              </div>
            )}
          </div>

          {/* Scope & Notes */}
          <div className="card border-l-4 border-l-slate-500">
            <div className="section-header bg-slate-50/60 rounded-tl-xl" onClick={() => toggle('scope')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-600 text-white text-[10px] font-black shrink-0">10</span>
                {t('app.section.scope')}
              </span>
              <span className="text-gray-400 text-xs">{sections.scope ? '▲' : '▼'}</span>
            </div>
            {sections.scope && (
              <div className="p-4">
                <ScopeNotes
                  coverLetter={estimate.coverLetter ?? ''}
                  scopeOfWork={estimate.scopeOfWork}
                  exclusions={estimate.exclusions}
                  internalNotes={estimate.internalNotes}
                  projectType={estimate.projectType || undefined}
                  clientName={estimate.client.name || undefined}
                  companyName={company.companyName || undefined}
                  onCoverLetterChange={v => setEstimate(e => ({ ...e, coverLetter: v }))}
                  onScopeChange={v => setEstimate(e => ({ ...e, scopeOfWork: v }))}
                  onExclusionsChange={v => setEstimate(e => ({ ...e, exclusions: v }))}
                  onNotesChange={v => setEstimate(e => ({ ...e, internalNotes: v }))}
                  onGenerateScope={(estimate.materials.length > 0 || estimate.labor.length > 0) ? generateScopeFromItems : undefined}
                />
                <div className="border-t border-gray-100 pt-3">
                  <label className="form-label mb-2 flex items-center gap-1.5">
                    💳 {lang === 'es' ? 'Programa de pagos' : 'Payment Schedule'}
                    <span className="text-[10px] font-normal text-gray-400">
                      ({lang === 'es' ? 'opcional' : 'optional'})
                    </span>
                  </label>
                  <MilestoneEditor
                    milestones={estimate.milestones ?? []}
                    totalQuote={totals.selectedQuote - totals.discountAmount + totals.taxAmount}
                    onChange={milestones => setEstimate(e => ({ ...e, milestones }))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>

        {/* Right: Results */}
        <div className="hidden lg:flex lg:flex-col lg:w-[45%] xl:w-[50%] border-l-2 border-gray-200 bg-gray-50/80">
          {/* View Toggle */}
          <div className="flex bg-white border-b border-gray-200 no-print">
            <button
              onClick={() => setActiveView('contractor')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeView === 'contractor' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('app.view.contractor')}
            </button>
            <button
              onClick={() => setActiveView('client')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeView === 'client' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('app.view.client')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeView === 'contractor' ? (
              <>
                <ContractorResults
                  estimate={estimate}
                  totals={totals}
                  onUpdateSettings={updateSettings}
                />
                {estimate.status === 'accepted' && (
                  <JobCostingPanel
                    estimate={estimate}
                    totals={totals}
                    onChange={actuals => setEstimate(e => ({ ...e, actuals }))}
                  />
                )}
              </>
            ) : (
              <ClientQuote
                estimate={estimate}
                totals={totals}
                company={company}
              />
            )}
          </div>

          {/* Readiness hints */}
          {readinessHints.length > 0 && (
            <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 flex items-center gap-2 flex-wrap no-print">
              <span className="text-[10px] font-semibold text-amber-600 shrink-0">
                {lang === 'es' ? 'Antes de enviar:' : 'Before sending:'}
              </span>
              {readinessHints.map(h => (
                <span key={h.key} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  {lang === 'es' ? h.es : h.en}
                </span>
              ))}
            </div>
          )}

          {/* Export Bar */}
          <ExportBar
            onPDF={handlePDF}
            onWord={handleWord}
            onPrint={handlePrint}
            onSave={saveCurrentEstimate}
            onEmail={user ? handleEmail : undefined}
            emailStatus={emailStatus}
            hasClientEmail={!!estimate.client.email}
            estimateType={estimate.type}
            activeView={activeView}
            onCopySummary={handleCopySummary}
            copySummaryStatus={copySummaryStatus}
            onShare={user ? handleShare : undefined}
            shareStatus={shareStatus}
            onWhatsApp={handleWhatsApp}
          />
        </div>
      </div>

      {/* Mobile Export Bar */}
      <div className="lg:hidden sticky bottom-0 bg-white border-t border-gray-200 no-print">
        {readinessHints.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-100 px-3 py-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-amber-600 shrink-0">
              {lang === 'es' ? 'Pendiente:' : 'Missing:'}
            </span>
            {readinessHints.map(h => (
              <span key={h.key} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {lang === 'es' ? h.es : h.en}
              </span>
            ))}
          </div>
        )}
        <ExportBar
          onPDF={handlePDF}
          onWord={handleWord}
          onPrint={handlePrint}
          onSave={saveCurrentEstimate}
          onEmail={user ? handleEmail : undefined}
          emailStatus={emailStatus}
          hasClientEmail={!!estimate.client.email}
          estimateType={estimate.type}
          activeView={activeView}
          onCopySummary={handleCopySummary}
          copySummaryStatus={copySummaryStatus}
          onShare={user ? handleShare : undefined}
          shareStatus={shareStatus}
          onWhatsApp={handleWhatsApp}
        />
        {/* Mobile view toggle */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={() => setActiveView('contractor')}
            className={`flex-1 py-2 text-xs font-semibold ${activeView === 'contractor' ? 'text-brand-600' : 'text-gray-500'}`}
          >
            {t('app.view.contractorMobile')}
          </button>
          <button
            onClick={() => setActiveView('client')}
            className={`flex-1 py-2 text-xs font-semibold ${activeView === 'client' ? 'text-brand-600' : 'text-gray-500'}`}
          >
            {t('app.view.clientMobile')}
          </button>
        </div>
      </div>

      {/* Print area — Client Quote Only */}
      <div className="hidden print-area p-8">
        <ClientQuote estimate={estimate} totals={totals} company={company} />
      </div>

      {/* Modals */}
      {showChangeOrders && estimate.crmClientId && (
        <ChangeOrderModal
          estimateId={estimate.id}
          crmClientId={estimate.crmClientId}
          estimateNumber={estimate.estimateNumber}
          onClose={() => setShowChangeOrders(false)}
        />
      )}
      {showTemplates && (
        <TemplatesModal
          templates={templates}
          currentProjectType={estimate.projectType}
          currentProjectSubType={estimate.projectSubType}
          currentMaterials={estimate.materials}
          currentLabor={estimate.labor}
          currentOverhead={estimate.overhead}
          currentScopeOfWork={estimate.scopeOfWork}
          currentExclusions={estimate.exclusions}
          onSave={saveTemplate}
          onApply={applyTemplate}
          onDelete={deleteTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {showLaborRateCalc && (
        <LaborRateModal
          onApply={applyLaborRate}
          onClose={() => setShowLaborRateCalc(false)}
        />
      )}
      {showPayment && estimate.crmClientId && (
        <QuickPaymentModal
          estimateId={estimate.id}
          totalQuote={totals.selectedQuote - totals.discountAmount + totals.taxAmount}
          estimateNumber={estimate.estimateNumber}
          onClose={() => setShowPayment(false)}
        />
      )}
      {showPriceBook && (
        <PriceBookModal
          items={priceBook}
          defaultMarkup={estimate.settings.materialMarkupPercent}
          initialTab={showPriceBook}
          onAddMaterial={mat => { addMaterialFromPriceBook(mat); setShowPriceBook(null) }}
          onAddLabor={lab => { addLaborFromPriceBook(lab); setShowPriceBook(null) }}
          onSave={savePriceBookItem}
          onDelete={deletePriceBookItem}
          onClose={() => setShowPriceBook(null)}
        />
      )}
      {pendingExport && (
        <EstimateLangModal
          onConfirm={handleExportConfirm}
          onClose={() => setPendingExport(null)}
        />
      )}
      {showSettings && (
        <SettingsModal
          company={company}
          onSave={saveCompany}
          onClose={() => setShowSettings(false)}
          profile={profile ?? undefined}
          onBillingPortal={profile?.stripe_subscription_id ? openBillingPortal : undefined}
          onStartCheckout={!profile?.stripe_subscription_id ? startCheckout : undefined}
        />
      )}
      {showSaved && (
        <SavedEstimatesList
          estimates={savedEstimates}
          onLoad={loadEstimate}
          onDuplicate={duplicateEstimate}
          onClose={() => setShowSaved(false)}
          onDelete={(id) => {
            const updated = savedEstimates.filter(s => s.id !== id)
            setSavedEstimates(updated)
            localStorage.setItem('ttc_estimates', JSON.stringify(updated))
          }}
          onDeleteMany={(ids) => {
            const updated = savedEstimates.filter(s => !ids.includes(s.id))
            setSavedEstimates(updated)
            localStorage.setItem('ttc_estimates', JSON.stringify(updated))
          }}
          onStatusChangeMany={(ids, status) => {
            const updated = savedEstimates.map(s =>
              ids.includes(s.id) ? { ...s, status, data: { ...s.data, status } } : s
            )
            setSavedEstimates(updated)
            localStorage.setItem('ttc_estimates', JSON.stringify(updated))
          }}
          onStatusChange={(id, status) => {
            const updated = savedEstimates.map(s =>
              s.id === id ? { ...s, status, data: { ...s.data, status } } : s
            )
            setSavedEstimates(updated)
            localStorage.setItem('ttc_estimates', JSON.stringify(updated))
            // Keep open estimate in sync if it's the one being updated
            if (estimate.id === id) setEstimate(e => ({ ...e, status }))
          }}
          onConvertToInvoice={(saved) => {
            const asEstimate: Estimate = { ...(saved.data as Estimate), subcontractors: (saved.data as Estimate).subcontractors ?? [], type: 'invoice', status: 'sent' }
            setEstimate(asEstimate)
            localStorage.setItem('ttc_draft_estimate', JSON.stringify(asEstimate))
            setShowSaved(false)
          }}
          onNoteChange={(id, note) => {
            const updated = savedEstimates.map(s => s.id === id ? { ...s, internalNote: note } : s)
            setSavedEstimates(updated)
            localStorage.setItem('ttc_estimates', JSON.stringify(updated))
          }}
        />
      )}

      {showUpgradeNudge && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1">
                {trialExpired ? 'Free Trial Expired' : freeTrialLimitReached ? 'Estimate Limit Reached' : 'Upgrade Your Plan'}
              </h2>
              <p className="text-gray-500 text-sm">
                {trialExpired
                  ? 'Your 14-day free trial has ended. Upgrade to keep estimating.'
                  : freeTrialLimitReached
                  ? `You've used all ${FREE_TRIAL_ESTIMATE_LIMIT} free estimates. Upgrade for unlimited estimates and full access.`
                  : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left on your free trial — lock in your plan now.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {UPGRADE_PLANS.map((plan, i) => (
                <div key={plan.key} className={i === 0 ? 'bg-brand-700 rounded-xl p-4 text-white' : 'bg-gray-50 border border-gray-200 rounded-xl p-4'}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${i === 0 ? 'text-brand-300' : 'text-gray-500'}`}>{plan.name}</p>
                  <p className={`text-2xl font-black mb-3 ${i === 0 ? '' : 'text-gray-900'}`}>
                    {plan.price}<span className={`text-sm font-normal ${i === 0 ? 'text-brand-300' : 'text-gray-400'}`}>{plan.period}</span>
                  </p>
                  {plan.features.map(f => (
                    <p key={f} className={`text-xs mb-1 ${i === 0 ? 'text-brand-100' : 'text-gray-600'}`}>✓ {f}</p>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowUpgradeNudge(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition">
                Not now
              </button>
              <a
                href="mailto:support@xpertaisolution.com?subject=Upgrade%20Request%20-%20TTC%20Estimator"
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition text-center"
              >
                Upgrade Now →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
