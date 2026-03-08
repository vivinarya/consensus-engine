import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import EnginePage from './pages/EnginePage'
import ArchitecturePage from './pages/ArchitecturePage'
import MetricsPage from './pages/MetricsPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/chat" element={<EnginePage />} />
      <Route path="/architecture" element={<ArchitecturePage />} />
      <Route path="/metrics" element={<MetricsPage />} />
    </Routes>
  )
}

export default App
