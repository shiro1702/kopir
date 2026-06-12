# 02 — Prisma: схема БД

| | |
|---|---|
| **Статус** | ✅ done (+ `maxUserId` в миграции 12.06.2026) |
| **Feature** | WEB-02 |
| **Зависимости** | 01 |
| **Оценка** | 2–3 часа |

## Цель

Минимальная схема PostgreSQL для пилота: пользователи, точки, заказы.

## Подзадачи

- [ ] **2.1** Установить Prisma в `web/`:
  ```bash
  npm i prisma @prisma/client
  npx prisma init
  ```
- [ ] **2.2** Создать проект на **Neon** (free tier), скопировать `DATABASE_URL` в `web/.env`
  - Опционально: отдельная ветка БД `dev` в Neon для локали и `main` для Vercel
- [ ] **2.3** Написать `prisma/schema.prisma` (см. ниже)
- [ ] **2.4** `npx prisma migrate dev --name init`
- [ ] **2.5** Создать `server/utils/prisma.ts` — singleton PrismaClient
- [ ] **2.6** Seed-скрипт: 1 тестовая точка `point_dev_1`, 1 admin user (опционально)
- [ ] **2.7** Добавить `prisma/seed.ts` + `"prisma": { "seed": "..." }` в package.json

## Схема (минимум для Sprint 0)

```prisma
enum OrderStatus {
  AWAITING_PAYMENT   // файл загружен, ждём оплату
  PAID               // оплачено вручную, в очереди на печать
  PRINTING           // агент забрал
  PRINTED            // успех
  FAILED             // ошибка печати
}

model User {
  id           String   @id @default(cuid())
  telegramId   BigInt   @unique
  username     String?
  firstName    String?
  createdAt    DateTime @default(now())
  orders       Order[]
}

model Point {
  id        String   @id @default(cuid())
  slug      String   @unique   // point_dev_1
  name      String              // "Dev Printer"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  orders    Order[]
}

model Order {
  id           String      @id @default(cuid())
  status       OrderStatus @default(AWAITING_PAYMENT)
  fileName     String
  filePath     String      // ключ или URL в Vercel Blob (не локальный путь)
  pageCount    Int         @default(1)
  amountKopeks Int         @default(0)  // цена в копейках, 0 в пилоте ок
  userId       String
  user         User        @relation(fields: [userId], references: [id])
  pointId      String
  point        Point       @relation(fields: [pointId], references: [id])
  paidAt       DateTime?
  printedAt    DateTime?
  errorMessage String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([status, pointId])
  @@index([createdAt])
}
```

## Статусы заказа (flow Sprint 0)

```
AWAITING_PAYMENT ──(admin: оплачено)──► PAID ──(agent poll)──► PRINTING ──► PRINTED
                                                      └──► FAILED
```

## Критерии приёмки

- [ ] Миграция применяется без ошибок
- [ ] Seed создаёт точку `point_dev_1`
- [ ] Из Nitro route можно создать и прочитать Order через Prisma

## Команды

```bash
cd web
npx prisma migrate dev
npx prisma db seed
npx prisma studio   # визуальная проверка
```

## Заметки

- Redis не подключаем в Sprint 0
- `amountKopeks` и `pageCount` заполним позже; в пилоте достаточно `status`
- После деплоя на Vercel: `npx prisma migrate deploy` (не `migrate dev`) против prod Neon
