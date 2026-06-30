# 04 — Webhook → PAID → печать

| | |
|---|---|
| **Статус** | ✅ done |
| **Feature** | PAY-03 |

## Результат

`POST /api/payments/webhook/tbank`:

- Реальная нотификация Т-Банка: проверка `Token`, `Status=CONFIRMED`, `Success=true`
- Lookup по `OrderId` → `Payment.merchantOrderId`
- Идемпотентность: повторный webhook → 200 OK
- Ответ: `OK` (text/plain)

Legacy dev-mock (без Token): `{ "entityId": "...", "status": "CONFIRMED" }` + заголовок `X-Tbank-Webhook-Secret` (если задан).

Пачка → `confirmBatchPayment` → orders `PAID` → агент из queue.  
Одиночный заказ → `startOrderPrint`.
