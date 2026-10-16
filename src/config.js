/* ----------------------------------------------------------------
   Site config — set these in a `.env` file (see `.env.example`).
   Anything left empty is hidden from the page rather than faked.
---------------------------------------------------------------- */
const env = import.meta.env

// Formspree-compatible endpoint (POST JSON, Accept: application/json).
// When empty, the contact form falls back to opening the visitor's email app.
export const FORM_ENDPOINT = env.VITE_FORM_ENDPOINT || ''

export const CONTACT_EMAIL = env.VITE_CONTACT_EMAIL || 'hello@aiventre.com'

// Display format, e.g. "+91 98xxx xxxxx". Digits are extracted for tel: links.
export const CONTACT_PHONE = env.VITE_CONTACT_PHONE || ''

// Digits only with country code, e.g. "9198xxxxxxxx".
export const WHATSAPP_NUMBER = (env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '')

export const telHref = (phone) => `tel:+${phone.replace(/\D/g, '')}`

export const whatsappHref = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
