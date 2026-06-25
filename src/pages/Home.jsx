import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function getStatus(item) {
  if (!item.next_pm_date) return 'ok'
  const today = new Date()
  const next = new Date(item.next_pm_date)
  const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 30) return 'due-soon'
  return 'ok'
}

export default function Home({ facility, onSwitchFacility, onSignOut }) {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!facility) return

    const loadData = async () => {
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('*')
        .eq('facility_id', facility.id)
        .order('next_pm_date', { ascending: true })

      if (equipmentData) {
        setEquipment(equipmentData.map(e => ({ ...e, status: getStatus(e) })))
      }

      const today = new Date().toISOString().split('T')[0]
      const { data: reminderData } = await supabase
        .from('follow_up_reminders')
        .select('*, equipment(name, location)')
        .eq('facility_id', facility.id)
        .eq('status', 'pending')
        .lte('reminder_date', today)
        .order('reminder_date', { ascending: true })

      if (reminderData) setReminders(reminderData)

      setLoading(false)
    }

    loadData()
  }, [facility])

  const overdue = equipment.filter(e => e.status === 'overdue')
  const dueSoon = equipment.filter(e => e.status === 'due-soon')
  const upToDate = equipment.filter(e => e.status === 'ok').length
  const hasAnything = overdue.length > 0 || dueSoon.length > 0 || reminders.length > 0

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={onSwitchFacility} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {facility?.name || 'Select facility'}
            <svg width="14" height="14" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>Tap to switch facility</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/team')}
            style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#888' }}>
            Team
          </button>
          <button
            onClick={onSignOut}
            style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#888' }}>
            Sign out
          </button>
          <button
            onClick={() => navigate('/equipment/add')}
            style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#185FA5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Total', value: equipment.length, color: '#444', bg: '#f5f5f5', border: '#ddd' },
            { label: 'Overdue', value: overdue.length, color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
            { label: 'Due soon', value: dueSoon.length, color: '#7A5C00', bg: '#FEF9EC', border: '#F5C842' },
            { label: 'OK', value: upToDate, color: '#085041', bg: '#E1F5EE', border: '#5DCAA5' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: '8px', padding: '10px 8px', textAlign: 'center', border: `1px solid ${stat.border}` }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: stat.color, marginTop: '2px', opacity: 0.8 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#aaa', fontSize: '13px' }}>Loading...</div>
        )}

        {!loading && !hasAnything && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1D9E75', marginBottom: '6px' }}>All clear</div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>No overdue PMs, no pending follow-ups. Everything is on schedule.</div>
          </div>
        )}

        {/* Overdue PMs — Red */}
        {!loading && overdue.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E24B4A', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#A32D2D', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Overdue PM — {overdue.length} device{overdue.length > 1 ? 's' : ''}
              </div>
            </div>
            {overdue.map(item => (
              <div key={item.id}
                onClick={() => navigate(`/equipment/${item.id}`)}
                style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#791F1F' }}>{item.name}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#fff', color: '#A32D2D', border: '1px solid #F09595' }}>
                    {Math.abs(Math.ceil((new Date(item.next_pm_date) - new Date()) / (1000 * 60 * 60 * 24)))} days overdue
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#A32D2D' }}>{item.location}{item.room_number ? ` · ${item.room_number}` : ''}</div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: '#A32D2D', marginTop: '6px' }}>View & mark done →</div>
              </div>
            ))}
          </>
        )}

        {/* Pending follow-ups — Deep amber/orange */}
        {!loading && reminders.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF9F27', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#633806', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Pending follow-up — {reminders.length} item{reminders.length > 1 ? 's' : ''}
              </div>
            </div>
            {reminders.map(reminder => {
              const isOverdueReminder = reminder.reminder_date < new Date().toISOString().split('T')[0]
              return (
                <div key={reminder.id}
                  onClick={() => navigate(`/follow-up/${reminder.id}`)}
                  style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#633806' }}>{reminder.equipment?.name}</div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#fff', color: '#854F0B', border: '1px solid #EF9F27' }}>
                      {isOverdueReminder ? 'Overdue' : 'Due today'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#854F0B', marginBottom: '4px' }}>{reminder.reminder_note}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    {reminder.equipment?.location} · {new Date(reminder.reminder_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#854F0B', marginTop: '6px' }}>Resolve →</div>
                </div>
              )
            })}
          </>
        )}

        {/* Due soon PMs — Light yellow */}
        {!loading && dueSoon.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F5C842', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#7A5C00', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Due soon — {dueSoon.length} device{dueSoon.length > 1 ? 's' : ''}
              </div>
            </div>
            {dueSoon.map(item => (
              <div key={item.id}
                onClick={() => navigate(`/equipment/${item.id}`)}
                style={{ background: '#FEF9EC', border: '1px solid #F5C842', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#7A5C00' }}>{item.name}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#fff', color: '#9A7300', border: '1px solid #F5C842' }}>
                    {Math.ceil((new Date(item.next_pm_date) - new Date()) / (1000 * 60 * 60 * 24))}d away
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#9A7300' }}>{item.location}{item.room_number ? ` · ${item.room_number}` : ''}</div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: '#9A7300', marginTop: '6px' }}>View instructions →</div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  )
}