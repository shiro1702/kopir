import { PaymentMethod, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.point.upsert({
    where: { slug: 'point_dev_1' },
    update: {
      name: 'Dev Printer',
      isActive: true,
      pricePerPageKopeks: 1000,
      paymentMethodsEnabled: [
        PaymentMethod.SBP_TRANSFER,
        PaymentMethod.ON_SITE,
        PaymentMethod.TBANK_SBP,
        PaymentMethod.TBANK_ONLINE,
      ],
    },
    create: {
      slug: 'point_dev_1',
      name: 'Dev Printer',
      isActive: true,
      pricePerPageKopeks: 1000,
      paymentMethodsEnabled: [
        PaymentMethod.SBP_TRANSFER,
        PaymentMethod.ON_SITE,
        PaymentMethod.TBANK_SBP,
        PaymentMethod.TBANK_ONLINE,
      ],
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
