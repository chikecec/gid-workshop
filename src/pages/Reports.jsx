import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
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

const equipmentTypes = [
  'Respiratory support', 'Monitoring', 'Sterilisation', 'Cardiology',
  'Diagnostic', 'Laboratory', 'Surgical', 'Imaging', 'Other',
]

export default function Reports({ facility }) {
  const [logs, setLogs] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [savedReports, setSavedReports] = useState([])
  const [savedReportsLoading, setSavedReportsLoading] = useState(true)
  const [loadingReportId, setLoadingReportId] = useState(null)
  const [activeReportId, setActiveReportId] = useState(null)
  const [filter, setFilter] = useState({
    rangeType: 'this-week',
    startDate: getWeekRange(0).start,
    endDate: getWeekRange(0).end,
    technicianId: 'all',
  })
  const [reportFilters, setReportFilters] = useState({
    deviceSearch: '',
    serviceTypes: [],
    statuses: [],
    billingTypes: [],
    equipmentTypes: [],
  })
  const [pendingReportFilters, setPendingReportFilters] = useState({
    deviceSearch: '',
    serviceTypes: [],
    statuses: [],
    billingTypes: [],
    equipmentTypes: [],
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
      loadSavedReports()
    }
    load()
  }, [facility])

  const loadSavedReports = async () => {
    setSavedReportsLoading(true)
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('facility_id', facility.id)
      .order('created_at', { ascending: false })
    if (data) setSavedReports(data)
    setSavedReportsLoading(false)
  }

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
    setActiveReportId(null)
  }

  const generateReport = async (saveToHistory = true) => {
    if (!facility) return
    setLoading(true)
    setGenerated(false)
    setActiveReportId(null)

    let query = supabase
      .from('repair_logs')
      .select('*, equipment(name, location, room_number, next_pm_date, model_number, serial_number, type)')
      .eq('facility_id', facility.id)
      .gte('created_at', filter.startDate)
      .lte('created_at', filter.endDate + 'T23:59:59')
      .order('created_at', { ascending: true })

    if (filter.technicianId !== 'all') {
      query = query.eq('technician_id', filter.technicianId)
    }
    if (reportFilters.serviceTypes.length) {
      query = query.in('log_type', reportFilters.serviceTypes)
    }
    if (reportFilters.statuses.length) {
      query = query.in('device_status', reportFilters.statuses)
    }
    if (reportFilters.billingTypes.length) {
      query = query.in('billing_classification', reportFilters.billingTypes)
    }

    const { data } = await query
    if (data) {
      let filtered = data
      if (reportFilters.equipmentTypes.length) {
        filtered = filtered.filter(log => reportFilters.equipmentTypes.includes(log.equipment?.type))
      }
      if (reportFilters.deviceSearch.trim()) {
        const q = reportFilters.deviceSearch.toLowerCase()
        filtered = filtered.filter(log =>
          log.equipment?.name?.toLowerCase().includes(q) ||
          log.equipment?.model_number?.toLowerCase().includes(q) ||
          log.equipment?.serial_number?.toLowerCase().includes(q)
        )
      }
      setLogs(filtered)

      if (saveToHistory && filtered.length > 0) {
        const totalHours = filtered.reduce((sum, log) => {
          if (!log.time_spent) return sum
          const match = log.time_spent.match(/[\d.]+/)
          return sum + (match ? parseFloat(match[0]) : 0)
        }, 0)

        const techName = filter.technicianId === 'all'
          ? 'All Technicians'
          : members.find(m => m.profiles?.id === filter.technicianId)?.profiles?.full_name || 'Technician'

        const { data: savedReport } = await supabase
          .from('reports')
          .insert({
            facility_id: facility.id,
            created_by: currentUser.id,
            date_from: filter.startDate,
            date_to: filter.endDate,
            technician_id: filter.technicianId,
            technician_name: techName,
            filter_service_types: reportFilters.serviceTypes,
            filter_statuses: reportFilters.statuses,
            filter_billing_types: reportFilters.billingTypes,
            filter_equipment_types: reportFilters.equipmentTypes,
            device_search: reportFilters.deviceSearch || null,
            log_ids: filtered.map(l => l.id),
            log_count: filtered.length,
            total_hours: totalHours,
          })
          .select()
          .single()

        if (savedReport) {
          setActiveReportId(savedReport.id)
          loadSavedReports()
        }
      }
    }
    setLoading(false)
    setGenerated(true)
  }

  const loadSavedReport = async (report) => {
    setLoadingReportId(report.id)
    setGenerated(false)

    setFilter({
      rangeType: 'custom',
      startDate: report.date_from,
      endDate: report.date_to,
      technicianId: report.technician_id,
    })
    setReportFilters({
      deviceSearch: report.device_search || '',
      serviceTypes: report.filter_service_types || [],
      statuses: report.filter_statuses || [],
      billingTypes: report.filter_billing_types || [],
      equipmentTypes: report.filter_equipment_types || [],
    })

    const { data } = await supabase
      .from('repair_logs')
      .select('*, equipment(name, location, room_number, next_pm_date, model_number, serial_number, type)')
      .in('id', report.log_ids)
      .order('created_at', { ascending: true })

    if (data) setLogs(data)
    setActiveReportId(report.id)
    setLoadingReportId(null)
    setGenerated(true)
  }

  const deleteReport = async (reportId, e) => {
    e.stopPropagation()
    const confirmed = window.confirm('Delete this saved report?')
    if (!confirmed) return
    await supabase.from('reports').delete().eq('id', reportId)
    if (activeReportId === reportId) {
      setGenerated(false)
      setActiveReportId(null)
      setLogs([])
    }
    loadSavedReports()
  }

  const handlePrint = () => window.print()

  const totalHours = logs.reduce((sum, log) => {
    if (!log.time_spent) return sum
    const match = log.time_spent.match(/[\d.]+/)
    return sum + (match ? parseFloat(match[0]) : 0)
  }, 0)

  const reportTitle = filter.technicianId === 'all'
    ? 'All Technicians'
    : members.find(m => m.profiles?.id === filter.technicianId)?.profiles?.full_name || 'Technician'

  const dateRangeLabel = `${new Date(filter.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(filter.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const activeFilterCount =
    (reportFilters.deviceSearch ? 1 : 0) +
    reportFilters.serviceTypes.length +
    reportFilters.statuses.length +
    reportFilters.billingTypes.length +
    reportFilters.equipmentTypes.length

  const togglePending = (key, value) => {
    setPendingReportFilters(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value]
    }))
  }

  const applyReportFilters = () => {
    setReportFilters({ ...pendingReportFilters })
    setShowFilterPanel(false)
    setGenerated(false)
    setActiveReportId(null)
  }

  const clearReportFilters = () => {
    const empty = { deviceSearch: '', serviceTypes: [], statuses: [], billingTypes: [], equipmentTypes: [] }
    setReportFilters(empty)
    setPendingReportFilters(empty)
    setShowFilterPanel(false)
    setGenerated(false)
    setActiveReportId(null)
  }

  const chipStyle = (active) => ({
    padding: '5px 12px', borderRadius: '99px', border: '1px solid',
    borderColor: active ? '#85B7EB' : '#eee',
    background: active ? '#E6F1FB' : '#fff',
    color: active ? '#0C447C' : '#666',
    fontSize: '12px', fontWeight: active ? '500' : '400',
    cursor: 'pointer', whiteSpace: 'nowrap',
  })

  const groupByMonth = (reports) => {
    const groups = {}
    reports.forEach(r => {
      const month = new Date(r.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      if (!groups[month]) groups[month] = []
      groups[month].push(r)
    })
    return groups
  }

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          nav { display: none !important; }
          body { background: white; margin: 0; }
          .print-area { padding: 20px !important; }
        }
      `}</style>

      <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Reports</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>Generate and download weekly reports</div>
        </div>
        <button
          onClick={() => { setPendingReportFilters({ ...reportFilters }); setShowFilterPanel(true) }}
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd', background: activeFilterCount > 0 ? '#E6F1FB' : '#fff', fontSize: '12px', color: activeFilterCount > 0 ? '#0C447C' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M7 12h10M10 18h4"/>
          </svg>
          Filter
          {activeFilterCount > 0 && (
            <span style={{ background: '#185FA5', color: '#fff', borderRadius: '99px', fontSize: '10px', padding: '1px 6px', fontWeight: '600' }}>{activeFilterCount}</span>
          )}
        </button>
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
              <button key={r.key} onClick={() => handleRangeType(r.key)}
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
                <input type="date" value={filter.startDate}
                  onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>To</div>
                <input type="date" value={filter.endDate}
                  onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {filter.rangeType !== 'custom' && (
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{dateRangeLabel}</div>
          )}
        </div>

        {/* Technician filter */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>Technician</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {[
              { key: 'all', label: 'All technicians' },
              { key: currentUser?.id, label: 'My work only' },
            ].map(o => (
              <button key={o.key} onClick={() => setFilter(f => ({ ...f, technicianId: o.key }))}
                style={{
                  flex: 1, padding: '7px 14px', borderRadius: '8px', border: '1px solid',
                  borderColor: filter.technicianId === o.key ? '#85B7EB' : '#eee',
                  background: filter.technicianId === o.key ? '#E6F1FB' : '#fff',
                  color: filter.technicianId === o.key ? '#0C447C' : '#888',
                  fontSize: '12px', fontWeight: filter.technicianId === o.key ? '500' : '400',
                  cursor: 'pointer'
                }}>{o.label}</button>
            ))}
          </div>
          {members.length > 2 && (
            <select value={filter.technicianId}
              onChange={e => setFilter(f => ({ ...f, technicianId: e.target.value }))}
              style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: '#fff', outline: 'none' }}>
              <option value="all">All technicians</option>
              {members.map(m => (
                <option key={m.profiles?.id} value={m.profiles?.id}>{m.profiles?.full_name || m.profiles?.email}</option>
              ))}
            </select>
          )}
        </div>

        {activeFilterCount > 0 && (
          <div style={{ background: '#E6F1FB', border: '1px solid #85B7EB', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#0C447C' }}>
            {activeFilterCount} report filter{activeFilterCount > 1 ? 's' : ''} active — only matching jobs will appear in the report
          </div>
        )}

        <button onClick={() => generateReport(true)} disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: loading ? '#ccc' : '#185FA5', fontSize: '14px', fontWeight: '500', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Generating...' : 'Generate Report'}
        </button>

        {generated && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#aaa', fontSize: '13px' }}>
            No logs found for this period and filters
          </div>
        )}

        {generated && logs.length > 0 && (
          <button onClick={handlePrint}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #185FA5', background: '#fff', fontSize: '14px', fontWeight: '500', color: '#185FA5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download / Print Report
          </button>
        )}

        {/* Saved reports */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Saved reports
          </div>

          {savedReportsLoading && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#aaa', fontSize: '12px' }}>Loading...</div>
          )}

          {!savedReportsLoading && savedReports.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#aaa', fontSize: '12px' }}>
              No saved reports yet — generate your first report above
            </div>
          )}

          {!savedReportsLoading && Object.entries(groupByMonth(savedReports)).map(([month, monthReports]) => (
            <div key={month} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#bbb', marginBottom: '6px' }}>{month}</div>
              {monthReports.map(report => (
                <div key={report.id}
                  onClick={() => loadSavedReport(report)}
                  style={{
                    background: activeReportId === report.id ? '#E6F1FB' : '#fff',
                    border: `1px solid ${activeReportId === report.id ? '#85B7EB' : '#eee'}`,
                    borderRadius: '10px', padding: '10px 12px', marginBottom: '6px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: activeReportId === report.id ? '#0C447C' : '#333' }}>
                      {new Date(report.date_from + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(report.date_to + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      {report.technician_name} · {report.log_count} job{report.log_count !== 1 ? 's' : ''} · {report.total_hours?.toFixed(1)}h
                    </div>
                    <div style={{ fontSize: '10px', color: '#bbb', marginTop: '1px' }}>
                      Generated {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {loadingReportId === report.id ? (
                    <div style={{ fontSize: '11px', color: '#888' }}>Loading...</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeReportId === report.id && (
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: '#185FA5', color: '#fff' }}>Viewing</span>
                      )}
                      <button onClick={(e) => deleteReport(report.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F09595', padding: '2px' }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Printable report */}
      {generated && logs.length > 0 && (
        <div className="print-area" style={{ padding: '16px', paddingBottom: '100px' }}>

          <div style={{ borderBottom: '2px solid #185FA5', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#185FA5' }}>GID Workshop</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginTop: '2px' }}>Weekly Service Report</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '8px' }}>
              {[
                { label: 'Facility', value: facility?.name },
                { label: 'Location', value: facility?.location || '—' },
                { label: 'Period', value: dateRangeLabel },
                { label: 'Technician', value: reportTitle },
                { label: 'Generated', value: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                { label: 'Total jobs', value: logs.length },
              ].map(row => (
                <div key={row.label} style={{ fontSize: '12px' }}>
                  <span style={{ color: '#888' }}>{row.label}: </span>
                  <span style={{ fontWeight: '500' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Single unified summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            {[
              { label: 'Total jobs', value: logs.length, color: '#185FA5', bg: '#E6F1FB' },
              { label: 'Total hours', value: `${totalHours.toFixed(1)}h`, color: '#085041', bg: '#E1F5EE' },
              { label: 'Successful', value: logs.filter(l => l.device_status === 'successful').length, color: '#085041', bg: '#E1F5EE' },
              { label: 'Pending', value: logs.filter(l => l.device_status !== 'successful' && l.device_status !== 'decommissioned').length, color: '#854F0B', bg: '#FAEEDA' },
              { label: 'Decommissioned', value: logs.filter(l => l.device_status === 'decommissioned').length, color: '#444', bg: '#f5f5f5' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: s.color, marginTop: '2px', opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Job details ({logs.length} entries)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log, index) => (
              <div key={log.id} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden', pageBreakInside: 'avoid' }}>

                <div style={{ background: '#f5f5f5', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #ddd' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>
                      {index + 1}. {log.equipment?.name || 'Unknown device'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {log.equipment?.location}{log.equipment?.room_number ? ` · Room ${log.equipment.room_number}` : ''}
                    </div>
                    {(log.equipment?.model_number || log.equipment?.serial_number) && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                        {log.equipment?.model_number && (
                          <div style={{ fontSize: '11px', color: '#888' }}>Model: <span style={{ fontWeight: '500', color: '#333' }}>{log.equipment.model_number}</span></div>
                        )}
                        {log.equipment?.serial_number && (
                          <div style={{ fontSize: '11px', color: '#888' }}>S/N: <span style={{ fontWeight: '500', color: '#333' }}>{log.equipment.serial_number}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>
                      {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{log.technician_name}</div>
                  </div>
                </div>

                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[
                      { label: 'Service type', value: serviceLabels[log.log_type] || log.log_type || '—' },
                      { label: 'Status', value: statusLabels[log.device_status] || log.device_status || '—' },
                      { label: 'Time spent (excl. travel)', value: log.time_spent || '—' },
                      { label: 'Billing / Warranty', value: billingLabels[log.billing_classification] || '—' },
                      { label: 'LPO / Invoice No.', value: log.lpo_number || '—' },
                      { label: 'Client', value: facility?.name || '—' },
                      { label: 'Engineer', value: log.technician_name || '—' },
                      log.equipment?.next_pm_date && { label: 'Next PM due', value: new Date(log.equipment.next_pm_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                    ].filter(Boolean).map(row => (
                      <div key={row.label} style={{ fontSize: '11px', padding: '5px 8px', background: '#fafafa', borderRadius: '6px' }}>
                        <div style={{ color: '#888', marginBottom: '1px' }}>{row.label}</div>
                        <div style={{ fontWeight: '500', color: '#333' }}>{row.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Multiple issues in report */}
                  {log.issues && log.issues.length > 1 ? (
                    <div>
                      <div style={{ fontSize: '11px', color: '#888', fontWeight: '500', marginBottom: '6px' }}>Issues addressed</div>
                      {log.issues.map((issue, i) => (
                        <div key={i} style={{ background: '#fafafa', borderRadius: '6px', padding: '8px', marginBottom: '4px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            Issue {i + 1} — {serviceLabels[issue.log_type] || issue.log_type}
                            {issue.billing_classification && <span style={{ fontWeight: '400', color: '#888' }}> · {billingLabels[issue.billing_classification]}</span>}
                          </div>
                          {issue.what_happened && <div style={{ fontSize: '11px', color: '#333', marginBottom: '2px' }}><span style={{ color: '#888' }}>Found: </span>{issue.what_happened}</div>}
                          {issue.root_cause && <div style={{ fontSize: '11px', color: '#333', marginBottom: '2px' }}><span style={{ color: '#888' }}>Cause: </span>{issue.root_cause}</div>}
                          {issue.what_was_done && <div style={{ fontSize: '11px', color: '#333', marginBottom: '2px' }}><span style={{ color: '#888' }}>Done: </span>{issue.what_was_done}</div>}
                          {issue.parts_list && issue.parts_list.filter(p => p.name).length > 0 && (
                            <div style={{ fontSize: '11px', color: '#333' }}>
                              <span style={{ color: '#888' }}>Parts: </span>
                              {issue.parts_list.filter(p => p.name).map((p, pi) => (
                                <span key={pi}>{p.quantity ? `${p.quantity}x ` : ''}{p.name}{p.description ? ` (${p.description})` : ''}{pi < issue.parts_list.filter(p => p.name).length - 1 ? ', ' : ''}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {log.what_happened && (
                        <div style={{ fontSize: '11px' }}>
                          <div style={{ color: '#888', marginBottom: '2px', fontWeight: '500' }}>What happened / Task</div>
                          <div style={{ color: '#333', lineHeight: '1.5', padding: '6px 8px', background: '#fafafa', borderRadius: '6px' }}>{log.what_happened}</div>
                        </div>
                      )}
                      {log.root_cause && (
                        <div style={{ fontSize: '11px' }}>
                          <div style={{ color: '#888', marginBottom: '2px', fontWeight: '500' }}>Root cause</div>
                          <div style={{ color: '#333', lineHeight: '1.5', padding: '6px 8px', background: '#fafafa', borderRadius: '6px' }}>{log.root_cause}</div>
                        </div>
                      )}
                      {log.what_was_done && (
                        <div style={{ fontSize: '11px' }}>
                          <div style={{ color: '#888', marginBottom: '2px', fontWeight: '500' }}>What was done</div>
                          <div style={{ color: '#333', lineHeight: '1.5', padding: '6px 8px', background: '#fafafa', borderRadius: '6px' }}>{log.what_was_done}</div>
                        </div>
                      )}
                      {log.parts_list && log.parts_list.filter(p => p.name).length > 0 && (
                        <div style={{ fontSize: '11px' }}>
                          <div style={{ color: '#888', marginBottom: '4px', fontWeight: '500' }}>Parts used</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {log.parts_list.filter(p => p.name).map((p, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#fafafa', borderRadius: '6px' }}>
                                <span>{p.name}{p.description ? ` — ${p.description}` : ''}</span>
                                {p.quantity && <span style={{ fontWeight: '500', color: '#185FA5' }}>qty: {p.quantity}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {log.follow_up_note && (
                    <div style={{ fontSize: '11px' }}>
                      <div style={{ color: '#888', marginBottom: '2px', fontWeight: '500' }}>Engineer comment</div>
                      <div style={{ color: '#333', lineHeight: '1.5', padding: '6px 8px', background: '#FAEEDA', borderRadius: '6px', border: '1px solid #EF9F27' }}>{log.follow_up_note}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#aaa' }}>
            <span>Generated by GID Workshop · gid-workshop.vercel.app</span>
            <span>{new Date().toLocaleString('en-GB')}</span>
          </div>
        </div>
      )}

      {/* Filter panel */}
      {showFilterPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div onClick={() => setShowFilterPanel(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px 16px', paddingBottom: '40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Filter report</div>
              <button onClick={() => setShowFilterPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Device</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f5', borderRadius: '8px', padding: '8px 12px' }}>
                <svg width="14" height="14" fill="none" stroke="#aaa" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input value={pendingReportFilters.deviceSearch}
                  onChange={e => setPendingReportFilters(f => ({ ...f, deviceSearch: e.target.value }))}
                  placeholder="Search by name, model or serial number..."
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '12px', outline: 'none', color: '#333' }}
                />
                {pendingReportFilters.deviceSearch && (
                  <button onClick={() => setPendingReportFilters(f => ({ ...f, deviceSearch: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '0' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Equipment type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {equipmentTypes.map(t => (
                  <button key={t} onClick={() => togglePending('equipmentTypes', t)} style={chipStyle(pendingReportFilters.equipmentTypes.includes(t))}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Service type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(serviceLabels).map(([key, label]) => (
                  <button key={key} onClick={() => togglePending('serviceTypes', key)} style={chipStyle(pendingReportFilters.serviceTypes.includes(key))}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <button key={key} onClick={() => togglePending('statuses', key)} style={chipStyle(pendingReportFilters.statuses.includes(key))}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Billing classification</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(billingLabels).map(([key, label]) => (
                  <button key={key} onClick={() => togglePending('billingTypes', key)} style={chipStyle(pendingReportFilters.billingTypes.includes(key))}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={clearReportFilters} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>Clear all</button>
              <button onClick={applyReportFilters} style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: '#185FA5', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: 'pointer' }}>Apply filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}