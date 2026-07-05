import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = 'russian-trusted-ca-bundle.pem'
const src = join(root, 'certs', bundle)

if (!existsSync(src)) {
  console.warn(`[certs] ${bundle} not found in web/certs/`)
  process.exit(0)
}

const serverDir = join(root, '.vercel/output/functions/__fallback.func')
const destDir = join(serverDir, 'certs')

mkdirSync(destDir, { recursive: true })
copyFileSync(src, join(destDir, bundle))

console.log(`[certs] Copied ${bundle} into Vercel serverless output`)
