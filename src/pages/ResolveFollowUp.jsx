import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const quickReminderOptions = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
]

const reminderNoteOptions = [
  'Waiting for spare part',
  'Waiting for management approval',
  'Waiting for LPO',
  'Check repair outcome',
  'Follow up with supplier',
  'Other',
]

const timeSpentOptions = [
  '30 mins', '1 hr', '1.5 hrs', '2 hrs', '2.5 hrs', '3 hrs', '3.5 hrs',
  '4 hrs', '4.5 hrs', '5 hrs', '5.5 hrs', '6 hrs', '6.5 hrs', '7 hrs',
  '7.5 hrs', '8 hrs', '8.5 hrs', '9 hrs', '9.5 hrs', '10 hrs', '10.5 hrs',
  '11 hrs', '11.5 hrs', '12 hrs',
]

const statusOptions = [
  { key: 'successful', label: 'Successful', color: '#085041', bg: '#E1F5EE', border: '#5DCAA5' },
  { key: 'still-under-repair', label: 'Still under repair', color: '#791F1F', bg: '#FCEBEB', border: '#F09595' },
  { key: 'still-ongoing', label: 'Still ongoing', color: '#633806', bg: '#FAEEDA', border: '#EF9F27' },
  { key: 'failed', label: 'Failed', color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
  { key: 'waiting-spare-part', label: 'Waiting for spare part', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' },
  { key: 'rescheduled', label: 'Rescheduled', color: '#444', bg: '#f5f5f5', border: '#ddd' },
  { key: 'waiting-lpo', label: 'Waiting for LPO', color: '#633806', bg: '#FAEEDA', border: '#EF9F27' },
  { key: 'waiting-management', label: 'Waiting for management', color: '#633806', bg: '#FAEEDA', border: '#EF9F27' },
  { key: 'decommissioned', label: 'Decommissioned', color: '#444', bg: '#f5f5f5', border: '#ddd' },
]

const billingOptions = [
  { key: 'under-warranty', label: 'Under warranty' },
  { key: 'out-of-warranty', label: 'Out of warranty' },
  { key: 'service-contract', label: 'Service contract' },
  { key: 'placement-machine', label: 'Placement machine' },
]

const serviceTypes = [
  { key: 'pm', label: 'Preventive Maintenance (PM)' },
  { key: 'repair', label: 'Breakdown Repair' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'installation', label: 'Installation' },
  { key: 'other', label: 'Other' },
]

const statusLabels = {
  'successful': 'Successful',
  'still-under-repair': 'Still under repair',
  'still-ongoing': 'Still ongoing',
  'failed': 'Failed',
  'waiting-spare-part': 'Waiting for spare part',
  'rescheduled': 'Rescheduled',
  'waiting-lpo': 'Waiting for LPO',
  'waiting-management': 'Waiting for management',
  'decommissioned': 'Decommissioned',
  'working': 'Working',
  'out-of-service': 'Out of service',
}

const serviceLabels = {
  'pm': 'Preventive Maintenance (PM)',
  'repair': 'Breakdown Repair',
  'assessment': 'Assessment',
  'installation': 'Installation',
  'other': 'Other',
}

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getNextOccurrence(nextPMDate, intervalDays) {
  if (!nextPMDate || !intervalDays) return nextPMDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(nextPMDate.split('T')[0] + 'T00:00:00')
  while (next <= today) {
    next.setDate(next.getDate() + intervalDays)
  }
  return next.toISOString().split('T')[0]
}

export default function ResolveFollowUp({ facility }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [reminder, setReminder] = useState(null)
  const [equipment, setEquipment] = useState(null)
  const [originalLog, setOriginalLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [parts, setParts] = useState([{ name: '', quantity: '1', description: '' }])
  const [form, setForm] = useState({
    logType: 'repair',
    whatHappened: '',
    rootCause: '',
    whatWasDone: '',
    timeSpent: '',
    deviceStatus: '',
    billingClassification: '',
    lpoNumber: '',
    engineerComment: '',
    needsReminder: false,
    reminderDays: null,
    reminderCustomDate: '',
    reminderNote: '',
    reminderNoteCustom: '',
    pmScheduleAction: '',
    customPMDays: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: reminderData } = await supabase
        .from('follow_up_reminders')
        .select('*')
        .eq('id', id)
        .single()

      if (reminderData) {
        setReminder(reminderData)

        const { data: equipmentData } = await supabase
          .from('equipment')
          .select('*')
          .eq('id', reminderData.equipment_id)
          .single()

        if (equipmentData) {
          setEquipment(equipmentData)
          setForm(f => ({ ...f, deviceStatus: equipmentData.operational_status || '' }))
        }

        if (reminderData.repair_log_id) {
          const { data: logData } = await supabase
            .from('repair_logs')
            .select('*')
            .eq('id', reminderData.repair_log_id)
            .single()
          if (logData) {
            setOriginalLog(logData)
            setForm(f => ({ ...f, logType: logData.log_type || 'repair' }))
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addPart = () => setParts(prev => [...prev, { name: '', quantity: '1', description: '' }])
  const removePart = (index) => setParts(prev => prev.filter((_, i) => i !== index))
  const updatePart = (index, field, value) => setParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))

  const getReminderDate = () => {
    if (form.reminderDays) return addDaysISO(form.reminderDays)
    if (form.reminderCustomDate) return form.reminderCustomDate
    return null
  }

  const getNextPMDate = () => {
    if (!equipment) return null
    if (form.pmScheduleAction === 'keep') return getNextOccurrence(equipment.next_pm_date, equipment.interval_days)
    if (form.pmScheduleAction === 'recalculate') {
      if (equipment.interval_days) return addDaysISO(equipment.interval_days)
      return null
    }
    if (form.pmScheduleAction === 'custom' && form.customPMDays) return addDaysISO(parseInt(form.customPMDays))
    return equipment.next_pm_date
  }

  const isDecommissioned = form.deviceStatus === 'decommissioned'
  const validParts = parts.filter(p => p.name.trim())

  const canSave = form.whatHappened && form.whatWasDone && form.deviceStatus &&
    (isDecommissioned || form.pmScheduleAction) &&
    (!form.needsReminder || (getReminderDate() && (form.reminderNote || form.reminderNoteCustom)))

  const nextOccurrenceDisplay = equipment
    ? new Date(getNextOccurrence(equipment.next_pm_date, equipment.interval_days) || Date.now())
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const resetFromTodayDisplay = equipment?.interval_days
    ? new Date(Date.now() + equipment.interval_days * 86400000)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const nextPMDate = isDecommissioned ? null : getNextPMDate()
    const reminderNote = form.reminderNote === 'Other' ? form.reminderNoteCustom : form.reminderNote
    const partsWithQty = validParts.map(p => ({ ...p, quantity: parseInt(p.quantity) || null }))
    const partsUsedText = partsWithQty.map(p => `${p.quantity}x ${p.name}${p.description ? ` (${p.description})` : ''}`).join(', ')

    // Mark reminder as resolved
    await supabase
      .from('follow_up_reminders')
      .update({ status: 'resolved' })
      .eq('id', id)

    // Create new service log
    const { data: newLog } = await supabase
      .from('repair_logs')
      .insert({
        equipment_id: equipment.id,
        facility_id: facility.id,
        log_type: form.logType,
        what_happened: form.whatHappened,
        root_cause: form.rootCause,
        what_was_done: form.whatWasDone,
        parts_used: partsUsedText || null,
        parts_list: partsWithQty.length > 0 ? partsWithQty : null,
        time_spent: form.timeSpent || null,
        device_status: form.deviceStatus,
        billing_classification: form.billingClassification || null,
        lpo_number: form.lpoNumber || null,
        follow_up_note: form.engineerComment || null,
        follow_up_date: getReminderDate(),
        follow_up_reminder_note: reminderNote || null,
        pm_schedule_action: form.pmScheduleAction || null,
        reminder_status: form.needsReminder ? 'pending' : 'none',
        technician_id: user.id,
        technician_name: profile?.full_name || user.email,
      })
      .select()
      .single()

    // Update equipment
    await supabase
      .from('equipment')
      .update({
        operational_status: form.deviceStatus,
        next_pm_date: nextPMDate,
        ...(form.logType === 'pm' ? { last_pm_date: new Date().toISOString().split('T')[0] } : {}),
      })
      .eq('id', equipment.id)

    // Create new reminder if needed
    if (form.needsReminder && getReminderDate() && newLog) {
      await supabase.from('follow_up_reminders').insert({
        equipment_id: equipment.id,
        facility_id: facility.id,
        repair_log_id: newLog.id,
        technician_id: user.id,
        reminder_date: getReminderDate(),
        reminder_note: reminderNote,
        status: 'pending',
      })
    }

    navigate('/home')
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>Loading...</div>
  )

  if (!reminder || !equipment) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>Reminder not found</div>
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
        <div style={{ fontSize: '15px', fontWeight: '500' }}>Resolve follow-up</div>
      </div>

      <div style={{ padding: '16px', paddingBottom: '140px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Device info */}
        <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>{equipment.name}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{equipment.location}{equipment.room_number ? ` · ${equipment.room_number}` : ''}</div>
          {(equipment.model_number || equipment.serial_number) && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
              {equipment.model_number && <div style={{ fontSize: '11px', color: '#888' }}>Model: <span style={{ fontWeight: '500', color: '#444' }}>{equipment.model_number}</span></div>}
              {equipment.serial_number && <div style={{ fontSize: '11px', color: '#888' }}>S/N: <span style={{ fontWeight: '500', color: '#444' }}>{equipment.serial_number}</span></div>}
            </div>
          )}
        </div>

        {/* Original log summary */}
        <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#633806', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
            Previous log — follow-up reason
          </div>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#854F0B', marginBottom: '4px' }}>
            {reminder.reminder_note}
          </div>
          {originalLog && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #EF9F2744' }}>
              {originalLog.what_happened && (
                <div style={{ fontSize: '11px', color: '#854F0B' }}>
                  <span style={{ opacity: 0.7 }}>What happened: </span>{originalLog.what_happened}
                </div>
              )}
              {originalLog.what_was_done && (
                <div style={{ fontSize: '11px', color: '#854F0B' }}>
                  <span style={{ opacity: 0.7 }}>What was done: </span>{originalLog.what_was_done}
                </div>
              )}
              {originalLog.device_status && (
                <div style={{ fontSize: '11px', color: '#854F0B' }}>
                  <span style={{ opacity: 0.7 }}>Status at the time: </span>{statusLabels[originalLog.device_status] || originalLog.device_status}
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#854F0B', opacity: 0.7, marginTop: '2px' }}>
                Logged {new Date(originalLog.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} by {originalLog.technician_name}
              </div>
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#854F0B', opacity: 0.7, marginTop: '6px' }}>
            Reminder set for {new Date(reminder.reminder_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Service type */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>
            Service type <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {serviceTypes.map(t => (
              <button key={t.key}
                onClick={() => set('logType', t.key)}
                style={{
                  padding: '10px 12px', borderRadius: '8px', border: '1px solid', textAlign: 'left',
                  borderColor: form.logType === t.key ? '#85B7EB' : '#eee',
                  background: form.logType === t.key ? '#E6F1FB' : '#fff',
                  color: form.logType === t.key ? '#0C447C' : '#333',
                  fontSize: '12px', fontWeight: form.logType === t.key ? '500' : '400',
                  cursor: 'pointer'
                }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* What happened */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            What happened? <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <textarea
            value={form.whatHappened}
            onChange={e => set('whatHappened', e.target.value)}
            placeholder="e.g. Spare part arrived and was installed successfully..."
            rows={3}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5', color: '#333', background: '#fff' }}
          />
        </div>

        {/* Root cause */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Root cause</div>
          <textarea
            value={form.rootCause}
            onChange={e => set('rootCause', e.target.value)}
            placeholder="What caused the original fault? (if applicable)"
            rows={2}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5', color: '#333', background: '#fff' }}
          />
        </div>

        {/* What was done */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            What was done? <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <textarea
            value={form.whatWasDone}
            onChange={e => set('whatWasDone', e.target.value)}
            placeholder="Describe what was done to resolve this..."
            rows={3}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5', color: '#333', background: '#fff' }}
          />
        </div>

        {/* Parts used */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>
            Parts used <span style={{ color: '#aaa', fontWeight: '400' }}>(optional)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {parts.map((part, index) => (
              <div key={index} style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>Part name</div>
                    <input
                      value={part.name}
                      onChange={e => updatePart(index, 'name', e.target.value)}
                      placeholder="e.g. Air inlet filter"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', background: '#fff', color: '#333' }}
                    />
                  </div>
                  <div style={{ width: '70px' }}>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>Qty</div>
                    <input
                      type="number" min="1" value={part.quantity}
                      onChange={e => updatePart(index, 'quantity', e.target.value === '' ? '1' : e.target.value)}
                      style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', background: '#fff', textAlign: 'center', color: '#333' }}
                    />
                  </div>
                  {parts.length > 1 && (
                    <button onClick={() => removePart(index)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F09595', padding: '4px', marginTop: '14px', flexShrink: 0 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>Description <span style={{ color: '#bbb' }}>(optional)</span></div>
                  <input
                    value={part.description}
                    onChange={e => updatePart(index, 'description', e.target.value)}
                    placeholder="e.g. OEM replacement, local brand..."
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', background: '#fff', color: '#333' }}
                  />
                </div>
              </div>
            ))}
            <button onClick={addPart}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px dashed #ddd', background: 'transparent', fontSize: '12px', color: '#185FA5', cursor: 'pointer' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add another part
            </button>
          </div>
        </div>

        {/* Time spent */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            Time spent on task <span style={{ color: '#aaa', fontWeight: '400' }}>(excluding travel)</span>
          </div>
          <select value={form.timeSpent} onChange={e => set('timeSpent', e.target.value)}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: '#fff', outline: 'none', color: '#333' }}>
            <option value="">Select time...</option>
            {timeSpentOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Billing classification */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>
            Billing classification <span style={{ color: '#aaa', fontWeight: '400' }}>(optional)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {billingOptions.map(b => (
              <button key={b.key}
                onClick={() => set('billingClassification', form.billingClassification === b.key ? '' : b.key)}
                style={{
                  padding: '8px 10px', borderRadius: '8px', border: '1px solid', textAlign: 'left',
                  borderColor: form.billingClassification === b.key ? '#85B7EB' : '#eee',
                  background: form.billingClassification === b.key ? '#E6F1FB' : '#fff',
                  color: form.billingClassification === b.key ? '#0C447C' : '#333',
                  fontSize: '11px', fontWeight: form.billingClassification === b.key ? '500' : '400',
                  cursor: 'pointer'
                }}>{b.label}</button>
            ))}
          </div>
        </div>

        {/* LPO number */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            LPO / Invoice number <span style={{ color: '#aaa', fontWeight: '400' }}>(optional)</span>
          </div>
          <input value={form.lpoNumber} onChange={e => set('lpoNumber', e.target.value)}
            placeholder="e.g. LPO-2026-001"
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none', color: '#333', background: '#fff' }}
          />
        </div>

        {/* Status */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>
            Status <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {statusOptions.map(s => (
              <button key={s.key}
                onClick={() => set('deviceStatus', s.key)}
                style={{
                  padding: '10px 12px', borderRadius: '8px', border: '1px solid', textAlign: 'left',
                  borderColor: form.deviceStatus === s.key ? s.border : '#eee',
                  background: form.deviceStatus === s.key ? s.bg : '#fff',
                  color: form.deviceStatus === s.key ? s.color : '#333',
                  fontSize: '12px', fontWeight: form.deviceStatus === s.key ? '500' : '400',
                  cursor: 'pointer'
                }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Follow-up reminder */}
        {form.deviceStatus && !isDecommissioned && (
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Set another follow-up reminder?</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(o => (
                  <button key={String(o.val)}
                    onClick={() => set('needsReminder', o.val)}
                    style={{
                      padding: '4px 12px', borderRadius: '99px', border: '1px solid',
                      borderColor: form.needsReminder === o.val ? '#85B7EB' : '#ddd',
                      background: form.needsReminder === o.val ? '#E6F1FB' : '#fff',
                      color: form.needsReminder === o.val ? '#0C447C' : '#888',
                      fontSize: '11px', fontWeight: form.needsReminder === o.val ? '500' : '400',
                      cursor: 'pointer'
                    }}>{o.label}</button>
                ))}
              </div>
            </div>

            {form.needsReminder && (
              <>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', fontWeight: '500', marginBottom: '6px' }}>What is the reminder about?</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {reminderNoteOptions.map(opt => (
                      <button key={opt} onClick={() => set('reminderNote', opt)}
                        style={{
                          padding: '8px 12px', borderRadius: '8px', border: '1px solid', textAlign: 'left',
                          borderColor: form.reminderNote === opt ? '#85B7EB' : '#eee',
                          background: form.reminderNote === opt ? '#E6F1FB' : '#fff',
                          color: form.reminderNote === opt ? '#0C447C' : '#333',
                          fontSize: '12px', fontWeight: form.reminderNote === opt ? '500' : '400',
                          cursor: 'pointer'
                        }}>{opt}</button>
                    ))}
                    {form.reminderNote === 'Other' && (
                      <input value={form.reminderNoteCustom} onChange={e => set('reminderNoteCustom', e.target.value)}
                        placeholder="Describe the follow-up..."
                        style={{ width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', color: '#333', background: '#fff' }}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', fontWeight: '500', marginBottom: '6px' }}>When should we remind you?</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {quickReminderOptions.map(opt => (
                      <button key={opt.days}
                        onClick={() => { set('reminderDays', opt.days); set('reminderCustomDate', '') }}
                        style={{
                          padding: '5px 12px', borderRadius: '99px', border: '1px solid',
                          borderColor: form.reminderDays === opt.days ? '#85B7EB' : '#eee',
                          background: form.reminderDays === opt.days ? '#E6F1FB' : '#fff',
                          color: form.reminderDays === opt.days ? '#0C447C' : '#888',
                          fontSize: '11px', cursor: 'pointer'
                        }}>{opt.label}</button>
                    ))}
                  </div>
                  <input type="date" value={form.reminderCustomDate}
                    onChange={e => { set('reminderCustomDate', e.target.value); set('reminderDays', null) }}
                    style={{ width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', color: '#333' }}
                  />
                  {getReminderDate() && (
                    <div style={{ marginTop: '6px', background: '#E6F1FB', border: '1px solid #85B7EB', borderRadius: '8px', padding: '7px 10px', fontSize: '11px', color: '#0C447C' }}>
                      Next reminder: {new Date(getReminderDate()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* PM Schedule */}
        {form.deviceStatus && !isDecommissioned && (
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>
              PM schedule <span style={{ color: '#E24B4A' }}>*</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

              <div onClick={() => set('pmScheduleAction', 'keep')}
                style={{ background: form.pmScheduleAction === 'keep' ? '#E1F5EE' : '#fff', border: `1px solid ${form.pmScheduleAction === 'keep' ? '#5DCAA5' : '#eee'}`, borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: form.pmScheduleAction === 'keep' ? '#085041' : '#333' }}>Continue on original schedule</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                  {nextOccurrenceDisplay ? `Next PM: ${nextOccurrenceDisplay}` : 'Next future date in the original cycle'}
                </div>
              </div>

              <div onClick={() => set('pmScheduleAction', 'recalculate')}
                style={{ background: form.pmScheduleAction === 'recalculate' ? '#E6F1FB' : '#fff', border: `1px solid ${form.pmScheduleAction === 'recalculate' ? '#85B7EB' : '#eee'}`, borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: form.pmScheduleAction === 'recalculate' ? '#0C447C' : '#333' }}>Reset from today</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                  {resetFromTodayDisplay ? `Sets next PM to ${resetFromTodayDisplay} (${equipment.interval_days} days from today)` : 'Recalculate based on interval'}
                </div>
              </div>

              <div onClick={() => set('pmScheduleAction', 'custom')}
                style={{ background: form.pmScheduleAction === 'custom' ? '#FAEEDA' : '#fff', border: `1px solid ${form.pmScheduleAction === 'custom' ? '#EF9F27' : '#eee'}`, borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: form.pmScheduleAction === 'custom' ? '#633806' : '#333' }}>Set a custom date</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Choose how many days from today</div>
                {form.pmScheduleAction === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <input type="number" min="1" value={form.customPMDays}
                      onChange={e => set('customPMDays', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="e.g. 45"
                      style={{ width: '70px', padding: '5px 8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', color: '#333', background: '#fff' }}
                    />
                    <span style={{ fontSize: '12px', color: '#888' }}>days from today</span>
                    {form.customPMDays && (
                      <span style={{ fontSize: '11px', color: '#633806', fontWeight: '500' }}>
                        = {new Date(Date.now() + parseInt(form.customPMDays) * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {isDecommissioned && (
          <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
            This device will be marked as decommissioned. No further PM notifications or follow-up reminders will be sent. The service history will be preserved.
          </div>
        )}

        {/* Engineer comment */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            Engineer comment <span style={{ color: '#aaa', fontWeight: '400' }}>(optional)</span>
          </div>
          <textarea value={form.engineerComment} onChange={e => set('engineerComment', e.target.value)}
            placeholder="Any observations or comments..."
            rows={2}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5', color: '#333', background: '#fff' }}
          />
        </div>

      </div>

      <div style={{ position: 'fixed', bottom: '70px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px', display: 'flex', gap: '8px' }}>
        <button onClick={() => navigate(-1)}
          style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={!canSave || saving}
          style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: canSave && !saving ? '#185FA5' : '#ccc', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: canSave && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving...' : 'Save & mark resolved'}
        </button>
      </div>
    </div>
  )
}