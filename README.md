# MemoAI — Deployment Guide

## Stack
| Layer | Service | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Database + Auth | Supabase | Free tier |
| Payments | Stripe | ~2.9% per transaction |
| AI | Anthropic Claude | Pay per use |

## Step 1 — Supabase (run setup.sql once)
1. supabase.com → New project
2. SQL Editor → paste + run supabase/setup.sql
3. Settings → API → copy URL and anon key

## Step 2 — Stripe
1. Create product "MemoAI Pro" → recurring price → copy price_xxx
2. Deploy edge functions: supabase functions deploy stripe-webhook
3. Add webhook in Stripe → your supabase function URL
4. Events: checkout.session.completed + customer.subscription.deleted
5. Settings → Billing → Customer Portal → enable cancel

## Step 3 — Fill .env
cp .env.example .env
# fill in all 5 values

## Step 4 — Deploy to Vercel
git push → vercel.com → import repo → add env vars → deploy

Accounts never lost: they live in Supabase, not in your code.
