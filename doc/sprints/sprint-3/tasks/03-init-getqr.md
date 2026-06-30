# 03 — Init + GetQr

| | |
|---|---|
| **Статус** | ✅ done |
| **Feature** | PAY-02 |

## Результат

[`tbank-acquiring.ts`](../../../../web/server/utils/payments/providers/tbank-acquiring.ts):

1. Создать `Payment` (PENDING)
2. `POST /v2/Init` — Amount, OrderId, Description, PayType=O, NotificationURL
3. `POST /v2/GetQr` — DataType=PAYLOAD
4. Сохранить `externalId`, `qrPayload`

При повторной оплате старые PENDING → CANCELLED.

[`service.ts`](../../../../web/server/utils/payments/service.ts): `TBANK_ONLINE` доступен при `isTbankConfigured()` независимо от `PAYMENT_MODE`.
