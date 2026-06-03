import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function SelectFacility({ onSelect }) {
  const [facilities, setFacilities] = useState([])
  const [allFacilities, setAllFacilities] = useState([])
  const [mode, setMode] = useState('select')
  const [newFacility, setNewFacility] = useState({ name: '', location: '' })
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [requestSent, setRequestSent] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: memberships } = await supabase
        .from('profile_facilities')
        .select('facility_id')
        .eq('profile_id', user.id)

      const memberFacilityIds = memberships?.map(m => m.facility_id) || []

      if (memberFacilityIds.length > 0) {
        const { data } = await supabase
          .from('facilities')
          .select('*')
          .in('id', memberFacilityIds)
          .order('name')
        if (data) setFacilities(data)
      }

      const { data: allFac } = await supabase
        .from('facilities')
        .select('*')
        .order('name')
      if (allFac) setAllFacilities(allFac)

      const { data: existingRequests } = await supabase
        .from('join_requests')
        .select('facility_id, status')
        .eq('requester_id', user.id)

      if (existingRequests) {
        const map = {}
        existingRequests.forEach(r => {
          if (r.status === 'approved' && !memberFacilityIds.includes(r.facility_id)) {
            map[r.facility_id] = 'removed'
          } else {
            map[r.facility_id] = r.status
          }
        })
        setRequestSent(map)
      }

      setPageLoading(false)
    }
    load()
  }, [])

  const handleSelect = (facility) => {
    onSelect(facility)
  }

  const handleCreate = async () => {
    if (!newFacility.name) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('facilities')
      .insert({
        name: newFacility.name,
        location: newFacility.location,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) { setError(error.message); setLoading(false); return }

    const { error: memberError } = await supabase
      .from('profile_facilities')
      .insert({
        profile_id: user.id,
        facility_id: data.id,
      })

    if (memberError) { setError(memberError.message); setLoading(false); return }

    onSelect(data)
    setLoading(false)
  }

  const handleRequestAccess = async (facility) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await supabase.from('join_requests').insert({
      facility_id: facility.id,
      requester_id: user.id,
      requester_name: profile?.full_name || user.email,
      status: 'pending',
    })

    setRequestSent(prev => ({ ...prev, [facility.id]: 'pending' }))
  }

  const myFacilityIds = facilities.map(f => f.id)

  const searchResults = search.length > 1
    ? allFacilities.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) &&
        !myFacilityIds.includes(f.id)
      )
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '16px', padding: '28px 24px', border: '1px solid #eee' }}>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: '500' }}>Select facility</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Which facility are you working at today?</div>
        </div>

        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '8px', padding: '3px', marginBottom: '16px' }}>
          {['select', 'search', 'create'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#1a1a1a' : '#888' }}>
              {m === 'select' ? 'My facilities' : m === 'search' ? 'Find facility' : 'New facility'}
            </button>
          ))}
        </div>

        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pageLoading && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '13px' }}>
                Loading your facilities...
              </div>
            )}

            {!pageLoading && facilities.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '13px', lineHeight: '1.6' }}>
                You haven't joined any facilities yet. Search for your hospital or create a new one.
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

            <button onClick={() => setMode('search')}
              style={{ marginTop: '4px', padding: '10px', borderRadius: '8px', border: '1px dashed #ddd', background: 'transparent', fontSize: '13px', color: '#185FA5', cursor: 'pointer' }}>
              Find & request access to a facility
            </button>

            <button onClick={() => setMode('create')}
              style={{ padding: '10px', borderRadius: '8px', border: '1px dashed #ddd', background: 'transparent', fontSize: '13px', color: '#888', cursor: 'pointer' }}>
              + Create a new facility
            </button>
          </div>
        )}

        {mode === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#E6F1FB', border: '1px solid #85B7EB', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#0C447C', lineHeight: '1.5' }}>
              Search for your hospital. If it exists, request access and the facility creator will approve you.
            </div>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type hospital name..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
            />

            {search.length > 1 && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#aaa', fontSize: '12px' }}>
                No facilities found — you can create it instead.
                <div>
                  <button onClick={() => { setMode('create'); setNewFacility({ name: search, location: '' }) }}
                    style={{ marginTop: '8px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#185FA5', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                    Create "{search}"
                  </button>
                </div>
              </div>
            )}

            {searchResults.map(f => {
              const status = requestSent[f.id]
              return (
                <div key={f.id}
                  style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{f.name}</div>
                    {f.location && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{f.location}</div>}
                  </div>
                  {status === 'pending' ? (
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '99px', background: '#FAEEDA', color: '#633806', border: '1px solid #EF9F27', flexShrink: 0 }}>
                      Requested
                    </span>
                  ) : status === 'approved' ? (
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '99px', background: '#E1F5EE', color: '#085041', border: '1px solid #5DCAA5', flexShrink: 0 }}>
                      Approved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRequestAccess(f)}
                      style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '8px', border: 'none', background: '#185FA5', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                      Request access
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#633806', lineHeight: '1.5' }}>
              Only create a new facility if your hospital isn't in the system yet. Search first to avoid duplicates.
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>
                Facility name <span style={{ color: '#E24B4A' }}>*</span>
              </div>
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
              <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#A32D2D' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !newFacility.name}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '500', color: '#fff', cursor: !newFacility.name || loading ? 'not-allowed' : 'pointer', background: !newFacility.name || loading ? '#ccc' : '#185FA5' }}>
              {loading ? 'Creating...' : 'Create & continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}