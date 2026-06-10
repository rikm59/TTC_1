import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, isWithinInterval, addDays } from 'date-fns'
import {
  Calculator, Users, BarChart2, TrendingUp, DollarSign,
  AlertCircle, CheckCircle2, Clock, Target, ArrowRight,
  FileText, PlusCircle,
} from 'lucide-react'
import { supabase, type EstimateRecord } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { fmt } from '../utils/calculations'

type ClientMap = Record<string, string>

function outstanding(e: EstimateRecord): number {
  if (e.balance_paid) return 0
  return e.total_quote - (e.deposit_paid ? e.deposit_amount : 0)
}

function daysOld(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

const STATUS_BADGE: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { lang } = useLanguage()
  const navigate = useNavigate()

  const [estimates, setEstimates] = useState<EstimateRecord[]>([])
  const [clientMap, setClientMap] = useState<ClientMap>({})
  const [loading, setLoading] = useState(true)

  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const companyName = profile?.company_name || profile?.business_name || ''

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase
        .from('estimates')
        .select('id, estimate_number, project_type, status, total_quote, deposit_amount, deposit_paid, deposit_paid_at, balance_paid, balance_paid_at, created_at, updated_at, client_id, data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id),
    ]).then(([estRes, clientRes]) => {
      if (estRes.data) setEstimates(estRes.data as EstimateRecord[])
      if (clientRes.data) {
        const map: ClientMap = {}
        for (const c of clientRes.data) map[c.id] = c.name
        setClientMap(map)
      }
      setLoading(false)
    })
  }, [user?.id])

  // ── Summary metrics ───────────────────────────────────────────────────────────
  const thisMonthStart = useMemo(() => startOfMonth(new Date()), [])

  const openEstimates = useMemo(
    () => estimates.filter(e => e.status === 'draft' || e.status === 'sent'),
    [estimates]
  )

  const pendingValue = useMemo(
    () => openEstimates.reduce((s, e) => s + e.total_quote, 0),
    [openEstimates]
  )

  const outstandingBalance = useMemo(
    () => estimates
      .filter(e => e.status === 'accepted' && !e.balance_paid)
      .reduce((s, e) => s + outstanding(e), 0),
    [estimates]
  )

  const revenueThisMonth = useMemo(
    () => estimates
      .filter(e => e.balance_paid && isWithinInterval(new Date(e.created_at), { start: thisMonthStart, end: new Date() }))
      .reduce((s, e) => s + e.total_quote, 0),
    [estimates, thisMonthStart]
  )

  const winRate = useMemo(() => {
    const sent = estimates.filter(e => ['sent', 'accepted', 'declined'].includes(e.status))
    if (sent.length === 0) return null
    return Math.round((estimates.filter(e => e.status === 'accepted').length / sent.length) * 100)
  }, [estimates])

  // ── Aging alerts — sent estimates with no response 7+ days ───────────────────
  const needFollowUp = useMemo(
    () => estimates
      .filter(e => e.status === 'sent' && daysOld(e.created_at) > 7)
      .sort((a, b) => daysOld(b.created_at) - daysOld(a.created_at))
      .slice(0, 5),
    [estimates]
  )

  // ── Upcoming project starts (next 14 days) ────────────────────────────────────
  const upcomingProjects = useMemo(() => {
    const now = new Date()
    const cutoff = addDays(now, 14)
    return estimates
      .filter(e => {
        if (e.status !== 'accepted') return false
        const startDate = (e.data as { settings?: { projectStartDate?: string } } | null)?.settings?.projectStartDate
        if (!startDate) return false
        const d = new Date(startDate + 'T12:00:00')
        return d >= now && d <= cutoff
      })
      .map(e => ({
        ...e,
        startDate: (e.data as { settings?: { projectStartDate?: string } } | null)?.settings?.projectStartDate!,
      }))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5)
  }, [estimates])

  // ── Recent estimates ──────────────────────────────────────────────────────────
  const recentEstimates = useMemo(() => estimates.slice(0, 7), [estimates])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  const isEs = lang === 'es'
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return isEs ? 'Buenos días' : 'Good morning'
    if (h < 17) return isEs ? 'Buenas tardes' : 'Good afternoon'
    return isEs ? 'Buenas noches' : 'Good evening'
  })()

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
            {companyName && (
              <p className="text-sm text-gray-500 mt-0.5">{companyName}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={() => navigate('/estimator')}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            {isEs ? 'Nuevo Estimado' : 'New Estimate'}
          </button>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Estimados Abiertos' : 'Open Estimates'}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">{openEstimates.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmt(pendingValue)}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Saldo Pendiente' : 'Outstanding'}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">{fmt(outstandingBalance)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEs ? 'Trabajos aceptados' : 'Accepted jobs'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Cobrado Este Mes' : 'Revenue This Month'}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">{fmt(revenueThisMonth)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{format(new Date(), 'MMMM yyyy')}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Tasa de Cierre' : 'Win Rate'}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">
              {winRate !== null ? `${winRate}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEs ? 'Enviados → Aceptados' : 'Sent → Accepted'}
            </p>
          </div>
        </div>

        {/* ── Follow-up alerts + Upcoming projects ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Follow-up alerts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50">
              <h3 className="font-bold text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                {isEs ? 'Requieren Seguimiento' : 'Need Follow-Up'}
              </h3>
              <button
                onClick={() => navigate('/reports')}
                className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-0.5"
              >
                {isEs ? 'Ver todo' : 'View all'} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {needFollowUp.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <CheckCircle2 className="w-7 h-7 opacity-30 mb-1.5" />
                <p className="text-sm font-medium">
                  {isEs ? '¡Todo al día!' : 'All caught up!'}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {isEs ? 'Sin estimados pendientes de respuesta' : 'No estimates awaiting response'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {needFollowUp.map(e => {
                  const days = daysOld(e.created_at)
                  return (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => navigate('/crm')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">
                          {clientMap[e.client_id ?? ''] ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500 truncate capitalize">
                          {e.project_type?.replace(/-/g, ' ') ?? '—'} · #{e.estimate_number}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-gray-900">{fmt(e.total_quote)}</p>
                        <p className={`text-xs font-semibold ${days > 30 ? 'text-red-500' : 'text-amber-500'}`}>
                          {days}d {isEs ? 'sin respuesta' : 'no response'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Upcoming projects */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-green-50">
              <h3 className="font-bold text-sm text-green-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                {isEs ? 'Proyectos Próximos (14 días)' : 'Upcoming Projects (14 days)'}
              </h3>
            </div>
            {upcomingProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <TrendingUp className="w-7 h-7 opacity-30 mb-1.5" />
                <p className="text-sm font-medium">
                  {isEs ? 'Sin proyectos próximos' : 'No upcoming projects'}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {isEs ? 'Agrega fechas de inicio en tus estimados' : 'Set start dates in your estimates'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {upcomingProjects.map(e => {
                  const startDate = new Date(e.startDate + 'T12:00:00')
                  const daysAway = Math.round((startDate.getTime() - Date.now()) / 86400000)
                  return (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => navigate('/crm')}
                    >
                      <div className="shrink-0 w-10 h-10 bg-green-50 border border-green-200 rounded-lg flex flex-col items-center justify-center">
                        <p className="text-xs font-bold text-green-700 leading-none">
                          {format(startDate, 'MMM')}
                        </p>
                        <p className="text-base font-black text-green-800 leading-none">
                          {format(startDate, 'd')}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">
                          {clientMap[e.client_id ?? ''] ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500 truncate capitalize">
                          {e.project_type?.replace(/-/g, ' ') ?? '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-gray-900">{fmt(e.total_quote)}</p>
                        <p className="text-xs text-green-600 font-medium">
                          {daysAway === 0 ? (isEs ? 'Hoy' : 'Today') :
                           daysAway === 1 ? (isEs ? 'Mañana' : 'Tomorrow') :
                           (isEs ? `en ${daysAway} días` : `in ${daysAway} days`)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Recent Estimates ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              {isEs ? 'Estimados Recientes' : 'Recent Estimates'}
            </h3>
            <button
              onClick={() => navigate('/estimator')}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-0.5"
            >
              {isEs ? 'Ver todos' : 'View all'} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentEstimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-sm font-medium">
                {isEs ? 'Sin estimados aún' : 'No estimates yet'}
              </p>
              <button
                onClick={() => navigate('/estimator')}
                className="mt-3 flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {isEs ? 'Crear primer estimado' : 'Create your first estimate'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {isEs ? 'Est #' : 'Est #'}
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {isEs ? 'Cliente' : 'Client'}
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                      {isEs ? 'Tipo' : 'Type'}
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                      {isEs ? 'Fecha' : 'Date'}
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {isEs ? 'Estado' : 'Status'}
                    </th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {isEs ? 'Total' : 'Total'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEstimates.map(e => (
                    <tr
                      key={e.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => navigate('/crm')}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs text-gray-400">
                        {e.estimate_number ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-800 max-w-[120px] truncate">
                        {clientMap[e.client_id ?? ''] ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 capitalize hidden sm:table-cell">
                        {e.project_type?.replace(/-/g, ' ') ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 hidden md:table-cell whitespace-nowrap">
                        {format(new Date(e.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[e.status]}`}>
                          {isEs
                            ? { draft: 'Borrador', sent: 'Enviado', accepted: 'Aceptado', declined: 'Rechazado' }[e.status]
                            : e.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                        {fmt(e.total_quote)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: Calculator, label: isEs ? 'Nuevo Estimado' : 'New Estimate', path: '/estimator', color: 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100' },
            { icon: Users,      label: isEs ? 'Gestionar Clientes' : 'Manage Clients', path: '/crm', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
            { icon: BarChart2,  label: isEs ? 'Ver Reportes' : 'View Reports', path: '/reports', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
          ].map(({ icon: Icon, label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 px-4 py-4 rounded-xl border font-semibold text-sm transition ${color}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
