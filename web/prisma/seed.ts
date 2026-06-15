import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.point.upsert({
    where: { slug: 'point_dev_1' },
    update: { name: 'Dev Printer', isActive: true },
    create: {
      slug: 'point_dev_1',
      name: 'Dev Printer',
      isActive: true,
    },
  })

  console.log('Seeded point_dev_1')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
