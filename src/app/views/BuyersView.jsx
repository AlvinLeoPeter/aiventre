import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { runTask } from '../api.js'
import { addBuyers, fmtDate, isFollowUpDue, markEmailed, removeBuyer, saveDraft, STATUSES, updateBuyer, useStore } from '../store.js'
import { Badge, Button, Card, CopyButton, Empty, ErrorNote, Input, Label, StatusBadge, TextArea } from '../ui.jsx'

const FILTERS = [
  { id: 'todo', label: 'To do', test: (b) => ['new', 'draft_ready'].includes(b.status) || isFollowUpDue(b) },
  { id: 'emailed', label: 'Emailed', test: (b) => b.status === 'contacted' },
  { id: 'talking', label: 'Talking', test: (b) => ['replied', 'quote_requested'].includes(b.status) },
  { id: 'done', label: 'Won / not now', test: (b) => ['won', 'lost'].includes(b.status) },
  { id: 'all', label: 'All', test: () => true },
]

const host = (url) => {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
const href = (url) => (url.startsWith('http') ? url : `https://${url}`)

/* ---------------- List ---------------- */

function TodayStrip({ buyers }) {
  const drafts = buyers.filter((b) => b.status === 'draft_ready').length
  const followUps = buyers.filter(isFollowUpDue).length
  const talking = buyers.filter((b) => ['replied', 'quote_requested'].includes(b.status)).length
  const items = [
    [drafts, 'draft', 'to review and send'],
    [followUps, 'follow-up', 'due'],
    [talking, 'buyer', 'talking to you'],
  ]
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map(([n, noun, rest]) => (
        <div key={noun} className="rounded-3xl border border-divider bg-surface p-4">
          <p className="font-display text-3xl font-extrabold tabular-nums text-ink">{n}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted">
            {noun}
            {n === 1 ? '' : 's'} {rest}
          </p>
        </div>
      ))}
    </div>
  )
}

