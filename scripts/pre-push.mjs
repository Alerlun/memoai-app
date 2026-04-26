// Git pre-push hook — auto-restores Stripe to live mode if Supabase was left in test.
// Installed by: npm run prepare  (runs scripts/install-hooks.mjs)
import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

let marker = 'live'
if (existsSync('.stripe-mode')) {
  marker = readFileSync('.stripe-mode', 'utf8').trim()
}

if (marker === 'test-full') {
  console.log('\n⚠️   Stripe is in TEST mode (Supabase secrets are test keys).')
  console.log('    Auto-restoring to LIVE before push...\n')
  try {
    execSync('node scripts/switch-stripe.mjs live', { stdio: 'inherit' })
    console.log('\n✅  Restored to live mode. Proceeding with push.\n')
  } catch (err) {
    console.error('\n❌  Failed to restore live mode. Push aborted.')
    console.error('    Run `npm run stripe:live` manually, then push again.\n')
    process.exit(1)
  }
} else if (marker === 'test-local') {
  // Only .env is in test mode — Supabase is still live — safe to push.
  // Vercel builds with its own env vars so the deployed frontend will use live keys.
  console.log('ℹ️   Stripe frontend is in test mode locally (Supabase is live — OK to push).')
}

process.exit(0)
