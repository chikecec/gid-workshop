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

const statusLabels = {
  'successful': 'Successful',
  'still-under-repair': 'Still under repair',
  'still-ongoing': 'Still ongoing',
  'failed': 'Failed',
  'waiting-spare-part': 'Waiting for spare part',
  'rescheduled': 'Rescheduled',
  'waiting-lpo': 'Waiting for LPO',
  'waiting-management': 'Waiting for management',
  'decommissioned': 'Decommissioned',
  'working': 'Working',
  'out-of-service': 'Out of service',
}

const billingLabels = {
  'under-warranty': 'Under warranty',
  'out-of-warranty': 'Out of warranty',
  'service-contract': 'Service contract',
  'placement-machine': 'Placement machine',
}

function LogDetail({ log, onBack, navigate }) {
  const tc = typeConfig[log.log_type] || typeConfig.other

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Logs
        </button>
      </div>

      <div style={{ padding: '14px 16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Device header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" fill="none" stroke="#185FA5" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>{log.equipment?.name || 'Unknown device'}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '1px' }}>{log.equipment?.location}</div>
            {(log.equipment?.model_number || log.equipment?.serial_number) && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                {log.equipment?.model_number && (
                  <div style={{ fontSize: '11px', color: '#888' }}>Model: <span style={{ fontWeight: '500', color: '#444' }}>{log.equipment.model_number}</span></div>
                )}
                {log.equipment?.serial_number && (
                  <div style={{ fontSize: '11px', color: '#888' }}>S/N: <span style={{ fontWeight: '500', color: '#444' }}>{log.equipment.serial_number}</span></div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Service type and date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>{tc.label}</span>
          <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>

        {/* Key fields */}
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
          {[
            { label: 'Technician', value: log.technician_name || '—' },
            { label: 'Status', value: statusLabels[log.device_status] || log.device_status || '—' },
            { label: 'Time spent', value: log.time_spent || (log.labour_hours ? `${log.labour_hours} hrs` : '—') },
            { label: 'Billing', value: billingLabels[log.billing_classification] || '—' },
            { label: 'LPO / Invoice', value: log.lpo_number || '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Parts used */}
        {log.parts_list && log.parts_list.filter(p => p.name).length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Parts used</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {log.parts_list.filter(p => p.name).map((part, i) => (
                <div key={i} style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>{part.name}</div>
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

        {/* Text sections */}
        {[
          { label: 'What was found', value: log.what_happened },
          { label: 'Root cause', value: log.root_cause },
          { label: 'What was done', value: log.what_was_done },
          { label: 'Engineer comment', value: log.follow_up_note },
        ].filter(s => s.value).map(section => (
          <div key={section.label}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{section.label}</div>
            <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#333', lineHeight: '1.6' }}>{section.value}</div>
          </div>
        ))}

        {/* Follow-up reminder */}
        {log.follow_up_reminder_note && (
          <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#633806', marginBottom: '3px' }}>Follow-up reminder</div>
            <div style={{ fontSize: '12px', color: '#854F0B' }}>{log.follow_up_reminder_note}</div>
            {log.follow_up_date && (
              <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
                Due: {new Date(log.follow_up_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
        )}

        {/* View device link */}
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

export default function Logs({ facility }) {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [showPanel, setShowPanel] = useState(false)
  const [filters, setFilters] = useState({
    serviceTypes: [],
    statuses: [],
    billingTypes: [],
  })
  const [pendingFilters, setPendingFilters] = useState({
    serviceTypes: [],
    statuses: [],
    billingTypes: [],
  })

  useEffect(() => {
    if (!facility) return
    supabase
      .from('repair_logs')
      .select('*, equipment(name, location, model_number, serial_number)')
      .eq('facility_id', facility.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setLogs(data)
        setLoading(false)
      })
  }, [facility])

  const togglePending = (key, value) => {
    setPendingFilters(f => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter(v => v !== value)
        : [...f[key], value]
    }))
  }

  const openPanel = () => {
    setPendingFilters({ ...filters })
    setShowPanel(true)
  }

  const applyFilters = () => {
    setFilters({ ...pendingFilters })
    setShowPanel(false)
  }

  const clearFilters = () => {
    const empty = { serviceTypes: [], statuses: [], billingTypes: [] }
    setFilters(empty)
    setPendingFilters(empty)
    setSearch('')
    setShowPanel(false)
  }

  const activeFilterCount = filters.serviceTypes.length + filters.statuses.length + filters.billingTypes.length + (search ? 1 : 0)

  const filtered = logs.filter(log => {
    if (search) {
      const q = search.toLowerCase()
      const matchesName = log.equipment?.name?.toLowerCase().includes(q)
      const matchesModel = log.equipment?.model_number?.toLowerCase().includes(q)
      const matchesSerial = log.equipment?.serial_number?.toLowerCase().includes(q)
      if (!matchesName && !matchesModel && !matchesSerial) return false
    }
    if (filters.serviceTypes.length && !filters.serviceTypes.includes(log.log_type)) return false
    if (filters.statuses.length && !filters.statuses.includes(log.device_status)) return false
    if (filters.billingTypes.length && !filters.billingTypes.includes(log.billing_classification)) return false
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

  const chipStyle = (active) => ({
    padding: '5px 12px',
    borderRadius: '99px',
    border: '1px solid',
    borderColor: active ? '#85B7EB' : '#eee',
    background: active ? '#E6F1FB' : '#fff',
    color: active ? '#0C447C' : '#666',
    fontSize: '12px',
    fontWeight: active ? '500' : '400',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  })

  if (selected) {
    const log = logs.find(l => l.id === selected)
    if (!log) return null
    return <LogDetail log={log} onBack={() => setSelected(null)} navigate={navigate} />
  }

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Logs</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>
            {filtered.length} of {logs.length} records
          </div>
        </div>
        <button
          onClick={openPanel}
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd', background: activeFilterCount > 0 ? '#E6F1FB' : '#fff', fontSize: '12px', color: activeFilterCount > 0 ? '#0C447C' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M7 12h10M10 18h4"/>
          </svg>
          Filter
          {activeFilterCount > 0 && (
            <span style={{ background: '#185FA5', color: '#fff', borderRadius: '99px', fontSize: '10px', padding: '1px 6px', fontWeight: '600' }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: '10px 16px 0', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f5', borderRadius: '8px', padding: '8px 12px' }}>
          <svg width="14" height="14" fill="none" stroke="#aaa" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by device name, model or serial number..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', color: '#333' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '0' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '100px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '13px' }}>Loading logs...</div>
        )}

        {!loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>No logs yet</div>
            <div style={{ fontSize: '12px' }}>Tap a device and tap "Log service" to record your first entry</div>
          </div>
        )}

        {!loading && logs.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>No logs match your filters</div>
            <button onClick={clearFilters}
              style={{ marginTop: '8px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', color: '#666', cursor: 'pointer' }}>
              Clear filters
            </button>
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

                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tc.dot, flexShrink: 0, marginTop: '4px' }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>{log.equipment?.name || 'Unknown device'}</div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{log.equipment?.location}</div>
                      {(log.equipment?.model_number || log.equipment?.serial_number) && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                          {log.equipment?.model_number && (
                            <div style={{ fontSize: '11px', color: '#888' }}>Model: <span style={{ fontWeight: '500', color: '#444' }}>{log.equipment.model_number}</span></div>
                          )}
                          {log.equipment?.serial_number && (
                            <div style={{ fontSize: '11px', color: '#888' }}>S/N: <span style={{ fontWeight: '500', color: '#444' }}>{log.equipment.serial_number}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, flexShrink: 0 }}>{tc.label}</span>
                  </div>

                  {/* What happened */}
                  <div style={{ fontSize: '11px', color: '#666', paddingLeft: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.what_happened}</div>

                  {/* Status and follow-up tags only */}
                  <div style={{ display: 'flex', gap: '6px', paddingLeft: '17px', flexWrap: 'wrap' }}>
                    {log.device_status && (
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: '#f5f5f5', color: '#666', border: '1px solid #eee' }}>
                        {statusLabels[log.device_status] || log.device_status}
                      </span>
                    )}
                    {log.follow_up_reminder_note && (
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: '#FAEEDA', color: '#633806', border: '1px solid #EF9F27' }}>
                        Follow-up set
                      </span>
                    )}
                  </div>

                  {/* Footer */}
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

      {/* Filter panel */}
      {showPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div onClick={() => setShowPanel(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px 16px', paddingBottom: '40px', maxHeight: '85vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Filter logs</div>
              <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Service type */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Service type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(typeConfig).map(([key, tc]) => (
                  <button key={key} onClick={() => togglePending('serviceTypes', key)} style={chipStyle(pendingFilters.serviceTypes.includes(key))}>
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <button key={key} onClick={() => togglePending('statuses', key)} style={chipStyle(pendingFilters.statuses.includes(key))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Billing */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Billing classification</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(billingLabels).map(([key, label]) => (
                  <button key={key} onClick={() => togglePending('billingTypes', key)} style={chipStyle(pendingFilters.billingTypes.includes(key))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={clearFilters}
                style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>
                Clear all
              </button>
              <button onClick={applyFilters}
                style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: '#185FA5', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: 'pointer' }}>
                Apply filters
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}