function AddBuyerForm({ onDone }) {
  const [f, setF] = useState({ company: '', city: '', website: '', email: '', phone: '', why_fit: '' })
  const bind = (k) => ({ id: `nb-${k}`, value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) })
  return (
    <Card className="mb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!f.company.trim()) return
          addBuyers([f])
          onDone()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Company *" required {...bind('company')} />
          <Input label="City" {...bind('city')} />
          <Input label="Website" {...bind('website')} />
          <Input label="Email" type="email" {...bind('email')} />
          <Input label="Phone" type="tel" {...bind('phone')} />
          <Input label="Why they might buy from you" {...bind('why_fit')} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit">Add buyer</Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}

function BuyerList({ buyers }) {
  const [filter, setFilter] = useState('todo')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter).test
    const needle = q.trim().toLowerCase()
    return buyers
      .filter(test)
      .filter((b) => !needle || [b.company, b.city, b.industry].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => Number(isFollowUpDue(b)) - Number(isFollowUpDue(a)))
  }, [buyers, filter, q])

  if (buyers.length === 0 && !adding)
    return (
      <Empty icon={Users} title="No buyers yet">
        <p>
          Ask the{' '}
          <Link to="/app" className="font-semibold text-primary underline">
            AI agent
          </Link>{' '}
          to find companies that buy parts like yours, or add one you already know.
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add a buyer
        </Button>
      </Empty>
    )

  return (
    <div className="space-y-4">
      <TodayStrip buyers={buyers} />

      {adding && <AddBuyerForm onDone={() => setAdding(false)} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-1 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => {
            const n = buyers.filter(f.test).length
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.id ? 'bg-ink text-white' : 'text-ink/70 hover:bg-surface'
                }`}
              >
                {f.label} <span className="opacity-60">{n}</span>
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              aria-label="Search buyers"
              className="w-full rounded-full border border-divider bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {!adding && (
            <Button variant="secondary" onClick={() => setAdding(true)} aria-label="Add buyer">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nothing here right now.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((b) => (
            <li key={b.id}>
              <Link
                to={`/app/buyers/${b.id}`}
                className="flex items-start gap-3 rounded-3xl border border-divider bg-surface p-4 transition-colors hover:border-primary/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary-dark" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate font-display font-semibold text-ink">{b.company}</span>
                    <StatusBadge status={b.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">
                    {[b.industry, b.city].filter(Boolean).join(' · ') || host(b.website || '')}
                  </span>
                  {b.why_fit && <span className="mt-1 line-clamp-2 block text-sm text-ink/80">{b.why_fit}</span>}
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {isFollowUpDue(b) && <Badge tone="amber">Follow-up due</Badge>}
                    {!b.email && !b.phone && <Badge>No contact yet</Badge>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------------- Detail ---------------- */

function EmailPanel({ buyer, profile }) {
  const [subject, setSubject] = useState(buyer.draft?.subject ?? '')
  const [body, setBody] = useState(buyer.draft?.body ?? '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const followUp = buyer.status === 'contacted'

  const write = async (kind) => {
    setBusy(kind)
    setError('')
    try {
      const { subject: s, body: b } = await runTask('draft_email', { profile, buyer, kind })
      setSubject(s)
      setBody(b)
      saveDraft(buyer.id, { subject: s, body: b }, kind === 'follow_up' ? 'Follow-up drafted' : 'Email drafted')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const persist = () => {
    if (subject !== (buyer.draft?.subject ?? '') || body !== (buyer.draft?.body ?? '')) {
      saveDraft(buyer.id, { subject, body }, 'Draft edited')
    }
  }

  const mailto = `mailto:${buyer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  const hasDraft = subject.trim() || body.trim()

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">{followUp ? 'Follow-up email' : 'Email'}</h2>
        <Button variant="secondary" busy={Boolean(busy)} onClick={() => write(followUp ? 'follow_up' : 'first')}>
          <Sparkles className="h-4 w-4" /> {hasDraft ? 'Rewrite with AI' : 'Write with AI'}
        </Button>
      </div>
      <div className="space-y-3">
        <Input label="Subject" id="em-subject" value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={persist} />
        <TextArea label="Message" id="em-body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} onBlur={persist} />
      </div>
      <div className="mt-3">
        <ErrorNote>{error}</ErrorNote>
      </div>
      {hasDraft && (
        <div className="mt-4 flex flex-wrap gap-2">
          {buyer.email ? (
            <a
              href={mailto}
              onClick={persist}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25"
            >
              <Send className="h-4 w-4" /> Open in email app
            </a>
          ) : (
            <p className="w-full text-xs text-muted">No email for this buyer yet — copy the message and send it through their website’s contact form.</p>
          )}
          <CopyButton text={`${subject}\n\n${body}`} />
          <Button variant="secondary" onClick={() => markEmailed(buyer.id)}>
            ✓ I’ve sent it
          </Button>
        </div>
      )}
    </Card>
  )
}

function BuyerDetail({ buyer }) {
  const profile = useStore((s) => s.profile)
  const navigate = useNavigate()
  const [notes, setNotes] = useState(buyer.notes)

  const setField = (k) => (e) => updateBuyer(buyer.id, { [k]: e.target.value })

  return (
    <div className="space-y-4">
      <Link to="/app/buyers" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <ArrowLeft className="h-4 w-4" /> All buyers
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{buyer.company}</h1>
            <p className="text-sm text-muted">{[buyer.industry, buyer.city, buyer.state].filter(Boolean).join(' · ')}</p>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={buyer.status}
              onChange={(e) => updateBuyer(buyer.id, { status: e.target.value }, `Status → ${STATUSES[e.target.value].label}`)}
              className="rounded-full border border-divider bg-background px-3 py-1.5 text-sm"
            >
              {Object.entries(STATUSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {buyer.why_fit && <p className="mt-4 rounded-2xl bg-primary/5 p-4 text-sm text-ink">{buyer.why_fit}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input label="Email" id="b-email" type="email" defaultValue={buyer.email} onBlur={setField('email')} />
          <Input label="Phone" id="b-phone" type="tel" defaultValue={buyer.phone} onBlur={setField('phone')} />
          <Input label="Contact / department" id="b-role" defaultValue={buyer.contact_role} onBlur={setField('contact_role')} />
          <Input label="Website" id="b-web" defaultValue={buyer.website} onBlur={setField('website')} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {buyer.phone && (
            <a href={`tel:${buyer.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 rounded-full border border-divider px-3 py-1.5 hover:border-primary/40">
              <Phone className="h-4 w-4 text-primary" /> Call
            </a>
          )}
          {buyer.email && (
            <a href={`mailto:${buyer.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-divider px-3 py-1.5 hover:border-primary/40">
              <Mail className="h-4 w-4 text-primary" /> {buyer.email}
            </a>
          )}
          {buyer.website && (
            <a href={href(buyer.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-divider px-3 py-1.5 hover:border-primary/40">
              <Globe className="h-4 w-4 text-primary" /> {host(buyer.website)}
            </a>
          )}
          {buyer.source_url && (
            <a href={href(buyer.source_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-divider px-3 py-1.5 text-muted hover:border-primary/40">
              <ExternalLink className="h-4 w-4" /> Source: {host(buyer.source_url)}
            </a>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">Found by AI — check the source before you contact them.</p>
      </Card>

      <EmailPanel key={buyer.id} buyer={buyer} profile={profile} />

      <Card>
        <TextArea
          label="Notes (calls, what they make, who you spoke to)"
          id="b-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== buyer.notes && updateBuyer(buyer.id, { notes })}
        />
        <div className="mt-5">
          <Label>History</Label>
          <ul className="space-y-1.5">
            {[...buyer.history].reverse().map((h, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-14 shrink-0 font-mono text-xs text-muted">{fmtDate(h.at)}</span>
                <span className="text-ink/80">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="danger"
          className="mt-5 !px-0"
          onClick={() => {
            if (window.confirm(`Remove ${buyer.company} from your list?`)) {
              removeBuyer(buyer.id)
              navigate('/app/buyers')
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Remove buyer
        </Button>
      </Card>
    </div>
  )
}

export default function BuyersView() {
  const { id } = useParams()
  const buyers = useStore((s) => s.buyers)
  if (id) {
    const buyer = buyers.find((b) => b.id === id)
    if (!buyer)
      return (
        <Empty icon={Users} title="Buyer not found">
          <Link to="/app/buyers" className="text-primary underline">
            Back to all buyers
          </Link>
        </Empty>
      )
    return <BuyerDetail key={buyer.id} buyer={buyer} />
  }
  return <BuyerList buyers={buyers} />
}
