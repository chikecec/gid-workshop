import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

export default function EquipmentDetail({ facility }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPMComplete, setShowPMComplete] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [pmNote, setPmNote] = useState('')
  const [nextPMAdjust, setNextPMAdjust] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('equipment')
      .select('*, profiles(full_name, email)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setItem({ ...data, status: getStatus(data) })
        setLoading(false)
      })

    supabase
      .from('repair_logs')
      .select('*')
      .eq('equipment_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setLogs(data)
      })
  }, [id])

  const handleMarkPMDone = async () => {
    if (!outcome) return
    setSaving(true)

    const today = new Date()
    let nextPMDate = null

    if (outcome === 'ok') {
      if (item.interval_days) {
        const d = new Date()
        d.setDate(d.getDate() + item.interval_days)
        nextPMDate = d.toISOString().split('T')[0]
      } else if (item.specific_date) {
        const d = new Date(item.specific_date)
        d.setFullYear(d.getFullYear() + 1)
        nextPMDate = d.toISOString().split('T')[0]
      }
    } else if (nextPMAdjust) {
      const d = new Date()
      d.setDate(d.getDate() + nextPMAdjust)
      nextPMDate = d.toISOString().split('T')[0]
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await supabase.from('repair_logs').insert({
      equipment_id: item.id,
      facility_id: item.facility_id,
      log_type: 'pm',
      what_happened: 'Preventive maintenance completed',
      what_was_done: pmNote || 'PM completed',
      device_status: outcome === 'repair' ? 'out-of-service' : outcome === 'issue' ? 'needs-followup' : 'working',
      outcome: outcome,
      follow_up_note: pmNote,
      next_pm_days: nextPMAdjust,
      technician_id: user.id,
      technician_name: profile?.full_name || user.email,
    })

    await supabase.from('equipment').update({
      last_pm_date: today.toISOString().split('T')[0],
      next_pm_date: nextPMDate,
      status: getStatus({ next_pm_date: nextPMDate }),
    }).eq('id', item.id)

    setItem(prev => ({
      ...prev,
      last_pm_date: today.toISOString().split('T')[0],
      next_pm_date: nextPMDate,
      status: getStatus({ next_pm_date: nextPMDate })
    }))

    const { data: updatedLogs } = await supabase
      .from('repair_logs')
      .select('*')
      .eq('equipment_id', id)
      .order('created_at', { ascending: false })
    if (updatedLogs) setLogs(updatedLogs)

    setShowPMComplete(false)
    setOutcome(null)
    setPmNote('')
    setNextPMAdjust(null)
    setSaving(false)
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
      Loading...
    </div>
  )

  if (!item) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
      Equipment not found
    </div>
  )

  const statusColor = item.status === 'overdue' ? '#A32D2D' : item.status === 'due-soon' ? '#854F0B' : '#0F6E56'
  const statusBg = item.status === 'overdue' ? '#FCEBEB' : item.status === 'due-soon' ? '#FAEEDA' : '#E1F5EE'
  const statusBorder = item.status === 'overdue' ? '#F09595' : item.status === 'due-soon' ? '#EF9F27' : '#5DCAA5'
  const statusLabel = item.status === 'overdue' ? 'Overdue' : item.status === 'due-soon' ? 'Due soon' : 'Up to date'

  const outcomeColors = {
    ok: '#1D9E75',
    issue: '#854F0B',
    repair: '#A32D2D',
  }

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <button
          onClick={() => navigate(`/equipment/${id}/edit`)}
          style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#666' }}>
          Edit
        </button>
      </div>

      <div style={{ padding: '14px 16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" fill="none" stroke="#185FA5" strokeWidth="1.8" viewBox="0 0 24 24">
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
            { label: 'PM interval', value: item.interval_days ? `Every ${item.interval_days} days` : 'Specific date' },
            { label: 'Last PM done', value: item.last_pm_date ? new Date(item.last_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not yet done' },
            { label: 'Next PM due', value: item.next_pm_date ? new Date(item.next_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set', color: statusColor },
            { label: 'Added by', value: item.profiles?.full_name || item.profiles?.email || 'Unknown' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: row.color || '#1a1a1a' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#E6F1FB', border: '1px solid #85B7EB', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#0C447C', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8"/>
            </svg>
            What to do during this PM
          </div>
          <div style={{ fontSize: '12px', color: '#185FA5', lineHeight: '1.6' }}>{item.pm_instructions}</div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Service history
        </div>

        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px' }}>
            No service history yet
          </div>
        )}

        {logs.map(log => {
          const dotColor = log.outcome === 'ok' ? '#1D9E75' : log.outcome === 'repair' ? '#E24B4A' : '#EF9F27'
          return (
            <div key={log.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '10px 12px', display: 'flex', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '4px' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>{log.what_happened}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{log.what_was_done}</div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>{log.technician_name}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', flexShrink: 0 }}>
                {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          )
        })}
      </div>

      {!showPMComplete && (
        <div style={{ position: 'fixed', bottom: '70px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate(`/logs/add`)}
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
        <div style={{ margin: '0 16px 90px', border: '1px solid #eee', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  flex: 1, padding: '8px 4px', borderRadius: '8px',
                  border: `1px solid ${outcome === o.key ? o.border : '#eee'}`,
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
            <button
              onClick={() => { setShowPMComplete(false); setOutcome(null); setPmNote('') }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', color: '#666', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleMarkPMDone}
              disabled={!outcome || (outcome !== 'ok' && !pmNote) || saving}
              style={{
                flex: 2, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '500', color: '#fff',
                cursor: outcome && (outcome === 'ok' || pmNote) ? 'pointer' : 'not-allowed',
                background: !outcome || (outcome !== 'ok' && !pmNote) || saving ? '#ccc' : outcomeColors[outcome]
              }}>
              {saving ? 'Saving...' : outcome === 'ok' ? 'Confirm & save' : outcome === 'issue' ? 'Save & schedule check' : 'Save & log repair'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}