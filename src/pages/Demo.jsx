import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  AtSign,
  LayoutDashboard,
  MessageCircle,
  MessagesSquare,
  Moon,
  Phone,
  PhoneIncoming,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react'
import {
  CLINIC,
  dateForOffset,
  initialAppointments,
  initialConversations,
  isClosed,
  simulationScript,
} from '../demo/sampleData.js'

/* ----------------------------------------------------------------
   Tokens / helpers
---------------------------------------------------------------- */
const CHANNELS = {
  call: { label: 'Call', Icon: Phone },
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle },
  instagram: { label: 'Instagram', Icon: AtSign },
}

const SOURCES = {
  call: 'AI call',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  walkin: 'Walk-in',
  recall: 'Recall',
}

const OUTCOMES = {
  booked: { label: 'Booked', Icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'needs-you': { label: 'Needs you', Icon: AlertTriangle, cls: 'text-amber-800 bg-amber-50 border-amber-200' },
  answered: { label: 'Answered', Icon: MessagesSquare, cls: 'text-primary-dark bg-primary/10 border-primary/20' },
  rescheduled: { label: 'Rescheduled', Icon: RefreshCw, cls: 'text-sky-800 bg-sky-50 border-sky-200' },
}

const REMINDERS = {
  confirmed: { label: 'Confirmed', Icon: Check },
  sent: { label: 'Reminder sent', Icon: MessageCircle },
  scheduled: { label: 'Reminder scheduled', Icon: Clock },
}

const to12h = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}

const dayLabel = (offset) => {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  return dateForOffset(offset).toLocaleDateString('en-IN', { weekday: 'long' })
}

const shortDate = (offset) => dateForOffset(offset).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

function OutcomeBadge({ outcome }) {
  const o = OUTCOMES[outcome]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${o.cls}`}>
      <o.Icon className="h-3 w-3" strokeWidth={2.4} />
      {o.label}
    </span>
  )
}

function ChannelIcon({ channel, className = '' }) {
  const { Icon, label } = CHANNELS[channel]
  return (
    <span
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-dark ${className}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

/* ----------------------------------------------------------------
   Today view
---------------------------------------------------------------- */
function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-divider bg-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function ConversationRow({ c, onOpen, active }) {
  return (
    <button
      onClick={() => onOpen(c.id)}
      className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors ${
        active ? 'bg-primary/10' : 'hover:bg-background'
      }`}
    >
      <ChannelIcon channel={c.channel} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-display font-semibold text-ink">{c.name}</span>
          <span className="shrink-0 font-mono text-[11px] text-muted">{c.time}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{c.summary}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <OutcomeBadge outcome={c.outcome} />
          {c.afterHours && (
            <span className="inline-flex items-center gap-1 rounded-full border border-divider px-2 py-0.5 text-[11px] text-muted">
              <Moon className="h-3 w-3" /> After hours
            </span>
          )}
          <span className="rounded-full border border-divider px-2 py-0.5 text-[11px] text-muted">{c.language}</span>
        </span>
      </span>
    </button>
  )
}

function OwnerSummary({ stats, todayCount }) {
  return (
    <div className="rounded-3xl border border-divider bg-[#E7F7EF] p-5">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-800">
        <MessageCircle className="h-3.5 w-3.5" /> Daily summary · sent to you on WhatsApp
      </p>
      <div className="max-w-sm rounded-2xl rounded-tl-sm bg-white p-4 text-sm leading-relaxed text-ink shadow-sm">
        <p className="font-semibold">Good morning, Dr. Rao ☀️</p>
        <p className="mt-2">
          Since yesterday evening: <b>{stats.total}</b> enquiries, <b>{stats.booked}</b> booked,{' '}
          <b>{stats.afterHours}</b> came in after hours.
        </p>
        <p className="mt-2">
          <b>{stats.needsYou}</b> need you — a medical question and a billing complaint.
        </p>
        <p className="mt-2">
          <b>{todayCount}</b> patients on today’s calendar. Reminders are out.
        </p>
        <p className="mt-2 text-right font-mono text-[10px] text-muted">8:00 AM ✓✓</p>
      </div>
    </div>
  )
}

