import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/* ----------------------------------------------------------------
   Checking what the AI found, before the owner relies on it.

   For each buyer we open the page the AI cited and the company's own
   website, then answer three questions:
   - link:         does the source page exist and mention the company?
   - contact:      is the email on the company's own domain, and does
                   the phone number appear on their pages?
   - registration: do their pages show a GSTIN or CIN that passes the
                   official format/checksum rules (and matches the state)?
   Nothing here asks a government database; that needs a paid API.
---------------------------------------------------------------- */

const TIMEOUT_MS = 8000
const MAX_BYTES = 600_000
const MAX_REDIRECTS = 3
const UA = 'AiventreBot/1.0 (checks a supplier lead for a job shop; +https://aiventre.vercel.app)'

const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'rediffmail.com', 'rediff.com',
  'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'me.com', 'aol.com', 'zoho.com', 'proton.me', 'protonmail.com',
])

/* ---------------- fetching pages safely ---------------- */

// The URLs come from AI output, so never let them reach private or internal addresses.
function privateAddress(ip) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:')
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

async function safeUrl(raw) {
  let url
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) return null
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
    if (!addresses.length || addresses.some((a) => privateAddress(a.address))) return null
  } catch {
    return null
  }
  return url
}

/** Opens a public web page and returns its visible text (lower-cased), or why it couldn't. */
export async function fetchPage(raw) {
  let url = await safeUrl(raw)
  if (!url) return { ok: false, reason: 'bad_url' }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5' },
      })
    } catch {
      return { ok: false, reason: 'unreachable' }
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await safeUrl(new URL(res.headers.get('location'), url).toString())
      if (!url) return { ok: false, reason: 'bad_url' }
      continue
    }
    if (!res.ok) return { ok: false, reason: `http_${res.status}` }
    const type = res.headers.get('content-type') || ''
    if (!/text|html|xml|json/.test(type)) return { ok: true, url: url.toString(), text: '' }
    const text = await readText(res)
    return { ok: true, url: url.toString(), text: htmlToText(text) }
  }
  return { ok: false, reason: 'too_many_redirects' }
}

async function readText(res) {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks = []
  let size = 0
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
  }
  reader.cancel().catch(() => {})
  return new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks.map((c) => Buffer.from(c))))
}

const htmlToText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<a\s[^>]*href=["'](?:mailto|tel):([^"']+)["'][^>]*>/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .toLowerCase()

/* ---------------- what counts as a match ---------------- */

const NAME_NOISE = new Set(['pvt', 'private', 'ltd', 'limited', 'llp', 'the', 'and', 'co', 'company', 'inc', 'india', 'opc'])

/** True when the page names the company: its distinctive words, mostly all present. */
export function mentions(text, company) {
  const name = company.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!name) return false
  if (text.includes(name)) return true
  const words = name.split(' ').filter((w) => w.length >= 3 && !NAME_NOISE.has(w))
  if (!words.length) return false
  const found = words.filter((w) => text.includes(w)).length
  return found >= Math.max(1, Math.ceil(words.length * 0.75))
}

