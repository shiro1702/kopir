import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const engine = 'libquery_engine-rhel-openssl-3.0.x.so.node'
const src = join(root, 'node_modules/.prisma/client', engine)

if (!existsSync(src)) {
  console.warn(`[prisma] ${engine} not found — run prisma generate`)
  process.exit(0)
}

const serverDir = join(root, '.vercel/output/functions/__fallback.func')
const destDirs = [
  join(serverDir, 'node_modules/.prisma/client'),
  join(serverDir, 'chunks/_'),
]

for (const destDir of destDirs) {
  mkdirSync(destDir, { recursive: true })
  copyFileSync(src, join(destDir, engine))
}

console.log(`[prisma] Copied ${engine} into Vercel serverless output`)
