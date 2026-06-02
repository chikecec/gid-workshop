import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './pages/Login'
import SelectFacility from './pages/SelectFacility'
import Home from './pages/Home'
import Equipment from './pages/Equipment'
import Schedule from './pages/Schedule'
import Logs from './pages/Logs'
import AddEquipment from './pages/AddEquipment'
import EquipmentDetail from './pages/EquipmentDetail'
import BottomNav from './components/BottomNav'
import Team from './pages/Team'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      const saved = localStorage.getItem('gid_facility')
      if (saved) setFacility(JSON.parse(saved))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setFacility(null)
        localStorage.removeItem('gid_facility')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleFacilitySelect = (f) => {
    setFacility(f)
    localStorage.setItem('gid_facility', JSON.stringify(f))
  }

  const handleSwitchFacility = () => {
    setFacility(null)
    localStorage.removeItem('gid_facility')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setFacility(null)
    localStorage.removeItem('gid_facility')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', background: '#185FA5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div style={{ fontSize: '14px', color: '#888' }}>Loading GID Workshop...</div>
      </div>
    </div>
  )

  if (!session) return <Login onLogin={() => {}} />

  if (!facility) return <SelectFacility onSelect={handleFacilitySelect} />

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/team" element={<Team facility={facility} />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={
            <Home
              facility={facility}
              onSwitchFacility={handleSwitchFacility}
              onSignOut={handleSignOut}
            />}
          />
          <Route path="/equipment" element={<Equipment facility={facility} />} />
          <Route path="/equipment/add" element={<AddEquipment facility={facility} />} />
          <Route path="/equipment/:id" element={<EquipmentDetail facility={facility} />} />
          <Route path="/schedule" element={<Schedule facility={facility} />} />
          <Route path="/logs" element={<Logs facility={facility} />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
