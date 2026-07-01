# 07 — Откат GetState-polling в пользу webhook Т‑Банка

| | |
|---|---|
| **Статус** | 🟡 workaround активен (webhook не доходят) |
| **Цель** | Зафиксировать временный обход и чеклист отката, когда HTTP-нотификации заработают |
| **Связано** | [04-webhook.md](./04-webhook.md), [05-bot-e2e.md](./05-bot-e2e.md), [06-tbank-webhook-logging.md](./06-tbank-webhook-logging.md) |

## Контекст

После оплаты (СБП / карта) основной путь — **webhook** `POST /api/payments/webhook/tbank` → `handleTbankNotification` → `confirmBatchPayment` → печать.

На sandbox (DEMO-терминал, `kopir-seven.vercel.app`) webhook **не появляется** в Vercel Logs / Requests. Т‑Банк в кабинете может показывать `503 The requested URL could not be retrieved`. Платёж в приложении банка проходит, но бот молчит до ручного «Проверить оплату».

**Временный обход:** после `Init` запускается фоновый **polling `GetState`** (до 20 мин, интервал 3 с).

## Вероятные причины отсутствия webhook (проверить до отката polling)

| Гипотеза | Что сделать |
|----------|-------------|
| DEMO / тестовая среда | Уточнить у поддержки Т‑Кассы, шлют ли DEMO-терминалы HTTP-нотификации на внешний URL |
| Белый список IP | В личном кабинете эквайринга — разрешённые IP для callback (если опция есть). Vercel — динамические IP, часто нужен режим «без whitelist» или прокси банка |
| `NotificationURL` | В Init в логах должен быть `https://…/api/payments/webhook/tbank` — совпадает с `TBANK_NOTIFICATION_URL` / `NUXT_PUBLIC_SITE_URL` |
| Доступность URL снаружи | `curl -X POST https://<host>/api/payments/webhook/tbank -d '{}'` → не 503. Тест через [webhook.site](https://webhook.site) с тем же URL в Init |
| Подпись / ответ | Т‑Банк ждёт `200` + тело `OK` (text/plain). См. [04-webhook.md](./04-webhook.md) |
| Prod vs Preview | Webhook URL должен указывать на **Production** deployment, не на preview-ветку |

### Критерий «webhook работает» (перед откатом polling)

- [ ] После реальной оплаты в Vercel **Requests** есть `POST /api/payments/webhook/tbank`
- [ ] В Runtime Logs — `[tbank] webhook confirmed payment:` (если лог оставлен) или смена статуса пачки в БД
- [ ] Бот пишет «Оплата принята» **без** нажатия «Проверить оплату»
- [ ] Печать стартует автоматически (агент online)

---

## Что добавлено (workaround)

### Уже в git (коммит `29d691f`, не путать с doc возврата staff)

| Файл | Назначение |
|------|------------|
| `web/server/utils/payments/tbank-payment-watcher.ts` | Polling `GetState` (цепочка коротких invocations на Vercel) |
| `web/server/api/payments/tbank/watch.post.ts` | Один шаг poll + планирование следующего `POST /watch` |
| `web/server/utils/site-url.ts` | `getPublicSiteUrl()` для вызова `/watch` с того же хоста |

> **Vercel:** длинный `while` + `waitUntil` не работает — после `200 OK` функция завершается (лимит ~10–60 с). Исправление: каждый `/watch` делает один `GetState`, ждёт 3 с и вызывает себя снова через `fetch` (новая invocation). В логах должны появляться строки `[tbank] poll pending:` каждые ~3 с.

### Незакоммиченные изменения (на момент создания документа)

```bash
git status --short
# M web/server/utils/batch.ts
# M web/server/utils/bot/core.ts
# M web/server/utils/bot/messages.ts
# M web/server/utils/bot/payment-handlers.ts   # scheduleTbankPaymentWatcher после Init
# M web/server/utils/payments/providers/tbank-acquiring.ts  # reconcileTbankPayment, рефактор checkTbankPaymentStatus
```

| Изменение | Роль |
|-----------|------|
| `reconcileTbankPayment` / `isTbankPaymentSettled` | Общая логика подтверждения для polling и кнопки «Проверить» |
| `scheduleTbankPaymentWatcher(init.paymentId)` | **Авто-polling** после выдачи ссылки на оплату |
| `onlinePayment` в `formatBatchPaymentConfirmed` | Текст «Печать запустится автоматически» для `TBANK_ONLINE` — **нужен и при webhook**, не только при polling |

### Env (опционально, только для watcher)

```env
TBANK_PAYMENT_POLL_INTERVAL_MS=3000   # default
TBANK_PAYMENT_POLL_MAX_MS=1200000     # 20 min, default
# Для remote watch на Vercel уже нужны:
NUXT_PUBLIC_SITE_URL=...
AGENT_API_KEY=...
```

---

## Откат: только polling, webhook остаётся единственным авто-путём

### Шаг 1 — сбросить незакоммиченное (частично)

Сбросить **только** файлы polling + reconcile, **оставив** UX для онлайн-оплаты:

```bash
cd web

# Убрать вызов watcher из бота
git restore server/utils/bot/payment-handlers.ts

# Вернуть checkTbankPaymentStatus без reconcile (inline GetState как в HEAD)
git restore server/utils/payments/providers/tbank-acquiring.ts
```

**Оставить** (рекомендуется при рабочем webhook):

```bash
# Сообщение «Печать запустится автоматически» для TBANK_ONLINE
# — не откатывать, если не хотите вручную править снова:
#   batch.ts, bot/core.ts, bot/messages.ts
```

Если нужен полный сброс всех локальных правок:

```bash
git restore web/server/utils/batch.ts \
  web/server/utils/bot/core.ts \
  web/server/utils/bot/messages.ts \
  web/server/utils/bot/payment-handlers.ts \
  web/server/utils/payments/providers/tbank-acquiring.ts
```

После полного сброса вернуть только `onlinePayment` в трёх bot/batch файлах (см. diff в истории или коммит после отката polling).

### Шаг 2 — удалить файлы watcher из репозитория

```bash
rm web/server/api/payments/tbank/watch.post.ts
rm web/server/utils/payments/tbank-payment-watcher.ts
rm web/server/utils/site-url.ts   # больше нигде не используется
git add -u
```

Коммит `29d691f` также добавил `doc/product/staff-refund-in-chat.md` — **не откатывать** целиком коммит, только перечисленные файлы.

### Шаг 3 — проверить оставшийся поток

| Путь | Ожидание |
|------|----------|
| Webhook `CONFIRMED` | `handleTbankNotification` → печать + уведомление в бот |
| Кнопка «Проверить оплату» | `checkTbankPaymentStatus` → `GetState` (fallback, [05-bot-e2e.md](./05-bot-e2e.md)) |
| После Init | **Нет** фонового polling |

### Шаг 4 — smoke test

1. Оплата СБП/карта на точке с `TBANK_ONLINE`
2. Webhook в Vercel ≤ 30 с
3. Сообщение в боте без «Проверить»
4. Заказ в статусе PAID, задание в очереди агента

---

## Что **не** откатывать

- `POST /api/payments/webhook/tbank` и `handleTbankNotification` ([04](./04-webhook.md))
- `tbankInit` / `GetQr` / `GetState` в `tbank-client.ts`
- Возвраты Т‑Банк (`refundTbankPayment*`, коммит `6e0295d`)
- `doc/product/staff-refund-in-chat.md`
- Кнопка «Проверить оплату» и ручной `GetState` — остаётся запасным путём

---

## Быстрые команды (шпаргалка)

```bash
# Текущее состояние workaround
git status
git diff web/server/utils/bot/payment-handlers.ts
git diff web/server/utils/payments/providers/tbank-acquiring.ts

# Минимальный откат polling
git restore web/server/utils/bot/payment-handlers.ts \
  web/server/utils/payments/providers/tbank-acquiring.ts
rm -f web/server/api/payments/tbank/watch.post.ts \
      web/server/utils/payments/tbank-payment-watcher.ts \
      web/server/utils/site-url.ts

# После отката — закоммитить отдельно, когда webhook подтверждён на prod/sandbox
```

---

## Заметки для поддержки Т‑Банка

При обращении приложить:

- `TerminalKey` (DEMO: `…DEMO`)
- `PaymentId` из Init (лог `[tbank] Init` или ответ API)
- `NotificationURL` из Init
- Скрин ошибки `503` и отсутствие запросов в Vercel за тот же интервал
- Вопрос: **доставляются ли HTTP notification на DEMO-терминал на публичный HTTPS без фиксированного IP**

---

## После закрытия задачи

- [ ] Обновить статус в [sprint-3/README.md](../README.md)
- [ ] Отметить E2E webhook в [REPORT.md](../REPORT.md)
- [ ] Удалить или архивировать этот файл (`07-revert-polling-to-webhooks.md`)
