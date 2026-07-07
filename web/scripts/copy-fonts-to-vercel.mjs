import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fonts = ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf']

const serverDir = join(root, '.vercel/output/functions/__fallback.func')
const destDir = join(serverDir, 'fonts')
mkdirSync(destDir, { recursive: true })

let copied = 0
for (const font of fonts) {
  const src = join(root, 'fonts', font)
  if (!existsSync(src)) {
    console.warn(`[fonts] ${font} not found in web/fonts/`)
    continue
  }
  copyFileSync(src, join(destDir, font))
  copied += 1
}

console.log(`[fonts] Copied ${copied} font(s) into Vercel serverless output`)
