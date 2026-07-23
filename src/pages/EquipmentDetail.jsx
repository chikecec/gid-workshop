import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

function getStatus(item) {
  if (!item.next_pm_date) return 'ok'
  const nextDate = new Date(item.next_pm_date.split('T')[0] + 'T00:00:00')
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const diffDays = Math.round((nextDate - todayDate) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 30) return 'due-soon'
  return 'ok'
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

const typeConfig = {
  pm: { label: 'Preventive Maintenance (PM)', bg: '#E1F5EE', color: '#085041', border: '#5DCAA5', dot: '#1D9E75' },
  repair: { label: 'Breakdown Repair', bg: '#FCEBEB', color: '#791F1F', border: '#F09595', dot: '#E24B4A' },
  assessment: { label: 'Assessment', bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', dot: '#185FA5' },
  installation: { label: 'Installation', bg: '#EEEDFE', color: '#3C3489', border: '#A9A4F5', dot: '#6C63FF' },
  other: { label: 'Other', bg: '#f5f5f5', color: '#444', border: '#ddd', dot: '#aaa' },
}

export default function EquipmentDetail({ facility }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    const loadEquipment = async () => {
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        let addedByName = 'Unknown'
        if (data.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', data.created_by)
            .single()
          if (profile) addedByName = profile.full_name || profile.email || 'Unknown'
        }
        setItem({ ...data, status: getStatus(data), addedByName })
      }
      setLoading(false)
    }

    const loadLogs = async () => {
      const { data } = await supabase
        .from('repair_logs')
        .select('*')
        .eq('equipment_id', id)
        .order('created_at', { ascending: false })
      if (data) setLogs(data)
    }

    loadEquipment()
    loadLogs()
  }, [id])

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>Loading...</div>
  )

  if (!item) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>Equipment not found</div>
  )

  // Log detail view
  if (selectedLog) {
    const log = logs.find(l => l.id === selectedLog)
    if (!log) return null
    const tc = typeConfig[log.log_type] || typeConfig.other
    const hasMultipleIssues = log.issues && log.issues.length > 1

    return (
      <div>
        <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>
          <div style={{ fontSize: '15px', fontWeight: '500' }}>Service log</div>
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
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>{item.name}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '1px' }}>{item.location}{item.room_number ? ` · ${item.room_number}` : ''}</div>
              {(item.model_number || item.serial_number) && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                  {item.model_number && <div style={{ fontSize: '11px', color: '#888' }}>Model: <span style={{ fontWeight: '500', color: '#444' }}>{item.model_number}</span></div>}
                  {item.serial_number && <div style={{ fontSize: '11px', color: '#888' }}>S/N: <span style={{ fontWeight: '500', color: '#444' }}>{item.serial_number}</span></div>}
                </div>
              )}
            </div>
          </div>

          {/* Date and technician */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>{log.technician_name}</span>
            <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>

          {/* Overall status */}
          {log.device_status && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Overall status</div>
              <span style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '99px',
                background: log.device_status === 'successful' ? '#E1F5EE' : log.device_status === 'decommissioned' ? '#f5f5f5' : '#FAEEDA',
                color: log.device_status === 'successful' ? '#085041' : log.device_status === 'decommissioned' ? '#444' : '#633806',
                border: `1px solid ${log.device_status === 'successful' ? '#5DCAA5' : log.device_status === 'decommissioned' ? '#ddd' : '#EF9F27'}`
              }}>
                {statusLabels[log.device_status] || log.device_status}
              </span>
            </div>
          )}

          {/* Multiple issues breakdown */}
          {hasMultipleIssues ? (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                Issues ({log.issues.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {log.issues.map((issue, i) => {
                  const itc = typeConfig[issue.log_type] || typeConfig.other
                  return (
                    <div key={i} style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#185FA5' }}>Issue {i + 1}</span>
                        <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: itc.bg, color: itc.color, border: `1px solid ${itc.border}` }}>{itc.label}</span>
                        {issue.billing_classification && (
                          <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: '#f5f5f5', color: '#666', border: '1px solid #eee' }}>
                            {billingLabels[issue.billing_classification] || issue.billing_classification}
                          </span>
                        )}
                      </div>
                      {issue.what_happened && (
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '4px' }}>
                          <span style={{ color: '#888', fontSize: '11px' }}>What happened: </span>{issue.what_happened}
                        </div>
                      )}
                      {issue.root_cause && (
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '4px' }}>
                          <span style={{ color: '#888', fontSize: '11px' }}>Root cause: </span>{issue.root_cause}
                        </div>
                      )}
                      {issue.what_was_done && (
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '4px' }}>
                          <span style={{ color: '#888', fontSize: '11px' }}>What was done: </span>{issue.what_was_done}
                        </div>
                      )}
                      {issue.parts_list && issue.parts_list.filter(p => p.name).length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {issue.parts_list.filter(p => p.name).map((p, pi) => (
                            <span key={pi} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: '#E6F1FB', color: '#0C447C', border: '1px solid #85B7EB' }}>
                              {p.quantity ? `${p.quantity}x ` : ''}{p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Single issue view */
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>{tc.label}</span>
                {log.billing_classification && (
                  <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '99px', background: '#f5f5f5', color: '#666', border: '1px solid #eee' }}>
                    {billingLabels[log.billing_classification] || log.billing_classification}
                  </span>
                )}
              </div>

              {[
                { label: 'What was found', value: log.what_happened },
                { label: 'Root cause', value: log.root_cause },
                { label: 'What was done', value: log.what_was_done },
              ].filter(s => s.value).map(section => (
                <div key={section.label}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{section.label}</div>
                  <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#333', lineHeight: '1.6' }}>{section.value}</div>
                </div>
              ))}

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
                        {part.quantity && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#E6F1FB', color: '#0C447C', border: '1px solid #85B7EB', flexShrink: 0 }}>
                            qty: {part.quantity}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Key fields — log level */}
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
            {[
              { label: 'Time spent', value: log.time_spent || '—' },
              { label: 'LPO / Invoice', value: log.lpo_number || '—' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>{row.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Engineer comment */}
          {log.follow_up_note && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Engineer comment</div>
              <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#333', lineHeight: '1.6' }}>{log.follow_up_note}</div>
            </div>
          )}

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

        </div>
      </div>
    )
  }

  const statusColor = item.status === 'overdue' ? '#A32D2D' : item.status === 'due-soon' ? '#854F0B' : '#0F6E56'
  const statusBg = item.status === 'overdue' ? '#FCEBEB' : item.status === 'due-soon' ? '#FAEEDA' : '#E1F5EE'
  const statusBorder = item.status === 'overdue' ? '#F09595' : item.status === 'due-soon' ? '#EF9F27' : '#5DCAA5'
  const statusLabel = item.status === 'overdue' ? 'Overdue' : item.status === 'due-soon' ? 'Due soon' : 'Up to date'

  const warrantyStatus = item.warranty_expiry_date
    ? new Date(item.warranty_expiry_date) < new Date() ? 'expired' : 'valid'
    : null

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <button onClick={() => navigate(`/equipment/${id}/edit`)}
          style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#666' }}>
          Edit
        </button>
      </div>

      <div style={{ padding: '14px 16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Device header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" fill="none" stroke="#185FA5" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>{item.name}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
              {item.location}{item.room_number ? ` · ${item.room_number}` : ''}
            </div>
          </div>
          <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '99px', background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>
            {statusLabel}
          </span>
        </div>

        {/* Device info */}
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '9px 0 4px' }}>Device info</div>
          {[
            { label: 'Type', value: item.type },
            item.serial_number && { label: 'Serial number', value: item.serial_number },
            item.model_number && { label: 'Model', value: item.model_number },
            item.year_of_manufacture && { label: 'Year of manufacture', value: item.year_of_manufacture },
            item.installation_date && { label: 'Installation date', value: new Date(item.installation_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
            item.warranty_expiry_date && {
              label: 'Warranty',
              value: warrantyStatus === 'expired'
                ? `Expired ${new Date(item.warranty_expiry_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : `Valid until ${new Date(item.warranty_expiry_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
              color: warrantyStatus === 'expired' ? '#A32D2D' : '#0F6E56'
            },
            { label: 'Added by', value: item.addedByName || 'Unknown' },
          ].filter(Boolean).map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: row.color || '#1a1a1a' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Maintenance */}
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '9px 0 4px' }}>Maintenance</div>
          {[
            { label: 'PM interval', value: item.interval_days ? `Every ${item.interval_days} days` : 'Specific date' },
            { label: 'Last PM done', value: item.last_pm_date ? new Date(item.last_pm_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not yet done' },
            { label: 'Next PM due', value: item.next_pm_date ? new Date(item.next_pm_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set', color: statusColor },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: row.color || '#1a1a1a' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* PM Instructions */}
        {item.pm_instructions && (
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
        )}

        {/* Service history */}
        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Service history
        </div>

        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px' }}>No service history yet</div>
        )}

        {logs.map(log => {
          const tc = typeConfig[log.log_type] || typeConfig.other
          const hasMultipleIssues = log.issues && log.issues.length > 1

          return (
            <div key={log.id}
              onClick={() => setSelectedLog(log.id)}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', display: 'flex', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tc.dot, flexShrink: 0, marginTop: '4px' }}/>
              <div style={{ flex: 1 }}>

                {/* What happened summary */}
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '4px' }}>
                  {hasMultipleIssues
                    ? `${log.issues.length} issues addressed`
                    : log.what_happened}
                </div>

                {/* Issue type badges */}
                {hasMultipleIssues ? (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    {log.issues.map((issue, i) => {
                      const itc = typeConfig[issue.log_type] || typeConfig.other
                      return (
                        <span key={i} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: itc.bg, color: itc.color, border: `1px solid ${itc.border}` }}>
                          {i + 1}. {itc.label}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                      {tc.label}
                    </span>
                  </div>
                )}

                {/* What was done */}
                {!hasMultipleIssues && (
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{log.what_was_done}</div>
                )}

                {/* Status and follow-up */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {log.device_status && (
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: '#f5f5f5', color: '#666', border: '1px solid #eee' }}>
                      {statusLabels[log.device_status] || log.device_status}
                    </span>
                  )}
                  {log.follow_up_reminder_note && (
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: '#FAEEDA', color: '#633806', border: '1px solid #EF9F27' }}>
                      Follow-up set
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{log.technician_name}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: '#aaa' }}>
                  {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <svg width="14" height="14" fill="none" stroke="#ccc" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          )
        })}
      </div>

      {/* Log service button */}
      <div style={{ position: 'fixed', bottom: '70px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px' }}>
        <button
          onClick={() => navigate(`/logs/add?equipment=${id}`)}
          style={{ width: '100%', padding: '13px', borderRadius: '8px', border: 'none', background: '#185FA5', fontSize: '14px', fontWeight: '500', color: '#fff', cursor: 'pointer' }}>
          Log service
        </button>
      </div>
    </div>
  )
}