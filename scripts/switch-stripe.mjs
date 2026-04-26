import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const mode = process.argv[2]
if (!['test', 'live'].includes(mode)) {
  console.error('Usage: npm run stripe:test  OR  npm run stripe:live')
  process.exit(1)
}

if (mode === 'live') {
  console.log('\n⚠️  Switching to LIVE mode — this uses real money!\n')
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
  console.error(`❌ File .env.stripe.${mode} not found.`)
  console.error(`   Copy .env.stripe.${mode}.example to .env.stripe.${mode} and fill in your keys.`)
  process.exit(1)
}

const FRONTEND_KEYS = ['VITE_STRIPE_PUBLISHABLE_KEY', 'VITE_STRIPE_PRO_PRICE_ID']
const BACKEND_KEYS  = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_EDUCATION_PRICE_ID']

const frontendUpdates = Object.fromEntries(
  FRONTEND_KEYS.filter(k => stripeVars[k]).map(k => [k, stripeVars[k]])
)
applyToEnvFile('.env', frontendUpdates)
console.log('✅ .env updated (frontend keys)')

const secretArgs = BACKEND_KEYS
  .filter(k => stripeVars[k])
  .map(k => `${k}=${stripeVars[k]}`)
  .join(' ')

if (secretArgs) {
  console.log('⏳ Updating Supabase secrets...')
  execSync(`npx supabase secrets set ${secretArgs}`, { stdio: 'inherit' })
  console.log('✅ Supabase secrets updated')
} else {
  console.warn(`⚠️  No backend keys found in .env.stripe.${mode}`)
}

const pk = stripeVars.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
console.log(`\n🎉 Stripe is now in ${mode.toUpperCase()} mode`)
console.log(`   Publishable key: ${pk.slice(0, 15)}...`)
