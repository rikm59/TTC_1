import { useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import type { MaterialItem, PriceBookItem } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  materials: MaterialItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
  onDuplicate?: (id: string) => void
  onSetAllMarkup?: (markup: number) => void
  defaultMarkup: number
  isLaborOnly?: boolean
  showLaborOnlyMaterials?: boolean
  onToggleLaborOnlyMaterials?: () => void
  onOpenPriceBook?: () => void
  onSaveToPriceBook?: (mat: MaterialItem) => void
  priceBook?: PriceBookItem[]
  onBulkAdd?: (items: Array<{ name: string; quantity: number; unit: string; unitCost: number }>) => void
}

const CATEGORIES = ['Coating', 'Paint', 'Lumber', 'Concrete', 'Hardware', 'Fencing', 'Flooring', 'Tile', 'Drywall', 'Framing', 'Electrical', 'Plumbing', 'HVAC', 'Landscaping', 'Roofing', 'Supplies', 'Other']

export default function MaterialsTable({ materials, onAdd, onUpdate, onRemove, onDuplicate, onSetAllMarkup, defaultMarkup, isLaborOnly, showLaborOnlyMaterials, onToggleLaborOnlyMaterials, onOpenPriceBook, onSaveToPriceBook, priceBook, onBulkAdd }: Props) {
  const { t, lang } = useLanguage()
  const total = materials.reduce((s, m) => s + m.quantity * m.unitCost, 0)
  const totalWithMarkup = materials.reduce((s, m) => s + m.quantity * m.unitCost * (1 + m.markup / 100), 0)

  const [showMarkupPopover, setShowMarkupPopover] = useState(false)
  const [bulkMarkupInput, setBulkMarkupInput] = useState(String(defaultMarkup))
  const markupPopoverRef = useRef<HTMLDivElement>(null)
  const [acRowId, setAcRowId] = useState<string | null>(null)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const parsePaste = () => {
    const items = pasteText.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const cols = line.split(',').map(c => c.trim())
        const name = cols[0]
        if (!name) return null
        return {
          name,
          quantity: parseFloat(cols[1]) || 1,
          unit: cols[2] || 'ea',
          unitCost: parseFloat(cols[3]) || 0,
        }
      })
      .filter((x): x is { name: string; quantity: number; unit: string; unitCost: number } => x !== null)
    if (items.length > 0 && onBulkAdd) {
      onBulkAdd(items)
      setPasteText('')
      setShowPaste(false)
    }
  }

  const pbMaterials = (priceBook ?? []).filter(p => p.type === 'material')

  const getMatches = (name: string) => {
    if (!name.trim() || pbMaterials.length === 0) return []
    const q = name.toLowerCase()
    return pbMaterials.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6)
  }

  const stalePriceItems = materials.filter(m => {
    if (!m.name.trim()) return false
    const match = pbMaterials.find(p => p.name.toLowerCase() === m.name.toLowerCase())
    return match && Math.abs(match.cost - m.unitCost) > 0.01
  })

  const syncPrices = () => {
    stalePriceItems.forEach(m => {
      const match = pbMaterials.find(p => p.name.toLowerCase() === m.name.toLowerCase())!
      onUpdate(m.id, 'unitCost', match.cost)
    })
  }

  const catTotals = Object.entries(
    materials.reduce((acc, m) => {
      if (!m.name.trim() || m.quantity * m.unitCost === 0) return acc
      const cat = m.category || 'Other'
      acc[cat] = (acc[cat] ?? 0) + m.quantity * m.unitCost
      return acc
    }, {} as Record<string, number>)
  ).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

  const applyPbItem = (rowId: string, item: PriceBookItem) => {
    onUpdate(rowId, 'name', item.name)
    onUpdate(rowId, 'unit', item.unit)
    onUpdate(rowId, 'unitCost', item.cost)
    onUpdate(rowId, 'markup', item.defaultMarkup)
    if (item.category) onUpdate(rowId, 'category', item.category)
    setAcRowId(null)
  }

  const applyBulkMarkup = () => {
    const val = parseFloat(bulkMarkupInput)
    if (!isNaN(val) && val >= 0 && onSetAllMarkup) {
      onSetAllMarkup(val)
    }
    setShowMarkupPopover(false)
  }

  return (
    <div className="space-y-2">
      {/* Labor Only toggle */}
      {isLaborOnly && (
        <label className="flex items-center gap-2 cursor-pointer mb-2 p-2 rounded-lg bg-green-50 border border-green-100">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-green-600"
            checked={showLaborOnlyMaterials}
            onChange={onToggleLaborOnlyMaterials}
          />
          <span className="text-xs font-medium text-green-800">{t('mat.laborOnlyToggle')}</span>
          <span className="text-xs text-green-600 italic">— {t('mat.laborOnlyHint')}</span>
        </label>
      )}

      {(!isLaborOnly || showLaborOnlyMaterials) && (
        <>
          {materials.length > 0 && (
            <>
              {/* ── Mobile card layout (hidden on sm+) ── */}
              <div className="sm:hidden space-y-2">
                {materials.map(m => {
                  const effectiveQty = m.quantity * (1 + (m.wastePct ?? 0) / 100)
                  const clientUnit = m.unitCost * (1 + m.markup / 100)
                  const rowTotal = effectiveQty * m.unitCost
                  return (
                    <div key={m.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            className="w-full form-input text-sm"
                            value={m.name}
                            onChange={e => { onUpdate(m.id, 'name', e.target.value); setAcRowId(m.id) }}
                            onFocus={() => setAcRowId(m.id)}
                            onBlur={() => setTimeout(() => setAcRowId(null), 150)}
                            placeholder={t('mat.namePlaceholder')}
                          />
                          {acRowId === m.id && getMatches(m.name).length > 0 && (
                            <div className="absolute left-0 top-full mt-0.5 z-30 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-48 overflow-y-auto">
                              {getMatches(m.name).map(item => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={e => { e.preventDefault(); applyPbItem(m.id, item) }}
                                  className="w-full text-left px-3 py-2 hover:bg-brand-50 text-xs border-b border-gray-50 last:border-0"
                                >
                                  <span className="font-medium text-gray-800">{item.name}</span>
                                  <span className="text-gray-400 ml-2">{fmt(item.cost)}/{item.unit}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {onDuplicate && (
                          <button
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition text-sm"
                            title={lang === 'es' ? 'Duplicar fila' : 'Duplicate row'}
                            onClick={() => onDuplicate(m.id)}
                          >⊕</button>
                        )}
                        <button
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-base font-bold"
                          onClick={() => onRemove(m.id)}
                        >×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="form-label">{t('mat.category')}</label>
                          <select className="form-input text-xs" value={m.category} onChange={e => onUpdate(m.id, 'category', e.target.value)}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">{t('mat.unit')}</label>
                          <input className="form-input text-xs" value={m.unit} onChange={e => onUpdate(m.id, 'unit', e.target.value)} placeholder="ea" />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="form-label">{t('mat.qty')}</label>
                          <input type="number" min="0" step="any" className="form-input text-xs" value={m.quantity} onChange={e => onUpdate(m.id, 'quantity', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label className="form-label">{t('mat.unitCost')}</label>
                          <input type="number" min="0" step="0.01" className="form-input text-xs" value={m.unitCost} onChange={e => onUpdate(m.id, 'unitCost', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label className="form-label">{t('mat.markup')} %</label>
                          <input type="number" min="0" max="300" className="form-input text-xs" value={m.markup} onChange={e => onUpdate(m.id, 'markup', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label className="form-label" title={lang === 'es' ? 'Desperdicio/sobrante' : 'Waste/overage'}>{lang === 'es' ? 'Desp%' : 'Waste%'}</label>
                          <input type="number" min="0" max="50" step="1" className="form-input text-xs" value={m.wastePct ?? 0} onChange={e => onUpdate(m.id, 'wastePct', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <input
                        className="form-input text-xs text-gray-500 placeholder-gray-300"
                        value={m.notes}
                        onChange={e => onUpdate(m.id, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                      />
                      <div className="flex justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
                        <span>
                          {t('mat.clientPrice')}: <strong>{fmt(clientUnit)}</strong>/ea
                          {(m.wastePct ?? 0) > 0 && (
                            <span className="ml-1.5 text-orange-500 font-medium">+{m.wastePct}% waste → {effectiveQty.toFixed(2)} {m.unit}</span>
                          )}
                        </span>
                        <span>{t('mat.total')}: <strong className="text-gray-800">{fmt(rowTotal)}</strong></span>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between text-xs font-semibold pt-1 px-1 border-t border-gray-200">
                  <span className="text-gray-500">{t('mat.costTotal')} <span className="text-gray-800">{fmt(total)}</span></span>
                  <span className="text-brand-700">{t('mat.clientTotal')} {fmt(totalWithMarkup)}</span>
                </div>
              </div>

              {/* ── Desktop table layout (hidden below sm) ── */}
              <div className="hidden sm:block overflow-x-auto -mx-4">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-100">
                      <th className="text-left py-2 px-3 font-semibold text-gray-500 w-[28%]">{t('mat.item')}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-500 w-[12%]">{t('mat.category')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[9%]">{t('mat.qty')}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-500 w-[8%]">{t('mat.unit')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[11%]">{t('mat.unitCost')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[8%]">{t('mat.markup')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[7%]" title={lang === 'es' ? 'Desperdicio %' : 'Waste %'}>{lang === 'es' ? 'Desp%' : 'Waste%'}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[10%]">{t('mat.clientPrice')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[9%]">{t('mat.total')}</th>
                      <th className="w-6 px-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map(m => {
                      const effectiveQty = m.quantity * (1 + (m.wastePct ?? 0) / 100)
                      const clientUnit = m.unitCost * (1 + m.markup / 100)
                      const rowTotal = effectiveQty * m.unitCost
                      return (
                        <>
                          <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                            <td className="py-1.5 px-3 relative">
                              <input
                                className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                                value={m.name}
                                onChange={e => { onUpdate(m.id, 'name', e.target.value); setAcRowId(m.id) }}
                                onFocus={() => setAcRowId(m.id)}
                                onBlur={() => setTimeout(() => setAcRowId(null), 150)}
                                placeholder={t('mat.namePlaceholder')}
                              />
                              {acRowId === m.id && getMatches(m.name).length > 0 && (
                                <div className="absolute left-3 top-full mt-0.5 z-30 bg-white border border-gray-200 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto">
                                  {getMatches(m.name).map(item => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onMouseDown={e => { e.preventDefault(); applyPbItem(m.id, item) }}
                                      className="w-full text-left px-3 py-2 hover:bg-brand-50 text-xs border-b border-gray-50 last:border-0"
                                    >
                                      <span className="font-medium text-gray-800">{item.name}</span>
                                      <span className="text-gray-400 ml-2">{fmt(item.cost)}/{item.unit}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-2">
                              <select
                                className="w-full bg-transparent border-0 focus:outline-none text-xs focus:bg-white focus:border focus:border-brand-300 rounded"
                                value={m.category}
                                onChange={e => onUpdate(m.id, 'category', e.target.value)}
                              >
                                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number" min="0" step="any"
                                className="w-full bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                                value={m.quantity}
                                onChange={e => onUpdate(m.id, 'quantity', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5 text-xs"
                                value={m.unit}
                                onChange={e => onUpdate(m.id, 'unit', e.target.value)}
                                placeholder="ea"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number" min="0" step="0.01"
                                className="w-full bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                                value={m.unitCost}
                                onChange={e => onUpdate(m.id, 'unitCost', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <div className="flex items-center justify-end gap-0.5">
                                <input
                                  type="number" min="0" max="300"
                                  className="w-12 bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                                  value={m.markup}
                                  onChange={e => onUpdate(m.id, 'markup', parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-gray-400">%</span>
                              </div>
                            </td>
                            <td className="py-1.5 px-2">
                              <div className="flex items-center justify-end gap-0.5">
                                <input
                                  type="number" min="0" max="50" step="1"
                                  className="w-10 bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5 text-orange-500"
                                  value={m.wastePct ?? 0}
                                  onChange={e => onUpdate(m.id, 'wastePct', parseFloat(e.target.value) || 0)}
                                  title={lang === 'es' ? 'Desperdicio/sobrante %' : 'Waste/overage %'}
                                />
                                <span className="text-gray-400">%</span>
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-right text-gray-600">{fmt(clientUnit)}</td>
                            <td className="py-1.5 px-2 text-right font-medium">{fmt(rowTotal)}</td>
                            <td className="py-1.5 px-1">
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                                {onDuplicate && (
                                  <button
                                    className="text-gray-400 hover:text-brand-600 transition px-1 py-0.5 rounded text-xs"
                                    title={lang === 'es' ? 'Duplicar fila' : 'Duplicate row'}
                                    onClick={() => onDuplicate(m.id)}
                                  >⊕</button>
                                )}
                                {onSaveToPriceBook && (
                                  <button
                                    className="text-gray-400 hover:text-brand-600 transition px-1 py-0.5 rounded text-xs"
                                    title={lang === 'es' ? 'Guardar en catálogo' : 'Save to price book'}
                                    onClick={() => onSaveToPriceBook(m)}
                                  >💾</button>
                                )}
                                <button className="btn-danger" onClick={() => onRemove(m.id)}>×</button>
                              </div>
                            </td>
                          </tr>
                          <tr key={m.id + '-notes'} className="border-b border-gray-50">
                            <td colSpan={9} className="px-3 pb-1.5">
                              <input
                                className="w-full text-[11px] text-gray-400 bg-transparent border-0 focus:outline-none focus:bg-gray-50 rounded px-1 py-0.5 placeholder-gray-300"
                                value={m.notes}
                                onChange={e => onUpdate(m.id, 'notes', e.target.value)}
                                placeholder="Notes…"
                              />
                            </td>
                          </tr>
                        </>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                      <td colSpan={7} className="py-2 px-3 text-right text-xs text-gray-500">
                        {t('mat.costTotal')} <span className="text-gray-800">{fmt(total)}</span>
                        &nbsp;&nbsp;|&nbsp;&nbsp;
                        {t('mat.clientTotal')} <span className="text-brand-700">{fmt(totalWithMarkup)}</span>
                      </td>
                      <td className="py-2 px-2 text-right text-sm">{fmt(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* Per-category cost breakdown */}
          {catTotals.length >= 2 && (
            <div className="flex flex-wrap gap-1.5 pt-2 mt-1 border-t border-gray-100">
              {catTotals.map(([cat, val]) => (
                <span key={cat} className="text-[10px] px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full font-medium">
                  {cat}: <span className="font-bold">{fmt(val)}</span>
                </span>
              ))}
            </div>
          )}

          {materials.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-4">{t('mat.empty')}</p>
      )}

      <div className="flex gap-2 mt-1 flex-wrap items-center">
        <button onClick={onAdd} className="btn-secondary text-xs">
          {t('mat.add')}
        </button>
        {onBulkAdd && (
          <button
            onClick={() => setShowPaste(v => !v)}
                className={`btn-secondary text-xs flex items-center gap-1 ${showPaste ? 'bg-brand-50 border-brand-300 text-brand-700' : ''}`}
                title={lang === 'es' ? 'Pegar lista de materiales' : 'Paste a list of materials'}
              >
                📋 {lang === 'es' ? 'Pegar lista' : 'Paste list'}
              </button>
            )}
            {stalePriceItems.length > 0 && (
              <button
                type="button"
                onClick={syncPrices}
                className="btn-secondary text-xs text-amber-600 border-amber-200 hover:bg-amber-50 flex items-center gap-1"
                title={lang === 'es' ? 'Actualizar precios desde el catálogo' : 'Update prices from price book'}
              >
                🔄 {lang === 'es'
                  ? `Actualizar ${stalePriceItems.length}`
                  : `Sync ${stalePriceItems.length} price${stalePriceItems.length > 1 ? 's' : ''}`}
              </button>
            )}
            {onOpenPriceBook && (
              <button onClick={onOpenPriceBook} className="btn-secondary text-xs">
                📖 {lang === 'es' ? 'Catálogo' : 'Price Book'}
              </button>
            )}
            {onSetAllMarkup && materials.length > 1 && (
              <div className="relative" ref={markupPopoverRef}>
                <button
                  type="button"
                  onClick={() => { setBulkMarkupInput(String(defaultMarkup)); setShowMarkupPopover(v => !v) }}
                  className="btn-secondary text-xs flex items-center gap-1"
                  title={lang === 'es' ? 'Aplicar mismo markup a todos' : 'Set all markups at once'}
                >
                  ⚡ {lang === 'es' ? 'Todo markup' : 'Set all markup'}
                </button>
                {showMarkupPopover && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMarkupPopover(false)} />
                    <div className="absolute left-0 bottom-full mb-1.5 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-20 w-52">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        {lang === 'es' ? 'Markup para todos los materiales' : 'Apply markup % to all materials'}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="300"
                          className="form-input text-xs w-20"
                          value={bulkMarkupInput}
                          onChange={e => setBulkMarkupInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && applyBulkMarkup()}
                          autoFocus
                        />
                        <span className="text-sm text-gray-500">%</span>
                        <button
                          type="button"
                          onClick={applyBulkMarkup}
                          className="btn-primary text-xs"
                        >
                          {lang === 'es' ? 'Aplicar' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Paste list panel */}
          {showPaste && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <p className="text-xs text-gray-500">
                {lang === 'es'
                  ? 'Una línea por material: nombre, cantidad, unidad, costo'
                  : 'One item per line: name, quantity, unit, cost'}
              </p>
              <textarea
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-300 bg-white resize-none h-28 font-mono placeholder-gray-300"
                placeholder={'Paint, 5, gal, 45.00\n2x4 Lumber, 20, ea, 3.50\nScrews, 2, box, 12.00'}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={parsePaste}
                  className="btn-primary text-xs"
                  disabled={!pasteText.trim()}
                >
                  ✓ {lang === 'es' ? 'Agregar items' : 'Add items'}
                </button>
                <button
                  onClick={() => { setShowPaste(false); setPasteText('') }}
                  className="btn-secondary text-xs"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
