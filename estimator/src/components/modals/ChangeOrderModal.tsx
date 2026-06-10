import { useState, useEffect } from 'react'
import { supabase, type ChangeOrder } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/calculations'
import { format } from 'date-fns'

interface Props {
  estimateId: string
  crmClientId: string
  estimateNumber: string
  onClose: () => void
}

const CO_STATUSES = ['pending', 'approved', 'declined', 'completed'] as const

const CO_STATUS_STYLES: Record<ChangeOrder['status'], string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  declined:  'bg-red-100 text-red-600',
  completed: 'bg-blue-100 text-blue-700',
}

const EMPTY_FORM = {
  title: '', description: '', reason: '',
  amount_change: 0, timeline_impact: '',
  status: 'pending' as ChangeOrder['status'],
}

export default function ChangeOrderModal({ estimateId, crmClientId, estimateNumber, onClose }: Props) {
  const { user } = useAuth()
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    supabase.from('change_orders')
      .select('*')
      .eq('estimate_id', estimateId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setChangeOrders(data as ChangeOrder[])
        setLoading(false)
      })
  }, [estimateId])

  const save = async () => {
    if (!form.title.trim() || !form.description.trim() || !user) return
    setSaving(true)
    const num = changeOrders.length + 1
    const change_number = `CO-${estimateNumber}-${String(num).padStart(2, '0')}`
    const { data, error } = await supabase.from('change_orders').insert({
      ...form,
      change_number,
      estimate_id: estimateId,
      client_id: crmClientId,
      user_id: user.id,
    }).select().single()
    if (!error && data) {
      setChangeOrders(prev => [data as ChangeOrder, ...prev])
      setShowForm(false)
      setForm(EMPTY_FORM)
    }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: ChangeOrder['status']) => {
    await supabase.from('change_orders').update({ status }).eq('id', id)
    setChangeOrders(prev => prev.map(co => co.id === id ? { ...co, status } : co))
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this change order?')) return
    await supabase.from('change_orders').delete().eq('id', id)
    setChangeOrders(prev => prev.filter(co => co.id !== id))
  }

  const totalApproved = changeOrders
    .filter(co => co.status === 'approved' || co.status === 'completed')
    .reduce((s, co) => s + co.amount_change, 0)
  const totalPending = changeOrders
    .filter(co => co.status === 'pending')
    .reduce((s, co) => s + co.amount_change, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg">Change Orders</h2>
            <p className="text-xs text-gray-500">Estimate {estimateNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm(v => !v)}
              className="btn-primary text-sm"
            >
              + New Change Order
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
          </div>
        </div>

        {/* Summary bar */}
        {changeOrders.length > 0 && (
          <div className="flex items-center gap-4 px-6 py-2 bg-gray-50 border-b text-xs text-gray-500">
            <span>{changeOrders.length} change order{changeOrders.length !== 1 ? 's' : ''}</span>
            {totalApproved !== 0 && (
              <span className="font-semibold text-green-700">
                Approved: {totalApproved >= 0 ? '+' : ''}{fmt(totalApproved)}
              </span>
            )}
            {totalPending !== 0 && (
              <span className="font-semibold text-amber-700">
                Pending: {totalPending >= 0 ? '+' : ''}{fmt(totalPending)}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Create form */}
          {showForm && (
            <div className="bg-brand-50 rounded-xl border border-brand-200 p-4 space-y-3">
              <h3 className="font-semibold text-sm text-brand-800">New Change Order</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="form-label">Title *</label>
                  <input
                    className="form-input text-sm"
                    placeholder="e.g. Additional window replacement"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-input h-16 resize-none text-sm"
                    placeholder="Describe what changed and what work is involved..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Reason for Change</label>
                  <input
                    className="form-input text-sm"
                    placeholder="Client request, site condition, etc."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Amount Change ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input text-sm"
                    placeholder="Positive = add cost, negative = reduce"
                    value={form.amount_change || ''}
                    onChange={e => setForm(f => ({ ...f, amount_change: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="form-label">Timeline Impact</label>
                  <input
                    className="form-input text-sm"
                    placeholder="e.g. +2 days"
                    value={form.timeline_impact}
                    onChange={e => setForm(f => ({ ...f, timeline_impact: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input text-sm"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as ChangeOrder['status'] }))}
                  >
                    {CO_STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                <button
                  onClick={save}
                  disabled={saving || !form.title.trim() || !form.description.trim()}
                  className="btn-primary text-sm"
                >
                  {saving ? 'Saving…' : 'Save Change Order'}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : changeOrders.length === 0 && !showForm ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">No change orders yet for this estimate.</p>
              <p className="text-xs mt-1 text-gray-300">Use change orders to track scope additions, removals, or modifications after the original estimate was accepted.</p>
            </div>
          ) : (
            changeOrders.map(co => (
              <div key={co.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-gray-400">{co.change_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CO_STATUS_STYLES[co.status]}`}>
                        {co.status}
                      </span>
                    </div>
                    <p className="font-semibold text-sm">{co.title}</p>
                    {co.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{co.description}</p>
                    )}
                    <div className="flex gap-3 mt-1">
                      {co.reason && (
                        <p className="text-xs text-gray-400">Reason: {co.reason}</p>
                      )}
                      {co.timeline_impact && (
                        <p className="text-xs text-gray-400">Timeline: {co.timeline_impact}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-base ${co.amount_change >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {co.amount_change >= 0 ? '+' : ''}{fmt(co.amount_change)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(co.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <select
                    value={co.status}
                    onChange={e => updateStatus(co.id, e.target.value as ChangeOrder['status'])}
                    className="form-input text-xs py-1 max-w-[160px]"
                  >
                    {CO_STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => remove(co.id)}
                    className="ml-auto text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl text-right">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}
