import { useState } from 'react'
import { format } from 'date-fns'
import { useLanguage } from '../../context/LanguageContext'
import type { SavedEstimate } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  estimates: SavedEstimate[]
  onLoad: (e: SavedEstimate) => void
  onDuplicate: (e: SavedEstimate) => void
  onDelete: (id: string) => void
  onDeleteMany: (ids: string[]) => void
  onClose: () => void
}

const statusBadge: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

export default function SavedEstimatesList({ estimates, onLoad, onDuplicate, onDelete, onDeleteMany, onClose }: Props) {
  const { t, lang } = useLanguage()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? estimates.filter(e => {
        const q = search.toLowerCase()
        return e.clientName.toLowerCase().includes(q)
          || e.estimateNumber.toLowerCase().includes(q)
          || (e.projectType ?? '').toLowerCase().includes(q)
      })
    : estimates

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

  const handleBulkDelete = () => {
    const ids = [...selected].filter(id => filtered.some(e => e.id === id))
    if (!confirm(t('saved.bulkDeleteConfirm', { n: String(ids.length) }))) return
    onDeleteMany(ids)
    setSelected(new Set())
  }

  const selectedInView = filtered.filter(e => selected.has(e.id)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{t('saved.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        {/* Search */}
        {estimates.length > 0 && (
          <div className="px-6 py-2 border-b">
            <input
              className="form-input text-sm"
              placeholder={lang === 'es' ? 'Buscar por cliente, # o tipo…' : 'Search by client, #, or type…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
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
                <button
                  onClick={handleBulkDelete}
                  className="ml-auto font-semibold text-red-500 hover:text-red-700 transition-colors"
                >
                  🗑 {t('saved.deleteSelected', { n: String(selectedInView) })}
                </button>
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
                <div
                  key={e.id}
                  className={`flex items-center gap-3 px-6 py-3 hover:bg-gray-50 group transition-colors ${selected.has(e.id) ? 'bg-brand-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    className="w-3.5 h-3.5 rounded accent-brand-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-400">{e.estimateNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[e.status]}`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="font-semibold text-sm truncate">{e.clientName}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {e.projectType?.replace(/-/g, ' ')} · {format(new Date(e.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-700">{fmt(e.totalQuote)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onLoad(e)} className="btn-primary text-xs">{t('saved.open')}</button>
                    <button
                      onClick={() => onDuplicate(e)}
                      className="btn-secondary text-xs"
                      title={t('saved.duplicateTitle')}
                    >
                      📋
                    </button>
                    <button
                      onClick={() => { if (confirm(t('saved.deleteConfirm'))) onDelete(e.id) }}
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

        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {estimates.length} {lang === 'es' ? 'estimado(s)' : 'estimate(s)'}
            {search && ` · ${filtered.length} ${lang === 'es' ? 'filtrado(s)' : 'filtered'}`}
          </p>
          <button onClick={onClose} className="btn-secondary">{t('saved.close')}</button>
        </div>
      </div>
    </div>
  )
}

