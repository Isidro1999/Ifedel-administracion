/**
 * Alias de compatibilidad → scripts/san-miguel-image-relink.ts
 *
 * Preferí:
 *   npx tsx --env-file=.env scripts/san-miguel-image-relink.ts --dry-run --production
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'

const script = path.join(__dirname, 'san-miguel-image-relink.ts')
const result = spawnSync(
  'npx',
  ['tsx', script, ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env, shell: true },
)

process.exit(result.status ?? 1)
