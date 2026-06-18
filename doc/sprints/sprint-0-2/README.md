# Sprint 0.2 — «Batch: несколько файлов, одна оплата»

| | |
|---|---|
| **Период** | после закрытия Sprint 0.1 (~26 июня – 2 июля 2026, 1 неделя) |
| **Цель** | Пользователь отправляет несколько файлов подряд и оплачивает их одним платежом (demo), после чего печать идёт пачкой |
| **Этап roadmap** | [Этап 1 — Ручной пилот](../../roadmap/ROADMAP.md#этап-1--ручной-пилот-proof-of-concept) |
| **Feature IDs** | FILE-01, WEB-03, PAY-01, UX-12 |

## Definition of Done

- [ ] Пользователь может собрать 2–5 файлов в одну пачку в Telegram/MAX
- [ ] Сумма считается по всей пачке и показывается одним сообщением
- [ ] Одно подтверждение оплаты переводит всю пачку в `PAID`
- [ ] Агент печатает файлы пачки по порядку без ручного запуска каждого файла
- [ ] При ошибке одного файла остальные не теряются; статус ошибки прозрачен staff
- [ ] 5 успешных batch-заказов подряд (минимум по 2 файла в каждом)

## Архитектура

```
[ Telegram / MAX ] ──file1,file2,file3──► [ Nuxt/Nitro ]
         │                                   │
         │                           OrderBatch + Order[]
         │                                   │
         └◄── «Итого: N стр, X ₽» ───────────┤
                                             │
                                   demo pay / admin confirm
                                             │
                                    all orders -> PAID
                                             │
                                    [ Python agent queue ]
                                             │
                                      print in sequence
```

**Вне скоупа 0.2:** Т-Банк `Init/GetQr`, Mini App корзина, частичный возврат.  
**Позже:** реальный онлайн-платёж batch в Sprint 2.

## Задачи

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| 01 | Prisma: `OrderBatch` + связь с `Order` | ⬜ | [tasks/01-schema-order-batch.md](./tasks/01-schema-order-batch.md) |
| 02 | Бот: режим «собираем пачку» + команды завершения | ⬜ | [tasks/02-bot-batch-flow.md](./tasks/02-bot-batch-flow.md) |
| 03 | API: batch summary + подтверждение оплаты пачки | ⬜ | [tasks/03-api-batch-payment.md](./tasks/03-api-batch-payment.md) |
| 04 | Agent queue: выдача файлов по `batchId` и порядку | ⬜ | [tasks/04-agent-batch-queue.md](./tasks/04-agent-batch-queue.md) |
| 05 | Staff/admin: один action «Оплачено» на всю пачку | ⬜ | [tasks/05-admin-batch-confirm.md](./tasks/05-admin-batch-confirm.md) |
| 06 | Уведомления клиенту: принято/оплачено/готово по пачке | ⬜ | [tasks/06-bot-batch-notifications.md](./tasks/06-bot-batch-notifications.md) |
| 07 | E2E: 2–5 файлов в одном платеже | ⬜ | [tasks/07-e2e-batch-payment.md](./tasks/07-e2e-batch-payment.md) |

## Порядок выполнения

```
01 ──► 02 ──► 03 ──► 05
  └──► 04 ───────────► 07
02,03 ──► 06 ────────► 07
```

## Окружение (дополнительно)

### `web/.env`

```env
BATCH_MAX_FILES=5
BATCH_BUILD_TIMEOUT_MIN=15
DEMO_PAYMENT_ENABLED=true
```

## Ежедневный чеклист

| День | Фокус |
|------|-------|
| Д1 | 01 |
| Д2 | 02 |
| Д3 | 03 |
| Д4 | 04, 05 |
| Д5 | 06 |
| Д6–Д7 | 07, фиксы, ретро |

## Ретро

Шаблон в [SPRINTS.md](../SPRINTS.md#ретро-шаблон).

## После спринта

→ [Sprint 1 — Бета в копицентре](../sprint-1/README.md)  
→ [Sprint 2 — Коммерческий MVP](../sprint-2/README.md) (реальная онлайн-оплата batch)
