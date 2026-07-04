# 05 — UX бота + E2E sandbox

| | |
|---|---|
| **Статус** | 🟡 code done, E2E optional (реализация принята 05.07) |
| **Feature** | PAY-02, PAY-03 |

## UX

После выбора «Оплатить онлайн»:

- Кнопка URL «Оплатить СБП» → `qr.nspk.ru`
- «Проверить оплату» → `GetState` (fallback если webhook задержался)
- «← Другой способ»
- Staff не участвует

Гибрид per-point: `SBP_TRANSFER` + `ON_SITE` + `TBANK_ONLINE`.

## E2E чеклист (≥10 sandbox-платежей)

Зафиксировать в [REPORT.md](../REPORT.md).

### Подготовка

- [ ] `cd web && npm run db:deploy`
- [ ] `TBANK_TERMINAL_KEY` + `TBANK_PASSWORD` (DEMO) в `web/.env`
- [ ] `TBANK_NOTIFICATION_URL` = публичный URL webhook (Vercel / ngrok)
- [ ] В `/admin/points`: включить «Онлайн (Т-Банк)» на тестовой точке
- [ ] Агент запущен, точка online

### Сценарий

1. [ ] Бот: загрузить PDF → завершить пачку → «Оплатить онлайн»
2. [ ] Появилась кнопка «Оплатить СБП» (не stub)
3. [ ] Оплата в тестовом банке (DEMO)
4. [ ] Webhook → клиент «Оплата принята» → агент печатает
5. [ ] Повторный webhook не ломает статус (идемпотентность)
6. [ ] «Проверить оплату» после успешной оплаты → already confirmed
7. [ ] Смена способа до оплаты → новый QR
8. [ ] Пачка из 2+ файлов — одна оплата на всю пачку
9. [ ] Ручные способы (перевод / на месте) по-прежнему работают
10. [ ] ≥10 успешных sandbox-транзакций

### Команды

```bash
# Legacy mock webhook (dev)
curl -sS -X POST "$BASE/api/payments/webhook/tbank" \
  -H "Content-Type: application/json" \
  -H "X-Tbank-Webhook-Secret: $TBANK_WEBHOOK_SECRET" \
  -d '{"entityId":"<batch-id>","status":"CONFIRMED"}'
```
