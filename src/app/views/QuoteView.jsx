import { useState } from 'react'
import { AlertTriangle, Calculator, FileUp, HelpCircle, Sparkles, X } from 'lucide-react'
import { runTask } from '../api.js'
import { useStore } from '../store.js'
import { Badge, Button, Card, CopyButton, ErrorNote, Input, Label, SectionTitle, TextArea } from '../ui.jsx'

const MAX_FILE_MB = 3 // base64 adds ~33%; Vercel request bodies cap at 4.5 MB
const inr = (n) => `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(new Error('Could not read the file.'))
    r.readAsDataURL(file)
  })

function List({ icon: Icon, title, items, tone = 'text-muted' }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <ul className={`list-disc space-y-1 pl-5 text-sm ${tone}`}>
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  )
}

export default function QuoteView() {
  const profile = useStore((s) => s.profile)
  const [file, setFile] = useState(null)
  const [quantity, setQuantity] = useState(100)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [est, setEst] = useState(null)
  const [ops, setOps] = useState([])
  const [setup, setSetup] = useState(0)
  const [rate, setRate] = useState(profile.hour_rate || 800)
  const [material, setMaterial] = useState(0)
  const [margin, setMargin] = useState(15)

  const pickFile = (f) => {
    setError('')
    if (!f) return setFile(null)
    if (f.size > MAX_FILE_MB * 1024 * 1024) return setError(`Please use a file under ${MAX_FILE_MB} MB (a clear photo or a 1–2 page PDF).`)
    setFile(f)
  }

  const estimate = async () => {
    setBusy(true)
    setError('')
    try {
      const payload = file ? { mediaType: file.type, data: await readAsBase64(file) } : null
      const result = await runTask('quote_assist', { file: payload, notes, quantity: Number(quantity) || 1, profile })
      setEst(result)
      setOps(result.operations)
      setSetup(result.setup_minutes)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const qty = Math.max(1, Number(quantity) || 1)
  const cycle = ops.reduce((sum, o) => sum + (Number(o.minutes_per_part) || 0), 0)
  const machinePerPart = ((cycle + (Number(setup) || 0) / qty) * (Number(rate) || 0)) / 60
  const costPerPart = machinePerPart + (Number(material) || 0)
  const pricePerPart = costPerPart * (1 + (Number(margin) || 0) / 100)

  const summary = est
    ? [
        `Part: ${est.part_summary}`,
        `Material: ${est.material}`,
        `Quantity: ${qty}`,
        `Price per part: ${inr(pricePerPart)} (total ${inr(pricePerPart * qty)})`,
        est.assumptions.length ? `Assumptions: ${est.assumptions.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle hint="The AI reads the drawing and estimates machining time. You set the rates and decide the price.">
          <span className="inline-flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Quote helper
          </span>
        </SectionTitle>

        <div className="space-y-4">
          <div>
            <Label htmlFor="q-file">Drawing (PDF or photo)</Label>
            {file ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-divider bg-background px-4 py-3 text-sm">
                <span className="truncate">{file.name}</span>
                <button onClick={() => pickFile(null)} aria-label="Remove file" className="text-muted hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="q-file"
                className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-divider px-4 py-6 text-center transition-colors hover:border-primary/50"
              >
                <FileUp className="h-6 w-6 text-primary-dark" />
                <span className="mt-2 text-sm font-semibold text-ink">Upload drawing</span>
                <span className="text-xs text-muted">PDF, JPG or PNG · under {MAX_FILE_MB} MB</span>
              </label>
            )}
            <input
              id="q-file"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Input label="Quantity" id="q-qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <TextArea
              label="Notes (optional)"
              id="q-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Material EN8, buyer wants delivery in 3 weeks, raw material supplied by buyer"
            />
          </div>
          <Button onClick={estimate} busy={busy} disabled={!file && !notes.trim()}>
            <Sparkles className="h-4 w-4" /> Estimate machining time
          </Button>
          {busy && <p className="text-xs text-muted">Reading the drawing — this can take up to a minute.</p>}
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      {est && (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">{est.part_summary}</h2>
                <p className="text-sm text-muted">{est.material}</p>
              </div>
              <Badge tone={est.fits_shop === 'yes' ? 'emerald' : est.fits_shop === 'maybe' ? 'amber' : 'muted'}>
                {est.fits_shop === 'yes' ? 'Fits your machines' : est.fits_shop === 'maybe' ? 'Might fit' : 'Probably not a fit'}
              </Badge>
            </div>
            {est.fit_reason && <p className="mt-2 text-sm text-ink/80">{est.fit_reason}</p>}
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <List icon={Sparkles} title="Key features" items={est.key_features} tone="text-ink/80" />
              <List icon={AlertTriangle} title="Critical tolerances" items={est.critical_tolerances} tone="text-ink/80" />
            </div>
          </Card>

          <Card>
            <SectionTitle hint="Change any number — the price updates instantly.">Time &amp; price</SectionTitle>
            <div className="space-y-2">
              {ops.map((o, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-background px-4 py-2.5">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block text-ink">{o.operation}</span>
                    <span className="block text-xs text-muted">{o.machine}</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    aria-label={`Minutes per part for ${o.operation}`}
                    value={o.minutes_per_part}
                    onChange={(e) => setOps(ops.map((x, j) => (j === i ? { ...x, minutes_per_part: e.target.value } : x)))}
                    className="w-20 rounded-xl border border-divider bg-surface px-2 py-1.5 text-right text-sm tabular-nums"
                  />
                  <span className="w-12 text-xs text-muted">min/part</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input label="Setup (min, one-time)" id="q-setup" type="number" min="0" value={setup} onChange={(e) => setSetup(e.target.value)} />
              <Input label="Machine rate ₹/hour" id="q-rate" type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
              <Input label="Material ₹/part" id="q-mat" type="number" min="0" value={material} onChange={(e) => setMaterial(e.target.value)} />
              <Input label="Margin %" id="q-margin" type="number" min="0" value={margin} onChange={(e) => setMargin(e.target.value)} />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 rounded-3xl bg-deep p-5 text-white sm:grid-cols-4">
              {[
                ['Cycle time', `${Math.round(cycle * 10) / 10} min`],
                ['Cost / part', inr(costPerPart)],
                ['Price / part', inr(pricePerPart)],
                [`Total × ${qty}`, inr(pricePerPart * qty)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{k}</dt>
                  <dd className="mt-1 font-display text-xl font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <CopyButton text={summary} label="Copy quote summary" />
            </div>
          </Card>

          <Card>
            <div className="grid gap-5 sm:grid-cols-2">
              <List icon={HelpCircle} title="Ask the buyer before quoting" items={est.questions_for_buyer} tone="text-ink/80" />
              <List icon={AlertTriangle} title="Risks" items={est.risks} />
            </div>
            <div className="mt-5">
              <List icon={Calculator} title="Assumptions the AI made" items={est.assumptions} />
            </div>
            <p className="mt-5 text-xs text-muted">AI estimates can be wrong. Check the times against your own experience before sending a price.</p>
          </Card>
        </>
      )}
    </div>
  )
}
