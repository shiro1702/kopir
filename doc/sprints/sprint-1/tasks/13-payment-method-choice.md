# 13 — Выбор способа оплаты (перевод / на месте)

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | PAY-01, UX-12 |
| **Спека** | [payment-flow.md](../../../product/payment-flow.md) |
| **Зависимости** | Sprint 0.2 batch flow, staff-notify, `paymentConfirmedAt` gate |
| **Оценка** | 1–1.5 дня |

## Цель

После расчёта цены клиент выбирает **перевод по номеру** или **оплату на месте**. Печать начинается только после подтверждения сотрудником. Для перевода staff получает уведомление «Проверьте приложение банка».

## Подзадачи

### Схема и конфиг

- [ ] **13.1** Prisma: enum `PaymentMethod` (`SBP_TRANSFER`, `ON_SITE`), поля `paymentMethod`, `paymentMethodAt`, `paymentClaimedAt` на `Order` и `OrderBatch`
- [ ] **13.2** `Point.transferPhone`, `Point.transferBankLabel` (nullable); env `POINT_TRANSFER_PHONE`, `POINT_TRANSFER_BANK_LABEL` как fallback
- [ ] **13.3** Env `PAYMENT_METHODS_ENABLED=SBP_TRANSFER,ON_SITE`

### Слой платежей (скелет)

- [ ] **13.4** `server/utils/payments/types.ts` — `PaymentContext`, `PaymentProvider` interface
- [ ] **13.5** `providers/manual-transfer.ts` — реквизиты; `staffNotifyTrigger: on_client_claimed` (только после «Я оплатил»)
- [ ] **13.6** `providers/manual-on-site.ts` — `staffNotifyTrigger: on_method_selected` (сразу при выборе «На месте»)
- [ ] **13.7** `service.ts` — `selectPaymentMethod`, `claimPayment`, `getAvailableMethods(point)`

### Бот

- [ ] **13.8** После quote / `formatBatchSummary` — inline «📱 Перевод» / «💳 На месте» вместо `clientPaymentHint()`
- [ ] **13.9** Callbacks: `pay_method:<method>:<id>`, `pay_claimed:<id>`, `pay_change_method:<id>`
- [ ] **13.10** `handlePaymentMethodChoice` в `bot/core.ts` — сохранить method, показать инструкцию
- [ ] **13.11** `handlePaymentClaimed` — `paymentClaimedAt`, **единственный** триггер staff «проверьте банк» для перевода
- [ ] **13.12** MAX: те же callback payload
- [ ] **13.13** Убрать ранний `notifyStaffAfterOrderReady`; перевод → staff только на `pay_claimed`; on-site → staff на `pay_method:on_site`

### Staff

- [ ] **13.14** `formatStaffTransferAwaitingConfirm` — «Проверьте приложение банка», номер, комментарий к переводу
- [ ] **13.15** `formatStaffOnSiteAwaitingPayment` — «Клиент идёт на стойку»
- [ ] **13.16** `notifyStaffPaymentPending(batch|order)` — роутинг по `paymentMethod`
- [ ] **13.17** Пачка: staff keyboard без изменений (`staff_batch_confirm`), текст с указанием способа

### Тексты (`messages.ts`)

- [ ] **13.18** `formatTransferInstructions(amount, shortId, phone, bankLabel)`
- [ ] **13.19** `formatOnSiteInstructions(amount, shortId)`
- [ ] **13.20** `formatAwaitingStaffConfirm(shortId)`

## Критерии приёмки

- [ ] PDF: quote → выбор → перевод → «Я оплатил» → staff confirm → печать
- [ ] PDF: quote → on-site → staff confirm на стойке → печать
- [ ] Пачка 2–3 файла: один способ на всю пачку
- [ ] Смена способа до подтверждения оплаты
- [ ] Без `POINT_TRANSFER_PHONE` кнопка «Перевод» скрыта или disabled
- [ ] `DEMO_PAYMENT_ENABLED` не ломает новый flow (демо — отдельная кнопка, задача 06)

## E2E чеклист

1. Отправить PDF → дождаться цены
2. Выбрать «Перевод» → видны реквизиты
3. Нажать «Я оплатил» → staff получил уведомление
4. Staff «Оплата получена» → клиент «Оплата принята», агент печатает
5. Повторить с «На месте» — staff уведомление без «проверьте банк»
6. Пачка из 2 файлов — один выбор способа, одно подтверждение

## Заметки

- Полный `Payment` record и Т-Банк — Sprint 2 ([payment-flow.md](../../../product/payment-flow.md) фаза 3)
- Не коммитить реальные номера телефонов в репозиторий — только `.env`
