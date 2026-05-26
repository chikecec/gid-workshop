import { useNavigate } from 'react-router-dom'

const equipment = [
  { id: 1, name: 'Ventilator V-03', type: 'Respiratory', location: 'ICU · Ward 4', status: 'overdue', daysOverdue: 12 },
  { id: 2, name: 'Autoclave AC-01', type: 'Sterilisation', location: 'Central sterilisation', status: 'due-soon', daysUntil: 4 },
  { id: 3, name: 'Patient monitor PM-07', type: 'Monitoring', location: 'General ward', status: 'ok' },
  { id: 4, name: 'ECG machine EC-02', type: 'Cardiology', location: 'Cardiology', status: 'ok' },
]

const statusBadge = (item) => {
  if (item.status === 'overdue') return { label: 'Overdue', bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' }
  if (item.status === 'due-soon') return { label: 'Due soon', bg: '#FAEEDA', color: '#854F0B', border: '#EF9F27' }
  return { label: 'Up to date', bg: '#E1F5EE', color: '#085041', border: '#5DCAA5' }
}

export default function Home({ facility, onSwitchFacility }) {
  const navigate = useNavigate()

  const overdue = equipment.filter(e => e.status === 'overdue').length
  const dueSoon = equipment.filter(e => e.status === 'due-soon').length
  const upToDate = equipment.filter(e => e.status === 'ok').length

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
        <button
          onClick={() => navigate('/equipment/add')}
          style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#185FA5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Total equipment', value: equipment.length, color: '#0F6E56' },
            { label: 'Overdue PM', value: overdue, color: '#A32D2D' },
            { label: 'Due this month', value: dueSoon, color: '#854F0B' },
            { label: 'Up to date', value: upToDate, color: '#0F6E56' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px', border: '1px solid #eee' }}>
              <div style={{ fontSize: '22px', fontWeight: '500', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {equipment.filter(e => e.status === 'overdue').map(item => (
          <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
            style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#791F1F' }}>Overdue — {item.name}</div>
            <div style={{ fontSize: '11px', color: '#A32D2D', marginTop: '2px' }}>PM was due {item.daysOverdue} days ago · {item.location}</div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#185FA5', marginTop: '6px' }}>View & schedule →</div>
          </div>
        ))}

        {equipment.filter(e => e.status === 'due-soon').map(item => (
          <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
            style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#633806' }}>Due in {item.daysUntil} days — {item.name}</div>
            <div style={{ fontSize: '11px', color: '#854F0B', marginTop: '2px' }}>{item.location}</div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#185FA5', marginTop: '6px' }}>View instructions →</div>
          </div>
        ))}

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>All equipment</div>

        {equipment.map(item => {
          const badge = statusBadge(item)
          return (
            <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="#185FA5" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{item.location}</div>
              </div>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, flexShrink: 0 }}>
                {badge.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
