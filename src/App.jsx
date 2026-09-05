import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import BreathingBackground from './theme/background.jsx'
import HomePage from './ui/pages/HomePage.jsx'
import ChatPage from './ui/pages/ChatPage.jsx'
import CardPage from './ui/pages/CardPage.jsx'
import CalendarPage from './ui/pages/CalendarPage.jsx'
import FamilyPage from './ui/pages/FamilyPage.jsx'
import SleepPage from './ui/pages/SleepPage.jsx'
import './theme/layout.css'

const NAV = [
  { to: '/', label: '首页', end: true },
  { to: '/chat', label: '说状态' },
  { to: '/card', label: '今日时序' },
  { to: '/calendar', label: '养生日历' },
  { to: '/family', label: '家庭守护' },
  { to: '/sleep', label: '睡前时辰' },
]

export default function App() {
  return (
    <BrowserRouter>
      <BreathingBackground />
      <div className="yl-shell">
        <header className="yl-nav">
          <NavLink to="/" className="yl-brand font-serif" end>
            养令 <span className="yl-brand-en">YANGLING</span>
          </NavLink>
          <nav className="yl-nav-links">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => 'yl-nav-link' + (isActive ? ' is-active' : '')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="yl-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/card" element={<CardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/family" element={<FamilyPage />} />
            <Route path="/sleep" element={<SleepPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
