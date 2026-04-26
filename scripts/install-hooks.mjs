// Installs the pre-push git hook. Runs automatically on `npm install` via the prepare script.
import { writeFileSync, mkdirSync, existsSync, chmodSync } from 'fs'
import { join } from 'path'

const hooksDir = join('.git', 'hooks')

if (!existsSync('.git')) {
  // Not a git repo (e.g., CI environment) — skip silently.
  process.exit(0)
}

mkdirSync(hooksDir, { recursive: true })

const hookPath = join(hooksDir, 'pre-push')
const hookContent = `#!/bin/sh\nnode scripts/pre-push.mjs\n`

writeFileSync(hookPath, hookContent)

try {
  chmodSync(hookPath, 0o755)
} catch {
  // chmod may not be available on Windows — the hook will still run via Node
}

console.log('✅  Git pre-push hook installed (auto-restores Stripe live mode before push)')
