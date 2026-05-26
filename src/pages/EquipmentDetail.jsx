import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const equipment = [
  {
    id: 1, name: 'Ventilator V-03', type: 'Respiratory support',
    location: 'ICU · Ward 4', status: 'overdue',
    lastPM: '14 Nov 2025', nextPM: '14 May 2026', interval: 'Every 6 months',
    pmInstructions: 'Check and replace expiratory filter. Inspect circuit tubing for cracks or leaks. Test alarm thresholds — low pressure, high pressure, disconnect. Calibrate flow sensor. Clean external surfaces with approved disinfectant. Document all readings.',
    history: [
      { id: 1, type: 'pm', title: 'Preventive maintenance completed', note: 'Filters replaced, calibration OK', tech: 'Abdullah M.', date: 'Nov 2025', outcome: 'ok' },
      { id: 2, type: 'repair', title: 'Breakdown repair', note: 'Expiratory filter blocked — replaced', tech: 'Abdullah M.', date: 'Aug 2025', outcome: 'repair' },
      { id: 3, type: 'pm', title: 'Preventive maintenance completed', note: 'Circuit pressure test passed', tech: 'Sharon K.', date: 'May 2025', outcome: 'ok' },
    ]
  },
  {
    id: 2, name: 'Autoclave AC-01', type: 'Sterilisation',
    location: 'Central sterilisation', status: 'due-soon',
    lastPM: '29 Nov 2025', nextPM: '29 May 2026', interval: 'Every 6 months',
    pmInstructions: 'Check door seal and gasket. Run test sterilisation cycle. Verify pressure and temperature readings. Clean chamber interior. Check safety valve. Log all readings.',
    history: [
      { id: 1, type: 'pm', title: 'Preventive maintenance completed', note: 'Door seal replaced, all readings normal', tech: 'Sharon K.', date: 'Nov 2025', outcome: 'ok' },
    ]
  },
  {
    id: 3, name: 'Patient monitor PM-07', type: 'Monitoring',
    location: 'General ward', status: 'ok',
    lastPM: '3 Apr 2026', nextPM: '3 Jul 2026', interval: 'Every 3 months',
    pmInstructions: 'Check all leads and sensors. Calibrate SpO2 sensor. Replace battery if needed. Test alarm thresholds. Clean screen and housing.',
    history: [
      { id: 1, type: 'pm', title: 'Preventive maintenance completed', note: 'Battery replaced, SpO2 calibrated', tech: 'Sharon K.', date: 'Apr 2026', outcome: 'ok' },
    ]
  },
  {
    id: 4, name: 'ECG machine EC-02', type: 'Cardiology',
    location: 'Cardiology', status: 'ok',
    lastPM: '12 May 2026', nextPM: '12 Aug 2026', interval: 'Every 3 months',
    pmInstructions: 'Check all 12 leads. Clean electrodes. Test signal quality. Calibrate if needed. Clean housing.',
    history: [
      { id: 1, type: 'pm', title: 'Preventive maintenance completed', note: 'All leads checked, calibration passed', tech: 'Abdullah M.', date: 'May 2026', outcome: 'ok' },
    ]
  },
  {
    id: 5, name: 'Ophthalmoscope OP-01', type: 'Diagnostic',
    location: 'Eye clinic', status: 'due-soon',
    lastPM: '27 May 2025', nextPM: '27 May 2026', interval: 'Annually',
    pmInstructions: 'Clean lenses. Check light source and replace bulb if needed. Test focus mechanism. Clean housing.',
    history: [
      { id: 1, type: 'pm', title: 'Preventive maintenance completed', note: 'Bulb replaced, lenses cleaned', tech: 'Abdullah M.', date: 'May 2025', outcome: 'ok' },
    ]
  },
]

const outcomeColors = {
  ok: { bg: '#E1F5EE', color: '#085041', border: '#5DCAA5', dot: '#1D9E75' },
  repair: { bg: '#FCEBEB', color: '#791F1F', border: '#F09595', dot: '#E24B4A' },
  issue: { bg: '#FAEEDA', color: '#633806', border: '#EF9F27', dot: '#EF9F27' },
}

