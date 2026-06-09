import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { useAuth } from './context/AuthContext'
import { useLanguage } from './context/LanguageContext'
import { supabase } from './lib/supabase'
import type {
  Estimate, CompanySettings, MaterialItem, LaborItem, OverheadItem,
  Measurement, SavedEstimate, ContractorTier,
} from './types'
import type { Client } from './lib/supabase'
import { calcTotals, generateEstimateNumber, evalFormula } from './utils/calculations'
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
import MaterialsTable from './components/form/MaterialsTable'
import LaborTable from './components/form/LaborTable'
import OverheadTable from './components/form/OverheadTable'
import ContractorResults from './components/results/ContractorResults'
import ClientQuote from './components/results/ClientQuote'
import ExportBar from './components/results/ExportBar'
import SettingsModal from './components/modals/SettingsModal'
import SavedEstimatesList from './components/modals/SavedEstimatesList'
import ScopeNotes from './components/form/ScopeNotes'
import EstimateLangModal from './components/modals/EstimateLangModal'

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
    },
    scopeOfWork: '',
    exclusions: '',
    internalNotes: '',
  }
}

export default function App() {
  const { profile, user } = useAuth()
  const { t } = useLanguage()
  const [showLaborOnlyMaterials, setShowLaborOnlyMaterials] = useState(false)
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
      companyName: profile.business_name ?? profile.company_name ?? company.companyName,
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
  const [pendingExport, setPendingExport] = useState<'pdf' | 'word' | 'print' | null>(null)
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>(() => {
    try { return JSON.parse(localStorage.getItem('ttc_estimates') || '[]') }
    catch { return [] }
  })
  const [sections, setSections] = useState<Record<string, boolean>>({
    client: true, project: true, timeline: true, measurements: true,
    materials: true, labor: true, overhead: true, scope: false,
  })
  const [crmClients, setCrmClients] = useState<Client[]>([])
  const [crmSaved, setCrmSaved] = useState(false)
  // Tracks whether client fields were mutated by the user (not just restored from localStorage)
  const clientEditedRef = useRef(false)

  const totals = useMemo(() => calcTotals(estimate), [estimate])

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

  const saveCompany = (c: CompanySettings) => {
    setCompany(c)
    localStorage.setItem('ttc_company', JSON.stringify(c))
    if (profile?.id) {
      supabase.from('profiles').update({
        business_name: c.companyName,
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
      }).eq('id', profile.id).then(() => {})
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

  const saveCurrentEstimate = useCallback(() => {
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
  }, [estimate, totals.selectedQuote, trialExpired, isFreePlan])

  const loadEstimate = (saved: SavedEstimate) => {
    setEstimate(saved.data)
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
    setEstimate(e => ({ ...e, projectType: typeId as any, projectSubType: '', measurements: [], materials: [], labor: [], overhead: [] }))
  }

  const setProjectSubType = (subTypeId: string) => {
    setEstimate(e => {
      const sub = getSubTypeById(e.projectType, subTypeId)
      if (!sub) return { ...e, projectSubType: subTypeId }

      const measurements: Measurement[] = sub.measurements.map(m => ({
        id: m.id, label: m.label, value: 0, unit: m.unit,
      }))

      return { ...e, projectSubType: subTypeId, measurements, materials: [], labor: [], overhead: [] }
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

  // Materials
  const addMaterial = () => {
    const item: MaterialItem = { id: uuidv4(), category: 'Other', name: '', quantity: 1, unit: 'each', unitCost: 0, markup: estimate.settings.materialMarkupPercent, notes: '' }
    setEstimate(e => ({ ...e, materials: [...e.materials, item] }))
  }
  const updateMaterial = (id: string, field: string, value: string | number) =>
    setEstimate(e => ({ ...e, materials: e.materials.map(m => m.id === id ? { ...m, [field]: value } : m) }))
  const removeMaterial = (id: string) =>
    setEstimate(e => ({ ...e, materials: e.materials.filter(m => m.id !== id) }))

  // Labor
  const addLabor = () => {
    const item: LaborItem = { id: uuidv4(), description: '', workers: 1, hours: 1, ratePerHour: 38, notes: '' }
    setEstimate(e => ({ ...e, labor: [...e.labor, item] }))
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

  const handlePDF = () => setPendingExport('pdf')
  const handleWord = () => setPendingExport('word')
  const handlePrint = () => setPendingExport('print')

  const handleExportConfirm = async (exportLang: 'en' | 'es') => {
    const type = pendingExport
    setPendingExport(null)
    if (type === 'pdf') await generatePDF(estimate, totals, company, activeView, exportLang)
    else if (type === 'word') await generateWord(estimate, totals, company, activeView, exportLang)
    else if (type === 'print') window.print()
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
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <div className="w-full lg:w-[55%] xl:w-[50%] overflow-y-auto p-4 space-y-3 no-print">
          {/* Tier Selector */}
          <TierSelector
            selected={estimate.settings.contractorTier ?? 'contractor'}
            onChange={changeTier}
          />

          {/* Client Info */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('client')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">1</span>
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
          <div className="card">
            <div className="section-header" onClick={() => toggle('project')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">2</span>
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

          {/* Project Timeline */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('timeline')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">3</span>
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
            <div className="card">
              <div className="section-header" onClick={() => toggle('measurements')}>
                <span className="font-semibold text-sm flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">4</span>
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
                  <button
                    onClick={() => autoPopulate(estimate.measurements)}
                    className="mt-3 text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                  >
                    {t('app.recalculate')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Materials */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('materials')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">5</span>
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
                  defaultMarkup={estimate.settings.materialMarkupPercent}
                  isLaborOnly={estimate.settings.contractorTier === 'labor-only'}
                  showLaborOnlyMaterials={showLaborOnlyMaterials}
                  onToggleLaborOnlyMaterials={() => setShowLaborOnlyMaterials(v => !v)}
                />
              </div>
            )}
          </div>

          {/* Labor */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('labor')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">6</span>
                {t('app.section.labor')}
                {estimate.labor.length > 0 && (
                  <span className="tag bg-green-100 text-green-700">{t('app.items', { n: String(estimate.labor.length) })}</span>
                )}
              </span>
              <span className="text-gray-400 text-xs">{sections.labor ? '▲' : '▼'}</span>
            </div>
            {sections.labor && (
              <div className="p-4">
                <LaborTable
                  labor={estimate.labor}
                  onAdd={addLabor}
                  onUpdate={updateLabor}
                  onRemove={removeLabor}
                />
              </div>
            )}
          </div>

          {/* Overhead */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('overhead')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">7</span>
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
                />
              </div>
            )}
          </div>

          {/* Scope & Notes */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('scope')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-black shrink-0">8</span>
                {t('app.section.scope')}
              </span>
              <span className="text-gray-400 text-xs">{sections.scope ? '▲' : '▼'}</span>
            </div>
            {sections.scope && (
              <div className="p-4">
                <ScopeNotes
                  scopeOfWork={estimate.scopeOfWork}
                  exclusions={estimate.exclusions}
                  internalNotes={estimate.internalNotes}
                  onScopeChange={v => setEstimate(e => ({ ...e, scopeOfWork: v }))}
                  onExclusionsChange={v => setEstimate(e => ({ ...e, exclusions: v }))}
                  onNotesChange={v => setEstimate(e => ({ ...e, internalNotes: v }))}
                />
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>

        {/* Right: Results */}
        <div className="hidden lg:flex lg:flex-col lg:w-[45%] xl:w-[50%] border-l border-gray-200 bg-gray-50">
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
              <ContractorResults
                estimate={estimate}
                totals={totals}
                onUpdateSettings={updateSettings}
              />
            ) : (
              <ClientQuote
                estimate={estimate}
                totals={totals}
                company={company}
              />
            )}
          </div>

          {/* Export Bar */}
          <ExportBar
            onPDF={handlePDF}
            onWord={handleWord}
            onPrint={handlePrint}
            onSave={saveCurrentEstimate}
            estimateType={estimate.type}
            activeView={activeView}
          />
        </div>
      </div>

      {/* Mobile Export Bar */}
      <div className="lg:hidden sticky bottom-0 bg-white border-t border-gray-200 no-print">
        <ExportBar
          onPDF={handlePDF}
          onWord={handleWord}
          onPrint={handlePrint}
          onSave={saveCurrentEstimate}
          estimateType={estimate.type}
          activeView={activeView}
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
      {pendingExport && (
        <EstimateLangModal
          onConfirm={handleExportConfirm}
          onClose={() => setPendingExport(null)}
        />
      )}
      {showSettings && (
        <SettingsModal company={company} onSave={saveCompany} onClose={() => setShowSettings(false)} />
      )}
      {showSaved && (
        <SavedEstimatesList
          estimates={savedEstimates}
          onLoad={loadEstimate}
          onClose={() => setShowSaved(false)}
          onDelete={(id) => {
            const updated = savedEstimates.filter(s => s.id !== id)
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
