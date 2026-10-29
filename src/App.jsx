import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Calculator,
  CalendarCheck,
  Check,
  FileText,
  Hammer,
  Megaphone,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Wallet,
  Wrench,
} from 'lucide-react'

import { CONTACT_EMAIL, CONTACT_PHONE, FORM_ENDPOINT, SUPABASE_KEY, SUPABASE_URL, telHref, WHATSAPP_NUMBER, whatsappHref } from './config.js'
import './site.css'

/* ----------------------------------------------------------------
   aiventre.com — the landing page. Same look as the app: glass cards
   over a slow colour glow. The app itself lives at /app and is the
   very same code as the phone app, so every feature is there too.
---------------------------------------------------------------- */

const APP = '/app'

const PROBLEMS = [
  ['Idle machines burn money', 'A VMC still costs its EMI, rent, power and operator when it sits. An idle day earns nothing.'],
  ['Work from a few old customers', 'When one big customer cuts orders, there’s nothing to fall back on.'],
  ['No time to sell', 'Finding companies, writing to them, following up, quoting from drawings, chasing payments — all after a full day on the floor.'],
]

const FEATURES = [
  [CalendarCheck, 'Today', 'How booked the shop is, which machines are free and when, what needs you — at a glance.'],
  [Search, 'Find work', 'The AI finds real companies near you that buy your kind of parts, checks each one, and writes the first message.'],
  [Megaphone, 'Open jobs', 'Government tenders and buy requirements that fit your machines, checked by itself every few days.'],
  [Calculator, 'Quote from a drawing', 'Upload a PDF or photo: operations, machine minutes and a price from your own hour rate and margin.'],
  [Wallet, 'Money', 'GST invoices with the right CGST/SGST or IGST, sent as PDF, and gentle reminders when a payment is late.'],
  [ShieldCheck, 'Trust pack', 'Your GST, Udyam, machine and work photos and past customers, as one company profile PDF for new buyers.'],
  [MessageCircle, 'Follow-ups and replies', 'Reminders to follow up, and paste a reply to learn what it means and what to say next.'],
  [Wrench, 'Machine expert', 'Tool chipping, feeds and speeds, a machine alarm — ask about your own machines, or send a photo.'],
]

const STEPS = [
  ['Set up your shop', 'Machines, the work you do and how far you deliver. Or just describe it and the AI fills it in.'],
  ['Keep the board up to date', 'Add jobs to machines. Aiventre sees the free days coming and tells you.'],
  ['Find work for the gaps', 'One tap and the AI finds companies that need that work, with a message ready on WhatsApp or email.'],
  ['Quote, win, bill', 'Price the drawing, send the quote, bill the order and see who still owes you.'],
]

