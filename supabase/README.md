# Supabase setup (login + online database)

Project: `https://bxibjxdzmcdfsivzwtej.supabase.co`. The app has this URL and the publishable key built in
(`mobile/src/lib/supabase.ts`); override them with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY`.
Never put the **secret** (`sb_secret_…`) key in the app or in this repo.

## 1. Create the tables (once)

Supabase dashboard → **SQL Editor** → **New query** → paste all of
[`migrations/0001_shops.sql`](migrations/0001_shops.sql) → **Run**. It should say "Success. No rows returned".

What it makes: `shops`, `shop_members`, `machines`, `jobs`, `leads`. Row Level Security means a signed-in
person only ever sees shops they're a member of; signed-out visitors see nothing; nothing can be hard-deleted
through the API (the app marks rows `deleted` so deletions reach every phone).

**Updates:** each later file in `migrations/` is run once, in order, the same way.
[`0002_invoices_suppliers.sql`](migrations/0002_invoices_suppliers.sql) adds `invoices` and `suppliers` (billing and
saved suppliers). Until it's run, signed-in phones show "The online database needs an update".
[`0003_pilot_requests.sql`](migrations/0003_pilot_requests.sql) stores the website's "Join the pilot" form.
Anyone can send one; nobody can read them through the API. See them in **Table Editor → pilot_requests**.

## 2. Make the sign-in email send a code

The app signs people in with a 6-digit code (no passwords, no links to open on the right device).

1. **Authentication → Sign In / Providers → Email**: make sure Email is enabled; set **Email OTP length** to 6.
2. **Authentication → Emails → Templates**: in both **Magic link** and **Confirm signup**, set
   - Subject: `Your Aiventre code`
   - Body:
     ```html
     <h2>Your Aiventre sign-in code</h2>
     <p>Enter this code in the app:</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
     <p>It expires in an hour. If you didn't ask for it, you can ignore this email.</p>
     ```

Supabase's built-in email sender only sends a handful of emails per hour — fine for a few testers. Before a
public launch, connect a real email service under **Authentication → Emails → SMTP settings**.

## 3. Let signed-in people use the AI (Vercel)

In Vercel → the project → **Settings → Environment Variables**, add, then **Redeploy**:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://bxibjxdzmcdfsivzwtej.supabase.co` |
| `APP_ALLOWED_EMAILS` | the emails allowed to use the AI, comma-separated |

Signed-in people whose email is on the list don't need the access code; anyone else who signs up can sync
their shop but can't spend AI credits. The server checks the login with the project's public signing keys
(`/auth/v1/.well-known/jwks.json`). If **Settings → JWT Keys** shows the project still on the *legacy JWT
secret*, switch it to the new signing keys there, or signed-in users will still need the access code.
