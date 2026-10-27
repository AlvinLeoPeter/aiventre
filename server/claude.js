import Anthropic from '@anthropic-ai/sdk'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/* ----------------------------------------------------------------
   Shared helpers for the /api functions. Server-only: the API key
   never reaches the browser.
---------------------------------------------------------------- */

// Which model does which job. The hard jobs (researching buyers, reading drawings)
// get Opus; the simple ones (profile, emails, replies) get the cheaper, faster Sonnet.
// Each can be changed in Vercel without touching code; ANTHROPIC_MODEL sets them all.
const ALL = process.env.ANTHROPIC_MODEL
export const MODELS = {
  agent: process.env.ANTHROPIC_MODEL_AGENT || ALL || 'claude-opus-5',
  quote: process.env.ANTHROPIC_MODEL_QUOTE || ALL || 'claude-opus-5',
  simple: process.env.ANTHROPIC_MODEL_SIMPLE || ALL || 'claude-sonnet-5',
}

// Server-side refusal fallback for Opus/Fable: if the model declines, the API re-runs
// the request on a fallback model inside the same call.
const withFallback = (model) =>
  /^claude-(opus|fable)/.test(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}

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
export async function runTurn(params) {
  const messages = [...params.messages]
  let message
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    message = await getClient()
      .beta.messages.stream({ model: MODELS.agent, ...withFallback(MODELS.agent), ...params, messages })
      .finalMessage()
    if (message.stop_reason !== 'pause_turn') break
    messages.push({ role: 'assistant', content: message.content })
  }
  // Content from resumed turns is folded into one assistant message for the client.
  const content = messages.slice(params.messages.length).flatMap((m) => m.content).concat(message.content)
  return { content, stop_reason: message.stop_reason, usage: message.usage }
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
