import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Search,
  Send,
  Inbox,
  Calculator,
  FileText,
  BellRing,
  MessageCircle,
  Bot,
  Menu,
  X,
  PhoneOff,
  Building2,
} from 'lucide-react'
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  FORM_ENDPOINT,
  WHATSAPP_NUMBER,
  prefersReducedMotion,
  telHref,
  whatsappHref,
} from './config.js'

gsap.registerPlugin(ScrollTrigger)

/* ----------------------------------------------------------------
   Constants / Content
---------------------------------------------------------------- */
const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'What it does', href: '#solutions' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
]

const SERVICES_FULL = [
  {
    icon: FileText,
    title: 'Capability Profile',
    text: 'Describe your shop in your own words. Aiventre turns it into a clean one-page profile — machines, materials, tolerances, industries — ready to send to any purchase team.',
  },
  {
    icon: Search,
    title: 'AI Buyer Research',
    text: 'The AI agent searches the web for companies that buy parts like yours — OEMs, Tier-1/2 suppliers, GeM tenders — and saves each one with the source, so you can check it.',
  },
  {
    icon: Send,
    title: 'Emails You Approve',
    text: 'Short, specific emails written for each buyer. Nothing goes out until you read it and send it from your own email.',
  },
  {
    icon: BellRing,
    title: 'Follow-up Reminders',
    text: 'Most orders come after the second or third message. Aiventre reminds you who to follow up with, and drafts the follow-up.',
  },
  {
    icon: Inbox,
    title: 'Reply Sorting',
    text: 'Paste a buyer’s reply and see what it means — quote request, call me, not now — with the next step and a suggested response.',
  },
  {
    icon: Calculator,
    title: 'Quote Helper',
    text: 'Upload a drawing. The AI reads material, features and tolerances and estimates machining time. You set the rate and decide the price.',
  },
]

const useReducedMotion = () => useState(prefersReducedMotion)[0]

