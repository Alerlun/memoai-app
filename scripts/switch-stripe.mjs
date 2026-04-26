import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const mode = process.argv[2]
const full = process.argv.includes('--full')

if (!['test', 'live'].includes(mode)) {
  console.error('Usage: npm run stripe:test | npm run stripe:test:full | npm run stripe:live')
  process.exit(1)
}

function parseEnv(content) {
  const vars = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 1) continue
    vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return vars
}

function applyToEnvFile(envPath, updates) {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const applied = new Set()
  const result = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const idx = trimmed.indexOf('=')
    if (idx < 1) return line
    const key = trimmed.slice(0, idx)
    if (key in updates) { applied.add(key); return `${key}=${updates[key]}` }
    return line
  })
  for (const [k, v] of Object.entries(updates)) {
    if (!applied.has(k)) result.push(`${k}=${v}`)
  }
  writeFileSync(envPath, result.join('\n'))
}

let stripeVars
try {
  stripeVars = parseEnv(readFileSync(`.env.stripe.${mode}`, 'utf8'))
} catch {
  console.error(`\n❌  .env.stripe.${mode} not found.`)
  console.error(`    Copy .env.stripe.${mode}.example → .env.stripe.${mode} and fill in your keys.\n`)
  process.exit(1)
}

const FRONTEND_KEYS = ['VITE_STRIPE_PUBLISHABLE_KEY', 'VITE_STRIPE_PRO_PRICE_ID']
const BACKEND_KEYS  = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_CLASS_PRICE_ID', 'STRIPE_SCHOOL_PRICE_ID']

// Always update local .env (Vite dev server)
const frontendUpdates = Object.fromEntries(
  FRONTEND_KEYS.filter(k => stripeVars[k]).map(k => [k, stripeVars[k]])
)
applyToEnvFile('.env', frontendUpdates)
console.log('✅  .env updated (local frontend keys)')

const updateBackend = mode === 'live' || full

if (updateBackend) {
  if (mode === 'test') {
    console.log('\n⚠️   WARNING: Supabase secrets will switch to TEST mode.')
    console.log('    Your production backend will temporarily use test keys.')
    console.log('    Run `npm run stripe:live` immediately after testing.\n')
  }

  const secretArgs = BACKEND_KEYS
    .filter(k => stripeVars[k])
    .map(k => `${k}=${stripeVars[k]}`)
    .join(' ')

  if (secretArgs) {
    console.log('⏳  Updating Supabase secrets...')
    execSync(`npx supabase secrets set ${secretArgs}`, { stdio: 'inherit' })
    console.log('✅  Supabase secrets updated')
  } else {
    console.warn(`⚠️   No backend keys found in .env.stripe.${mode}`)
  }
}

// Write mode marker so the pre-push hook knows what state we're in
// test-local = only frontend changed, Supabase is still live (safe to push)
// test-full  = Supabase is in test mode (pre-push hook will restore before push)
// live       = everything is live (safe to push)
const marker = mode === 'live' ? 'live' : full ? 'test-full' : 'test-local'
writeFileSync('.stripe-mode', marker)

const pk = stripeVars.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
const modeLabel = mode.toUpperCase() + (full ? ' (full — Supabase updated)' : mode === 'test' ? ' (local only — Supabase unchanged)' : '')
console.log(`\n🎉  Stripe is now in ${modeLabel} mode`)
console.log(`    Publishable key: ${pk.slice(0, 18)}...`)

if (mode === 'test' && !full) {
  console.log('\n    Note: Checkout flow will not work end-to-end (frontend is test, backend is live).')
  console.log('    Use `npm run stripe:test:full` for full payment flow testing.')
}
