import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Send, Sparkles } from 'lucide-react'
import { runTask } from '../api.js'
import { updateBuyer, useStore } from '../store.js'
import { Badge, Button, Card, CopyButton, ErrorNote, Label, SectionTitle, TextArea } from '../ui.jsx'

const CATEGORIES = {
  quote_request: { label: 'Wants a quote', tone: 'emerald', status: 'quote_requested' },
  callback: { label: 'Wants a call', tone: 'emerald', status: 'replied' },
  needs_info: { label: 'Needs more info', tone: 'amber', status: 'replied' },
  not_interested: { label: 'Not interested', tone: 'muted', status: 'lost' },
  out_of_office: { label: 'Out of office', tone: 'muted', status: null },
  other: { label: 'Other', tone: 'muted', status: 'replied' },
}

export default function RepliesView() {
  const buyers = useStore((s) => s.buyers)
  const profile = useStore((s) => s.profile)
  const [buyerId, setBuyerId] = useState('')
  const [reply, setReply] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)

  const buyer = buyers.find((b) => b.id === buyerId)
  // Buyers you've emailed first, then everyone else.
  const options = [...buyers].sort((a, b) => Number(b.status !== 'new') - Number(a.status !== 'new'))

  const triage = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    setApplied(false)
    try {
      setResult(await runTask('triage_reply', { reply, buyer, profile }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const apply = () => {
    const cat = CATEGORIES[result.category]
    const patch = { notes: [buyer.notes, `Reply: ${result.summary}`].filter(Boolean).join('\n') }
    if (cat.status) patch.status = cat.status
    updateBuyer(buyer.id, patch, `Reply: ${cat.label}`)
    setApplied(true)
  }

  const cat = result && CATEGORIES[result.category]

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle hint="Paste a buyer's email or WhatsApp reply. The AI tells you what it means and what to do next.">
          <span className="inline-flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" /> Sort a reply
          </span>
        </SectionTitle>
        <div className="space-y-4">
          <div>
            <Label htmlFor="r-buyer">Who replied?</Label>
            <select
              id="r-buyer"
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="w-full rounded-2xl border border-divider bg-background px-4 py-2.5 text-sm"
            >
              <option value="">Not in my list / skip</option>
              {options.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.company}
                </option>
              ))}
            </select>
          </div>
          <TextArea
            label="Their reply"
            id="r-text"
            rows={7}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Paste the reply here…"
          />
          <Button onClick={triage} busy={busy} disabled={!reply.trim()}>
            <Sparkles className="h-4 w-4" /> What does this mean?
          </Button>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      {result && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={cat.tone}>{cat.label}</Badge>
            {buyer && <span className="text-sm text-muted">from {buyer.company}</span>}
          </div>
          <p className="mt-3 text-ink">{result.summary}</p>
          <div className="mt-4 rounded-2xl bg-primary/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-dark">Next step</p>
            <p className="mt-1 text-sm text-ink">{result.next_step}</p>
          </div>

          {result.suggested_reply && (
            <div className="mt-4">
              <Label>Suggested reply (edit before sending)</Label>
              <p className="whitespace-pre-wrap rounded-2xl border border-divider bg-background p-4 text-sm text-ink">
                {result.suggested_reply}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={result.suggested_reply} />
                {buyer?.email && (
                  <a
                    href={`mailto:${buyer.email}?subject=${encodeURIComponent('Re: ' + (buyer.draft?.subject || ''))}&body=${encodeURIComponent(result.suggested_reply)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-divider px-4 py-2 text-sm font-semibold text-ink hover:border-primary/40"
                  >
                    <Send className="h-4 w-4" /> Open in email app
                  </a>
                )}
              </div>
            </div>
          )}

          {buyer && (
            <div className="mt-5 border-t border-divider pt-4">
              {applied ? (
                <p className="text-sm text-emerald-700">
                  ✓ Saved to{' '}
                  <Link to={`/app/buyers/${buyer.id}`} className="underline">
                    {buyer.company}
                  </Link>
                  .
                </p>
              ) : (
                <Button variant="secondary" onClick={apply}>
                  Update {buyer.company}
                  {cat.status ? ` → ${cat.label}` : ''}
                </Button>
              )}
            </div>
          )}
          {result.category === 'quote_request' && (
            <Link to="/app/quote" className="mt-3 inline-block text-sm font-semibold text-primary underline">
              Prepare the quote →
            </Link>
          )}
        </Card>
      )}
    </div>
  )
}
