# 14 — Скелет Т-Банка (без prod-ключей)

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | PAY-02 prep |
| **Зависимости** | `PaymentProvider` layer (Sprint 1), batch payment flow |
| **Оценка** | 1 день |

## Цель

Подготовить интеграцию Т-Банка так, чтобы после одобрения номинального счёта осталось подключить ключи и пройти sandbox → prod ([Sprint 3](../../sprint-3/README.md)).

## Подзадачи

### Слой платежей

- [ ] **14.1** `providers/tbank-acquiring.ts` — stub: `initPayment`, `getQr`, `handleWebhook`
- [ ] **14.2** Регистрация в `payment-config` / factory рядом с `manual-transfer`, `manual-on-site`
- [ ] **14.3** Enum / config: `TBANK_ONLINE` в способах оплаты точки (disabled без ключей)

### API

- [ ] **14.4** `POST /api/payments/webhook/tbank` — verify signature stub, idempotent `confirmPayment`
- [ ] **14.5** Env: `TBANK_TERMINAL_KEY`, `TBANK_PASSWORD`, `TBANK_WEBHOOK_SECRET` в `.env.example`

### Бот (заглушка)

- [ ] **14.6** Кнопка «Оплатить онлайн» скрыта, если ключи не заданы (`isTbankConfigured()`)
- [ ] **14.7** При включённых ключах — flow Init → QR (реализация в Sprint 3)

### Тесты

- [ ] **14.8** Unit/integration: webhook → batch PAID → mock без HTTP к банку

## Вне скоупа (Sprint 3)

- Prod Init/GetQr с реальным API
- Облачная касса (PAY-04)
- Агентская схема / сплит (PAY-05)

## Критерии приёмки

- [ ] `npm run build` проходит
- [ ] Webhook route принимает тестовый payload и переводит batch в PAID
- [ ] Документация env в [ENV_SETUP.md](../../../dev/ENV_SETUP.md) или payment-flow.md