export default function EquipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showPMComplete, setShowPMComplete] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [pmNote, setPmNote] = useState('')
  const [nextPMAdjust, setNextPMAdjust] = useState(null)

  const item = equipment.find(e => e.id === parseInt(id))
  if (!item) return <div style={{ padding: '20px' }}>Equipment not found</div>

  const statusColor = item.status === 'overdue' ? '#A32D2D' : item.status === 'due-soon' ? '#854F0B' : '#0F6E56'
  const statusBg = item.status === 'overdue' ? '#FCEBEB' : item.status === 'due-soon' ? '#FAEEDA' : '#E1F5EE'
  const statusBorder = item.status === 'overdue' ? '#F09595' : item.status === 'due-soon' ? '#EF9F27' : '#5DCAA5'
  const statusLabel = item.status === 'overdue' ? 'Overdue' : item.status === 'due-soon' ? 'Due soon' : 'Up to date'

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <button style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#666' }}>
          Edit
        </button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" fill="none" stroke="#A32D2D" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>{item.name}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{item.location}</div>
          </div>
          <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '99px', background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>
            {statusLabel}
          </span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
          {[
            { label: 'Type', value: item.type },
            { label: 'PM interval', value: item.interval },
            { label: 'Last PM done', value: item.lastPM },
            { label: 'Next PM due', value: item.nextPM, color: statusColor },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: row.color || '#1a1a1a' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0' }}>
            <span style={{ fontSize: '12px', color: '#888' }}>Type</span>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>{item.type}</span>
          </div>
        </div>

        <div style={{ background: '#E6F1FB', border: '1px solid #85B7EB', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#0C447C', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>
            </svg>
            What to do during this PM
          </div>
          <div style={{ fontSize: '12px', color: '#185FA5', lineHeight: '1.6' }}>{item.pmInstructions}</div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Service history</div>

        {item.history.map(h => {
          const c = outcomeColors[h.outcome] || outcomeColors.ok
          return (
            <div key={h.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '10px 12px', display: 'flex', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: '4px' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>{h.title}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{h.note}</div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>{h.tech}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', flexShrink: 0 }}>{h.date}</div>
            </div>
          )
        })}
      </div>

      {!showPMComplete && (
        <div style={{ position: 'sticky', bottom: '70px', background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/logs')}
            style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>
            Log repair
          </button>
          <button
            onClick={() => setShowPMComplete(true)}
            style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: '#1D9E75', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: 'pointer' }}>
            Mark PM done
          </button>
        </div>
      )}

      {showPMComplete && (
        <div style={{ margin: '0 16px 16px', border: '1px solid #eee', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500' }}>How did it go?</div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'ok', label: 'All good', color: '#0F6E56', bg: '#E1F5EE', border: '#5DCAA5' },
              { key: 'issue', label: 'Issue found', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' },
              { key: 'repair', label: 'Needs repair', color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
            ].map(o => (
              <button key={o.key}
                onClick={() => setOutcome(o.key)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: '8px', border: `1px solid ${outcome === o.key ? o.border : '#eee'}`,
                  background: outcome === o.key ? o.bg : '#fff',
                  color: outcome === o.key ? o.color : '#888',
                  fontSize: '11px', fontWeight: outcome === o.key ? '500' : '400', cursor: 'pointer'
                }}>{o.label}</button>
            ))}
          </div>

          {outcome && outcome !== 'ok' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>When should the next PM be?</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[14, 30, 60].map(d => (
                  <button key={d}
                    onClick={() => setNextPMAdjust(d)}
                    style={{
                      flex: 1, padding: '6px', borderRadius: '99px', fontSize: '11px',
                      border: `1px solid ${nextPMAdjust === d ? '#EF9F27' : '#eee'}`,
                      background: nextPMAdjust === d ? '#FAEEDA' : '#fff',
                      color: nextPMAdjust === d ? '#633806' : '#888', cursor: 'pointer'
                    }}>{d} days</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: '11px', color: '#666', fontWeight: '500', marginBottom: '5px' }}>
              Notes {outcome && outcome !== 'ok' ? <span style={{ color: '#E24B4A' }}>*</span> : <span style={{ color: '#aaa' }}>(optional)</span>}
            </div>
            <textarea
              value={pmNote}
              onChange={e => setPmNote(e.target.value)}
              placeholder="What did you find? Any observations for the next technician..."
              rows={3}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none', resize: 'none', lineHeight: '1.5' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setShowPMComplete(false); setOutcome(null); setPmNote('') }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', color: '#666', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              disabled={!outcome || (outcome !== 'ok' && !pmNote)}
              style={{
                flex: 2, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: outcome ? 'pointer' : 'not-allowed',
                background: !outcome || (outcome !== 'ok' && !pmNote) ? '#ccc' : outcome === 'ok' ? '#1D9E75' : outcome === 'issue' ? '#854F0B' : '#A32D2D'
              }}>
              {outcome === 'ok' ? 'Confirm & save' : outcome === 'issue' ? 'Save & schedule check' : outcome === 'repair' ? 'Save & log repair' : 'Confirm & save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
