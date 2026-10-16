import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Loader2, RotateCcw, Send, Sparkles, Wrench } from 'lucide-react'
import { runAgent } from '../api.js'
import { resetChat, useStore } from '../store.js'
import { Button } from '../ui.jsx'

const SUGGESTIONS = [
  'I have idle VMC time this week. Find me companies near my city that buy machined parts, and save them.',
  'Find 10 tractor and farm-equipment makers within 200 km that outsource machining.',
  'Check GeM and other tender sites for machining jobs I could bid on.',
  'Write first emails for my new buyers that have an email address.',
]

/* Tiny, safe markdown: paragraphs, bullet/numbered lists, **bold**, *italic*, [links](url). */
function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
    const link = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
    if (link)
      return (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
          {link[1]}
        </a>
      )
    return <Fragment key={i}>{p}</Fragment>
  })
}

function Markdown({ text }) {
  const blocks = []
  let list = null
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const item = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/)
    if (item) {
      if (!list) blocks.push((list = { type: 'list', items: [] }))
      list.items.push(item[1])
      continue
    }
    list = null
    if (!line.trim()) continue
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    blocks.push(heading ? { type: 'h', text: heading[1] } : { type: 'p', text: line })
  }
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === 'list' ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((t, j) => (
              <li key={j}>
                <Inline text={t} />
              </li>
            ))}
          </ul>
        ) : b.type === 'h' ? (
          <p key={i} className="font-semibold">
            <Inline text={b.text} />
          </p>
        ) : (
          <p key={i}>
            <Inline text={b.text} />
          </p>
        ),
      )}
    </div>
  )
}

function LogEntry({ entry }) {
  if (entry.role === 'user')
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-white">
          {entry.text}
        </div>
      </div>
    )
  if (entry.role === 'activity')
    return (
      <p className="flex items-start gap-2 pl-1 font-mono text-[11px] leading-relaxed text-muted">
        <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />
        {entry.text}
      </p>
    )
  if (entry.role === 'error')
    return <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">{entry.text}</p>
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-4 w-4 text-primary-dark" />
      </span>
      <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-sm bg-surface px-4 py-3 text-sm leading-relaxed text-ink shadow-sm ring-1 ring-divider">
        <Markdown text={entry.text} />
      </div>
    </div>
  )
}

export default function AgentView() {
  const log = useStore((s) => s.chat.log)
  const profile = useStore((s) => s.profile)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('')
  const [seconds, setSeconds] = useState(0)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [log.length, busy])

  useEffect(() => {
    if (!busy) return
    setSeconds(0)
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  const send = async (message) => {
    const m = (message ?? text).trim()
    if (!m || busy) return
    setText('')
    setBusy('Thinking…')
    try {
      await runAgent(m, { onBusy: setBusy })
    } finally {
      setBusy('')
    }
  }

  const profileEmpty = !profile.shop_name && profile.machines.length === 0

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      {profileEmpty && (
        <p className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-ink">
          Tip: fill in your{' '}
          <Link to="/app/profile" className="font-semibold text-primary underline">
            shop profile
          </Link>{' '}
          first — the agent finds much better buyers when it knows your machines and location.
        </p>
      )}

      <div className="flex-1 space-y-4" aria-live="polite">
        {log.length === 0 ? (
          <div className="py-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">What should I work on?</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              I research real companies on the web, save them to your buyer list with the source, and draft emails
              for you to approve. I never send anything myself.
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-2xl border border-divider bg-surface p-4 text-left text-sm text-ink transition-colors hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          log.map((entry, i) => <LogEntry key={i} entry={entry} />)
        )}

        {busy && (
          <p className="flex items-center gap-2 pl-1 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {busy} <span className="font-mono text-xs">{seconds}s</span>
            {seconds > 20 && <span className="text-xs">· web research can take a minute or two</span>}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] mt-6 bg-background pb-2 pt-2 lg:bottom-0"
      >
        <div className="flex items-end gap-2 rounded-3xl border border-divider bg-surface p-2 shadow-lg shadow-primary/5 focus-within:border-primary">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder="Tell the agent what you need…"
            aria-label="Message the agent"
            className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
          />
          <Button type="submit" disabled={!text.trim() || Boolean(busy)} className="h-10 w-10 !px-0" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {log.length > 0 && (
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" onClick={resetChat} disabled={Boolean(busy)} className="!py-1 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> New chat
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
