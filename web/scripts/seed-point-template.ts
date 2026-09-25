/**
 * Seed a point PDF template (UX-16 spike).
 *
 * Usage (from web/):
 *   npx tsx scripts/seed-point-template.ts \
 *     --point-slug point_dev_1 \
 *     --file ./path/to/blank.pdf \
 *     --title "Отчёт о выполнении программы соцадаптации"
 *
 * Requires: DATABASE_URL, BLOB_READ_WRITE_TOKEN (and optionally BLOB_STORE_ID).
 */
import { readFileSync, existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { put } from '@vercel/blob'
import { PDFDocument } from 'pdf-lib'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg?.startsWith('--')) continue
    const key = arg.slice(2)
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }
    out[key] = value
    i++
  }
  return out
}

async function countPages(data: Buffer): Promise<number> {
  const pdf = await PDFDocument.load(data, { ignoreEncryption: true })
  const pageCount = pdf.getPageCount()
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error('PDF has no pages')
  }
  return pageCount
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const pointSlug = args['point-slug']?.trim()
  const fileArg = args.file?.trim()
  const title = args.title?.trim()

  if (!pointSlug || !fileArg || !title) {
    console.error(
      'Usage: npx tsx scripts/seed-point-template.ts --point-slug <slug> --file <path.pdf> --title "..."',
    )
    process.exit(1)
  }

  const filePath = resolve(fileArg)
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  if (!blobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set')
  }

  const buffer = readFileSync(filePath)
  const pageCount = await countPages(buffer)
  const fileName = basename(filePath).toLowerCase().endsWith('.pdf')
    ? basename(filePath)
    : `${basename(filePath)}.pdf`

  const adapter = new PrismaPg({ connectionString: databaseUrl })
  const prisma = new PrismaClient({ adapter })

  try {
    const point = await prisma.point.findUnique({ where: { slug: pointSlug } })
    if (!point) {
      throw new Error(`Point not found: ${pointSlug}`)
    }

    const template = await prisma.pointTemplate.create({
      data: {
        pointId: point.id,
        title,
        filePath: 'pending',
        fileName,
        pageCount,
        isActive: true,
      },
    })

    const pathname = `templates/${point.id}/${template.id}.pdf`
    const blob = await put(pathname, buffer, {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: false,
      token: blobToken,
    })

    const updated = await prisma.pointTemplate.update({
      where: { id: template.id },
      data: { filePath: blob.url },
    })

    console.log('Seeded PointTemplate:')
    console.log(`  id:        ${updated.id}`)
    console.log(`  point:     ${point.slug} (${point.name})`)
    console.log(`  title:     ${updated.title}`)
    console.log(`  pages:     ${updated.pageCount}`)
    console.log(`  filePath:  ${updated.filePath}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
