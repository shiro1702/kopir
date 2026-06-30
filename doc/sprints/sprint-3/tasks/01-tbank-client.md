# 01 — HTTP-клиент Т-Банка

| | |
|---|---|
| **Статус** | ✅ done |
| **Feature** | PAY-02 |

## Результат

- [`tbank-client.ts`](../../../../web/server/utils/payments/tbank-client.ts): `Init`, `GetQr`, `GetState`
- Подпись `Token` (SHA-256)
- Env: `TBANK_API_URL`, `TBANK_NOTIFICATION_URL`, `NUXT_PUBLIC_SITE_URL`

## Тесты

`npm run test` — `tbank-client.test.ts`
