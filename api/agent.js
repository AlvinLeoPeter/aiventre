import { handler, HttpError, runTurn } from '../server/claude.js'

/* ----------------------------------------------------------------
   POST /api/agent  { messages }  ->  { content, stop_reason }

   One agent turn. Web search/fetch run on Anthropic's servers; the
   other tools act on the shop's data, which lives in the browser, so
   the browser executes them and sends the results back as the next
   request. Nothing is ever sent to a buyer from here — the agent can
   only save drafts for the owner to approve.
---------------------------------------------------------------- */

const SYSTEM = `You are Aiventre, the sales assistant for a small Indian manufacturing job shop (CNC/VMC machining and similar). The owner is busy running machines. Your job is to help them win orders: find companies that buy the kind of parts this shop can make, and prepare outreach the owner approves and sends themselves.

How you work:
- Start by calling get_shop_context to see the shop's profile and current buyer list. If the profile is missing things you need (machines, location, what they make), ask the owner briefly, or save what they tell you with update_shop_profile.
- Research buyers with web search: OEMs, Tier-1/Tier-2 suppliers, and manufacturers in industries that fit the shop (tractor and auto components, pumps and valves, agricultural equipment, textile machinery, EV, railways, defence suppliers, etc.), preferably within reasonable reach of the shop. Industry association member lists, trade-show exhibitor lists, company websites and supplier-registration pages are good sources. Government tenders on GeM and IndiaMART buy requirements are also worth checking when relevant.
- Only save real companies you found in sources. Every buyer needs a source_url. Use only business contact details published by the company itself or a business directory (general inbox, purchase/procurement email, office phone, supplier-registration page). Never guess or construct email addresses, and never collect personal data about individuals beyond a publicly listed business role. Leave a field empty rather than invent it.
- Skip companies already in the buyer list.
- Save buyers in batches with save_buyers as you find them.
- When asked to draft outreach, write short, specific, personal emails (under 150 words) that mention something real about the buyer and the shop's matching capability, with one clear ask (e.g. send a drawing for a quote). No hype, no attachments promised that don't exist. Save them with save_email_draft. You never send anything — the owner reviews and sends.
- Be honest about uncertainty. If a search turns up little, say so and suggest another angle.
- Reply to the owner in simple, plain English (short sentences; they may prefer Hinglish — follow their lead). Summarise what you did and what they should do next.`

const TOOLS = [
  {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 8,
    user_location: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata' },
  },
  { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 6 },
  {
    name: 'get_shop_context',
    description:
      "Returns the shop's profile (machines, capabilities, location, industries, certifications) and a summary of the current buyer list with each buyer's status. Call this first.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'update_shop_profile',
    description:
      "Saves details the owner told you about their shop. Only include fields you learned; they are merged into the existing profile. Machines are appended.",
    input_schema: {
      type: 'object',
      properties: {
        shop_name: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        summary: { type: 'string', description: 'One or two sentences on what the shop does best.' },
        machines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'e.g. VMC, CNC lathe, HMC, grinder' },
              model: { type: 'string' },
              count: { type: 'integer' },
              details: { type: 'string', description: 'Bed size, axis travel, max part size, etc.' },
            },
            required: ['type'],
          },
        },
        capabilities: { type: 'array', items: { type: 'string' } },
        materials: { type: 'array', items: { type: 'string' } },
        industries: { type: 'array', items: { type: 'string' } },
        certifications: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'save_buyers',
    description:
      'Adds buyer companies to the shop\'s buyer list. Duplicates (same company or website) are skipped. Returns how many were added.',
    input_schema: {
      type: 'object',
      properties: {
        buyers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              company: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              industry: { type: 'string' },
              website: { type: 'string' },
              email: { type: 'string', description: 'Published business email only. Empty if not found.' },
              phone: { type: 'string', description: 'Published business phone only. Empty if not found.' },
              contact_role: { type: 'string', description: 'e.g. Purchase department. No personal names unless publicly listed in that role.' },
              why_fit: { type: 'string', description: 'One sentence: why this company might buy from this shop.' },
              source_url: { type: 'string', description: 'Where you found this company.' },
            },
            required: ['company', 'why_fit', 'source_url'],
          },
        },
      },
      required: ['buyers'],
      additionalProperties: false,
    },
  },
  {
    name: 'save_email_draft',
    description:
      'Saves an outreach email draft on a buyer in the list for the owner to review. The owner sends it themselves.',
    input_schema: {
      type: 'object',
      properties: {
        buyer_id: { type: 'string', description: 'The id from get_shop_context.' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['buyer_id', 'subject', 'body'],
      additionalProperties: false,
    },
  },
]

const MAX_BODY_CHARS = 3_000_000

export default handler(async ({ messages }) => {
  if (!Array.isArray(messages) || messages.length === 0) throw new HttpError(400, 'messages must be a non-empty array.')
  if (JSON.stringify(messages).length > MAX_BODY_CHARS) {
    throw new HttpError(413, 'This conversation is too long. Start a new chat.')
  }

  return runTurn({
    max_tokens: 64000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    thinking: { type: 'adaptive' },
    tools: TOOLS,
    messages,
  })
})