export const domainOf = (raw) => {
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

const sameSite = (a, b) => !!a && !!b && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`))

const last10 = (s) => s.replace(/\D/g, '').slice(-10)

/** Every phone-looking number on the pages, as its last 10 digits. */
const phonesIn = (text) => new Set((text.match(/\+?\d[\d\s\-().]{8,17}\d/g) ?? []).map(last10).filter((d) => d.length === 10))

/* ---------------- GSTIN and CIN ---------------- */

const GST_STATES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland',
  '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
}

const CIN_STATES = {
  AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar', CT: 'Chhattisgarh', CH: 'Chandigarh', DL: 'Delhi', GA: 'Goa',
  GJ: 'Gujarat', HR: 'Haryana', HP: 'Himachal Pradesh', JH: 'Jharkhand', JK: 'Jammu and Kashmir', KA: 'Karnataka', KL: 'Kerala',
  MP: 'Madhya Pradesh', MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya', MZ: 'Mizoram', NL: 'Nagaland', OR: 'Odisha', PB: 'Punjab',
  PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu', TG: 'Telangana', TR: 'Tripura', UP: 'Uttar Pradesh',
  UR: 'Uttarakhand', UT: 'Uttarakhand', WB: 'West Bengal', DN: 'Dadra and Nagar Haveli and Daman and Diu', LD: 'Lakshadweep',
}

const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** GSTIN: 2-digit state + PAN + entity + 'Z' + a check character computed from the rest. */
export function validGstin(id) {
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(id) || !GST_STATES[id.slice(0, 2)]) return false
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const v = ALNUM.indexOf(id[i]) * (i % 2 ? 2 : 1)
    sum += Math.floor(v / 36) + (v % 36)
  }
  return ALNUM[(36 - (sum % 36)) % 36] === id[14]
}

/** CIN: listed/unlisted + industry code + state + year + company type + number. */
export const validCin = (id) =>
  /^[LU]\d{5}[A-Z]{2}(19|20)\d{2}(PLC|PTC|FLC|FTC|GOI|SGC|GAP|GAT|NPL|ULL|ULT|OPC)\d{6}$/.test(id) && !!CIN_STATES[id.slice(6, 8)]

const stateOf = (kind, id) => (kind === 'GSTIN' ? GST_STATES[id.slice(0, 2)] : CIN_STATES[id.slice(6, 8)])

/** A registration number printed on their pages that passes the official rules. */
function registrationIn(text, claimed = []) {
  const upper = text.toUpperCase()
  const found = [
    ...claimed.filter(Boolean).map((x) => x.toUpperCase().replace(/\s/g, '')).filter((x) => upper.includes(x)),
    ...(upper.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g) ?? []),
    ...(upper.match(/\b[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/g) ?? []),
  ]
  for (const id of found) {
    if (validGstin(id)) return { kind: 'GSTIN', id, state: stateOf('GSTIN', id) }
    if (validCin(id)) return { kind: 'CIN', id, state: stateOf('CIN', id) }
  }
  // Something shaped like one but failing the checksum is worth flagging too.
  const bad = claimed.filter(Boolean).map((x) => x.toUpperCase().replace(/\s/g, ''))[0]
  return bad ? { kind: bad.length === 15 ? 'GSTIN' : 'CIN', id: bad, invalid: true } : null
}

const sameState = (a = '', b = '') => {
  const n = (s) => s.toLowerCase().replace(/[^a-z]/g, '')
  return !a || !b || n(a).includes(n(b)) || n(b).includes(n(a))
}

/* ---------------- the check ---------------- */

/**
 * Checks one buyer. Returns:
 * { at, link: 'ok'|'no_mention'|'broken'|'none', website: 'ok'|'down'|'none',
 *   email: 'official'|'free'|'other'|'none', phone: 'on_site'|'not_found'|'none',
 *   registration: { kind, id, state, onSite, stateMatches } | { kind, id, invalid } | null, passed: 0..3 }
 */
export async function checkBuyer(b, open = fetchPage) {
  const company = String(b.company || '').slice(0, 120)
  const [source, site] = await Promise.all([
    b.source_url ? open(String(b.source_url)) : Promise.resolve(null),
    b.website ? open(String(b.website)) : Promise.resolve(null),
  ])
  // A contact or about page often has the details the home page doesn't.
  let contactPage = null
  if (site?.ok && b.website) {
    const root = site.url.replace(/\/+$/, '')
    contactPage = await open(`${root}/contact-us`)
    if (!contactPage.ok) contactPage = await open(`${root}/contact`)
  }
  const pages = [source, site, contactPage].filter((p) => p?.ok).map((p) => p.text).join(' ')

  const link = !source ? 'none' : !source.ok ? 'broken' : source.text && !mentions(source.text, company) ? 'no_mention' : 'ok'
  const website = !b.website ? 'none' : site?.ok ? 'ok' : 'down'

  const emailDomain = String(b.email || '').split('@')[1]?.toLowerCase() ?? ''
  const siteDomain = domainOf(site?.url || b.website || '')
  const email = !b.email ? 'none' : FREE_MAIL.has(emailDomain) ? 'free' : sameSite(emailDomain, siteDomain) ? 'official' : 'other'
  const phoneDigits = last10(String(b.phone || ''))
  const phone = phoneDigits.length < 10 ? 'none' : phonesIn(pages).has(phoneDigits) ? 'on_site' : 'not_found'

  const reg = registrationIn(pages, [b.gstin, b.cin])
  const registration = reg && !reg.invalid ? { ...reg, onSite: true, stateMatches: sameState(reg.state, b.state) } : reg

  const passed =
    Number(link === 'ok') +
    Number(email === 'official' || phone === 'on_site') +
    Number(!!registration && !registration.invalid && registration.stateMatches)

  return { at: new Date().toISOString(), link, website, email, phone, registration, passed }
}

/** Checks several buyers at once, a few at a time. */
export async function checkBuyers(list, concurrency = 4, open = fetchPage) {
  const out = new Array(list.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, list.length) }, async () => {
      while (next < list.length) {
        const i = next++
        try {
          out[i] = await checkBuyer(list[i], open)
        } catch {
          out[i] = null
        }
      }
    }),
  )
  return out
}
