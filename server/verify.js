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

// Purchase contacts first: they're who buys job work.
const EMAIL_PREFERENCE = ['purchase', 'procurement', 'sourcing', 'vendor', 'supply', 'enquir', 'inquir', 'info', 'sales', 'contact', 'admin']

/** The best business email printed on the company's pages: their own domain, purchase desk first. */
function emailIn(text, siteDomain) {
  const all = [...new Set(text.match(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/g) ?? [])].filter(
    (e) => !/\.(png|jpe?g|gif|svg|webp)$/.test(e) && !/(sentry|wixpress|example|domain)\./.test(e),
  )
  const theirs = all.filter((e) => sameSite(e.split('@')[1], siteDomain))
  const pool = theirs.length ? theirs : all.filter((e) => FREE_MAIL.has(e.split('@')[1]))
  const rank = (e) => {
    const i = EMAIL_PREFERENCE.findIndex((w) => e.startsWith(w))
    return i < 0 ? EMAIL_PREFERENCE.length : i
  }
  return pool.sort((a, b) => rank(a) - rank(b))[0] ?? ''
}

/** The first Indian phone number printed on their pages: a mobile, or a landline with its STD code. */
export function phoneIn(text) {
  // Whole numbers only: a run of digits is never cut in two ("+914426252537" is one number).
  const candidates = text.match(/(?<![\d+])(?:\+?91[\s-]?)?\d[\d\s-]{8,13}\d(?!\d)/g) ?? []
  // A mobile is 10 digits; a landline is 0 + STD code + number, 11 digits in all,
  // or the same without the 0 after +91 ("+91-44-2625 2537").
  const ok = candidates.find((c) => {
    const d = c.replace(/\D/g, '')
    if (/^91\d{10}$/.test(d)) return /^[1-9]/.test(d.slice(2))
    return /^[6-9]\d{9}$/.test(d) || /^0\d{10}$/.test(d)
  })
  return ok ? ok.trim() : ''
}

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
 *   registration: { kind, id, state, onSite, stateMatches } | { kind, id, invalid } | null, passed: 0..3,
 *   filled: { email?, phone? } — contacts the AI left blank, found on the company's own pages }
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

  const siteDomain = domainOf(site?.url || b.website || '')

  // Missing contacts: take them from the company's own pages (never from a directory,
  // which lists other companies' numbers too).
  const own = [contactPage, site].filter((p) => p?.ok).map((p) => p.text).join(' ')
  const filled = {}
  if (!b.email) {
    const found = emailIn(own, siteDomain)
    if (found) filled.email = found
  }
  if (!b.phone) {
    const found = phoneIn(own)
    if (found) filled.phone = found
  }
  const emailAddr = String(b.email || filled.email || '')
  const emailDomain = emailAddr.split('@')[1]?.toLowerCase() ?? ''
  const email = !emailAddr ? 'none' : FREE_MAIL.has(emailDomain) ? 'free' : sameSite(emailDomain, siteDomain) ? 'official' : 'other'
  const phoneDigits = last10(String(b.phone || filled.phone || ''))
  const phone = phoneDigits.length < 10 ? 'none' : phonesIn(pages).has(phoneDigits) ? 'on_site' : 'not_found'

  const reg = registrationIn(pages, [b.gstin, b.cin])
  const registration = reg && !reg.invalid ? { ...reg, onSite: true, stateMatches: sameState(reg.state, b.state) } : reg

  const passed =
    Number(link === 'ok') +
    Number(email === 'official' || phone === 'on_site') +
    Number(!!registration && !registration.invalid && registration.stateMatches)

  return { at: new Date().toISOString(), link, website, email, phone, registration, passed, filled }
}

/** Runs `fn` over a list a few at a time; a failure gives `fallback` for that item. */
async function pool(list, fn, concurrency, fallback) {
  const out = new Array(list.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, list.length) }, async () => {
      while (next < list.length) {
        const i = next++
        try {
          out[i] = await fn(list[i])
        } catch {
          out[i] = fallback
        }
      }
    }),
  )
  return out
}

/** Checks several buyers at once, a few at a time. */
export const checkBuyers = (list, concurrency = 4, open = fetchPage) => pool(list, (b) => checkBuyer(b, open), concurrency, null)

/* ---------------- supplier prices ---------------- */

// These answers mean the page exists but turns away automated visitors (common on marketplaces).
const BLOCKED = new Set(['http_401', 'http_403', 'http_429', 'http_503'])

/**
 * True when the page shows this rupee price next to a currency mark: "₹1,250", "Rs. 1250.00",
 * "1,25,000 INR", "1250/-". A bare number isn't enough — "50" is on every page.
 */
