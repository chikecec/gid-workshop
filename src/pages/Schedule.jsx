import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function getStatus(item) {
  if (!item.next_pm_date) return 'upcoming'
  const today = new Date()
  const next = new Date(item.next_pm_date)
  const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 30) return 'due-soon'
  return 'upcoming'
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  const next = new Date(dateStr)
  return Math.ceil((next - today) / (1000 * 60 * 60 * 24))
}

const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function Schedule({ facility }) {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (!facility) return
    supabase
      .from('equipment')
      .select('*')
      .eq('facility_id', facility.id)
      .order('next_pm_date', { ascending: true })
      .then(({ data }) => {
        if (data) setEquipment(data.map(e => ({ ...e, status: getStatus(e) })))
        setLoading(false)
      })
  }, [facility])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const today = new Date()
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year

  const pmDaysInMonth = equipment
    .filter(e => e.next_pm_date)
    .reduce((acc, e) => {
      const d = new Date(e.next_pm_date)
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate()
        if (!acc[day]) acc[day] = { day, status: e.status, items: [] }
        acc[day].items.push(e)
        if (e.status === 'overdue') acc[day].status = 'overdue'
      }
      return acc
    }, {})

  const overdue = equipment.filter(e => e.status === 'overdue')
  const dueSoon = equipment.filter(e => e.status === 'due-soon')
  const upcoming = equipment.filter(e => e.status === 'upcoming')

  const prevMonth = () => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
    setSelectedDay(null)
  }

  const nextMonth = () => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
    setSelectedDay(null)
  }

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Schedule</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>{monthName}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="#666" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="#666" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {dayLabels.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: '#aaa', padding: '3px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const isToday = isCurrentMonth && day === today.getDate()
              const pmDay = pmDaysInMonth[day]
              const isSelected = selectedDay === day
              return (
                <div key={i}
                  onClick={() => pmDay ? setSelectedDay(isSelected ? null : day) : null}
                  style={{
                    height: '32px', borderRadius: '8px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: pmDay ? 'pointer' : 'default',
                    background: isToday ? '#185FA5' : isSelected ? '#E6F1FB' : 'transparent',
                    position: 'relative'
                  }}>
                  <span style={{
                    fontSize: '12px',
                    color: isToday ? '#fff' : isSelected ? '#185FA5' : '#333',
                    fontWeight: isToday || isSelected ? '500' : '400'
                  }}>{day}</span>
                  {pmDay && !isToday && (
                    <div style={{
                      width: '4px', height: '4px', borderRadius: '50%',
                      background: pmDay.status === 'overdue' ? '#E24B4A' : '#EF9F27',
                      position: 'absolute', bottom: '3px'
                    }}/>
                  )}
                </div>
              )
            })}
          </div>

          {selectedDay && pmDaysInMonth[selectedDay] && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f5f5f5' }}>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>
                {selectedDay} {currentDate.toLocaleDateString('en-GB', { month: 'long' })} — {pmDaysInMonth[selectedDay].items.length} device{pmDaysInMonth[selectedDay].items.length > 1 ? 's' : ''} due
              </div>
              {pmDaysInMonth[selectedDay].items.map(item => (
                <div key={item.id}
                  onClick={() => navigate(`/equipment/${item.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.status === 'overdue' ? '#E24B4A' : '#EF9F27', flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{item.location}</div>
                  </div>
                  <svg width="14" height="14" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '14px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f5f5f5' }}>
            {[
              { color: '#E24B4A', label: 'Overdue' },
              { color: '#EF9F27', label: 'Upcoming PM' },
              { color: '#185FA5', label: 'Today' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, flexShrink: 0 }}/>
                <span style={{ fontSize: '11px', color: '#888' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '13px' }}>Loading schedule...</div>
        )}

        {!loading && equipment.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>No equipment registered yet</div>
            <div style={{ fontSize: '12px' }}>Add devices to see their PM schedule here</div>
          </div>
        )}

        {overdue.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Needs attention now</div>
            {overdue.map(item => (
              <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
                style={{ background: '#fff', border: '1px solid #F09595', borderRadius: '12px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" fill="none" stroke="#A32D2D" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#A32D2D', marginTop: '1px' }}>
                    Overdue by {Math.abs(getDaysUntil(item.next_pm_date))} days · {item.location}
                  </div>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#FCEBEB', color: '#A32D2D', border: '1px solid #F09595', flexShrink: 0 }}>Overdue</span>
              </div>
            ))}
          </>
        )}

        {dueSoon.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Due soon</div>
            {dueSoon.map(item => {
              const d = getDaysUntil(item.next_pm_date)
              return (
                <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
                  style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" stroke="#854F0B" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
                      Due {new Date(item.next_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {item.location}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#FAEEDA', color: '#854F0B', border: '1px solid #EF9F27', flexShrink: 0 }}>
                    {d}d
                  </span>
                </div>
              )
            })}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Upcoming</div>
            {upcoming.map(item => {
              const d = getDaysUntil(item.next_pm_date)
              return (
                <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
                  style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" stroke="#185FA5" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
                      Due {item.next_pm_date ? new Date(item.next_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'} · {item.location}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#E6F1FB', color: '#185FA5', border: '1px solid #85B7EB', flexShrink: 0 }}>
                    {d ? `${d}d` : '—'}
                  </span>
                </div>
              )
            })}
          </>
        )}

      </div>
    </div>
  )
}