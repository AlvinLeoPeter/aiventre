import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, Plus, Sparkles, Trash2, Upload } from 'lucide-react'
import { runTask } from '../api.js'
import { exportData, importData, mergeProfile, setProfile, useStore } from '../store.js'
import { Button, Card, ErrorNote, Input, Label, SectionTitle, TextArea } from '../ui.jsx'

const LIST_FIELDS = [
  ['capabilities', 'What you can do', 'e.g. 3-axis milling, drilling, tapping, turning'],
  ['materials', 'Materials', 'e.g. MS, EN8, EN24, aluminium, SS304'],
  ['industries', 'Industries you serve', 'e.g. tractor parts, pumps, textile machinery'],
  ['certifications', 'Certifications', 'e.g. ISO 9001:2015'],
]

const toText = (list) => list.join(', ')
const toList = (text) => text.split(',').map((x) => x.trim()).filter(Boolean)

export default function ProfileView() {
  const profile = useStore((s) => s.profile)
  const [draft, setDraft] = useState(profile)
  const [lists, setLists] = useState(() => Object.fromEntries(LIST_FIELDS.map(([k]) => [k, toText(profile[k])])))
  const [describe, setDescribe] = useState('')
  const [missing, setMissing] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  // Pick up changes made elsewhere (AI extraction, the agent, an import).
  useEffect(() => {
    setDraft(profile)
    setLists(Object.fromEntries(LIST_FIELDS.map(([k]) => [k, toText(profile[k])])))
  }, [profile])

  const field = (k) => ({
    id: `p-${k}`,
    value: draft[k] ?? '',
    onChange: (e) => setDraft((d) => ({ ...d, [k]: e.target.value })),
  })

  const setMachine = (i, k, v) =>
    setDraft((d) => ({ ...d, machines: d.machines.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }))

  const save = () => {
    setProfile({
      ...draft,
      hour_rate: Number(draft.hour_rate) || 0,
      machines: draft.machines.filter((m) => m.type?.trim()).map((m) => ({ ...m, count: Number(m.count) || 1 })),
      ...Object.fromEntries(LIST_FIELDS.map(([k]) => [k, toList(lists[k])])),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const extract = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await runTask('extract_profile', { text: describe })
      const { missing: gaps, ...rest } = result
      mergeProfile(rest, { replaceMachines: rest.machines.length > 0 })
      setMissing(gaps)
      setDescribe('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await importData(file)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle hint="Type it the way you'd say it. The AI fills in the profile below — you can edit everything after.">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Describe your shop
          </span>
        </SectionTitle>
        <TextArea
          id="describe"
          rows={4}
          value={describe}
          onChange={(e) => setDescribe(e.target.value)}
          placeholder="e.g. Sharma Precision, Chakan Pune. 2 VMC 850 (Haas), 1 CNC lathe. 30 years making tractor and auto parts for Mahindra vendors. MS, EN8, aluminium. ±0.02 mm. ISO 9001."
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={extract} busy={busy} disabled={!describe.trim()}>
            <Sparkles className="h-4 w-4" /> Fill my profile
          </Button>
          <span className="text-xs text-muted">Existing details are kept; new ones are added.</span>
        </div>
        {missing.length > 0 && (
          <div className="mt-4 rounded-2xl bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-ink">Buyers will also want to know:</p>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="This is what buyers see on your capability profile.">Shop profile</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Shop name" {...field('shop_name')} />
          <Input label="Your name" {...field('contact_name')} />
          <Input label="City" {...field('city')} />
          <Input label="State" {...field('state')} />
          <Input label="Phone" type="tel" {...field('phone')} />
          <Input label="Email" type="email" {...field('email')} />
        </div>
        <div className="mt-4">
          <TextArea label="One-line summary" rows={2} {...field('summary')} />
        </div>

        <div className="mt-6">
          <Label>Machines</Label>
          <div className="space-y-2">
            {draft.machines.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_4rem_2.5rem] gap-2 sm:grid-cols-[8rem_8rem_4.5rem_1fr_2.5rem]">
                <input
                  aria-label="Machine type"
                  value={m.type}
                  onChange={(e) => setMachine(i, 'type', e.target.value)}
                  placeholder="VMC"
                  className="rounded-xl border border-divider bg-background px-3 py-2 text-sm"
                />
                <input
                  aria-label="Model"
                  value={m.model}
                  onChange={(e) => setMachine(i, 'model', e.target.value)}
                  placeholder="Model"
                  className="rounded-xl border border-divider bg-background px-3 py-2 text-sm"
                />
                <input
                  aria-label="Count"
                  type="number"
                  min="1"
                  value={m.count}
                  onChange={(e) => setMachine(i, 'count', e.target.value)}
                  className="rounded-xl border border-divider bg-background px-3 py-2 text-sm"
                />
                <input
                  aria-label="Details"
                  value={m.details}
                  onChange={(e) => setMachine(i, 'details', e.target.value)}
                  placeholder="Bed size, travel, max part size"
                  className="order-5 col-span-4 rounded-xl border border-divider bg-background px-3 py-2 text-sm sm:order-4 sm:col-span-1"
                />
                <button
                  onClick={() => setDraft((d) => ({ ...d, machines: d.machines.filter((_, j) => j !== i) }))}
                  className="order-4 flex items-center justify-center rounded-xl text-muted hover:bg-red-50 hover:text-red-700 sm:order-5"
                  aria-label="Remove machine"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => setDraft((d) => ({ ...d, machines: [...d.machines, { type: '', model: '', count: 1, details: '' }] }))}
          >
            <Plus className="h-4 w-4" /> Add machine
          </Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {LIST_FIELDS.map(([k, label, ph]) => (
            <Input
              key={k}
              id={`p-${k}`}
              label={`${label} (comma separated)`}
              value={lists[k]}
              placeholder={ph}
              onChange={(e) => setLists((l) => ({ ...l, [k]: e.target.value }))}
            />
          ))}
          <Input label="Machine hour rate (₹) — for quotes" type="number" min="0" {...field('hour_rate')} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={save}>{saved ? 'Saved ✓' : 'Save profile'}</Button>
          <Link
            to="/app/profile/print"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-divider px-4 py-2 text-sm font-semibold text-ink hover:border-primary/40"
          >
            <FileText className="h-4 w-4" /> Capability profile (print / PDF)
          </Link>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Your data is saved in this browser only. Download a backup now and then, or to move to another computer.">
          Backup
        </SectionTitle>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}>
            <Download className="h-4 w-4" /> Download backup
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Restore from backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
        </div>
      </Card>
    </div>
  )
}
