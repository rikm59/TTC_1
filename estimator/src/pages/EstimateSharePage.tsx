import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, addDays, differenceInCalendarDays } from 'date-fns'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'
import { fmt, calcTotals } from '../utils/calculations'
import type { Estimate, CalculatedTotals } from '../types'

interface CompanyInfo {
  company_name: string | null
  business_phone: string | null
  business_email: string | null
  business_address: string | null
  business_city: string | null
  business_state: string | null
  business_logo_url: string | null
  website: string | null
  license_number: string | null
}

type PageState = 'loading' | 'not_found' | 'ready' | 'already_responded' | 'accepted' | 'declined'

export default function EstimateSharePage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<PageState>('loading')
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [totals, setTotals] = useState<CalculatedTotals | null>(null)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [existingStatus, setExistingStatus] = useState<string>('')
  const [clientNote, setClientNote] = useState('')
  const [acting, setActing] = useState(false)
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [clientSignature, setClientSignature] = useState('')

  useEffect(() => {
    if (!token) { setState('not_found'); return }

    fetch(`${SUPABASE_URL}/functions/v1/estimate-share?token=${encodeURIComponent(token)}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setState('not_found'); return }
        const est = d.estimate as Estimate
        setEstimate(est)
        setTotals(calcTotals(est))
        setCompany(d.company)
        if (d.status === 'accepted' || d.status === 'declined') {
          setExistingStatus(d.status)
          setState('already_responded')
        } else {
          setState('ready')
        }
      })
      .catch(() => setState('not_found'))
  }, [token])

  const act = async (action: 'accept' | 'decline') => {
    if (!token || acting) return
    setActing(true)
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/estimate-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, action, clientNote: clientNote.trim() || undefined, clientSignature: clientSignature.trim() || undefined }),
      })
      const d = await r.json()
      if (d.error) { alert(d.error); setActing(false); return }
      setState(action === 'accept' ? 'accepted' : 'declined')
    } catch {
      alert('Something went wrong. Please try again.')
      setActing(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Link Not Found</h1>
          <p className="text-gray-500">This estimate link is invalid or has expired. Please contact the contractor for a new link.</p>
        </div>
      </div>
    )
  }

  if (state === 'accepted') {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Estimate Accepted!</h1>
          <p className="text-green-700">Thank you for accepting this estimate. {company?.company_name ?? 'Your contractor'} has been notified and will be in touch shortly.</p>
          {company?.business_phone && (
            <a href={`tel:${company.business_phone}`} className="mt-6 inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition">
              📞 Call Us
            </a>
          )}
        </div>
      </div>
    )
  }

  if (state === 'declined') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Response Received</h1>
          <p className="text-gray-500">{company?.company_name ?? 'The contractor'} has been notified. Feel free to reach out if you change your mind or have any questions.</p>
          {company?.business_phone && (
            <a href={`tel:${company.business_phone}`} className="mt-6 inline-block bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition">
              📞 Contact Us
            </a>
          )}
        </div>
      </div>
    )
  }

  if (state === 'already_responded') {
    const isAccepted = existingStatus === 'accepted'
    return (
      <div className={`min-h-screen ${isAccepted ? 'bg-green-50' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">{isAccepted ? '✅' : '📋'}</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {isAccepted ? 'Already Accepted' : 'Already Responded'}
          </h1>
          <p className="text-gray-500">
            This estimate was already {existingStatus}. Contact {company?.company_name ?? 'the contractor'} if you need to make changes.
          </p>
        </div>
      </div>
    )
  }

  // ── Ready state: show the full estimate ─────────────────────
  if (!estimate || !totals) return null
  const { client, settings } = estimate
  const validUntil = addDays(new Date(estimate.createdAt), settings.validityDays || 30)
  const daysLeft = differenceInCalendarDays(validUntil, new Date())
  const finalTotal = totals.selectedQuote - totals.discountAmount + totals.taxAmount
  const companyName = company?.company_name ?? 'Contractor'

  const clientMaterials = estimate.materials.map(m => ({
    ...m,
    clientUnitPrice: m.unitCost * (1 + m.markup / 100),
    clientTotal: m.quantity * m.unitCost * (1 + m.markup / 100),
  }))

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Expiry countdown banner */}
        {settings.validityDays > 0 && daysLeft >= 0 && daysLeft <= 7 && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            daysLeft <= 2
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            ⏰ {daysLeft === 0
              ? 'This quote expires today!'
              : daysLeft === 1
              ? 'This quote expires tomorrow.'
              : `This quote expires in ${daysLeft} days.`}
          </div>
        )}
        {settings.validityDays > 0 && daysLeft < 0 && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 bg-red-100 text-red-700 border border-red-200">
            ⚠️ This quote has expired. Please contact {companyName} for a current quote.
          </div>
        )}

        {/* Document */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-brand-700 text-white px-6 py-6">
            <div className="flex justify-between items-start">
              <div>
                {company?.business_logo_url && (
                  <img src={company.business_logo_url} alt="logo" className="h-10 mb-2 object-contain" />
                )}
                <h1 className="text-xl font-bold">{companyName}</h1>
                <p className="text-brand-200 text-xs mt-0.5">
                  {[company?.business_address, company?.business_city, company?.business_state].filter(Boolean).join(', ')}
                </p>
                <p className="text-brand-200 text-xs">
                  {[company?.business_phone, company?.business_email].filter(Boolean).join('  ·  ')}
                </p>
                {company?.license_number && (
                  <p className="text-brand-200 text-xs">Lic #{company.license_number}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-brand-100 text-xs uppercase tracking-widest">
                  {estimate.type === 'invoice' ? 'Invoice' : 'Estimate'}
                </div>
                <div className="font-mono font-bold text-lg">{estimate.estimateNumber}</div>
                <div className="text-brand-200 text-xs">
                  Date: {format(new Date(estimate.settings.estimateDate || estimate.createdAt), 'MMM d, yyyy')}
                </div>
                <div className="text-brand-200 text-xs">Valid until: {format(validUntil, 'MMM d, yyyy')}</div>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          {estimate.coverLetter && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed italic">{estimate.coverLetter}</p>
            </div>
          )}

          {/* Client + Project */}
          <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
              <p className="font-semibold">{client.name || '—'}</p>
              {client.company && <p className="text-gray-600 text-xs">{client.company}</p>}
              <p className="text-gray-600 text-xs">{[client.address, client.city, client.state, client.zip].filter(Boolean).join(', ')}</p>
              {client.phone && <p className="text-gray-600 text-xs">{client.phone}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Project</p>
              <p className="font-semibold">{estimate.projectDescription || estimate.projectType}</p>
              {estimate.jobAddress && <p className="text-gray-600 text-xs">📍 {estimate.jobAddress}</p>}
              {settings.projectStartDate && (
                <p className="text-gray-600 text-xs mt-1">
                  🗓 Start: <strong>{format(new Date(settings.projectStartDate + 'T12:00:00'), 'MMM d, yyyy')}</strong>
                </p>
              )}
              {settings.projectEndDate && (
                <p className="text-gray-600 text-xs">
                  🏁 Est. completion: <strong>{format(new Date(settings.projectEndDate + 'T12:00:00'), 'MMM d, yyyy')}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Materials */}
          {clientMaterials.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100 text-sm">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">Materials</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-gray-500 font-medium">Item</th>
                    <th className="text-right pb-2 text-gray-500 font-medium w-14">Qty</th>
                    <th className="text-left pb-2 text-gray-500 font-medium w-12">Unit</th>
                    <th className="text-right pb-2 text-gray-500 font-medium w-20">Price</th>
                    <th className="text-right pb-2 text-gray-500 font-medium w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {clientMaterials.map(m => (
                    <tr key={m.id} className="border-b border-gray-50">
                      <td className="py-1.5">{m.name}</td>
                      <td className="py-1.5 text-right">{m.quantity.toFixed(2)}</td>
                      <td className="py-1.5 text-left pl-1 text-gray-500">{m.unit}</td>
                      <td className="py-1.5 text-right">{fmt(m.clientUnitPrice)}</td>
                      <td className="py-1.5 text-right font-medium">{fmt(m.clientTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Labor */}
          {estimate.labor.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100 text-sm">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">Labor</h3>
              <table className="w-full text-xs">
                <tbody>
                  {estimate.labor.map(l => (
                    <tr key={l.id} className="border-b border-gray-50">
                      <td className="py-1.5">{l.description}</td>
                      <td className="py-1.5 text-right font-medium w-24">{fmt(l.workers * l.hours * l.ratePerHour)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex justify-end">
              <div className="w-56 space-y-1">
                {totals.discountAmount > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span><span>{fmt(totals.selectedQuote)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-green-600 font-medium">
                      <span>Discount</span><span>−{fmt(totals.discountAmount)}</span>
                    </div>
                  </>
                )}
                {settings.includeTax && totals.taxAmount > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Tax ({settings.taxRate}%)</span><span>{fmt(totals.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-base">
                  <span>{estimate.type === 'invoice' ? 'Amount Due' : 'Total'}</span>
                  <span className="text-brand-700">{fmt(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          {(estimate.milestones ?? []).length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100 text-sm">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">💳 Payment Schedule</h3>
              <div className="space-y-2">
                {estimate.milestones.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 text-xs">
                    <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="flex-1 font-medium">{m.label}</span>
                    <span className="text-gray-500">{m.dueOn}</span>
                    <span className="font-bold text-brand-700">{fmt(finalTotal * m.percent / 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scope */}
          {estimate.scopeOfWork && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">Scope of Work</h3>
              <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{estimate.scopeOfWork}</p>
            </div>
          )}
          {estimate.exclusions && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">Exclusions</h3>
              <p className="text-xs text-gray-700 whitespace-pre-line">{estimate.exclusions}</p>
            </div>
          )}

          {/* Terms */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {settings.paymentTerms && (
                <div>
                  <span className="font-semibold text-gray-600">Payment Terms: </span>
                  <span className="text-gray-600">{settings.paymentTerms}</span>
                </div>
              )}
              {settings.warranty && (
                <div>
                  <span className="font-semibold text-gray-600">Warranty: </span>
                  <span className="text-gray-600">{settings.warranty}</span>
                </div>
              )}
            </div>
          </div>

          {/* Project Photos */}
          {(estimate.photos ?? []).length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">📸 Project Photos</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {estimate.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block group">
                    <img
                      src={url}
                      alt={`Project photo ${i + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Accept / Decline */}
          <div className="px-6 py-6 bg-white">
            <p className="text-sm text-gray-600 mb-4 text-center">
              Please review and respond to this estimate from <strong>{companyName}</strong>.
            </p>

            {!showDeclineForm ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Type your full name to sign &amp; accept:
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 font-medium"
                    placeholder="Full name (e-signature)"
                    value={clientSignature}
                    onChange={e => setClientSignature(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => act('accept')}
                  disabled={acting || !clientSignature.trim()}
                  title={!clientSignature.trim() ? 'Type your name above to accept' : undefined}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {acting ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : '✅'}
                  Accept This Estimate
                </button>
                <button
                  onClick={() => setShowDeclineForm(true)}
                  disabled={acting}
                  className="flex-1 sm:flex-none bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-600 font-medium py-3.5 px-6 rounded-xl text-sm transition"
                >
                  Decline
                </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="Optional: leave a note for the contractor…"
                  value={clientNote}
                  onChange={e => setClientNote(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => act('decline')}
                    disabled={acting}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2"
                  >
                    {acting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Confirm Decline
                  </button>
                  <button
                    onClick={() => setShowDeclineForm(false)}
                    className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by XpertAI Estimator · {companyName}
        </p>
      </div>
    </div>
  )
}
