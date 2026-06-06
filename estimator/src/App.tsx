import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import type {
  Estimate, CompanySettings, MaterialItem, LaborItem, OverheadItem,
  Measurement, SavedEstimate,
} from './types'
import { calcTotals, generateEstimateNumber, evalFormula } from './utils/calculations'
import { generatePDF } from './utils/pdfExport'
import { generateWord } from './utils/wordExport'
import { PROJECT_TYPES, getSubTypeById } from './data/projectTypes'
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
  defaultMaterialMarkup: 30,
  defaultMarginMin: 55,
  defaultMarginMid: 60,
  defaultMarginMax: 65,
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
    },
    scopeOfWork: '',
    exclusions: '',
    internalNotes: '',
  }
}

export default function App() {
  const [company, setCompany] = useState<CompanySettings>(() => {
    try { return JSON.parse(localStorage.getItem('ttc_company') || 'null') || DEFAULT_COMPANY }
    catch { return DEFAULT_COMPANY }
  })

  const [estimate, setEstimate] = useState<Estimate>(() => newEstimate(company))
  const [activeView, setActiveView] = useState<'contractor' | 'client'>('contractor')
  const [showSettings, setShowSettings] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>(() => {
    try { return JSON.parse(localStorage.getItem('ttc_estimates') || '[]') }
    catch { return [] }
  })
  const [sections, setSections] = useState<Record<string, boolean>>({
    client: true, project: true, measurements: true,
    materials: true, labor: true, overhead: true, scope: false,
  })

  const totals = calcTotals(estimate)

  const saveCompany = (c: CompanySettings) => {
    setCompany(c)
    localStorage.setItem('ttc_company', JSON.stringify(c))
  }

  const saveCurrentEstimate = useCallback(() => {
    const saved: SavedEstimate = {
      id: estimate.id,
      estimateNumber: estimate.estimateNumber,
      clientName: estimate.client.name || 'Unnamed Client',
      projectType: estimate.projectType,
      totalQuote: totals.selectedQuote,
      status: estimate.status,
      createdAt: estimate.createdAt,
      data: estimate,
    }
    setSavedEstimates(prev => {
      const filtered = prev.filter(s => s.id !== estimate.id)
      const updated = [saved, ...filtered].slice(0, 50)
      localStorage.setItem('ttc_estimates', JSON.stringify(updated))
      return updated
    })
  }, [estimate, totals.selectedQuote])

  const loadEstimate = (saved: SavedEstimate) => {
    setEstimate(saved.data)
    setShowSaved(false)
  }

  const startNewEstimate = () => {
    saveCurrentEstimate()
    setEstimate(newEstimate(company))
  }

  const toggle = (key: string) =>
    setSections(s => ({ ...s, [key]: !s[key] }))

  const updateClient = (field: string, value: string) =>
    setEstimate(e => ({ ...e, client: { ...e.client, [field]: value } }))

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

    const materials: MaterialItem[] = sub.defaultMaterials.map(dm => ({
      id: uuidv4(),
      category: dm.category,
      name: dm.name,
      quantity: Math.max(0, evalFormula(dm.quantityFormula, vars)),
      unit: dm.unit,
      unitCost: dm.baseUnitCost,
      markup: estimate.settings.materialMarkupPercent,
      notes: dm.notes || '',
    }))

    const labor: LaborItem[] = sub.defaultLabor.map(dl => ({
      id: uuidv4(),
      description: dl.description,
      workers: dl.workers,
      hours: Math.max(0, evalFormula(dl.hoursFormula, vars)),
      ratePerHour: dl.ratePerHour,
      notes: '',
    }))

    const overhead: OverheadItem[] = sub.defaultOverhead
      .map(do_ => ({
        id: uuidv4(),
        description: do_.description,
        cost: Math.max(0, evalFormula(do_.costFormula, vars)),
      }))
      .filter(o => o.cost > 0)

    setEstimate(e => ({ ...e, measurements: meas, materials, labor, overhead }))
  }, [estimate.projectType, estimate.projectSubType, estimate.settings.materialMarkupPercent])

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

  const handlePDF = () => generatePDF(estimate, totals, company, activeView)
  const handleWord = () => generateWord(estimate, totals, company, activeView)
  const handlePrint = () => window.print()

  const convertToInvoice = () =>
    setEstimate(e => ({ ...e, type: 'invoice', status: 'sent' }))

  // Auto-save every 30 seconds
  useEffect(() => {
    const t = setInterval(saveCurrentEstimate, 30000)
    return () => clearInterval(t)
  }, [saveCurrentEstimate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
          {/* Client Info */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('client')}>
              <span className="font-semibold text-sm flex items-center gap-2">👤 Client Information</span>
              <span className="text-gray-400 text-xs">{sections.client ? '▲' : '▼'}</span>
            </div>
            {sections.client && (
              <div className="p-4">
                <ClientInfoForm client={estimate.client} onChange={updateClient} />
              </div>
            )}
          </div>

          {/* Project Type */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('project')}>
              <span className="font-semibold text-sm flex items-center gap-2">🔨 Project Type</span>
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
                  onTypeChange={setProjectType}
                  onSubTypeChange={setProjectSubType}
                  onDescriptionChange={v => setEstimate(e => ({ ...e, projectDescription: v }))}
                  onJobAddressChange={v => setEstimate(e => ({ ...e, jobAddress: v }))}
                />
              </div>
            )}
          </div>

          {/* Measurements */}
          {estimate.measurements.length > 0 && (
            <div className="card">
              <div className="section-header" onClick={() => toggle('measurements')}>
                <span className="font-semibold text-sm flex items-center gap-2">📐 Measurements</span>
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
                    ↺ Re-calculate materials & labor from measurements
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Materials */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('materials')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                🧱 Materials
                {estimate.materials.length > 0 && (
                  <span className="tag bg-blue-100 text-blue-700">{estimate.materials.length} items</span>
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
                />
              </div>
            )}
          </div>

          {/* Labor */}
          <div className="card">
            <div className="section-header" onClick={() => toggle('labor')}>
              <span className="font-semibold text-sm flex items-center gap-2">
                👷 Labor
                {estimate.labor.length > 0 && (
                  <span className="tag bg-green-100 text-green-700">{estimate.labor.length} items</span>
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
                🚛 Overhead & Equipment
                {estimate.overhead.length > 0 && (
                  <span className="tag bg-amber-100 text-amber-700">{estimate.overhead.length} items</span>
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
              <span className="font-semibold text-sm flex items-center gap-2">📝 Scope of Work & Notes</span>
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
              🔒 Contractor View
            </button>
            <button
              onClick={() => setActiveView('client')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeView === 'client' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              👤 Client Quote View
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
            Contractor View
          </button>
          <button
            onClick={() => setActiveView('client')}
            className={`flex-1 py-2 text-xs font-semibold ${activeView === 'client' ? 'text-brand-600' : 'text-gray-500'}`}
          >
            Client View
          </button>
        </div>
      </div>

      {/* Print area — Client Quote Only */}
      <div className="hidden print-area p-8">
        <ClientQuote estimate={estimate} totals={totals} company={company} />
      </div>

      {/* Modals */}
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
    </div>
  )
}
