import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import sharp from 'sharp'

export type PointQrPlatform = 'telegram' | 'max'

const LOGO_FILES: Record<PointQrPlatform, string> = {
  telegram: 'telegram.png',
  max: 'max.png',
}

const logoCache = new Map<PointQrPlatform, Buffer>()

function assetCandidates(file: string): string[] {
  const rel = join('assets', 'qr', file)
  const moduleDir = dirname(fileURLToPath(import.meta.url))
  return [
    join(moduleDir, '../../assets/qr', file),
    fileURLToPath(new URL(`../../assets/qr/${file}`, import.meta.url)),
    join(process.cwd(), rel),
    join(process.cwd(), 'web', rel),
    `/var/task/${rel}`,
    `/var/task/web/${rel}`,
  ]
}

function loadLogo(platform: PointQrPlatform): Buffer {
  const cached = logoCache.get(platform)
  if (cached) {
    return cached
  }

  const file = LOGO_FILES[platform]
  for (const path of assetCandidates(file)) {
    try {
      if (existsSync(path)) {
        const buffer = readFileSync(path)
        logoCache.set(platform, buffer)
        return buffer
      }
    } catch {
      continue
    }
  }

  throw new Error(`QR logo ${file} not found`)
}

function isFinderModule(row: number, col: number, count: number): boolean {
  const inTopLeft = row < 7 && col < 7
  const inTopRight = row < 7 && col >= count - 7
  const inBottomLeft = row >= count - 7 && col < 7
  return inTopLeft || inTopRight || inBottomLeft
}

function buildDotQrSvg(text: string, size: number, marginModules = 2): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' })
  const count = qr.modules.size
  const totalModules = count + marginModules * 2
  const moduleSize = size / totalModules
  const dotRadius = moduleSize * 0.42
  const cornerRadius = moduleSize * 0.28

  const shapes: string[] = []
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.modules.get(row, col)) {
        continue
      }

      const x = (col + marginModules) * moduleSize
      const y = (row + marginModules) * moduleSize

      if (isFinderModule(row, col, count)) {
        shapes.push(
          `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" rx="${cornerRadius}" fill="#111"/>`,
        )
      } else {
        const cx = x + moduleSize / 2
        const cy = y + moduleSize / 2
        shapes.push(`<circle cx="${cx}" cy="${cy}" r="${dotRadius}" fill="#111"/>`)
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="100%" height="100%" fill="#fff"/>`,
    ...shapes,
    '</svg>',
  ].join('')
}

async function buildCenterBadge(
  platform: PointQrPlatform,
  qrSize: number,
): Promise<{ buffer: Buffer, size: number }> {
  const logoSize = Math.round(qrSize * 0.17)
  const padding = Math.round(logoSize * 0.22)
  const badgeSize = logoSize + padding * 2
  const logo = loadLogo(platform)

  const logoPng = await sharp(logo)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer()

  const badge = await sharp({
    create: {
      width: badgeSize,
      height: badgeSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logoPng, gravity: 'center' }])
    .png()
    .toBuffer()

  return { buffer: badge, size: badgeSize }
}

export async function generateStyledPointQrPng(
  text: string,
  platform: PointQrPlatform,
  size = 300,
): Promise<Buffer> {
  const svg = buildDotQrSvg(text, size)
  const qrPng = await sharp(Buffer.from(svg)).png().toBuffer()
  const badge = await buildCenterBadge(platform, size)
  const offset = Math.round((size - badge.size) / 2)

  return sharp(qrPng)
    .composite([{ input: badge.buffer, left: offset, top: offset }])
    .png()
    .toBuffer()
}
