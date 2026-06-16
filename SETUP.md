# CohortBuy — Integrations & Setup

One place for every external service CohortBuy uses (or will use), how to get credentials, and the env vars to set. **Now** = needed for current features; **Later** = wired when that capability is built.

> **Secrets live in `.env.local`** (gitignored) for local dev and in your host's secret store (Vercel/Supabase) for deploys. **Never commit secrets.** `NEXT_PUBLIC_*` vars are exposed to the browser — only put publishable values there.

## Quick env reference

| Variable | Service | When | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Now | Project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Now | Anon/public key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Now (server) | **Secret** — server only |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) | Agent | Secret |
| `OPENAI_API_KEY` | OpenAI | Agent (optional) | Secret |
| `AI_DEFAULT_PROVIDER` / `AI_DEFAULT_MODEL` | AI config | Agent | Optional override of code default |
| `RESEND_API_KEY` | Resend (email) | Soon | Secret |
| `EMAIL_FROM` | Resend | Soon | Verified sender |
| `TWILIO_ACCOUNT_SID` | Twilio (SMS) | Soon | Secret |
| `TWILIO_AUTH_TOKEN` | Twilio | Soon | Secret |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio | Soon | Messaging Service |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth + Drive | Later | OAuth + Drive API |

---

## 1. Supabase — database, auth, storage  *(Now)*
Used for: Postgres data, Auth, RLS. Migrations live in `supabase/migrations/`.

1. Create a project (already done: ref `qerbvrenpdmoegebkdki`).
2. **Settings → API**: copy the **Project URL**, the **anon public** key, and the **service_role** key (secret).
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Apply schema with the CLI:
   ```bash
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref qerbvrenpdmoegebkdki
   supabase db push
   ```

## 2. Anthropic / OpenAI — the AI models  *(Agent)*
Used for: the agent runtime. We're **provider-agnostic** (`{ provider, model }`), set per-cohort or globally (see AI config in `Product_Spec.md`).

1. Anthropic: create a key at the Anthropic Console → set `ANTHROPIC_API_KEY`.
2. OpenAI (optional): create a key at the OpenAI dashboard → set `OPENAI_API_KEY`.
3. Optional default override via `AI_DEFAULT_PROVIDER` / `AI_DEFAULT_MODEL` (otherwise the code default `DEFAULT_MODEL` applies).

## 3. Resend — transactional email  *(Soon)*
Used for: email notifications and (optionally) Supabase Auth magic-link emails.

1. Create a Resend account; **verify your sending domain** (DNS records).
2. Create an API key → set `RESEND_API_KEY`; set `EMAIL_FROM` to a verified address.
3. (Optional) Point **Supabase Auth → SMTP** at Resend so auth emails send from your domain.

## 4. Twilio — SMS notifications  *(Soon)*
Used for: the SMS `NotificationChannel`. **US texting needs A2P 10DLC registration** before scale.

1. Create a Twilio account; buy a number or create a **Messaging Service**.
2. Copy Account SID + Auth Token → set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`.
3. Register an **A2P 10DLC brand + campaign** (carrier requirement); implement STOP/HELP. See Legal notes (TCPA).

## 5. WhatsApp Business API (BSP)  *(Later)*
Used for: the WhatsApp conversational channel + notifications. Reach it via a BSP (Twilio, AiSensy, Respond.io). Requires a WhatsApp-enabled number and **message template approvals**. Add env vars per the chosen BSP.

## 6. Google OAuth + Drive API  *(Later)*
Used for: Google sign-in and per-project document folders.

1. Create a Google Cloud project; configure the **OAuth consent screen**.
2. Enable the **Google Drive API**.
3. Create **OAuth client credentials** → set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (or configure the Google provider in **Supabase Auth**).
4. Request minimal Drive scopes; disclose access in the privacy policy.

## 7. E-signature  *(Later)*
Used for: member↔vendor contracts. Pick a provider (Dropbox Sign / DocuSign), create an API key, add its env vars.

## 8. Escrow / payments provider  *(Later)*
Used for: optional milestone escrow. **The platform stays out of the flow of funds** — the provider moves money, not us (see Product_Spec & Legal notes). Add the provider's keys when integrated.

## 9. Vercel — deployment
1. Import the GitHub repo into Vercel.
2. Add **all** the env vars above (matching local) under Project → Settings → Environment Variables.
3. Deploy. Re-deploy after changing env vars.

---

## Security checklist
- [ ] Secrets only in `.env.local` / host secret store; never committed.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and all provider secrets are **server-side only** (never `NEXT_PUBLIC_*`).
- [ ] Rotate keys if exposed; use least-privilege scopes.
- [ ] Separate keys per environment (dev / prod) where possible.
