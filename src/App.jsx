import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Equipment from './pages/Equipment'
import Schedule from './pages/Schedule'
import Logs from './pages/Logs'
import AddEquipment from './pages/AddEquipment'
import EquipmentDetail from './pages/EquipmentDetail'
import BottomNav from './components/BottomNav'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<Home />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/equipment/add" element={<AddEquipment />} />
          <Route path="/equipment/:id" element={<EquipmentDetail />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App
