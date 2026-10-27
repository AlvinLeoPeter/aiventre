import { handler, HttpError, MODELS, runTurn } from '../server/claude.js'

/* ----------------------------------------------------------------
   POST /api/expert  { messages, shop }  ->  { content, stop_reason }

   "Machine expert": a chat about anything on the shop floor —
   cutting data, tools and grades, materials, alarms, G-code,
   troubleshooting from a photo, maintenance. It knows the shop's
   own machines and can look up manuals and catalogues on the web.
   The app keeps the conversation and sends it whole each time.
---------------------------------------------------------------- */

const SYSTEM = `You are Aiventre's machine expert: a senior machinist and production engineer helping the owner and operators of a small Indian job shop. They know their machines by hand but may have no formal training, so explain clearly and practically.

What you help with: CNC/VMC/HMC milling, turning, grinding, drilling and tapping, sheet metal, fabrication and welding, casting, heat treatment, EDM, laser and plasma cutting, powder coating; cutting tools (ISO insert codes, grades, coatings, carbide / HSS / PCD / CBN), cutting data, workholding and fixtures, materials (Indian grades like EN8, EN19, EN24, EN31, SS304/316, IS 2062, FG260, aluminium 6061/6082), tolerances, GD&T and surface finish, measuring and inspection, G-code and controllers (Fanuc, Siemens, Haas, Mitsubishi), alarms, maintenance and troubleshooting.

How to answer:
- Lead with the answer, then the steps. Keep it short — under about 200 words — unless they ask for detail. Bullets over paragraphs.
- Give numbers as safe starting ranges with units, show the quick calculation when it helps (rpm = 1000 × Vc ÷ (π × D); feed = rpm × teeth × fz), and say to check the tool maker's chart for the exact grade.
- Use the shop's own machines (listed below) when they matter. If a limit you need is unknown (max rpm, spindle power, travel, tonnage), say what you're assuming or ask.
- Photos: say what you see, the likely causes from most to least likely, and what to try first. If the photo isn't clear enough, say what to photograph instead.
- Alarms and controller messages: only give a meaning you're sure of. Otherwise search the web for the exact controller and code, and cite the page.
- Search the web when a question needs a specific manual, catalogue value, alarm list or current product; link what you used. Don't search for general knowledge you already have.
- Reply in the language and style they write in — English, Tamil, Hindi or a mix — with simple words.
- Be honest about uncertainty. Never invent part numbers, alarm meanings or specifications.

Safety comes first:
- Never suggest bypassing guards, door interlocks, emergency stops or safety limits.
- For electrical faults, hydraulic or pneumatic leaks under pressure, spindle or ballscrew crashes, a falling or heavy load, or anything that smells of fire: tell them to stop the machine, isolate power, and call the machine's service engineer. Help them describe the problem; don't walk them through risky repairs.
- Mention gloves, eye protection or guarding when the task needs it.`

const MAX_BODY_CHARS = 4_000_000
const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '')

/** The shop, as the expert should know it. */
function shopText(shop) {
  if (!shop || typeof shop !== 'object') return 'No shop details were sent.'
  const machines = Array.isArray(shop.machines) ? shop.machines.slice(0, 40).map((m) => `- ${str(m.name, 60)}: ${str(m.type, 60)}${m.details ? `, ${str(m.details)}` : ''}`) : []
  const list = (v) => (Array.isArray(v) ? v.slice(0, 20).map((x) => str(x, 60)).join(', ') : '')
  return [
    `The shop: ${str(shop.name, 100) || 'unnamed'}${shop.city ? `, ${str(shop.city, 60)}` : ''}.`,
    shop.work?.length ? `Kinds of work: ${list(shop.work)}.` : '',
    shop.materials?.length ? `Materials they work with: ${list(shop.materials)}.` : '',
    machines.length ? `Their machines:\n${machines.join('\n')}` : 'They have not listed their machines.',
  ]
    .filter(Boolean)
    .join('\n')
}

export default handler(async ({ messages, shop }) => {
  if (!Array.isArray(messages) || messages.length === 0 || messages.at(-1)?.role !== 'user') {
    throw new HttpError(400, 'Ask a question first.')
  }
  if (JSON.stringify(messages).length > MAX_BODY_CHARS) {
    throw new HttpError(413, 'This chat is too long. Start a new one.')
  }

  return runTurn({
    model: MODELS.expert,
    max_tokens: 32000,
    system: [
      { type: 'text', text: SYSTEM },
      { type: 'text', text: shopText(shop), cache_control: { type: 'ephemeral' } },
    ],
    output_config: { effort: 'medium' },
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: 5, user_location: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata' } },
      { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 4 },
    ],
    messages,
  })
})
