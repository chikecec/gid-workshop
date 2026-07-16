import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const equipmentTypes = [
  'Respiratory support', 'Monitoring', 'Sterilisation', 'Cardiology',
  'Diagnostic', 'Laboratory', 'Surgical', 'Imaging', 'Other',
]

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
  const [showPanel, setShowPanel] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ types: [], pmStatus: [], opStatus: [] })
  const [pendingFilters, setPendingFilters] = useState({ types: [], pmStatus: [], opStatus: [] })

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

  const activeFilterCount = filters.types.length + filters.pmStatus.length + filters.opStatus.length

  const togglePending = (key, value) => {
    setPendingFilters(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value]
    }))
  }

  const openPanel = () => { setPendingFilters({ ...filters }); setShowPanel(true) }
  const applyFilters = () => { setFilters({ ...pendingFilters }); setShowPanel(false) }
  const clearFilters = () => {
    const empty = { types: [], pmStatus: [], opStatus: [] }
    setFilters(empty); setPendingFilters(empty); setSearch(''); setShowPanel(false)
  }

  const filtered = equipment.filter(item => {
    if (search) {
      const q = search.toLowerCase()
      if (!item.name?.toLowerCase().includes(q) && !item.model_number?.toLowerCase().includes(q) && !item.serial_number?.toLowerCase().includes(q)) return false
    }
    if (filters.types.length && !filters.types.includes(item.type)) return false
    if (filters.pmStatus.length) {
      const match = filters.pmStatus.some(s => {
        if (s === 'overdue') return item.status === 'overdue'
        if (s === 'due-soon') return item.status === 'due-soon'
        if (s === 'ok') return item.status === 'ok'
        return false
      })
      if (!match) return false
    }
    if (filters.opStatus.length && !filters.opStatus.includes(item.operational_status || 'working')) return false
    return true
  })

  const chipStyle = (active) => ({
    padding: '5px 12px', borderRadius: '99px', border: '1px solid',
    borderColor: active ? '#85B7EB' : '#eee',
    background: active ? '#E6F1FB' : '#fff',
    color: active ? '#0C447C' : '#666',
    fontSize: '12px', fontWeight: active ? '500' : '400',
    cursor: 'pointer', whiteSpace: 'nowrap',
  })

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>Equipment</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>{filtered.length} of {equipment.length} devices</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={openPanel}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd', background: activeFilterCount > 0 ? '#E6F1FB' : '#fff', fontSize: '12px', color: activeFilterCount > 0 ? '#0C447C' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M7 12h10M10 18h4"/>
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span style={{ background: '#185FA5', color: '#fff', borderRadius: '99px', fontSize: '10px', padding: '1px 6px', fontWeight: '600' }}>{activeFilterCount}</span>
            )}
          </button>
          <button onClick={() => navigate('/equipment/add')}
            style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#185FA5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px 0', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f5', borderRadius: '8px', padding: '8px 12px' }}>
          <svg width="14" height="14" fill="none" stroke="#aaa" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, model or serial number..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', color: '#333' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '0' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '100px' }}>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '13px' }}>Loading equipment...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>No equipment found</div>
            <div style={{ fontSize: '12px' }}>{activeFilterCount > 0 || search ? 'Try adjusting your filters' : 'Tap + to register your first device'}</div>
            {(activeFilterCount > 0 || search) && (
              <button onClick={clearFilters} style={{ marginTop: '12px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', color: '#666', cursor: 'pointer' }}>Clear filters</button>
            )}
          </div>
        )}

        {filtered.map(item => {
          const badge = statusBadge(item.status)
          const pmColor = item.status === 'overdue' ? '#A32D2D' : item.status === 'due-soon' ? '#854F0B' : '#0F6E56'
          return (
            <div key={item.id} onClick={() => navigate(`/equipment/${item.id}`)}
              style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>

              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {item.type} · {item.location}{item.room_number ? ` · ${item.room_number}` : ''}
                  </div>
                  {(item.model_number || item.serial_number) && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                      {item.model_number && <div style={{ fontSize: '11px', color: '#888' }}>Model: <span style={{ fontWeight: '500', color: '#444' }}>{item.model_number}</span></div>}
                      {item.serial_number && <div style={{ fontSize: '11px', color: '#888' }}>S/N: <span style={{ fontWeight: '500', color: '#444' }}>{item.serial_number}</span></div>}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, flexShrink: 0 }}>
                  {badge.label}
                </span>
              </div>

              {/* Bottom row */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f5f5f5' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>Last PM</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#333', marginTop: '1px' }}>
                    {item.last_pm_date ? new Date(item.last_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not yet done'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>Next PM due</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: pmColor, marginTop: '1px' }}>
                    {item.next_pm_date ? new Date(item.next_pm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                  </div>
                </div>
                {item.operational_status && item.operational_status !== 'working' && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>Status</div>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: item.operational_status === 'decommissioned' ? '#444' : '#A32D2D', marginTop: '1px' }}>
                      {item.operational_status === 'out-of-service' ? 'Out of service' : 'Decommissioned'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter panel */}
      {showPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div onClick={() => setShowPanel(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px 16px', paddingBottom: '40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Filter equipment</div>
              <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Equipment type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {equipmentTypes.map(t => (
                  <button key={t} onClick={() => togglePending('types', t)} style={chipStyle(pendingFilters.types.includes(t))}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>PM status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[{ key: 'overdue', label: 'Overdue' }, { key: 'due-soon', label: 'Due soon' }, { key: 'ok', label: 'Up to date' }].map(s => (
                  <button key={s.key} onClick={() => togglePending('pmStatus', s.key)} style={chipStyle(pendingFilters.pmStatus.includes(s.key))}>{s.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Operational status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[{ key: 'working', label: 'Working' }, { key: 'out-of-service', label: 'Out of service' }, { key: 'decommissioned', label: 'Decommissioned' }].map(s => (
                  <button key={s.key} onClick={() => togglePending('opStatus', s.key)} style={chipStyle(pendingFilters.opStatus.includes(s.key))}>{s.label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={clearFilters} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '13px', fontWeight: '500', color: '#666', cursor: 'pointer' }}>Clear all</button>
              <button onClick={applyFilters} style={{ flex: 2, padding: '11px', borderRadius: '8px', border: 'none', background: '#185FA5', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: 'pointer' }}>Apply filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}