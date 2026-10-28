import Anthropic from '@anthropic-ai/sdk'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/* ----------------------------------------------------------------
   Shared helpers for the /api functions. Server-only: the API key
   never reaches the browser.
---------------------------------------------------------------- */

// Which model does which job. The hard jobs (researching buyers, reading drawings,
// machining questions) get Opus; the simple ones (profile, emails, replies) get the
// cheaper, faster Sonnet. Each can be changed in Vercel without touching code;
// ANTHROPIC_MODEL sets them all.
const ALL = process.env.ANTHROPIC_MODEL
export const MODELS = {
  agent: process.env.ANTHROPIC_MODEL_AGENT || ALL || 'claude-opus-5-5',
  quote: process.env.ANTHROPIC_MODEL_QUOTE || ALL || 'claude-opus-5-5',
  expert: process.env.ANTHROPIC_MODEL_EXPERT || ALL || 'claude-opus-5-5',
  simple: process.env.ANTHROPIC_MODEL_SIMPLE || ALL || 'claude-sonnet-5-5',
}

// Server-side refusal fallback: if the model declines, the API re-runs the request on a
// fallback model inside the same call.
const fallbackBetas = (model) => (/^claude-(opus|fable|sonnet-5-5)/.test(model) ? ['server-side-fallback-2026-07-01'] : [])
const withFallback = (model) => {
  const betas = fallbackBetas(model)
  return betas.length ? { betas, fallbacks: 'default' } : {}
}

// Newer models check that a conversation's history hasn't changed since their earlier
// reasoning was written. Ours only grows, but resumed turns are folded together for the
// app, so if a check ever fails we'd rather lose that old reasoning than the request.
const KEEP_GOING = { betas: ['thinking-binding-controls-2026-08-01'], block_binding: { prefix_mismatch_behavior: 'drop_block' } }

// The searches (Find work, Open jobs) can run two ways: Opus alone, or the cheaper
// Sonnet doing the searching and asking Opus for advice at the hard moments. SEARCH_MODE
// picks the default; a request can ask for either so the two can be compared.
export const SEARCH_MODE = process.env.SEARCH_MODE === 'advisor' ? 'advisor' : 'opus'
const ADVISOR_NOTE = `You have an advisor: a stronger model you can ask with the advisor tool. Ask it once after your first few searches, to check you're looking in the right places, and once before you report, to check your list. Keep each question short and include what you found.`

/** The model, extra tools and betas for a search, by mode ('opus' or 'advisor'). */
export function searchSetup(mode = SEARCH_MODE) {
  if (mode !== 'advisor') return { mode: 'opus', model: MODELS.agent, tools: [], betas: [], note: '' }
  return {
    mode,
    model: process.env.ANTHROPIC_MODEL_EXECUTOR || 'claude-sonnet-5-5',
    tools: [{ type: 'advisor_20260301', name: 'advisor', model: MODELS.agent, max_tokens: 2048 }],
    betas: ['advisor-tool-2026-03-01'],
    note: ADVISOR_NOTE,
  }
}

/* ---------------- what a request cost ---------------- */

// US$ per million tokens (input, output). Cache reads are a tenth of input, cache writes
// 1.25×. Web searches are $10 per 1,000; fetching pages is free.
const PRICES = [
  [/^claude-opus/, 4, 20],
  [/^claude-sonnet/, 2, 10],
  [/^claude-haiku/, 1, 5],
]
const SEARCH_USD = 0.01

function tokenCost(model, u) {
  const [, input, output] = PRICES.find(([re]) => re.test(model || '')) ?? PRICES[0]
  return (
    ((u.input_tokens || 0) * input +
      (u.cache_creation_input_tokens || 0) * input * 1.25 +
      (u.cache_read_input_tokens || 0) * input * 0.1 +
      (u.output_tokens || 0) * output) /
    1e6
  )
}

/**
 * Adds one response's usage to a running cost. When the response lists its iterations
 * (the advisor's calls, a fallback model), each is priced by its own model; the top-level
 * counts alone would miss them.
 */
export function addCost(cost, model, usage) {
  if (!usage) return cost
  const parts = Array.isArray(usage.iterations) && usage.iterations.length ? usage.iterations : [usage]
  for (const it of parts) {
    const m = it.model || model
    const usd = tokenCost(m, it)
    cost.byModel[m] = (cost.byModel[m] || 0) + usd
    cost.usd += usd
    if (it.type === 'advisor_message') cost.advisorCalls++
  }
  const searches = usage.server_tool_use?.web_search_requests || 0
  cost.searches += searches
  cost.usd += searches * SEARCH_USD
  return cost
}

export const newCost = () => ({ usd: 0, searches: 0, advisorCalls: 0, byModel: {} })

/** Adds one turn's cost (from runTurn) to a request's running total. */
export function mergeCost(into, from) {
  into.usd += from.usd
  into.searches += from.searches
  into.advisorCalls += from.advisorCalls
  for (const [m, usd] of Object.entries(from.byModel)) into.byModel[m] = (into.byModel[m] || 0) + usd
  return into
}

