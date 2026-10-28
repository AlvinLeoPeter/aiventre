import { handler, HttpError, runTurn } from '../server/claude.js'
import { checkJobs } from '../server/verify.js'

/* ----------------------------------------------------------------
   POST /api/open-jobs  { shop, focus, known, today }  ->  { jobs, summary, next_steps, widened, dropped }

   "Open jobs": work that buyers have already posted and that is
   still open — government tenders (GeM, the central portal, state
   portals) and buy requirements on B2B boards — matched to the
   shop's machines. Unlike Find work (companies that *might* need
   the shop), every result is a real request with a deadline.
   The server opens each link; expired or dead ones are dropped.
---------------------------------------------------------------- */

const SYSTEM = `You find open jobs for a small Indian manufacturing job shop: work a buyer has already posted and that is still accepting bids or quotes.

Where to look:
- Government tenders: GeM bids (gem.gov.in), the Central Public Procurement Portal (eprocure.gov.in), and the shop's state portal (for Tamil Nadu tntenders.gov.in; for other states their e-procurement site). Public sector units, railways workshops, ordnance and defence units, and municipal bodies post machining, fabrication and spare-part jobs there. Tender aggregator pages that link to the original are fine as a starting point; prefer the original page.
- Buy requirements: IndiaMART and TradeIndia buy-lead / requirement pages, and similar public RFQ posts.

Rules:
- Only report jobs that are still open on "today" (closing date today or later), and only work this shop can do with its machines and kinds of work. Say which of its machines would do it.
- Every job needs the url of the page you saw it on. Never invent a job, quantity, value, date or buyer. Leave a field empty (or 0 for numbers) when the page doesn't say.
- closing_date as YYYY-MM-DD when shown, else empty. estimated_value_inr and emd_inr in rupees, only when the page states them.
- In "to_apply", say plainly what the owner must do: e.g. "Register as a seller on GeM (needs GSTIN and Udyam)", "EMD of ₹15,000 or Udyam exemption", "Contact shown only to paid IndiaMART sellers — reply through IndiaMART".
- Skip anything in "known".
- Prefer the shop's state and nearby; if you find fewer than 3 good jobs there, widen to the rest of India and set widened to true.
- Aim for up to 8 good matches; quality over quantity. Then call report_jobs exactly once.
- If you find nothing open that fits, report an empty list and use next_steps to say honestly what to try instead (e.g. register on GeM to see more bids, set up IndiaMART seller alerts for a product, use Find work to approach companies directly).`

const JOB = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'What is wanted, e.g. "Supply of machined flanges, EN8, as per drawing".' },
    buyer: { type: 'string', description: 'Who posted it, as shown.' },
    kind: { type: 'string', enum: ['tender', 'buy_requirement', 'rfq'] },
    portal: { type: 'string', description: 'e.g. GeM, CPPP, TN Tenders, IndiaMART.' },
    url: { type: 'string' },
    reference: { type: 'string', description: 'Bid or tender number if shown, else empty.' },
    location: { type: 'string', description: 'City or delivery place.' },
    state: { type: 'string' },
    quantity: { type: 'string' },
    material: { type: 'string' },
    closing_date: { type: 'string' },
    estimated_value_inr: { type: 'number' },
    emd_inr: { type: 'number' },
    fit: { type: 'string', enum: ['good', 'maybe'] },
    why_fit: { type: 'string', description: 'One sentence, naming the shop machine that would do it.' },
    to_apply: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'buyer', 'kind', 'portal', 'url', 'reference', 'location', 'state', 'quantity', 'material', 'closing_date', 'estimated_value_inr', 'emd_inr', 'fit', 'why_fit', 'to_apply'],
  additionalProperties: false,
}

const REPORT = {
  name: 'report_jobs',
  description: 'Hands the open jobs to the owner. Call once, at the end.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      jobs: { type: 'array', items: JOB },
      summary: { type: 'string', description: 'One or two plain sentences on what you found.' },
      next_steps: { type: 'array', items: { type: 'string' }, description: 'Up to 3 short, practical suggestions, most useful first.' },
      widened: { type: 'boolean', description: 'True if you searched beyond the shop’s state.' },
    },
    required: ['jobs', 'summary', 'next_steps', 'widened'],
    additionalProperties: false,
  },
}

const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '')
const DAY = /^\d{4}-\d{2}-\d{2}$/

export default handler(async ({ shop, focus = '', known = [], today }) => {
  if (!shop?.name) throw new HttpError(400, 'Set up the shop first.')
  const day = DAY.test(today) ? today : new Date().toISOString().slice(0, 10)

  const brief = {
    today: day,
    shop: {
      location: [shop.area, shop.city, shop.state].map((x) => str(x, 80)).filter(Boolean).join(', '),
      state: str(shop.state, 60),
      kinds_of_work: Array.isArray(shop.work) ? shop.work.slice(0, 20).map((w) => str(w, 60)) : [],
      machines: Array.isArray(shop.machines) ? shop.machines.slice(0, 40).map((m) => `${str(m.name, 60)}: ${str(m.type, 60)}${m.details ? `, ${str(m.details)}` : ''}`) : [],
      materials: Array.isArray(shop.materials) ? shop.materials.slice(0, 20).map((m) => str(m, 60)) : [],
      registered: { gstin: !!shop.gstin, udyam: !!shop.udyam },
    },
    looking_for: str(focus, 200),
    known: Array.isArray(known) ? known.slice(0, 100).map((k) => str(k, 300)) : [],
  }
  const search = {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 10,
    user_location: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata', ...(shop.city && { city: str(shop.city, 60) }), ...(shop.state && { region: str(shop.state, 60) }) },
  }

  const messages = [{ role: 'user', content: JSON.stringify(brief) }]
  for (let attempt = 0; attempt < 2; attempt++) {
    const turn = await runTurn({
      max_tokens: 32000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'medium' },
      tools: [search, { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 8 }, REPORT],
      messages,
    })
    const report = turn.content.find((b) => b.type === 'tool_use' && b.name === 'report_jobs')
    if (report) return checked(report.input, day)
    if (turn.stop_reason === 'refusal') throw new HttpError(422, 'The AI declined this search.')
    messages.push({ role: 'assistant', content: turn.content })
    messages.push({ role: 'user', content: 'Now call report_jobs with what you found. An empty list is fine.' })
  }
  throw new HttpError(502, 'The search finished without a list. Try again.')
})

/** Drops jobs that have already closed or whose page is gone; the rest carry what the check found. */
async function checked({ jobs = [], summary = '', next_steps = [], widened = false }, day) {
  const open = jobs.filter((j) => j.title && j.url && !(DAY.test(j.closing_date) && j.closing_date < day))
  const expired = jobs.length - open.length
  const checks = await checkJobs(open)
  const kept = []
  let dead = 0
  open.forEach((j, i) => {
    if (checks[i].page === 'broken') dead++
    else kept.push({ ...j, check: checks[i] })
  })
  return { jobs: kept, summary, next_steps: next_steps.slice(0, 3), widened: !!widened, dropped: dead + expired }
}
