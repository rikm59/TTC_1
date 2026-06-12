import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { PriceBookItem, MaterialItem, LaborItem } from '../../types'
import { useLanguage } from '../../context/LanguageContext'
import { fmt } from '../../utils/calculations'

function escapeCSV(val: string | number): string {
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      result.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result
}

const CATEGORIES = ['Coating', 'Paint', 'Lumber', 'Concrete', 'Hardware', 'Fencing', 'Flooring', 'Tile', 'Drywall', 'Framing', 'Electrical', 'Plumbing', 'HVAC', 'Landscaping', 'Roofing', 'Supplies', 'Other']

interface Props {
  items: PriceBookItem[]
  defaultMarkup: number
  initialTab?: 'material' | 'labor'
  onAddMaterial: (item: Omit<MaterialItem, 'id'>) => void
  onAddLabor: (item: Omit<LaborItem, 'id'>) => void
  onSave: (item: PriceBookItem) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const emptyMat = (): Omit<PriceBookItem, 'id' | 'lastUpdated'> => ({
  type: 'material', name: '', category: 'Other', unit: 'ea', cost: 0, defaultMarkup: 0,
})
const emptyLab = (): Omit<PriceBookItem, 'id' | 'lastUpdated'> => ({
  type: 'labor', name: '', category: 'Labor', unit: 'hr', cost: 0, defaultMarkup: 0,
})

export default function PriceBookModal({ items, defaultMarkup, initialTab = 'material', onAddMaterial, onAddLabor, onSave, onDelete, onClose }: Props) {
  const { lang } = useLanguage()
  const [tab, setTab] = useState<'material' | 'labor'>(initialTab)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<PriceBookItem, 'id' | 'lastUpdated'>>(emptyMat())
  const importRef = useRef<HTMLInputElement>(null)

  const exportToCSV = () => {
    const header = 'type,name,category,unit,cost,defaultMarkup'
    const rows = items.map(i =>
      [i.type, i.name, i.category, i.unit, i.cost, i.defaultMarkup].map(escapeCSV).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'price_book.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) return
      let imported = 0
      const existingNames = new Set(items.map(i => i.name.toLowerCase()))
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (cols.length < 5) continue
        const [rawType, rawName, rawCat, rawUnit, rawCost, rawMarkup] = cols
        const type = rawType.trim().toLowerCase()
        if (type !== 'material' && type !== 'labor') continue
        const name = rawName.trim()
        if (!name || existingNames.has(name.toLowerCase())) continue
        const cost = parseFloat(rawCost) || 0
        if (cost <= 0) continue
        onSave({
          id: uuidv4(),
          type: type as 'material' | 'labor',
          name,
          category: rawCat.trim() || (type === 'labor' ? 'Labor' : 'Other'),
          unit: rawUnit.trim() || 'ea',
          cost,
          defaultMarkup: parseFloat(rawMarkup) || 0,
          lastUpdated: new Date().toISOString(),
        })
        existingNames.add(name.toLowerCase())
        imported++
      }
      alert(imported > 0
        ? `${imported} item${imported !== 1 ? 's' : ''} imported.`
        : (lang === 'es' ? 'No se importaron ítems nuevos.' : 'No new items imported.')
      )
    }
    reader.readAsText(file)
    if (importRef.current) importRef.current.value = ''
  }

  const filtered = items.filter(i =>
    i.type === tab &&
    (i.name.toLowerCase().includes(search.toLowerCase()) ||
     i.category.toLowerCase().includes(search.toLowerCase()))
  )

