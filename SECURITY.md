# MemoAI Security Audit

## What was fixed in code

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | OpenAI API key exposed in browser (`VITE_OPENAI_API_KEY`) | CRITICAL | Moved all AI calls to `call-ai` edge function. Key is now a backend-only Supabase secret. |
| 2 | No request body size limits on any edge function | HIGH | All edge functions now reject payloads > 4 KB (413). |
| 3 | No rate limiting on checkout / join-group endpoints | HIGH | Added per-user rate limiting via `rate_limit_log` table: 5/hr on checkouts, 5/15 min on join-group, 30/15 min on AI calls. |
| 4 | `joinCode` accepted without format validation | MEDIUM | Sanitized to `[A-Z0-9]`, rejected if not 4–10 chars. |
| 5 | `groupName` had no length cap | MEDIUM | Capped at 200 characters. |
| 6 | `priceId` accepted any string from client | MEDIUM | Whitelisted against `STRIPE_PRO_PRICE_ID` secret server-side. |
| 7 | `education_groups` readable by unauthenticated users | MEDIUM | `edu_groups_public_select_by_code` (USING true) replaced with `USING (auth.uid() IS NOT NULL)`. |

---

## Actions required from you

### IMMEDIATE — rotate these keys (they were readable in `.env` and `.env.stripe.test`)

1. **OpenAI API key** — go to platform.openai.com → API keys → revoke the current key → create a new one
2. **Stripe test secret key** (`sk_test_...`) — Stripe dashboard → Developers → API keys → roll
3. **Stripe webhook secret** (`whsec_...`) — Stripe dashboard → Webhooks → your endpoint → roll secret

After rotating, update:
- `.env` and `.env.stripe.test/.env.stripe.live` with the new values
- Supabase secrets: `supabase secrets set STRIPE_SECRET_KEY=sk_new... STRIPE_WEBHOOK_SECRET=whsec_new...`

### Deploy the new edge function

```bash
supabase functions deploy call-ai --project-ref YOUR_PROJECT_REF
supabase secrets set OPENAI_API_KEY=sk-your-new-rotated-key --project-ref YOUR_PROJECT_REF
supabase secrets set STRIPE_PRO_PRICE_ID=price_your_pro_price_id --project-ref YOUR_PROJECT_REF
```

Remove `VITE_OPENAI_API_KEY` from your `.env` file — it is no longer used.

### Run the security SQL migrations

In Supabase dashboard → SQL Editor, run `supabase/security_setup.sql`:
- Creates the `rate_limit_log` table
- Fixes the `education_groups` public-select policy

### Configure Supabase Auth rate limiting

Supabase Auth handles login/signup rate limiting natively:
1. Go to Supabase dashboard → Authentication → Rate Limits
2. Set **Sign in attempts**: 5 per 15 minutes
3. Set **Sign up attempts**: 5 per hour

### Deploy updated edge functions

```bash
supabase functions deploy create-checkout-session create-education-checkout join-education-group create-portal-session leave-education-group --project-ref YOUR_PROJECT_REF
```

---

## Remaining known limitations

| Issue | Severity | Notes |
|-------|----------|-------|
| `Access-Control-Allow-Origin: *` on all edge functions | LOW | CORS does not protect against server-to-server abuse; JWT auth is the real guard. Once you know your production domain, replace `*` with `https://yourdomain.com`. |
| Leaderboard exposes real names | LOW | `get_weekly_leaderboard()` returns `full_name`. Consider using first-name-only or a chosen display name. |
| Password minimum is 6 chars | LOW | Increase to 8+ in Supabase dashboard → Authentication → Password strength. |
| No audit log for critical operations | LOW | Consider logging subscription changes and group management actions. |

---

## React / XSS

React escapes all string content by default — `{variable}` output is safe. No `dangerouslySetInnerHTML` is used in this codebase. AI-generated content is rendered as plain text. Risk: LOW.

---

## What is intentionally public

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — the anon key is designed to be public; all security is enforced by Row Level Security policies.
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable keys are designed to be public.
- `VITE_STRIPE_PRO_PRICE_ID` — price IDs are not secret; server-side validation now whitelists them.
