import { useState, useEffect, useMemo } from 'react'
import { supabase, type EstimateRecord } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { fmt } from '../utils/calculations'
import { format, startOfMonth, subMonths, startOfYear, isWithinInterval } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  TrendingUp, DollarSign, AlertCircle, Target, BarChart2,
  Printer, Download, Mail, X, CheckCircle2, Clock,
  FileText, XCircle,
} from 'lucide-react'

type DateRange = 'thisMonth' | 'last3' | 'thisYear' | 'allTime'
type ReportTab = 'overview' | 'payments' | 'pipeline' | 'projects' | 'aging'
type PaymentFilter = 'all' | 'paid' | 'partial' | 'unpaid'
type AgingBucket = 'current' | 'late1' | 'late2' | 'overdue'

type ClientMap = Record<string, string>

const AGING_STYLES: Record<AgingBucket, { label: string; labelEs: string; badge: string; row: string; card: string }> = {
  current: { label: '0–14 days',  labelEs: '0–14 días',   badge: 'bg-green-100 text-green-700',  row: '',                card: 'border-green-200 bg-green-50' },
  late1:   { label: '15–30 days', labelEs: '15–30 días',  badge: 'bg-amber-100 text-amber-700',  row: 'bg-amber-50/40',  card: 'border-amber-200 bg-amber-50' },
  late2:   { label: '31–60 days', labelEs: '31–60 días',  badge: 'bg-orange-100 text-orange-700',row: 'bg-orange-50/50', card: 'border-orange-200 bg-orange-50' },
  overdue: { label: '60+ days',   labelEs: '60+ días',    badge: 'bg-red-100 text-red-700',      row: 'bg-red-50/40',    card: 'border-red-200 bg-red-50' },
}

function getDaysOld(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
}

function getAgingBucket(days: number): AgingBucket {
  if (days <= 14) return 'current'
  if (days <= 30) return 'late1'
  if (days <= 60) return 'late2'
  return 'overdue'
}

function getDateRange(range: DateRange): { start: Date; end: Date } {
  const now = new Date()
  switch (range) {
    case 'thisMonth':
      return { start: startOfMonth(now), end: now }
    case 'last3':
      return { start: startOfMonth(subMonths(now, 2)), end: now }
    case 'thisYear':
      return { start: startOfYear(now), end: now }
    case 'allTime':
      return { start: new Date('2000-01-01'), end: now }
  }
}

function filterByRange(estimates: EstimateRecord[], range: DateRange): EstimateRecord[] {
  const { start, end } = getDateRange(range)
  return estimates.filter(e => {
    const d = new Date(e.created_at)
    return isWithinInterval(d, { start, end })
  })
}

function outstanding(e: EstimateRecord): number {
  if (e.balance_paid) return 0
  return e.total_quote - (e.deposit_paid ? e.deposit_amount : 0)
}

