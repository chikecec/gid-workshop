import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function EditEquipment({ facility }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [facilityCreatorId, setFacilityCreatorId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    type: '',
    location: '',
    intervalType: 'preset',
    presetDays: null,
    customDays: '',
    specificDate: '',
    pmInstructions: '',
    addedBy: '',
    createdBy: null,
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .single()

      if (equipmentData) {
        let addedByName = 'Unknown'
        if (equipmentData.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', equipmentData.created_by)
            .single()
          if (profile) addedByName = profile.full_name || profile.email || 'Unknown'
        }

        setForm({
          name: equipmentData.name || '',
          type: equipmentData.type || '',
          location: equipmentData.location || '',
          intervalType: equipmentData.interval_type || 'preset',
          presetDays: equipmentData.interval_days || null,
          customDays: equipmentData.interval_type === 'custom' ? equipmentData.interval_days : '',
          specificDate: equipmentData.specific_date || '',
          pmInstructions: equipmentData.pm_instructions || '',
          addedBy: addedByName,
          createdBy: equipmentData.created_by,
        })
      }

      const { data: facilityData } = await supabase
        .from('facilities')
        .select('created_by')
        .eq('id', facility.id)
        .single()

      if (facilityData) setFacilityCreatorId(facilityData.created_by)

      setLoading(false)
    }
    load()
  }, [id])

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

    const { error } = await supabase
      .from('equipment')
      .update({
        name: form.name,
        type: form.type,
        location: form.location,
        interval_type: form.intervalType,
        interval_days: form.intervalType === 'preset' ? form.presetDays :
          form.intervalType === 'custom' ? parseInt(form.customDays) : null,
        specific_date: form.intervalType === 'specific' ? form.specificDate : null,
        pm_instructions: form.pmInstructions,
        next_pm_date: nextPMDateISO(),
      })
      .eq('id', id)

    if (error) {
      setError('Error saving: ' + error.message)
      setSaving(false)
      return
    }

    navigate(`/equipment/${id}`)
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete ${form.name}? This will also delete all repair logs for this device. This cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)

    await supabase
      .from('repair_logs')
      .delete()
      .eq('equipment_id', id)

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting: ' + error.message)
      setDeleting(false)
      return
    }

    navigate('/equipment')
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>Loading...</div>
  )

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <div style={{ fontSize: '15px', fontWeight: '500' }}>Edit equipment</div>
      </div>

      <div style={{ padding: '16px', paddingBottom: '140px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            Equipment name <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
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

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            Location / department <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <input
            value={form.location}
            onChange={e => set('location', e.target.value)}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
          />
        </div>

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
            rows={4}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        {form.addedBy && (
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span style={{ fontSize: '12px', color: '#888' }}>Added by <strong style={{ color: '#1a1a1a' }}>{form.addedBy}</strong></span>
          </div>
        )}

        {error && (
          <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#A32D2D' }}>
            {error}
          </div>
        )}

        {facilityCreatorId === currentUserId && (
          <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#A32D2D', marginBottom: '6px' }}>
              Danger zone
            </div>
            <div style={{ fontSize: '11px', color: '#791F1F', marginBottom: '10px', lineHeight: '1.5' }}>
              Deleting this device will also delete all its repair logs and service history. This cannot be undone.
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#A32D2D', fontSize: '12px', fontWeight: '500', color: '#fff', cursor: 'pointer' }}>
              {deleting ? 'Deleting...' : 'Delete this device'}
            </button>
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
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}