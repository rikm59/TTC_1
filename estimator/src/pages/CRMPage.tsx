import { useState, useEffect, useMemo } from 'react'
import { supabase, type Client, type ClientNote, type EstimateRecord } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import {
  Users, Plus, Search, Phone, Mail, MapPin, FileText,
  StickyNote, Trash2, X, ChevronRight, TrendingUp,
  CheckCircle2, Clock, XCircle, PauseCircle, UserPlus
} from 'lucide-react'
import { fmt } from '../utils/calculations'

const STATUS_CONFIG = {
  prospect:  { label: 'Prospect',   color: 'bg-blue-100 text-blue-700',   icon: Clock },
  active:    { label: 'Active',     color: 'bg-green-100 text-green-700', icon: TrendingUp },
  completed: { label: 'Completed',  color: 'bg-gray-100 text-gray-600',   icon: CheckCircle2 },
  'on-hold': { label: 'On Hold',    color: 'bg-yellow-100 text-yellow-700', icon: PauseCircle },
  declined:  { label: 'Declined',   color: 'bg-red-100 text-red-600',     icon: XCircle },
}

const STATUSES = Object.keys(STATUS_CONFIG) as Client['status'][]

function StatusBadge({ status }: { status: Client['status'] }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

const BLANK_CLIENT: Partial<Client> = {
  name: '', email: '', phone: '', address: '', city: '', state: '', zip: '',
  status: 'prospect', source: '', notes: '',
}

export default function CRMPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [estimates, setEstimates] = useState<EstimateRecord[]>([])
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<Partial<Client>>(BLANK_CLIENT)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'estimates' | 'notes'>('info')

  useEffect(() => { if (user) loadClients() }, [user?.id])

  const loadClients = async () => {
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('id, name, email, phone, address, city, state, zip, status, source, tags, notes, total_value, created_at, updated_at, user_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (data) setClients(data as Client[])
  }

  const loadClientDetail = async (client: Client) => {
    setSelected(client)
    setTab('info')
    const [est, nts] = await Promise.all([
      supabase.from('estimates').select('id, estimate_number, project_type, total_quote, status, created_at, updated_at, client_id').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('client_notes').select('id, client_id, user_id, body, created_at').eq('client_id', client.id).order('created_at', { ascending: false }),
    ])
    if (est.data) setEstimates(est.data as EstimateRecord[])
    if (nts.data) setNotes(nts.data as ClientNote[])
  }

  const saveClient = async () => {
    if (!form.name?.trim()) return
    setSaving(true)
    const payload = { ...form, user_id: user!.id }
    const { data, error } = await supabase.from('clients').insert(payload).select().single()
    if (!error && data) {
      setClients(prev => [data as Client, ...prev])
      setShowAddModal(false)
      setForm(BLANK_CLIENT)
    }
    setSaving(false)
  }

  const updateStatus = async (clientId: string, status: Client['status']) => {
    await supabase.from('clients').update({ status }).eq('id', clientId)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status } : c))
    if (selected?.id === clientId) setSelected(prev => prev ? { ...prev, status } : prev)
  }

  const deleteClient = async (clientId: string) => {
    if (!confirm('Delete this client and all their data?')) return
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

  const filtered = useMemo(() => clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  }), [clients, search, filterStatus])

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    prospects: clients.filter(c => c.status === 'prospect').length,
    value: clients.reduce((s, c) => s + (c.total_value || 0), 0),
  }), [clients])

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <h2 className="font-bold text-gray-900">Clients</h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{clients.length}</span>
            </div>
            <button onClick={() => setShowAddModal(true)}
              className="btn-primary text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="form-input pl-9 text-sm"
              placeholder="Search clients..."
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
                {s === 'all' ? 'All' : STATUS_CONFIG[s as Client['status']].label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-gray-100 text-center">
          <div className="bg-green-50 rounded-lg py-2">
            <p className="text-lg font-black text-green-700">{stats.active}</p>
            <p className="text-xs text-green-600">Active</p>
          </div>
          <div className="bg-blue-50 rounded-lg py-2">
            <p className="text-lg font-black text-blue-700">{stats.prospects}</p>
            <p className="text-xs text-blue-600">Prospects</p>
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No clients yet</p>
              <button onClick={() => setShowAddModal(true)} className="text-xs text-brand-600 hover:underline mt-1">
                Add your first client
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

      {/* Main Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <Users className="w-16 h-16 opacity-20" />
            <p className="text-lg font-medium">Select a client to view details</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add First Client
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
                  <span className="text-sm font-bold text-brand-700">Total Value: {fmt(selected.total_value)}</span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
              {(['info', 'estimates', 'notes'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                    tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {t === 'estimates' ? `Estimates (${estimates.length})` : t === 'notes' ? `Notes (${notes.length})` : 'Info'}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {tab === 'info' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 text-sm">
                <h3 className="font-bold text-gray-700 border-b pb-2">Contact Details</h3>
                {[
                  ['Email', selected.email],
                  ['Phone', selected.phone],
                  ['Address', [selected.address, selected.city, selected.state, selected.zip].filter(Boolean).join(', ')],
                  ['Source', selected.source],
                  ['Added', format(new Date(selected.created_at), 'MMM d, yyyy')],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label as string} className="flex gap-3">
                    <span className="text-gray-400 w-20 shrink-0">{label}</span>
                    <span className="text-gray-800">{value}</span>
                  </div>
                ))}
                {selected.notes && (
                  <>
                    <h3 className="font-bold text-gray-700 border-b pb-2 pt-2">Notes</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{selected.notes}</p>
                  </>
                )}
              </div>
            )}

            {/* Tab: Estimates */}
            {tab === 'estimates' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {estimates.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No estimates for this client yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {estimates.map(e => (
                      <div key={e.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-gray-400">{e.estimate_number}</p>
                          <p className="font-semibold text-sm capitalize">{e.project_type?.replace(/-/g, ' ')}</p>
                          <p className="text-xs text-gray-400">{format(new Date(e.created_at), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-700">{fmt(e.total_quote)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            { draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
                              accepted: 'bg-green-100 text-green-700', declined: 'bg-red-100 text-red-600' }[e.status]
                          }`}>{e.status}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Notes */}
            {tab === 'notes' && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <textarea
                    className="form-input text-sm resize-none"
                    rows={3}
                    placeholder="Add a note about this client..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={addNote} disabled={!noteText.trim()} className="btn-primary text-xs">
                      <StickyNote className="w-3.5 h-3.5" /> Add Note
                    </button>
                  </div>
                </div>
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

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">Add New Client</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label">State</label>
                    <input className="form-input" value={form.state || ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">ZIP</label>
                    <input className="form-input" value={form.zip || ''} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Client['status'] }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Source</label>
                  <input className="form-input" placeholder="Referral, Google, etc." value={form.source || ''} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea className="form-input resize-none" rows={3} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={saveClient} disabled={saving || !form.name?.trim()} className="btn-primary">
                {saving ? 'Saving...' : 'Save Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
