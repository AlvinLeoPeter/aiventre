# Aiventre

**An AI sales assistant for manufacturing job shops (CNC/VMC).** Idle machines? The AI agent finds companies
that buy machined parts, drafts emails the owner approves and sends, sorts replies, and helps turn a drawing
into a quote. The owner makes the calls and wins the orders.

- `/` — marketing site ("Join the pilot")
- `/app` — the application (access-code protected)
  - **Agent** — chat with the AI agent: *"I have idle VMC time this week — find me buyers."* It researches real
    companies on the web and saves them to the buyer list with the source link. It never sends anything.
  - **Buyers** — the pipeline: why each buyer fits, contacts, AI-drafted email → *Open in email app* →
    *I've sent it* (sets a 4-day follow-up reminder), notes and history.
  - **Replies** — paste a buyer's reply; the AI classifies it (quote request, call me, not now…), gives the next
    step and a suggested response, and updates the buyer.
  - **Quote** — upload a drawing (PDF/photo); the AI estimates operations and minutes per part. The app computes
    the price from your hour rate, material and margin — every number editable.
  - **My shop** — describe the shop in plain words; the AI builds the capability profile. Printable one-page
    profile (`/app/profile/print`) and backup/restore.
- `/privacy`, `/terms`

## How it works

```
Browser (React)                     Vercel functions (/api)             Anthropic
───────────────                     ───────────────────────             ─────────
Shop data in localStorage   ──►  api/agent.js  (system prompt + tools) ──► Claude + web search/fetch
Agent loop runs client tools ◄──  returns one finished turn
(save_buyers, save_email_draft,
 get_shop_context, update_shop_profile)
One-step jobs               ──►  api/task.js   (JSON-schema outputs)   ──► Claude
```

- The API key stays on the server (`server/claude.js`); every request needs the `APP_ACCESS_CODE`.
- Buyer research uses Claude's built-in **web search** and **web fetch** tools, restricted by the system prompt to
  real, published business contacts with a source URL.
- Pilot storage is the browser (one shop per browser). Use *My shop → Download backup* regularly.

## Set up on Vercel

1. Get an API key at [console.anthropic.com](https://console.anthropic.com) and add billing credits.
2. In Vercel → Project → Settings → Environment Variables, add:
   - `ANTHROPIC_API_KEY` — your key
   - `APP_ACCESS_CODE` — a hard-to-guess code you give to pilot shops (anyone with it can spend your credits)
   - optional: `VITE_FORM_ENDPOINT` (e.g. Formspree) for the "Join the pilot" form, `VITE_CONTACT_PHONE`,
     `VITE_WHATSAPP_NUMBER`, `VITE_CONTACT_EMAIL`, `ANTHROPIC_MODEL` (default `claude-opus-5`)
3. Redeploy. Functions may run up to 300 s (`vercel.json`) because web research takes a while.

## Develop locally

```sh
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY and APP_ACCESS_CODE
npm run dev            # http://localhost:5173 — /api runs locally too
npm run build
npm run lint
```

## On a phone

The app is installable (PWA): open `/app` in Chrome on Android → menu → *Install app* / *Add to Home screen*;
on iPhone Safari → Share → *Add to Home Screen*. It opens full-screen with bottom tabs.

## Next steps

- Accounts + a database (e.g. Supabase) so data syncs across devices and multiple shops can use it.
- Gmail/Outlook connection to read replies and send approved emails directly.
- Native Android/iOS builds with Capacitor from the same code, if Play Store listing or push reminders are needed.
