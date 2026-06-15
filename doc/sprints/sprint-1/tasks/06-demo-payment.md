# 06 — Демо-оплата в боте

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | UX-12 |
| **Зависимости** | Sprint 0.1 quote flow |
| **Оценка** | 4–5 часов |

## Цель

Клиент нажимает «Оплатить» в боте → через 3 сек заказ переходит в `PAID` без админки и перевода на карту.

## Подзадачи

- [ ] **6.1** Env `DEMO_PAYMENT_ENABLED=true`, `DEMO_PAYMENT_DELAY_MS=3000`
- [ ] **6.2** После quote (или PDF «ожидает оплаты») — inline-кнопка «💳 Оплатить (демо)»
- [ ] **6.3** Callback `pay_demo:<orderId>`:
  - сообщение «Обрабатываем оплату…»
  - `setTimeout` 3 сек → `OrderStatus.PAID`, `paidAt`
  - `notifyPaymentConfirmed` (уже есть)
- [ ] **6.4** MAX: аналог inline callback через platform API
- [ ] **6.5** Guard: только заказы в `AWAITING_PAYMENT`, только если `DEMO_PAYMENT_ENABLED`
- [ ] **6.6** Текст дисклеймера: «Тестовый режим. Реальная оплата — с Sprint 2»

## Критерии приёмки

- [ ] PDF и DOCX: кнопка → PAID → печать без `/admin`
- [ ] Повторный callback на тот же order — idempotent
- [ ] При `DEMO_PAYMENT_ENABLED=false` — старый flow (перевод + админка)

## Заметки

- Не имитировать QR СБП — достаточно одной кнопки для бета UX
- Sprint 2 заменит на Т-Банк Init/GetQr