function Glow() {
  return (
    <div className="av-glow" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

function Nav() {
  return (
    <header className="av-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 20, paddingBottom: 20 }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)', flex: 1 }}>
        <span style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--primary)', color: 'var(--on-primary)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>A</span>
        <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>Aiventre</span>
      </a>
      <nav style={{ display: 'flex', gap: 22, fontSize: 15, fontWeight: 600 }} className="hidden md:flex">
        <a href="#features" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Features</a>
        <a href="#how" style={{ color: 'var(--muted)', textDecoration: 'none' }}>How it works</a>
        <a href="#pilot" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Join the pilot</a>
      </nav>
      <a href={APP} className="av-btn av-btn-primary" style={{ minHeight: 44, padding: '0 18px' }}>
        Open the app
      </a>
    </header>
  )
}

/** A still picture of the app's Today screen, drawn in the page itself. */
function PhonePreview() {
  const days = [
    ['Thu', 29, 'var(--running)'],
    ['Fri', 30, 'var(--running)'],
    ['Sat', 31, 'var(--idle)'],
    ['Sun', 1, 'var(--idle)'],
    ['Mon', 2, 'var(--idle)'],
  ]
  const machines = [
    ['VMC 1', 'Running', 'var(--running)', 'var(--running-pill)', 'Free Mon'],
    ['VMC 2', 'Idle', 'var(--idle)', 'var(--idle-pill)', '5 days free'],
    ['Lathe 1', 'Free soon', 'var(--soon)', 'var(--soon-pill)', 'Free Fri'],
    ['Lathe 2', 'Running', 'var(--running)', 'var(--running-pill)', 'Free Thu'],
  ]
  const r = 40
  const len = 2 * Math.PI * r
  return (
    <div
      role="img"
      aria-label="The Aiventre app: this week 62% booked, VMC 2 idle with 5 free days, and a button to find work for it"
      style={{ width: 'min(340px, 100%)', borderRadius: 44, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 30px 80px rgba(21,23,28,0.18)', backdropFilter: 'blur(24px)' }}>
      <div style={{ borderRadius: 32, padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 12, background: 'color-mix(in srgb, var(--ground) 70%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--primary)', color: 'var(--on-primary)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>J</span>
          <div>
            <div className="av-muted" style={{ fontSize: 11 }}>Good evening</div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Jerolin Engineering</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {days.map(([d, n, col], i) => (
            <div key={d} style={{ display: 'grid', justifyItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 12, background: i === 0 ? 'var(--surface)' : 'transparent' }}>
              <span className="av-muted" style={{ fontSize: 10, fontWeight: i === 0 ? 800 : 500 }}>{d}</span>
              <span style={{ width: 28, height: 28, borderRadius: 14, border: `2px solid ${col}`, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{n}</span>
            </div>
          ))}
        </div>
        <div className="av-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="av-muted" style={{ fontSize: 11, fontWeight: 600 }}>This week</div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              62%<span className="av-muted" style={{ fontSize: 13, letterSpacing: 0 }}> booked</span>
            </div>
            <div className="av-muted" style={{ fontSize: 11 }}>9 machine-days free</div>
          </div>
          <svg width="74" height="74" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="av-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--accent2)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--track)" strokeWidth="11" />
            <circle cx="50" cy="50" r={r} fill="none" stroke="url(#av-ring)" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${len * 0.62} ${len}`} transform="rotate(-90 50 50)" />
          </svg>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {machines.map(([name, state, ink, pill, line]) => (
            <div key={name} className="av-card" style={{ padding: 10, borderRadius: 16, display: 'grid', gap: 6, borderColor: state === 'Idle' ? 'var(--idle)' : undefined, borderWidth: state === 'Idle' ? 2 : 1 }}>
              <span style={{ fontWeight: 800, fontSize: 12 }}>{name}</span>
              <span className="av-pill" style={{ color: ink, background: pill, justifySelf: 'start', fontSize: 10 }}>{state}</span>
              <span className="av-muted" style={{ fontSize: 10 }}>{line}</span>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 18, padding: 14, color: '#fff', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>VMC 2 is free from Fri</div>
            <div style={{ fontSize: 10, opacity: 0.9 }}>5 free days · find companies that need it</div>
          </div>
          <span style={{ background: '#fff', color: '#15171c', borderRadius: 999, padding: '7px 12px', fontSize: 11, fontWeight: 800 }}>Find work</span>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="av-wrap" style={{ display: 'grid', gap: 48, alignItems: 'center', paddingTop: 40, paddingBottom: 80 }}>
      <div className="grid gap-12 md:grid-cols-[1.15fr_1fr] items-center">
        <div style={{ display: 'grid', gap: 22 }}>
          <span className="av-pill" style={{ justifySelf: 'start', color: 'var(--accent)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: 13 }}>
            For CNC, VMC and fabrication job shops
          </span>
          <h1 className="av-h1">
            Keep every machine <span className="av-grad">busy.</span>
          </h1>
          <p className="av-lead" style={{ maxWidth: 540 }}>
            Aiventre is a sales assistant for your shop. It knows when each machine will be free, finds companies that need that work, writes the
            messages, prices drawings and sends GST bills. You stay in charge: nothing goes out until you press send.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={APP} className="av-btn av-btn-accent">
              Open the app <ArrowRight size={18} />
            </a>
            <a href="#pilot" className="av-btn av-btn-secondary">
              Join the pilot
            </a>
          </div>
          <p className="av-muted" style={{ fontSize: 13, margin: 0 }}>
            Works on Android, iPhone and in your browser — the same app everywhere, your shop synced between them.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PhonePreview />
        </div>
      </div>
    </section>
  )
}

function Problems() {
  return (
    <section className="av-wrap av-reveal" style={{ paddingBottom: 80, display: 'grid', gap: 24 }}>
      <h2 className="av-h2" style={{ maxWidth: 720 }}>
        The hard part isn’t machining. It’s keeping the machines busy.
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PROBLEMS.map(([t, d]) => (
          <div key={t} className="av-card av-lift" style={{ padding: 24, display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{t}</span>
            <span className="av-muted" style={{ lineHeight: 1.55 }}>{d}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="av-wrap av-reveal" style={{ paddingBottom: 80, display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <h2 className="av-h2">Everything the shop needs to sell</h2>
        <p className="av-lead" style={{ maxWidth: 640 }}>The same app on your phone and here on the web.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([Icon, t, d]) => (
          <div key={t} className="av-card av-lift" style={{ padding: 22, display: 'grid', gap: 10, alignContent: 'start' }}>
            <span style={{ width: 42, height: 42, borderRadius: 21, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{t}</span>
            <span className="av-muted" style={{ lineHeight: 1.55, fontSize: 15 }}>{d}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function How() {
  return (
    <section id="how" className="av-wrap av-reveal" style={{ paddingBottom: 80, display: 'grid', gap: 24 }}>
      <h2 className="av-h2">How it works</h2>
      <div className="grid gap-4 md:grid-cols-4">
        {STEPS.map(([t, d], i) => (
          <div key={t} className="av-card av-lift" style={{ padding: 22, display: 'grid', gap: 10, alignContent: 'start' }}>
            <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em' }} className="av-grad">
              {i + 1}
            </span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{t}</span>
            <span className="av-muted" style={{ lineHeight: 1.55, fontSize: 15 }}>{d}</span>
          </div>
        ))}
      </div>
      <div className="av-card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span style={{ width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center', background: 'var(--running-pill)', color: 'var(--running)', flex: 'none' }}>
          <Check size={22} aria-hidden="true" />
        </span>
        <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 240 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>Honest by design</span>
          <span className="av-muted" style={{ lineHeight: 1.55 }}>
            Every company the AI suggests comes with the page it found it on, and the app opens that page and the website before you see it.
            Dead links and made-up contacts get dropped. Every message, quote and bill waits for you to press send.
          </span>
        </div>
      </div>
    </section>
  )
}

const EMPTY = { name: '', shop: '', phone: '', city: '', message: '', website: '' }

/** Saves a pilot request in the database. Throws if it didn't go in. */
async function saveRequest({ name, shop, phone, city, message }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pilot_requests`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ name: name.trim(), shop: shop.trim(), phone: phone.trim(), city: city.trim(), message: message.trim() }),
  })
  if (!res.ok) throw new Error(String(res.status))
}

function Pilot() {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | sending | sent | mailto
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const mailto = () =>
    `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Pilot — ${form.shop || form.name}`)}&body=${encodeURIComponent(
      `Name: ${form.name}\nShop: ${form.shop}\nPhone: ${form.phone}\nCity: ${form.city}\n\n${form.message}`,
    )}`

  // Saved in the database first. An email (Formspree) goes out too when one is set up; if the
  // database can't be reached, the visitor's email app is the fallback so nothing is lost.
  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    // A hidden field people can't see; bots fill it in. Look as if it worked, save nothing.
    if (form.website) return setStatus('sent')
    setStatus('sending')
    const saved = await saveRequest(form).then(
      () => true,
      () => false,
    )
    const emailed =
      !!FORM_ENDPOINT &&
      (await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, website: undefined, _subject: `Pilot — ${form.shop || form.name}` }),
      }).then(
        (r) => r.ok,
        () => false,
      ))
    if (saved || emailed) {
      setStatus('sent')
      setForm(EMPTY)
      return
    }
    window.location.href = mailto()
    setStatus('mailto')
  }

  const field = (k, label, props = {}) => (
    <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
      {label}
      <input className="av-input" value={form[k]} onChange={set(k)} {...props} />
    </label>
  )

  return (
    <section id="pilot" className="av-wrap av-reveal" style={{ paddingBottom: 80 }}>
      <div className="grid gap-8 md:grid-cols-2 items-start">
        <div style={{ display: 'grid', gap: 16 }}>
          <h2 className="av-h2">Join the pilot</h2>
          <p className="av-lead">
            We’re trying Aiventre with a few shops in Chennai first. Tell us about yours and we’ll set it up with you — free during the pilot.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {WHATSAPP_NUMBER && (
              <a href={whatsappHref('Hi, I’d like to try Aiventre for my shop.')} className="av-btn av-btn-secondary" target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> WhatsApp us
              </a>
            )}
            {CONTACT_PHONE && (
              <a href={telHref(CONTACT_PHONE)} className="av-btn av-btn-secondary">
                <Phone size={18} /> {CONTACT_PHONE}
              </a>
            )}
            <a href={`mailto:${CONTACT_EMAIL}`} className="av-btn av-btn-secondary">
              <FileText size={18} /> {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <form onSubmit={submit} className="av-card" style={{ padding: 24, display: 'grid', gap: 14 }}>
          {status === 'sent' || status === 'mailto' ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{status === 'sent' ? 'Thanks — we’ll call you soon.' : 'Your email app should have opened.'}</span>
              <span className="av-muted">{status === 'mailto' ? `If it didn’t, write to ${CONTACT_EMAIL}.` : 'Usually within a day.'}</span>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('name', 'Your name', { required: true, autoComplete: 'name' })}
                {field('shop', 'Shop name', { autoComplete: 'organization' })}
                {field('phone', 'Phone / WhatsApp', { required: true, type: 'tel', autoComplete: 'tel' })}
                {field('city', 'City / area', { autoComplete: 'address-level2' })}
              </div>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                Machines and work (optional)
                <textarea className="av-input" value={form.message} onChange={set('message')} placeholder="e.g. 2 VMCs and 2 CNC lathes, EN8 and SS parts" />
              </label>
              <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
              <button type="submit" className="av-btn av-btn-primary" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send'}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="av-wrap" style={{ paddingBottom: 40, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', fontSize: 14 }}>
      <span className="av-muted" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Hammer size={16} aria-hidden="true" /> Aiventre — made in India for job shops
      </span>
      <a href={APP} className="av-link">Open the app</a>
      <a href="/privacy" className="av-link">Privacy</a>
      <a href="/terms" className="av-link">Terms</a>
    </footer>
  )
}

/** Fades each section up the first time it scrolls into view (all at once if the browser can't tell). */
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll('.av-reveal')]
    if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('av-in'))
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('av-in')
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export default function App() {
  useReveal()
  return (
    <div className="av">
      <Glow />
      <div className="av-main">
        <Nav />
        <main>
          <Hero />
          <Problems />
          <Features />
          <How />
          <Pilot />
        </main>
        <Footer />
      </div>
    </div>
  )
}
