# Aiventre — mobile app

The phone app for job-work shops: every machine at a glance, and (next) the AI finding the next job before a
machine goes idle. Built with Expo (React Native, SDK 58), one codebase for Android and iPhone.

## What's in v0.2

- **Today** — one-glance board: running / free soon / idle counts, "Is it done?" questions with one-tap
  Done / +1 day / +2 days, every machine sorted by urgency, and the free gaps coming in the next 14 days.
- **Machines** — each machine's current job, progress, finish date and queue; add machines in one tap.
- **Machine page** — Job done, +1 day / +2 days / +1 week, queued jobs (each starts when the previous ends),
  rename, maintenance mode.
- **Job editor** — "How long will it take?" chips; shows exactly when it starts and finishes.
- **Reminders** — the owner says how long a job takes once; the phone asks "Is it done?" at 10 AM on the
  finish day. No daily updating.
- **Quote** — photograph a drawing (or pick a photo / PDF); the AI estimates operations, minutes per part and
  setup; you set the hour rate, material and margin and the price updates as you type. Share it on WhatsApp.
  Needs the same access code as the website, asked once.
- **Look** — light, dark, or follow the phone (My shop → Look).
- **Setup** — shop, kind of work, machines (tap a type once per machine). "Try a sample shop" for demos.

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

## Checks

```sh
npx tsc --noEmit   # types
npx expo lint      # lint
npx expo export --platform web   # web build, used for screenshot testing
```

## Code map

- `src/app/` — screens (Expo Router: every file is a screen)
  - `(tabs)/index.tsx` Today · `(tabs)/machines.tsx` · `(tabs)/quote.tsx` · `(tabs)/shop.tsx`
  - `machine/[id].tsx` machine page · `job.tsx` job editor · `onboarding.tsx` setup
- `src/lib/model.ts` — data types and the rules that turn dates into statuses
- `src/lib/store.ts` — saved data + actions (add job, job done, +1 day, …)
- `src/lib/notify.ts` — "Is it done?" reminders
- `src/lib/theme.ts` — light and dark colours, type sizes; `src/lib/prefs.ts` — look and access code
- `src/lib/api.ts` — calls to the Aiventre server; `src/lib/drawing.ts` — camera / photo / PDF picking
- `src/components/` — shared UI pieces and the machine card
