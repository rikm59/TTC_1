import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { DollarSign, X, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fmt } from '../../utils/calculations'
import { useLanguage } from '../../context/LanguageContext'

const METHODS = ['cash', 'check', 'card', 'zelle', 'venmo', 'ach', 'other']

interface PaymentState {
  deposit_amount: number
  deposit_paid: boolean
  deposit_paid_at: string | null
  deposit_method: string
  balance_paid: boolean
  balance_paid_at: string | null
  balance_method: string
}

interface Props {
  estimateId: string
  totalQuote: number
  estimateNumber: string
  onClose: () => void
}

export default function QuickPaymentModal({ estimateId, totalQuote, estimateNumber, onClose }: Props) {
  const { lang } = useLanguage()
  const isEs = lang === 'es'

  const [form, setForm] = useState<PaymentState>({
    deposit_amount: Math.round(totalQuote * 0.5 * 100) / 100,
    deposit_paid: false,
    deposit_paid_at: null,
    deposit_method: '',
    balance_paid: false,
    balance_paid_at: null,
    balance_method: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('estimates')
      .select('deposit_amount, deposit_paid, deposit_paid_at, deposit_method, balance_paid, balance_paid_at, balance_method')
      .eq('id', estimateId)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            deposit_amount:  data.deposit_amount  ?? Math.round(totalQuote * 0.5 * 100) / 100,
            deposit_paid:    data.deposit_paid    ?? false,
            deposit_paid_at: data.deposit_paid_at ?? null,
            deposit_method:  data.deposit_method  ?? '',
            balance_paid:    data.balance_paid    ?? false,
            balance_paid_at: data.balance_paid_at ?? null,
            balance_method:  data.balance_method  ?? '',
          })
        }
        setLoading(false)
      })
  }, [estimateId, totalQuote])

  const set = <K extends keyof PaymentState>(key: K, value: PaymentState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const patch = {
      deposit_amount:  form.deposit_amount,
      deposit_paid:    form.deposit_paid,
      deposit_paid_at: form.deposit_paid ? (form.deposit_paid_at || new Date().toISOString()) : null,
      deposit_method:  form.deposit_method || null,
      balance_paid:    form.balance_paid,
      balance_paid_at: form.balance_paid ? (form.balance_paid_at || new Date().toISOString()) : null,
      balance_method:  form.balance_method || null,
    }
    await supabase.from('estimates').update(patch).eq('id', estimateId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => onClose(), 1500)
  }

  const balanceOwed = Math.max(0, totalQuote - (form.deposit_paid ? form.deposit_amount : 0))

  const methodLabel = (m: string) => ({
    cash: isEs ? 'Efectivo' : 'Cash',
    check: isEs ? 'Cheque' : 'Check',
    card: isEs ? 'Tarjeta' : 'Card',
    zelle: 'Zelle',
    venmo: 'Venmo',
    ach: 'ACH',
    other: isEs ? 'Otro' : 'Other',
  }[m] ?? m)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            {isEs ? 'Registrar Pago' : 'Record Payment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : saved ? (
          <div className="flex flex-col items-center justify-center py-12 text-green-600">
            <CheckCircle2 className="w-10 h-10 mb-2" />
            <p className="font-semibold">{isEs ? 'Pago guardado' : 'Payment saved'}</p>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-5">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="text-xs text-gray-400">{isEs ? 'Estimado' : 'Estimate'} #{estimateNumber}</p>
                  <p className="font-bold text-gray-900 text-base">{fmt(totalQuote)}</p>
                </div>
                {form.balance_paid ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    ✓ {isEs ? 'Pagado' : 'Paid in Full'}
                  </span>
                ) : form.deposit_paid ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                    {isEs ? `Saldo: ${fmt(balanceOwed)}` : `Balance: ${fmt(balanceOwed)}`}
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    {isEs ? 'Sin pago' : 'Unpaid'}
                  </span>
                )}
              </div>

              {/* Deposit section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {isEs ? 'Depósito' : 'Deposit'}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-green-600"
                      checked={form.deposit_paid}
                      onChange={e => set('deposit_paid', e.target.checked)}
                    />
                    <span className="text-xs font-medium text-gray-600">
                      {isEs ? 'Pagado' : 'Paid'}
                    </span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-0.5 block">
                      {isEs ? 'Monto' : 'Amount'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="form-input text-sm"
                      value={form.deposit_amount || ''}
                      onChange={e => set('deposit_amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-0.5 block">
                      {isEs ? 'Método' : 'Method'}
                    </label>
                    <select
                      className="form-input text-sm"
                      value={form.deposit_method}
                      onChange={e => set('deposit_method', e.target.value)}
                      disabled={!form.deposit_paid}
                    >
                      <option value="">{isEs ? '— método —' : '— method —'}</option>
                      {METHODS.map(m => (
                        <option key={m} value={m}>{methodLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.deposit_paid && (
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">
                      {isEs ? 'Fecha recibido' : 'Date received'}
                    </label>
                    <input
                      type="date"
                      className="form-input text-sm"
                      value={form.deposit_paid_at ? form.deposit_paid_at.slice(0, 10) : format(new Date(), 'yyyy-MM-dd')}
                      onChange={e => set('deposit_paid_at', e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : null)}
                    />
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Balance section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {isEs ? 'Saldo Final' : 'Final Balance'}
                    {form.deposit_paid && <span className="text-gray-400 font-normal ml-1">({fmt(balanceOwed)})</span>}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-green-600"
                      checked={form.balance_paid}
                      onChange={e => set('balance_paid', e.target.checked)}
                    />
                    <span className="text-xs font-medium text-gray-600">
                      {isEs ? 'Pagado' : 'Paid'}
                    </span>
                  </label>
                </div>
                {form.balance_paid && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-0.5 block">
                        {isEs ? 'Método' : 'Method'}
                      </label>
                      <select
                        className="form-input text-sm"
                        value={form.balance_method}
                        onChange={e => set('balance_method', e.target.value)}
                      >
                        <option value="">{isEs ? '— método —' : '— method —'}</option>
                        {METHODS.map(m => (
                          <option key={m} value={m}>{methodLabel(m)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-0.5 block">
                        {isEs ? 'Fecha recibido' : 'Date received'}
                      </label>
                      <input
                        type="date"
                        className="form-input text-sm"
                        value={form.balance_paid_at ? form.balance_paid_at.slice(0, 10) : format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => set('balance_paid_at', e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={onClose} className="btn-secondary" disabled={saving}>
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {isEs ? 'Guardando…' : 'Saving…'}
                  </span>
                ) : (
                  <>
                    <DollarSign className="w-3.5 h-3.5" />
                    {isEs ? 'Guardar Pago' : 'Save Payment'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
