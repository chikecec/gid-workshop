import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const equipmentTypes = [
  'Respiratory support',
  'Monitoring',
  'Sterilisation',
  'Cardiology',
  'Diagnostic',
  'Laboratory',
  'Surgical',
  'Imaging',
  'Other',
]

function getStatus(item) {
  if (!item.next_pm_date) return 'ok'
  const today = new Date()
  const next = new Date(item.next_pm_date)
  const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 30) return 'due-soon'
  return 'ok'
}

export default function Home({ facility, onSwitchFacility, onSignOut }) {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    itemTypes: [],
    equipmentTypes: [],
  })
  const [pendingFilters, setPendingFilters] = useState({
    itemTypes: [],
    equipmentTypes: [],
  })

  useEffect(() => {
    if (!facility) return

    const loadData = async () => {
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('*')
        .eq('facility_id', facility.id)
        .order('next_pm_date', { ascending: true })

      if (equipmentData) {
        setEquipment(equipmentData.map(e => ({ ...e, status: getStatus(e) })))
      }

      const today = new Date().toISOString().split('T')[0]
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
    const empty = { itemTypes: [], equipmentTypes: [] }
    setFilters(empty)
    setPendingFilters(empty)
    setSearch('')
    setShowPanel(false)
  }

  const activeFilterCount = filters.itemTypes.length + filters.equipmentTypes.length + (search ? 1 : 0)

  const matchesSearch = (name, model, serial) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      name?.toLowerCase().includes(q) ||
      model?.toLowerCase().includes(q) ||
      serial?.toLowerCase().includes(q)
    )
  }

  const matchesEquipmentType = (type) => {
    if (!filters.equipmentTypes.length) return true
    return filters.equipmentTypes.includes(type)
  }

  const showOverdue = !filters.itemTypes.length || filters.itemTypes.includes('overdue')
  const showFollowUps = !filters.itemTypes.length || filters.itemTypes.includes('follow-up')
  const showDueSoon = !filters.itemTypes.length || filters.itemTypes.includes('due-soon')

  const filteredOverdue = equipment.filter(e =>
    e.status === 'overdue' &&
    matchesSearch(e.name, e.model_number, e.serial_number) &&
    matchesEquipmentType(e.type)
  )

  const filteredReminders = reminders.filter(r =>
    matchesSearch(r.equipment?.name, r.equipment?.model_number, r.equipment?.serial_number) &&
    matchesEquipmentType(r.equipment?.type)
  )

  const filteredDueSoon = equipment.filter(e =>
    e.status === 'due-soon' &&
    matchesSearch(e.name, e.model_number, e.serial_number) &&
    matchesEquipmentType(e.type)
  )

  const upToDate = equipment.filter(e => e.status === 'ok').length
  const hasAnything = filteredOverdue.length > 0 || filteredReminders.length > 0 || filteredDueSoon.length > 0

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
          <button
            onClick={() => navigate('/team')}
            style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#888' }}>
            Team
          </button>
          <button
            onClick={onSignOut}
            style={{ background: 'none', border: '1px solid #eee', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#888' }}>
            Sign out
          </button>
          <button
            onClick={() => navigate('/equipment/add')}
            style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#185FA5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
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
            placeholder="Search by name, model or serial number..."
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

        {loading && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#aaa', fontSize: '13px' }}>Loading...</div>
        )}

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
              <button onClick={clearFilters}
                style={{ marginTop: '12px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', color: '#666', cursor: 'pointer' }}>
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
              <div key={item.id}
                onClick={() => navigate(`/equipment/${item.id}`)}
                style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#791F1F' }}>{item.name}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#fff', color: '#A32D2D', border: '1px solid #F09595' }}>
                    {Math.abs(Math.ceil((new Date(item.next_pm_date) - new Date()) / (1000 * 60 * 60 * 24)))} days overdue
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#A32D2D' }}>
                  {item.location}{item.room_number ? ` · ${item.room_number}` : ''}
                </div>
                {(item.model_number || item.serial_number) && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                    {item.model_number && (
                      <div style={{ fontSize: '11px', color: '#A32D2D', opacity: 0.8 }}>
                        Model: <span style={{ fontWeight: '500' }}>{item.model_number}</span>
                      </div>
                    )}
                    {item.serial_number && (
                      <div style={{ fontSize: '11px', color: '#A32D2D', opacity: 0.8 }}>
                        S/N: <span style={{ fontWeight: '500' }}>{item.serial_number}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: '11px', fontWeight: '500', color: '#A32D2D', marginTop: '6px' }}>View & mark done →</div>
              </div>
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
              const isOverdueReminder = reminder.reminder_date < new Date().toISOString().split('T')[0]
              return (
                <div key={reminder.id}
                  onClick={() => navigate(`/follow-up/${reminder.id}`)}
                  style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#633806' }}>{reminder.equipment?.name}</div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#fff', color: '#854F0B', border: '1px solid #EF9F27' }}>
                      {isOverdueReminder ? 'Overdue' : 'Due today'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#854F0B', marginBottom: '3px' }}>{reminder.reminder_note}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{reminder.equipment?.location}</div>
                  {(reminder.equipment?.model_number || reminder.equipment?.serial_number) && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                      {reminder.equipment?.model_number && (
                        <div style={{ fontSize: '11px', color: '#854F0B', opacity: 0.8 }}>
                          Model: <span style={{ fontWeight: '500' }}>{reminder.equipment.model_number}</span>
                        </div>
                      )}
                      {reminder.equipment?.serial_number && (
                        <div style={{ fontSize: '11px', color: '#854F0B', opacity: 0.8 }}>
                          S/N: <span style={{ fontWeight: '500' }}>{reminder.equipment.serial_number}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
                    {new Date(reminder.reminder_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#854F0B', marginTop: '6px' }}>Resolve →</div>
                </div>
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
              <div key={item.id}
                onClick={() => navigate(`/equipment/${item.id}`)}
                style={{ background: '#FEF9EC', border: '1px solid #F5C842', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#7A5C00' }}>{item.name}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#fff', color: '#9A7300', border: '1px solid #F5C842' }}>
                    {Math.ceil((new Date(item.next_pm_date) - new Date()) / (1000 * 60 * 60 * 24))}d away
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#9A7300' }}>
                  {item.location}{item.room_number ? ` · ${item.room_number}` : ''}
                </div>
                {(item.model_number || item.serial_number) && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                    {item.model_number && (
                      <div style={{ fontSize: '11px', color: '#9A7300', opacity: 0.8 }}>
                        Model: <span style={{ fontWeight: '500' }}>{item.model_number}</span>
                      </div>
                    )}
                    {item.serial_number && (
                      <div style={{ fontSize: '11px', color: '#9A7300', opacity: 0.8 }}>
                        S/N: <span style={{ fontWeight: '500' }}>{item.serial_number}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: '11px', fontWeight: '500', color: '#9A7300', marginTop: '6px' }}>View instructions →</div>
              </div>
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
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Item type */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Item type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { key: 'overdue', label: 'Overdue PM' },
                  { key: 'follow-up', label: 'Pending follow-up' },
                  { key: 'due-soon', label: 'Due soon' },
                ].map(t => (
                  <button key={t.key} onClick={() => togglePending('itemTypes', t.key)} style={chipStyle(pendingFilters.itemTypes.includes(t.key))}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment type */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Equipment type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {equipmentTypes.map(t => (
                  <button key={t} onClick={() => togglePending('equipmentTypes', t)} style={chipStyle(pendingFilters.equipmentTypes.includes(t))}>
                    {t}
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