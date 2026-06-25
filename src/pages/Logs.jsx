import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const typeConfig = {
  pm: { label: 'Preventive Maintenance (PM)', bg: '#E1F5EE', color: '#085041', border: '#5DCAA5', dot: '#1D9E75' },
  repair: { label: 'Breakdown Repair', bg: '#FCEBEB', color: '#791F1F', border: '#F09595', dot: '#E24B4A' },
  assessment: { label: 'Assessment', bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', dot: '#185FA5' },
  installation: { label: 'Installation', bg: '#EEEDFE', color: '#3C3489', border: '#A9A4F5', dot: '#6C63FF' },
  other: { label: 'Other', bg: '#f5f5f5', color: '#444', border: '#ddd', dot: '#aaa' },
}

export default function Logs({ facility }) {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!facility) return
    supabase
      .from('repair_logs')
      .select('*, equipment(name, location)')
      .eq('facility_id', facility.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setLogs(data)
        setLoading(false)
      })
  }, [facility])

  const filters = ['All', 'PM', 'Repairs', 'Assessments', 'Installations', 'Other']

  const filtered = logs.filter(l => {
    if (filter === 'All') return true
    if (filter === 'PM') return l.log_type === 'pm'
    if (filter === 'Repairs') return l.log_type === 'repair'
    if (filter === 'Assessments') return l.log_type === 'assessment'
    if (filter === 'Installations') return l.log_type === 'installation'
    if (filter === 'Other') return l.log_type === 'other'
    return true
  })

  const groupByMonth = (logs) => {
    const groups = {}
    logs.forEach(log => {
      const month = new Date(log.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      if (!groups[month]) groups[month] = []
      groups[month].push(log)
    })
    return groups
  }

  const grouped = groupByMonth(filtered)

  if (selected) {
    const log = logs.find(l => l.id === selected)
    if (!log) return null
    const tc = typeConfig[log.log_type] || typeConfig.other

    return (
      <div>
        <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Logs
          </button>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" fill="none" stroke="#185FA5" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{log.equipment?.name || 'Unknown device'}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{log.equipment?.location}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>{tc.label}</span>
            <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>

          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
            {[
              { label: 'Technician', value: log.technician_name },
              { label: 'Labour time', value: log.labour_hours ? `${log.labour_hours} hrs` : '—' },
              { label: 'Device status', value: log.device_status },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>{row.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '500' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {log.parts_list && log.parts_list.filter(p => p.name).length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Parts used</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {log.parts_list.filter(p => p.name).map((part, i) => (
                  <div key={i} style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{part.name}</div>
                      {part.description && <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{part.description}</div>}
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#E6F1FB', color: '#0C447C', border: '1px solid #85B7EB', flexShrink: 0 }}>
                      qty: {part.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {[
            { label: 'What was found', value: log.what_happened },
            { label: 'Root cause', value: log.root_cause },
            { label: 'What was done', value: log.what_was_done },
            log.follow_up_note && { label: 'Notes', value: log.follow_up_note },
          ].filter(Boolean).filter(s => s.value).map(section => (
            <div key={section.label}>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{section.label}</div>
              <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#333', lineHeight: '1.6' }}>{section.value}</div>
            </div>
          ))}

          <div
            onClick={() => navigate(`/equipment/${log.equipment_id}`)}
            style={{ background: '#E6F1FB', border: '1px solid #85B7EB', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <svg width="15" height="15" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            <span style={{ fontSize: '12px', color: '#0C447C' }}>View full history for {log.equipment?.name} →</span>
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

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '13px' }}>Loading logs...</div>
        )}

        {!loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>No logs yet</div>
            <div style={{ fontSize: '12px' }}>Tap a device and tap "Log service" to record your first entry</div>
          </div>
        )}

        {Object.entries(grouped).map(([month, monthLogs]) => (
          <div key={month}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{month}</div>
            {monthLogs.map(log => {
              const tc = typeConfig[log.log_type] || typeConfig.other
              return (
                <div key={log.id} onClick={() => setSelected(log.id)}
                  style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tc.dot, flexShrink: 0, marginTop: '4px' }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{log.equipment?.name || 'Unknown device'}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{log.equipment?.location}</div>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, flexShrink: 0 }}>{tc.label}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', paddingLeft: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.what_happened}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '17px' }}>
                    <span style={{ fontSize: '11px', color: '#aaa' }}>{log.technician_name}</span>
                    <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}