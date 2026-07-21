import { PaymentMethod, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.point.upsert({
    where: { slug: 'point_dev_1' },
    update: {
      name: 'Dev Printer',
      isActive: true,
      visibleInList: true,
      pricePerPageKopeks: 1000,
      citySlug: 'ulan-ude',
      address: 'ул. Ленина, 1, Улан-Удэ',
      lat: 51.8335,
      lng: 107.5841,
      timezone: 'Asia/Irkutsk',
      openingHours: {
        weekdays: '09:00-19:00',
        saturday: '10:00-16:00',
        sunday: null,
      },
      acceptsOnlineOrders: true,
      pickupInstructions: 'После оплаты назовите оператору номер заказа.',
      estimatedReadyMinutes: '1-3',
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
      visibleInList: true,
      pricePerPageKopeks: 1000,
      citySlug: 'ulan-ude',
      address: 'ул. Ленина, 1, Улан-Удэ',
      lat: 51.8335,
      lng: 107.5841,
      timezone: 'Asia/Irkutsk',
      openingHours: {
        weekdays: '09:00-19:00',
        saturday: '10:00-16:00',
        sunday: null,
      },
      acceptsOnlineOrders: true,
      pickupInstructions: 'После оплаты назовите оператору номер заказа.',
      estimatedReadyMinutes: '1-3',
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
