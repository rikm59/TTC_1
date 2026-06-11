import { useRef, useState } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import { useLanguage } from '../../context/LanguageContext'
import type { SavedEstimate } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  estimates: SavedEstimate[]
  onLoad: (e: SavedEstimate) => void
  onDuplicate: (e: SavedEstimate) => void
  onDelete: (id: string) => void
  onDeleteMany: (ids: string[]) => void
  onStatusChangeMany: (ids: string[], status: SavedEstimate['status']) => void
  onStatusChange: (id: string, status: SavedEstimate['status']) => void
  onConvertToInvoice?: (e: SavedEstimate) => void
  onNoteChange?: (id: string, note: string) => void
  onClose: () => void
}

const statusBadge: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

function getExpiryBadge(e: SavedEstimate, lang: string): { label: string; cls: string } | null {
  if (e.status !== 'sent') return null
  const validity = e.data?.settings?.validityDays ?? 30
  const expiresAt = addDays(new Date(e.createdAt), validity)
  const daysLeft = differenceInDays(expiresAt, new Date())
  if (daysLeft < 0) return {
    label: lang === 'es' ? 'VENCIDO' : 'EXPIRED',
    cls: 'bg-red-100 text-red-700',
  }
  if (daysLeft === 0) return {
    label: lang === 'es' ? 'Vence hoy' : 'Expires today',
    cls: 'bg-amber-100 text-amber-700',
  }
  if (daysLeft <= 7) return {
    label: lang === 'es' ? `${daysLeft}d restantes` : `${daysLeft}d left`,
    cls: 'bg-amber-100 text-amber-700',
  }
  return null
}

