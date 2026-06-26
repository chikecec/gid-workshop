import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const quickReminderOptions = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
]

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getNextOccurrence(nextPMDate, intervalDays) {
  if (!nextPMDate || !intervalDays) return nextPMDate
  const today = new Date()
  let next = new Date(nextPMDate)
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    updateNote: '',
    deviceStatus: '',
    needsAnotherReminder: false,
    reminderDays: null,
    reminderCustomDate: '',
    reminderNote: '',
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
          setForm(f => ({ ...f, deviceStatus: equipmentData.operational_status || 'working' }))
        }
      }

      setLoading(false)
    }
    load()
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const getReminderDate = () => {
    if (form.reminderDays) return addDaysISO(form.reminderDays)
    if (form.reminderCustomDate) return form.reminderCustomDate
    return null
  }

  const getNextPMDate = () => {
    if (!equipment) return null
    if (form.pmScheduleAction === 'keep') {
      return getNextOccurrence(equipment.next_pm_date, equipment.interval_days)
    }
    if (form.pmScheduleAction === 'recalculate') {
      if (equipment.interval_days) return addDaysISO(equipment.interval_days)
      return null
    }
    if (form.pmScheduleAction === 'custom' && form.customPMDays) {
      return addDaysISO(parseInt(form.customPMDays))
    }
    return equipment.next_pm_date
  }

  const canSave = form.updateNote && form.deviceStatus && form.pmScheduleAction &&
    (!form.needsAnotherReminder || getReminderDate())

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await supabase
      .from('follow_up_reminders')
      .update({ status: 'resolved' })
      .eq('id', id)

    const nextPMDate = getNextPMDate()
    await supabase
      .from('equipment')
      .update({
        operational_status: form.deviceStatus,
        next_pm_date: nextPMDate,
      })
      .eq('id', equipment.id)

    await supabase.from('repair_logs').insert({
      equipment_id: equipment.id,
      facility_id: facility.id,
      log_type: 'other',
      what_happened: `Follow-up: ${reminder.reminder_note}`,
      what_was_done: form.updateNote,
      device_status: form.deviceStatus,
      outcome: 'other',
      reminder_status: form.needsAnotherReminder ? 'pending' : 'resolved',
      technician_id: user.id,
      technician_name: profile?.full_name || user.email,
    })

    if (form.needsAnotherReminder && getReminderDate()) {
      await supabase.from('follow_up_reminders').insert({
        equipment_id: equipment.id,
        facility_id: facility.id,
        repair_log_id: reminder.repair_log_id,
        technician_id: user.id,
        reminder_date: getReminderDate(),
        reminder_note: form.reminderNote || reminder.reminder_note,
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

  const nextOccurrenceDisplay = equipment
    ? new Date(getNextOccurrence(equipment.next_pm_date, equipment.interval_days) || Date.now())
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const resetFromTodayDisplay = equipment?.interval_days
    ? new Date(Date.now() + equipment.interval_days * 86400000)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

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

        <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#633806', marginBottom: '4px' }}>{equipment.name}</div>
          <div style={{ fontSize: '12px', color: '#854F0B', marginBottom: '4px' }}>{reminder.reminder_note}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            {equipment.location} · Reminder set for {new Date(reminder.reminder_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
            What happened? <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <textarea
            value={form.updateNote}
            onChange={e => set('updateNote', e.target.value)}
            placeholder="e.g. Spare part arrived and installed, machine is now working..."
            rows={3}
            style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '6px' }}>
            Device status now <span style={{ color: '#E24B4A' }}>*</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'working', label: 'Working', color: '#085041', bg: '#E1F5EE', border: '#5DCAA5' },
              { key: 'out-of-service', label: 'Out of service', color: '#791F1F', bg: '#FCEBEB', border: '#F09595' },
              { key: 'decommissioned', label: 'Decommissioned', color: '#444', bg: '#f5f5f5', border: '#ddd' },
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

        {form.deviceStatus && form.deviceStatus !== 'decommissioned' && (
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: '500' }}>Set another reminder?</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(o => (
                  <button key={String(o.val)}
                    onClick={() => set('needsAnotherReminder', o.val)}
                    style={{
                      padding: '4px 12px', borderRadius: '99px', border: '1px solid',
                      borderColor: form.needsAnotherReminder === o.val ? '#85B7EB' : '#ddd',
                      background: form.needsAnotherReminder === o.val ? '#E6F1FB' : '#fff',
                      color: form.needsAnotherReminder === o.val ? '#0C447C' : '#888',
                      fontSize: '11px', fontWeight: form.needsAnotherReminder === o.val ? '500' : '400',
                      cursor: 'pointer'
                    }}>{o.label}</button>
                ))}
              </div>
            </div>

            {form.needsAnotherReminder && (
              <>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', fontWeight: '500', marginBottom: '5px' }}>Reminder note</div>
                  <input
                    value={form.reminderNote}
                    onChange={e => set('reminderNote', e.target.value)}
                    placeholder={reminder.reminder_note}
                    style={{ width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', fontWeight: '500', marginBottom: '6px' }}>When?</div>
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
                  <input
                    type="date"
                    value={form.reminderCustomDate}
                    onChange={e => { set('reminderCustomDate', e.target.value); set('reminderDays', null) }}
                    style={{ width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
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

        {form.deviceStatus && form.deviceStatus !== 'decommissioned' && (
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500' }}>
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
                  {resetFromTodayDisplay
                    ? `Sets next PM to ${resetFromTodayDisplay} (${equipment.interval_days} days from today)`
                    : 'Recalculate based on interval'}
                </div>
              </div>

              <div onClick={() => set('pmScheduleAction', 'custom')}
                style={{ background: form.pmScheduleAction === 'custom' ? '#FAEEDA' : '#fff', border: `1px solid ${form.pmScheduleAction === 'custom' ? '#EF9F27' : '#eee'}`, borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: form.pmScheduleAction === 'custom' ? '#633806' : '#333' }}>Set a custom date</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Choose how many days from today</div>
                {form.pmScheduleAction === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      value={form.customPMDays}
                      onChange={e => set('customPMDays', e.target.value)}
                      placeholder="e.g. 45"
                      onClick={e => e.stopPropagation()}
                      style={{ width: '70px', padding: '5px 8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
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

        {form.deviceStatus === 'decommissioned' && (
          <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
            This device will be marked as decommissioned. No further PM notifications or follow-up reminders will be sent. The service history will be preserved.
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
          {saving ? 'Saving...' : 'Mark resolved'}
        </button>
      </div>
    </div>
  )
}