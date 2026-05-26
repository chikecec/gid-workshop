import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const logs = [
  {
    id: 1, device: 'Ventilator V-03', location: 'ICU · Ward 4',
    type: 'repair', date: '26 May 2026', tech: 'Abdullah M.',
    whatHappened: 'Valve diaphragm torn — device cannot safely ventilate. Taken out of service immediately.',
    rootCause: 'Condensate buildup over previous weeks accelerating material fatigue.',
    whatWasDone: 'Attempted temporary repair — unsuccessful. Replacement diaphragm not in stock. Part ordered from supplier. Device tagged out of service and ward notified to use backup unit.',
    partsUsed: 'Valve diaphragm', labourHours: '1.5', deviceStatus: 'out-of-service',
    followUp: 'Check again in 3 days once replacement part arrives.',
  },
  {
    id: 2, device: 'Autoclave AC-01', location: 'Central sterilisation',
    type: 'issue', date: '18 May 2026', tech: 'Sharon K.',
    whatHappened: 'Door seal showing wear. Sterilisation cycle completing but pressure drop noted.',
    rootCause: 'Door seal aged — normal wear after 18 months of heavy use.',
    whatWasDone: 'Documented issue. Ordered replacement seal. Continued use with monitoring.',
    partsUsed: 'None yet', labourHours: '0.5', deviceStatus: 'working',
    followUp: 'Replace seal when part arrives.',
  },
  {
    id: 3, device: 'ECG machine EC-02', location: 'Cardiology',
    type: 'pm', date: '12 May 2026', tech: 'Abdullah M.',
    whatHappened: 'Scheduled 3-month PM.',
    rootCause: '',
    whatWasDone: 'All leads checked, calibration passed, cleaned electrodes and housing.',
    partsUsed: 'None', labourHours: '1', deviceStatus: 'working',
    followUp: '',
  },
  {
    id: 4, device: 'Patient monitor PM-07', location: 'General ward',
    type: 'pm', date: '3 Apr 2026', tech: 'Sharon K.',
    whatHappened: 'Scheduled quarterly PM.',
    rootCause: '',
    whatWasDone: 'Battery replaced. SpO2 sensor calibrated. Screen cleaned.',
    partsUsed: 'Battery', labourHours: '0.75', deviceStatus: 'working',
    followUp: '',
  },
]

const typeConfig = {
  repair: { label: 'Repair', bg: '#FCEBEB', color: '#791F1F', border: '#F09595', dot: '#E24B4A' },
  issue: { label: 'Issue', bg: '#FAEEDA', color: '#633806', border: '#EF9F27', dot: '#EF9F27' },
  pm: { label: 'PM done', bg: '#E1F5EE', color: '#085041', border: '#5DCAA5', dot: '#1D9E75' },
}

const statusConfig = {
  'working': { label: 'Working', color: '#085041' },
  'out-of-service': { label: 'Out of service', color: '#A32D2D' },
  'needs-followup': { label: 'Needs follow-up', color: '#854F0B' },
}

const months = ['May 2026', 'April 2026']

export default function Logs() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)

  const filters = ['All', 'Repairs', 'PM done', 'Issues']

  const filtered = logs.filter(l => {
    if (filter === 'All') return true
    if (filter === 'Repairs') return l.type === 'repair'
    if (filter === 'PM done') return l.type === 'pm'
    if (filter === 'Issues') return l.type === 'issue'
    return true
  })

  if (selected) {
    const log = logs.find(l => l.id === selected)
    const tc = typeConfig[log.type]
    const sc = statusConfig[log.deviceStatus]
    return (
      <div>
        <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Logs
          </button>
          <button style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#666' }}>Edit</button>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" fill="none" stroke="#A32D2D" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{log.device}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{log.location}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>{tc.label}</span>
            <span style={{ fontSize: '11px', color: '#aaa' }}>{log.date}</span>
          </div>

          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
            {[
              { label: 'Technician', value: log.tech },
              { label: 'Labour time', value: `${log.labourHours} hrs` },
              { label: 'Parts used', value: log.partsUsed },
              { label: 'Device status', value: sc.label, color: sc.color },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>{row.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '500', color: row.color || '#1a1a1a' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {[
            { label: 'What was found', value: log.whatHappened },
            { label: 'Root cause', value: log.rootCause },
            { label: 'What was done', value: log.whatWasDone },
            log.followUp && { label: 'Follow-up note', value: log.followUp },
          ].filter(Boolean).filter(s => s.value).map(section => (
            <div key={section.label}>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{section.label}</div>
              <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#333', lineHeight: '1.6' }}>{section.value}</div>
            </div>
          ))}

          <div onClick={() => navigate(`/equipment/${log.id}`)}
            style={{ background: '#E6F1FB', border: '1px solid #85B7EB', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <svg width="15" height="15" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            <span style={{ fontSize: '12px', color: '#0C447C' }}>View full history for {log.device} →</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Logs</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>{logs.length} records</div>
        </div>
        <button style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer' }}>
          <svg width="16" height="16" fill="none" stroke="#666" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid #eee', fontSize: '12px', background: filter === f ? '#185FA5' : '#fff', color: filter === f ? '#fff' : '#888', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {f}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>May 2026</div>

        {filtered.filter(l => l.date.includes('May')).map(log => {
          const tc = typeConfig[log.type]
          return (
            <div key={log.id} onClick={() => setSelected(log.id)}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tc.dot, flexShrink: 0, marginTop: '4px' }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{log.device}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{log.location}</div>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, flexShrink: 0 }}>{tc.label}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#666', paddingLeft: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.whatHappened}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '17px' }}>
                <span style={{ fontSize: '11px', color: '#aaa' }}>{log.tech}</span>
                <span style={{ fontSize: '11px', color: '#aaa' }}>{log.date}</span>
              </div>
            </div>
          )
        })}

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>April 2026</div>

        {filtered.filter(l => l.date.includes('Apr')).map(log => {
          const tc = typeConfig[log.type]
          return (
            <div key={log.id} onClick={() => setSelected(log.id)}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tc.dot, flexShrink: 0, marginTop: '4px' }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{log.device}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{log.location}</div>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, flexShrink: 0 }}>{tc.label}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#666', paddingLeft: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.whatHappened}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '17px' }}>
                <span style={{ fontSize: '11px', color: '#aaa' }}>{log.tech}</span>
                <span style={{ fontSize: '11px', color: '#aaa' }}>{log.date}</span>
              </div>
            </div>
          )
        })}

        <button
          onClick={() => navigate('/logs/add')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end', background: '#185FA5', border: 'none', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer' }}>
          <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#fff' }}>Log a repair</span>
        </button>
      </div>
    </div>
  )
}
