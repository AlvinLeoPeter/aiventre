# Aiventre

Marketing site and clickable demo for **Aiventre — the AI front desk for Indian clinics**. It answers every
call and WhatsApp message, books the appointment, sends reminders, and gives the owner a daily summary.

- `/` — landing page
- `/demo` — interactive dashboard with sample data (today view, conversation transcripts, calendar, and a
  simulated incoming call that books a slot and sends a WhatsApp confirmation)
- `/privacy`, `/terms`

The actual product (voice agent, WhatsApp integration, booking backend) is not in this repo yet.

## Develop

```sh
npm install
npm run dev     # http://localhost:5173
npm run build
npm run lint
```

## Configure

Copy `.env.example` to `.env` and fill in:

| Variable | What it does |
|---|---|
| `VITE_FORM_ENDPOINT` | Where the early-access form posts (any Formspree-compatible JSON endpoint). Empty → the form opens the visitor's email app instead. |
| `VITE_CONTACT_EMAIL` | Shown on the site and used for the email fallback. |
| `VITE_CONTACT_PHONE` | Shows "Call us" links. Hidden when empty. |
| `VITE_WHATSAPP_NUMBER` | Shows a "Chat on WhatsApp" link. Digits with country code. Hidden when empty. |

Set the same variables in your host's dashboard for production builds.

## Deploy

It's a static SPA. `vercel.json` (Vercel) and `public/_redirects` (Netlify) rewrite all paths to
`index.html` so `/demo`, `/privacy` and `/terms` work on direct load.
