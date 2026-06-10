import { useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import scopeTemplates from '../../data/scopeTemplates'

interface Props {
  coverLetter: string
  scopeOfWork: string
  exclusions: string
  internalNotes: string
  projectType?: string
  clientName?: string
  companyName?: string
  onCoverLetterChange: (v: string) => void
  onScopeChange: (v: string) => void
  onExclusionsChange: (v: string) => void
  onNotesChange: (v: string) => void
}

const COMMON_EXCLUSIONS_EN = [
  'Permits & fees',
  'Interior painting',
  'Electrical work',
  'Plumbing',
  'Structural changes',
  'Haul-away / disposal',
  'Landscaping',
  'Furniture removal',
  'HVAC work',
  'Pre-existing damage',
]

const COMMON_EXCLUSIONS_ES = [
  'Permisos y tarifas',
  'Pintura interior',
  'Trabajo eléctrico',
  'Plomería',
  'Cambios estructurales',
  'Acarreo / disposición',
  'Paisajismo',
  'Remoción de muebles',
  'Trabajo de HVAC',
  'Daños preexistentes',
]

const PROJECT_TYPE_LABELS: Record<string, { en: string; es: string }> = {
  paint: { en: 'painting', es: 'pintura' },
  cabinets: { en: 'cabinet installation', es: 'instalación de gabinetes' },
  fencing: { en: 'fencing', es: 'instalación de cercas' },
  remodeling: { en: 'remodeling', es: 'remodelación' },
  'framing-drywall': { en: 'framing & drywall', es: 'enmarcado y tablaroca' },
  'outdoor-patio': { en: 'outdoor patio', es: 'patio exterior' },
  concrete: { en: 'concrete work', es: 'trabajo de concreto' },
  windows: { en: 'window installation', es: 'instalación de ventanas' },
  flooring: { en: 'flooring', es: 'pisos' },
  landscaping: { en: 'landscaping', es: 'jardinería' },
  sprinklers: { en: 'sprinkler installation', es: 'instalación de aspersores' },
  roofing: { en: 'roofing', es: 'techos' },
  electrical: { en: 'electrical work', es: 'trabajo eléctrico' },
  plumbing: { en: 'plumbing', es: 'plomería' },
  hvac: { en: 'HVAC', es: 'HVAC' },
  tile: { en: 'tile work', es: 'colocación de azulejos' },
  insulation: { en: 'insulation', es: 'aislamiento' },
  gutters: { en: 'gutter installation', es: 'instalación de canaletas' },
  pool: { en: 'pool construction', es: 'construcción de piscina' },
  'pool-tile': { en: 'pool tile work', es: 'azulejos de piscina' },
  'house-cleaning': { en: 'house cleaning', es: 'limpieza del hogar' },
}

export default function ScopeNotes({ coverLetter, scopeOfWork, exclusions, internalNotes, projectType, clientName, companyName, onCoverLetterChange, onScopeChange, onExclusionsChange, onNotesChange }: Props) {
  const { t, lang } = useLanguage()
  const isEs = lang === 'es'
  const chips = isEs ? COMMON_EXCLUSIONS_ES : COMMON_EXCLUSIONS_EN

  const [showScopeTemplates, setShowScopeTemplates] = useState(false)
  const templateMenuRef = useRef<HTMLDivElement>(null)

  const templates = projectType ? (scopeTemplates[projectType] ?? []) : []

  const autoFillCoverLetter = () => {
    const name = clientName?.trim() || (isEs ? 'Cliente' : 'Valued Client')
    const ptLabel = projectType
      ? (isEs ? PROJECT_TYPE_LABELS[projectType]?.es : PROJECT_TYPE_LABELS[projectType]?.en) ?? projectType.replace(/-/g, ' ')
      : (isEs ? 'su proyecto' : 'your project')
    const co = companyName?.trim() || (isEs ? 'nuestra empresa' : 'our company')
    const text = isEs
      ? `Estimado/a ${name},\n\nEs un placer presentarle este presupuesto para su proyecto de ${ptLabel}. En ${co} nos comprometemos a brindar trabajo de calidad, comunicación clara y resultados que superen sus expectativas.\n\nRevise los detalles del presupuesto adjunto. Estamos disponibles para responder cualquier pregunta o realizar ajustes según sus necesidades.\n\nGracias por considerarnos para este proyecto.`
      : `Dear ${name},\n\nThank you for the opportunity to submit this estimate for your ${ptLabel} project. At ${co}, we are committed to delivering quality workmanship, clear communication, and results that exceed your expectations.\n\nPlease review the details in this estimate. We are happy to answer any questions or make adjustments to better fit your needs.\n\nWe look forward to working with you.`
    onCoverLetterChange(text)
  }

  const appendExclusion = (item: string) => {
    const current = exclusions.trim()
    if (current.toLowerCase().includes(item.toLowerCase())) return
    onExclusionsChange(current ? `${current}\n• ${item}` : `• ${item}`)
  }

  const applyTemplate = (text: string) => {
    const current = scopeOfWork.trim()
    onScopeChange(current ? `${current}\n\n${text}` : text)
    setShowScopeTemplates(false)
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="form-label !mb-0 flex items-center gap-1.5">
            ✉️ {isEs ? 'Mensaje al cliente' : 'Message to Client'}
            <span className="text-[10px] font-normal text-gray-400">
              ({isEs ? 'aparece al inicio del presupuesto' : 'shown at top of quote'})
            </span>
          </label>
          <button
            type="button"
            onClick={autoFillCoverLetter}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-lg transition-colors"
            title={isEs ? 'Generar carta de presentación automáticamente' : 'Auto-generate a professional cover letter'}
          >
            ✨ {isEs ? 'Auto' : 'Auto-fill'}
          </button>
        </div>
        <textarea
          className="form-input h-20 resize-none"
          value={coverLetter}
          onChange={e => onCoverLetterChange(e.target.value)}
          placeholder={isEs
            ? 'Estimado/a [Nombre], es un placer presentarle este presupuesto…'
            : 'Dear [Name], it is our pleasure to present this estimate for your upcoming project…'}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="form-label !mb-0">{t('scope.title')}</label>
          {templates.length > 0 && (
            <div className="relative" ref={templateMenuRef}>
              <button
                type="button"
                onClick={() => setShowScopeTemplates(v => !v)}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                📋 {isEs ? 'Plantillas' : 'Templates'}
              </button>
              {showScopeTemplates && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowScopeTemplates(false)} />
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-20">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-3 py-1.5 border-b border-gray-100">
                      {isEs ? 'Insertar plantilla de alcance' : 'Insert scope template'}
                    </p>
                    {templates.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyTemplate(isEs ? tpl.textEs : tpl.text)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                      >
                        <span className="font-semibold block">{isEs ? tpl.labelEs : tpl.label}</span>
                        <span className="text-gray-400 text-[10px] line-clamp-1">
                          {(isEs ? tpl.textEs : tpl.text).split('\n')[0].replace('• ', '')}…
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <textarea
          className="form-input h-24 resize-none"
          value={scopeOfWork}
          onChange={e => onScopeChange(e.target.value)}
          placeholder={t('scope.placeholder')}
        />
      </div>

      <div>
        <label className="form-label">{t('scope.exclusions')}</label>
        <textarea
          className="form-input h-16 resize-none"
          value={exclusions}
          onChange={e => onExclusionsChange(e.target.value)}
          placeholder={t('scope.exclusionsPlaceholder')}
        />
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className="text-[10px] text-gray-400 self-center mr-0.5">{t('scope.quickAdd')}:</span>
          {chips.map(chip => {
            const already = exclusions.toLowerCase().includes(chip.toLowerCase())
            return (
              <button
                key={chip}
                type="button"
                onClick={() => appendExclusion(chip)}
                disabled={already}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  already
                    ? 'border-gray-200 text-gray-300 cursor-default'
                    : 'border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50'
                }`}
              >
                {chip}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="form-label">{t('scope.internal')}</label>
        <textarea
          className="form-input h-16 resize-none"
          value={internalNotes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder={t('scope.internalPlaceholder')}
        />
      </div>
    </div>
  )
}
