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
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
              {item.location}{item.room_number ? ` · ${item.room_number}` : ''}
            </div>
          </div>
          <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '99px', background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>
            {statusLabel}
          </span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '9px 0 4px' }}>Device info</div>
          {[
            { label: 'Type', value: item.type },
            item.serial_number && { label: 'Serial number', value: item.serial_number },
            item.model_number && { label: 'Model', value: item.model_number },
            item.year_of_manufacture && { label: 'Year of manufacture', value: item.year_of_manufacture },
            item.installation_date && { label: 'Installation date', value: new Date(item.installation_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
            item.warranty_expiry_date && {
              label: 'Warranty',
              value: warrantyStatus === 'expired'
                ? `Expired ${new Date(item.warranty_expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : `Valid until ${new Date(item.warranty_expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
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

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '4px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '9px 0 4px' }}>Maintenance</div>
          {[
            { label: 'PM interval', value: item.interval_days ? `Every ${item.interval_days} days` : 'Specific date' },
            { label: 'Last PM done', value: item.last_pm_date ? new Date(item.last_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not yet done' },
            { label: 'Next PM due', value: item.next_pm_date ? new Date(item.next_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set', color: statusColor },
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
          <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px' }}>No service history yet</div>
        )}

        {logs.map(log => {
          const dotColor = log.log_type === 'pm' ? '#1D9E75' : log.device_status === 'out-of-service' ? '#E24B4A' : '#EF9F27'
          const typeLabel = log.log_type === 'pm' ? 'PM' : log.log_type === 'repair' ? 'Repair' : log.log_type === 'inspection' ? 'Inspection' : 'Issue'
          return (
            <div key={log.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '10px 12px', display: 'flex', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '4px' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{log.what_happened}</div>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: '#f5f5f5', color: '#888', border: '1px solid #eee' }}>{typeLabel}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{log.what_was_done}</div>
                {log.parts_list && log.parts_list.length > 0 && (
                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {log.parts_list.filter(p => p.name).map((p, i) => (
                      <span key={i} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: '#E6F1FB', color: '#0C447C', border: '1px solid #85B7EB' }}>
                        {p.quantity}x {p.name}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>{log.technician_name}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', flexShrink: 0 }}>
                {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          )
        })}
      </div>

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