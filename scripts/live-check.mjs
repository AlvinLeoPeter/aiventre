#!/usr/bin/env node
/* ----------------------------------------------------------------
   Runs the live AI features once each against the deployed server,
   for a sample Chennai VMC shop, and checks what comes back:
   every link is opened, closing dates are compared with today.

     AIVENTRE_ACCESS_CODE=… node scripts/live-check.mjs [open-jobs|find-work|expert|all]

   Behind an HTTPS proxy (e.g. a cloud sandbox), add NODE_USE_ENV_PROXY=1
   so Node's fetch uses it.

   Each run spends real API credits (one search each), so run one
   feature at a time while tuning. Raw results are saved to
   live-results/ (git-ignored) for a closer look.
---------------------------------------------------------------- */
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = (process.env.AIVENTRE_URL || 'https://aiventre.vercel.app').replace(/\/$/, '')
const CODE = process.env.AIVENTRE_ACCESS_CODE
const which = process.argv[2] || 'open-jobs'
const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10) // India date

// A made-up shop like the ones Aiventre is for — not a real company.
const shop = {
  name: 'Sample Precision Works',
  owner: 'Kumar',
  area: 'Ambattur Industrial Estate',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600058',
  reach: 150,
  work: ['CNC / VMC machining', 'CNC turning'],
  materials: ['EN8', 'MS', 'Aluminium 6061', 'SS304'],
  gstin: '',
  udyam: '',
  machines: [
    { name: 'VMC 1', type: 'VMC', details: '850 × 500 × 500 mm travel, 8000 rpm' },
    { name: 'VMC 2', type: 'VMC', details: '1050 mm travel' },
    { name: 'CNC lathe 1', type: 'CNC lathe', details: 'Ø300 swing, 8" chuck' },
    { name: 'CNC lathe 2', type: 'CNC lathe', details: 'Ø250 swing' },
  ],
}

async function call(path, body) {
  const t0 = Date.now()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-access-code': CODE },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(310_000),
  })
  const data = await res.json().catch(() => ({}))
  const secs = Math.round((Date.now() - t0) / 1000)
  if (!res.ok) throw new Error(`${path} → ${res.status} after ${secs}s: ${data.error || 'no error message'}`)
  return { data, secs }
}

/** Opens a link from here, as a second opinion on the server's own check. */
async function opens(url) {
  if (!url) return 'no link'
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'Mozilla/5.0 (live-check)' } })
    return String(res.status)
  } catch (e) {
    return `failed (${e.cause?.code || e.name})`
  }
}

function save(name, data) {
  mkdirSync('live-results', { recursive: true })
  const file = `live-results/${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(file, JSON.stringify(data, null, 2))
  return file
}

const CHECKS = {
  async 'open-jobs'() {
    const { data, secs } = await call('/api/open-jobs', { shop, focus: '', known: [], today })
    console.log(`Open jobs: ${data.jobs.length} in ${secs}s · dropped ${data.dropped} · widened ${data.widened}`)
    console.log(`Summary: ${data.summary}`)
    for (const j of data.jobs) {
      const closed = /^\d{4}-\d{2}-\d{2}$/.test(j.closing_date) && j.closing_date < today
      console.log(`\n• ${j.title}\n  ${j.kind} · ${j.portal} · ${j.buyer} · ${j.location || j.state}`)
      console.log(`  qty ${j.quantity || '?'} · ${j.material || '?'} · closes ${j.closing_date || '?'}${closed ? ' ⚠ ALREADY CLOSED' : ''} · value ₹${j.estimated_value_inr || '?'} · EMD ₹${j.emd_inr || '?'} · fit ${j.fit}`)
      console.log(`  server check: ${j.check?.page} · from here: ${await opens(j.url)} · ${j.url}`)
    }
    console.log(`\nNext steps: ${data.next_steps.join(' | ')}`)
    return data
  },

  async 'find-work'() {
    const machine = shop.machines[0]
    const { data, secs } = await call('/api/find-work', { shop, machine, gap: { from: today, days: 6 }, known: [] })
    console.log(`Find work: ${data.buyers.length} buyers in ${secs}s · dropped ${data.dropped} · too far ${data.tooFar}`)
    console.log(`Summary: ${data.summary}`)
    for (const b of data.buyers) {
      const c = b.checks || {}
      console.log(`\n• ${b.company} · ${b.city} · ~${b.distance_km} km · ${b.industry}`)
      console.log(`  checks: link ${c.link} · website ${c.website} · email ${c.email} · phone ${c.phone} · registration ${c.registration ? `${c.registration.kind}${c.registration.invalid ? ' (invalid)' : ''}` : 'none'} · passed ${c.passed}/3`)
      console.log(`  website from here: ${await opens(b.website && (/^https?:/.test(b.website) ? b.website : `https://${b.website}`))} · source: ${b.source_url}`)
    }
    return data
  },

  async expert() {
    const q = 'What cutting speed and feed should I start with for a Ø10 carbide end mill slotting EN8 on my VMC 1? Give rpm and feed.'
    const { data, secs } = await call('/api/expert', { messages: [{ role: 'user', content: q }], shop })
    const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    const searches = data.content.filter((b) => b.type === 'server_tool_use').length
    console.log(`Expert: ${secs}s · ${searches} web look-ups · stop ${data.stop_reason}\n\n${text}`)
    return data
  },
}

if (!CODE) {
  console.error('Set AIVENTRE_ACCESS_CODE first (the app access code).')
  process.exit(1)
}
const names = which === 'all' ? Object.keys(CHECKS) : [which]
for (const name of names) {
  if (!CHECKS[name]) {
    console.error(`Unknown check "${name}". Use one of: ${Object.keys(CHECKS).join(', ')}, all`)
    process.exit(1)
  }
  console.log(`\n=== ${name} (${today}) ===`)
  try {
    const data = await CHECKS[name]()
    console.log(`\nSaved: ${save(name, data)}`)
  } catch (e) {
    console.error(`✗ ${e.message}`)
    process.exitCode = 1
  }
}
