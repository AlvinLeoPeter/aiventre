import { handler, HttpError, runStructured } from '../server/claude.js'

/* ----------------------------------------------------------------
   POST /api/task  { task, input }  ->  JSON

   Single-step AI jobs with a fixed output shape:
   - extract_profile: owner's free-text description -> structured shop profile
   - draft_email:     shop profile + buyer -> outreach or follow-up email
   - triage_reply:    a buyer's reply -> what it means + next step
   - quote_assist:    drawing + notes -> machining estimate (owner decides price)
---------------------------------------------------------------- */

const str = { type: 'string' }
const strList = { type: 'array', items: str }
const obj = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
})

const SHOP_VOICE =
  'You help a small Indian manufacturing job shop (CNC/VMC machining) win orders. Be concrete and honest; never invent facts about the shop or the buyer.'

const TASKS = {
  extract_profile: {
    effort: 'low',
    schema: obj({
      shop_name: str,
      city: str,
      state: str,
      summary: str,
      machines: {
        type: 'array',
        items: obj({ type: str, model: str, count: { type: 'integer' }, details: str }),
      },
      capabilities: strList,
      materials: strList,
      industries: strList,
      certifications: strList,
      missing: { ...strList, description: 'Useful profile details the owner did not mention.' },
    }),
    build: ({ text }) => {
      if (!text?.trim()) throw new HttpError(400, 'Describe your shop first.')
      return {
        system: `${SHOP_VOICE} Turn the owner's description of their shop into a clean profile. Use empty strings or empty lists for anything not mentioned — do not guess. Normalise machine names (e.g. "vmc 850" -> type "VMC", model "850"). Write the summary as one or two sentences a purchase manager would find useful. In "missing", list the most useful details still missing (e.g. max part size, tolerances, quality certifications, monthly capacity).`,
        content: text.slice(0, 20000),
      }
    },
  },

  draft_email: {
    effort: 'medium',
    schema: obj({ subject: str, body: str }),
    build: ({ profile, buyer, kind = 'first', notes = '' }) => {
      if (!buyer?.company) throw new HttpError(400, 'Pick a buyer first.')
      const followUp = kind === 'follow_up'
      return {
        system: `${SHOP_VOICE} Write a ${followUp ? 'short, polite follow-up to an earlier email that got no reply' : 'first outreach email from the shop owner to a potential buyer'}. Under ${followUp ? 80 : 150} words. Plain, respectful Indian business English. Mention one specific, true reason the shop fits this buyer, and one clear ask (e.g. "send a drawing and quantity and we'll quote within 24 hours"). No hype, no emojis, no invented facts or certifications. Sign off with the owner's shop name and a placeholder for their phone number if it isn't in the profile.`,
        content: JSON.stringify({ shop_profile: profile, buyer, owner_notes: notes }),
      }
    },
  },

  triage_reply: {
    effort: 'low',
    schema: obj({
      category: {
        type: 'string',
        enum: ['quote_request', 'callback', 'needs_info', 'not_interested', 'out_of_office', 'other'],
      },
      summary: str,
      next_step: str,
      suggested_reply: str,
    }),
    build: ({ reply, buyer, profile }) => {
      if (!reply?.trim()) throw new HttpError(400, 'Paste the reply first.')
      return {
        system: `${SHOP_VOICE} A buyer replied to the shop's outreach. Classify the reply, summarise it in one sentence, say the single most useful next step for the owner, and draft a short suggested reply (empty string if no reply is needed, e.g. a clear "not interested").`,
        content: JSON.stringify({ reply: reply.slice(0, 20000), buyer, shop_profile: profile }),
      }
    },
  },

  quote_assist: {
    effort: 'high',
    maxTokens: 32000,
    schema: obj({
      part_summary: str,
      material: str,
      key_features: strList,
      critical_tolerances: strList,
      operations: {
        type: 'array',
        items: obj({ operation: str, machine: str, minutes_per_part: { type: 'number' } }),
      },
      setup_minutes: { type: 'number' },
      fits_shop: { type: 'string', enum: ['yes', 'maybe', 'no'] },
      fit_reason: str,
      risks: strList,
      questions_for_buyer: strList,
      assumptions: strList,
    }),
    build: ({ file, notes = '', quantity, profile }) => {
      if (!file && !notes.trim()) throw new HttpError(400, 'Add a drawing or describe the part.')
      const content = []
      if (file) {
        const { mediaType, data } = file
        if (mediaType === 'application/pdf') {
          content.push({ type: 'document', source: { type: 'base64', media_type: mediaType, data } })
        } else if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mediaType)) {
          content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } })
        } else {
          throw new HttpError(400, 'Upload a PDF, PNG, JPG or WebP drawing.')
        }
      }
      content.push({
        type: 'text',
        text: JSON.stringify({ quantity, owner_notes: notes, shop_profile: profile }),
      })
      return {
        system: `${SHOP_VOICE} Help the owner prepare a machining quote. Read the drawing (if any) and notes. Identify material, key features and critical tolerances. Break the job into operations on the shop's machines with realistic minutes per part for a small Indian job shop, plus one-time setup minutes. Be conservative. Say whether the part fits the shop's machines. List risks, questions to ask the buyer before quoting, and every assumption you made. The owner decides the final price — you only estimate time.`,
        content,
      }
    },
  },
}

export default handler(async ({ task, input }) => {
  const spec = TASKS[task]
  if (!spec) throw new HttpError(400, `Unknown task "${task}".`)
  const { system, content } = spec.build(input || {})
  return runStructured({ system, content, schema: spec.schema, effort: spec.effort, maxTokens: spec.maxTokens })
})