  const set = (k: keyof typeof form, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleTabChange = (t: 'material' | 'labor') => {
    setTab(t)
    setShowForm(false)
    setForm(t === 'material' ? emptyMat() : emptyLab())
  }

  const handleSaveNew = () => {
    if (!form.name.trim() || form.cost <= 0) return
    onSave({
      ...form,
      id: uuidv4(),
      lastUpdated: new Date().toISOString(),
    })
    setForm(tab === 'material' ? emptyMat() : emptyLab())
    setShowForm(false)
  }

  const handleAdd = (item: PriceBookItem) => {
    if (item.type === 'material') {
      onAddMaterial({
        category: item.category,
        name: item.name,
        quantity: 1,
        unit: item.unit,
        unitCost: item.cost,
        markup: item.defaultMarkup > 0 ? item.defaultMarkup : defaultMarkup,
        notes: '',
      })
    } else {
      onAddLabor({
        description: item.name,
        workers: 1,
        hours: 8,
        ratePerHour: item.cost,
        notes: '',
      })
    }
    onClose()
  }

  const matCount = items.filter(i => i.type === 'material').length
  const laborCount = items.filter(i => i.type === 'labor').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg">
              {lang === 'es' ? '📖 Catálogo de Precios' : '📖 Price Book'}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === 'es'
                ? 'Guarda materiales y mano de obra frecuentes para reutilizar'
                : 'Save frequently used materials & labor rates'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3">
          {(['material', 'labor'] as const).map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'material'
                ? (lang === 'es' ? `Materiales (${matCount})` : `Materials (${matCount})`)
                : (lang === 'es' ? `Mano de Obra (${laborCount})` : `Labor (${laborCount})`)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-6 py-2">
          <input
            className="form-input text-sm"
            placeholder={lang === 'es' ? 'Buscar…' : 'Search…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* New item form */}
        {showForm && (
          <div className="mx-6 mb-2 p-3 rounded-xl bg-brand-50 border border-brand-100 space-y-2">
            <p className="text-xs font-semibold text-brand-800">
              {lang === 'es' ? '+ Nuevo ítem' : '+ New item'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input
                  className="form-input text-sm"
                  placeholder={lang === 'es' ? 'Nombre del ítem' : 'Item name'}
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
              {tab === 'material' && (
                <select
                  className="form-input text-sm"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              )}
              <input
                className="form-input text-sm"
                placeholder={lang === 'es' ? 'Unidad (ej: sq ft)' : 'Unit (e.g. sq ft)'}
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
              />
              <div>
                <label className="form-label">
                  {tab === 'material'
                    ? (lang === 'es' ? 'Costo unitario ($)' : 'Unit cost ($)')
                    : (lang === 'es' ? 'Tarifa/hr ($)' : 'Rate/hr ($)')}
                </label>
                <input
                  type="number" min="0" step="0.01"
                  className="form-input text-sm"
                  value={form.cost || ''}
                  onChange={e => set('cost', parseFloat(e.target.value) || 0)}
                />
              </div>
              {tab === 'material' && (
                <div>
                  <label className="form-label">{lang === 'es' ? 'Margen % (0 = default)' : 'Markup % (0 = default)'}</label>
                  <input
                    type="number" min="0" max="300"
                    className="form-input text-sm"
                    value={form.defaultMarkup || ''}
                    onChange={e => set('defaultMarkup', parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-xs">
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveNew}
                disabled={!form.name.trim() || form.cost <= 0}
                className="btn-primary text-xs"
              >
                {lang === 'es' ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📖</div>
              <p className="text-sm font-semibold">
                {search
                  ? (lang === 'es' ? 'Sin resultados' : 'No results')
                  : (lang === 'es' ? 'Catálogo vacío' : 'Price book is empty')}
              </p>
              {!search && (
                <p className="text-xs mt-1 max-w-xs mx-auto text-gray-400">
                  {lang === 'es'
                    ? 'Guarda ítems para reutilizarlos en futuros estimados.'
                    : 'Save items to reuse them on future estimates.'}
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 group transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.category} · {item.unit}
                      {item.type === 'material' && item.defaultMarkup > 0 && (
                        <span className="text-gray-400"> · {item.defaultMarkup}% markup</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-700 text-sm">{fmt(item.cost)}</p>
                    <p className="text-xs text-gray-400">/{item.unit}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleAdd(item)}
                      className="btn-primary text-xs"
                    >
                      {lang === 'es' ? '+ Agregar' : '+ Add'}
                    </button>
                    <button
                      onClick={() => { if (confirm(lang === 'es' ? '¿Eliminar del catálogo?' : 'Remove from price book?')) onDelete(item.id) }}
                      className="btn-secondary text-xs text-red-500 hover:text-red-700"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setShowForm(true); setForm(tab === 'material' ? emptyMat() : emptyLab()) }}
              className="btn-secondary text-xs"
            >
              + {lang === 'es' ? 'Agregar' : 'Add item'}
            </button>
            <button
              onClick={exportToCSV}
              disabled={items.length === 0}
              className="btn-secondary text-xs disabled:opacity-40"
              title={lang === 'es' ? 'Exportar todo a CSV' : 'Export all items to CSV'}
            >
              ↓ CSV
            </button>
            <label
              className="btn-secondary text-xs cursor-pointer"
              title={lang === 'es' ? 'Importar desde CSV' : 'Import from CSV file'}
            >
              ↑ {lang === 'es' ? 'Importar' : 'Import'}
              <input
                ref={importRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportCSV}
              />
            </label>
          </div>
          <button onClick={onClose} className="btn-secondary">
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
