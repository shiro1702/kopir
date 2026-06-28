# Sprint 2 — отчёт о реализации P0

| | |
|---|---|
| **Дата** | 28.06.2026 |
| **Scope** | Задачи 11, 12, 13, 14 (P0) |
| **Статус кода** | Реализовано, `npm run build` и `npm run test` проходят |
| **Не в scope** | P1: оферта, операционное подключение 2–3 точек, prod Т-Банк |

## Что сделано

| # | Задача | Результат |
|---|--------|-----------|
| 12 | Админка точек | `/admin/points`, CRUD API, per-point цена и способы оплаты |
| 11 | Staff bind | `/bind`, deep link `?start=bind_xxx`, `StaffChannel` в БД, point-scoped уведомления |
| 13 | Токен агента | `POST /api/agent/activate`, desktop `ACTIVATION_TOKEN` → `config.json` |
| 14 | Скелет Т-Банка | stub provider, webhook, кнопка «Оплатить онлайн» (только с ключами), unit-тесты |

### Ключевые файлы

```
web/prisma/schema.prisma                          — Point, StaffChannel, BindToken, TBANK_ONLINE
web/prisma/migrations/20250628000000_sprint2_...  — миграция
web/pages/admin/points.vue                        — UI точек
web/server/api/admin/points.*                     — CRUD + bind/agent token
web/server/api/agent/activate.post.ts             — активация агента
web/server/api/payments/webhook/tbank.post.ts     — webhook stub
web/server/utils/bind-tokens.ts                   — генерация/consume токенов
web/server/utils/staff-auth.ts                    — проверка staff по точке
web/server/utils/staff-notify.ts                  — multi-channel per point
web/server/utils/bot/core.ts                      — handleBind, handleStart bind_*
web/server/utils/payments/providers/tbank-acquiring.ts
desktop/agent/config.py                           — ACTIVATION_TOKEN flow
```

---

## Перед тестами: настройка

### 1. Миграция БД (обязательно)

```bash
cd web
npm run db:deploy    # применить миграцию sprint2
npm run db:seed      # обновить point_dev_1 (цена, paymentMethods)
```

Проверка в Prisma Studio (`npm run db:studio`): у `Point` есть поля `pricePerPageKopeks`, `paymentMethodsEnabled`; таблицы `StaffChannel`, `BindToken` существуют.

### 2. Переменные `web/.env`

Минимум для полного прогона P0:

| Переменная | Зачем | Пример |
|------------|-------|--------|
| `DATABASE_URL` | Prisma | Neon pooled URL |
| `TELEGRAM_BOT_TOKEN` | Бот + bind | от BotFather |
| `TELEGRAM_BOT_USERNAME` | Deep link bind в админке | `kopir_print_bot` (без `@`) |
| `ADMIN_SECRET` | `/admin`, `/admin/points` | `openssl rand -hex 32` |
| `AGENT_API_KEY` | Агент печати | тот же в `desktop/.env` |
| `PAYMENT_MODE` | Ручная оплата | `terminal` |
| `POINT_TRANSFER_PHONE` | СБП fallback | `+79001234567` |
| `STAFF_TELEGRAM_CHAT_ID` | Legacy fallback staff | chat id сотрудника |

Опционально для Т-Банк stub:

| Переменная | Зачем |
|------------|-------|
| `TBANK_TERMINAL_KEY` | Включить кнопку «Оплатить онлайн» |
| `TBANK_PASSWORD` | Вместе с terminal key |
| `TBANK_WEBHOOK_SECRET` | Проверка заголовка webhook |

Без `TBANK_*` кнопка онлайн-оплаты **скрыта** — это ожидаемое поведение stub.

Подробнее: [ENV_SETUP.md](../../dev/ENV_SETUP.md), [BOT_MESSENGERS.md](../../project/BOT_MESSENGERS.md).

### 3. Запуск web

```bash
cd web
npm run dev
# → http://localhost:3000
```

На staging/prod после деплоя:

```bash
cd web
npm run db:deploy   # на prod DATABASE_URL
ADMIN_SECRET=xxx ./scripts/set-bot-webhooks.sh https://ваш-домен.vercel.app
```

### 4. Desktop agent (`desktop/.env`)

**Вариант A — как раньше (dev):**

```env
SERVER_URL="http://localhost:3000"   # или URL Vercel
AGENT_API_KEY="..."
POINT_ID="point_dev_1"
```

**Вариант B — активация по токену (задача 13):**

```env
SERVER_URL="https://ваш-домен.vercel.app"
AGENT_API_KEY="..."
# POINT_ID не задавать
ACTIVATION_TOKEN="bind_..."   # одноразовый токен из /admin/points → «Агент»
```

После первого успешного старта slug сохраняется в `desktop/config.json`; `ACTIVATION_TOKEN` можно убрать.

```bash
cd desktop
python -m agent.main
```

### 5. Автотесты (без БД и бота)

```bash
cd web
npm run test      # tbank stub: initPayment, webhook ignore, secret
npm run build     # production build
```

---

## Как проверять

### Задача 12 — Админка точек

