import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function SelectFacility({ onSelect }) {
  const [facilities, setFacilities] = useState([])
  const [mode, setMode] = useState('select')
  const [newFacility, setNewFacility] = useState({ name: '', location: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('facilities').select('*').order('name').then(({ data }) => {
      if (data) setFacilities(data)
    })
  }, [])

  const handleSelect = async (facility) => {
    onSelect(facility)
  }

  const handleCreate = async () => {
    if (!newFacility.name) return
    setLoading(true)
    setError('')
    const { data, error } = await supabase.from('facilities').insert({
      name: newFacility.name,
      location: newFacility.location,
    }).select().single()
    if (error) { setError(error.message); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profile_facilities').insert({
      profile_id: user.id,
      facility_id: data.id,
    })
    onSelect(data)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '16px', padding: '28px 24px', border: '1px solid #eee' }}>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: '500' }}>Select facility</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Which facility are you working at today?</div>
        </div>

        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '8px', padding: '3px', marginBottom: '16px' }}>
          {['select', 'create'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#1a1a1a' : '#888' }}>
              {m === 'select' ? 'Existing facility' : 'New facility'}
            </button>
          ))}
        </div>

        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {facilities.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '13px' }}>
                No facilities yet — create one to get started
              </div>
            )}
            {facilities.map(f => (
              <div key={f.id} onClick={() => handleSelect(f)}
                style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{f.name}</div>
                  {f.location && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{f.location}</div>}
                </div>
                <svg width="16" height="16" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            ))}
            <button onClick={() => setMode('create')}
              style={{ marginTop: '4px', padding: '10px', borderRadius: '8px', border: '1px dashed #ddd', background: 'transparent', fontSize: '13px', color: '#185FA5', cursor: 'pointer' }}>
              + Add new facility
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Facility name <span style={{ color: '#E24B4A' }}>*</span></div>
              <input
                value={newFacility.name}
                onChange={e => setNewFacility(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mulago National Referral Hospital"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>City / region</div>
              <input
                value={newFacility.location}
                onChange={e => setNewFacility(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Kampala, Uganda"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
              />
            </div>
            {error && (
              <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#A32D2D' }}>{error}</div>
            )}
            <button
              onClick={handleCreate}
              disabled={loading || !newFacility.name}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '500', color: '#fff', cursor: 'pointer', background: !newFacility.name ? '#ccc' : '#185FA5' }}>
              {loading ? 'Creating...' : 'Create & continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