export default function SavedEstimatesList({ estimates, onLoad, onDuplicate, onDelete, onDeleteMany, onStatusChangeMany, onStatusChange, onConvertToInvoice, onNoteChange, onClose }: Props) {
  const { t, lang } = useLanguage()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | SavedEstimate['status']>('all')
  const [openStatusRowId, setOpenStatusRowId] = useState<string | null>(null)
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  const filtered = estimates.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return e.clientName.toLowerCase().includes(q)
      || e.estimateNumber.toLowerCase().includes(q)
      || (e.projectType ?? '').toLowerCase().includes(q)
  })

  const exportToCSV = () => {
    const header = lang === 'es'
      ? ['#', 'Cliente', 'Tipo', 'Total', 'Estado', 'Fecha', 'Nota']
      : ['#', 'Client', 'Project Type', 'Total', 'Status', 'Date', 'Note']
    const esc = (v: string | number) => {
      const s = String(v)
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = filtered.map(e => [
      e.estimateNumber,
      e.clientName,
      (e.projectType ?? '').replace(/-/g, ' '),
      e.totalQuote.toFixed(2),
      e.status,
      format(new Date(e.createdAt), 'yyyy-MM-dd'),
      e.internalNote ?? '',
    ])
    const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estimates_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const allSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id))

  const toggle = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleAll = () =>
    setSelected(prev => {
      const s = new Set(prev)
      if (allSelected) filtered.forEach(e => s.delete(e.id))
      else filtered.forEach(e => s.add(e.id))
      return s
    })

  const [showStatusPicker, setShowStatusPicker] = useState(false)

  const handleBulkDelete = () => {
    const ids = [...selected].filter(id => filtered.some(e => e.id === id))
    if (!confirm(t('saved.bulkDeleteConfirm', { n: String(ids.length) }))) return
    onDeleteMany(ids)
    setSelected(new Set())
  }

  const handleBulkStatus = (status: SavedEstimate['status']) => {
    const ids = [...selected].filter(id => filtered.some(e => e.id === id))
    onStatusChangeMany(ids, status)
    setSelected(new Set())
    setShowStatusPicker(false)
  }

  const selectedInView = filtered.filter(e => selected.has(e.id)).length

  const pipeline = estimates.filter(e => e.status === 'draft' || e.status === 'sent').reduce((s, e) => s + e.totalQuote, 0)
  const revenue  = estimates.filter(e => e.status === 'accepted').reduce((s, e) => s + e.totalQuote, 0)
  const terminal = estimates.filter(e => e.status === 'accepted' || e.status === 'declined').length
  const winRate  = terminal > 0 ? estimates.filter(e => e.status === 'accepted').length / terminal * 100 : null
  const avgQuote = estimates.length > 0 ? estimates.reduce((s, e) => s + e.totalQuote, 0) / estimates.length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{t('saved.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        {/* Analytics strip */}
        {estimates.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b">
            <div className="px-4 py-3 text-center border-r border-gray-100">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">{lang === 'es' ? 'Pipeline' : 'Pipeline'}</p>
              <p className="text-sm font-bold text-brand-700">{fmt(pipeline)}</p>
            </div>
            <div className="px-4 py-3 text-center sm:border-r border-gray-100">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">{lang === 'es' ? 'Ingresos' : 'Revenue'}</p>
              <p className="text-sm font-bold text-green-700">{fmt(revenue)}</p>
            </div>
            <div className="px-4 py-3 text-center border-r border-t sm:border-t-0 border-gray-100">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">{lang === 'es' ? 'Tasa de éxito' : 'Win rate'}</p>
              <p className="text-sm font-bold text-blue-700">{winRate !== null ? `${winRate.toFixed(0)}%` : '—'}</p>
            </div>
            <div className="px-4 py-3 text-center border-t sm:border-t-0 border-gray-100">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">{lang === 'es' ? 'Promedio' : 'Avg. quote'}</p>
              <p className="text-sm font-bold text-gray-700">{fmt(avgQuote)}</p>
            </div>
          </div>
        )}

        {/* Search */}
        {estimates.length > 0 && (
          <div className="px-6 pt-2 pb-0 border-b">
            <input
              className="form-input text-sm mb-2"
              placeholder={lang === 'es' ? 'Buscar por cliente, # o tipo…' : 'Search by client, #, or type…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {/* Status filter chips */}
            <div className="flex gap-1.5 pb-2 flex-wrap">
              {(['all', 'draft', 'sent', 'accepted', 'declined'] as const).map(s => {
                const count = s === 'all' ? estimates.length : estimates.filter(e => e.status === s).length
                if (s !== 'all' && count === 0) return null
                const label = lang === 'es'
                  ? s === 'all' ? 'Todo' : s === 'draft' ? 'Borrador' : s === 'sent' ? 'Enviado' : s === 'accepted' ? 'Aceptado' : 'Rechazado'
                  : s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)
                const activeClass = s === 'all' ? 'bg-gray-700 text-white'
                  : s === 'draft' ? 'bg-gray-500 text-white'
                  : s === 'sent' ? 'bg-blue-600 text-white'
                  : s === 'accepted' ? 'bg-green-600 text-white'
                  : 'bg-red-500 text-white'
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors border ${
                      filterStatus === s
                        ? `${activeClass} border-transparent`
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {label} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-6 py-2 border-b bg-gray-50 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 hover:text-gray-800 select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-3.5 h-3.5 rounded accent-brand-600"
              />
              {allSelected ? t('saved.deselectAll') : t('saved.selectAll')}
            </label>
            {selectedInView > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">
                  {selectedInView} {t('saved.selectedCount')}
                </span>
                <div className="ml-auto flex items-center gap-2 relative">
                  {/* Bulk status picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusPicker(v => !v)}
                      className="font-semibold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1"
                    >
                      ✏️ {lang === 'es' ? 'Estado' : 'Status'}
                    </button>
                    {showStatusPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowStatusPicker(false)} />
                        <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-20 w-36">
                          {(['draft', 'sent', 'accepted', 'declined'] as SavedEstimate['status'][]).map(s => (
                            <button
                              key={s}
                              onClick={() => handleBulkStatus(s)}
                              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 capitalize ${statusBadge[s]} rounded-none`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-gray-300">·</span>
                  <button
                    onClick={handleBulkDelete}
                    className="font-semibold text-red-500 hover:text-red-700 transition-colors"
                  >
                    🗑 {t('saved.deleteSelected', { n: String(selectedInView) })}
                  </button>
                </div>
              </>
            )}
            {search && (
              <span className="ml-auto text-gray-400">
                {filtered.length} {lang === 'es' ? 'resultado(s)' : 'result(s)'}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {estimates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p>{t('saved.empty')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              {lang === 'es' ? 'Sin resultados' : 'No results'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(e => (
                <div key={e.id}>
                <div
                  className={`flex items-center gap-3 px-6 py-3 hover:bg-gray-50 group transition-colors ${selected.has(e.id) ? 'bg-brand-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    className="w-3.5 h-3.5 rounded accent-brand-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-gray-400">{e.estimateNumber}</span>
                      {/* Inline status badge — click to change status */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={ev => { ev.stopPropagation(); setOpenStatusRowId(id => id === e.id ? null : e.id) }}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${statusBadge[e.status]}`}
                          title={lang === 'es' ? 'Cambiar estado' : 'Change status'}
                        >
                          {e.status} ▾
                        </button>
                        {openStatusRowId === e.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenStatusRowId(null)} />
                            <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-30 w-32" ref={statusDropdownRef}>
                              {(['draft', 'sent', 'accepted', 'declined'] as SavedEstimate['status'][]).map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => { onStatusChange(e.id, s); setOpenStatusRowId(null) }}
                                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 capitalize flex items-center gap-1.5 ${s === e.status ? 'opacity-40 cursor-default' : ''}`}
                                >
                                  <span className={`inline-block w-2 h-2 rounded-full ${s === 'draft' ? 'bg-gray-400' : s === 'sent' ? 'bg-blue-500' : s === 'accepted' ? 'bg-green-500' : 'bg-red-400'}`} />
                                  {s}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {(() => {
                        const badge = getExpiryBadge(e, lang)
                        return badge ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        ) : null
                      })()}
                    </div>
                    <p className="font-semibold text-sm truncate">{e.clientName}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {e.projectType?.replace(/-/g, ' ')} · {format(new Date(e.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-700">{fmt(e.totalQuote)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                    <button onClick={() => onLoad(e)} className="btn-primary text-xs">{t('saved.open')}</button>
                    {onConvertToInvoice && e.status === 'accepted' && e.data?.type !== 'invoice' && (
                      <button
                        onClick={() => onConvertToInvoice(e)}
                        className="btn-secondary text-xs text-green-700 border-green-300 hover:bg-green-50"
                        title={lang === 'es' ? 'Convertir a factura' : 'Convert to invoice'}
                      >
                        🧾
                      </button>
                    )}
                    <button
                      onClick={() => onDuplicate(e)}
                      className="btn-secondary text-xs"
                      title={t('saved.duplicateTitle')}
                    >
                      📋
                    </button>
                    {e.status === 'sent' && (() => {
                      const phone = e.data?.client?.phone?.replace(/\D/g, '') ?? ''
                      const pt = (e.projectType ?? '').replace(/-/g, ' ')
                      const msg = lang === 'es'
                        ? `Hola ${e.clientName}, quería darle seguimiento al presupuesto #${e.estimateNumber}${pt ? ` para su proyecto de ${pt}` : ''} por un total de $${e.totalQuote.toLocaleString('en-US', { minimumFractionDigits: 2 })}. ¿Tiene alguna pregunta o está listo para continuar?`
                        : `Hi ${e.clientName}, just following up on estimate #${e.estimateNumber}${pt ? ` for your ${pt} project` : ''} totaling $${e.totalQuote.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Any questions, or ready to move forward?`
                      const href = phone
                        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
                        : `https://wa.me/?text=${encodeURIComponent(msg)}`
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs text-green-600 border-green-200 hover:bg-green-50 flex items-center"
                          title={lang === 'es' ? 'Seguimiento por WhatsApp' : 'Send WhatsApp follow-up'}
                        >
                          💬
                        </a>
                      )
                    })()}
                    {onNoteChange && (
                      <button
                        onClick={() => setExpandedNoteId(expandedNoteId === e.id ? null : e.id)}
                        className={`btn-secondary text-xs ${e.internalNote ? 'text-amber-600 border-amber-300' : ''}`}
                        title={lang === 'es' ? 'Nota interna' : 'Internal note'}
                      >
                        📝
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm(t('saved.deleteConfirm'))) onDelete(e.id) }}
                      className="btn-secondary text-xs text-red-500 hover:text-red-700"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {onNoteChange && expandedNoteId === e.id && (
                  <div className="px-6 pb-3 bg-amber-50/50">
                    <textarea
                      className="w-full text-xs border border-amber-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-amber-300 bg-white resize-none h-16 placeholder-amber-300"
                      placeholder={lang === 'es' ? 'Nota interna (solo tú la ves)…' : 'Internal note (only you see this)…'}
                      value={e.internalNote ?? ''}
                      onChange={ev => onNoteChange(e.id, ev.target.value)}
                    />
                  </div>
                )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-xs text-gray-400 shrink-0">
              {estimates.length} {lang === 'es' ? 'estimado(s)' : 'estimate(s)'}
              {(filterStatus !== 'all' || search) && ` · ${filtered.length} ${lang === 'es' ? 'filtrado(s)' : 'shown'}`}
            </p>
            {estimates.length > 0 && (
              <button
                onClick={exportToCSV}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 transition-colors shrink-0"
                title={lang === 'es' ? 'Exportar estimados visibles a CSV' : 'Export visible estimates to CSV'}
              >
                ↓ {lang === 'es' ? 'Exportar CSV' : 'Export CSV'}
              </button>
            )}
          </div>
          <button onClick={onClose} className="btn-secondary shrink-0">{t('saved.close')}</button>
        </div>
      </div>
    </div>
  )
}