/** Rounds a cost for the response and the server log. */
export function reportCost(name, mode, cost, started) {
  const out = {
    mode,
    usd: Math.round(cost.usd * 1000) / 1000,
    inr: Math.round(cost.usd * 88),
    searches: cost.searches,
    advisor_calls: cost.advisorCalls,
    seconds: Math.round((Date.now() - started) / 1000),
  }
  console.log(`[cost] ${name}`, JSON.stringify({ ...out, by_model: Object.fromEntries(Object.entries(cost.byModel).map(([k, v]) => [k, Math.round(v * 1000) / 1000])) }))
  return out
}

// Server tools (web search / fetch) can pause a long turn; resume a few times.
const MAX_CONTINUATIONS = 4

let client
const getClient = () => {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(500, 'ANTHROPIC_API_KEY is not set on the server.')
    client = new Anthropic()
  }
  return client
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/* ---------------- who may spend credits ---------------- */

// Supabase signs each user's login token; its public keys let us check one without a round trip.
let jwks
const supabaseKeys = () => (jwks ??= createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`)))

const allowedEmails = () =>
  new Set((process.env.APP_ALLOWED_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))

/** The signed-in person's email, if the request carries a valid Supabase login token. */
export async function signedInEmail(req, keys = supabaseKeys) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1]
  if (!token || !process.env.SUPABASE_URL) return null
  try {
    const { payload } = await jwtVerify(token, keys(), {
      issuer: `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`,
      audience: 'authenticated',
    })
    return typeof payload.email === 'string' ? payload.email.toLowerCase() : null
  } catch {
    return null
  }
}

/**
 * Every endpoint spends API credits. Allowed: the shared access code, or a signed-in
 * person whose email is on APP_ALLOWED_EMAILS (so a stranger who signs up can't).
 */
export async function checkAccess(req, keys) {
  const expected = process.env.APP_ACCESS_CODE
  if (expected && req.headers['x-access-code'] === expected) return
  const email = await signedInEmail(req, keys)
  if (email && allowedEmails().has(email)) return
  if (email) throw new HttpError(403, 'Your account isn’t switched on for the AI yet. Ask Aiventre to add your email.')
  if (!expected && !process.env.SUPABASE_URL) throw new HttpError(500, 'Neither APP_ACCESS_CODE nor SUPABASE_URL is set on the server.')
  throw new HttpError(401, 'Wrong access code.')
}

/**
 * One model turn. Streams under the hood (long web-search turns would
 * otherwise risk HTTP timeouts) and resumes `pause_turn` server-side, so the
 * caller only ever sees a finished turn: end_turn, tool_use, max_tokens or refusal.
 */
export async function runTurn({ model = MODELS.agent, betas = [], ...params }) {
  const messages = [...params.messages]
  const request = {
    model,
    ...params,
    ...withFallback(model),
    betas: [...fallbackBetas(model), ...KEEP_GOING.betas, ...betas],
    thinking: { type: 'adaptive', block_binding: KEEP_GOING.block_binding },
  }
  let message
  const cost = newCost()
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    message = await getClient().beta.messages.stream({ ...request, messages }).finalMessage()
    addCost(cost, model, message.usage)
    if (message.stop_reason !== 'pause_turn') break
    messages.push({ role: 'assistant', content: message.content })
  }
  // Content from resumed turns is folded into one assistant message for the client.
  const content = messages.slice(params.messages.length).flatMap((m) => m.content).concat(message.content)
  return { content, stop_reason: message.stop_reason, usage: message.usage, cost }
}

/** One structured call: returns JSON matching `schema`. */
export async function runStructured({ system, content, schema, effort = 'medium', maxTokens = 16000, model = MODELS.simple }) {
  const message = await getClient()
    .beta.messages.stream({
      model,
      ...withFallback(model),
      max_tokens: maxTokens,
      system,
      output_config: { effort, format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    })
    .finalMessage()

  if (message.stop_reason === 'refusal') throw new HttpError(422, 'The AI declined this request.')
  if (message.stop_reason === 'max_tokens') throw new HttpError(502, 'The AI response was cut off. Try again with less input.')
  const text = message.content.find((b) => b.type === 'text')?.text
  if (!text) throw new HttpError(502, 'The AI returned no answer.')
  return JSON.parse(text)
}

/** Wraps a handler with method check, access check and uniform error responses. */
export function handler(fn) {
  return async (req, res) => {
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Use POST.')
      await checkAccess(req)
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      res.status(200).json(await fn(body))
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
      if (err instanceof Anthropic.AuthenticationError) {
        return res.status(500).json({ error: 'The server’s Anthropic API key is missing or invalid.' })
      }
      if (err instanceof Anthropic.RateLimitError) {
        return res.status(429).json({ error: 'The AI is busy right now. Wait a minute and try again.' })
      }
      if (err instanceof Anthropic.APIError) {
        console.error('Anthropic API error', err.status, err.message)
        return res.status(502).json({ error: `AI service error (${err.status ?? 'network'}). Try again.` })
      }
      console.error(err)
      res.status(500).json({ error: 'Something went wrong on the server.' })
    }
  }
}
