import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** DejaVu Sans ships full Cyrillic coverage; StandardFonts (Helvetica) do not. */
const FONT_REGULAR = 'DejaVuSans.ttf'
const FONT_BOLD = 'DejaVuSans-Bold.ttf'

const cache = new Map<string, Uint8Array>()

function candidates(file: string): string[] {
  const rel = join('fonts', file)
  const moduleDir = dirname(fileURLToPath(import.meta.url))
  return [
    join(moduleDir, '../../fonts', file),
    fileURLToPath(new URL(`../../fonts/${file}`, import.meta.url)),
    join(process.cwd(), rel),
    join(process.cwd(), 'web', rel),
    `/var/task/${rel}`,
    `/var/task/web/${rel}`,
  ]
}

function loadFont(file: string): Uint8Array {
  const cached = cache.get(file)
  if (cached) {
    return cached
  }
  for (const path of candidates(file)) {
    try {
      if (existsSync(path)) {
        const bytes = new Uint8Array(readFileSync(path))
        cache.set(file, bytes)
        return bytes
      }
    } catch {
      continue
    }
  }
  throw createError({
    statusCode: 500,
    data: { error: `Font ${file} not found`, code: 'FONT_NOT_FOUND' },
  })
}

export function loadReportFontRegular(): Uint8Array {
  return loadFont(FONT_REGULAR)
}

export function loadReportFontBold(): Uint8Array {
  return loadFont(FONT_BOLD)
}
