# Aiventre

**An AI sales assistant for manufacturing job shops (CNC/VMC).** Idle machines? The AI agent finds companies
that buy machined parts, drafts emails the owner approves and sends, sorts replies, and helps turn a drawing
into a quote. The owner makes the calls and wins the orders.

- `/` — the website (`src/`, Vite + React): what Aiventre does and "Join the pilot"
- `/app` — the app itself: the **same code as the phone app** (`mobile/`, Expo), built for the
  browser by `npm run build`, so the website and the phones always have the same features — Today,
  Machines, Buyers (Find work, Open jobs, follow-ups, replies), Quote, Money (GST invoices), Trust
  pack, Machine expert and settings. On a computer it shows as a centred phone-width column.
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
     `VITE_WHATSAPP_NUMBER`, `VITE_CONTACT_EMAIL`, and per-job models `ANTHROPIC_MODEL_AGENT` /
     `ANTHROPIC_MODEL_QUOTE` (default `claude-opus-5`) and `ANTHROPIC_MODEL_SIMPLE` (default `claude-sonnet-5`)
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
