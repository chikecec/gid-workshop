import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const equipmentTypes = [
  'Respiratory support',
  'Monitoring',
  'Sterilisation',
  'Cardiology',
  'Diagnostic',
  'Laboratory',
  'Surgical',
  'Imaging',
  'Other',
]

const presetIntervals = [
  { label: 'Monthly', days: 30 },
  { label: 'Every 3 months', days: 90 },
  { label: 'Every 6 months', days: 180 },
  { label: 'Annually', days: 365 },
]

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AddEquipment({ facility }) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    type: '',
    location: '',
    roomNumber: '',
    serialNumber: '',
    modelNumber: '',
    yearOfManufacture: '',
    installationDate: '',
    warrantyExpiryDate: '',
    intervalType: 'preset',
    presetDays: null,
    customDays: '',
    specificDate: '',
    pmInstructions: '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const nextPMDate = () => {
    if (form.intervalType === 'preset' && form.presetDays) return addDays(form.presetDays)
    if (form.intervalType === 'custom' && form.customDays) return addDays(parseInt(form.customDays))
    if (form.intervalType === 'specific' && form.specificDate) {
      return new Date(form.specificDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }
    return null
  }

  const nextPMDateISO = () => {
    if (form.intervalType === 'preset' && form.presetDays) return addDaysISO(form.presetDays)
    if (form.intervalType === 'custom' && form.customDays) return addDaysISO(parseInt(form.customDays))
    if (form.intervalType === 'specific' && form.specificDate) return form.specificDate
    return null
  }

  const canSave = form.name && form.type && form.location &&
    (form.presetDays || form.customDays || form.specificDate) && form.pmInstructions

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('equipment').insert({
      facility_id: facility.id,
      name: form.name,
      type: form.type,
      location: form.location,
      room_number: form.roomNumber || null,
      serial_number: form.serialNumber || null,
      model_number: form.modelNumber || null,
      year_of_manufacture: form.yearOfManufacture || null,
      installation_date: form.installationDate || null,
      warranty_expiry_date: form.warrantyExpiryDate || null,
      interval_type: form.intervalType,
      interval_days: form.intervalType === 'preset' ? form.presetDays :
        form.intervalType === 'custom' ? parseInt(form.customDays) : null,
      specific_date: form.intervalType === 'specific' ? form.specificDate : null,
      pm_instructions: form.pmInstructions,
      next_pm_date: nextPMDateISO(),
      created_by: user.id,
    })

    if (error) {
      setError('Error saving: ' + error.message)
      setSaving(false)
      return
    }

    navigate('/equipment')
  }

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <div style={{ fontSize: '15px', fontWeight: '500' }}>Add equipment</div>
      </div>

      <div style={{ padding: '16px', paddingBottom: '140px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Basic details</div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            Equipment name <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Drager Ventilator"
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
          />
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            Equipment type <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <select
            value={form.type}
            onChange={e => set('type', e.target.value)}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: '#fff', outline: 'none' }}>
            <option value="">Select type...</option>
            {equipmentTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
              Department <span style={{ color: '#E24B4A' }}>*</span>
            </div>
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. ICU"
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
              Room number <span style={{ color: '#aaa', fontWeight: '400' }}>(optional)</span>
            </div>
            <input
              value={form.roomNumber}
              onChange={e => set('roomNumber', e.target.value)}
              placeholder="e.g. Room 14"
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px' }}>Device identification <span style={{ color: '#aaa', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Serial number</div>
            <input
              value={form.serialNumber}
              onChange={e => set('serialNumber', e.target.value)}
              placeholder="e.g. SN-123456"
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Model number</div>
            <input
              value={form.modelNumber}
              onChange={e => set('modelNumber', e.target.value)}
              placeholder="e.g. Evita XL"
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Year of manufacture</div>
            <input
              value={form.yearOfManufacture}
              onChange={e => set('yearOfManufacture', e.target.value)}
              placeholder="e.g. 2019"
              maxLength={4}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Installation date</div>
            <input
              type="date"
              value={form.installationDate}
              onChange={e => set('installationDate', e.target.value)}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Warranty expiry date</div>
          <input
            type="date"
            value={form.warrantyExpiryDate}
            onChange={e => set('warrantyExpiryDate', e.target.value)}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
          />
          {form.warrantyExpiryDate && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: new Date(form.warrantyExpiryDate) < new Date() ? '#A32D2D' : '#0F6E56' }}>
              {new Date(form.warrantyExpiryDate) < new Date()
                ? '⚠ Warranty has expired'
                : `✓ Warranty valid until ${new Date(form.warrantyExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </div>
          )}
        </div>

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px' }}>Maintenance schedule</div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>
            PM interval <span style={{ color: '#E24B4A' }}>*</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
            {presetIntervals.map(p => (
              <button key={p.days}
                onClick={() => { set('presetDays', p.days); set('intervalType', 'preset') }}
                style={{
                  padding: '8px', borderRadius: '8px', border: '1px solid',
                  borderColor: form.intervalType === 'preset' && form.presetDays === p.days ? '#85B7EB' : '#ddd',
                  background: form.intervalType === 'preset' && form.presetDays === p.days ? '#E6F1FB' : '#fff',
                  color: form.intervalType === 'preset' && form.presetDays === p.days ? '#0C447C' : '#666',
                  fontSize: '12px',
                  fontWeight: form.intervalType === 'preset' && form.presetDays === p.days ? '500' : '400',
                  cursor: 'pointer',
                }}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1, height: '1px', background: '#eee' }} />
            <span style={{ fontSize: '11px', color: '#aaa' }}>or custom</span>
            <div style={{ flex: 1, height: '1px', background: '#eee' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 10px' }}>
              <input
                type="number"
                min="1"
                value={form.customDays}
                onChange={e => {
                  set('customDays', e.target.value)
                  set('intervalType', 'custom')
                  set('presetDays', null)
                }}
                placeholder="e.g. 45"
                style={{ width: '50px', border: 'none', fontSize: '13px', outline: 'none', background: 'transparent' }}
              />
              <span style={{ fontSize: '12px', color: '#888' }}>days</span>
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="date"
                value={form.specificDate}
                onChange={e => {
                  set('specificDate', e.target.value)
                  set('intervalType', 'specific')
                  set('presetDays', null)
                }}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
              />
            </div>
          </div>

          {nextPMDate() && (
            <div style={{ marginTop: '8px', background: '#E1F5EE', border: '1px solid #5DCAA5', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="15" height="15" fill="none" stroke="#0F6E56" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>
              </svg>
              <span style={{ fontSize: '12px', color: '#085041' }}>Next PM: <strong>{nextPMDate()}</strong></span>
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            What to do during PM <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <textarea
            value={form.pmInstructions}
            onChange={e => set('pmInstructions', e.target.value)}
            placeholder="Describe the steps the technician should follow during preventive maintenance..."
            rows={4}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#A32D2D' }}>
            {error}
          </div>
        )}

      </div>

      <div style={{ position: 'fixed', bottom: '70px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px', display: 'flex', gap: '8px' }}>
        <button onClick={() => navigate(-1)}
          style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: canSave && !saving ? '#185FA5' : '#ccc', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: canSave && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving...' : 'Save equipment'}
        </button>
      </div>
    </div>
  )
}