function TodayView({ conversations, appointments, stats, onOpenConversation, onSimulate, lastBookedId }) {
  const needsYou = conversations.filter((c) => c.outcome === 'needs-you')
  const today = appointments.filter((a) => a.day === 0).sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Enquiries" value={stats.total} hint="Calls, WhatsApp & DMs since 6 PM" />
        <StatTile label="Booked by AI" value={stats.booked} hint="Straight into your calendar" />
        <StatTile label="After hours" value={stats.afterHours} hint="Would have gone unanswered" />
        <StatTile label="Needs you" value={stats.needsYou} hint="Flagged for your staff" />
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-deep p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold">See it take a call</p>
          <p className="mt-1 max-w-md text-sm text-white/60">
            A patient with a toothache calls. Watch the AI answer in Hinglish, book a slot and send a WhatsApp
            confirmation.
          </p>
        </div>
        <button
          onClick={onSimulate}
          className="magnetic-btn inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-lg shadow-primary/30"
        >
          <PhoneIncoming className="h-4 w-4" />
          Simulate an incoming call
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="rounded-3xl border border-divider bg-surface p-4 xl:col-span-3">
          <h2 className="px-2 pb-2 pt-1 font-display text-lg font-bold text-ink">Needs you</h2>
          {needsYou.length === 0 ? (
            <p className="px-2 pb-3 text-sm text-muted">Nothing waiting on you.</p>
          ) : (
            needsYou.map((c) => <ConversationRow key={c.id} c={c} onOpen={onOpenConversation} />)
          )}
          <h2 className="px-2 pb-2 pt-5 font-display text-lg font-bold text-ink">Recent activity</h2>
          {conversations
            .filter((c) => c.outcome !== 'needs-you')
            .slice(0, 4)
            .map((c) => (
              <ConversationRow key={c.id} c={c} onOpen={onOpenConversation} />
            ))}
        </section>

        <div className="space-y-6 xl:col-span-2">
          <OwnerSummary stats={stats} todayCount={today.length} />
          <section className="rounded-3xl border border-divider bg-surface p-5">
            <h2 className="font-display text-lg font-bold text-ink">Today’s appointments</h2>
            {today.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Clinic closed today — the AI is still answering and booking.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {today.map((a) => (
                  <AppointmentItem key={a.id} a={a} compact highlight={a.id === lastBookedId} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   Conversations view
---------------------------------------------------------------- */
function Transcript({ lines }) {
  return (
    <div className="space-y-3">
      {lines.map((l, i) =>
        l.from === 'system' ? (
          <p
            key={i}
            className="mx-auto w-fit rounded-full bg-emerald-50 px-3 py-1 text-center font-mono text-[11px] text-emerald-800"
          >
            {l.text}
          </p>
        ) : (
          <div key={i} className={`flex ${l.from === 'ai' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                l.from === 'ai' ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm bg-background text-ink'
              }`}
            >
              <span className={`mb-0.5 block font-mono text-[10px] uppercase tracking-widest ${l.from === 'ai' ? 'text-white/70' : 'text-muted'}`}>
                {l.from === 'ai' ? 'Aiventre' : 'Patient'}
              </span>
              {l.text}
            </div>
          </div>
        ),
      )}
    </div>
  )
}

function ConversationsView({ conversations, selectedId, onSelect }) {
  const selected = conversations.find((c) => c.id === selectedId)

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section
        className={`rounded-3xl border border-divider bg-surface p-3 lg:col-span-2 ${selected ? 'hidden lg:block' : ''}`}
      >
        {conversations.map((c) => (
          <ConversationRow key={c.id} c={c} onOpen={onSelect} active={c.id === selectedId} />
        ))}
      </section>

      <section
        className={`rounded-3xl border border-divider bg-surface p-5 sm:p-6 lg:col-span-3 ${selected ? '' : 'hidden lg:block'}`}
      >
        {selected ? (
          <>
            <button
              onClick={() => onSelect(null)}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" /> All conversations
            </button>
            <div className="mb-5 flex items-start gap-3 border-b border-divider pb-5">
              <ChannelIcon channel={selected.channel} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold text-ink">{selected.name}</p>
                <p className="font-mono text-xs text-muted">
                  {selected.phone} · {CHANNELS[selected.channel].label} · {selected.time} · {selected.language}
                </p>
                <p className="mt-2 text-sm text-muted">{selected.summary}</p>
              </div>
              <OutcomeBadge outcome={selected.outcome} />
            </div>
            <Transcript lines={selected.transcript} />
            {selected.outcome === 'needs-you' && (
              <div className="mt-6 flex flex-wrap gap-2">
                <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Call back</button>
                <button className="rounded-full border border-divider px-4 py-2 text-sm font-medium text-ink">
                  Reply on WhatsApp
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
            <MessagesSquare className="h-8 w-8 text-primary/40" />
            <p className="mt-3 text-sm text-muted">Pick a conversation to read the full transcript.</p>
          </div>
        )}
      </section>
    </div>
  )
}

/* ----------------------------------------------------------------
   Calendar view
---------------------------------------------------------------- */
function AppointmentItem({ a, compact = false, highlight = false }) {
  const r = REMINDERS[a.reminder]
  return (
    <li
      className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${
        highlight ? 'border-primary bg-primary/5' : 'border-divider bg-surface'
      }`}
    >
      <span className="w-16 shrink-0 pt-0.5 font-mono text-xs font-semibold text-ink tabular-nums">{to12h(a.time)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display font-semibold text-ink">{a.patient}</span>
        <span className="block truncate text-sm text-muted">
          {a.treatment}
          {!compact && ` · ${a.doctor}`}
        </span>
        {!compact && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-dark">
              via {SOURCES[a.source]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-divider px-2 py-0.5 text-[11px] text-muted">
              <r.Icon className="h-3 w-3" /> {r.label}
            </span>
          </span>
        )}
      </span>
      {highlight && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">New</span>}
    </li>
  )
}

function CalendarView({ appointments, lastBookedId }) {
  const [day, setDay] = useState(0)
  const offsets = [0, 1, 2, 3, 4, 5, 6]
  const list = appointments.filter((a) => a.day === day).sort((a, b) => a.time.localeCompare(b.time))
  const closed = isClosed(dateForOffset(day))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {offsets.map((o) => {
          const n = appointments.filter((a) => a.day === o).length
          const isClosedDay = isClosed(dateForOffset(o))
          return (
            <button
              key={o}
              onClick={() => setDay(o)}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                day === o ? 'border-primary bg-primary text-white' : 'border-divider bg-surface text-ink hover:border-primary/40'
              }`}
            >
              <span className={`block font-mono text-[10px] uppercase tracking-widest ${day === o ? 'text-white/70' : 'text-muted'}`}>
                {o < 2 ? dayLabel(o) : dateForOffset(o).toLocaleDateString('en-IN', { weekday: 'short' })}
              </span>
              <span className="block font-display text-lg font-bold">{shortDate(o)}</span>
              <span className={`block text-xs ${day === o ? 'text-white/80' : 'text-muted'}`}>
                {isClosedDay ? 'Closed' : `${n} booked`}
              </span>
            </button>
          )
        })}
      </div>

      <section className="rounded-3xl border border-divider bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ink">
            {dayLabel(day)} · {shortDate(day)}
          </h2>
          <p className="font-mono text-[11px] text-muted">{CLINIC.hours}</p>
        </div>
        {closed ? (
          <p className="text-sm text-muted">Clinic closed. Calls and messages are still answered and booked into the next open day.</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted">No appointments yet.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((a) => (
              <AppointmentItem key={a.id} a={a} highlight={a.id === lastBookedId} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ----------------------------------------------------------------
   Simulated incoming call
---------------------------------------------------------------- */
function SimulationModal({ script, onClose, onBooked }) {
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const bottomRef = useRef(null)
  const bookedRef = useRef(false)

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (shown < script.lines.length) {
      const delay = shown === 0 ? 900 : Math.min(2600, 900 + script.lines[shown - 1].text.length * 18)
      const t = setTimeout(() => setShown((n) => n + 1), delay)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      if (!bookedRef.current) {
        bookedRef.current = true
        onBooked()
      }
      setDone(true)
    }, 1200)
    return () => clearTimeout(t)
  }, [shown, script, onBooked])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [shown, done])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Simulated call">
      <div className="absolute inset-0 bg-deep/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl bg-surface shadow-2xl sm:rounded-4xl">
        <div className="flex items-center gap-3 bg-deep px-5 py-4 text-white">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Phone className="h-4 w-4" />
            {!done && <span className="absolute inset-0 rounded-full ring-pulse" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold">{script.caller.name}</p>
            <p className="font-mono text-[11px] text-white/60">
              {script.caller.phone} · {done ? 'Call ended' : `AI on call · ${mm}:${ss}`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5" aria-live="polite">
          <Transcript lines={script.lines.slice(0, shown)} />
          {!done && shown < script.lines.length && (
            <p className="mt-3 font-mono text-[11px] text-muted">
              {script.lines[shown].from === 'ai' ? 'Aiventre is speaking…' : 'Patient is speaking…'}
            </p>
          )}

          {done && (
            <div className="mt-6 space-y-4">
              <p className="mx-auto w-fit rounded-full bg-emerald-50 px-3 py-1 font-mono text-[11px] text-emerald-800">
                Booked · {script.whenEn} · {script.slot.doctor}
              </p>
              <div className="rounded-3xl bg-[#E7F7EF] p-4">
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-800">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp sent to patient
                </p>
                <div className="rounded-2xl rounded-tl-sm bg-white p-3 text-sm leading-relaxed text-ink shadow-sm">
                  Hi Rohit, your appointment is confirmed ✅
                  <br />
                  🗓 {script.whenEn}
                  <br />
                  👨‍⚕️ {script.slot.doctor}
                  <br />
                  📍 {CLINIC.name}, {CLINIC.area}
                  <br />
                  Reply 1 to confirm, 2 to reschedule.
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-lg shadow-primary/30"
              >
                See it on the calendar
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   Page
---------------------------------------------------------------- */
const VIEWS = [
  { id: 'today', label: 'Today', Icon: LayoutDashboard },
  { id: 'conversations', label: 'Conversations', short: 'Chats', Icon: MessagesSquare },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
]

export default function Demo() {
  const [view, setView] = useState('today')
  const [conversations, setConversations] = useState(initialConversations)
  const [appointments, setAppointments] = useState(initialAppointments)
  const [selectedId, setSelectedId] = useState(null)
  const [simOpen, setSimOpen] = useState(false)
  const [simUsed, setSimUsed] = useState(false)
  const [lastBookedId, setLastBookedId] = useState(null)

  const script = useMemo(() => simulationScript(isClosed(dateForOffset(0))), [])

  useEffect(() => {
    document.title = 'Live demo — Aiventre'
    window.scrollTo(0, 0)
  }, [])

  const stats = useMemo(
    () => ({
      total: conversations.length,
      booked: conversations.filter((c) => c.outcome === 'booked').length,
      afterHours: conversations.filter((c) => c.afterHours).length,
      needsYou: conversations.filter((c) => c.outcome === 'needs-you').length,
    }),
    [conversations],
  )

  const handleBooked = () => {
    const id = 'sim-appt'
    const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
    // Replace any earlier run so repeat simulations don't duplicate entries.
    setAppointments((prev) => [
      ...prev.filter((a) => a.id !== id),
      { id, ...script.slot, patient: script.caller.name, source: 'call', reminder: 'sent' },
    ])
    setConversations((prev) => [
      {
        id: 'sim-conv',
        name: script.caller.name,
        phone: script.caller.phone,
        channel: 'call',
        time: now,
        afterHours: false,
        language: 'Hinglish',
        outcome: 'booked',
        summary: `Toothache — booked ${script.whenEn} with ${script.slot.doctor}.`,
        transcript: [
          ...script.lines,
          { from: 'system', text: `Booked · ${script.whenEn} · ${script.slot.doctor} · WhatsApp confirmation sent` },
        ],
      },
      ...prev.filter((c) => c.id !== 'sim-conv'),
    ])
    setLastBookedId(id)
    setSimUsed(true)
  }

  const openConversation = (id) => {
    setSelectedId(id)
    setView('conversations')
  }

  const closeSim = () => {
    setSimOpen(false)
    if (simUsed) setView('calendar')
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      {/* Demo banner */}
      <div className="bg-deep px-4 py-2.5 text-center text-xs text-white/80">
        <span className="font-mono uppercase tracking-widest text-accent">Demo</span> · Sample data for a fictional clinic.
        Nothing here is a real patient.{' '}
        <Link to="/#contact" className="font-semibold text-white underline underline-offset-2">
          Get early access
        </Link>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="border-b border-divider px-4 pb-3 pt-5 sm:px-6 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:py-8">
          <div className="flex items-center justify-between lg:block">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                <Bot className="h-5 w-5 text-white" strokeWidth={2.4} />
              </span>
              <span className="font-display text-lg font-bold">Aiventre</span>
            </Link>
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary lg:hidden">
              <ArrowLeft className="h-4 w-4" /> Site
            </Link>
          </div>

          <div className="mt-5 hidden rounded-2xl border border-divider bg-surface p-3 lg:block">
            <p className="font-display text-sm font-semibold">{CLINIC.name}</p>
            <p className="text-xs text-muted">{CLINIC.area} · {CLINIC.doctors.length} doctors</p>
          </div>

          <nav className="mt-4 grid grid-cols-3 gap-1 lg:mt-6 lg:flex lg:flex-col">
            {VIEWS.map(({ id, label, short, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-current={view === id ? 'page' : undefined}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-2 py-2 text-sm font-medium transition-colors sm:px-4 lg:justify-start lg:rounded-2xl ${
                  view === id ? 'bg-primary text-white' : 'text-ink/70 hover:bg-surface hover:text-ink'
                }`}
              >
                <Icon className="hidden h-4 w-4 sm:block" />
                <span className={short ? 'hidden sm:inline' : ''}>{label}</span>
                {short && <span className="sm:hidden">{short}</span>}
                {id === 'conversations' && stats.needsYou > 0 && (
                  <span className={`rounded-full px-1.5 text-[11px] ${view === id ? 'bg-white/20' : 'bg-amber-100 text-amber-800'}`}>
                    {stats.needsYou}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <Link
            to="/"
            className="mt-8 hidden items-center gap-1.5 text-sm text-muted hover:text-primary lg:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight">
                {VIEWS.find((v) => v.id === view).label}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <UserRound className="h-4 w-4" /> Viewing as clinic owner
            </div>
          </div>

          {view === 'today' && (
            <TodayView
              conversations={conversations}
              appointments={appointments}
              stats={stats}
              onOpenConversation={openConversation}
              onSimulate={() => setSimOpen(true)}
              lastBookedId={lastBookedId}
            />
          )}
          {view === 'conversations' && (
            <ConversationsView conversations={conversations} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          {view === 'calendar' && <CalendarView appointments={appointments} lastBookedId={lastBookedId} />}

          <div className="mt-10 flex flex-col items-start gap-4 rounded-4xl border border-primary/20 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-bold">Want this for your clinic?</p>
              <p className="text-sm text-muted">We’re setting up our first clinics now — setup is done with you.</p>
            </div>
            <Link
              to="/#contact"
              className="magnetic-btn inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white"
            >
              Get early access <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </div>

      {simOpen && <SimulationModal script={script} onClose={closeSim} onBooked={handleBooked} />}
    </div>
  )
}
