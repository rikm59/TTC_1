import { useState, useEffect, useMemo } from 'react'
import { supabase, type Client, type ClientNote, type EstimateRecord, type ChangeOrder } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { format } from 'date-fns'
import {
  Users, Plus, Search, Phone, Mail, MapPin, FileText,
  StickyNote, Trash2, X, ChevronRight, TrendingUp,
  CheckCircle2, Clock, XCircle, PauseCircle, UserPlus,
  DollarSign, AlertTriangle, ChevronDown, ChevronUp,
  RefreshCw,
} from 'lucide-react'
import { fmt } from '../utils/calculations'

const PAYMENT_METHODS = [
  { key: 'crm.payment.cash',   value: 'cash' },
  { key: 'crm.payment.check',  value: 'check' },
  { key: 'crm.payment.card',   value: 'card' },
  { key: 'crm.payment.zelle',  value: 'zelle' },
  { key: 'crm.payment.venmo',  value: 'venmo' },
  { key: 'crm.payment.ach',    value: 'ach' },
  { key: 'crm.payment.other',  value: 'other' },
]

const CO_STATUSES = ['pending', 'approved', 'declined', 'completed'] as const

export default function CRMPage() {
  const { user } = useAuth()
  const { t } = useLanguage()

  // ── client list state ──────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [estimates, setEstimates] = useState<EstimateRecord[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [tab, setTab] = useState<'info' | 'docs' | 'notes' | 'co'>('info')

  // ── add client modal ───────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<Partial<Client>>({
    name: '', company: '', email: '', phone: '', address: '', city: '', state: '', zip: '',
    status: 'prospect', source: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  // ── notes ──────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState('')

  // ── payment tracking ───────────────────────────────────────────
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState<Partial<EstimateRecord>>({})
  const [savingPayment, setSavingPayment] = useState(false)

  // ── change order modal ─────────────────────────────────────────
  const [showCOModal, setShowCOModal] = useState(false)
  const [coForm, setCoForm] = useState<Partial<ChangeOrder>>({
    title: '', description: '', reason: '', amount_change: 0,
    timeline_impact: '', status: 'pending', approved_by: '',
    estimate_id: undefined,
  })
  const [savingCO, setSavingCO] = useState(false)

  const STATUS_CONFIG = useMemo(() => ({
    prospect:  { label: t('crm.statusProspect'),  color: 'bg-blue-100 text-blue-700',    icon: Clock },
    active:    { label: t('crm.statusActive'),    color: 'bg-green-100 text-green-700',  icon: TrendingUp },
    completed: { label: t('crm.statusCompleted'), color: 'bg-gray-100 text-gray-600',    icon: CheckCircle2 },
    'on-hold': { label: t('crm.statusOnHold'),    color: 'bg-yellow-100 text-yellow-700', icon: PauseCircle },
    declined:  { label: t('crm.statusDeclined'),  color: 'bg-red-100 text-red-600',      icon: XCircle },
  }), [t])

  const STATUSES = Object.keys(STATUS_CONFIG) as Client['status'][]

  // ── data loading ───────────────────────────────────────────────
  useEffect(() => { if (user) loadClients() }, [user?.id])

  const loadClients = async () => {
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (data) setClients(data as Client[])
  }

  const loadClientDetail = async (client: Client) => {
    setSelected(client)
    setTab('info')
    setExpandedPayment(null)
    const [est, nts, cos] = await Promise.all([
      supabase.from('estimates')
        .select('id, estimate_number, project_type, total_quote, status, created_at, updated_at, client_id, deposit_amount, deposit_paid, deposit_paid_at, deposit_method, balance_paid, balance_paid_at, balance_method')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false }),
      supabase.from('client_notes')
        .select('id, client_id, user_id, body, created_at')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false }),
      supabase.from('change_orders')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false }),
    ])
    if (est.data) setEstimates(est.data as EstimateRecord[])
    if (nts.data) setNotes(nts.data as ClientNote[])
    if (cos.data) setChangeOrders(cos.data as ChangeOrder[])
  }

  // ── CRUD helpers ───────────────────────────────────────────────
  const saveClient = async () => {
    if (!form.name?.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('clients').insert({ ...form, user_id: user!.id }).select().single()
    if (!error && data) {
      setClients(prev => [data as Client, ...prev])
      setShowAddModal(false)
      setForm({ name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', status: 'prospect', source: '', notes: '' })
    }
    setSaving(false)
  }

  const updateStatus = async (clientId: string, status: Client['status']) => {
    await supabase.from('clients').update({ status }).eq('id', clientId)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status } : c))
    if (selected?.id === clientId) setSelected(prev => prev ? { ...prev, status } : prev)
  }

  const deleteClient = async (clientId: string) => {
    if (!confirm(t('crm.deleteConfirm'))) return
    await supabase.from('clients').delete().eq('id', clientId)
    setClients(prev => prev.filter(c => c.id !== clientId))
    if (selected?.id === clientId) setSelected(null)
  }

  const addNote = async () => {
    if (!noteText.trim() || !selected) return
    const { data } = await supabase.from('client_notes')
      .insert({ client_id: selected.id, user_id: user!.id, body: noteText })
      .select().single()
    if (data) {
      setNotes(prev => [data as ClientNote, ...prev])
      setNoteText('')
    }
  }

  const deleteNote = async (noteId: string) => {
    await supabase.from('client_notes').delete().eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  // ── payment tracking ───────────────────────────────────────────
  const openPayment = (est: EstimateRecord) => {
    if (expandedPayment === est.id) { setExpandedPayment(null); return }
    setExpandedPayment(est.id)
    setPaymentForm({
      deposit_amount:  est.deposit_amount  ?? 0,
      deposit_paid:    est.deposit_paid    ?? false,
      deposit_paid_at: est.deposit_paid_at ?? null,
      deposit_method:  est.deposit_method  ?? '',
      balance_paid:    est.balance_paid    ?? false,
      balance_paid_at: est.balance_paid_at ?? null,
      balance_method:  est.balance_method  ?? '',
    })
  }

  const savePayment = async (estId: string) => {
    setSavingPayment(true)
    const patch = {
      deposit_amount:  paymentForm.deposit_amount ?? 0,
      deposit_paid:    paymentForm.deposit_paid   ?? false,
      deposit_paid_at: paymentForm.deposit_paid ? (paymentForm.deposit_paid_at || new Date().toISOString()) : null,
      deposit_method:  paymentForm.deposit_method ?? null,
      balance_paid:    paymentForm.balance_paid   ?? false,
      balance_paid_at: paymentForm.balance_paid ? (paymentForm.balance_paid_at || new Date().toISOString()) : null,
      balance_method:  paymentForm.balance_method ?? null,
    }
    await supabase.from('estimates').update(patch).eq('id', estId)
    setEstimates(prev => prev.map(e => e.id === estId ? { ...e, ...patch } : e))
    setExpandedPayment(null)
    setSavingPayment(false)
  }

  // ── change orders ──────────────────────────────────────────────
  const saveChangeOrder = async () => {
    if (!coForm.title?.trim() || !coForm.description?.trim() || !selected) return
    setSavingCO(true)
    const coCount = changeOrders.length + 1
    const change_number = `CO-${String(coCount).padStart(3, '0')}`
    const { data, error } = await supabase.from('change_orders').insert({
      ...coForm,
      change_number,
      client_id: selected.id,
      user_id: user!.id,
    }).select().single()
    if (!error && data) {
      setChangeOrders(prev => [data as ChangeOrder, ...prev])
      setShowCOModal(false)
      setCoForm({ title: '', description: '', reason: '', amount_change: 0, timeline_impact: '', status: 'pending', approved_by: '', estimate_id: undefined })
    }
    setSavingCO(false)
  }

  const updateCOStatus = async (coId: string, status: ChangeOrder['status']) => {
    await supabase.from('change_orders').update({ status }).eq('id', coId)
    setChangeOrders(prev => prev.map(co => co.id === coId ? { ...co, status } : co))
  }

  const deleteCO = async (coId: string) => {
    if (!confirm('Delete this change order?')) return
    await supabase.from('change_orders').delete().eq('id', coId)
    setChangeOrders(prev => prev.filter(co => co.id !== coId))
  }

  // ── derived ────────────────────────────────────────────────────
  const filtered = useMemo(() => clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  }), [clients, search, filterStatus])

  const stats = useMemo(() => ({
    active:    clients.filter(c => c.status === 'active').length,
    prospects: clients.filter(c => c.status === 'prospect').length,
  }), [clients])

  // ── sub-components ─────────────────────────────────────────────
  function StatusBadge({ status }: { status: Client['status'] }) {
    const cfg = STATUS_CONFIG[status]
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
        <Icon className="w-3 h-3" />{cfg.label}
      </span>
    )
  }

  function PaymentBadge({ est }: { est: EstimateRecord }) {
    const depPaid = est.deposit_paid
    const balPaid = est.balance_paid
    if (balPaid) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✓ {t('crm.payment.balancePaid')}</span>
    if (depPaid) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">✓ {t('crm.payment.depositPaid')}</span>
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{t('crm.payment.depositUnpaid')}</span>
  }

  const CO_STATUS_COLORS: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-700',
    approved:  'bg-green-100 text-green-700',
    declined:  'bg-red-100 text-red-600',
    completed: 'bg-gray-100 text-gray-600',
  }

  const CO_STATUS_LABELS: Record<string, string> = {
    pending:   t('crm.co.statusPending'),
    approved:  t('crm.co.statusApproved'),
    declined:  t('crm.co.statusDeclined'),
    completed: t('crm.co.statusCompleted'),
  }

  // ── render ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* ── Sidebar ── */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <h2 className="font-bold text-gray-900">{t('crm.title')}</h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{clients.length}</span>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" /> {t('crm.add')}
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="form-input pl-9 text-sm"
              placeholder={t('crm.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {['all', ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                  filterStatus === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s === 'all' ? t('crm.all') : STATUS_CONFIG[s as Client['status']].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-gray-100 text-center">
          <div className="bg-green-50 rounded-lg py-2">
            <p className="text-lg font-black text-green-700">{stats.active}</p>
            <p className="text-xs text-green-600">{t('crm.active')}</p>
          </div>
          <div className="bg-blue-50 rounded-lg py-2">
            <p className="text-lg font-black text-blue-700">{stats.prospects}</p>
            <p className="text-xs text-blue-600">{t('crm.prospects')}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('crm.noClients')}</p>
              <button onClick={() => setShowAddModal(true)} className="text-xs text-brand-600 hover:underline mt-1">
                {t('crm.addFirst')}
              </button>
            </div>
          ) : (
            filtered.map(client => (
              <button key={client.id} onClick={() => loadClientDetail(client)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition group ${
                  selected?.id === client.id ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate text-gray-900">{client.name}</p>
                    {client.email && <p className="text-xs text-gray-400 truncate">{client.email}</p>}
                    {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={client.status} />
                    {client.total_value > 0 && (
                      <span className="text-xs font-bold text-brand-600">{fmt(client.total_value)}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main Detail ── */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <Users className="w-16 h-16 opacity-20" />
            <p className="text-lg font-medium">{t('crm.selectPrompt')}</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> {t('crm.addFirstBtn')}
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6">
            {/* Client header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-black text-gray-900">{selected.name}</h1>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                    {selected.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selected.email}</span>}
                    {selected.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selected.phone}</span>}
                    {selected.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[selected.city, selected.state].filter(Boolean).join(', ')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selected.status}
                    onChange={e => updateStatus(selected.id, e.target.value as Client['status'])}
                    className="form-input text-xs py-1.5 w-36"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                  <button onClick={() => deleteClient(selected.id)} className="btn-danger p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {selected.total_value > 0 && (
                <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 inline-flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-bold text-brand-700">{t('crm.totalValue')}: {fmt(selected.total_value)}</span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit flex-wrap">
              {([
                { key: 'info', label: t('crm.tabInfo') },
                { key: 'docs', label: `${t('crm.tabDocs')} (${estimates.length})` },
                { key: 'co',   label: `${t('crm.tabChangeOrders')} (${changeOrders.length})` },
                { key: 'notes', label: `${t('crm.tabNotes')} (${notes.length})` },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                    tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab: Info ── */}
            {tab === 'info' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 text-sm">
                <h3 className="font-bold text-gray-700 border-b pb-2">{t('crm.contactDetails')}</h3>
                {[
                  [t('crm.email'),   selected.email],
                  [t('crm.phone'),   selected.phone],
                  [t('crm.address'), [selected.address, selected.city, selected.state, selected.zip].filter(Boolean).join(', ')],
                  [t('crm.source'),  selected.source],
                  [t('crm.added'),   format(new Date(selected.created_at), 'MMM d, yyyy')],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label as string} className="flex gap-3">
                    <span className="text-gray-400 w-24 shrink-0">{label}</span>
                    <span className="text-gray-800">{value}</span>
                  </div>
                ))}
                {selected.notes && (
                  <>
                    <h3 className="font-bold text-gray-700 border-b pb-2 pt-2">{t('crm.generalNotes')}</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{selected.notes}</p>
                  </>
                )}
              </div>
            )}

            {/* ── Tab: Docs (Estimates + Invoices) ── */}
            {tab === 'docs' && (
              <div className="space-y-3">
                {estimates.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{t('crm.noDocs')}</p>
                  </div>
                ) : (
                  estimates.map(est => (
                    <div key={est.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      {/* Estimate row */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-gray-400">{est.estimate_number}</p>
                          <p className="font-semibold text-sm capitalize">{est.project_type?.replace(/-/g, ' ')}</p>
                          <p className="text-xs text-gray-400">{format(new Date(est.created_at), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="text-right mr-2">
                          <p className="font-bold text-brand-700">{fmt(est.total_quote)}</p>
                          <div className="flex flex-col items-end gap-1 mt-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              { draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
                                accepted: 'bg-green-100 text-green-700', declined: 'bg-red-100 text-red-600' }[est.status]
                            }`}>{est.status}</span>
                            <PaymentBadge est={est} />
                          </div>
                        </div>
                        <button
                          onClick={() => openPayment(est)}
                          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition"
                          title={t('crm.payment.title')}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          {expandedPayment === est.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Payment tracking panel */}
                      {expandedPayment === est.id && (
                        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                          <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-brand-600" />
                            {t('crm.payment.title')}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Deposit */}
                            <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-gray-600">{t('crm.payment.deposit')}</span>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox"
                                    checked={paymentForm.deposit_paid ?? false}
                                    onChange={e => setPaymentForm(f => ({ ...f, deposit_paid: e.target.checked }))}
                                    className="w-4 h-4 rounded accent-brand-600"
                                  />
                                  <span className="text-xs font-medium text-gray-600">{t('crm.payment.depositPaid')}</span>
                                </label>
                              </div>
                              <div>
                                <label className="form-label">{t('crm.payment.amount')}</label>
                                <input type="number" min="0" step="0.01"
                                  className="form-input text-sm"
                                  value={paymentForm.deposit_amount ?? ''}
                                  onChange={e => setPaymentForm(f => ({ ...f, deposit_amount: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>
                              <div>
                                <label className="form-label">{t('crm.payment.method')}</label>
                                <select className="form-input text-sm"
                                  value={paymentForm.deposit_method ?? ''}
                                  onChange={e => setPaymentForm(f => ({ ...f, deposit_method: e.target.value }))}>
                                  <option value="">—</option>
                                  {PAYMENT_METHODS.map(m => (
                                    <option key={m.value} value={m.value}>{t(m.key)}</option>
                                  ))}
                                </select>
                              </div>
                              {paymentForm.deposit_paid && paymentForm.deposit_paid_at && (
                                <p className="text-xs text-gray-400">
                                  {t('crm.payment.date')}: {format(new Date(paymentForm.deposit_paid_at), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>

                            {/* Balance */}
                            <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-gray-600">{t('crm.payment.balance')}</span>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox"
                                    checked={paymentForm.balance_paid ?? false}
                                    onChange={e => setPaymentForm(f => ({ ...f, balance_paid: e.target.checked }))}
                                    className="w-4 h-4 rounded accent-brand-600"
                                  />
                                  <span className="text-xs font-medium text-gray-600">{t('crm.payment.balancePaid')}</span>
                                </label>
                              </div>
                              <div>
                                <label className="form-label">{t('crm.payment.method')}</label>
                                <select className="form-input text-sm"
                                  value={paymentForm.balance_method ?? ''}
                                  onChange={e => setPaymentForm(f => ({ ...f, balance_method: e.target.value }))}>
                                  <option value="">—</option>
                                  {PAYMENT_METHODS.map(m => (
                                    <option key={m.value} value={m.value}>{t(m.key)}</option>
                                  ))}
                                </select>
                              </div>
                              {paymentForm.balance_paid && paymentForm.balance_paid_at && (
                                <p className="text-xs text-gray-400">
                                  {t('crm.payment.date')}: {format(new Date(paymentForm.balance_paid_at), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end mt-3">
                            <button
                              onClick={() => savePayment(est.id)}
                              disabled={savingPayment}
                              className="btn-primary text-xs"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              {savingPayment ? t('crm.payment.saving') : t('crm.payment.update')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Tab: Change Orders ── */}
            {tab === 'co' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button onClick={() => setShowCOModal(true)} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> {t('crm.co.add')}
                  </button>
                </div>
                {changeOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 text-center py-12 text-gray-400">
                    <RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{t('crm.co.none')}</p>
                  </div>
                ) : (
                  changeOrders.map(co => (
                    <div key={co.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-gray-400">{t('crm.co.number')}{co.change_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CO_STATUS_COLORS[co.status]}`}>
                              {CO_STATUS_LABELS[co.status]}
                            </span>
                          </div>
                          <p className="font-bold text-sm text-gray-900">{co.title}</p>
                          {co.description && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{co.description}</p>}
                          {co.reason && <p className="text-xs text-gray-500 mt-1"><strong>{t('crm.co.reason')}:</strong> {co.reason}</p>}
                          {co.timeline_impact && <p className="text-xs text-gray-500 mt-0.5"><strong>{t('crm.co.timeline')}:</strong> {co.timeline_impact}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold text-sm ${co.amount_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {co.amount_change >= 0 ? '+' : ''}{fmt(co.amount_change)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{format(new Date(co.created_at), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        <select
                          value={co.status}
                          onChange={e => updateCOStatus(co.id, e.target.value as ChangeOrder['status'])}
                          className="form-input text-xs py-1 flex-1 max-w-[180px]"
                        >
                          {CO_STATUSES.map(s => (
                            <option key={s} value={s}>{CO_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        {co.approved_by && <span className="text-xs text-gray-500 flex-1">{t('crm.co.approvedBy')}: {co.approved_by}</span>}
                        <button onClick={() => deleteCO(co.id)} className="btn-danger p-1.5 ml-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Tab: Notes ── */}
            {tab === 'notes' && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <textarea
                    className="form-input text-sm resize-none"
                    rows={3}
                    placeholder={t('crm.notePlaceholder')}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={addNote} disabled={!noteText.trim()} className="btn-primary text-xs">
                      <StickyNote className="w-3.5 h-3.5" /> {t('crm.addNote')}
                    </button>
                  </div>
                </div>
                {notes.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-6">{t('crm.noNotes')}</p>
                )}
                {notes.map(n => (
                  <div key={n.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{n.body}</p>
                      <button onClick={() => deleteNote(n.id)}
                        className="opacity-0 group-hover:opacity-100 btn-danger p-1 shrink-0 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{format(new Date(n.created_at), 'MMM d, yyyy · h:mm a')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Client Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{t('crm.addClientTitle')}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="form-label">{t('crm.fullName')}</label>
                  <input className="form-input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">{t('client.company')}</label>
                  <input className="form-input" value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company (optional)" />
                </div>
                <div>
                  <label className="form-label">{t('crm.email')}</label>
                  <input className="form-input" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">{t('crm.phone')}</label>
                  <input className="form-input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">{t('crm.address')}</label>
                  <input className="form-input" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">{t('onboard.city')}</label>
                  <input className="form-input" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label">{t('onboard.state')}</label>
                    <input className="form-input" value={form.state || ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">{t('onboard.zip')}</label>
                    <input className="form-input" value={form.zip || ''} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">{t('crm.statusLabel')}</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Client['status'] }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">{t('crm.source')}</label>
                  <input className="form-input" placeholder={t('crm.sourcePlaceholder')} value={form.source || ''} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">{t('crm.generalNotes')}</label>
                  <textarea className="form-input resize-none" rows={3} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={saveClient} disabled={saving || !form.name?.trim()} className="btn-primary">
                {saving ? t('onboard.saving') : t('crm.saveClient')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Order Modal ── */}
      {showCOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-brand-600" />
                {t('crm.co.modalTitle')}
              </h2>
              <button onClick={() => setShowCOModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Disclaimer */}
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">{t('crm.co.disclaimer')}</p>
              </div>

              {/* Client info preview */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
                <p><strong>{t('crm.title')}:</strong> {selected?.name}</p>
                {selected?.email && <p><strong>{t('crm.email')}:</strong> {selected.email}</p>}
                {selected?.phone && <p><strong>{t('crm.phone')}:</strong> {selected.phone}</p>}
              </div>

              <div>
                <label className="form-label">{t('crm.co.linkedEstimate')}</label>
                <select className="form-input text-sm"
                  value={coForm.estimate_id ?? ''}
                  onChange={e => setCoForm(f => ({ ...f, estimate_id: e.target.value || undefined }))}>
                  <option value="">{t('crm.co.selectEstimate')}</option>
                  {estimates.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.estimate_number} — {e.project_type?.replace(/-/g, ' ')} ({fmt(e.total_quote)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">{t('crm.co.changeTitle')}</label>
                <input className="form-input"
                  value={coForm.title ?? ''}
                  onChange={e => setCoForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Add exterior trim painting"
                />
              </div>

              <div>
                <label className="form-label">{t('crm.co.description')}</label>
                <textarea className="form-input resize-none text-sm" rows={3}
                  value={coForm.description ?? ''}
                  onChange={e => setCoForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detail what is being added, removed, or changed..."
                />
              </div>

              <div>
                <label className="form-label">{t('crm.co.reason')}</label>
                <input className="form-input text-sm"
                  value={coForm.reason ?? ''}
                  onChange={e => setCoForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Client request, site condition, scope addition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">{t('crm.co.amountChange')}</label>
                  <input type="number" step="0.01" className="form-input text-sm"
                    value={coForm.amount_change ?? 0}
                    onChange={e => setCoForm(f => ({ ...f, amount_change: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="form-label">{t('crm.co.status')}</label>
                  <select className="form-input text-sm"
                    value={coForm.status ?? 'pending'}
                    onChange={e => setCoForm(f => ({ ...f, status: e.target.value as ChangeOrder['status'] }))}>
                    {CO_STATUSES.map(s => (
                      <option key={s} value={s}>{CO_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">{t('crm.co.timeline')}</label>
                <input className="form-input text-sm"
                  value={coForm.timeline_impact ?? ''}
                  onChange={e => setCoForm(f => ({ ...f, timeline_impact: e.target.value }))}
                  placeholder="e.g. Adds 2 additional business days"
                />
              </div>

              {coForm.status === 'approved' && (
                <div>
                  <label className="form-label">{t('crm.co.approvedBy')}</label>
                  <input className="form-input text-sm"
                    value={coForm.approved_by ?? ''}
                    onChange={e => setCoForm(f => ({ ...f, approved_by: e.target.value }))}
                    placeholder="Client name or initials"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowCOModal(false)} className="btn-secondary">{t('common.cancel')}</button>
              <button
                onClick={saveChangeOrder}
                disabled={savingCO || !coForm.title?.trim() || !coForm.description?.trim()}
                className="btn-primary"
              >
                {savingCO ? t('crm.payment.saving') : t('crm.co.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
