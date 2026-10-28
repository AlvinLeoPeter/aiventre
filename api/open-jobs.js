import { handler, HttpError, runTurn } from '../server/claude.js'
import { checkJobs, fetchedPages, openWithSearchPages } from '../server/verify.js'

/* ----------------------------------------------------------------
   POST /api/open-jobs  { shop, focus, known, today, scope }
     ->  { jobs, summary, next_steps, widened, can_widen, dropped }

   "Open jobs": work that buyers have already posted and that is
   still open — government tenders (GeM, the central portal, state
   portals) and buy requirements on B2B boards — matched to the
   shop's machines. Unlike Find work (companies that *might* need
   the shop), every result is a real request with a deadline.
   The server opens each link; expired or dead ones are dropped.

   Searching happens in two rounds the server controls: the shop's own
   state first, then — only if that found fewer than 3 jobs and there's
   time left — the rest of India. (Asking the AI to save searches for
   the second round didn't work: it spent them all on the first.)
---------------------------------------------------------------- */

const SYSTEM = `You find open jobs for a small Indian manufacturing job shop: work a buyer has already posted and that is still accepting bids or quotes.

Where to look:
- Government tenders: GeM bids (gem.gov.in), the Central Public Procurement Portal (eprocure.gov.in), and the shop's state portal (for Tamil Nadu tntenders.gov.in; for other states their e-procurement site). Public sector units, railways workshops, ordnance and defence units, and municipal bodies post machining, fabrication and spare-part jobs there. Tender aggregator pages that link to the original are fine as a starting point; prefer the original page.
- Public sector units' own tender sites, which often post drawing-based machining and spares jobs: e.g. tenders.bhel.com (BHEL Ranipet, Trichy and other units), and the tender pages of ordnance and heavy-vehicle factories, railway workshops and ports near the shop.
- Buy requirements: IndiaMART and TradeIndia buy-lead / requirement pages, and similar public RFQ posts.

Rules:
- Only report jobs that are still open on "today" (closing date today or later), and only work this shop can do with its machines and kinds of work. Say which of its machines would do it.
- Every job needs the url of the page you saw it on. Never invent a job, quantity, value, date or buyer. Leave a field empty (or 0 for numbers) when the page doesn't say.
- closing_date as YYYY-MM-DD when shown, else empty. estimated_value_inr and emd_inr in rupees, only when the page states them.
- In "to_apply", say plainly what the owner must do: e.g. "Register as a seller on GeM (needs GSTIN and Udyam)", "EMD of ₹15,000 or Udyam exemption", "Contact shown only to paid IndiaMART sellers — reply through IndiaMART".
- Skip anything in "known".
- Search only within "search_area" in the brief.
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
    },
    required: ['jobs', 'summary', 'next_steps'],
    additionalProperties: false,
  },
}

const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '')
const DAY = /^\d{4}-\d{2}-\d{2}$/

// Each round is one agent search; the second runs only if the first leaves enough of the
// function's 300 s, keeping room for the link checks.
const WIDEN_IF_FEWER = 3
const WIDEN_BEFORE_MS = 150_000

export default handler(async ({ shop, focus = '', known = [], today, scope = 'state' }) => {
  if (!shop?.name) throw new HttpError(400, 'Set up the shop first.')
  const day = DAY.test(today) ? today : new Date().toISOString().slice(0, 10)
  const state = str(shop.state, 60)
  const started = Date.now()

  const brief = {
    today: day,
    shop: {
      location: [shop.area, shop.city, shop.state].map((x) => str(x, 80)).filter(Boolean).join(', '),
      state,
      kinds_of_work: Array.isArray(shop.work) ? shop.work.slice(0, 20).map((w) => str(w, 60)) : [],
      machines: Array.isArray(shop.machines) ? shop.machines.slice(0, 40).map((m) => `${str(m.name, 60)}: ${str(m.type, 60)}${m.details ? `, ${str(m.details)}` : ''}`) : [],
      materials: Array.isArray(shop.materials) ? shop.materials.slice(0, 20).map((m) => str(m, 60)) : [],
      registered: { gstin: !!shop.gstin, udyam: !!shop.udyam },
    },
    looking_for: str(focus, 200),
    known: Array.isArray(known) ? known.slice(0, 100).map((k) => str(k, 300)) : [],
  }
  const local = state ? `${state} and nearby — this shop's own area` : 'the shop\'s own area'
  const rest = state ? `the rest of India, outside ${state}` : 'all of India'
  const pages = new Map()

  const rounds = []
  if (scope !== 'india') rounds.push(await searchRound({ ...brief, search_area: local }, shop, pages))
  const openSoFar = rounds.flatMap((r) => r.jobs).filter((j) => !(DAY.test(j.closing_date) && j.closing_date < day))
  const wanted = scope === 'india' || openSoFar.length < WIDEN_IF_FEWER
  const time = Date.now() - started < WIDEN_BEFORE_MS
  if (wanted && (scope === 'india' || time)) {
    const seen = rounds.flatMap((r) => r.jobs.map((j) => j.url))
    rounds.push(await searchRound({ ...brief, search_area: rest, known: [...brief.known, ...seen] }, shop, pages))
  }

  const widened = scope === 'india' || rounds.length > 1
  const last = rounds.at(-1)
  const result = await checked(
    {
      jobs: rounds.flatMap((r) => r.jobs),
      summary: rounds.map((r) => r.summary).filter(Boolean).join(' '),
      next_steps: last.next_steps,
    },
    day,
    pages,
  )
  // Ran out of time before the all-India round: the app offers it as a button.
  return { ...result, widened, can_widen: !widened && result.jobs.length < WIDEN_IF_FEWER }
})

/** One search for open jobs in the brief's search_area; returns what the AI reported. */
async function searchRound(brief, shop, pages) {
  const search = {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 6,
    user_location: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata', ...(shop.city && { city: str(shop.city, 60) }), ...(shop.state && { region: str(shop.state, 60) }) },
  }
  const messages = [{ role: 'user', content: JSON.stringify(brief) }]
  for (let attempt = 0; attempt < 2; attempt++) {
    const turn = await runTurn({
      max_tokens: 32000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'medium' },
      tools: [search, { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 5 }, REPORT],
      messages,
    })
    fetchedPages(turn.content, pages)
    const report = turn.content.find((b) => b.type === 'tool_use' && b.name === 'report_jobs')
    if (report) return { jobs: report.input.jobs ?? [], summary: report.input.summary ?? '', next_steps: report.input.next_steps ?? [] }
    if (turn.stop_reason === 'refusal') throw new HttpError(422, 'The AI declined this search.')
    messages.push({ role: 'assistant', content: turn.content })
    messages.push({ role: 'user', content: 'Now call report_jobs with what you found. An empty list is fine.' })
  }
  throw new HttpError(502, 'The search finished without a list. Try again.')
}

/** Drops jobs that have already closed or whose page is gone; the rest carry what the check found. */
async function checked({ jobs = [], summary = '', next_steps = [] }, day, pages) {
  const unique = [...new Map(jobs.filter((j) => j.title && j.url).map((j) => [j.url, j])).values()]
  const open = unique.filter((j) => !(DAY.test(j.closing_date) && j.closing_date < day))
  const expired = jobs.length - open.length
  const checks = await checkJobs(open, 4, openWithSearchPages(pages))
  const kept = []
  let dead = 0
  open.forEach((j, i) => {
    if (checks[i].page === 'broken') dead++
    else kept.push({ ...j, check: checks[i] })
  })
  return { jobs: kept, summary, next_steps: next_steps.slice(0, 3), dropped: dead + expired }
}
