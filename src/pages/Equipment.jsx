import { useNavigate } from 'react-router-dom'

const equipment = [
  { id: 1, name: 'Ventilator V-03', type: 'Respiratory support', location: 'ICU · Ward 4', status: 'overdue', lastPM: '14 Nov 2025', nextPM: '14 May 2026' },
  { id: 2, name: 'Autoclave AC-01', type: 'Sterilisation', location: 'Central sterilisation', status: 'due-soon', lastPM: '29 Nov 2025', nextPM: '29 May 2026' },
  { id: 3, name: 'Patient monitor PM-07', type: 'Monitoring', location: 'General ward', status: 'ok', lastPM: '3 Apr 2026', nextPM: '3 Jul 2026' },
  { id: 4, name: 'ECG machine EC-02', type: 'Cardiology', location: 'Cardiology', status: 'ok', lastPM: '12 May 2026', nextPM: '12 Aug 2026' },
  { id: 5, name: 'Ophthalmoscope OP-01', type: 'Diagnostic', location: 'Eye clinic', status: 'due-soon', lastPM: '27 May 2025', nextPM: '27 May 2026' },
]

const statusBadge = (status) => {
  if (status === 'overdue') return { label: 'Overdue', bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' }
  if (status === 'due-soon') return { label: 'Due soon', bg: '#FAEEDA', color: '#854F0B', border: '#EF9F27' }
  return { label: 'Up to date', bg: '#E1F5EE', color: '#085041', border: '#5DCAA5' }
}

export default function Equipment() {
  const navigate = useNavigate()

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Equipment</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>{equipment.length} devices registered</div>
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

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          {['All', 'Overdue', 'Due soon', 'OK'].map(f => (
            <button key={f} style={{
              padding: '5px 12px', borderRadius: '99px', border: '1px solid #eee',
              fontSize: '12px', background: f === 'All' ? '#185FA5' : '#fff',
              color: f === 'All' ? '#fff' : '#888', cursor: 'pointer'
            }}>{f}</button>
          ))}
        </div>

        {equipment.map(item => {
          const badge = statusBadge(item.status)
          return (
            <div key={item.id}
              onClick={() => navigate(`/equipment/${item.id}`)}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" fill="none" stroke="#185FA5" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{item.type} · {item.location}</div>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, flexShrink: 0 }}>
                  {badge.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f5f5f5' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>Last PM</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', marginTop: '1px' }}>{item.lastPM}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>Next PM due</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', marginTop: '1px', color: item.status === 'overdue' ? '#A32D2D' : item.status === 'due-soon' ? '#854F0B' : '#0F6E56' }}>{item.nextPM}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