/* ----------------------------------------------------------------
   Navbar
---------------------------------------------------------------- */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          scrolled ? 'glass shadow-lg shadow-primary/10' : 'bg-transparent'
        } rounded-full px-4 sm:px-6 py-2.5 w-[calc(100%-2rem)] max-w-5xl`}
      >
        <div className="flex items-center justify-between gap-6">
          <a href="#home" className="flex items-center gap-2 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Bot className="h-5 w-5 text-white" strokeWidth={2.4} />
              <span className="absolute inset-0 rounded-full ring-2 ring-primary/30 group-hover:ring-primary/50 transition" />
            </span>
            <span
              className={`font-display font-bold tracking-tight text-lg ${
                scrolled ? 'text-ink' : 'text-white'
              } transition-colors`}
            >
              Aiventre
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium tracking-tight lift-on-hover ${
                  scrolled ? 'text-ink/70 hover:text-primary' : 'text-white/90 hover:text-white'
                } transition-colors`}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/app"
              className={`text-sm font-medium tracking-tight lift-on-hover ${
                scrolled ? 'text-ink/70 hover:text-primary' : 'text-white/90 hover:text-white'
              } transition-colors`}
            >
              Open the app
            </Link>
          </div>

          <a
            href="#contact"
            className="hidden lg:inline-flex magnetic-btn items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/30"
          >
            Join the pilot
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
          </a>

          <button
            onClick={() => setOpen(true)}
            className={`lg:hidden p-2 rounded-full ${scrolled ? 'text-ink' : 'text-white'}`}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-[60] transition-all duration-500 lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-deep/90 backdrop-blur-2xl" onClick={() => setOpen(false)} />
        <div
          className={`absolute top-0 left-0 right-0 bg-background rounded-b-5xl px-6 pt-8 pb-12 transition-transform duration-500 ${
            open ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between mb-10">
            <span className="font-display font-bold text-xl text-ink">Aiventre</span>
            <button onClick={() => setOpen(false)} className="p-2 rounded-full bg-divider/40" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-display text-3xl font-semibold text-ink py-3 border-b border-divider"
              >
                {link.label}
              </a>
            ))}
            <Link to="/app" className="font-display text-3xl font-semibold text-ink py-3 border-b border-divider">
              Open the app
            </Link>
          </div>
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="mt-8 magnetic-btn flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-full font-semibold w-full"
          >
            Join the pilot
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </>
  )
}

/* ----------------------------------------------------------------
   Hero
---------------------------------------------------------------- */
const HERO_FEED = [
  { Icon: Search, from: '12 tractor-parts makers near Pune', to: 'Saved with sources' },
  { Icon: Send, from: 'Email to purchase@… drafted', to: 'Waiting for your OK' },
  { Icon: Inbox, from: 'Reply: “Please quote 500 pcs”', to: 'Quote ready' },
]

function Hero() {
  const heroRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.hero-line-1', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.3 })
      gsap.from('.hero-line-2', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', delay: 0.5 })
      gsap.from('.hero-cta, .hero-meta', {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.8,
        stagger: 0.12,
      })
    }, heroRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section id="home" ref={heroRef} className="relative min-h-[100dvh] w-full overflow-hidden bg-deep">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-25" />
      <div className="absolute -top-40 -left-32 h-[36rem] w-[36rem] rounded-full bg-primary/35 blur-3xl" />
      <div className="absolute bottom-0 -right-20 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-deep via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center text-center pt-28 pb-16">
        <div className="px-6 sm:px-10 lg:px-16 max-w-4xl">
          <p className="hero-meta font-mono text-xs uppercase tracking-[0.25em] text-white/60 mb-6">
            ╱ Orders for CNC &amp; VMC job shops
          </p>
          <h1 className="font-display font-extrabold text-white leading-[0.95] tracking-tight">
            <span className="hero-line-1 block text-4xl sm:text-5xl md:text-6xl">Idle machines?</span>
            <span
              className="hero-line-2 block font-serif italic font-medium text-primary-light text-6xl sm:text-7xl md:text-8xl lg:text-9xl mt-2"
              style={{ lineHeight: '0.92' }}
            >
              Let’s fill them.
            </span>
          </h1>

          <p className="hero-meta mx-auto max-w-xl text-white/75 text-base sm:text-lg mt-8 leading-relaxed">
            Aiventre’s AI agent finds companies that buy machined parts, writes the emails for you to approve,
            sorts the replies and helps you quote from a drawing.
            <span className="text-white"> You make the calls. You win the orders.</span>
          </p>

          <div className="hero-cta mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#contact"
              className="magnetic-btn group inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-7 py-4 rounded-full shadow-2xl shadow-primary/40"
            >
              Join the pilot
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link
              to="/app"
              className="lift-on-hover inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 font-medium px-7 py-4 rounded-full"
            >
              Open the app
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="hero-cta mx-auto mt-12 max-w-lg space-y-2 text-left">
            {HERO_FEED.map(({ Icon, from, to }) => (
              <li
                key={from}
                className="glass-dark flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/25">
                  <Icon className="h-4 w-4 text-primary-light" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 font-mono text-[11px] sm:flex-row sm:items-center sm:gap-3 sm:text-xs">
                  <span className="min-w-0 flex-1 truncate text-white/60">{from}</span>
                  <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-white/30 sm:block" />
                  <span className="shrink-0 text-accent">{to}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------
   Feature Card 1 — Buyer Shuffler
---------------------------------------------------------------- */
function BuyerShuffler() {
  const items = [
    { tag: 'Tractor parts', label: 'Transmission housing maker, outsources VMC work', source: 'Pune' },
    { tag: 'Pumps', label: 'Pump OEM buying machined impeller housings', source: 'Kolhapur' },
    { tag: 'GeM tender', label: 'Railway workshop: 2,000 machined brackets', source: 'Tender' },
  ]
  const [stack, setStack] = useState(items)

  useEffect(() => {
    const interval = setInterval(() => {
      setStack((prev) => {
        const next = [...prev]
        next.unshift(next.pop())
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-44 w-full">
      {stack.map((item, i) => {
        const offset = i
        const total = stack.length
        return (
          <div
            key={item.tag}
            style={{
              transform: `translate(${offset * 14}px, ${offset * 14}px) scale(${1 - offset * 0.05})`,
              zIndex: total - offset,
              opacity: 1 - offset * 0.25,
              transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease',
            }}
            className="absolute inset-0 bg-white border border-divider rounded-3xl p-5 shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary-dark bg-primary/10 px-2 py-1 rounded-full">
                {item.tag}
              </span>
              <span className="font-mono text-xs text-muted">{item.source}</span>
            </div>
            <div className="mt-4 font-display text-lg font-semibold text-ink leading-tight">{item.label}</div>
            <div className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved with source link
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ----------------------------------------------------------------
   Feature Card 2 — Signal Pulse (AI call engine)
---------------------------------------------------------------- */
const CALL_STATUSES = [
  { text: 'Researching buyers near you', label: 'Searching', tone: 'emerald' },
  { text: 'Email drafted · waiting for your OK', label: 'Draft', tone: 'accent' },
  { text: 'Sent by you · follow-up in 4 days', label: 'Sent', tone: 'primary' },
  { text: 'Reply: “please quote 500 pcs”', label: 'Quote', tone: 'emerald' },
]

function SignalPulse() {
  const [statusIdx, setStatusIdx] = useState(0)
  const [count, setCount] = useState(3)

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((idx) => {
        const next = (idx + 1) % CALL_STATUSES.length
        if (CALL_STATUSES[next].label === 'Quote') {
          setCount((c) => c + 1)
        }
        return next
      })
    }, 2300)
    return () => clearInterval(interval)
  }, [])

  const pings = [
    { left: '15%', delay: '0.0s', dur: '2.6s', size: 15 },
    { left: '25%', delay: '1.3s', dur: '3.0s', size: 12 },
    { left: '38%', delay: '0.6s', dur: '2.8s', size: 17 },
    { left: '50%', delay: '1.8s', dur: '2.4s', size: 13 },
    { left: '62%', delay: '0.9s', dur: '3.1s', size: 16 },
    { left: '74%', delay: '2.0s', dur: '2.7s', size: 12 },
    { left: '85%', delay: '0.4s', dur: '2.9s', size: 15 },
  ]

  const ripples = [
    { left: '22%', delay: '0.2s' },
    { left: '48%', delay: '1.0s' },
    { left: '76%', delay: '1.8s' },
  ]

  const status = CALL_STATUSES[statusIdx]
  const toneText =
    status.tone === 'emerald' ? 'text-emerald-600' : status.tone === 'accent' ? 'text-accent-dark' : 'text-primary-dark'
  const toneDot = status.tone === 'emerald' ? 'bg-emerald-500' : status.tone === 'accent' ? 'bg-accent' : 'bg-primary'

  return (
    <div
      className="relative h-44 w-full rounded-3xl overflow-hidden border border-primary/15"
      style={{ background: 'linear-gradient(180deg, #ECEAFF 0%, #C9C3FF 70%, #9D93FF 100%)' }}
    >
      {/* Soft atmosphere blobs */}
      <div className="absolute -top-8 -left-6 h-20 w-32 rounded-full bg-white/60 blur-2xl" />
      <div className="absolute top-2 right-10 h-14 w-24 rounded-full bg-white/50 blur-xl" />

      {/* Header strip */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-primary-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h4l2-7 4 14 2-7h4" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-dark">Outreach engine</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold text-sm text-ink tabular-nums">{String(count).padStart(2, '0')}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted">quote requests</span>
        </div>
      </div>

      {/* Signal bar with LED nodes */}
      <svg className="absolute left-3 right-3 top-9 h-5" viewBox="0 0 400 20" preserveAspectRatio="none">
        <rect x="0" y="6" width="400" height="8" rx="4" fill="#8657FF" fillOpacity="0.25" />
        <rect x="0" y="7" width="400" height="2" fill="#6A3FE0" fillOpacity="0.4" />
        <rect x="0" y="4" width="6" height="12" rx="1.5" fill="#6A3FE0" fillOpacity="0.5" />
        <rect x="394" y="4" width="6" height="12" rx="1.5" fill="#6A3FE0" fillOpacity="0.5" />
        {[60, 152, 248, 340].map((x) => (
          <g key={x}>
            <circle cx={x} cy="10" r="3.4" fill="#17E8B0" />
            <circle cx={x} cy="10" r="3.4" fill="#17E8B0" opacity="0.4">
              <animate attributeName="r" values="3.4;6;3.4" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>

      {/* Falling signal-ping field */}
      <div className="absolute inset-x-0 top-14 bottom-11 overflow-hidden">
        {pings.map((d, i) => (
          <svg
            key={i}
            className="absolute top-0"
            style={{
              left: d.left,
              width: `${d.size}px`,
              height: `${d.size}px`,
              animation: `rain-fall ${d.dur} cubic-bezier(0.55,0.05,0.7,0.45) ${d.delay} infinite`,
              filter: 'drop-shadow(0 1px 3px rgba(106,63,224,0.35))',
              transform: 'translateX(-50%)',
            }}
            viewBox="0 0 24 24"
          >
            <defs>
              <radialGradient id={`ping-${i}`} cx="35%" cy="35%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#B79CFF" />
                <stop offset="100%" stopColor="#6A3FE0" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="7" fill={`url(#ping-${i})`} />
          </svg>
        ))}
      </div>

      {/* Terminal baseline with blinking cursor */}
      <svg className="absolute bottom-9 left-3 right-3 h-3" viewBox="0 0 200 12" preserveAspectRatio="none">
        <line x1="0" y1="7" x2="200" y2="7" stroke="#6A3FE0" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 4" />
      </svg>
      <span
        className="absolute bottom-[30px] h-2.5 w-1.5 bg-primary-dark rounded-sm animate-blink"
        style={{ left: 'calc(3px + 60%)' }}
      />

      {/* Signal ripples */}
      <div className="absolute bottom-[34px] left-3 right-3 h-2">
        {ripples.map((r, i) => (
          <span
            key={i}
            className="absolute top-0 -translate-x-1/2 rounded-full border border-accent/60"
            style={{ left: r.left, width: '4px', height: '4px', animation: `rain-ripple 2.4s ease-out ${r.delay} infinite` }}
          />
        ))}
      </div>

      {/* Bottom status */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`relative h-2 w-2 rounded-full ${toneDot}`}>
            {status.tone === 'accent' && <span className={`absolute inset-0 rounded-full ${toneDot} animate-ping`} />}
          </span>
          <span key={status.text} className={`font-mono text-[10px] truncate ${toneText}`} style={{ animation: 'rain-fadein 0.35s ease-out' }}>
            {status.text}
          </span>
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-[0.2em] whitespace-nowrap pl-2 ${toneText}`}>
          {status.label}
        </span>
      </div>

      <style>{`
        @keyframes rain-fall {
          0%   { transform: translate(-50%, -10px); opacity: 0; }
          12%  { opacity: 1; }
          82%  { opacity: 1; }
          100% { transform: translate(-50%, 95px); opacity: 0; }
        }
        @keyframes rain-ripple {
          0%   { transform: translateX(-50%) scale(0.4); opacity: 0.9; }
          80%  { transform: translateX(-50%) scale(3.5); opacity: 0; }
          100% { transform: translateX(-50%) scale(3.5); opacity: 0; }
        }
        @keyframes rain-fadein {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ----------------------------------------------------------------
   Feature Card 3 — Quote Widget
---------------------------------------------------------------- */
const QUOTE_STEPS = [
  { label: 'Reading drawing…', value: '' },
  { label: 'Material', value: 'EN8 · Ø40 bar' },
  { label: 'Machining time', value: '10.5 min / part' },
  { label: 'Your price', value: '₹221 / part' },
]

function QuoteWidget() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % (QUOTE_STEPS.length + 1)), 1300)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-44 w-full bg-white border border-divider rounded-3xl p-5 overflow-hidden" aria-hidden="true">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">bracket_rev2.pdf</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary-dark bg-primary/10 px-2 py-0.5 rounded-full">
          Quote
        </span>
      </div>
      <ul className="space-y-1.5">
        {QUOTE_STEPS.slice(1).map((s, i) => (
          <li
            key={s.label}
            className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-xs transition-all duration-500 ${
              step > i + 1 ? 'bg-background opacity-100' : 'opacity-30'
            } ${i === 2 && step > 3 ? '!bg-accent/15' : ''}`}
          >
            <span className="text-muted">{s.label}</span>
            <span className={`font-mono font-semibold ${i === 2 ? 'text-accent-dark' : 'text-ink'}`}>{step > i + 1 ? s.value : '—'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[10px] text-muted">{step <= 1 ? QUOTE_STEPS[0].label : 'You decide the final price'}</p>
    </div>
  )
}

/* ----------------------------------------------------------------
   Features Section
---------------------------------------------------------------- */
function Features() {
  const sectionRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.feature-card', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', once: true },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
      })
      gsap.from('.feature-heading > *', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 95%', once: true },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced])

  const cards = [
    {
      eyebrow: '01 / Find',
      heading: 'Buyers who need your machines',
      sub: 'Researched by AI, with sources',
      text: 'Tell the agent “I have idle VMC time — find me work.” It searches for companies that outsource parts like yours and saves them with where it found them.',
      Component: BuyerShuffler,
    },
    {
      eyebrow: '02 / Reach out',
      heading: 'Emails you approve',
      sub: 'Written for each buyer',
      text: 'Short, specific emails that mention what the buyer makes and what your machines can do. You read, edit and send — from your own email.',
      Component: SignalPulse,
    },
    {
      eyebrow: '03 / Quote',
      heading: 'Quotes in minutes',
      sub: 'From the drawing',
      text: 'Upload the buyer’s drawing. The AI estimates machining time; your hour rate and margin turn it into a price. You always decide.',
      Component: QuoteWidget,
    },
  ]

  return (
    <section id="solutions" ref={sectionRef} className="relative py-28 sm:py-40 px-6 sm:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="feature-heading max-w-3xl mb-16 sm:mb-24">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">╱ What Aiventre Does</span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight">
            Find. Pitch. Quote.
            <span className="block font-serif italic font-medium text-primary-dark mt-1">While your machines run.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <article
              key={idx}
              className="feature-card group relative bg-surface border border-divider rounded-5xl p-7 hover:border-primary/40 transition-colors duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{card.eyebrow}</span>
                <ArrowUpRight
                  className="h-5 w-5 text-ink/30 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                  strokeWidth={1.8}
                />
              </div>

              <card.Component />

              <div className="mt-6">
                <h3 className="font-display font-bold text-2xl text-ink leading-tight">{card.heading}</h3>
                <p className="font-serif italic text-primary-dark text-sm mt-1">{card.sub}</p>
                <p className="text-muted text-[15px] mt-4 leading-relaxed">{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------
   CountUp
---------------------------------------------------------------- */
function CountUp({ target, duration = 1800 }) {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? target : 0))
  const elemRef = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const el = elemRef.current
    if (!el || prefersReducedMotion()) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true
            const startTime = performance.now()
            const animate = (now) => {
              const elapsed = now - startTime
              const progress = Math.min(elapsed / duration, 1)
              const eased = 1 - Math.pow(1 - progress, 3)
              setCount(Math.floor(target * eased))
              if (progress < 1) {
                requestAnimationFrame(animate)
              } else {
                setCount(target)
              }
            }
            requestAnimationFrame(animate)
          }
        })
      },
      { threshold: 0.35 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={elemRef}>{count}</span>
}

/* ----------------------------------------------------------------
   Pillars — the promises the product is built around
---------------------------------------------------------------- */
function Pillars() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const pillars = [
    {
      n: '01',
      title: 'Reach',
      target: 100,
      suffix: '+',
      label: 'buyers researched a month',
      desc: 'Real companies that buy parts like yours, each saved with the page it came from — not a bought list.',
    },
    {
      n: '02',
      title: 'Control',
      target: 0,
      suffix: '',
      label: 'emails sent without your OK',
      desc: 'The AI drafts. You read, change and send from your own email. Your name, your reputation, your decision.',
    },
    {
      n: '03',
      title: 'Speed',
      target: 24,
      suffix: 'h',
      label: 'to send a quote',
      desc: 'Buyers often go with the first sensible quote. The quote helper gets you from drawing to price the same day.',
    },
  ]

  return (
    <section id="why-aiventre" ref={ref} className="relative py-28 sm:py-40 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[44rem] rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div
          className={`flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16 sm:mb-24 transition-all duration-1000 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="max-w-2xl">
            <span className="inline-block font-mono text-xs uppercase tracking-[0.3em] text-primary-dark mb-5">╱ Built Around</span>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink leading-[1.05] tracking-tight">
              Three promises
              <span className="block font-serif italic font-medium text-primary-dark">to every shop.</span>
            </h2>
          </div>
          <p className="text-muted text-lg leading-relaxed max-w-md lg:text-right">
            The bar we build Aiventre to — and what we’ll measure together in your first month.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-divider rounded-5xl overflow-hidden border border-divider shadow-xl shadow-primary/5">
          {pillars.map((p, i) => (
            <article
              key={i}
              style={{ transitionDelay: visible ? `${i * 150}ms` : '0ms' }}
              className={`pillar-card relative bg-surface p-9 sm:p-12 group overflow-hidden transition-all duration-1000 ease-out ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="flex items-center justify-between mb-10">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                  {p.n} / {p.title}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-150 transition-all duration-500" />
              </div>

              <div className="flex items-end gap-1 leading-none">
                <span className="font-display font-extrabold text-[6rem] sm:text-[8rem] md:text-[9rem] leading-[0.85] text-ink tabular-nums tracking-tight">
                  <CountUp target={p.target} duration={1800 + i * 200} />
                </span>
                <span className="font-serif italic font-medium text-4xl sm:text-5xl md:text-6xl text-primary-dark mb-3 sm:mb-4">
                  {p.suffix}
                </span>
              </div>

              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary-dark mt-5">{p.label}</p>
              <p className="text-muted text-[15px] mt-6 leading-relaxed max-w-xs">{p.desc}</p>

              <div className="absolute bottom-0 left-9 right-9 sm:left-12 sm:right-12 h-px bg-divider overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-transparent via-primary to-transparent"
                  style={{ animation: `pillar-sweep 4s ease-in-out ${i * 0.4}s infinite` }}
                />
              </div>

              <span className="absolute top-9 right-9 sm:top-12 sm:right-12 font-mono text-[9px] uppercase tracking-widest text-primary/30">
                {p.n}
              </span>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pillar-sweep {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  )
}

/* ----------------------------------------------------------------
   Protocol visuals — small product mockups instead of stock photos
---------------------------------------------------------------- */
function MockRow({ label, value, on = true }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
      <span className="text-sm text-white/80">{label}</span>
      <span className={`font-mono text-[11px] ${on ? 'text-accent' : 'text-white/40'}`}>{value}</span>
    </div>
  )
}

function ProfileMock() {
  return (
    <div className="w-full max-w-xs space-y-2.5">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
        <FileText className="h-3.5 w-3.5" /> Capability profile
      </p>
      <MockRow label="VMC 850" value="× 2" />
      <MockRow label="CNC lathe" value="× 1" />
      <MockRow label="Materials" value="MS · EN8 · Al" />
      <MockRow label="Tolerance" value="±0.02 mm" />
      <MockRow label="Industries" value="Tractor · Auto" />
    </div>
  )
}

function BuyerMock() {
  const rows = [
    ['Tractor transmission maker', 'Pune'],
    ['Pump & valve OEM', 'Kolhapur'],
    ['Agri-equipment Tier-1', 'Nashik'],
  ]
  return (
    <div className="w-full max-w-xs space-y-2">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-white/50">Saved by the agent</p>
      {rows.map(([name, city]) => (
        <div key={name} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-ink">
          <Building2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{name}</span>
          <span className="font-mono text-[10px] text-muted">{city}</span>
        </div>
      ))}
      <p className="mx-auto w-fit rounded-full bg-accent/15 px-3 py-1 font-mono text-[10px] text-accent">3 emails drafted · review</p>
    </div>
  )
}

function ReplyMock() {
  return (
    <div className="w-full max-w-xs space-y-2.5">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
        <Inbox className="h-3.5 w-3.5" /> Reply sorted
      </p>
      <p className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px] leading-snug text-ink">
        “Please share your best price for 500 pcs as per attached drawing.”
      </p>
      <p className="mx-auto w-fit rounded-full bg-accent/15 px-3 py-1 font-mono text-[10px] text-accent">Wants a quote</p>
      <p className="rounded-2xl bg-white/10 px-3.5 py-2.5 text-[13px] leading-snug text-white/80">
        Next: run the drawing through the quote helper and reply today.
      </p>
    </div>
  )
}

/* ----------------------------------------------------------------
   Protocol — Sticky Stacking Cards
---------------------------------------------------------------- */
function Protocol() {
  const containerRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.protocol-card')
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return
        gsap.to(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top top+=100',
            endTrigger: cards[cards.length - 1],
            end: 'top top+=120',
            scrub: 1,
          },
          scale: 0.92,
          filter: 'blur(6px) saturate(0.7)',
          opacity: 0.5,
          ease: 'none',
        })
      })
    }, containerRef)
    return () => ctx.revert()
  }, [reduced])

  const steps = [
    {
      num: '01',
      title: 'Tell us about your shop',
      tagline: 'In your own words.',
      text: 'Type or paste what you have — machines, materials, what you’ve made before. Aiventre builds your capability profile. We set it up with you on the first call.',
      Visual: ProfileMock,
      meta: 'Step 1 / Profile',
    },
    {
      num: '02',
      title: 'The agent finds buyers',
      tagline: 'And drafts the emails.',
      text: 'It researches companies that buy parts like yours, saves each one with its source, and writes a short email for each. You check, edit and send.',
      Visual: BuyerMock,
      meta: 'Step 2 / Find',
    },
    {
      num: '03',
      title: 'You call, quote and win',
      tagline: 'The relationship stays yours.',
      text: 'Replies get sorted into “wants a quote”, “call me” or “not now”. The quote helper turns a drawing into a price. You make the call and close the order.',
      Visual: ReplyMock,
      meta: 'Step 3 / Win',
    },
  ]

  return (
    <section id="how-it-works" ref={containerRef} className="relative px-4 sm:px-6 py-20">
      <div className="max-w-7xl mx-auto mb-16 px-2 sm:px-10">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">╱ How It Works</span>
        <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight max-w-3xl">
          Three steps.
          <span className="block font-serif italic font-medium text-primary-dark">You stay in charge.</span>
        </h2>
      </div>

      <div className="space-y-8">
        {steps.map((step, idx) => (
          <article
            key={idx}
            className="protocol-card sticky top-24 sm:top-28 mx-auto max-w-6xl bg-gradient-to-br from-surface to-background border border-divider rounded-6xl overflow-hidden shadow-2xl shadow-primary/5"
          >
            <div className="grid lg:grid-cols-5 gap-0 min-h-[60vh] lg:min-h-[70vh]">
              <div className="lg:col-span-3 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted">{step.meta}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary-dark bg-primary/10 px-2.5 py-1 rounded-full">
                    Aiventre
                  </span>
                </div>

                <div className="my-12">
                  <span className="font-display font-extrabold text-[7rem] sm:text-[10rem] leading-none text-primary/15 -mb-4 block">
                    {step.num}
                  </span>
                  <h3 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-ink leading-[1.02] tracking-tight">
                    {step.title}
                  </h3>
                  <p className="font-serif italic text-primary-dark text-2xl sm:text-3xl mt-3">{step.tagline}</p>
                </div>

                <p className="text-muted text-base sm:text-lg leading-relaxed max-w-lg">{step.text}</p>
              </div>

              <div className="lg:col-span-2 relative overflow-hidden min-h-[340px] lg:min-h-full bg-deep flex items-center justify-center p-8">
                <div className="absolute inset-0 grid-bg opacity-20" />
                <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
                <div className="relative w-full flex justify-center">
                  <step.Visual />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------
   ServicesGrid
---------------------------------------------------------------- */
function ServicesGrid() {
  const ref = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.svc-tile', {
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.06,
      })
    }, ref)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={ref} className="relative py-24 px-6 sm:px-10 lg:px-16 bg-deep text-white overflow-hidden rounded-t-6xl">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary">╱ Everything Included</span>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl mt-4 leading-[1.05] tracking-tight">
              Idle machine,
              <span className="block font-serif italic font-medium text-primary">to purchase order.</span>
            </h2>
          </div>
          <p className="text-white/60 max-w-md text-base leading-relaxed">
            Everything between “we have spare capacity” and a signed PO — the research and paperwork done for
            you, the relationships kept by you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-4xl overflow-hidden">
          {SERVICES_FULL.map((svc, i) => {
            const Icon = svc.icon
            return (
              <div key={i} className="svc-tile group bg-deep p-7 sm:p-9 hover:bg-white/[0.02] transition-colors duration-500 relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-500">
                    <Icon className="h-5 w-5 text-primary group-hover:text-white" strokeWidth={2} />
                  </div>
                  <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="font-display font-bold text-xl sm:text-2xl mb-3">{svc.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{svc.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------
   Trust Signals
---------------------------------------------------------------- */
function TrustSignals() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const badges = [
    {
      Icon: ShieldCheck,
      title: 'You approve every email',
      text: 'Aiventre never sends anything on its own. Every email is a draft until you read it and send it from your own address.',
    },
    {
      Icon: Search,
      title: 'Real companies, real sources',
      text: 'Every buyer comes with the link where it was found. Only published business contacts — no bought lists, no guessed emails.',
    },
    {
      Icon: PhoneOff,
      title: 'No robot calls',
      text: 'Manufacturing runs on trust. The AI prepares you; you make the calls. Buyers talk to the owner, not a machine.',
    },
  ]

  return (
    <section ref={ref} className="relative py-14 sm:py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">╱ Built For Trust</span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-ink mt-3 tracking-tight">An assistant, not a spam machine.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {badges.map(({ Icon, title, text }, i) => (
            <div
              key={i}
              style={{ transitionDelay: visible ? `${i * 120}ms` : '0ms' }}
              className={`bg-white border border-divider rounded-4xl p-6 hover:border-primary/40 transition-all duration-700 ease-out shadow-sm ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <Icon className="h-6 w-6 text-primary mb-3" strokeWidth={1.8} />
              <h3 className="font-display font-bold text-lg text-ink mb-1.5">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#contact" className="magnetic-btn inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full shadow-xl shadow-primary/30">
            Join the pilot
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link to="/app" className="lift-on-hover inline-flex items-center justify-center gap-2 border border-divider bg-white text-ink font-semibold px-7 py-3.5 rounded-full">
            Open the app
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------
   Contact Form
---------------------------------------------------------------- */
const EMPTY_FORM = { name: '', shop: '', phone: '', city: '', email: '', message: '' }

const FORM_LABELS = {
  name: 'Name',
  shop: 'Shop',
  phone: 'Phone / WhatsApp',
  city: 'City',
  email: 'Email',
  message: 'Message',
}

const mailtoHref = (form) => {
  const body = Object.entries(form)
    .filter(([, v]) => v)
    .map(([k, v]) => `${FORM_LABELS[k]}: ${v}`)
    .join('\n')
  const subject = `Pilot — ${form.shop || form.name}`
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function ContactForm() {
  const [form, setForm] = useState(EMPTY_FORM)
  // idle | sending | sent | mailto | error
  const [status, setStatus] = useState('idle')

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone) return

    if (!FORM_ENDPOINT) {
      window.location.href = mailtoHref(form)
      setStatus('mailto')
      return
    }

    setStatus('sending')
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, _subject: `Pilot — ${form.shop || form.name}` }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('sent')
      setForm(EMPTY_FORM)
    } catch {
      setStatus('error')
    }
  }

  const done = status === 'sent' || status === 'mailto'

  return (
    <section id="contact" className="relative py-24 sm:py-32 px-6 sm:px-10 lg:px-16 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">╱ Pilot</span>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight">
              Machines idle
              <span className="block font-serif italic font-medium text-primary-dark">this week?</span>
            </h2>
            <p className="text-muted text-lg mt-6 leading-relaxed max-w-md">
              We’re running a pilot with a few CNC/VMC job shops and setting each one up personally. Tell us about
              your shop and we’ll call you.
            </p>

            <div className="mt-10 space-y-4">
              {CONTACT_PHONE && (
                <ContactLink href={telHref(CONTACT_PHONE)} Icon={Phone} label="Call us directly" value={CONTACT_PHONE} />
              )}
              {WHATSAPP_NUMBER && (
                <ContactLink
                  href={whatsappHref('Hi, I’d like to join the Aiventre pilot for my shop.')}
                  Icon={MessageCircle}
                  label="Chat on WhatsApp"
                  value="Message us"
                  external
                />
              )}
              <ContactLink href={`mailto:${CONTACT_EMAIL}`} Icon={Mail} label="Email us" value={CONTACT_EMAIL} />
              <div className="flex items-center gap-4">
                <span className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </span>
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Based in</span>
                  <span className="font-display font-semibold text-ink text-lg">India</span>
                </span>
              </div>
            </div>

            <div className="mt-10 p-5 rounded-3xl bg-primary/5 border border-primary/15">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary-dark mb-2">Your details</p>
              <p className="text-sm text-muted leading-relaxed">
                We only use what you send here to get in touch about Aiventre. We don’t share it with anyone.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="bg-surface border border-divider rounded-5xl p-7 sm:p-10 shadow-xl shadow-primary/5">
              {!done ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Your name" required value={form.name} onChange={set('name')} autoComplete="name" />
                    <Field label="Shop name" value={form.shop} onChange={set('shop')} autoComplete="organization" />
                    <Field label="Phone / WhatsApp" type="tel" required value={form.phone} onChange={set('phone')} autoComplete="tel" />
                    <Field label="City" value={form.city} onChange={set('city')} autoComplete="address-level2" />
                  </div>
                  <div className="mt-5">
                    <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
                  </div>

                  <div className="mt-5">
                    <label htmlFor="field-message" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2 block">
                      Your machines
                    </label>
                    <textarea
                      id="field-message"
                      value={form.message}
                      onChange={(e) => set('message')(e.target.value)}
                      rows={4}
                      placeholder="e.g. 2 VMC 850, 1 CNC lathe. Tractor and auto parts. Idle 2–3 days a week."
                      className="w-full bg-background border border-divider rounded-2xl px-4 py-3.5 text-ink placeholder-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition resize-none font-body"
                    />
                  </div>

                  {status === 'error' && (
                    <p role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      That didn’t go through. Please try again, or{' '}
                      <a href={mailtoHref(form)} className="font-semibold underline">
                        send it by email
                      </a>
                      .
                    </p>
                  )}

                  <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-xs text-muted">We’ll call you within one business day. Fields marked * are required.</p>
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full shadow-lg shadow-primary/30 disabled:opacity-50"
                    >
                      {status === 'sending' ? 'Sending…' : 'Join the pilot'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12" role="status">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-primary-dark" />
                  </div>
                  {status === 'sent' ? (
                    <>
                      <h3 className="font-display font-bold text-2xl text-ink mb-3">Thanks — we’ll be in touch</h3>
                      <p className="text-muted max-w-md mx-auto">We’ll call you within one business day to talk through your shop.</p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-display font-bold text-2xl text-ink mb-3">Almost done — hit send in your email app</h3>
                      <p className="text-muted max-w-md mx-auto">
                        We’ve filled in an email to {CONTACT_EMAIL} with your details. If nothing opened,{' '}
                        <a href={mailtoHref(form)} className="text-primary underline">
                          click here
                        </a>
                        .
                      </p>
                    </>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactLink({ href, Icon, label, value, external = false }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="lift-on-hover flex items-center gap-4 group"
    >
      <span className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary transition">
        <Icon className="h-5 w-5 text-primary group-hover:text-white" />
      </span>
      <span>
        <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
        <span className="font-display font-semibold text-ink text-lg">{value}</span>
      </span>
    </a>
  )
}

function Field({ label, type = 'text', required, value, onChange, autoComplete }) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <div>
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2 block">
        {label} {required && '*'}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-divider rounded-2xl px-4 py-3.5 text-ink placeholder-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition font-body"
      />
    </div>
  )
}

/* ----------------------------------------------------------------
   Footer
---------------------------------------------------------------- */
function Footer() {
  return (
    <footer className="relative bg-deep text-white rounded-t-6xl mt-12 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-15" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[40rem] rounded-full bg-primary/20 blur-3xl" />

      <div className="relative px-6 sm:px-10 lg:px-16 pt-20 pb-10 max-w-7xl mx-auto">
        <div className="border-b border-white/10 pb-12 mb-12">
          <h2 className="font-display font-extrabold text-5xl sm:text-7xl md:text-8xl leading-[0.92] tracking-tight">
            Idle machines?
            <span className="font-serif italic font-medium text-primary block">Let’s fill them.</span>
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-8 gap-6">
            <p className="text-white/50 max-w-md">Aiventre — the AI sales assistant for manufacturing job shops.</p>
            <a href="#contact" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full self-start sm:self-auto">
              Join the pilot
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" strokeWidth={2.4} />
              </span>
              <span className="font-display font-bold text-lg">Aiventre</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Finds buyers, drafts the emails, sorts the replies and helps you quote — so you can spend your time
              on the shop floor.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mt-6">Made for Indian job shops</p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">Product</p>
            <ul className="space-y-2.5">
              {SERVICES_FULL.slice(0, 4).map((s, i) => (
                <li key={i}>
                  <a href="#solutions" className="text-white/65 hover:text-primary transition text-sm">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">Company</p>
            <ul className="space-y-2.5">
              <li><Link to="/app" className="text-white/65 hover:text-primary transition text-sm">Open the app</Link></li>
              <li><a href="#how-it-works" className="text-white/65 hover:text-primary transition text-sm">How it Works</a></li>
              <li><a href="#contact" className="text-white/65 hover:text-primary transition text-sm">Contact</a></li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-4">Contact</p>
            <ul className="space-y-2.5">
              {CONTACT_PHONE && (
                <li>
                  <a href={telHref(CONTACT_PHONE)} className="text-white/65 hover:text-primary transition text-sm">{CONTACT_PHONE}</a>
                </li>
              )}
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-white/65 hover:text-primary transition text-sm">{CONTACT_EMAIL}</a>
              </li>
              <li className="text-white/65 text-sm">India</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
            Pilot · Onboarding our first shops
          </span>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/50 text-xs font-mono">
            <Link to="/privacy" className="hover:text-primary transition">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition">Terms</Link>
            <span>© {new Date().getFullYear()} Aiventre</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ----------------------------------------------------------------
   App
---------------------------------------------------------------- */
export default function App() {
  const { hash } = useLocation()

  useEffect(() => {
    const t1 = setTimeout(() => ScrollTrigger.refresh(), 200)
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 1000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // Arriving from another route (e.g. /app → /#contact): scroll to the section.
  useEffect(() => {
    if (!hash) return
    // Instant, not smooth: a smooth scroll gets cut short by ScrollTrigger's refresh.
    const t = setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'instant' }), 50)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <div className="relative">
      <div className="noise-overlay" />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pillars />
        <Protocol />
        <ServicesGrid />
        <TrustSignals />
        <ContactForm />
      </main>
      <Footer />
    </div>
  )
}
