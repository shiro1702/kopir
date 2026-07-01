# 06 — Логирование webhook Т‑Банка + always 200 OK (тест)

| | |
|---|---|
| **Статус** | ❌ откат (июль 2026) |
| **Цель** | ~~Отладка HTTP‑нотификаций~~ — откатили после теста |

## Проблема

Т‑Банк сообщает `503 The requested URL could not be retrieved`, в Vercel в разделе Requests иногда нет вызовов webhook. Нужны `console.log` в Runtime Logs и гарантированный ответ `OK` для нотификаций с `Token`.

## Что добавлено

### Env (Vercel Production + `web/.env`)

```env
# По умолчанию true — для отладки. После стабильных webhook → false
TBANK_WEBHOOK_ALWAYS_OK=true
# true = сразу ответить OK, обработку в фоне (waitUntil на Vercel)
TBANK_WEBHOOK_DEFER_OK=true
```

| Переменная | `true` (тест) | `false` (prod) |
|------------|---------------|----------------|
| `TBANK_WEBHOOK_ALWAYS_OK` | Никогда не отдаём 401/404 банку; всегда `200` + `OK` | То же (рекомендуется оставить true для банка) |
| `TBANK_WEBHOOK_DEFER_OK` | `OK` до обработки БД (меньше таймаутов прокси банка) | Сначала обработка, потом `OK` |

### Логи (префикс `[tbank]`)

Смотреть: **Vercel → Logs** (не только Requests).

| Событие | Строка |
|---------|--------|
| Init | `[tbank] Init` — `merchantOrderId`, `notificationUrl`, `paymentId` |
| Webhook вход | `[tbank] webhook POST received` — OrderId, Status, PaymentId, hasToken |
| Успех / ignore | `[tbank] webhook processed` |
| Ошибка | `[tbank] webhook error` |

Секреты (`Token`, пароль) в лог **не** пишутся.

### Файлы

```
web/server/utils/payments/tbank-webhook-log.ts   — хелперы логов
web/server/utils/tbank-config.ts                 — isTbankWebhookAlwaysOk, isTbankWebhookDeferOk
web/server/utils/payments/tbank-client.ts        — log после Init
web/server/utils/payments/providers/tbank-acquiring.ts — processTbankWebhookNotification (без throw)
web/server/api/payments/webhook/tbank.post.ts    — always OK + defer
```

## Проверка после деплоя

1. Redeploy Production после добавления env.
2. Оплата тестовой картой (DEMO).
3. **Logs** → фильтр `tbank`:
   - `[tbank] Init` с `notificationUrl: https://kopir-seven.vercel.app/api/payments/webhook/tbank`
   - `[tbank] webhook POST received`
   - `[tbank] webhook processed` или `webhook error` с `INVALID_TOKEN` / `PAYMENT_NOT_FOUND`
4. curl без Token теперь должен давать **200 OK**, не 401:

```bash
curl -sS -X POST "https://kopir-seven.vercel.app/api/payments/webhook/tbank" \
  -H "Content-Type: application/json" -d '{}' -w "\nHTTP:%{http_code}\n"
# HTTP:200
# OK
```

## Откат

1. **Быстро (без кода):** в Vercel выставить `TBANK_WEBHOOK_DEFER_OK=false`, redeploy.
2. **Полный откат кода:** удалить/откатить коммит с задачей 06:
   - удалить `tbank-webhook-log.ts`
   - в `tbank.post.ts` вернуть `await handleTbankNotification` + throw на ошибках
   - убрать `processTbankWebhookNotification`, env из `tbank-config.ts` и `.env.example`
   - убрать `logTbankInit` из `tbank-client.ts`
3. Удалить этот файл `06-tbank-webhook-logging.md` при закрытии задачи.

## Критерии готовности (закрыть задачу)

- [ ] В Logs после оплаты есть `webhook POST received`
- [ ] Т‑Банк перестаёт писать 503 / нотификация доставлена
- [ ] Оплата → сообщение в боте → печать без «Проверить»
- [ ] `TBANK_WEBHOOK_DEFER_OK` оставить `true` или `false` по результатам latency
- [ ] Обновить [REPORT.md](../REPORT.md)

## После стабилизации

- Оставить `TBANK_WEBHOOK_ALWAYS_OK=true` (требование Т‑Банка).
- Ошибки только в логах, наружу всегда `OK`.
- Опционально: убрать verbose Init‑логи или понизить до debug.
