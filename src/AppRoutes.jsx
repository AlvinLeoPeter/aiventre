import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'

// The app is loaded only when someone opens /app, so the marketing site stays light.
const AppLayout = lazy(() => import('./app/AppLayout.jsx'))
const AgentView = lazy(() => import('./app/views/AgentView.jsx'))
const BuyersView = lazy(() => import('./app/views/BuyersView.jsx'))
const RepliesView = lazy(() => import('./app/views/RepliesView.jsx'))
const QuoteView = lazy(() => import('./app/views/QuoteView.jsx'))
const ProfileView = lazy(() => import('./app/views/ProfileView.jsx'))
const PrintProfile = lazy(() => import('./app/views/PrintProfile.jsx'))

const Loading = () => <div className="min-h-screen bg-background" />

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/app/profile/print" element={<PrintProfile />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<AgentView />} />
            <Route path="buyers" element={<BuyersView />} />
            <Route path="buyers/:id" element={<BuyersView />} />
            <Route path="replies" element={<RepliesView />} />
            <Route path="quote" element={<QuoteView />} />
            <Route path="profile" element={<ProfileView />} />
          </Route>
          <Route path="*" element={<App />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
