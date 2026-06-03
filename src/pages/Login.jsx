import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'technician' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    if (error) setError(error.message)
    else onLogin()
    setLoading(false)
  }

  const handleSignup = async () => {
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match — please check and try again.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (error) { setError(error.message); setLoading(false); return }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.name,
      role: form.role,
      email: form.email.toLowerCase().trim(),
    })
    if (profileError) setError(profileError.message)
    else onLogin()
    setLoading(false)
  }

  const canSignup = form.name && form.email && form.password && form.confirmPassword
  const canLogin = form.email && form.password
  const passwordsMatch = form.confirmPassword && form.password !== form.confirmPassword

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '16px', padding: '28px 24px', border: '1px solid #eee' }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', background: '#185FA5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: '#1a1a1a' }}>GID Workshop</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Biomedical equipment management</div>
        </div>

        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: '8px', padding: '3px', marginBottom: '20px' }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#1a1a1a' : '#888' }}>
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'signup' && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Full name</div>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Abdullah Musa"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
              />
            </div>
          )}

          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Email address</div>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="you@hospital.org"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Password</div>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Minimum 6 characters"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
            />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Confirm password</div>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${passwordsMatch ? '#F09595' : '#ddd'}`, fontSize: '13px', outline: 'none' }}
                />
                {passwordsMatch && (
                  <div style={{ fontSize: '11px', color: '#A32D2D', marginTop: '4px' }}>
                    Passwords do not match
                  </div>
                )}
                {form.confirmPassword && !passwordsMatch && (
                  <div style={{ fontSize: '11px', color: '#0F6E56', marginTop: '4px' }}>
                    ✓ Passwords match
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '5px' }}>Your role</div>
                <select
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: '#fff', outline: 'none' }}>
                  <option value="technician">Biomedical technician</option>
                  <option value="engineer">Biomedical engineer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#A32D2D' }}>
              {error}
            </div>
          )}

          <button
            onClick={mode === 'login' ? handleLogin : handleSignup}
            disabled={loading || (mode === 'login' ? !canLogin : !canSignup)}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
              fontSize: '14px', fontWeight: '500', color: '#fff', cursor: 'pointer', marginTop: '4px',
              background: loading || (mode === 'login' ? !canLogin : !canSignup) ? '#ccc' : '#185FA5'
            }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}