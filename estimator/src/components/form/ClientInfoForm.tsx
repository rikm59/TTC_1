import type { ClientInfo } from '../../types'

interface Props {
  client: ClientInfo
  onChange: (field: string, value: string) => void
}

export default function ClientInfoForm({ client, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 sm:col-span-1">
        <label className="form-label">Client Name *</label>
        <input className="form-input" value={client.name} onChange={e => onChange('name', e.target.value)} placeholder="John Smith" />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="form-label">Company (optional)</label>
        <input className="form-input" value={client.company} onChange={e => onChange('company', e.target.value)} placeholder="Smith Corp" />
      </div>
      <div className="col-span-2">
        <label className="form-label">Address</label>
        <input className="form-input" value={client.address} onChange={e => onChange('address', e.target.value)} placeholder="123 Main St" />
      </div>
      <div>
        <label className="form-label">City</label>
        <input className="form-input" value={client.city} onChange={e => onChange('city', e.target.value)} placeholder="Austin" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="form-label">State</label>
          <input className="form-input" value={client.state} onChange={e => onChange('state', e.target.value)} placeholder="TX" />
        </div>
        <div>
          <label className="form-label">ZIP</label>
          <input className="form-input" value={client.zip} onChange={e => onChange('zip', e.target.value)} placeholder="78701" />
        </div>
      </div>
      <div>
        <label className="form-label">Phone</label>
        <input className="form-input" type="tel" value={client.phone} onChange={e => onChange('phone', e.target.value)} placeholder="(512) 555-1234" />
      </div>
      <div>
        <label className="form-label">Email</label>
        <input className="form-input" type="email" value={client.email} onChange={e => onChange('email', e.target.value)} placeholder="client@email.com" />
      </div>
    </div>
  )
}
