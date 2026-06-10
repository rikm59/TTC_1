import { useState } from 'react'
import { format } from 'date-fns'
import type { EstimateTemplate, MaterialItem, LaborItem, OverheadItem } from '../../types'
import { useLanguage } from '../../context/LanguageContext'

interface Props {
  templates: EstimateTemplate[]
  currentProjectType: string
  currentProjectSubType: string
  currentMaterials: MaterialItem[]
  currentLabor: LaborItem[]
  currentOverhead: OverheadItem[]
  currentScopeOfWork: string
  currentExclusions: string
  onSave: (name: string) => void
  onApply: (template: EstimateTemplate) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function TemplatesModal({
  templates, currentProjectType, currentProjectSubType,
  currentMaterials, currentLabor, currentOverhead,
  currentScopeOfWork, currentExclusions,
  onSave, onApply, onDelete, onClose,
}: Props) {
  const { lang } = useLanguage()
  const [name, setName] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const hasCurrentItems = currentMaterials.length > 0 || currentLabor.length > 0

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.projectType.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
    setName('')
  }

  const handleApply = (t: EstimateTemplate) => {
    if (hasCurrentItems) {
      setConfirmId(t.id)
    } else {
      onApply(t)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg">
              {lang === 'es' ? 'Plantillas' : 'Templates'}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === 'es'
                ? 'Reutiliza materiales y mano de obra entre estimados'
                : 'Reuse materials & labor across estimates'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        {/* Save current as template */}
        {hasCurrentItems && (
          <div className="px-6 py-3 border-b bg-brand-50">
            <p className="text-xs font-semibold text-brand-800 mb-2">
              {lang === 'es' ? '💾 Guardar estimado actual como plantilla' : '💾 Save current estimate as template'}
            </p>
            <div className="flex gap-2">
              <input
                className="form-input text-sm flex-1"
                placeholder={lang === 'es' ? 'Nombre de la plantilla…' : 'Template name…'}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="btn-primary text-sm shrink-0"
              >
                {lang === 'es' ? 'Guardar' : 'Save'}
              </button>
            </div>
            <p className="text-[10px] text-brand-600 mt-1">
              {lang === 'es'
                ? `Guardará: ${currentMaterials.length} materiales · ${currentLabor.length} mano de obra · ${currentOverhead.length} gastos`
                : `Will save: ${currentMaterials.length} materials · ${currentLabor.length} labor · ${currentOverhead.length} overhead`}
              {(currentScopeOfWork || currentExclusions) && (lang === 'es' ? ' · notas de alcance' : ' · scope notes')}
            </p>
          </div>
        )}

        {/* Search */}
        {templates.length > 4 && (
          <div className="px-6 py-2 border-b">
            <input
              className="form-input text-sm"
              placeholder={lang === 'es' ? 'Buscar plantillas…' : 'Search templates…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Template list */}
        <div className="flex-1 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-semibold text-sm">
                {lang === 'es' ? 'Sin plantillas aún' : 'No templates yet'}
              </p>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                {lang === 'es'
                  ? 'Crea un estimado con materiales y mano de obra, luego guárdalo como plantilla para reutilizarlo.'
                  : 'Build an estimate with materials & labor, then save it as a template to reuse on future jobs.'}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              {lang === 'es' ? 'Sin resultados' : 'No results'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(t => (
                <div key={t.id} className="px-6 py-3 hover:bg-gray-50 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        {t.projectType.replace(/-/g, ' ')}
                        {t.projectSubType && ` › ${t.projectSubType.replace(/-/g, ' ')}`}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {t.materials.length > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            {t.materials.length} {lang === 'es' ? 'mat' : 'mat'}
                          </span>
                        )}
                        {t.labor.length > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                            {t.labor.length} {lang === 'es' ? 'labor' : 'labor'}
                          </span>
                        )}
                        {t.overhead.length > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                            {t.overhead.length} {lang === 'es' ? 'gastos' : 'overhead'}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-300">
                          {format(new Date(t.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {confirmId === t.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-amber-700 font-medium">
                          {lang === 'es' ? '¿Reemplazar items actuales?' : 'Replace current items?'}
                        </span>
                        <button
                          onClick={() => { onApply(t); setConfirmId(null) }}
                          className="btn-primary text-xs py-1"
                        >
                          {lang === 'es' ? 'Sí' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="btn-secondary text-xs py-1"
                        >
                          {lang === 'es' ? 'No' : 'No'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleApply(t)}
                          className="btn-primary text-xs"
                        >
                          {lang === 'es' ? 'Aplicar' : 'Apply'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(lang === 'es' ? '¿Eliminar esta plantilla?' : 'Delete this template?')) {
                              onDelete(t.id)
                            }
                          }}
                          className="btn-secondary text-xs text-red-500 hover:text-red-700"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {templates.length} {lang === 'es' ? 'plantilla(s) guardada(s)' : 'saved template(s)'}
          </p>
          <button onClick={onClose} className="btn-secondary">
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
