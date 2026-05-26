import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const statusBadge = (status) => {
  if (status === 'overdue') return { label: 'Overdue', bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' }
  if (status === 'due-soon') return { label: 'Due soon', bg: '#FAEEDA', color: '#854F0B', border: '#EF9F27' }
  return { label: 'Up to date', bg: '#E1F5EE', color: '#085041', border: '#5DCAA5' }
}

function getStatus(item) {
  if (!item.next_pm_date) return 'ok'
  const today = new Date()
  const next = new Date(item.next_pm_date)
  const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 30) return 'due-soon'
  return 'ok'
}

export default function Equipment({ facility }) {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (!facility) return
    supabase
      .from('equipment')
      .select('*')
      .eq('facility_id', facility.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setEquipment(data.map(e => ({ ...e, status: getStatus(e) })))
        setLoading(false)
      })
  }, [facility])

  const filtered = equipment.filter(e => {
    if (filter === 'All') return true
    if (filter === 'Overdue') return e.status === 'overdue'
    if (filter === 'Due soon') return e.status === 'due-soon'
    if (filter === 'OK') return e.status === 'ok'
    return true
  })

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Equipment</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>{equipment.length} devices registered</div>
        </div>
        <button
          onClick={() => navigate('/equipment/add')}
          style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#185FA5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          {['All', 'Overdue', 'Due soon', 'OK'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid #eee', fontSize: '12px', background: filter === f ? '#185FA5' : '#fff', color: filter === f ? '#fff' : '#888', cursor: 'pointer' }}>
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '13px' }}>
            Loading equipment...
          </div>
        )}

        {!loading && equipment.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>No equipment yet</div>
            <div style={{ fontSize: '12px' }}>Tap + to register your first device</div>
          </div>
        )}

        {filtered.map(item => {
          const badge = statusBadge(item.status)
          return (
            <div key={item.id}
              onClick={() => navigate(`/equipment/${item.id}`)}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px', cursor: 'pointer' }}>
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
                  <div style={{ fontSize: '11px', fontWeight: '500', marginTop: '1px' }}>
                    {item.last_pm_date
                      ? new Date(item.last_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Not yet done'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>Next PM due</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', marginTop: '1px', color: item.status === 'overdue' ? '#A32D2D' : item.status === 'due-soon' ? '#854F0B' : '#0F6E56' }}>
                    {item.next_pm_date
                      ? new Date(item.next_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Not set'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
