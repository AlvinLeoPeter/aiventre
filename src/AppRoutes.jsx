import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'

// The app itself is served at /app (the same code as the phone app); this is just the site around it.
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  )
}
