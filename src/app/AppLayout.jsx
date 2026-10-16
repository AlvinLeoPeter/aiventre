import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bot, Calculator, Inbox, KeyRound, LogOut, Sparkles, Store, Users } from 'lucide-react'
import { getAccessCode, isFollowUpDue, setAccessCode, useStore } from './store.js'
import { Button, Input } from './ui.jsx'

const NAV = [
  { to: '/app', label: 'Agent', Icon: Sparkles, end: true },
  { to: '/app/buyers', label: 'Buyers', Icon: Users },
  { to: '/app/replies', label: 'Replies', Icon: Inbox },
  { to: '/app/quote', label: 'Quote', Icon: Calculator },
  { to: '/app/profile', label: 'My shop', Icon: Store },
]

const TITLES = {
  '/app': 'AI agent',
  '/app/buyers': 'Buyers',
  '/app/replies': 'Replies',
  '/app/quote': 'Quote helper',
  '/app/profile': 'My shop',
}

function AccessGate({ onUnlock }) {
  const [code, setCode] = useState('')
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!code.trim()) return
          setAccessCode(code.trim())
          onUnlock()
        }}
        className="w-full max-w-sm rounded-4xl border border-divider bg-surface p-7 shadow-xl shadow-primary/5"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary">
          <KeyRound className="h-5 w-5 text-white" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">Aiventre pilot</h1>
        <p className="mt-1 text-sm text-muted">Enter the access code you were given. It’s saved on this device.</p>
        <div className="mt-5">
          <Input id="code" label="Access code" type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <Button type="submit" className="mt-5 w-full" disabled={!code.trim()}>
          Open the app
        </Button>
        <Link to="/#contact" className="mt-4 block text-center text-sm text-primary underline">
          Don’t have a code? Join the pilot
        </Link>
      </form>
    </div>
  )
}

export default function AppLayout() {
  const [unlocked, setUnlocked] = useState(() => Boolean(getAccessCode()))
  const { pathname } = useLocation()
  const buyers = useStore((s) => s.buyers)
  const shop = useStore((s) => s.profile.shop_name)
  const todo = buyers.filter((b) => b.status === 'draft_ready' || isFollowUpDue(b)).length

  useEffect(() => {
    document.title = 'Aiventre — app'
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  if (!unlocked) return <AccessGate onUnlock={() => setUnlocked(true)} />

  const title = pathname.startsWith('/app/buyers/') ? 'Buyer' : TITLES[pathname] ?? 'Aiventre'

  return (
    <div className="min-h-[100dvh] bg-background text-ink lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-divider lg:px-4 lg:py-6">
        <Link to="/" className="flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Bot className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          <span className="font-display text-lg font-bold">Aiventre</span>
        </Link>
        {shop && <p className="mt-4 truncate px-2 text-sm text-muted">{shop}</p>}
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-ink/70 hover:bg-surface hover:text-ink'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
              {to === '/app/buyers' && todo > 0 && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 text-[11px] font-semibold text-amber-800">{todo}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            setAccessCode('')
            setUnlocked(false)
          }}
          className="mt-auto flex items-center gap-2 px-3 text-sm text-muted hover:text-ink"
        >
          <LogOut className="h-4 w-4" /> Lock app
        </button>
      </aside>

      <div className="min-w-0 flex-1 pb-24 lg:pb-10">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-divider bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/" className="flex items-center gap-2" aria-label="Aiventre home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Bot className="h-4 w-4 text-white" strokeWidth={2.4} />
            </span>
          </Link>
          <h1 className="font-display text-base font-bold">{title}</h1>
          <span className="w-8" />
        </header>

        <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
          <h1 className="mb-6 hidden font-display text-3xl font-extrabold tracking-tight lg:block">{title}</h1>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs — thumb-friendly, like a normal phone app */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-divider bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${isActive ? 'text-primary' : 'text-muted'}`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
            {to === '/app/buyers' && todo > 0 && (
              <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-amber-500" aria-label={`${todo} to do`} />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
