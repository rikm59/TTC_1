import { format } from 'date-fns'
import { useLanguage } from '../../context/LanguageContext'
import type { SavedEstimate } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  estimates: SavedEstimate[]
  onLoad: (e: SavedEstimate) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const statusBadge: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

export default function SavedEstimatesList({ estimates, onLoad, onDelete, onClose }: Props) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{t('saved.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {estimates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p>{t('saved.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {estimates.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-400">{e.estimateNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[e.status]}`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="font-semibold text-sm truncate">{e.clientName}</p>
                    <p className="text-xs text-gray-500 capitalize">{e.projectType?.replace(/-/g, ' ')} · {format(new Date(e.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-700">{fmt(e.totalQuote)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onLoad(e)} className="btn-primary text-xs">{t('saved.open')}</button>
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

        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl text-right">
          <button onClick={onClose} className="btn-secondary">{t('saved.close')}</button>
        </div>
      </div>
    </div>
  )
}
