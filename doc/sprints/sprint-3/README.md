# Sprint 3 — «Т-Банк» (онлайн СБП)

| | |
|---|---|
| **Период** | Июнь 2026 — sandbox; prod после договора |
| **Статус** | 🟡 in_progress — sandbox с DEMO-терминалом |
| **Цель** | Онлайн-оплата СБП в боте → автопечать без staff |
| **Этап roadmap** | [Этап 2c — Эквайринг](../../roadmap/ROADMAP.md#этап-2c--эквайринг-sprint-3) |
| **Предусловие** | Sprint 2: админка точек, скелет `tbank`, `/bind` |

## Блокер prod

Номинальный счёт / боевой терминал — для prod и выплат партнёрам (PAY-07).  
**Sandbox** разблокирован DEMO-ключами Т-Банка.

## Задачи

| # | Задача | Статус | Feature | Файл |
|---|--------|--------|---------|------|
| 01 | HTTP-клиент + Token + env | ✅ | PAY-02 | [tasks/01-tbank-client.md](./tasks/01-tbank-client.md) |
| 02 | Prisma `Payment` + миграция | ✅ | PAY-02 | [tasks/02-payment-model.md](./tasks/02-payment-model.md) |
| 03 | Init + GetQr (реальный API) | ✅ | PAY-02 | [tasks/03-init-getqr.md](./tasks/03-init-getqr.md) |
| 04 | Webhook → PAID → печать | ✅ | PAY-03 | [tasks/04-webhook.md](./tasks/04-webhook.md) |
| 05 | UX бота + E2E sandbox | 🟡 | PAY-02/03 | [tasks/05-bot-e2e.md](./tasks/05-bot-e2e.md) |
| 06 | Webhook logging + always OK | 🟡 | PAY-03 debug | [tasks/06-tbank-webhook-logging.md](./tasks/06-tbank-webhook-logging.md) |
| — | Облачная касса (ФЗ-54) | ⏸ | PAY-04 | после prod |

## Definition of Done

- [x] Код: Init/GetQr, webhook с Token, кнопка «Оплатить СБП»
- [ ] E2E: ≥10 sandbox-платежей ([REPORT.md](./REPORT.md))
- [ ] Prod: боевой терминал + 100+ транзакций
- [x] `TBANK_ONLINE` per-point в админке
- [ ] Первая выплата партнёру (PAY-07)

## Ключевые файлы

```
web/server/utils/payments/tbank-client.ts
web/server/utils/payments/providers/tbank-acquiring.ts
web/server/api/payments/webhook/tbank.post.ts
web/server/utils/bot/payment-handlers.ts
web/prisma/schema.prisma — model Payment
```

## После спринта

→ [Sprint 4 — Онбординг](../SPRINTS.md#sprint-4--онбординг-без-созвона)
