# Aiventre

**An AI sales assistant for job-work machine shops (CNC, VMC, fabrication) in India.** It knows when each
machine will be free, finds companies that need that work, writes the messages, prices drawings and sends GST
bills. The owner stays in charge: nothing goes out until they press send.

## What's here

| Folder | What it is |
|---|---|
| `mobile/` | The app (Expo / React Native): Android, iPhone, and the web at `/app` — one codebase |
| `src/` | The website at `/` (Vite + React): the landing page and the "Join the pilot" form |
| `api/`, `server/` | Server functions on Vercel that talk to Claude (search, quotes, the machine expert) |
| `supabase/` | Database setup: sign-in, shops syncing between devices, pilot requests |
| `scripts/` | `live-check.mjs` runs the AI features once against the live server to check results and cost |

The app's main parts: **Today** (a dashboard on a computer), **Machines**, **Buyers** (Find work, Open jobs,
follow-ups, replies), **Quote** from a drawing, **Money** (GST invoices), **Trust pack** and the **Machine expert**.

## How it fits together

- The app keeps the shop on the device and, once signed in, syncs it through Supabase.
- AI features call the server functions in `api/`. The Anthropic key lives only on the server; every call needs a
  signed-in, approved account or the access code, so strangers can't spend credits.
- Every buyer the AI suggests is checked by the server (source page, website, contacts) before the owner sees it.

## Running it

```sh
npm install && npm run dev                 # the website and /api on http://localhost:5173
cd mobile && npm install && npx expo start # the app (Expo Go, or press w for the browser)
npm run build                              # what Vercel runs: the website, then the app into dist/app
```

Server settings (API key, access code, allowed emails) are environment variables in Vercel, never in this repo;
`.env.example` lists their names. Database setup steps are in [`supabase/README.md`](supabase/README.md).
