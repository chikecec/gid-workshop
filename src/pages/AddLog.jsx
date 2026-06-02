import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AddLog({ facility }) {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [form, setForm] = useState({
    equipmentId: '',
    logType: 'repair',
    whatHappened: '',
    rootCause: '',
    whatWasDone: '',
    partsUsed: '',
    labourHours: '',
    deviceStatus: 'working',
    followUpNote: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!facility) return
    supabase
      .from('equipment')
      .select('id, name, location')
      .eq('facility_id', facility.id)
      .order('name')
      .then(({ data }) => {
        if (data) setEquipment(data)
      })
  }, [facility])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const canSave = form.equipmentId && form.whatHappened && form.whatWasDone

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { error } = await supabase.from('repair_logs').insert({
      equipment_id: form.equipmentId,
      facility_id: facility.id,
      log_type: form.logType,
      what_happened: form.whatHappened,
      root_cause: form.rootCause,
      what_was_done: form.whatWasDone,
      parts_used: form.partsUsed,
      labour_hours: form.labourHours ? parseFloat(form.labourHours) : null,
      device_status: form.deviceStatus,
      outcome: form.logType,
      follow_up_note: form.followUpNote,
      technician_id: user.id,
      technician_name: profile?.full_name || user.email,
    })

    if (form.deviceStatus === 'out-of-service') {
      await supabase
        .from('equipment')
        .update({ status: 'out-of-service' })
        .eq('id', form.equipmentId)
    }

    if (error) {
      setError('Error saving: ' + error.message)
      setSaving(false)
      return
    }

    navigate('/logs')
  }

  const selectedDevice = equipment.find(e => e.id === form.equipmentId)

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <div style={{ fontSize: '15px', fontWeight: '500' }}>Log a repair</div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            Which device? <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <select
            value={form.equipmentId}
            onChange={e => set('equipmentId', e.target.value)}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: '#fff', outline: 'none' }}>
            <option value="">Select device...</option>
            {equipment.map(e => (
              <option key={e.id} value={e.id}>{e.name} — {e.location}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>Event type</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'repair', label: 'Breakdown repair' },
              { key: 'issue', label: 'Issue found' },
              { key: 'inspection', label: 'Inspection' },
            ].map(t => (
              <button key={t.key}
                onClick={() => set('logType', t.key)}
                style={{
                  flex: 1, padding: '7px 4px', borderRadius: '8px', border: '1px solid',
                  borderColor: form.logType === t.key ? '#85B7EB' : '#eee',
                  background: form.logType === t.key ? '#E6F1FB' : '#fff',
                  color: form.logType === t.key ? '#0C447C' : '#888',
                  fontSize: '11px', fontWeight: form.logType === t.key ? '500' : '400',
                  cursor: 'pointer'
                }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            What happened? <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <textarea
            value={form.whatHappened}
            onChange={e => set('whatHappened', e.target.value)}
            placeholder="Describe the fault or symptom..."
            rows={3}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Root cause</div>
          <textarea
            value={form.rootCause}
            onChange={e => set('rootCause', e.target.value)}
            placeholder="What caused the fault? (condensate buildup, worn part, user error...)"
            rows={2}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            What was done? <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <textarea
            value={form.whatWasDone}
            onChange={e => set('whatWasDone', e.target.value)}
            placeholder="Describe the repair or action taken..."
            rows={3}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Parts used</div>
            <input
              value={form.partsUsed}
              onChange={e => set('partsUsed', e.target.value)}
              placeholder="e.g. Filter, O-ring"
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Labour (hrs)</div>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.labourHours}
              onChange={e => set('labourHours', e.target.value)}
              placeholder="e.g. 1.5"
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>Device status after</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'working', label: 'Working', color: '#085041', bg: '#E1F5EE', border: '#5DCAA5' },
              { key: 'needs-followup', label: 'Needs follow-up', color: '#633806', bg: '#FAEEDA', border: '#EF9F27' },
              { key: 'out-of-service', label: 'Out of service', color: '#791F1F', bg: '#FCEBEB', border: '#F09595' },
            ].map(s => (
              <button key={s.key}
                onClick={() => set('deviceStatus', s.key)}
                style={{
                  flex: 1, padding: '7px 4px', borderRadius: '8px', border: '1px solid',
                  borderColor: form.deviceStatus === s.key ? s.border : '#eee',
                  background: form.deviceStatus === s.key ? s.bg : '#fff',
                  color: form.deviceStatus === s.key ? s.color : '#888',
                  fontSize: '11px', fontWeight: form.deviceStatus === s.key ? '500' : '400',
                  cursor: 'pointer'
                }}>{s.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            Follow-up note <span style={{ color: '#aaa', fontWeight: '400' }}>(optional)</span>
          </div>
          <textarea
            value={form.followUpNote}
            onChange={e => set('followUpNote', e.target.value)}
            placeholder="Any observations for the next technician..."
            rows={2}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#A32D2D' }}>
            {error}
          </div>
        )}

      </div>

      <div style={{ position: 'sticky', bottom: '70px', background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px', display: 'flex', gap: '8px' }}>
        <button onClick={() => navigate(-1)}
          style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: canSave && !saving ? '#185FA5' : '#ccc', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: canSave && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving...' : 'Save log'}
        </button>
      </div>
    </div>
  )
}