**Где:** [http://localhost:3000/admin/points](http://localhost:3000/admin/points)

**Шаги:**

1. Ввести `ADMIN_SECRET` (тот же, что для `/admin`).
2. «+ Точка» → заполнить name, slug (`point_test_1`), цену, телефон СБП, способы оплаты → Сохранить.
3. Убедиться: точка в таблице, индикатор агента 🔴 (агент не подключён).
4. «Изменить» → поменять цену / реквизиты → сохранить.
5. Кнопка «QR link» копирует `?start=point_test_1` для клиентского бота.

**API (curl):**

```bash
export ADMIN_SECRET="..."
export BASE="http://localhost:3000"

# Список
curl -s -H "Authorization: Bearer $ADMIN_SECRET" "$BASE/api/admin/points" | jq

# Создать
curl -s -X POST -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"name":"Test","slug":"point_test_2","pricePerPageKopeks":1500,"paymentMethodsEnabled":["SBP_TRANSFER","ON_SITE"],"transferPhone":"+79001112233"}' \
  "$BASE/api/admin/points" | jq
```

**Ожидание:** новый slug принимается ботом без redeploy; цена считается per-point (не глобальный `PRICE_PER_PAGE_KOPEKS`).

---

### Задача 11 — Staff bind

**Подготовка:**

1. В `/admin/points` → «Bind» у нужной точки → скопировать токен или deep link.
2. Убедиться, что `TELEGRAM_BOT_USERNAME` задан (для deep link в UI).

**Telegram — личка:**

1. Написать боту `/bind bind_xxxxxxxx` или открыть deep link `https://t.me/BotName?start=bind_xxxxxxxx`.
2. Ответ: «Канал привязан к точке „…"».

**Telegram — группа (опционально):**

1. Добавить бота в группу копицентра.
2. В группе: `/bind bind_xxxxxxxx`.
3. Уведомления о заказах этой точки приходят в группу.

**Проверка изоляции точек:**

1. Привязать staff к `point_a`.
2. Создать заказ на `point_b` (другой slug через `/start point_b`).
3. Уведомление **не** должно прийти в канал, привязанный к `point_a`.

**Проверка кнопок staff:**

1. Клиент выбирает оплату → staff получает сообщение с «Оплата получена».
2. Нажать кнопку — только из привязанного chat/user; чужой chat → «Нет доступа».

**Legacy fallback:** если для точки нет `StaffChannel`, используются `STAFF_TELEGRAM_CHAT_ID` / `STAFF_MAX_USER_ID` (как в Sprint 1).

**Повторный токен:** второй `/bind` с тем же токеном → «Токен уже использован».

---

### Задача 13 — Активация агента

**Шаги:**

1. `/admin/points` → «Агент» → скопировать токен (TTL 48 ч).
2. На ПК партнёра: `desktop/.env` с `ACTIVATION_TOKEN=bind_...`, без `POINT_ID`.
3. `python -m agent.main` → в логе `[config] Activated point: point_xxx`.
4. Появился `desktop/config.json` с `"point_id": "point_xxx"`.
5. Агент polling: в `/admin` у точки 🟢 (при работающем агенте).
6. Заказ на эту точку → печать как раньше.

**API напрямую:**

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"token":"bind_xxxxxxxx"}' \
  "$BASE/api/agent/activate" | jq
# → { "pointId": "point_xxx", "slug": "point_xxx", "name": "..." }
```

Повторный вызов с тем же токеном → ошибка `TOKEN_ALREADY_USED`.

---

### Задача 14 — Т-Банк stub

**Без ключей (по умолчанию):**

- В админке чекбокс «Онлайн (Т-Банк)» disabled.
- В боте кнопки «Оплатить онлайн» нет.

**С ключами (локальный тест UI):**

```env
TBANK_TERMINAL_KEY="test"
TBANK_PASSWORD="test"
TBANK_WEBHOOK_SECRET="my-secret"
```

Перезапустить `npm run dev`. Включить `TBANK_ONLINE` у точки в админке → в боте появится кнопка → после выбора stub QR-текст.

**Webhook (подтверждение оплаты):**

```bash
# Нужен реальный order/batch id в статусе AWAITING_PAYMENT с paymentMethod=TBANK_ONLINE
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Tbank-Webhook-Secret: my-secret" \
  -d '{"entityId":"<ORDER_OR_BATCH_ID>","status":"CONFIRMED","paymentId":"stub-1"}' \
  "$BASE/api/payments/webhook/tbank" | jq
```

**Ожидание:** batch/order переходит в PAID (idempotent при повторе).

**Unit-тесты:**

```bash
cd web && npm run test
```

---

## Чеклист Definition of Done (P0)

| Критерий | Как проверить | Статус |
|----------|---------------|--------|
| Точка через `/admin/points` | Создать за < 2 мин без Prisma Studio | ⬜ ручная проверка |
| Bind → уведомления только своей точке | Две точки, два staff-канала | ⬜ ручная проверка |
| Agent token без `POINT_ID` | `ACTIVATION_TOKEN` + `config.json` | ⬜ ручная проверка |
| T-Bank stub + webhook + тесты | `npm run test`, curl webhook | ✅ автотесты; webhook — ручная |
| Seed `point_dev_1` обновлён | `npm run db:seed` | ✅ в коде |

P1 (оферта, 2–3 точки в проде) — **не реализовано**, остаётся операционной задачей после P0.

---

## Известные ограничения

- **Нет partner login** — только platform `ADMIN_SECRET` (как в спеке Sprint 2).
- **Т-Банк** — stub без реального Init/GetQr; prod → Sprint 3.
- **GUI агента** — только CLI/лог при активации; PySide6 prompt → P2.
- **Предпочтение точки клиента** — in-memory (`preferences.ts`); после рестарта сервера сбрасывается на default slug.
- **MAX bind** — `/bind token` в личке; deep link через `bot_started` payload (как у клиентского `/start`).

---

## Связанные документы

- [README спринта](./README.md)
- [Задача 11](./tasks/11-staff-bind-token.md) · [12](./tasks/12-points-admin-mvp.md) · [13](./tasks/13-agent-activation-token.md) · [14](./tasks/14-tbank-skeleton.md)
- [ENV_SETUP.md](../../dev/ENV_SETUP.md)
- [BOT_MESSENGERS.md](../../project/BOT_MESSENGERS.md)
