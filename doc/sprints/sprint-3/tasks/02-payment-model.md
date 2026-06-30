# 02 — Модель Payment

| | |
|---|---|
| **Статус** | ✅ done |
| **Feature** | PAY-02 |

## Результат

Prisma `Payment` + `PaymentStatus`:

- `merchantOrderId` — OrderId в Init (≤36 символов)
- `externalId` — PaymentId Т-Банка
- `batchId` / `orderId` — связь с сущностью оплаты
- `qrPayload` — ссылка СБП (`https://qr.nspk.ru/...`)

Миграция: `20250630000000_sprint3_tbank_payment`

```bash
cd web && npm run db:deploy
```