const STATUS_COLORS: Record<EstimateRecord['status'], string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()

  const [allEstimates, setAllEstimates] = useState<EstimateRecord[]>([])
  const [clientMap, setClientMap] = useState<ClientMap>({})
  const [loading, setLoading] = useState(true)

  const [dateRange, setDateRange] = useState<DateRange>('thisMonth')
  const [tab, setTab] = useState<ReportTab>('overview')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailSendStatus, setEmailSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase
        .from('estimates')
        .select('id, estimate_number, project_type, status, total_quote, deposit_amount, deposit_paid, deposit_paid_at, deposit_method, balance_paid, balance_paid_at, balance_method, created_at, client_id, updated_at, user_id, data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id),
    ]).then(([estRes, clientRes]) => {
      if (estRes.data) setAllEstimates(estRes.data as EstimateRecord[])
      if (clientRes.data) {
        const map: ClientMap = {}
        for (const c of clientRes.data) map[c.id] = c.name
        setClientMap(map)
      }
      setLoading(false)
    })
  }, [user?.id])

  const estimates = useMemo(() => filterByRange(allEstimates, dateRange), [allEstimates, dateRange])

  // ── Summary card values ──────────────────────────────────────────────────────
  const revenueCollected = useMemo(
    () => estimates.filter(e => e.balance_paid).reduce((s, e) => s + e.total_quote, 0),
    [estimates]
  )

  const outstandingTotal = useMemo(
    () => estimates
      .filter(e => e.status === 'accepted' && !e.balance_paid)
      .reduce((s, e) => s + outstanding(e), 0),
    [estimates]
  )

  const winRate = useMemo(() => {
    const denom = estimates.filter(e => ['sent', 'accepted', 'declined'].includes(e.status)).length
    if (denom === 0) return null
    const accepted = estimates.filter(e => e.status === 'accepted').length
    return Math.round((accepted / denom) * 100)
  }, [estimates])

  const pipeline = useMemo(
    () => estimates.filter(e => e.status !== 'declined').reduce((s, e) => s + e.total_quote, 0),
    [estimates]
  )

  // ── Monthly chart data (last 12 months or filtered range) ────────────────────
  const monthlyData = useMemo(() => {
    const months: { label: string; key: string; value: number }[] = []
    const now = new Date()
    const count = dateRange === 'thisMonth' ? 1 : dateRange === 'last3' ? 3 : dateRange === 'thisYear' ? new Date().getMonth() + 1 : 12
    for (let i = count - 1; i >= 0; i--) {
      const d = subMonths(now, i)
      const key = format(d, 'yyyy-MM')
      const label = format(d, 'MMM')
      const value = allEstimates
        .filter(e => e.balance_paid && format(new Date(e.created_at), 'yyyy-MM') === key)
        .reduce((s, e) => s + e.total_quote, 0)
      months.push({ label, key, value })
    }
    return months
  }, [allEstimates, dateRange])

  const maxMonthlyValue = useMemo(() => Math.max(...monthlyData.map(m => m.value), 1), [monthlyData])

  // ── Top project types ─────────────────────────────────────────────────────────
  const topProjectTypes = useMemo(() => {
    const map: Record<string, number> = {}
    estimates
      .filter(e => e.status === 'accepted')
      .forEach(e => {
        const pt = e.project_type ?? 'Unknown'
        map[pt] = (map[pt] ?? 0) + e.total_quote
      })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [estimates])

  // ── Recent estimates ─────────────────────────────────────────────────────────
  const recentEstimates = useMemo(() => [...estimates].slice(0, 5), [estimates])

  // ── Payments tab data ─────────────────────────────────────────────────────────
  const paymentRows = useMemo(() => {
    return estimates.filter(e => {
      if (paymentFilter === 'paid') return e.balance_paid
      if (paymentFilter === 'partial') return e.deposit_paid && !e.balance_paid
      if (paymentFilter === 'unpaid') return !e.deposit_paid && !e.balance_paid
      return true
    })
  }, [estimates, paymentFilter])

  const paymentTotals = useMemo(() => ({
    totalQuote: paymentRows.reduce((s, e) => s + e.total_quote, 0),
    depositReceived: paymentRows.filter(e => e.deposit_paid).reduce((s, e) => s + e.deposit_amount, 0),
    outstanding: paymentRows.reduce((s, e) => s + outstanding(e), 0),
  }), [paymentRows])

  // ── Pipeline tab data ─────────────────────────────────────────────────────────
  const pipelineBuckets = useMemo(() => {
    const total = estimates.reduce((s, e) => s + e.total_quote, 0) || 1
    return (['draft', 'sent', 'accepted', 'declined'] as const).map(status => {
      const rows = estimates.filter(e => e.status === status)
      const value = rows.reduce((s, e) => s + e.total_quote, 0)
      return { status, count: rows.length, value, pct: Math.round((value / total) * 100) }
    })
  }, [estimates])

  const pipelineByType = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {}
    estimates.forEach(e => {
      const pt = e.project_type ?? 'Unknown'
      if (!map[pt]) map[pt] = { count: 0, value: 0 }
      map[pt].count++
      map[pt].value += e.total_quote
    })
    const maxVal = Math.max(...Object.values(map).map(v => v.value), 1)
    return Object.entries(map)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([type, data]) => ({ type, ...data, pct: Math.round((data.value / maxVal) * 100) }))
  }, [estimates])

  // ── Projects tab data ─────────────────────────────────────────────────────────
  const projectRows = useMemo(() => {
    const map: Record<string, { count: number; value: number; accepted: number; nonDraft: number }> = {}
    estimates.forEach(e => {
      const pt = e.project_type ?? 'Unknown'
      if (!map[pt]) map[pt] = { count: 0, value: 0, accepted: 0, nonDraft: 0 }
      map[pt].count++
      map[pt].value += e.total_quote
      if (e.status === 'accepted') map[pt].accepted++
      if (e.status !== 'draft') map[pt].nonDraft++
    })
    const maxVal = Math.max(...Object.values(map).map(v => v.value), 1)
    return Object.entries(map)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([type, d]) => ({
        type,
        count: d.count,
        value: d.value,
        avgValue: d.count > 0 ? d.value / d.count : 0,
        winRate: d.nonDraft > 0 ? Math.round((d.accepted / d.nonDraft) * 100) : null,
        barPct: Math.round((d.value / maxVal) * 100),
      }))
  }, [estimates])

  // ── Aging tab data — always uses allEstimates (not date-range filtered) ──────
  const agingRows = useMemo(() => {
    return allEstimates
      .filter(e =>
        e.status === 'sent' ||
        (e.status === 'accepted' && !e.balance_paid)
      )
      .map(e => {
        const days = getDaysOld(e.created_at)
        const outstandingAmt = e.status === 'sent' ? e.total_quote : outstanding(e)
        return { ...e, days, bucket: getAgingBucket(days), outstandingAmt }
      })
      .sort((a, b) => b.days - a.days)
  }, [allEstimates])

  const agingBuckets = useMemo(() => {
    const init = (): { count: number; value: number } => ({ count: 0, value: 0 })
    const b: Record<AgingBucket, { count: number; value: number }> = {
      current: init(), late1: init(), late2: init(), overdue: init(),
    }
    for (const row of agingRows) {
      b[row.bucket].count++
      b[row.bucket].value += row.outstandingAmt
    }
    return b
  }, [agingRows])

  // ── Date range label ─────────────────────────────────────────────────────────
  const rangeLabel = {
    thisMonth: lang === 'es' ? 'Este Mes' : 'This Month',
    last3:     lang === 'es' ? 'Últimos 3 Meses' : 'Last 3 Months',
    thisYear:  lang === 'es' ? 'Este Año' : 'This Year',
    allTime:   lang === 'es' ? 'Todo el Tiempo' : 'All Time',
  }[dateRange]

  const tabLabel = {
    overview:  lang === 'es' ? 'Resumen'  : 'Overview',
    payments:  lang === 'es' ? 'Pagos'    : 'Payments',
    pipeline:  lang === 'es' ? 'Pipeline' : 'Pipeline',
    projects:  lang === 'es' ? 'Proyectos': 'Projects',
    aging:     lang === 'es' ? 'Vencidos' : 'Aging',
  }

  // ── PDF Export ────────────────────────────────────────────────────────────────
  const downloadPDF = () => {
    const doc = new jsPDF()
    const today = format(new Date(), 'MMM d, yyyy')
    const title = `TTC Contractor Reports — ${tabLabel[tab]}`

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Range: ${rangeLabel}   |   Generated: ${today}`, 14, 26)

    // Summary cards table
    autoTable(doc, {
      startY: 32,
      head: [['Revenue Collected', 'Outstanding', 'Win Rate', 'Total Pipeline']],
      body: [[
        fmt(revenueCollected),
        fmt(outstandingTotal),
        winRate !== null ? `${winRate}%` : '—',
        fmt(pipeline),
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    })

    const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

    if (tab === 'overview') {
      autoTable(doc, {
        startY: afterSummary,
        head: [['#', 'Client', 'Project Type', 'Status', 'Amount']],
        body: recentEstimates.map(e => [
          e.estimate_number ?? '—',
          clientMap[e.client_id ?? ''] ?? '—',
          e.project_type ?? '—',
          e.status,
          fmt(e.total_quote),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      })
    } else if (tab === 'payments') {
      autoTable(doc, {
        startY: afterSummary,
        head: [['Est #', 'Client', 'Project Type', 'Date', 'Total', 'Deposit', 'Outstanding']],
        body: paymentRows.map(e => [
          e.estimate_number ?? '—',
          clientMap[e.client_id ?? ''] ?? '—',
          e.project_type ?? '—',
          format(new Date(e.created_at), 'MM/dd/yyyy'),
          fmt(e.total_quote),
          e.deposit_paid ? fmt(e.deposit_amount) : '—',
          fmt(outstanding(e)),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      })
    } else if (tab === 'pipeline') {
      autoTable(doc, {
        startY: afterSummary,
        head: [['Status', 'Count', 'Value', '% of Total']],
        body: pipelineBuckets.map(b => [b.status, b.count, fmt(b.value), `${b.pct}%`]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      })
    } else if (tab === 'projects') {
      autoTable(doc, {
        startY: afterSummary,
        head: [['Project Type', 'Count', 'Total Value', 'Avg Value', 'Win Rate']],
        body: projectRows.map(r => [
          r.type,
          r.count,
          fmt(r.value),
          fmt(r.avgValue),
          r.winRate !== null ? `${r.winRate}%` : '—',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      })
    } else if (tab === 'aging') {
      autoTable(doc, {
        startY: afterSummary,
        head: [['Est #', 'Client', 'Type', 'Status', 'Date', 'Days', 'Outstanding', 'Bucket']],
        body: agingRows.map(e => [
          e.estimate_number ?? '—',
          clientMap[e.client_id ?? ''] ?? '—',
          e.project_type?.replace(/-/g, ' ') ?? '—',
          e.status,
          format(new Date(e.created_at), 'MM/dd/yyyy'),
          e.days,
          fmt(e.outstandingAmt),
          AGING_STYLES[e.bucket].label,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      })
    }

    const filename = `Report_${tab}_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    doc.save(filename)
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  const downloadCSV = () => {
    type Row = (string | number)[]
    let headers: string[] = []
    let rows: Row[] = []

    if (tab === 'overview') {
      headers = ['Est #', 'Client', 'Project Type', 'Status', 'Amount']
      rows = recentEstimates.map(e => [
        e.estimate_number ?? '',
        clientMap[e.client_id ?? ''] ?? '',
        e.project_type ?? '',
        e.status,
        e.total_quote,
      ])
    } else if (tab === 'payments') {
      headers = ['Est #', 'Client', 'Project Type', 'Date', 'Total', 'Deposit', 'Deposit Paid', 'Balance Paid', 'Outstanding']
      rows = paymentRows.map(e => [
        e.estimate_number ?? '',
        clientMap[e.client_id ?? ''] ?? '',
        e.project_type ?? '',
        format(new Date(e.created_at), 'MM/dd/yyyy'),
        e.total_quote,
        e.deposit_paid ? e.deposit_amount : 0,
        e.deposit_paid ? 'Yes' : 'No',
        e.balance_paid ? 'Yes' : 'No',
        outstanding(e),
      ])
    } else if (tab === 'pipeline') {
      headers = ['Status', 'Count', 'Value', '% of Total']
      rows = pipelineBuckets.map(b => [b.status, b.count, b.value, `${b.pct}%`])
    } else if (tab === 'projects') {
      headers = ['Project Type', 'Count', 'Total Value', 'Avg Value', 'Win Rate']
      rows = projectRows.map(r => [
        r.type.replace(/-/g, ' '),
        r.count,
        r.value,
        Math.round(r.avgValue),
        r.winRate !== null ? `${r.winRate}%` : '',
      ])
    } else if (tab === 'aging') {
      headers = ['Est #', 'Client', 'Project Type', 'Status', 'Date', 'Days', 'Outstanding', 'Age Bucket']
      rows = agingRows.map(e => [
        e.estimate_number ?? '',
        clientMap[e.client_id ?? ''] ?? '',
        e.project_type?.replace(/-/g, ' ') ?? '',
        e.status,
        format(new Date(e.created_at), 'MM/dd/yyyy'),
        e.days,
        e.outstandingAmt,
        AGING_STYLES[e.bucket].label,
      ])
    }

    const escape = (v: string | number) => {
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }

    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Report_${tab}_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSendEmail = async () => {
    if (!user || !emailInput.trim()) return
    setEmailSendStatus('sending')
    try {
      const today = format(new Date(), 'MMM d, yyyy')
      const tl = tabLabel[tab]
      const blobDoc = new jsPDF()
      blobDoc.setFontSize(14)
      blobDoc.setFont('helvetica', 'bold')
      blobDoc.text(`${tl} Report — ${rangeLabel}`, 14, 18)
      blobDoc.setFontSize(9)
      blobDoc.setFont('helvetica', 'normal')
      blobDoc.setTextColor(80)
      blobDoc.text(`Generated: ${today}`, 14, 26)
      autoTable(blobDoc, {
        startY: 32,
        head: [['Revenue Collected', 'Outstanding', 'Win Rate', 'Total Pipeline']],
        body: [[fmt(revenueCollected), fmt(outstandingTotal), winRate !== null ? `${winRate}%` : '—', fmt(pipeline)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
      })
      const afterSummary = (blobDoc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      if (tab === 'payments') {
        autoTable(blobDoc, {
          startY: afterSummary,
          head: [['Est #', 'Client', 'Project Type', 'Date', 'Total', 'Deposit', 'Outstanding']],
          body: paymentRows.map(e => [e.estimate_number ?? '—', clientMap[e.client_id ?? ''] ?? '—', e.project_type ?? '—', format(new Date(e.created_at), 'MM/dd/yyyy'), fmt(e.total_quote), e.deposit_paid ? fmt(e.deposit_amount) : '—', fmt(outstanding(e))]),
          styles: { fontSize: 9 }, headStyles: { fillColor: [79, 70, 229] },
        })
      } else if (tab === 'pipeline') {
        autoTable(blobDoc, {
          startY: afterSummary,
          head: [['Status', 'Count', 'Value', '% of Total']],
          body: pipelineBuckets.map(b => [b.status, b.count, fmt(b.value), `${b.pct}%`]),
          styles: { fontSize: 9 }, headStyles: { fillColor: [79, 70, 229] },
        })
      } else if (tab === 'projects') {
        autoTable(blobDoc, {
          startY: afterSummary,
          head: [['Project Type', 'Count', 'Total Value', 'Avg Value', 'Win Rate']],
          body: projectRows.map(r => [r.type, r.count, fmt(r.value), fmt(r.avgValue), r.winRate !== null ? `${r.winRate}%` : '—']),
          styles: { fontSize: 9 }, headStyles: { fillColor: [79, 70, 229] },
        })
      } else if (tab === 'aging') {
        autoTable(blobDoc, {
          startY: afterSummary,
          head: [['Est #', 'Client', 'Type', 'Status', 'Date', 'Days', 'Outstanding', 'Bucket']],
          body: agingRows.map(e => [e.estimate_number ?? '—', clientMap[e.client_id ?? ''] ?? '—', e.project_type?.replace(/-/g, ' ') ?? '—', e.status, format(new Date(e.created_at), 'MM/dd/yyyy'), e.days, fmt(e.outstandingAmt), AGING_STYLES[e.bucket].label]),
          styles: { fontSize: 9 }, headStyles: { fillColor: [79, 70, 229] },
        })
      } else {
        autoTable(blobDoc, {
          startY: afterSummary,
          head: [['#', 'Client', 'Project Type', 'Status', 'Amount']],
          body: recentEstimates.map(e => [e.estimate_number ?? '—', clientMap[e.client_id ?? ''] ?? '—', e.project_type ?? '—', e.status, fmt(e.total_quote)]),
          styles: { fontSize: 9 }, headStyles: { fillColor: [79, 70, 229] },
        })
      }
      const pdfBlob = blobDoc.output('blob')

      const filename = `Report_${tab}_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      const storagePath = `${user.id}/reports/${filename}`
      const { error: uploadErr } = await supabase.storage
        .from('business-assets')
        .upload(storagePath, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (uploadErr) throw uploadErr

      const { data: signedData, error: signErr } = await supabase.storage
        .from('business-assets')
        .createSignedUrl(storagePath, 86400)
      if (signErr || !signedData?.signedUrl) throw signErr ?? new Error('No signed URL')

      // Read company name from localStorage
      let companyName = 'TTC Contractor'
      try {
        const stored = localStorage.getItem('ttc_company')
        if (stored) companyName = JSON.parse(stored).companyName || companyName
      } catch { /* ignore */ }

      const { error: fnErr } = await supabase.functions.invoke('send-report-email', {
        body: {
          to: emailInput.trim(),
          companyName,
          reportTab: tab,
          reportRange: dateRange,
          signedUrl: signedData.signedUrl,
          filename,
          lang,
        },
      })
      if (fnErr) throw fnErr

      setEmailSendStatus('sent')
      setTimeout(() => { setEmailSendStatus('idle'); setShowEmailModal(false) }, 3000)
    } catch (err) {
      console.error('Report email failed:', err)
      setEmailSendStatus('error')
      setTimeout(() => setEmailSendStatus('idle'), 5000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">

          {/* ── Page Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-100 rounded-xl">
                <BarChart2 className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">
                  {lang === 'es' ? 'Reportes' : 'Reports'}
                </h1>
                <p className="text-xs text-gray-500">
                  {lang === 'es' ? 'Analítica financiera del negocio' : 'Business financial analytics'}
                </p>
              </div>
            </div>

            {/* Export controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date range selector */}
              <select
                className="form-input text-sm py-1.5 w-auto"
                value={dateRange}
                onChange={e => setDateRange(e.target.value as DateRange)}
              >
                <option value="thisMonth">{lang === 'es' ? 'Este Mes' : 'This Month'}</option>
                <option value="last3">{lang === 'es' ? 'Últimos 3 Meses' : 'Last 3 Months'}</option>
                <option value="thisYear">{lang === 'es' ? 'Este Año' : 'This Year'}</option>
                <option value="allTime">{lang === 'es' ? 'Todo el Tiempo' : 'All Time'}</option>
              </select>

              <button
                onClick={() => window.print()}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <Printer className="w-3.5 h-3.5" />
                {lang === 'es' ? 'Imprimir' : 'Print'}
              </button>
              <button
                onClick={downloadPDF}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
              <button
                onClick={downloadCSV}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <Mail className="w-3.5 h-3.5" />
                {lang === 'es' ? 'Email' : 'Email'}
              </button>
            </div>
          </div>

          {/* ── Summary Cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 print-card">
            {/* Revenue Collected */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {lang === 'es' ? 'Cobrado' : 'Revenue Collected'}
                </span>
              </div>
              <p className="text-xl font-black text-gray-900">{fmt(revenueCollected)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{rangeLabel}</p>
            </div>

            {/* Outstanding */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {lang === 'es' ? 'Por Cobrar' : 'Outstanding'}
                </span>
              </div>
              <p className="text-xl font-black text-gray-900">{fmt(outstandingTotal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'es' ? 'Contratos aceptados' : 'Accepted contracts'}
              </p>
            </div>

            {/* Win Rate */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {lang === 'es' ? 'Tasa de Cierre' : 'Win Rate'}
                </span>
              </div>
              <p className="text-xl font-black text-gray-900">
                {winRate !== null ? `${winRate}%` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'es' ? 'Enviadas → Aceptadas' : 'Sent → Accepted'}
              </p>
            </div>

            {/* Total Pipeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {lang === 'es' ? 'Pipeline Total' : 'Total Pipeline'}
                </span>
              </div>
              <p className="text-xl font-black text-gray-900">{fmt(pipeline)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'es' ? 'Sin rechazados' : 'Excl. declined'}
              </p>
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit flex-wrap no-print">
            {(['overview', 'payments', 'pipeline', 'projects', 'aging'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                  tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tabLabel[t]}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB: OVERVIEW                                                     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm print-card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-brand-600" />
                  {lang === 'es' ? 'Ingresos Mensuales' : 'Monthly Revenue'}
                </h3>
                {monthlyData.every(m => m.value === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <BarChart2 className="w-10 h-10 opacity-20 mb-2" />
                    <p className="text-sm">{lang === 'es' ? 'Sin datos para este período' : 'No data for this period'}</p>
                  </div>
                ) : (
                  <div className="relative">
                    <svg
                      viewBox={`0 0 ${monthlyData.length * 56} 160`}
                      className="w-full"
                      style={{ height: 180 }}
                    >
                      {monthlyData.map((m, i) => {
                        const barH = m.value > 0 ? Math.max((m.value / maxMonthlyValue) * 120, 4) : 0
                        const x = i * 56 + 8
                        const y = 130 - barH
                        const isHovered = hoveredBar === i
                        return (
                          <g key={m.key}
                            onMouseEnter={() => setHoveredBar(i)}
                            onMouseLeave={() => setHoveredBar(null)}
                            style={{ cursor: 'default' }}
                          >
                            <rect
                              x={x}
                              y={y}
                              width={40}
                              height={barH}
                              rx={4}
                              fill={isHovered ? '#4338ca' : '#4f46e5'}
                              opacity={m.value === 0 ? 0.15 : 1}
                            />
                            {/* Zero baseline bar placeholder */}
                            {m.value === 0 && (
                              <rect x={x} y={129} width={40} height={2} rx={1} fill="#e5e7eb" />
                            )}
                            {/* Value label on hover */}
                            {isHovered && m.value > 0 && (
                              <text
                                x={x + 20}
                                y={y - 6}
                                textAnchor="middle"
                                fontSize={9}
                                fill="#4f46e5"
                                fontWeight="600"
                              >
                                {fmt(m.value)}
                              </text>
                            )}
                            {/* Month label */}
                            <text
                              x={x + 20}
                              y={148}
                              textAnchor="middle"
                              fontSize={10}
                              fill="#9ca3af"
                            >
                              {m.label}
                            </text>
                          </g>
                        )
                      })}
                      {/* Baseline */}
                      <line x1={0} y1={131} x2={monthlyData.length * 56} y2={131} stroke="#e5e7eb" strokeWidth={1} />
                    </svg>
                  </div>
                )}
              </div>

              {/* Two mini tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top project types */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm print-card">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">
                    {lang === 'es' ? 'Top Tipos de Proyecto' : 'Top Project Types'}
                  </h4>
                  {topProjectTypes.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">
                      {lang === 'es' ? 'Sin datos' : 'No data'}
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {topProjectTypes.map(([type, value]) => (
                          <tr key={type} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pr-3 text-gray-700 capitalize">{type.replace(/-/g, ' ')}</td>
                            <td className="py-2 text-right font-semibold text-brand-700">{fmt(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Recent estimates */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm print-card">
                  <h4 className="font-bold text-sm text-gray-700 mb-3">
                    {lang === 'es' ? 'Estimados Recientes' : 'Recent Estimates'}
                  </h4>
                  {recentEstimates.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">
                      {lang === 'es' ? 'Sin datos' : 'No data'}
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {recentEstimates.map(e => (
                          <tr key={e.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pr-2 font-mono text-xs text-gray-400">{e.estimate_number ?? '—'}</td>
                            <td className="py-2 pr-2 text-gray-700 truncate max-w-[80px]">
                              {clientMap[e.client_id ?? ''] ?? '—'}
                            </td>
                            <td className="py-2 pr-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status]}`}>
                                {e.status}
                              </span>
                            </td>
                            <td className="py-2 text-right font-semibold text-gray-800">{fmt(e.total_quote)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB: PAYMENTS                                                     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {tab === 'payments' && (
            <div className="space-y-4">
              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap no-print">
                {(['all', 'paid', 'partial', 'unpaid'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPaymentFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                      paymentFilter === f
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all'     ? (lang === 'es' ? 'Todos' : 'All')
                    : f === 'paid'    ? (lang === 'es' ? 'Pagado' : 'Paid')
                    : f === 'partial' ? (lang === 'es' ? 'Parcial' : 'Partial')
                    :                   (lang === 'es' ? 'Sin Pago' : 'Unpaid')}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print-card">
                {paymentRows.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{lang === 'es' ? 'Sin resultados' : 'No results'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Est #' : 'Est #'}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Cliente' : 'Client'}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Tipo' : 'Type'}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Fecha' : 'Date'}
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Total' : 'Total'}
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Depósito' : 'Deposit'}
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Saldo' : 'Balance'}
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Pendiente' : 'Outstanding'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentRows.map(e => (
                          <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="py-2 px-3 font-mono text-xs text-gray-400">{e.estimate_number ?? '—'}</td>
                            <td className="py-2 px-3 text-gray-800 font-medium">
                              {clientMap[e.client_id ?? ''] ?? '—'}
                            </td>
                            <td className="py-2 px-3 text-gray-600 capitalize">
                              {e.project_type?.replace(/-/g, ' ') ?? '—'}
                            </td>
                            <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                              {format(new Date(e.created_at), 'MMM d, yyyy')}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-900">
                              {fmt(e.total_quote)}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-600">
                              {e.deposit_paid ? fmt(e.deposit_amount) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {e.balance_paid ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                  {lang === 'es' ? 'Pagado' : 'Paid'}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                  {lang === 'es' ? 'Pendiente' : 'Unpaid'}
                                </span>
                              )}
                            </td>
                            <td className={`py-2 px-3 text-right font-semibold ${outstanding(e) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {outstanding(e) > 0 ? fmt(outstanding(e)) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                          <td colSpan={4} className="py-2 px-3 text-xs text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Totales' : 'Totals'}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-900">{fmt(paymentTotals.totalQuote)}</td>
                          <td className="py-2 px-3 text-right text-gray-900">{fmt(paymentTotals.depositReceived)}</td>
                          <td />
                          <td className="py-2 px-3 text-right text-amber-600">{fmt(paymentTotals.outstanding)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB: PIPELINE                                                     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {tab === 'pipeline' && (
            <div className="space-y-4">
              {/* Status buckets */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm print-card">
                <h3 className="font-bold text-gray-800 mb-4">
                  {lang === 'es' ? 'Por Estado' : 'By Status'}
                </h3>
                <div className="space-y-3">
                  {pipelineBuckets.map(({ status, count, value, pct }) => {
                    const iconMap = {
                      draft:    <Clock className="w-4 h-4 text-gray-500" />,
                      sent:     <FileText className="w-4 h-4 text-blue-500" />,
                      accepted: <CheckCircle2 className="w-4 h-4 text-green-500" />,
                      declined: <XCircle className="w-4 h-4 text-red-500" />,
                    }
                    const barColorMap = {
                      draft:    'bg-gray-300',
                      sent:     'bg-blue-400',
                      accepted: 'bg-green-500',
                      declined: 'bg-red-400',
                    }
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {iconMap[status]}
                            <span className="text-sm font-semibold capitalize text-gray-700">{status}</span>
                            <span className="text-xs text-gray-400">({count})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{fmt(value)}</span>
                            <span className="text-xs text-gray-400 ml-2">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColorMap[status]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* By project type */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm print-card">
                <h3 className="font-bold text-gray-800 mb-4">
                  {lang === 'es' ? 'Por Tipo de Proyecto' : 'By Project Type'}
                </h3>
                {pipelineByType.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    {lang === 'es' ? 'Sin datos para este período' : 'No data for this period'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pipelineByType.map(({ type, count, value, pct }) => (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{type.replace(/-/g, ' ')}</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{fmt(value)}</span>
                            <span className="text-xs text-gray-400 ml-2">({count})</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB: PROJECTS                                                     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {tab === 'projects' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print-card">
              {projectRows.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{lang === 'es' ? 'Sin datos para este período' : 'No data for this period'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {lang === 'es' ? 'Tipo de Proyecto' : 'Project Type'}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {lang === 'es' ? 'Cantidad' : 'Count'}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {lang === 'es' ? 'Valor Total' : 'Total Value'}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {lang === 'es' ? 'Promedio' : 'Avg Value'}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {lang === 'es' ? 'Tasa Cierre' : 'Win Rate'}
                        </th>
                        <th className="py-2 px-3 w-32 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {lang === 'es' ? 'Relativo' : 'Relative'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectRows.map(r => (
                        <tr key={r.type} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-2.5 px-3 font-medium text-gray-800 capitalize">
                            {r.type.replace(/-/g, ' ')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-600">{r.count}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{fmt(r.value)}</td>
                          <td className="py-2.5 px-3 text-right text-gray-600">{fmt(r.avgValue)}</td>
                          <td className="py-2.5 px-3 text-right">
                            {r.winRate !== null ? (
                              <span className={`font-semibold ${r.winRate >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
                                {r.winRate}%
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brand-500"
                                style={{ width: `${r.barPct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB: AGING                                                        */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {tab === 'aging' && (
            <div className="space-y-4">
              {/* Bucket summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(['current', 'late1', 'late2', 'overdue'] as AgingBucket[]).map(bucket => {
                  const style = AGING_STYLES[bucket]
                  const data = agingBuckets[bucket]
                  return (
                    <div key={bucket} className={`rounded-xl border p-4 shadow-sm ${style.card}`}>
                      <p className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2 ${style.badge}`}>
                        {lang === 'es' ? style.labelEs : style.label}
                      </p>
                      <p className="text-xl font-black text-gray-900">{fmt(data.value)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {data.count} {data.count !== 1 ? (lang === 'es' ? 'registros' : 'items') : (lang === 'es' ? 'registro' : 'item')}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Detail table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print-card">
                {agingRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <CheckCircle2 className="w-10 h-10 opacity-20 mb-2" />
                    <p className="text-sm font-semibold">
                      {lang === 'es' ? '¡Todo al día!' : 'All caught up!'}
                    </p>
                    <p className="text-xs mt-1 text-gray-300">
                      {lang === 'es'
                        ? 'No hay estimados enviados ni facturas pendientes.'
                        : 'No outstanding sent estimates or unpaid invoices.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Est #' : 'Est #'}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Cliente' : 'Client'}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                            {lang === 'es' ? 'Tipo' : 'Type'}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Estado' : 'Status'}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                            {lang === 'es' ? 'Fecha' : 'Date'}
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Días' : 'Days'}
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {lang === 'es' ? 'Pendiente' : 'Outstanding'}
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                            {lang === 'es' ? 'Antigüedad' : 'Age Bucket'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {agingRows.map(e => {
                          const style = AGING_STYLES[e.bucket]
                          return (
                            <tr key={e.id} className={`border-b border-gray-100 hover:brightness-95 transition ${style.row}`}>
                              <td className="py-2 px-3 font-mono text-xs text-gray-400">
                                {e.estimate_number ?? '—'}
                              </td>
                              <td className="py-2 px-3 font-medium text-gray-800 max-w-[120px] truncate">
                                {clientMap[e.client_id ?? ''] ?? '—'}
                              </td>
                              <td className="py-2 px-3 text-gray-600 capitalize hidden md:table-cell">
                                {e.project_type?.replace(/-/g, ' ') ?? '—'}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status]}`}>
                                  {e.status === 'accepted'
                                    ? (lang === 'es' ? 'Factura' : 'Invoice')
                                    : (lang === 'es' ? 'Enviado' : 'Sent')}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-gray-500 whitespace-nowrap hidden sm:table-cell">
                                {format(new Date(e.created_at), 'MMM d, yyyy')}
                              </td>
                              <td className={`py-2 px-3 text-right font-bold ${e.bucket === 'overdue' ? 'text-red-600' : e.bucket === 'late2' ? 'text-orange-600' : e.bucket === 'late1' ? 'text-amber-600' : 'text-gray-700'}`}>
                                {e.days}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                {fmt(e.outstandingAmt)}
                              </td>
                              <td className="py-2 px-3 hidden sm:table-cell">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                                  {lang === 'es' ? style.labelEs : style.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                          <td colSpan={5} className="py-2 px-3 text-xs text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                            {lang === 'es' ? 'Total' : 'Total'}
                          </td>
                          <td colSpan={2} className="py-2 px-3 text-xs text-gray-500 uppercase tracking-wide sm:hidden">
                            {lang === 'es' ? 'Total' : 'Total'}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-900">
                            {agingRows.length}
                          </td>
                          <td className="py-2 px-3 text-right text-amber-700">
                            {fmt(agingRows.reduce((s, e) => s + e.outstandingAmt, 0))}
                          </td>
                          <td className="hidden sm:table-cell" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Follow-up nudge for sent estimates older than 7 days */}
              {agingRows.some(e => e.status === 'sent' && e.days > 7) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {lang === 'es' ? 'Seguimiento recomendado' : 'Follow-up recommended'}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {lang === 'es'
                        ? `${agingRows.filter(e => e.status === 'sent' && e.days > 7).length} estimado(s) enviado(s) sin respuesta por más de 7 días. Considera hacer seguimiento con el cliente.`
                        : `${agingRows.filter(e => e.status === 'sent' && e.days > 7).length} sent estimate(s) without a response for over 7 days. Consider following up with the client.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Email Modal ──────────────────────────────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-600" />
                {lang === 'es' ? 'Enviar Reporte' : 'Email Report'}
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="form-label">
                  {lang === 'es' ? 'Correo electrónico' : 'Email address'}
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="client@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                />
              </div>
              {emailSendStatus === 'sent' && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
                  {lang === 'es' ? '✓ Reporte enviado exitosamente.' : '✓ Report sent successfully.'}
                </div>
              )}
              {emailSendStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  {lang === 'es' ? 'Error al enviar. Intenta de nuevo.' : 'Failed to send. Please try again.'}
                </div>
              )}
              <p className="text-xs text-gray-400">
                {lang === 'es'
                  ? `Se enviará el reporte "${tabLabel[tab]}" (${rangeLabel}) como PDF adjunto.`
                  : `Will send the "${tabLabel[tab]}" report (${rangeLabel}) as an attached PDF.`}
              </p>
            </div>
            <div className="flex gap-2 justify-end px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowEmailModal(false)} className="btn-secondary" disabled={emailSendStatus === 'sending'}>
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailInput.trim() || emailSendStatus === 'sending'}
                className="btn-primary"
              >
                {emailSendStatus === 'sending' ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {lang === 'es' ? 'Enviando…' : 'Sending…'}
                  </span>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    {lang === 'es' ? 'Enviar Reporte' : 'Send Report'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
