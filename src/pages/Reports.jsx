import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff + offset * 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
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

const serviceLabels = {
  'pm': 'Preventive Maintenance (PM)',
  'repair': 'Breakdown Repair',
  'assessment': 'Assessment',
  'installation': 'Installation',
  'other': 'Other',
}

const billingLabels = {
  'under-warranty': 'Under warranty',
  'out-of-warranty': 'Out of warranty',
  'service-contract': 'Service contract',
  'placement-machine': 'Placement machine',
}

export default function Reports({ facility }) {
  const [logs, setLogs] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [filter, setFilter] = useState({
    rangeType: 'this-week',
    startDate: getWeekRange(0).start,
    endDate: getWeekRange(0).end,
    technicianId: 'all',
  })

  useEffect(() => {
    if (!facility) return

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      const { data: memberData } = await supabase
        .from('profile_facilities')
        .select('*, profiles(id, full_name, email)')
        .eq('facility_id', facility.id)
      if (memberData) setMembers(memberData)
    }
    load()
  }, [facility])

  const handleRangeType = (type) => {
    if (type === 'this-week') {
      const range = getWeekRange(0)
      setFilter(f => ({ ...f, rangeType: type, startDate: range.start, endDate: range.end }))
    } else if (type === 'last-week') {
      const range = getWeekRange(-1)
      setFilter(f => ({ ...f, rangeType: type, startDate: range.start, endDate: range.end }))
    } else {
      setFilter(f => ({ ...f, rangeType: type }))
    }
    setGenerated(false)
  }

  const generateReport = async () => {
    if (!facility) return
    setLoading(true)
    setGenerated(false)

    let query = supabase
      .from('repair_logs')
      .select('*, equipment(name, location, room_number)')
      .eq('facility_id', facility.id)
      .gte('created_at', filter.startDate)
      .lte('created_at', filter.endDate + 'T23:59:59')
      .order('created_at', { ascending: true })

    if (filter.technicianId !== 'all') {
      query = query.eq('technician_id', filter.technicianId)
    }

    const { data } = await query
    if (data) setLogs(data)
    setLoading(false)
    setGenerated(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const totalHours = logs.reduce((sum, log) => {
    if (!log.time_spent) return sum
    const match = log.time_spent.match(/[\d.]+/)
    return sum + (match ? parseFloat(match[0]) : 0)
  }, 0)

  const statusBreakdown = logs.reduce((acc, log) => {
    const key = log.device_status || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const serviceBreakdown = logs.reduce((acc, log) => {
    const key = log.log_type || 'other'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const reportTitle = filter.technicianId === 'all'
    ? 'All Technicians'
    : members.find(m => m.profiles?.id === filter.technicianId)?.profiles?.full_name || 'Technician'

  const dateRangeLabel = `${new Date(filter.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(filter.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
          .app-container { padding-bottom: 0 !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px' }}>
        <div style={{ fontSize: '16px', fontWeight: '500' }}>Reports</div>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>Generate and download weekly reports</div>
      </div>

      <div className="no-print" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '100px' }}>

        {/* Date range */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Date range</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {[
              { key: 'this-week', label: 'This week' },
              { key: 'last-week', label: 'Last week' },
              { key: 'custom', label: 'Custom' },
            ].map(r => (
              <button key={r.key}
                onClick={() => handleRangeType(r.key)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid',
                  borderColor: filter.rangeType === r.key ? '#85B7EB' : '#eee',
                  background: filter.rangeType === r.key ? '#E6F1FB' : '#fff',
                  color: filter.rangeType === r.key ? '#0C447C' : '#888',
                  fontSize: '12px', fontWeight: filter.rangeType === r.key ? '500' : '400',
                  cursor: 'pointer'
                }}>{r.label}</button>
            ))}
          </div>

          {filter.rangeType === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>From</div>
                <input
                  type="date"
                  value={filter.startDate}
                  onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>To</div>
                <input
                  type="date"
                  value={filter.endDate}
                  onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {filter.rangeType !== 'custom' && (
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              {dateRangeLabel}
            </div>
          )}
        </div>

        {/* Technician filter */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Technician</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <button
              onClick={() => setFilter(f => ({ ...f, technicianId: 'all' }))}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid',
                borderColor: filter.technicianId === 'all' ? '#85B7EB' : '#eee',
                background: filter.technicianId === 'all' ? '#E6F1FB' : '#fff',
                color: filter.technicianId === 'all' ? '#0C447C' : '#888',
                fontSize: '12px', fontWeight: filter.technicianId === 'all' ? '500' : '400',
                cursor: 'pointer'
              }}>All technicians</button>
            <button
              onClick={() => setFilter(f => ({ ...f, technicianId: currentUser?.id || 'all' }))}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid',
                borderColor: filter.technicianId === currentUser?.id ? '#85B7EB' : '#eee',
                background: filter.technicianId === currentUser?.id ? '#E6F1FB' : '#fff',
                color: filter.technicianId === currentUser?.id ? '#0C447C' : '#888',
                fontSize: '12px', fontWeight: filter.technicianId === currentUser?.id ? '500' : '400',
                cursor: 'pointer'
              }}>My work only</button>
          </div>
          {members.length > 2 && (
            <select
              value={filter.technicianId}
              onChange={e => setFilter(f => ({ ...f, technicianId: e.target.value }))}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: '#fff', outline: 'none' }}>
              <option value="all">All technicians</option>
              {members.map(m => (
                <option key={m.profiles?.id} value={m.profiles?.id}>{m.profiles?.full_name || m.profiles?.email}</option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: loading ? '#ccc' : '#185FA5', fontSize: '14px', fontWeight: '500', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Generating...' : 'Generate Report'}
        </button>

        {generated && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#aaa', fontSize: '13px' }}>
            No logs found for this period
          </div>
        )}

        {generated && logs.length > 0 && (
          <button
            onClick={handlePrint}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #185FA5', background: '#fff', fontSize: '14px', fontWeight: '500', color: '#185FA5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download / Print Report
          </button>
        )}
      </div>

      {/* Printable report */}
      {generated && logs.length > 0 && (
        <div style={{ padding: '16px', paddingBottom: '100px' }}>

          {/* Report header */}
          <div style={{ borderBottom: '2px solid #185FA5', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#185FA5' }}>GID Workshop</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#333', marginTop: '2px' }}>Weekly Service Report</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
              <div><strong>Facility:</strong> {facility?.name}</div>
              <div><strong>Period:</strong> {dateRangeLabel}</div>
              <div><strong>Technician:</strong> {reportTitle}</div>
              <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Total jobs', value: logs.length },
              { label: 'Total hours', value: `${totalHours.toFixed(1)} hrs` },
              { label: 'Completed', value: logs.filter(l => l.device_status === 'successful').length },
            ].map(s => (
              <div key={s.label} style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#185FA5' }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Status breakdown */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Status breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(statusBreakdown).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f9f9f9', borderRadius: '6px', fontSize: '12px' }}>
                  <span>{statusLabels[status] || status}</span>
                  <span style={{ fontWeight: '500' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Service type breakdown */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Service type breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(serviceBreakdown).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f9f9f9', borderRadius: '6px', fontSize: '12px' }}>
                  <span>{serviceLabels[type] || type}</span>
                  <span style={{ fontWeight: '500' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Job details */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Job details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.map((log, index) => (
                <div key={log.id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px', pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>
                        {index + 1}. {log.equipment?.name || 'Unknown device'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
                        {log.equipment?.location}{log.equipment?.room_number ? ` · ${log.equipment.room_number}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#666' }}>{new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div style={{ fontSize: '10px', color: '#aaa', marginTop: '1px' }}>{log.technician_name}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    {[
                      { label: 'Service type', value: serviceLabels[log.log_type] || log.log_type },
                      { label: 'Status', value: statusLabels[log.device_status] || log.device_status },
                      { label: 'Time spent', value: log.time_spent || '—' },
                      { label: 'Billing', value: billingLabels[log.billing_classification] || '—' },
                      log.lpo_number && { label: 'LPO / Invoice', value: log.lpo_number },
                    ].filter(Boolean).map(row => (
                      <div key={row.label} style={{ fontSize: '11px' }}>
                        <span style={{ color: '#888' }}>{row.label}: </span>
                        <span style={{ fontWeight: '500' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {log.what_happened && (
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>What happened</div>
                      <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.5' }}>{log.what_happened}</div>
                    </div>
                  )}

                  {log.what_was_done && (
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>What was done</div>
                      <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.5' }}>{log.what_was_done}</div>
                    </div>
                  )}

                  {log.parts_list && log.parts_list.filter(p => p.name).length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>Parts used</div>
                      <div style={{ fontSize: '11px', color: '#333' }}>
                        {log.parts_list.filter(p => p.name).map((p, i) => (
                          <span key={i}>{p.quantity}x {p.name}{p.description ? ` (${p.description})` : ''}{i < log.parts_list.filter(p => p.name).length - 1 ? ', ' : ''}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.follow_up_note && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>Engineer comment</div>
                      <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.5' }}>{log.follow_up_note}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
            Generated by GID Workshop · gid-workshop.vercel.app
          </div>
        </div>
      )}
    </div>
  )
}