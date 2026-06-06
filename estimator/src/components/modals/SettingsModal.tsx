import { useState } from 'react'
import type { CompanySettings } from '../../types'

interface Props {
  company: CompanySettings
  onSave: (c: CompanySettings) => void
  onClose: () => void
}

export default function SettingsModal({ company, onSave, onClose }: Props) {
  const [form, setForm] = useState<CompanySettings>(company)
  const set = (k: keyof CompanySettings, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">⚙️ Company Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <h3 className="font-semibold text-sm text-gray-700 border-b pb-2">Company Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Company Name</label>
              <input className="form-input" value={form.companyName} onChange={e => set('companyName', e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Owner/Contact Name</label>
              <input className="form-input" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className="form-label">City</label>
              <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label">State</label>
                <input className="form-input" value={form.state} onChange={e => set('state', e.target.value)} />
              </div>
              <div>
                <label className="form-label">ZIP</label>
                <input className="form-input" value={form.zip} onChange={e => set('zip', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Contractor License #</label>
              <input className="form-input" value={form.license} onChange={e => set('license', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Insurance Provider / Policy #</label>
              <input className="form-input" value={form.insurance} onChange={e => set('insurance', e.target.value)} />
            </div>
          </div>

          <h3 className="font-semibold text-sm text-gray-700 border-b pb-2 pt-2">Default Pricing Defaults</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="form-label">Material Markup %</label>
              <input type="number" min="0" className="form-input" value={form.defaultMaterialMarkup} onChange={e => set('defaultMaterialMarkup', +e.target.value)} />
            </div>
            <div>
              <label className="form-label">Conservative %</label>
              <input type="number" min="0" max="99" className="form-input" value={form.defaultMarginMin} onChange={e => set('defaultMarginMin', +e.target.value)} />
            </div>
            <div>
              <label className="form-label">Standard %</label>
              <input type="number" min="0" max="99" className="form-input" value={form.defaultMarginMid} onChange={e => set('defaultMarginMid', +e.target.value)} />
            </div>
            <div>
              <label className="form-label">Premium %</label>
              <input type="number" min="0" max="99" className="form-input" value={form.defaultMarginMax} onChange={e => set('defaultMarginMax', +e.target.value)} />
            </div>
            <div>
              <label className="form-label">Tax Rate %</label>
              <input type="number" min="0" max="20" step="0.1" className="form-input" value={form.taxRate} onChange={e => set('taxRate', +e.target.value)} />
            </div>
            <div>
              <label className="form-label">Quote Valid (days)</label>
              <input type="number" min="1" className="form-input" value={form.defaultValidityDays} onChange={e => set('defaultValidityDays', +e.target.value)} />
            </div>
          </div>

          <h3 className="font-semibold text-sm text-gray-700 border-b pb-2 pt-2">Default Terms</h3>
          <div className="space-y-2">
            <div>
              <label className="form-label">Payment Terms</label>
              <input className="form-input text-xs" value={form.defaultPaymentTerms} onChange={e => set('defaultPaymentTerms', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Warranty</label>
              <input className="form-input text-xs" value={form.defaultWarranty} onChange={e => set('defaultWarranty', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => { onSave(form); onClose() }} className="btn-primary">Save Settings</button>
        </div>
      </div>
    </div>
  )
}
