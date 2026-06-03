import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Team({ facility }) {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [isCreator, setIsCreator] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    if (!facility) return
    loadData()
  }, [facility])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user.id)

    const { data: facilityData } = await supabase
      .from('facilities')
      .select('created_by')
      .eq('id', facility.id)
      .single()

    if (facilityData?.created_by === user.id) {
      setIsCreator(true)

      const { data: reqs } = await supabase
        .from('join_requests')
        .select('*')
        .eq('facility_id', facility.id)
        .eq('status', 'pending')

      if (reqs) setRequests(reqs)
    }

    const { data: memberData } = await supabase
      .from('profile_facilities')
      .select('*, profiles(*)')
      .eq('facility_id', facility.id)
    if (memberData) setMembers(memberData)

    setLoading(false)
  }

  const handleApprove = async (request) => {
    const { error } = await supabase
      .from('profile_facilities')
      .insert({
        profile_id: request.requester_id,
        facility_id: facility.id,
      })

    if (error) {
      alert('Error approving: ' + error.message)
      return
    }

    await supabase.from('join_requests')
      .update({ status: 'approved' })
      .eq('id', request.id)

    setRequests(prev => prev.filter(r => r.id !== request.id))
    loadData()
  }

  const handleDecline = async (request) => {
    await supabase.from('join_requests')
      .update({ status: 'declined' })
      .eq('id', request.id)

    setRequests(prev => prev.filter(r => r.id !== request.id))
  }

  const handleRemove = async (member) => {
    const confirmed = window.confirm(`Remove ${member.profiles?.full_name} from ${facility.name}?`)
    if (!confirmed) return

    const { error } = await supabase
      .from('profile_facilities')
      .delete()
      .eq('profile_id', member.profile_id)
      .eq('facility_id', facility.id)

    if (error) {
      alert('Error removing member: ' + error.message)
      return
    }

    await supabase
      .from('join_requests')
      .delete()
      .eq('requester_id', member.profile_id)
      .eq('facility_id', facility.id)

    loadData()
  }

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true)
    setError('')
    setSuccess('')

    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', inviteEmail.toLowerCase().trim())
      .single()

    if (!invitedUser) {
      setError('No account found with that email. Ask your colleague to create a GID Workshop account first.')
      setInviting(false)
      return
    }

    const { error: linkError } = await supabase
      .from('profile_facilities')
      .insert({
        profile_id: invitedUser.id,
        facility_id: facility.id,
      })

    if (linkError) {
      setError('Could not add member: ' + linkError.message)
    } else {
      setSuccess(`${invitedUser.full_name} added to ${facility.name}`)
      setInviteEmail('')
      loadData()
    }
    setInviting(false)
  }

  const roleColors = {
    technician: { bg: '#E6F1FB', color: '#0C447C' },
    engineer: { bg: '#E1F5EE', color: '#085041' },
    admin: { bg: '#EEEDFE', color: '#3C3489' },
  }

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <div style={{ fontSize: '15px', fontWeight: '500' }}>Team — {facility?.name}</div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {isCreator && requests.length > 0 && (
          <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#633806', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {requests.length} pending access request{requests.length > 1 ? 's' : ''}
            </div>
            {requests.map(req => (
              <div key={req.id} style={{ background: '#fff', border: '1px solid #EF9F27', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{req.requester_name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
                    Requested {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleDecline(req)}
                    style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', fontSize: '12px', color: '#666', cursor: 'pointer' }}>
                    Decline
                  </button>
                  <button
                    onClick={() => handleApprove(req)}
                    style={{ padding: '5px 10px', borderRadius: '8px', border: 'none', background: '#1D9E75', fontSize: '12px', color: '#fff', cursor: 'pointer' }}>
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '10px' }}>Add a colleague directly</div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px', lineHeight: '1.5' }}>
            Ask your colleague to create a GID Workshop account first. Then enter their email to add them instantly.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '4px' }}>Colleague's email address</div>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="e.g. sharon@hospital.org"
                style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '8px', padding: '9px 11px', fontSize: '12px', color: '#A32D2D' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: '#E1F5EE', border: '1px solid #5DCAA5', borderRadius: '8px', padding: '9px 11px', fontSize: '12px', color: '#085041' }}>
                {success}
              </div>
            )}

            <button
              onClick={handleInvite}
              disabled={!inviteEmail || inviting}
              style={{ padding: '10px', borderRadius: '8px', border: 'none', background: inviteEmail && !inviting ? '#185FA5' : '#ccc', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: inviteEmail && !inviting ? 'pointer' : 'not-allowed' }}>
              {inviting ? 'Adding...' : 'Add to facility'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: '500', color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Current team — {members.length} {members.length === 1 ? 'member' : 'members'}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '13px' }}>Loading team...</div>
        )}

        {members.map(m => {
          const role = m.profiles?.role || 'technician'
          const rc = roleColors[role] || roleColors.technician
          const isSelf = m.profile_id === currentUserId
          return (
            <div key={m.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#185FA5' }}>
                  {m.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                  {m.profiles?.full_name || 'Unknown'}
                  {isSelf && <span style={{ fontSize: '10px', color: '#aaa', marginLeft: '6px' }}>(you)</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
                  {m.profiles?.email || ''}
                </div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>
                  Added {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: rc.bg, color: rc.color }}>
                {role}
              </span>
              {isCreator && !isSelf && (
                <button
                  onClick={() => handleRemove(m)}
                  style={{ background: 'none', border: '1px solid #F09595', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', color: '#A32D2D', flexShrink: 0 }}>
                  Remove
                </button>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}