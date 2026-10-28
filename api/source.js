import { handler, HttpError, runTurn } from '../server/claude.js'
import { checkOffers } from '../server/verify.js'

/* ----------------------------------------------------------------
   POST /api/source  { shop, needs }  ->  { offers, summary, tips, dropped }

   "Where do I buy this?" for the tools and material a job needs.
   The AI searches Indian suppliers (online tool stores, authorised
   distributors, local dealers, steel traders' price lists), then the
   server opens every page it cites and checks the price is really
   printed there. The owner always confirms with the supplier.
---------------------------------------------------------------- */

const SYSTEM = `You help a small Indian manufacturing job shop buy the cutting tools, consumables and raw material for a job, at a fair price, from someone reliable.

How to work:
- For each need, search for Indian suppliers that sell it: online industrial stores with listed prices, authorised distributors of genuine tool brands, local tool dealers and steel or metal traders near the shop (their city first), and current market price lists for raw material (₹ per kg).
- Prefer offers with a price printed on the page. Report a price only if you saw it on the page you cite, exactly as shown (number only, in rupees) with its unit (per piece, per kg, per metre, per box of 10…) and whether GST is included, extra, or not stated. If the page shows both an MRP and a lower selling price, report the selling price. If the page shows no price, use 0 and the supplier is still useful to ask.
- Cite the supplier's own product or listing page. A directory or search page listing many sellers (e.g. dir.indiamart.com) is only a lead: open the seller's own listing and cite that, or make sure the price you report sits in that seller's own entry, not a neighbour's.
- If the page says out of stock, "available on request" or similar, say so in the note.
- Give up to 3 offers per need: the cheapest credible one, a reliable genuine-brand one, and a local one when you find it. Never invent a supplier, price, phone or email; use only business contact details the supplier publishes. Leave a field empty rather than guess.
- Watch for fakes and mismatches: a listing for a different size, grade or coating is not a match — say so in the note or skip it. Very low prices for big-brand carbide often mean counterfeit; mention it.
- Tips (at most 4, short): practical ways to save for this job — e.g. a cheaper insert grade that is fine for this material and quantity, regrinding drills, buying bar in standard lengths, a coating worth paying for. Only things you're confident about.
- Be quick: a handful of targeted searches, then call report_offers exactly once.`

const OFFER = {
  type: 'object',
  properties: {
    need: { type: 'integer', description: 'Index of the need in the list (0-based).' },
    supplier: { type: 'string' },
    product: { type: 'string', description: 'The product as listed, with brand, size, grade.' },
    price: { type: 'number', description: 'Rupees, exactly as printed on the page you cite; 0 if not shown.' },
    unit: { type: 'string', description: 'What the price is for: "per piece", "per kg", "per box of 10"…' },
    gst: { type: 'string', enum: ['included', 'extra', 'not_stated'] },
    min_order: { type: 'string', description: 'Minimum order if stated, else empty.' },
    city: { type: 'string' },
    distance_km: { type: 'integer', description: 'Rough distance from the shop; 0 if online-only or unknown.' },
    url: { type: 'string', description: 'The product or listing page you saw.' },
    website: { type: 'string' },
    phone: { type: 'string', description: 'Published business phone only, else empty.' },
    email: { type: 'string', description: 'Published business email only, else empty.' },
    kind: { type: 'string', enum: ['online_store', 'distributor', 'local_dealer', 'manufacturer', 'marketplace', 'price_list'] },
    note: { type: 'string', description: 'One short line: delivery time, genuine-brand status, a mismatch to check. Empty if nothing.' },
  },
  required: ['need', 'supplier', 'product', 'price', 'unit', 'gst', 'min_order', 'city', 'distance_km', 'url', 'website', 'phone', 'email', 'kind', 'note'],
  additionalProperties: false,
}

const REPORT = {
  name: 'report_offers',
  description: 'Hands the supplier list to the owner. Call once, at the end.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      offers: { type: 'array', items: OFFER },
      summary: { type: 'string', description: 'One or two plain sentences: what you found and what to do next.' },
      tips: { type: 'array', items: { type: 'string' } },
    },
    required: ['offers', 'summary', 'tips'],
    additionalProperties: false,
  },
}

const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '')

export default handler(async ({ shop, needs }) => {
  const list = Array.isArray(needs) ? needs.slice(0, 12) : []
  if (!list.length) throw new HttpError(400, 'Add what you need to buy first.')

  const brief = {
    shop_location: [shop?.area, shop?.city, shop?.state].map((x) => str(x, 80)).filter(Boolean).join(', '),
    pincode: str(shop?.pincode, 10),
    needs: list.map((n, i) => ({
      index: i,
      kind: n?.kind === 'material' ? 'material' : 'tool',
      item: str(n?.item, 160),
      quantity: str(n?.qty, 60),
      for_job: str(n?.context, 160),
    })),
  }
  const search = {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 10,
    user_location: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata', ...(shop?.city && { city: str(shop.city, 60) }), ...(shop?.state && { region: str(shop.state, 60) }) },
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
    const report = turn.content.find((b) => b.type === 'tool_use' && b.name === 'report_offers')
    if (report) return checked(report.input, list.length)
    if (turn.stop_reason === 'refusal') throw new HttpError(422, 'The AI declined this search.')
    messages.push({ role: 'assistant', content: turn.content })
    messages.push({ role: 'user', content: 'Now call report_offers with what you found. An empty list is fine.' })
  }
  throw new HttpError(502, 'The search finished without a list. Try again.')
})

/**
 * Opens every cited page before the owner sees it. A dead link with a dead website is dropped;
 * the rest say whether the page loaded and whether the price is printed on it.
 */
async function checked({ offers = [], summary = '', tips = [] }, needCount) {
  const valid = offers.filter((o) => Number.isInteger(o.need) && o.need >= 0 && o.need < needCount && o.supplier)
  const checks = await checkOffers(valid)
  const kept = []
  let dropped = 0
  valid.forEach((o, i) => {
    const c = checks[i]
    if (c.page === 'broken' && c.website !== 'ok') dropped++
    else kept.push({ ...o, check: c })
  })
  return { offers: kept, summary, tips: tips.slice(0, 4), dropped }
}
