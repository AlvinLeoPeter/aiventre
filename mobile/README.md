# Aiventre — mobile app

The phone app for job-work shops: every machine at a glance, and (next) the AI finding the next job before a
machine goes idle. Built with Expo (React Native, SDK 58), one codebase for Android and iPhone.

## What's in v0.4

- **Today** — one-glance board: running / free soon / idle counts, "Is it done?" questions with one-tap
  Done / +1 day / +2 days, every machine sorted by urgency, and the free gaps coming in the next 14 days.
- **Machines** — each machine's current job, progress, finish date and queue; add machines in one tap.
- **Machine page** — Job done, +1 day / +2 days / +1 week, queued jobs (each starts when the previous ends),
  rename, maintenance mode.
- **Job editor** — "How long will it take?" chips; shows exactly when it starts and finishes.
- **Reminders** — the owner says how long a job takes once; the phone asks "Is it done?" at 10 AM on the
  finish day. No daily updating.
- **Find work** — Today lists every machine with free days in the next two weeks. "Find work" sends the
  machine, the shop's work, location and delivery distance to the server, where the AI searches the web for
  real nearby companies that buy that work (1–3 minutes) and writes a first message for each.
  It also runs by itself: when the app opens, machines free now or within 3 days that haven't been searched
  for this free spell get searched (at most 3 a day; My shop → AI to turn off), and a notification says
  how many buyers turned up — tapping it opens Buyers.
- **Buyers** — To do / Contacted / Talking / Won-or-not-now, search, add a buyer by hand. Each buyer has the
  message (AI writes or rewrites it, and follow-ups), WhatsApp / Email / Call, "did you send it?", a follow-up
  reminder 4 days later, status, contacts, notes, history and the link where the AI found them.
- **Ask Aiventre** — the same AI agent as the website, in a chat: "find tractor makers within 200 km",
  "check GeM tenders", "write messages for my new buyers". It saves buyers and messages on the phone.
- **Sort a reply** — paste a buyer's WhatsApp or email reply; the AI says what it means, the next step and
  drafts an answer, then updates the buyer.
- **Quote** — photo or PDF of a drawing, or a whole multi-sheet RFQ. For each item the AI plans: can the shop's
  machines do it (bed, travel, tonnage…), the material in standard stock with weight, the process route with
  machine, tools (size and type: carbide, HSS, PCD, CBN…) and minutes per step, why that process, and a
  safety flag for things like man baskets. Prices come from the owner's own rates (shop or per-machine hour
  rate, ₹/kg per material, margin, GST) and every minute is editable. One tap sends a quotation PDF.
- **Look** — light, dark, or follow the phone (My shop → Look).
- **Setup** — describe the shop in one paragraph (or dictate it) and the AI fills in the rest to check; or fill
  it in by hand. Location from GPS, delivery distance, machines suggested from the kinds of work.
  "Try a sample shop" for demos.

Data is stored on the phone for now. Login, sync and the AI lead hunting come next.

The app talks to the server at `https://aiventre.vercel.app`. To point it somewhere else (e.g. a local
`vercel dev`), start Expo with `EXPO_PUBLIC_API_URL=http://<your-mac-ip>:3000 npx expo start`.

## Run it on your phone (development)

On your Mac, with Node.js installed:

```sh
cd mobile
npm install
npx expo start
```

Install **Expo Go** on the phone (Play Store / App Store), make sure the phone and Mac are on the same Wi-Fi,
then scan the QR code shown in the terminal (Android: from Expo Go; iPhone: with the Camera app).
If the phone can't connect, try `npx expo start --tunnel`.

Note: reminders may need a real build of the app rather than Expo Go to fire reliably.

## Give it to a tester (Android, no Play Store needed)

```sh
cd mobile
npx eas-cli@latest login          # same Expo account as Expo Go
npx eas-cli@latest init           # first time only: links this app to your Expo account
npx eas-cli@latest build -p android --profile preview
```

It builds in the cloud (about 10–20 minutes) and gives a link. Open the link on the Android phone, download the
APK and install it (the phone will ask to allow installs from the browser). Reminders work in this build,
unlike in Expo Go. For the Play Store later: `npx eas-cli@latest build -p android --profile production`.

## Checks

```sh
npx tsc --noEmit   # types
npx expo lint      # lint
npx expo export --platform web   # web build, used for screenshot testing
```

## Code map

- `src/app/` — screens (Expo Router: every file is a screen)
  - `(tabs)/index.tsx` Today · `(tabs)/machines.tsx` · `(tabs)/buyers.tsx` · `(tabs)/quote.tsx` · `(tabs)/shop.tsx`
  - `machine/[id].tsx` machine page · `job.tsx` job editor · `onboarding.tsx` setup
- `src/lib/model.ts` — data types and the rules that turn dates into statuses
- `src/lib/store.ts` — saved data + actions (add job, job done, +1 day, …)
- `src/lib/notify.ts` — "Is it done?" reminders
- `src/lib/theme.ts` — light and dark colours, type sizes; `src/lib/prefs.ts` — look and access code
- `src/lib/api.ts` — calls to the Aiventre server; `src/lib/drawing.ts` — camera / photo / PDF picking
- `src/lib/find.ts` — runs "Find work" searches; `src/lib/location.ts` — shop location from GPS
- `src/lib/assistant.ts` — the Ask Aiventre chat (agent loop and the tools that run on the phone)
- `src/lib/share.ts` — capability profile PDF and backups
- `src/app/buyer/[id].tsx` buyer page · `src/app/reply.tsx` sort a reply · `src/app/assistant.tsx` chat
- `src/components/` — shared UI pieces and the machine card
