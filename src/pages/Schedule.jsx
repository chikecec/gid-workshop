import { useNavigate } from 'react-router-dom'

const today = new Date()
const monthName = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

const scheduled = [
  { id: 1, name: 'Ventilator V-03', location: 'ICU · Ward 4', dueDate: '14 May 2026', status: 'overdue', daysOverdue: 12 },
  { id: 2, name: 'Ophthalmoscope OP-01', location: 'Eye clinic', dueDate: '27 May 2026', status: 'due-soon', daysUntil: 1 },
  { id: 3, name: 'Autoclave AC-01', location: 'Central sterilisation', dueDate: '29 May 2026', status: 'due-soon', daysUntil: 3 },
  { id: 4, name: 'Patient monitor PM-07', location: 'General ward', dueDate: '3 Jul 2026', status: 'upcoming', daysUntil: 38 },
  { id: 5, name: 'ECG machine EC-02', location: 'Cardiology', dueDate: '12 Aug 2026', status: 'upcoming', daysUntil: 78 },
]

const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function buildCalendar() {
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

const overdueDays = [14]
const pmDays = [27, 29]

export default function Schedule() {
  const navigate = useNavigate()
  const cells = buildCalendar()

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Schedule</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>{monthName}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="#666" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="#666" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {days.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: '#aaa', padding: '3px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const isToday = day === today.getDate()
              const isOverdue = overdueDays.includes(day)
              const isPM = pmDays.includes(day)
              return (
                <div key={i} style={{
                  height: '32px', borderRadius: '8px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  background: isToday ? '#185FA5' : 'transparent', position: 'relative'
                }}>
                  <span style={{ fontSize: '12px', color: isToday ? '#fff' : '#333', fontWeight: isToday ? '500' : '400' }}>{day}</span>
                  {(isOverdue || isPM) && !isToday && (
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isOverdue ? '#E24B4A' : '#EF9F27', position: 'absolute', bottom: '3px' }}/>
                  )}
                </div>
              )
            })}
          </div>

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

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Needs attention now</div>

        {scheduled.filter(s => s.status === 'overdue').map(item => (
          <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
            style={{ background: '#fff', border: '1px solid #F09595', borderRadius: '12px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="#A32D2D" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              <div style={{ fontSize: '11px', color: '#A32D2D', marginTop: '1px' }}>Overdue by {item.daysOverdue} days · {item.location}</div>
            </div>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#FCEBEB', color: '#A32D2D', border: '1px solid #F09595', flexShrink: 0 }}>Overdue</span>
          </div>
        ))}

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Coming up</div>

        {scheduled.filter(s => s.status === 'due-soon' || s.status === 'upcoming').map(item => (
          <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
            style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: item.status === 'due-soon' ? '#FAEEDA' : '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke={item.status === 'due-soon' ? '#854F0B' : '#185FA5'} strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>Due {item.dueDate} · {item.location}</div>
            </div>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: item.status === 'due-soon' ? '#FAEEDA' : '#E6F1FB', color: item.status === 'due-soon' ? '#854F0B' : '#185FA5', border: `1px solid ${item.status === 'due-soon' ? '#EF9F27' : '#85B7EB'}`, flexShrink: 0 }}>
              {item.daysUntil ? `${item.daysUntil}d` : 'Upcoming'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
