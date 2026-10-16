import { useState } from 'react'
import { Check, Copy, Loader2 } from 'lucide-react'
import { STATUSES } from './store.js'

/* ----------------------------------------------------------------
   Small shared building blocks for the app screens.
---------------------------------------------------------------- */

export function Button({ variant = 'primary', busy = false, className = '', children, ...props }) {
  const styles = {
    primary: 'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-dark',
    secondary: 'border border-divider bg-surface text-ink hover:border-primary/40',
    ghost: 'text-ink/70 hover:bg-background hover:text-ink',
    danger: 'text-red-700 hover:bg-red-50',
  }
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Card({ className = '', children }) {
  return <section className={`rounded-3xl border border-divider bg-surface p-5 sm:p-6 ${className}`}>{children}</section>
}

export function SectionTitle({ children, hint }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-bold text-ink">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </div>
  )
}

const TONES = {
  muted: 'border-divider text-muted',
  primary: 'border-primary/20 bg-primary/10 text-primary-dark',
  sky: 'border-sky-200 bg-sky-50 text-sky-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export function Badge({ tone = 'muted', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export const StatusBadge = ({ status }) => <Badge tone={STATUSES[status]?.tone}>{STATUSES[status]?.label ?? status}</Badge>

export function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-2xl border border-divider bg-background px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15'

export function Input({ label, id, ...props }) {
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <input id={id} {...props} className={inputCls} />
    </div>
  )
}

export function TextArea({ label, id, ...props }) {
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea id={id} {...props} className={`${inputCls} resize-y`} />
    </div>
  )
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      // Clipboard blocked: nothing useful to do.
    }
  }
  return (
    <Button variant="secondary" onClick={copy} type="button">
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {done ? 'Copied' : label}
    </Button>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </p>
  )
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-divider px-6 py-12 text-center">
      {Icon && <Icon className="h-8 w-8 text-primary/40" />}
      <p className="mt-3 font-display font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}
