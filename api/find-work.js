import { handler, HttpError, runTurn } from '../server/claude.js'
import { checkBuyers } from '../server/verify.js'

/* ----------------------------------------------------------------
   POST /api/find-work  { shop, machine, gap, known }  ->  { buyers, summary }

   The phone app's "Find work": a machine has free days coming, so the
   AI searches the web for real companies near the shop that buy that
   kind of work, and hands back a short list with a ready-to-send
   message for each. Runs entirely on the server in one request; the
   owner sends every message themselves.
---------------------------------------------------------------- */

const SYSTEM = `You are Aiventre, the sales assistant for a small Indian manufacturing job shop. One of the shop's machines has free days coming up. Find companies that could send work for that machine soon.

How to work:
- Search the web for companies that buy this kind of work: OEMs, Tier-1/Tier-2 suppliers and manufacturers whose parts need this process. Prefer companies within the shop's delivery distance, closest first. Industry association member lists, industrial-estate (MIDC, SIDCO, GIDC, etc.) directories, trade-show exhibitor lists and company websites are good sources; IndiaMART buy requirements and GeM tenders are worth a look when they fit.
- Only report real companies you found in sources. Every buyer needs a source_url you actually saw. Use only business contact details published by the company or a business directory (purchase/procurement email, general inbox, office phone, supplier-registration page). Never guess or construct an email address or phone number, and never collect personal data about individuals beyond a publicly listed business role. Leave a field empty rather than invent it.
- Skip companies in "known", and never list the shop itself. Skip companies in "avoid" (the owner found them wrong or closed) and don't rely on pages from "bad_sources" (they gave wrong results before).
- If the company's GSTIN or CIN is printed on a page you read (often in the website footer or on a directory listing), include it exactly; otherwise leave it empty. Never guess one.
- Aim for 4 to 8 good fits rather than many weak ones. Be quick: a few targeted searches, then report.
- Only report companies within delivery_distance_km of the shop (when it's a number). Closer is better.
- Always give the company's own website: the app opens its contact page itself and fills in a phone or email you couldn't reach, so spend your budget on finding the right companies rather than on contact pages.
- For each buyer write a short first message the owner can send on WhatsApp or email (under 70 words, plain Indian business English, no hype): who they are, the matching capability and machine, that it has capacity from the free date, and one clear ask (send a drawing and quantity for a quote). Sign with the owner's name and shop. No invented facts or certifications.
- When done, call report_buyers exactly once. If you found little, report what you have and say why in the summary.`

const BUYER = {
  type: 'object',
  properties: {
    company: { type: 'string' },
    city: { type: 'string' },
    distance_km: { type: 'integer', description: 'Rough road distance from the shop, from the two cities. 0 if unknown.' },
    industry: { type: 'string' },
    why_fit: { type: 'string', description: 'One sentence: what they likely buy that this machine can make.' },
    website: { type: 'string' },
    phone: { type: 'string', description: 'Published business phone only, else empty.' },
    email: { type: 'string', description: 'Published business email only, else empty.' },
    source_url: { type: 'string', description: 'Where you found this company.' },
    gstin: { type: 'string', description: 'GSTIN exactly as printed on a page you read, else empty.' },
    cin: { type: 'string', description: 'CIN exactly as printed on a page you read, else empty.' },
    state: { type: 'string', description: 'Indian state the company is in.' },
    message: { type: 'string', description: 'Ready-to-send first message.' },
  },
  required: ['company', 'city', 'state', 'distance_km', 'industry', 'why_fit', 'website', 'phone', 'email', 'source_url', 'gstin', 'cin', 'message'],
  additionalProperties: false,
}

const REPORT = {
  name: 'report_buyers',
  description: 'Hands the buyer list to the owner. Call once, at the end.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      buyers: { type: 'array', items: BUYER },
      summary: { type: 'string', description: 'One or two plain sentences for the owner: what you looked for and what to do next.' },
    },
    required: ['buyers', 'summary'],
    additionalProperties: false,
  },
}

const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '')

export default handler(async ({ shop, machine, gap, known = [], avoid = [], bad_sources = [] }) => {
  if (!shop?.name || !machine?.type) throw new HttpError(400, 'Set up the shop and pick a machine first.')

  const place = [shop.area, shop.city, shop.state].map((x) => str(x, 80)).filter(Boolean).join(', ')
  const search = {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 8,
    user_location: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata', ...(shop.city && { city: str(shop.city, 60) }), ...(shop.state && { region: str(shop.state, 60) }) },
  }
  const brief = {
    shop: {
      name: str(shop.name),
      owner: str(shop.owner),
      location: place,
      pincode: str(shop.pincode, 10),
      delivery_distance_km: Number(shop.reach) > 0 ? Number(shop.reach) : 'anywhere in India',
      kinds_of_work: Array.isArray(shop.work) ? shop.work.slice(0, 20).map((w) => str(w, 60)) : [],
      all_machines: Array.isArray(shop.machines) ? shop.machines.slice(0, 40).map((m) => `${str(m.type, 60)}${m.details ? ` (${str(m.details, 100)})` : ''}`) : [],
    },
    machine_with_free_days: { type: str(machine.type, 60), name: str(machine.name, 60), details: str(machine.details) },
    free_from: str(gap?.from, 20),
    free_days_in_next_two_weeks: Number(gap?.days) || null,
    known: Array.isArray(known) ? known.slice(0, 100).map((k) => str(k, 100)) : [],
    avoid: Array.isArray(avoid) ? avoid.slice(0, 100).map((k) => str(k, 100)) : [],
    bad_sources: Array.isArray(bad_sources) ? bad_sources.slice(0, 50).map((k) => str(k, 100)) : [],
  }

  const messages = [{ role: 'user', content: JSON.stringify(brief) }]
  // Research, then the report. If the model stops without reporting, ask once more.
  for (let attempt = 0; attempt < 2; attempt++) {
    const turn = await runTurn({
      max_tokens: 32000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'medium' },
      tools: [search, { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 6 }, REPORT],
      messages,
    })
    const report = turn.content.find((b) => b.type === 'tool_use' && b.name === 'report_buyers')
    if (report) return checked(report.input.buyers ?? [], report.input.summary ?? '', Number(shop.reach) || 0)
    if (turn.stop_reason === 'refusal') throw new HttpError(422, 'The AI declined this search.')
    messages.push({ role: 'assistant', content: turn.content })
    messages.push({ role: 'user', content: 'Now call report_buyers with what you found. An empty list is fine if nothing fits.' })
  }
  throw new HttpError(502, 'The search finished without a list. Try again.')
})

/**
 * Opens what the AI cited before the owner sees it. A buyer whose source page is gone and
 * whose website doesn't load can't be confirmed at all, so it's dropped; the rest carry
 * their checks so the app can show what was confirmed.
 */
async function checked(buyers, summary, reach) {
  // Well past the owner's delivery distance is no use, however good the fit.
  const near = buyers.filter((b) => !reach || !b.distance_km || b.distance_km <= reach * 1.5)
  const tooFar = buyers.length - near.length
  const checks = await checkBuyers(near)
  const kept = []
  let dropped = 0
  near.forEach((b, i) => {
    const c = checks[i]
    if (c && c.link === 'broken' && c.website !== 'ok') dropped++
    else kept.push({ ...b, ...c?.filled, checks: c })
  })
  return { buyers: kept, summary, dropped, tooFar }
}
