/* ----------------------------------------------------------------
   Site config — set these in a `.env` file (see `.env.example`).
   Anything left empty is hidden from the page rather than faked.
---------------------------------------------------------------- */
const env = import.meta.env

// Formspree-compatible endpoint (POST JSON, Accept: application/json).
// When empty, the contact form falls back to opening the visitor's email app.
export const FORM_ENDPOINT = env.VITE_FORM_ENDPOINT || ''

export const CONTACT_EMAIL = env.VITE_CONTACT_EMAIL || 'hello@aiventre.com'

// Where the pilot form is saved: the same Supabase project as the app. The publishable key is
// meant to be public; the database only lets it add pilot requests, never read them.
export const SUPABASE_URL = (env.VITE_SUPABASE_URL || 'https://bxibjxdzmcdfsivzwtej.supabase.co').replace(/\/$/, '')
export const SUPABASE_KEY = env.VITE_SUPABASE_KEY || 'sb_publishable_tQ9RXBg6IsJKEawwEeBi-A_ryio2r1h'

// Display format, e.g. "+91 98xxx xxxxx". Digits are extracted for tel: links.
export const CONTACT_PHONE = env.VITE_CONTACT_PHONE || ''

// Digits only with country code, e.g. "9198xxxxxxxx".
export const WHATSAPP_NUMBER = (env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '')

export const telHref = (phone) => `tel:+${phone.replace(/\D/g, '')}`

export const whatsappHref = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
