import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const equipmentTypes = [
  'Respiratory support', 'Monitoring', 'Sterilisation', 'Cardiology',
  'Diagnostic', 'Laboratory', 'Surgical', 'Imaging', 'Other',
]

function getStatus(item) {
  if (!item.next_pm_date) return 'ok'
  const todayStr = new Date().toLocaleDateString('en-CA')
  const nextStr = item.next_pm_date.split('T')[0]
  const diffDays = Math.ceil((new Date(nextStr) - new Date(todayStr)) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 30) return 'due-soon'
  return 'ok'
}

function DeviceCard({ item, onClick, accentColor, accentBg, accentBorder, badge, secondaryLine, actionLabel }) {
  return (
    <div onClick={onClick} style={{ background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: accentColor }}>{item.name}</div>
          <div style={{ fontSize: '11px', color: accentColor, opacity: 0.8, marginTop: '2px' }}>
            {item.location}{item.room_number ? ` · ${item.room_number}` : ''}
          </div>
          {(item.model_number || item.serial_number) && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
              {item.model_number && (
                <div style={{ fontSize: '11px', color: accentColor, opacity: 0.7 }}>
                  Model: <span style={{ fontWeight: '500' }}>{item.model_number}</span>
                </div>
              )}
              {item.serial_number && (
                <div style={{ fontSize: '11px', color: accentColor, opacity: 0.7 }}>
                  S/N: <span style={{ fontWeight: '500' }}>{item.serial_number}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {badge && (
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#fff', color: accentColor, border: `1px solid ${accentBorder}`, flexShrink: 0 }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${accentBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', color: accentColor, opacity: 0.8 }}>{secondaryLine}</div>
        <div style={{ fontSize: '11px', fontWeight: '500', color: accentColor }}>{actionLabel} →</div>
      </div>
    </div>
  )
}

export default function Home({ facility, onSwitchFacility, onSignOut }) {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ itemTypes: [], equipmentTypes: [] })
  const [pendingFilters, setPendingFilters] = useState({ itemTypes: [], equipmentTypes: [] })

  useEffect(() => {
    if (!facility) return
    const loadData = async () => {
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('*')
        .eq('facility_id', facility.id)
        .order('next_pm_date', { ascending: true })
      if (equipmentData) setEquipment(equipmentData.map(e => ({ ...e, status: getStatus(e) })))

      const today = new Date().toLocaleDateString('en-CA')
      const { data: reminderData } = await supabase
        .from('follow_up_reminders')
        .select('*, equipment(name, location, model_number, serial_number, type)')
        .eq('facility_id', facility.id)
        .eq('status', 'pending')
        .lte('reminder_date', today)
        .order('reminder_date', { ascending: true })
      if (reminderData) setReminders(reminderData)
      setLoading(false)
    }
    loadData()
  }, [facility])

  const togglePending = (key, value) => {
    setPendingFilters(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value]
    }))
  }

  const openPanel = () => { setPendingFilters({ ...filters }); setShowPanel(true) }
  const applyFilters = () => { setFilters({ ...pendingFilters }); setShowPanel(false) }
  const clearFilters = () => {
    const empty = { itemTypes: [], equipmentTypes: [] }
    setFilters(empty); setPendingFilters(empty); setSearch(''); setShowPanel(false)
  }

  const activeFilterCount = filters.itemTypes.length + filters.equipmentTypes.length + (search ? 1 : 0)

  const matchesSearch = (name, model, serial) => {
    if (!search) return true
    const q = search.toLowerCase()
    return name?.toLowerCase().includes(q) || model?.toLowerCase().includes(q) || serial?.toLowerCase().includes(q)
  }

  const matchesType = (type) => !filters.equipmentTypes.length || filters.equipmentTypes.includes(type)
  const showOverdue = !filters.itemTypes.length || filters.itemTypes.includes('overdue')
  const showFollowUps = !filters.itemTypes.length || filters.itemTypes.includes('follow-up')
  const showDueSoon = !filters.itemTypes.length || filters.itemTypes.includes('due-soon')

  const filteredOverdue = equipment.filter(e => e.status === 'overdue' && matchesSearch(e.name, e.model_number, e.serial_number) && matchesType(e.type))
  const filteredReminders = reminders.filter(r => matchesSearch(r.equipment?.name, r.equipment?.model_number, r.equipment?.serial_number) && matchesType(r.equipment?.type))
  const filteredDueSoon = equipment.filter(e => e.status === 'due-soon' && matchesSearch(e.name, e.model_number, e.serial_number) && matchesType(e.type))

  const upToDate = equipment.filter(e => e.status === 'ok').length
  const hasAnything = filteredOverdue.length > 0 || filteredReminders.length > 0 || filteredDueSoon.length > 0

  const chipStyle = (active) => ({
    padding: '5px 12px', borderRadius: '99px', border: '1px solid',
    borderColor: active ? '#85B7EB' : '#eee',
    background: active ? '#E6F1FB' : '#fff',
    color: active ? '#0C447C' : '#666',
    fontSize: '12px', fontWeight: active ? '500' : '400',
    cursor: 'pointer', whiteSpace: 'nowrap',
  })

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const daysDiff = (dateStr) => {
    const todayStr = new Date().toLocaleDateString('en-CA')
    return Math.ceil((new Date(dateStr.split('T')[0]) - new Date(todayStr)) / (1000 * 60 * 60 * 24))
  }

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={onSwitchFacility} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {facility?.name || 'Select facility'}
            <svg width="14" height="14" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>Tap to switch facility</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          <button onClick={() => navigate('/team')} style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#888' }}>Team</button>
          <button onClick={onSignOut} style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#888' }}>Sign out</button>
          <button onClick={() => navigate('/equipment/add')} style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#185FA5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Total', value: equipment.length, color: '#444', bg: '#f5f5f5', border: '#ddd' },
            { label: 'Overdue', value: equipment.filter(e => e.status === 'overdue').length, color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
            { label: 'Due soon', value: equipment.filter(e => e.status === 'due-soon').length, color: '#7A5C00', bg: '#FEF9EC', border: '#F5C842' },
            { label: 'OK', value: upToDate, color: '#085041', bg: '#E1F5EE', border: '#5DCAA5' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: '8px', padding: '10px 8px', textAlign: 'center', border: `1px solid ${stat.border}` }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: stat.color, marginTop: '2px', opacity: 0.8 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '30px', color: '#aaa', fontSize: '13px' }}>Loading...</div>}

        {!loading && !hasAnything && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1D9E75', marginBottom: '6px' }}>
              {activeFilterCount > 0 ? 'No items match your filters' : 'All clear'}
            </div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>
              {activeFilterCount > 0 ? 'Try adjusting your filters' : 'No overdue PMs, no pending follow-ups. Everything is on schedule.'}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={{ marginTop: '12px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', color: '#666', cursor: 'pointer' }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Overdue PMs */}
        {!loading && showOverdue && filteredOverdue.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E24B4A', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#A32D2D', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Overdue PM — {filteredOverdue.length} device{filteredOverdue.length > 1 ? 's' : ''}
              </div>
            </div>
            {filteredOverdue.map(item => (
              <DeviceCard key={item.id}
                item={item}
                onClick={() => navigate(`/equipment/${item.id}`)}
                accentColor="#791F1F"
                accentBg="#FCEBEB"
                accentBorder="#F09595"
                badge={`${Math.abs(daysDiff(item.next_pm_date))} days overdue`}
                secondaryLine={`Next PM was ${formatDate(item.next_pm_date)}`}
                actionLabel="View & mark done"
              />
            ))}
          </>
        )}

        {/* Pending follow-ups */}
        {!loading && showFollowUps && filteredReminders.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF9F27', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#633806', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Pending follow-up — {filteredReminders.length} item{filteredReminders.length > 1 ? 's' : ''}
              </div>
            </div>
            {filteredReminders.map(reminder => {
              const isOverdue = reminder.reminder_date < new Date().toLocaleDateString('en-CA')
              const eq = {
                name: reminder.equipment?.name,
                location: reminder.equipment?.location,
                model_number: reminder.equipment?.model_number,
                serial_number: reminder.equipment?.serial_number,
                room_number: null,
              }
              return (
                <DeviceCard key={reminder.id}
                  item={eq}
                  onClick={() => navigate(`/follow-up/${reminder.id}`)}
                  accentColor="#633806"
                  accentBg="#FAEEDA"
                  accentBorder="#EF9F27"
                  badge={isOverdue ? 'Overdue' : 'Due today'}
                  secondaryLine={reminder.reminder_note}
                  actionLabel="Resolve"
                />
              )
            })}
          </>
        )}

        {/* Due soon PMs */}
        {!loading && showDueSoon && filteredDueSoon.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F5C842', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#7A5C00', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Due soon — {filteredDueSoon.length} device{filteredDueSoon.length > 1 ? 's' : ''}
              </div>
            </div>
            {filteredDueSoon.map(item => (
              <DeviceCard key={item.id}
                item={item}
                onClick={() => navigate(`/equipment/${item.id}`)}
                accentColor="#7A5C00"
                accentBg="#FEF9EC"
                accentBorder="#F5C842"
                badge={`${daysDiff(item.next_pm_date)}d away`}
                secondaryLine={`Next PM: ${formatDate(item.next_pm_date)}`}
                actionLabel="View instructions"
              />
            ))}
          </>
        )}

      </div>

      {/* Filter panel */}
      {showPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div onClick={() => setShowPanel(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px 16px', paddingBottom: '40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Filter action items</div>
              <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Item type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { key: 'overdue', label: 'Overdue PM' },
                  { key: 'follow-up', label: 'Pending follow-up' },
                  { key: 'due-soon', label: 'Due soon' },
                ].map(t => (
                  <button key={t.key} onClick={() => togglePending('itemTypes', t.key)} style={chipStyle(pendingFilters.itemTypes.includes(t.key))}>{t.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Equipment type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {equipmentTypes.map(t => (
                  <button key={t} onClick={() => togglePending('equipmentTypes', t)} style={chipStyle(pendingFilters.equipmentTypes.includes(t))}>{t}</button>
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