import { addBuyers, getAccessCode, getState, mergeProfile, saveDraft, setAccessCode, setChat } from './store.js'

/* ----------------------------------------------------------------
   Calls to our /api functions, plus the agent loop.
---------------------------------------------------------------- */

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function post(path, body) {
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-code': getAccessCode() },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your internet connection.')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    // Wrong or changed access code: forget it and show the lock screen again.
    setAccessCode('')
    setTimeout(() => window.location.reload(), 1500)
  }
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status}).`)
  return data
}

/** Single-step AI jobs: extract_profile, draft_email, triage_reply, quote_assist. */
export const runTask = (task, input) => post('/api/task', { task, input })

/* ---------------- Agent tools that run in the browser ---------------- */

const CLIENT_TOOLS = {
  get_shop_context() {
    const { profile, buyers } = getState()
    return {
      profile,
      buyers: buyers.slice(0, 300).map((b) => ({
        id: b.id,
        company: b.company,
        city: b.city,
        industry: b.industry,
        website: b.website,
        status: b.status,
        has_email: Boolean(b.email),
        has_draft: Boolean(b.draft),
      })),
      buyer_count: buyers.length,
    }
  },
  update_shop_profile(input) {
    mergeProfile(input)
    return { saved: true }
  },
  save_buyers({ buyers }) {
    if (!Array.isArray(buyers)) throw new Error('buyers must be a list')
    const { added, skipped } = addBuyers(buyers)
    return { added, skipped_duplicates: skipped }
  },
  save_email_draft({ buyer_id, subject, body }) {
    if (!saveDraft(buyer_id, { subject, body }, 'Email drafted by AI')) throw new Error(`No buyer with id ${buyer_id}`)
    return { saved: true }
  },
}

// One-line descriptions of what the agent did, for the chat screen.
function describe(block, result) {
  const i = block.input || {}
  switch (block.name) {
    case 'web_search':
      return `Searched the web: “${i.query}”`
    case 'web_fetch':
      return `Read ${String(i.url || '').replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}`
    case 'get_shop_context':
      return 'Checked your shop profile and buyer list'
    case 'update_shop_profile':
      return 'Updated your shop profile'
    case 'save_buyers':
      return result?.added != null
        ? `Saved ${result.added} new buyer${result.added === 1 ? '' : 's'}${result.skipped_duplicates?.length ? ` (${result.skipped_duplicates.length} already in your list)` : ''}`
        : 'Tried to save buyers'
    case 'save_email_draft': {
      const b = getState().buyers.find((x) => x.id === i.buyer_id)
      return `Drafted an email${b ? ` to ${b.company}` : ''}`
    }
    default:
      return `Used ${block.name}`
  }
}

const MAX_STEPS = 15

/**
 * Sends one owner message and runs the agent until it finishes.
 * Progress is written to the chat log as it happens.
 */
export async function runAgent(text, { onBusy } = {}) {
  let { api, log } = getState().chat
  api = [...api, { role: 'user', content: text }]
  log = [...log, { role: 'user', text }]
  setChat({ api, log })

  for (let step = 0; step < MAX_STEPS; step++) {
    onBusy?.(step === 0 ? 'Thinking…' : 'Working…')
    let turn
    try {
      turn = await post('/api/agent', { messages: api })
    } catch (err) {
      // If the very first call failed, forget the unanswered message so the owner can resend it.
      // Mid-task, the history ends with tool results, which is still valid to continue from.
      setChat({ api: step === 0 ? api.slice(0, -1) : api, log: [...log, { role: 'error', text: err.message }] })
      return
    }

    api = [...api, { role: 'assistant', content: turn.content }]

    // Server-side tools already ran (web search/fetch): log them.
    for (const block of turn.content) {
      if (block.type === 'server_tool_use') log = [...log, { role: 'activity', text: describe(block) }]
    }

    const toolUses = turn.content.filter((b) => b.type === 'tool_use')
    const texts = turn.content.filter((b) => b.type === 'text').map((b) => b.text).join('')

    if (turn.stop_reason === 'tool_use' && toolUses.length) {
      if (texts.trim()) log = [...log, { role: 'assistant', text: texts }]
      const results = []
      for (const block of toolUses) {
        const fn = CLIENT_TOOLS[block.name]
        try {
          if (!fn) throw new Error(`Unknown tool ${block.name}`)
          const result = fn(block.input || {})
          results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
          log = [...log, { role: 'activity', text: describe(block, result) }]
        } catch (err) {
          results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: err.message })
        }
      }
      // All results for one assistant turn go back in a single message.
      api = [...api, { role: 'user', content: results }]
      setChat({ api, log })
      continue
    }

    if (turn.stop_reason === 'refusal') {
      log = [...log, { role: 'error', text: 'The AI declined that request. Try rephrasing it.' }]
    } else {
      if (texts.trim()) log = [...log, { role: 'assistant', text: texts }]
      if (turn.stop_reason === 'max_tokens') log = [...log, { role: 'error', text: 'The answer was cut off. Ask it to continue.' }]
    }
    setChat({ api, log })
    return
  }

  setChat({ api, log: [...log, { role: 'error', text: 'Stopped after many steps. Ask it to continue if needed.' }] })
}