export function priceOnPage(text, price) {
  if (!(price > 0) || !text) return false
  const whole = Math.floor(price)
  const paise = Math.round((price - whole) * 100)
  // Commas anywhere, so both 1,25,000 and 125,000 match.
  const digits = String(whole).split('').join(',?')
  // A whole price may be written with .00, but not with other paise.
  const tail = !paise ? '(?:\\.0{1,2})?(?!\\.\\d*[1-9])' : paise % 10 ? `\\.${String(paise).padStart(2, '0')}` : `\\.${paise / 10}0?`
  const amount = `${digits}${tail}(?![\\d,]*\\d)`
  const before = new RegExp(`(?:₹|rs\\.?|inr|mrp|price)[^\\d]{0,12}(?<![\\d.])${amount}`)
  const after = new RegExp(`(?<![\\d.,])${amount}\\s*(?:/-|inr|rupees)`)
  return before.test(text) || after.test(text)
}

// Pages listing many sellers' prices side by side: a price there only counts in that seller's own entry.
const MANY_SELLERS = /(^|\.)(indiamart|tradeindia|exportersindia|justdial)\.com$/

/**
 * On a marketplace listing many sellers, the price must sit in this supplier's entry: each entry
 * shows its price and then the seller's name, so the name must come before the next price.
 */
export function priceForSupplier(text, price, supplier) {
  if (!priceOnPage(text, price)) return false
  const name = String(supplier || '').replace(/\(.*?\)/g, ' ').trim()
  if (!name) return false
  const rupee = /₹|(?<![a-z])rs\.?\s*\d/g
  let at = 0
  while (at < text.length) {
    rupee.lastIndex = at
    const start = rupee.exec(text)
    if (!start) return false
    rupee.lastIndex = start.index + 1
    const next = rupee.exec(text)
    const entry = text.slice(start.index, next ? next.index : text.length)
    if (priceOnPage(entry, price) && mentions(entry, name)) return true
    if (!next) return false
    at = next.index
  }
  return false
}

/* ---------------- pages the AI's search already opened ---------------- */

const urlKey = (raw) => {
  try {
    const u = new URL(raw)
    return `${u.host.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase()
  } catch {
    return ''
  }
}

/** The text of every page the AI opened with web_fetch during its search, by address. */
export function fetchedPages(blocks, into = new Map()) {
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    if (node.type === 'web_fetch_result' && typeof node.url === 'string') {
      const source = node.content?.source
      if (typeof source?.data === 'string' && source.media_type !== 'application/pdf') into.set(urlKey(node.url), source.data)
    }
    for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v)
  }
  walk(blocks)
  return into
}

/**
 * Opens a page ourselves; if the site turns our server away (some marketplaces block cloud
 * servers), uses the copy the AI's search fetched from it minutes earlier instead.
 */
export const openWithSearchPages = (pages, open = fetchPage) => async (raw) => {
  const page = await open(raw)
  if (page.ok || !pages?.size) return page
  const text = pages.get(urlKey(raw))
  return text ? { ok: true, url: raw, text: htmlToText(text), viaSearch: true } : page
}

const linkState = (page) => (!page ? 'none' : page.ok ? 'ok' : BLOCKED.has(page.reason) ? 'blocked' : 'broken')

/** Opens the page an offer cites (and the supplier's site if that page won't load). */
export async function checkOffer(o, open = fetchPage) {
  const page = o.url ? await open(String(o.url)) : null
  const pageState = linkState(page)
  let website = o.website ? 'unchecked' : 'none'
  if (pageState === 'ok') website = 'ok'
  else if (o.website) website = (await open(String(o.website))).ok ? 'ok' : 'down'
  return {
    at: new Date().toISOString(),
    page: pageState,
    ...(page?.viaSearch && { seenBy: 'search' }),
    website,
    priceSeen:
      pageState === 'ok' &&
      (MANY_SELLERS.test(domainOf(page.url)) ? priceForSupplier(page.text, Number(o.price), o.supplier) : priceOnPage(page.text, Number(o.price))),
  }
}

export const checkOffers = (list, concurrency = 4, open = fetchPage) =>
  pool(list, (o) => checkOffer(o, open), concurrency, { at: new Date().toISOString(), page: 'none', website: 'none', priceSeen: false })

/* ---------------- posted jobs ---------------- */

/** Opens the page a posted job (tender, buy requirement) was found on: does it still load? */
export async function checkJob(j, open = fetchPage) {
  const page = j.url ? await open(String(j.url)) : null
  return { at: new Date().toISOString(), page: linkState(page), ...(page?.viaSearch && { seenBy: 'search' }) }
}

export const checkJobs = (list, concurrency = 4, open = fetchPage) =>
  pool(list, (j) => checkJob(j, open), concurrency, { at: new Date().toISOString(), page: 'none' })
