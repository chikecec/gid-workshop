import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/home', label: 'Home', icon: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )},
  { path: '/schedule', label: 'Schedule', icon: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )},
  { path: '/equipment', label: 'Equipment', icon: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
    </svg>
  )},
  { path: '/logs', label: 'Logs', icon: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
    </svg>
  )},
  { path: '/reports', label: 'Reports', icon: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  )},
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '430px',
      background: '#fff',
      borderTop: '1px solid #eee',
      display: 'flex',
      zIndex: 100,
    }}>
      {navItems.map(item => {
        const active = location.pathname === item.path
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '8px 0 6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? '#185FA5' : '#999',
            }}
          >
            {item.icon}
            <span style={{ fontSize: '10px', fontWeight: active ? '500' : '400' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}