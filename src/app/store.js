import { useSyncExternalStore } from 'react'

/* ----------------------------------------------------------------
   App state, saved in this browser (localStorage). Pilot-stage
   storage: one shop, one browser. Export/import covers backups.
---------------------------------------------------------------- */

const KEY = 'aiventre:v1'
const CODE_KEY = 'aiventre:access-code'
const FOLLOW_UP_DAYS = 4

export const STATUSES = {
  new: { label: 'New', tone: 'muted' },
  draft_ready: { label: 'Draft ready', tone: 'primary' },
  contacted: { label: 'Emailed', tone: 'sky' },
  replied: { label: 'Replied', tone: 'amber' },
  quote_requested: { label: 'Quote requested', tone: 'emerald' },
  won: { label: 'Won', tone: 'emerald' },
  lost: { label: 'Not now', tone: 'muted' },
}

export const EMPTY_PROFILE = {
  shop_name: '',
  city: '',
  state: '',
  summary: '',
  machines: [],
  capabilities: [],
  materials: [],
  industries: [],
  certifications: [],
  contact_name: '',
  phone: '',
  email: '',
  hour_rate: 800,
}

const initialState = () => ({
  version: 1,
  profile: { ...EMPTY_PROFILE },
  buyers: [],
  // api: raw Claude messages (sent back each turn). log: what the chat screen shows.
  chat: { api: [], log: [] },
})

const safeRead = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const load = () => {
  try {
    const saved = JSON.parse(safeRead(KEY))
    if (saved?.version === 1) return { ...initialState(), ...saved, profile: { ...EMPTY_PROFILE, ...saved.profile } }
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  return initialState()
}

let state = load()
const listeners = new Set()

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Usually the quota: the raw chat history (web search results) is the big part.
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, chat: { api: [], log: state.chat.log } }))
    } catch {
      // Storage unavailable (private mode): keep working in memory.
    }
  }
}

const set = (updater) => {
  state = { ...state, ...updater(state) }
  persist()
  listeners.forEach((l) => l())
}

export const getState = () => state
export const subscribe = (l) => (listeners.add(l), () => listeners.delete(l))
export const useStore = (selector = (s) => s) => selector(useSyncExternalStore(subscribe, getState))

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()
const norm = (s = '') => s.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]/g, '')

const uniqueList = (a = [], b = []) => [...new Set([...a, ...b].map((x) => x.trim()).filter(Boolean))]

/* ---------------- Profile ---------------- */

export function mergeProfile(patch, { replaceMachines = false } = {}) {
  set((s) => {
    const p = s.profile
    const next = { ...p }
    for (const k of ['shop_name', 'city', 'state', 'summary', 'contact_name', 'phone', 'email']) {
      if (patch[k]) next[k] = patch[k]
    }
    if (patch.hour_rate) next.hour_rate = Number(patch.hour_rate) || p.hour_rate
    for (const k of ['capabilities', 'materials', 'industries', 'certifications']) {
      if (patch[k]) next[k] = uniqueList(p[k], patch[k])
    }
    if (patch.machines) next.machines = replaceMachines ? patch.machines : [...p.machines, ...patch.machines]
    return { profile: next }
  })
}

export const setProfile = (profile) => set(() => ({ profile }))

/* ---------------- Buyers ---------------- */

export function addBuyers(list) {
  let added = 0
  const skipped = []
  set((s) => {
    const seen = new Set(s.buyers.flatMap((b) => [norm(b.company), norm(b.website)]).filter(Boolean))
    const fresh = []
    for (const raw of list) {
      const company = raw.company?.trim()
      if (!company) continue
      const keys = [norm(company), norm(raw.website)].filter(Boolean)
      if (keys.some((k) => seen.has(k))) {
        skipped.push(company)
        continue
      }
      keys.forEach((k) => seen.add(k))
      fresh.push({
        id: uid(),
        company,
        city: raw.city || '',
        state: raw.state || '',
        industry: raw.industry || '',
        website: raw.website || '',
        email: raw.email || '',
        phone: raw.phone || '',
        contact_role: raw.contact_role || '',
        why_fit: raw.why_fit || '',
        source_url: raw.source_url || '',
        status: 'new',
        draft: null,
        notes: '',
        follow_up_at: null,
        created_at: now(),
        history: [{ at: now(), text: raw.source_url ? 'Found by AI research' : 'Added' }],
      })
    }
    added = fresh.length
    return { buyers: [...fresh, ...s.buyers] }
  })
  return { added, skipped }
}

export function updateBuyer(id, patch, historyText) {
  set((s) => ({
    buyers: s.buyers.map((b) =>
      b.id === id
        ? {
            ...b,
            ...patch,
            history: historyText ? [...b.history, { at: now(), text: historyText }] : b.history,
          }
        : b,
    ),
  }))
}

export function saveDraft(id, draft, historyText = 'Email drafted') {
  const buyer = state.buyers.find((b) => b.id === id)
  if (!buyer) return false
  const status = ['new', 'draft_ready'].includes(buyer.status) ? 'draft_ready' : buyer.status
  updateBuyer(id, { draft, status }, historyText)
  return true
}

export function markEmailed(id) {
  const followUp = new Date(Date.now() + FOLLOW_UP_DAYS * 864e5).toISOString()
  updateBuyer(id, { status: 'contacted', follow_up_at: followUp }, `Email sent · follow up in ${FOLLOW_UP_DAYS} days`)
}

export const removeBuyer = (id) => set((s) => ({ buyers: s.buyers.filter((b) => b.id !== id) }))

export const isFollowUpDue = (b) => b.status === 'contacted' && b.follow_up_at && new Date(b.follow_up_at) <= new Date()

/* ---------------- Chat ---------------- */

export const setChat = (chat) => set(() => ({ chat }))
export const resetChat = () => set(() => ({ chat: { api: [], log: [] } }))

/* ---------------- Backup ---------------- */

export function exportData() {
  const blob = new Blob([JSON.stringify({ ...state, chat: { api: [], log: [] } }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `aiventre-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importData(file) {
  const data = JSON.parse(await file.text())
  if (data?.version !== 1 || !Array.isArray(data.buyers)) throw new Error('This is not an Aiventre backup file.')
  set(() => ({ ...initialState(), ...data, profile: { ...EMPTY_PROFILE, ...data.profile } }))
}

/* ---------------- Access code ---------------- */

export const getAccessCode = () => safeRead(CODE_KEY) || ''
export const setAccessCode = (code) => {
  try {
    if (code) localStorage.setItem(CODE_KEY, code)
    else localStorage.removeItem(CODE_KEY)
  } catch {
    // Ignore: user re-enters the code next visit.
  }
}

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
