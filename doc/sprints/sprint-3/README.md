# Sprint 3 — «Т-Банк» (онлайн СБП/карта)

| | |
|---|---|
| **Период** | Июнь – 5 июля 2026 |
| **Статус** | ✅ закрыт |
| **Цель** | Онлайн-оплата в боте → автопечать без staff |
| **Этап roadmap** | [Этап 2c — Эквайринг](../../roadmap/ROADMAP.md#этап-2c--эквайринг-sprint-3) |

## Итог (05.07.2026)

| Компонент | Статус |
|-----------|--------|
| Боевой терминал Т-Касса | ✅ |
| Init / GetQr / webhook | ✅ prod |
| UX TG + MAX (СБП, карта, hybrid per-point) | ✅ |
| Webhook → автопечать | ✅ (фоновый GetState polling **откатан**, см. task 07) |
| «Проверить оплату» | ✅ ручной `GetState` fallback |
| Облачная касса ATOL Online (PAY-04) | 🟡 на проверке |
| Выплаты партнёрам | → Sprint 4–5 (PAY-06/07) |

## Задачи

| # | Задача | Статус | Feature | Файл |
|---|--------|--------|---------|------|
| 01 | HTTP-клиент + Token + env | ✅ | PAY-02 | [tasks/01-tbank-client.md](./tasks/01-tbank-client.md) |
| 02 | Prisma `Payment` + миграция | ✅ | PAY-02 | [tasks/02-payment-model.md](./tasks/02-payment-model.md) |
| 03 | Init + GetQr (реальный API) | ✅ | PAY-02 | [tasks/03-init-getqr.md](./tasks/03-init-getqr.md) |
| 04 | Webhook → PAID → печать | ✅ | PAY-03 | [tasks/04-webhook.md](./tasks/04-webhook.md) |
| 05 | UX бота + E2E | ✅ | PAY-02/03 | [tasks/05-bot-e2e.md](./tasks/05-bot-e2e.md) |
| 06 | Логирование webhook | ✅ | PAY-03 | [tasks/06-tbank-webhook-logging.md](./tasks/06-tbank-webhook-logging.md) |
| 07 | Откат GetState-polling | ✅ | PAY-03 | [tasks/07-revert-polling-to-webhooks.md](./tasks/07-revert-polling-to-webhooks.md) |
| — | Облачная касса ATOL (ФЗ-54) | 🟡 | PAY-04 | на проверке |
| — | 100+ prod-транзакций | ⏸ | PAY-02 | метрика масштаба |

## Definition of Done

- [x] Prod-терминал, ключи в `web/.env`
- [x] Webhook подтверждает оплату → печать без «Проверить»
- [x] Фоновый polling удалён (`tbank-payment-watcher` нет в коде)
- [ ] ATOL Online подключена, чек клиенту (PAY-04)
- [ ] 100+ транзакций (операционная метрика)

## После спринта

→ [Sprint 4 — ЛК партнёра в боте](../sprint-4/README.md)
