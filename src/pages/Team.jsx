import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Team({ facility }) {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('technician')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!facility) return
    supabase
      .from('profile_facilities')
      .select('*, profiles(*)')
      .eq('facility_id', facility.id)
      .then(({ data }) => {
        if (data) setMembers(data)
        setLoading(false)
      })
  }, [facility])

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true)
    setError('')
    setSuccess('')

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .single()

    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `%${inviteEmail}%`)
      .single()

    if (!invitedUser) {
      const { error: inviteError } = await supabase.auth.admin
      setError('User not found. They need to create an account first, then you can add them.')
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
      const { data: updated } = await supabase
        .from('profile_facilities')
        .select('*, profiles(*)')
        .eq('facility_id', facility.id)
      if (updated) setMembers(updated)
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

        <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '10px' }}>Add a colleague</div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px', lineHeight: '1.5' }}>
            Ask your colleague to create a GID Workshop account first. Then enter their full name below to add them to this facility.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '4px' }}>Colleague's full name</div>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="e.g. Sharon Kamau"
                style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '4px' }}>Their role</div>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                style={{ width: '100%', padding: '9px 11px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: '#fff', outline: 'none' }}>
                <option value="technician">Biomedical technician</option>
                <option value="engineer">Biomedical engineer</option>
                <option value="admin">Administrator</option>
              </select>
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
          return (
            <div key={m.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#185FA5' }}>
                  {m.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>{m.profiles?.full_name || 'Unknown'}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>Added {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: rc.bg, color: rc.color }}>
                {role}
              </span>
            </div>
          )
        })}

      </div>
    </div>
  )
}