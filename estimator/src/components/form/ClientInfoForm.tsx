import { useState, useRef, useEffect } from 'react'
import { UserCheck, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import type { ClientInfo } from '../../types'
import type { Client } from '../../lib/supabase'

interface Props {
  client: ClientInfo
  onChange: (field: string, value: string) => void
  crmClients?: Client[]
  onSelectClient?: (c: Client) => void
  onClear?: () => void
  crmSaved?: boolean
}

export default function ClientInfoForm({ client, onChange, crmClients = [], onSelectClient, onClear, crmSaved }: Props) {
  const { t } = useLanguage()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const suggestions = client.name.trim().length > 0
    ? crmClients.filter(c =>
        c.name.toLowerCase().includes(client.name.toLowerCase()) &&
        c.name.toLowerCase() !== client.name.toLowerCase()
      ).slice(0, 6)
    : []

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (c: Client) => {
    onSelectClient?.(c)
    setShowSuggestions(false)
  }

  const hasAnyData = Object.values(client).some(v => v.trim() !== '')

  return (
    <div className="space-y-3">
      {/* Name with autocomplete + status row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative" ref={wrapperRef}>
          <label className="form-label">{t('client.name')}</label>
          <input
            className="form-input"
            value={client.name}
            onChange={e => { onChange('name', e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="John Smith"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                {t('client.selectExisting')}
              </div>
              {suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                  onMouseDown={e => { e.preventDefault(); handleSelect(s) }}
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                    {(s.company || s.phone || s.email) && (
                      <div className="text-[11px] text-gray-400 truncate">
                        {[s.company, s.phone, s.email].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <span className="ml-auto text-[10px] text-blue-500 font-medium shrink-0">{t('client.returnClient')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CRM saved indicator */}
        {crmSaved && (
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium pb-2 shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
            {t('client.savedToCRM')}
          </div>
        )}
      </div>

      {/* Remaining fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="form-label">{t('client.company')}</label>
          <input className="form-input" value={client.company} onChange={e => onChange('company', e.target.value)} placeholder="Smith Corp" />
        </div>
        <div className="col-span-2">
          <label className="form-label">{t('client.address')}</label>
          <input className="form-input" value={client.address} onChange={e => onChange('address', e.target.value)} placeholder="123 Main St" />
        </div>
        <div>
          <label className="form-label">{t('client.city')}</label>
          <input className="form-input" value={client.city} onChange={e => onChange('city', e.target.value)} placeholder="Austin" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="form-label">{t('client.state')}</label>
            <input className="form-input" value={client.state} onChange={e => onChange('state', e.target.value)} placeholder="TX" />
          </div>
          <div>
            <label className="form-label">{t('client.zip')}</label>
            <input className="form-input" value={client.zip} onChange={e => onChange('zip', e.target.value)} placeholder="78701" />
          </div>
        </div>
        <div>
          <label className="form-label">{t('client.phone')}</label>
          <input className="form-input" type="tel" value={client.phone} onChange={e => onChange('phone', e.target.value)} placeholder="(512) 555-1234" />
        </div>
        <div>
          <label className="form-label">{t('client.email')}</label>
          <input className="form-input" type="email" value={client.email} onChange={e => onChange('email', e.target.value)} placeholder="client@email.com" />
        </div>
      </div>

      {/* Clear button */}
      {hasAnyData && onClear && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {t('client.clear')}
          </button>
        </div>
      )}
    </div>
  )
}
