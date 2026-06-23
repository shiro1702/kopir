# 13 — Выбор способа оплаты (перевод / на месте)

| | |
|---|---|
| **Статус** | ✅ done |
| **Feature** | PAY-01b |
| **Спека** | [payment-flow.md](../../../product/payment-flow.md) |
| **Зависимости** | Sprint 0.2 batch flow, staff-notify, `paymentConfirmedAt` gate |
| **Оценка** | 1–1.5 дня |

## Цель

После расчёта цены клиент выбирает **перевод по номеру** или **оплату на месте**. Печать начинается только после подтверждения сотрудником. Для перевода staff получает уведомление «Проверьте приложение банка» **только после «Я оплатил»**.

## Подзадачи

### Схема и конфиг

- [x] **13.1** Prisma: enum `PaymentMethod` (`SBP_TRANSFER`, `ON_SITE`), поля на `Order` и `OrderBatch`
- [x] **13.2** `Point.transferPhone`, `Point.transferBankLabel`; env fallback
- [x] **13.3** Env `PAYMENT_METHODS_ENABLED=SBP_TRANSFER,ON_SITE`

### Слой платежей (скелет)

- [x] **13.4** `server/utils/payments/types.ts`
- [x] **13.5** `providers/manual-transfer.ts` — `on_client_claimed`
- [x] **13.6** `providers/manual-on-site.ts` — `on_method_selected`
- [x] **13.7** `service.ts` — `selectPaymentMethod`, `claimPayment`, `resetPaymentMethod`

### Бот

- [x] **13.8** Inline «Перевод» / «На месте» после finalize batch
- [x] **13.9** Callbacks `pay_method:*`, `pay_claimed:*`, `pay_change_method:*`
- [x] **13.10** `payment-handlers.ts` — выбор способа + инструкции
- [x] **13.11** Staff «проверьте банк» только на `pay_claimed`
- [x] **13.12** MAX: те же callback payload
- [x] **13.13** Убран ранний staff notify после quote/finalize

### Staff

- [x] **13.14** `formatStaffTransferAwaitingConfirm`
- [x] **13.15** `formatStaffOnSiteAwaitingPayment` (+ batch)
- [x] **13.16** `notifyStaffOrderPaymentPending` / `notifyStaffBatchPaymentPending`
- [x] **13.17** Пачка: `staff_batch_confirm` + guards до claim

### Тексты

- [x] **13.18–13.20** `formatTransferInstructions`, `formatOnSiteInstructions`, `formatAwaitingStaffConfirm`

## Критерии приёмки

- [ ] PDF: quote → выбор → перевод → «Я оплатил» → staff confirm → печать (E2E на стенде)
- [ ] PDF: quote → on-site → staff confirm → печать
- [ ] Пачка 2–3 файла: один способ на всю пачку
- [x] Смена способа до подтверждения оплаты
- [x] Без `POINT_TRANSFER_PHONE` кнопка «Перевод» скрыта
- [x] Демо-оплата (задача 06) не затронута

## Заметки

- Миграция: `cd web && npm run db:deploy`
- Env: `POINT_TRANSFER_PHONE`, `POINT_TRANSFER_BANK_LABEL`, `PAYMENT_METHODS_ENABLED`
- Т-Банк / таблица `Payment` — Sprint 2
